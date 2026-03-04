
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

  // ✅ Ventas del día (solo COMPLETED)
  const sales = await prisma.order.aggregate({
    where: { branchId: String(branchId), createdAt: { gte: today }, status: 'COMPLETED' },
    _sum: { total: true, totalCost: true },
    _count: { id: true }
  });

  // ✅ Top productos del día
  const bestSellers = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: { order: { branchId: String(branchId), createdAt: { gte: today } } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 5
  });

  // ✅ Costo real de insumos consumidos hoy
  // Busca las órdenes COMPLETED del día con sus items y recetas
  const ordersToday = await prisma.order.findMany({
    where: { branchId: String(branchId), createdAt: { gte: today }, status: 'COMPLETED' },
    include: {
      items: {
        include: {
          product: {
            include: {
              ingredients: {
                include: { inventoryItem: true }
              }
            }
          }
        }
      }
    }
  });

  // ✅ Calcular costo total de insumos consumidos con conversión de unidades
  const getConversionFactor = (recipeUnit: string, inventoryUnit: string): number => {
    const from = (recipeUnit || '').toLowerCase();
    const to = (inventoryUnit || '').toLowerCase();
    if (from === to) return 1;
    if (from === 'gr' && to === 'kg') return 0.001;
    if (from === 'kg' && to === 'gr') return 1000;
    if (from === 'g'  && to === 'kg') return 0.001;
    if (from === 'kg' && to === 'g')  return 1000;
    if (from === 'mg' && to === 'kg') return 0.000001;
    if (from === 'mg' && to === 'gr') return 0.001;
    if (from === 'ml' && to === 'lt') return 0.001;
    if (from === 'lt' && to === 'ml') return 1000;
    if (from === 'ml' && to === 'l')  return 0.001;
    if (from === 'l'  && to === 'ml') return 1000;
    return 1;
  };

  let totalIngredientCost = 0;

  for (const order of ordersToday) {
    for (const item of order.items) {
      const product = item.product;
      if (!product?.ingredients?.length) continue;

      for (const ing of product.ingredients) {
        const inv = ing.inventoryItem;
        if (!inv) continue;
        const factor = getConversionFactor(ing.recipeUnit || inv.unit, inv.unit);
        // costo por unidad de inventario × cantidad consumida (con conversión) × cantidad de items vendidos
        totalIngredientCost += ing.quantity * factor * inv.cost * item.quantity;
      }
    }
  }

  const totalRevenue = sales._sum.total || 0;
  const netProfit = totalRevenue - totalIngredientCost;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  res.json({
    todaySales: totalRevenue,
    orderCount: sales._count.id,
    totalIngredientCost: Math.round(totalIngredientCost),
    netProfit: Math.round(netProfit),
    profitMargin: parseFloat(profitMargin),
    topProducts: bestSellers
  });
});

export default router;
