
import { Router } from 'express';
// @ts-ignore
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * @openapi
 * /api/suppliers:
 *   get:
 *     summary: Listar todos los proveedores activos.
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de proveedores.
 */
router.get('/', async (req, res) => {
  const companyId = req.query.companyId;
  const suppliers = await prisma.supplier.findMany({
    where: {
      isActive: true,
      companyId: companyId
    },
    orderBy: { name: 'asc' }
  });

  res.json(suppliers);
});

/**
 * @openapi
 * /api/suppliers:
 *   post:
 *     summary: Registrar un nuevo proveedor en la base de datos.
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone]
 *             properties:
 *               name: { type: string }
 *               taxId: { type: string }
 *               contactName: { type: string }
 *               phone: { type: string }
 *               email: { type: string }
 *               address: { type: string }
 */
router.post('/', async (req, res) => {
  const { name, taxId, contactName, phone, email, address, companyId } = req.body;
  try {
    const supplier = await prisma.supplier.create({
      data: { name, taxId, contactName, phone, email, address, companyId }
    });
    res.json(supplier);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/suppliers/{id}:
 *   put:
 *     summary: Actualizar información de un proveedor.
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', async (req, res) => {
  const supplier = await prisma.supplier.update({
    where: { id: req.params.id },
    data: req.body
  });
  res.json(supplier);
});

export default router;
