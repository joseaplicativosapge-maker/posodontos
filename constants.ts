import { Branch, Company, Product, Role, User, InventoryItem, Customer, ProductionArea, Table, TableStatus, CashRegister, Supplier, Expense, ExpenseCategory, Category, Permission, RoleDefinition, ExpensePeriodicity, ProductType, RegisterType, PaymentMethod, Order, OrderStatus, OrderType, ItemStatus, MovementType } from "./types";
import { AccountingAccount, AccountNature, AccountingVoucher } from "./types_accounting";

export const MOCK_COMPANY: any = {
  id: 'c1',
  name: 'OdontoChain Intl.',
  taxId: 'US-999888',
  currency: '$',
  taxRate: 0.19, 
  impoconsumo: {
    enabled: true,
    rate: 0.08,
    appliesTo: 'BOTH',
    pucAccountId: 'acc-61'
  },
  loyalty: {
    enabled: true,
    accumulationBaseAmount: 10000,
    pointsPerCurrency: 1,
    currencyPerPoint: 10,
    minRedemptionPoints: 100,
    birthdayDiscountPercentage: 10
  },
  modules: { delivery: true, loyalty: true }
};

export const INITIAL_ROLE_DEFINITIONS: RoleDefinition[] = [
    {
        role: Role.COMPANY_ADMIN,
        name: 'Administrador de Empresa',
        permissions: Object.values(Permission) 
    },
    {
        role: Role.ACCOUNTING_ADMIN,
        name: 'Administrador Contable',
        permissions: [
            Permission.CONTABILIDAD_PUC_VER, Permission.CONTABILIDAD_PUC_CREAR, Permission.CONTABILIDAD_PUC_EDITAR,
            Permission.CONTABILIDAD_MOVIMIENTOS_VER, Permission.CONTABILIDAD_MOVIMIENTOS_REGISTRAR,
            Permission.CONTABILIDAD_CONFIGURAR, Permission.REPORTS_VIEW, Permission.REPORTS_BALANCE,
            Permission.REPORTS_PYG, Permission.EXPENSES_VIEW, Permission.EXPENSES_CREATE,
            Permission.EXPENSES_EDIT, Permission.PURCHASES_VIEW, Permission.PURCHASES_CREATE,
            Permission.STOCK_VIEW, Permission.SETTINGS_VIEW, Permission.INVENTARIO_VER, Permission.INVENTARIO_GESTIONAR,
            Permission.OPERATIVE_VIEW, Permission.OPERATIVE_MANAGE
        ]
    }
];

export const MOCK_BRANCHES: Branch[] = [
  { id: 'b1', companyId: 'c1', name: 'Parrilla Centro (Principal)', address: 'Calle Principal 123', isActive: true, logoUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=200&q=80' },
  { id: 'b2', companyId: 'c1', name: 'Bistro Norte', address: 'Av. Alta 456', isActive: true, logoUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=200&q=80' },
];

export const MOCK_REGISTERS: CashRegister[] = [
  { id: 'reg1', branchId: 'b1', name: 'Caja Principal', isOpen: true, isActive: true, type: RegisterType.CAJA, currentUser: 'Administrador Demo' },
  { id: 'reg2', branchId: 'b1', name: 'Barra Licores', isOpen: false, isActive: true, type: RegisterType.BARRA },
];

export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat1', name: 'Plato Fuerte', isActive: true },
  { id: 'cat2', name: 'Entradas', isActive: true },
  { id: 'cat3', name: 'Bebidas', isActive: true },
  { id: 'cat4', name: 'Postres', isActive: true },
];

export const MOCK_TABLES: Table[] = [
  { id: 't1', branchId: 'b1', name: 'Mesa 1', status: TableStatus.AVAILABLE, seats: 4 },
  { id: 't2', branchId: 'b1', name: 'Mesa 2', status: TableStatus.OCCUPIED, seats: 2 },
  { id: 't3', branchId: 'b1', name: 'Barra 1', status: TableStatus.AVAILABLE, seats: 1, isBar: true },
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Admin Maestro', email: 'admin@odontos.io', pin: '1111', role: Role.SUPER_ADMIN, isActive: true },
  { id: 'u2', name: 'Cajero Roberto', email: 'bob@odontos.com', pin: '2222', role: Role.CASHIER, branchId: 'b1', isActive: true },
];

export const MOCK_SUPPLIERS: Supplier[] = [
  { id: 's1', name: 'Carnes del Sur', contactName: 'Mario Bros', phone: '555-9988', email: 'ventas@carnesdelsur.com', isActive: true },
  { id: 's2', name: 'Distribuidora Central', contactName: 'Luigi', phone: '555-7766', email: 'pedidos@central.com', isActive: true },
];

export const MOCK_INVENTORY: InventoryItem[] = [
  { id: 'inv1', branchId: 'b1', name: 'Carne Molida Premium', unit: 'kg', stock: 45.5, minStock: 10, maxStock: 100, cost: 25000, isActive: true },
  { id: 'inv2', branchId: 'b1', name: 'Pan Brioche Artesanal', unit: 'und', stock: 120, minStock: 20, maxStock: 200, cost: 1200, isActive: true },
  { id: 'inv3', branchId: 'b1', name: 'Cerveza Club Colombia', unit: 'und', stock: 24, minStock: 12, maxStock: 48, cost: 3500, isActive: true, productId: 'p3' },
];

export const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', companyId: 'c1', name: 'Hamburguesa Gastro Special', price: 32000, cost: 12500, category: 'Plato Fuerte', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=60', productionArea: ProductionArea.GRILL, productType: ProductType.PREPARED, requiresPreparation: true, ingredients: [{ inventoryItemId: 'inv1', quantity: 0.2 }, { inventoryItemId: 'inv2', quantity: 1 }] },
  { id: 'p2', companyId: 'c1', name: 'Tacos de Birria (3)', price: 28500, cost: 9800, category: 'Entradas', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=500&q=60', productionArea: ProductionArea.KITCHEN, productType: ProductType.PREPARED, requiresPreparation: true, ingredients: [] },
  { id: 'p3', companyId: 'c1', name: 'Cerveza Club Colombia', price: 9500, cost: 3500, category: 'Bebidas', isActive: true, imageUrl: 'https://images.unsplash.com/photo-1584225065152-4a1454aa3d4e?w=500&q=60', productionArea: ProductionArea.BAR, productType: ProductType.DIRECT_SALE, requiresPreparation: false, stock: 24, minStock: 12, ingredients: [{ inventoryItemId: 'inv3', quantity: 1 }] },
];

export const MOCK_ORDERS: Order[] = [
    {
        id: 'ord-101',
        branchId: 'b1',
        tableId: 't2',
        type: OrderType.DINE_IN,
        status: OrderStatus.COMPLETED,
        items: [
            { cartId: 'c1', product: MOCK_PRODUCTS[0], quantity: 2, status: ItemStatus.READY },
            { cartId: 'c2', product: MOCK_PRODUCTS[2], quantity: 2, status: ItemStatus.READY }
        ],
        subtotal: 92000,
        tax: 17480,
        discount: 0,
        total: 109480,
        totalCost: 38000,
        createdAt: new Date(Date.now() - 1000 * 60 * 15),
        paymentMethod: PaymentMethod.CASH,
        isSentToDIAN: false
    }
];

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'cust1', name: 'JUAN PÉREZ', phone: '3001234567', points: 450, isActive: true, documentNumber: '10203040' },
  { id: 'cust2', name: 'MARÍA GARCÍA', phone: '3159876543', points: 1200, isActive: true, documentNumber: '52637485' },
];

export const MOCK_EXPENSES: Expense[] = [
    { id: 'exp1', branchId: 'b1', description: 'ARRIENDO LOCAL CENTRO', amount: 3500000, category: ExpenseCategory.RENT, type: 'GASTO', date: new Date(), registeredBy: 'Admin', isActive: true, periodicity: ExpensePeriodicity.MONTHLY, notify: false, isExecuted: true, paymentMethod: PaymentMethod.CASH, pucAccountId: 'acc-51' },
];

export const MOCK_PUC: AccountingAccount[] = [
    { id: 'acc-11', code: '110505', name: 'CAJA GENERAL', nature: AccountNature.DEBIT, financialStatement: 'Balance General', companyId: 'c1' },
    { id: 'acc-14', code: '140505', name: 'INVENTARIO MATERIA PRIMA', nature: AccountNature.DEBIT, financialStatement: 'Balance General', companyId: 'c1' },
    { id: 'acc-24', code: '240805', name: 'IVA GENERADO 19%', nature: AccountNature.CREDIT, financialStatement: 'Balance General', companyId: 'c1' },
    { id: 'acc-41', code: '414005', name: 'INGRESOS RESTAURANTE', nature: AccountNature.CREDIT, financialStatement: 'Estado de Resultados', companyId: 'c1' },
    { id: 'acc-51', code: '510506', name: 'GASTOS DE ARRENDAMIENTO', nature: AccountNature.DEBIT, financialStatement: 'Estado de Resultados', companyId: 'c1' },
    { id: 'acc-61', code: '614005', name: 'COSTO DE VENTAS ALIMENTOS', nature: AccountNature.DEBIT, financialStatement: 'Estado de Resultados', companyId: 'c1' },
];

export const MOCK_VOUCHERS: AccountingVoucher[] = [
    {
        id: 'v-101',
        branchId: 'b1',
        type: 'INGRESO',
        posReferenceId: 'ORD-101',
        date: new Date(),
        totalDebit: 109480,
        totalCredit: 109480,
        notes: 'Cierre automático orden Demo',
        entries: [
            { id: 'e1', voucherId: 'v-101', accountId: 'acc-11', accountCode: '110505', accountName: 'CAJA GENERAL', debit: 109480, credit: 0, description: 'Recaudo Venta' },
            { id: 'e2', voucherId: 'v-101', accountId: 'acc-41', accountCode: '414005', accountName: 'INGRESOS RESTAURANTE', debit: 0, credit: 92000, description: 'Venta Plato' },
            { id: 'e3', voucherId: 'v-101', accountId: 'acc-24', accountCode: '240805', accountName: 'IVA GENERADO 19%', debit: 0, credit: 17480, description: 'Impuesto' },
        ]
    }
];

export const MOCK_MOVEMENTS: any[] = [
    { id: 'm1', itemId: 'inv1', itemName: 'Carne Molida Premium', type: MovementType.IN, quantityIn: 50, quantityOut: 0, unitCost: 22000, totalValue: 1100000, previousStock: 0, newStock: 50, balanceValue: 1100000, date: new Date(Date.now() - 86400000), reference: 'PO-001', reason: 'STOCK INICIAL' },
];