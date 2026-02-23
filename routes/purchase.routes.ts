
import { Router } from 'express';
// @ts-ignore
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * @openapi
 * /api/purchases:
 *   get:
 *     summary: Historial de órdenes de compra por sucursal.
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', async (req, res) => {
  const { branchId } = req.query;
  const purchases = await prisma.purchaseOrder.findMany({
    where: { branchId: String(branchId) },
    include: { supplier: true, items: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(purchases);
});

/**
 * @openapi
 * /api/purchases:
 *   post:
 *     summary: Generar una nueva orden de compra para proveedores.
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', async (req, res) => {
  const { branchId, supplierId, notes, items } = req.body;

  const total = items.reduce(
    (acc: number, item: any) => acc + item.quantity * item.cost,
    0
  );

  try {
    const po = await prisma.purchaseOrder.create({
      data: {
        branchId,
        supplierId,
        notes,
        total,
        items: {
          create: items.map((it: any) => ({
            inventoryItemId: it.linkedId, // ✔ FIX
            quantity: it.quantity,
            cost: it.cost
          }))
        }
      },
      include: {
        items: true
      }
    });

    res.json(po);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/purchases/{id}/receive:
 *   post:
 *     summary: Recepcionar mercancía de una orden de compra.
 *     description: Actualiza el stock en inventario y marca la orden como recibida.
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/receive', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!po || po.status === 'RECIBIDA') throw new Error("Orden no válida para recepción");

      for (const item of po.items) {
        const invItem = await tx.inventoryItem.findUnique({ where: { id: item.inventoryItemId } });
        
        if (!invItem) {
          throw new Error(`Item de inventario ${item.inventoryItemId} no encontrado`);
        }
        
        const previousStock = Number(invItem.stock); // ← Guardar stock anterior
        const newStock = previousStock + Number(item.quantity);
        
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { stock: newStock }
        });

        await tx.inventoryMovement.create({
          data: {
            inventoryItemId: item.inventoryItemId,
            type: 'ENTRADA',
            quantity: item.quantity,
            reason: 'RECEPCION_COMPRA',
            reference: `PO-${po.id.slice(-6)}`,
            previousStock: previousStock, // ← Agregar previousStock
            newStock: newStock // ← Agregar newStock si tu schema lo requiere
          }
        });
      }

      return await tx.purchaseOrder.update({
        where: { id },
        data: { status: 'RECIBIDA', receivedAt: new Date() }
      });
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error en recepción:', error);
    res.status(400).json({ error: error.message });
  }
});


/**
 * @openapi
 * /api/purchases/{id}:
 *   put:
 *     summary: Editar recepcion de mercancía de una orden de compra.
 *     description: Actualiza el stock en inventario y marca la orden como recibida.
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { supplierId, notes, items, status } = req.body;

  try {
    const total = items.reduce(
      (acc: number, item: any) => acc + item.quantity * item.cost,
      0
    );

    const updated = await prisma.$transaction(async (tx) => {

      await tx.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: id }
      });

      return await tx.purchaseOrder.update({
        where: { id },
        data: {
          supplierId,
          notes,
          status,
          total,
          items: {
            create: items.map((it: any) => ({
              inventoryItemId: it.linkedId,
              quantity: it.quantity,
              cost: it.cost
            }))
          }
        },
        include: { items: true }
      });

    });

    res.json(updated);

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


/**
 * @openapi
 * /api/purchases/status/{id}:
 *   put:
 *     summary: Editar estado recepcion de mercancía de una orden de compra.
 *     description: Actualiza el stock en inventario y marca la orden como recibida.
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 */
router.put('/status/:id', async (req, res) => {
  const { id } = req.params;
  const { supplierId, notes, items, status } = req.body;

  try {

    if (!items || !items.length)
      throw new Error("La orden debe tener items");

    const total = items.reduce(
      (acc: number, item: any) => acc + item.quantity * item.cost,
      0
    );

    const updated = await prisma.$transaction(async (tx) => {

      await tx.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: id }
      });

      return await tx.purchaseOrder.update({
        where: { id },
        data: {
          supplierId,
          notes,
          status,          // ⭐ AQUI
          total,
          items: {
            create: items.map((it: any) => ({
              inventoryItemId: it.linkedId,
              quantity: it.quantity,
              cost: it.cost
            }))
          }
        },
        include: { items: true }
      });

    });

    res.json(updated);

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
