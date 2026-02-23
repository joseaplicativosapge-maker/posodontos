
import { Router } from 'express';
// @ts-ignore
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * @openapi
 * /api/kds/active:
 *   get:
 *     summary: Obtiene todos los pedidos pendientes de preparación.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.get('/active', async (req, res) => {
  const { branchId, area } = req.query;
  const orders = await prisma.order.findMany({
    where: {
      branchId: String(branchId),
      status: { in: ['PENDING', 'PREPARING'] }
    },
    include: {
      items: {
        include: { product: true },
        where: area ? { product: { area: String(area) } } : undefined
      },
      table: true
    },
    orderBy: { createdAt: 'asc' }
  });
  res.json(orders);
});

/**
 * @openapi
 * /api/kds/item/{id}/ready:
 *   patch:
 *     summary: Marca un item específico como listo.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/item/:id/ready', async (req, res) => {
  const item = await prisma.orderItem.update({
    where: { id: req.params.id },
    data: { status: 'READY' }
  });

  // Verificar si toda la orden está lista
  const pendingItems = await prisma.orderItem.count({
    where: { orderId: item.orderId, status: 'PENDING' }
  });

  if (pendingItems === 0) {
    await prisma.order.update({
      where: { id: item.orderId },
      data: { status: 'READY' }
    });
  }

  res.json(item);
});

export default router;
