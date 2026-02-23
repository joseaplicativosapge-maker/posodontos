
import { Router } from 'express';
// @ts-ignore
import { PrismaClient } from '@prisma/client';
import { AccountingService } from '../services/accounting.service.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * @openapi
 * /api/expenses:
 *   get:
 *     summary: Consultar lista de gastos registrados por sucursal.
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         required: true
 *         schema: { type: string }
 */
router.get('/', async (req, res) => {
  const { branchId } = req.query;
  const expenses = await prisma.expense.findMany({
    where: { branchId: String(branchId), isActive: true },
    include: { supplier: true },
    orderBy: { date: 'desc' }
  });
  res.json(expenses);
});

/**
 * @openapi
 * /api/expenses:
 *   post:
 *     summary: Registrar un nuevo gasto o costo operativo.
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', async (req, res) => {
  const { branchId, supplierId, description, amount, taxAmount, category, type, pucAccountId, periodicity } = req.body;
  try {
    const expense = await prisma.expense.create({
      data: {
        branchId, supplierId, description, amount, taxAmount, category, type, pucAccountId, periodicity
      }
    });
    res.json(expense);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/expenses/:id:
 *   put:
 *     summary: Editar un nuevo gasto o costo operativo.
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;

  const {
    branchId,
    supplierId,
    description,
    amount,
    taxAmount,
    category,
    type,
    pucAccountId,
    periodicity
  } = req.body;

  try {
    const expense = await prisma.expense.update({
      where: { id },
      data: {
        branchId,
        supplierId,
        description,
        amount,
        taxAmount,
        category,
        type,
        pucAccountId,
        periodicity
      }
    });

    res.json(expense);

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/expenses/{id}/execute:
 *   patch:
 *     summary: Ejecutar el asiento contable de un gasto (Legalización).
 *     description: Realiza la salida de caja y el registro en la cuenta de gasto del PUC.
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/execute', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const expense = await tx.expense.update({
        where: { id },
        data: { isExecuted: true }
      });

      const entries = [
        { code: '110505', debit: 0, credit: Number(expense.amount), description: expense.description }, 
        { code: expense.pucAccountId, debit: Number(expense.amount) - Number(expense.taxAmount || 0), credit: 0, description: expense.description }
      ];

      if (Number(expense.taxAmount) > 0) {
        entries.push({ code: '240805', debit: Number(expense.taxAmount), credit: 0, description: `Impuesto en Gasto: ${expense.description}` });
      }

      await AccountingService.createVoucher({
        branchId: expense.branchId,
        type: 'EGRESO',
        referenceId: expense.id,
        notes: `Legalización de Gasto: ${expense.description}`,
        entries: entries
      });

      return expense;
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
