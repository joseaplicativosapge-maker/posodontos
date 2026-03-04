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
    include: { supplier: true, items: { include: { inventoryItem: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json(purchases);
});

/**
 * @openapi
 * /api/purchases/payables:
 *   get:
 *     summary: Cuentas por pagar — órdenes a crédito con saldo pendiente.
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 */
router.get('/payables', async (req, res) => {
  const { branchId } = req.query;
  try {
    const payables = await prisma.purchaseOrder.findMany({
      where: {
        branchId: String(branchId),
        paymentType: 'CREDITO',
        paymentStatus: 'PENDIENTE'
      },
      include: { supplier: true, items: { include: { inventoryItem: true } } },
      orderBy: { creditDueDate: 'asc' }
    });
    res.json(payables);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/purchases:
 *   post:
 *     summary: Generar una nueva orden de compra (contado o crédito).
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', async (req, res) => {
  const {
    branchId,
    supplierId,
    notes,
    items,
    // ─── Nuevos campos de crédito ───────────────────────────────────
    paymentType = 'CONTADO',
    creditDays,
    creditDueDate,
  } = req.body;

  const total = items.reduce(
    (acc: number, item: any) => acc + item.quantity * item.cost,
    0
  );

  // Para CONTADO el pago se considera inmediato
  const paymentStatus = paymentType === 'CREDITO' ? 'PENDIENTE' : 'PAGADO';
  const paidAmount    = paymentType === 'CREDITO' ? 0 : total;

  try {
    const po = await prisma.purchaseOrder.create({
      data: {
        branchId,
        supplierId,
        notes,
        total,
        // ─── Crédito ─────────────────────────────────────────────────
        paymentType,
        paymentStatus,
        paidAmount,
        creditDays:    paymentType === 'CREDITO' ? (creditDays ?? null)    : null,
        creditDueDate: paymentType === 'CREDITO' ? (creditDueDate ? new Date(creditDueDate) : null) : null,
        // ─────────────────────────────────────────────────────────────
        items: {
          create: items.map((it: any) => ({
            inventoryItemId: it.linkedId,
            quantity: it.quantity,
            cost: it.cost
          }))
        }
      },
      include: { items: { include: { inventoryItem: true } }, supplier: true }
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

        if (!invItem) throw new Error(`Item de inventario ${item.inventoryItemId} no encontrado`);

        const previousStock = Number(invItem.stock);
        const newStock      = previousStock + Number(item.quantity);

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
            previousStock,
            newStock
          }
        });
      }

      // Las órdenes a crédito quedan PENDIENTE de pago tras recibir mercancía
      return await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: 'RECIBIDA',
          receivedAt: new Date(),
          // Solo marcar como PAGADO si era CONTADO (crédito ya tiene PENDIENTE)
          ...(po.paymentType !== 'CREDITO' && { paymentStatus: 'PAGADO', paidAmount: po.total })
        }
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
 * /api/purchases/{id}/pay:
 *   post:
 *     summary: Registrar pago (total o parcial) de una orden a crédito.
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/pay', async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body; // monto abonado; si no se envía, se paga el total pendiente

  try {
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });

    if (!po)                          throw new Error("Orden no encontrada");
    if (po.paymentType !== 'CREDITO') throw new Error("Solo las órdenes a crédito requieren registro de pago");
    if (po.paymentStatus === 'PAGADO') throw new Error("Esta orden ya está pagada");

    const abono      = amount ?? (po.total - po.paidAmount);
    const newPaid    = Number(po.paidAmount) + Number(abono);
    const isPaidFull = newPaid >= po.total;

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        paidAmount:    newPaid,
        paymentStatus: isPaidFull ? 'PAGADO' : 'PENDIENTE'
      },
      include: { supplier: true, items: true }
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error registrando pago:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/purchases/{id}:
 *   put:
 *     summary: Editar una orden de compra.
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    supplierId,
    notes,
    items,
    status,
    // ─── Nuevos campos de crédito ───────────────────────────────────
    paymentType,
    creditDays,
    creditDueDate,
    paymentStatus,
    paidAmount,
  } = req.body;

  try {
    const total = items.reduce(
      (acc: number, item: any) => acc + item.quantity * item.cost,
      0
    );

    // Reject items with no inventoryItemId
    const validItems = items.filter((it: any) => it.linkedId || it.inventoryItemId);
    if (validItems.length === 0) {
      return res.status(400).json({ error: 'Todos los ítems deben tener un insumo seleccionado' });
    }

    // Build credit/contado fields — single conditional avoids overlapping spreads
    const paymentFields = paymentType === 'CREDITO'
      ? { paymentType: 'CREDITO', creditDays: creditDays ?? null, creditDueDate: creditDueDate ? new Date(creditDueDate) : null, paymentStatus: paymentStatus ?? 'PENDIENTE', paidAmount: paidAmount ?? 0 }
      : paymentType === 'CONTADO'
      ? { paymentType: 'CONTADO', creditDays: null, creditDueDate: null, paymentStatus: 'PAGADO', paidAmount: total }
      : {};

    const updated = await prisma.$transaction(async (tx: any) => {
      await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });

      return await tx.purchaseOrder.update({
        where: { id },
        data: {
          supplierId,
          notes,
          status,
          total,
          ...paymentFields,
          items: {
            create: validItems.map((it: any) => ({
              inventoryItemId: it.linkedId || it.inventoryItemId,
              quantity: it.quantity,
              cost: it.cost
            }))
          }
        },
        include: { items: { include: { inventoryItem: true } }, supplier: true }
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
 *     summary: Actualizar estado de una orden de compra.
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 */
router.put('/status/:id', async (req, res) => {
  const { id } = req.params;
  const {
    supplierId,
    notes,
    items,
    status,
    // ─── Nuevos campos de crédito ───────────────────────────────────
    paymentType,
    creditDays,
    creditDueDate,
    paymentStatus,
    paidAmount,
  } = req.body;

  try {
    if (!items || !items.length) throw new Error("La orden debe tener items");

    const total = items.reduce(
      (acc: number, item: any) => acc + item.quantity * item.cost,
      0
    );

    const updated = await prisma.$transaction(async (tx: any) => {
      await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });

      // Build credit/contado fields
      const paymentFields2 = paymentType === 'CREDITO'
        ? { paymentType: 'CREDITO', creditDays: creditDays ?? null, creditDueDate: creditDueDate ? new Date(creditDueDate) : null, paymentStatus: paymentStatus ?? 'PENDIENTE', paidAmount: paidAmount ?? 0 }
        : paymentType === 'CONTADO'
        ? { paymentType: 'CONTADO', creditDays: null, creditDueDate: null, paymentStatus: 'PAGADO', paidAmount: total }
        : {};

      const validItems2 = items.filter((it: any) => it.linkedId || it.inventoryItemId);

      return await tx.purchaseOrder.update({
        where: { id },
        data: {
          supplierId,
          notes,
          status,
          total,
          ...paymentFields2,
          items: {
            create: validItems2.map((it: any) => ({
              inventoryItemId: it.linkedId || it.inventoryItemId,
              quantity: it.quantity,
              cost: it.cost
            }))
          }
        },
        include: { items: { include: { inventoryItem: true } }, supplier: true }
      });
    });

    res.json(updated);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;