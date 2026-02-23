
import { Router } from 'express';
// @ts-ignore
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * @openapi
 * /api/dashboard/stats:
 *   get:
 *     summary: Obtener estadísticas rápidas de ventas para el dashboard operativo.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la sucursal a consultar.
 *     responses:
 *       200:
 *         description: Estadísticas diarias generadas con éxito.
 */
router.get('/stats', async (req, res) => {
  const { branchId } = req.query;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sales = await prisma.order.aggregate({
    where: { branchId: String(branchId), createdAt: { gte: today }, status: 'COMPLETED' },
    _sum: { total: true },
    _count: { id: true }
  });

  const bestSellers = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: { order: { branchId: String(branchId), createdAt: { gte: today } } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 5
  });

  res.json({
    todaySales: sales._sum.total || 0,
    orderCount: sales._count.id,
    topProducts: bestSellers
  });
});

export default router;
