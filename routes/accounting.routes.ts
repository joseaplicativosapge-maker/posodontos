
import { Router } from 'express';
// @ts-ignore
import { PrismaClient } from '@prisma/client';
import { AccountingService } from '../services/accounting.service.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * @openapi
 * /api/accounting/puc:
 *   get:
 *     summary: Obtiene el catálogo de cuentas (PUC).
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 */
router.get('/puc', async (req, res) => {
  const companyId = req.query.companyId;
  const accounts = await prisma.accountingAccount.findMany({
      where: {
        companyId: companyId
      },
      orderBy: {
        code: 'asc'
      }
    });
  res.json(accounts);
});


/**
 * @openapi
 * /api/accounting/vouchers:
 *   get:
 *     summary: Listar comprobantes contables con filtros.
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 */
router.get('/vouchers', async (req, res) => {
  const { branchId, startDate, endDate } = req.query;
  try {
    const vouchers = await prisma.accountingVoucher.findMany({
      where: {
        branchId: branchId ? String(branchId) : undefined,
        date: {
          gte: startDate ? new Date(String(startDate)) : undefined,
          lte: endDate ? new Date(String(endDate)) : undefined
        }
      },
      include: {
        entries: {
          include: {
            account: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });
    res.json(vouchers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/accounting/trial-balance:
 *   get:
 *     summary: Genera el Balance de Comprobación (Sumas y Saldos).
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 */
router.get('/trial-balance', async (req, res) => {
  const { branchId, startDate, endDate } = req.query;
  
  try {
    const entries = await prisma.accountingEntry.groupBy({
      by: ['accountId'],
      _sum: { debit: true, credit: true },
      where: {
        voucher: {
          branchId: branchId ? String(branchId) : undefined,
          date: {
            gte: startDate ? new Date(String(startDate)) : undefined,
            lte: endDate ? new Date(String(endDate)) : undefined
          }
        }
      }
    });

    const report = await Promise.all(entries.map(async (e: any) => {
      const account = await prisma.accountingAccount.findUnique({ where: { id: e.accountId } });
      const debit = Number(e._sum.debit || 0);
      const credit = Number(e._sum.credit || 0);
      
      // Saldo según naturaleza
      const balance = account?.nature === 'DEBITO' ? debit - credit : credit - debit;

      return {
        code: account?.code,
        name: account?.name,
        nature: account?.nature,
        debit,
        credit,
        balance
      };
    }));

    res.json(report.sort((a, b) => (a.code || '').localeCompare(b.code || '')));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/accounting/vouchers:
 *   post:
 *     summary: Registra un comprobante manual (Ajustes, Nómina, etc).
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 */
router.post('/vouchers', async (req, res) => {
  try {
    const voucher = await AccountingService.createVoucher(req.body);
    res.json(voucher);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/puc/bulk:
 *   post:
 *     summary: Registra el catálogo de cuentas (PUC).
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 */
router.post('/puc/bulk', async (req, res) => {
  try {

    const { companyId, accounts } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId requerido' });
    }

    if (!accounts || !Array.isArray(accounts)) {
      return res.status(400).json({ error: 'accounts debe ser un array' });
    }

    const result = await Promise.all(
      accounts.map((acc: any) =>
        prisma.accountingAccount.upsert({
          where: {
            code_companyId: {
              code: acc.code,
              companyId
            }
          },
          update: {
            name: acc.name,
            nature: acc.nature,
            financialStatement: acc.financialStatement
          },
          create: {
            code: acc.code,
            name: acc.name,
            nature: acc.nature,
            financialStatement: acc.financialStatement,
            companyId
          }
        })
      )
    );

    res.status(201).json({ count: result.length });

  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
