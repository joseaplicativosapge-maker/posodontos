
// @ts-ignore
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class AccountingService {
  /**
   * Crea un comprobante contable validando que los débitos y créditos sumen igual.
   */
  static async createVoucher(data: {
    branchId: string;
    type: 'INGRESO' | 'EGRESO' | 'DIARIO';
    referenceId?: string;
    notes: string;
    entries: { code: string; debit: number; credit: number; description: string }[];
  }) {
    const totalDebit = data.entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = data.entries.reduce((sum, e) => sum + e.credit, 0);

    // Validación de cuadre contable (Margen de error de 1 centavo)
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Asiento descuadrado. Débitos: ${totalDebit} | Créditos: ${totalCredit}`);
    }

    return await prisma.$transaction(async (tx: any) => {
      const voucher = await tx.accountingVoucher.create({
        data: {
          branchId: data.branchId,
          type: data.type,
          referenceId: data.referenceId,
          notes: data.notes,
          totalDebit,
          totalCredit,
          entries: {
            create: await Promise.all(data.entries.map(async e => {
              let account = null;
              if (e.code) {
                account = await tx.accountingAccount.findUnique({
                  where: { code: e.code }
                });
              }
              if (!account && e.code) {
                account = await tx.accountingAccount.findUnique({
                  where: { id: e.code }
                });
              }
              if (!account) {
                throw new Error(
                  `No se encontró cuenta contable (code: ${e.code ?? 'N/A'}, id: ${e.id ?? 'N/A'})`
                );
              }
              return {
                accountId: account.id,
                debit: e.debit,
                credit: e.credit,
                description: e.description
              };
            }))
          }
        },
        include: { entries: true }
      });
      return voucher;
    });
  }

  /**
   * Automatización: Genera el asiento de una venta POS.
   */
  static async processSaleAccounting(order: any) {
    const entries = [
      // 1. Recaudo (Débito a Caja)
      { code: '110505', debit: Number(order.total), credit: 0, description: `Venta POS #${order.id.slice(-6)}` },
      // 2. Ingreso Neto (Crédito a Ingresos Operacionales)
      { code: '414005', debit: 0, credit: Number(order.subtotal), description: 'Ingreso Alimentos y Bebidas' },
    ];

    // 3. IVA (Si aplica)
    if (Number(order.tax) > 0) {
      entries.push({ code: '240805', debit: 0, credit: Number(order.tax), description: 'IVA Generado' });
    }

    // 4. Impoconsumo (Si aplica)
    if (Number(order.impoconsumoAmount) > 0) {
      entries.push({ code: '240810', debit: 0, credit: Number(order.impoconsumoAmount), description: 'Impoconsumo' });
    }

    return await this.createVoucher({
      branchId: order.branchId,
      type: 'INGRESO',
      referenceId: order.id,
      notes: 'Generación automática por venta POS',
      entries
    });
  }

  /**
   * Automatización: Genera el asiento de una compra.
   */
  static async processPurchaseAccounting(purchase:any) {

  }
  
}
