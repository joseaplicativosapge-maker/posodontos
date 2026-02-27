
import { Router } from 'express';
// @ts-ignore
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * @openapi
 * /api/company/settings:
 *   get:
 *     summary: Obtener la configuración fiscal y de fidelidad global de la empresa.
 *     tags: [Empresa]
 *     security:
 *       - bearerAuth: []
 */
router.get('/settings', async (req, res) => {
  try {
    let companyId = req.query.companyId;
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
      },
    });
    res.json(company);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/company/settings:
 *   put:
 *     summary: Actualizar parámetros globales (Impuestos, Moneda, Puntos).
 *     tags: [Empresa]
 *     security:
 *       - bearerAuth: []
 */
router.put('/settings', async (req, res) => {
  try {
    const current = await prisma.company.findFirst();

    if (!current) {
        return res.status(404).json({ error: "No se encontró el registro maestro de la empresa. Ejecute el seeder." });
    }
    
    const updated = await prisma.company.update({
      where: { id: current.id },
      data: req.body
    });
    res.json(updated);
  } catch (error: any) {
    console.error("Error actualizando ajustes sep:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/company:
 *   post:
 *     summary: Crear una nueva empresa.
 *     tags: [Empresa]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      taxId,
      currency,
      taxRate,     
      impoconsumoRate,
      impoconsumoEnabled,
      modules,
      loyalty,
      status
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: "El nombre de la empresa es obligatorio." });
    }

    const company = await prisma.company.create({
      data: {
        name,
        taxId,
        currency,
        taxRate,
        impoconsumoRate,
        impoconsumoEnabled,
        modules,
        loyalty,
        status
      }
    });

    res.status(201).json(company);

  } catch (error: any) {
    console.error("Error creando empresa:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/company/{id}/activate:
 *   patch:
 *     summary: Activar empresa.
 *     tags: [Empresa]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;

    const company = await prisma.company.findUnique({
      where: { id }
    });

    if (!company) {
      return res.status(404).json({ error: "Empresa no encontrada." });
    }

    const updated = await prisma.company.update({
      where: { id },
      data: { status: 'ACTIVE' }
    });

    res.json(updated);

  } catch (error: any) {
    console.log("Error activando empresa:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/company/{id}/inactive:
 *   patch:
 *     summary: Activar empresa.
 *     tags: [Empresa]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/inactive', async (req, res) => {
  try {
    const { id } = req.params;

    const company = await prisma.company.findUnique({
      where: { id }
    });

    if (!company) {
      return res.status(404).json({ error: "Empresa no encontrada." });
    }

    if (company.status === 'INACTIVE') {
      return res.status(400).json({ error: "La empresa ya está inactivo." });
    }

    const updated = await prisma.company.update({
      where: { id },
      data: { status: 'INACTIVE' }
    });

    res.json(updated);

  } catch (error: any) {
    console.error("Error activando empresa:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/company/exists:
 *   get:
 *     summary: Verifica si una empresa existe por taxId o email.
 *     tags: [Empresa]
 *     parameters:
 *       - in: query
 *         name: taxId
 *         schema:
 *           type: string
 *         required: false
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         required: false
 *     responses:
 *       200:
 *         description: Resultado de la verificación
 */
router.get('/exists', async (req, res) => {
  try {
    const { taxId, email } = req.query;

    if (!taxId && !email) {
      return res.status(400).json({
        error: "Debe enviar taxId o email."
      });
    }

    const company = await prisma.company.findFirst({
      where: {
        OR: [
          taxId ? { taxId: String(taxId) } : undefined,
          email ? { email: String(email) } : undefined,
        ].filter(Boolean) as any
      },
      select: {
        id: true,
        name: true,
        taxId: true,
        currency: true,
        taxRate: true,
        impoconsumoRate: true,
        impoconsumoEnabled: true,
        modules: true,
        loyalty: true,
        status: true,
      }
    });

    if (!company) {
      return res.json({
        exists: false,
        company: null
      });
    }

    return res.json({
      exists: true,
      company
    });

  } catch (error: any) {
    console.error("Error verificando empresa:", error);
    return res.status(500).json({
      error: "Error interno del servidor."
    });
  }
});


export default router;