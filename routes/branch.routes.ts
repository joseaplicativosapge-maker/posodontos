
import { Router } from 'express';
// @ts-ignore
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * @openapi
 * /api/branches:
 *   get:
 *     summary: Listar todas las sedes registradas de la empresa.
 *     tags: [Sucursales]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: "companyId requerido" });
    }

    const branches = await prisma.branch.findMany({
      where: {
        companyId: String(companyId)   // ⭐ filtro
      },
      orderBy: { name: 'asc' }
    });

    res.json(branches);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/branches/{id}:
 *   get:
 *     summary: Obtener una sucursal por ID
 *     tags: [Sucursales]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la sucursal
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const branch = await prisma.branch.findUnique({
      where: { id }
    });

    if (!branch) {
      return res.status(404).json({ error: "Sucursal no encontrada" });
    }

    res.json({ data: branch });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/branches:
 *   post:
 *     summary: Crear una nueva sucursal (Sede).
 *     tags: [Sucursales]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', async (req, res) => {
  try {
    const branch = await prisma.branch.create({
      data: req.body
    });
    res.status(201).json(branch);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/branches/{id}:
 *   put:
 *     summary: Actualizar datos de una sede existente.
 *     tags: [Sucursales]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', async (req, res) => {
  try {
    const branch = await prisma.branch.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(branch);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
