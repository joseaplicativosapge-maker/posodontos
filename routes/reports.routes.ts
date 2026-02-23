import { Router } from 'express';
// @ts-ignore
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * @openapi
 * /api/reports/operational/summary:
 *   get:
 *     summary: Resumen operativo de ventas y rendimiento
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema: { type: string }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Datos de ventas brutas, métodos de pago y lista de órdenes.
 */
router.get('/operational/summary', async (req, res) => {
  const { branchId, startDate, endDate } = req.query;
  const start = startDate ? new Date(String(startDate)) : new Date(new Date().setHours(0,0,0,0));
  const end = endDate ? new Date(String(endDate)) : new Date();

  try {
    const where = {
        branchId: String(branchId),
        status: 'COMPLETED',
        createdAt: { gte: start, lte: end }
    };

    const orders = await prisma.order.findMany({
        where,
        include: {
            items: { include: { product: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    const salesData = await prisma.order.aggregate({
      where,
      _sum: { total: true, subtotal: true, tax: true, totalCost: true },
      _count: { id: true }
    });

    const paymentMethods = await prisma.order.groupBy({
      by: ['paymentMethod'],
      where,
      _sum: { total: true }
    });

    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: where },
      _sum: { quantity: true, price: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10
    });

    res.json({
      orders: orders,
      summary: salesData,
      payments: paymentMethods,
      products: topProducts
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/reports/accounting/financials:
 *   get:
 *     summary: Estado de Resultados y P&G dinámico
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Análisis contable de ingresos, costos y utilidad neta.
 */
router.get('/accounting/financials', async (req, res) => {
  const { branchId, startDate, endDate } = req.query;
  
  try {
    const entries = await prisma.accountingEntry.groupBy({
      by: ['accountId'],
      where: {
        voucher: {
          branchId: String(branchId),
          date: { gte: new Date(String(startDate)), lte: new Date(String(endDate)) }
        }
      },
      _sum: { debit: true, credit: true }
    });

    const puc = await prisma.accountingAccount.findMany();
    
    const report = entries.map(e => {
      const account = puc.find(a => a.id === e.accountId);
      const debit = Number(e._sum.debit || 0);
      const credit = Number(e._sum.credit || 0);
      const balance = account?.nature === 'DEBITO' ? debit - credit : credit - debit;
      return { 
        code: account?.code, 
        name: account?.name, 
        debit, credit, balance,
        type: account?.financialStatement 
      };
    });

    const income = report.filter(r => r.code?.startsWith('4')).reduce((s, r) => s + r.balance, 0);
    const costs = report.filter(r => r.code?.startsWith('6')).reduce((s, r) => s + r.balance, 0);
    const expenses = report.filter(r => r.code?.startsWith('5')).reduce((s, r) => s + r.balance, 0);

    res.json({
      trialBalance: report,
      profitAndLoss: {
        income,
        costs,
        expenses,
        netProfit: income - (costs + expenses)
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/reports/fiscal/dian-status:
 *   get:
 *     summary: Conciliación de Facturación Electrónica DIAN
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resumen de facturas transmitidas y pendientes ante la DIAN.
 */
router.get('/fiscal/dian-status', async (req, res) => {
  const { branchId, startDate, endDate } = req.query;
  
  try {
    const orders = await prisma.order.findMany({
      where: {
        branchId: String(branchId),
        status: 'COMPLETED',
        createdAt: { gte: new Date(String(startDate)), lte: new Date(String(endDate)) }
      },
      select: {
        id: true,
        createdAt: true,
        total: true,
        tax: true,
        impoconsumoAmount: true,
        isSentToDIAN: true
      }
    });

    const totals = orders.reduce((acc, curr) => ({
      iva: acc.iva + Number(curr.tax || 0),
      impoconsumo: acc.impoconsumo + Number(curr.impoconsumoAmount || 0),
      sent: acc.sent + (curr.isSentToDIAN ? 1 : 0),
      pending: acc.pending + (curr.isSentToDIAN ? 0 : 1)
    }), { iva: 0, impoconsumo: 0, sent: 0, pending: 0 });

    // Aca va la conexion con Factus y otros proveedores de servicios

    res.json({ orders, totals });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/reports/inventory/status:
 *   get:
 *     summary: Estado crítico y valorización de inventario
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Informe de valorización de activos y alertas de stock bajo.
 */
router.get('/inventory/status', async (req, res) => {
  const { branchId } = req.query;

  try {
    const items = await prisma.inventoryItem.findMany({
      where: { branchId: String(branchId), isActive: true },
      include: { supplier: true }
    });

    const valuation = items.reduce((sum, item) => sum + (Number(item.stock) * Number(item.cost)), 0);
    const criticalItems = items.filter(i => i.stock <= i.minStock);

    res.json({
      totalValuation: valuation,
      totalItems: items.length,
      criticalItemsCount: criticalItems.length,
      inventory: items,
      alerts: criticalItems
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;