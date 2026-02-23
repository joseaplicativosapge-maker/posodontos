
import { Router } from 'express';
// @ts-ignore
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * @openapi
 * /api/customers:
 *   get:
 *     summary: Lista todos los clientes con filtros opcionales.
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', async (req, res) => {
  const { search, isActive, companyId } = req.query;

  try {
    const customers = await prisma.customer.findMany({
      where: {
        companyId: companyId ? String(companyId) : undefined,

        isActive:
          isActive !== undefined
            ? isActive === 'true'
            : undefined,

        OR: search
          ? [
              { name: { contains: String(search), mode: 'insensitive' } },
              { phone: { contains: String(search), mode: 'insensitive' } },
              { documentNumber: { contains: String(search), mode: 'insensitive' } },
              { email: { contains: String(search), mode: 'insensitive' } }
            ]
          : undefined
      },
      orderBy: { name: 'asc' }
    });

    res.json(customers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/customers/{id}:
 *   get:
 *     summary: Obtiene el detalle de un cliente específico.
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id }
    });
    if (!customer) return res.status(404).json({ error: "Cliente no encontrado" });
    res.json(customer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/customers:
 *   post:
 *     summary: Registra un nuevo cliente.
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', async (req, res) => {
  const { 
    name, phone, email, address, documentType, 
    documentNumber, fiscalResponsibility, city, birthDate, currentCompanyId
  } = req.body;

  try {
    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        email,
        address,
        documentType,
        documentNumber,
        fiscalResponsibility,
        city,
        birthDate: birthDate ? new Date(birthDate) : null,
        companyId: currentCompanyId,
        points: 0,
        isActive: true
      }
    });
    res.status(201).json(customer);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/customers/{id}:
 *   put:
 *     summary: Actualiza los datos de un cliente.
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', async (req, res) => {
  try {
    const { 
      name, phone, email, address, documentType, 
      documentNumber, fiscalResponsibility, city, birthDate, currentCompanyId
    } = req.body;

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        name,
        phone,
        email,
        address,
        documentType,
        documentNumber,
        fiscalResponsibility,
        city,
        birthDate: birthDate ? new Date(birthDate) : null,
        companyId: currentCompanyId,
        points: 0,
        isActive: true
      }
    });
    res.json(customer);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/customers/{id}/points:
 *   patch:
 *     summary: Ajusta manualmente los puntos de un cliente.
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/points', async (req, res) => {
  const { points, action } = req.body; // action: 'ADD' | 'SUBTRACT' | 'SET'
  
  try {
    const current = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ error: "Cliente no encontrado" });

    let newPoints = Number(current.points);
    if (action === 'ADD') newPoints += Number(points);
    else if (action === 'SUBTRACT') newPoints = Math.max(0, newPoints - Number(points));
    else if (action === 'SET') newPoints = Number(points);

    const updated = await prisma.customer.update({
      where: { id: req.params.id },
      data: { points: newPoints }
    });
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/customers/{id}/status:
 *   patch:
 *     summary: Activa o desactiva un cliente (soft-delete).
 *     tags: [Clientes]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/status', async (req, res) => {
  const { isActive } = req.body;
  try {
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: { isActive: Boolean(isActive) }
    });
    res.json(customer);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
