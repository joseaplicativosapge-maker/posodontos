
export enum AccountNature {
  DEBIT = 'DEBITO',
  CREDIT = 'CREDITO'
}

export interface AccountingAccount {
  id: string;
  code: string;
  name: string;
  nature: AccountNature;
  financialStatement: 'Balance General' | 'Estado de Resultados' | 'Cuentas de Orden';
  companyId: string;
  isCustom?: boolean; // Para identificar cuentas creadas por el usuario
}

export type MappingSourceType = 
  | 'PAYMENT_METHOD'
  | 'REVENUE_CONCEPT'
  | 'TAX_CONCEPT'
  | 'EXPENSE_CATEGORY';

export interface AccountingMapping {
  id: string;
  sourceType: MappingSourceType;
  sourceValue: string;
  pucAccountId: string;
}

export interface AccountingVoucher {
  id: string;
  branchId: string;
  type: 'INGRESO' | 'EGRESO' | 'DIARIO';
  posReferenceId: string;
  date: Date;
  totalDebit: number;
  totalCredit: number;
  notes: string;
  entries: AccountingEntry[];
}

export interface AccountingEntry {
  id: string;
  voucherId: string;
  accountId: string;
  accountCode?: string;
  accountName?: string;
  thirdPartyId?: string;
  debit: number;
  credit: number;
  description: string;
}

export interface AccountBalance {
  accountCode: string;
  accountName: string;
  initialBalance: number;
  debit: number;
  credit: number;
  finalBalance: number;
  nature: AccountNature;
}
