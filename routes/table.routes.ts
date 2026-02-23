
import { Router } from 'express';
// @ts-ignore
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * @openapi
 * /api/tables:
 *   get:
 *     summary: Listar sillas por sucursal.
 *     tags: [Sillas]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', async (req, res) => {
  const { branchId } = req.query;
  const tables = await prisma.table.findMany({
    where: { branchId: String(branchId) },
    orderBy: { name: 'asc' }
  });
  res.json(tables);
});

/**
 * @openapi
 * /api/tables/{id}/status:
 *   patch:
 *     summary: Actualizar estado de una silla.
 *     tags: [Sillas]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const table = await prisma.table.update({
    where: { id: req.params.id },
    data: { status }
  });
  res.json(table);
});

/**
 * @openapi
 * /api/tables:
 *   post:
 *     summary: Crear una nueva silla (Guardar)
 *     tags: [Sillas]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', async (req, res) => {
  // CAMBIO APLICADO: Implementación real de guardado (Create) con desestructuración para evitar errores de campos extras
  const { branchId, name, status, seats, isBar } = req.body;
  try {
    const table = await prisma.table.create({
      data: {
        id: `t-${Date.now()}`, // Usamos el ID generado por el frontend
        branchId,
        name,
        status: status || 'AVAILABLE',
        seats: Number(seats) || 4,
        isBar: Boolean(isBar)
      }
    });
    res.status(201).json(table);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/tables/merge:
 *   post:
 *     summary: Fusiona varias sillas físicamente en una sola unidad lógica.
 *     tags: [Sillas]
 */
router.post('/merge', async (req, res) => {
  const { parentId, childrenIds } = req.body;
  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const parent = await tx.table.update({
        where: { id: parentId },
        data: { mergedWith: childrenIds }
      });

      await tx.table.updateMany({
        where: { id: { in: childrenIds } },
        data: { parentId: parentId }
      });

      return parent;
    });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/tables/split:
 *   post:
 *     summary: Separa una agrupación de sillas volviéndolas independientes.
 *     tags: [Sillas]
 */
router.post('/split', async (req, res) => {
  const { parentId } = req.body;
  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const parent = await tx.table.findUnique({
        where: { id: parentId }
      });

      if (!parent || !parent.mergedWith) throw new Error("Silla no agrupada");

      const childrenIds = parent.mergedWith as string[];

      // Limpiar principal
      await tx.table.update({
        where: { id: parentId },
        data: { mergedWith: [] }
      });

      // Desvincular secundarias
      await tx.table.updateMany({
        where: { id: { in: childrenIds } },
        data: { parentId: null }
      });

      return { success: true };
    });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/tables:
 *   post:
 *     summary: Crear una nueva silla (Guardar)
 *     tags: [Sillas]
 */
router.post('/', async (req, res) => {
  const { id, branchId, name, status, seats, isBar, mergedWith, parentId } = req.body;
  try {
    const table = await prisma.table.create({
      data: {
        id, 
        branchId,
        name,
        status: status || 'AVAILABLE',
        seats: Number(seats) || 4,
        isBar: Boolean(isBar),
        mergedWith: mergedWith || [],
        parentId: parentId || null
      }
    });
    res.status(201).json(table);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/tables/{id}:
 *   put:
 *     summary: Actualizar estado o datos de una silla (Editar)
 *     tags: [Sillas]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', async (req, res) => {
  // CAMBIO APLICADO: Implementación real de edición (Update) asegurando que los tipos de datos sean correctos para Prisma
  const { name, status, seats, isBar, currentOrderId, occupiedSeats } = req.body;
  try {
    const table = await prisma.table.update({
      where: { id: req.params.id },
      data: {
        name,
        status,
        seats: seats ? Number(seats) : undefined,
        isBar,
        currentOrderId,
        occupiedSeats // Esto debe ser compatible con el tipo Json o similar en el esquema
      }
    });
    res.json(table);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
