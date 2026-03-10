// Enums
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  BRANCH_ADMIN = 'BRANCH_ADMIN',
  CASHIER = 'CASHIER',
  DRIVER = 'DRIVER',
  CHEF = 'CHEF', 
  GRILL_MASTER = 'GRILL_MASTER', 
  WAITER = 'WAITER', 
  BARTENDER = 'BARTENDER',
  ACCOUNTING_ADMIN = 'ACCOUNTING_ADMIN'
}

export enum ReservationStatus {
  PENDING = 'PENDIENTE',
  CONFIRMED = 'CONFIRMADA',
  CANCELLED = 'CANCELADA',
  COMPLETED = 'COMPLETADA'
}

// Permitimos que Role sea el Enum o cualquier string para perfiles personalizados
export type UserRole = Role | string;

export enum Permission {
  // Productos
  PRODUCTS_VIEW = 'productos.ver',
  PRODUCTS_CREATE = 'productos.crear',
  PRODUCTS_EDIT = 'productos.editar',
  PRODUCTS_DELETE = 'productos.eliminar',
  
  // Inventario y Stock
  STOCK_VIEW = 'stock.ver',
  STOCK_ADJUST = 'stock.ajustar',
  INVENTARIO_VER = 'inventario.ver',
  INVENTARIO_GESTIONAR = 'inventario.gestionar',
  
  // Compras
  PURCHASES_VIEW = 'compras.ver',
  PURCHASES_CREATE = 'compras.crear',
  
  // Ventas y Caja
  SALES_CREATE = 'ventas.crear',
  SALES_CANCEL = 'ventas.anular',
  CASH_OPEN = 'caja.abrir',
  CASH_CLOSE = 'caja.cerrar',
  
  // Operatividad
  TABLES_MANAGE = 'mesas.gestionar',
  KDS_VIEW = 'kds.ver',
  KDS_MANAGE = 'kds.gestionar',
  OPERATIVE_VIEW = 'operativo.ver',
  OPERATIVE_MANAGE = 'operativo.gestionar',
  
  // Clientes y Fidelización
  CUSTOMERS_VIEW = 'clientes.ver',
  CUSTOMERS_MANAGE = 'clientes.gestionar',
  LOYALTY_CONFIG = 'fidelizacion.configurar',
  
  // Gastos
  EXPENSES_VIEW = 'gastos.ver',
  EXPENSES_CREATE = 'gastos.crear', 
  EXPENSES_EDIT = 'gastos.editar', 
  EXPENSES_MANAGE = 'gastos.gestionar',
  
  // Contabilidad Granular
  CONTABILIDAD_PUC_VER = 'contabilidad.puc.ver',
  CONTABILIDAD_PUC_CREAR = 'contabilidad.puc.crear',
  CONTABILIDAD_PUC_EDITAR = 'contabilidad.puc.editar',
  CONTABILIDAD_MOVIMIENTOS_VER = 'contabilidad.movimientos.ver',
  CONTABILIDAD_MOVIMIENTOS_REGISTRAR = 'contabilidad.movimientos.registrar',
  CONTABILIDAD_CONFIGURAR = 'contabilidad.configurar',
  
  // Reportes Granulares
  REPORTS_VIEW = 'reportes.ver',
  REPORTS_BALANCE = 'reportes.balance', 
  REPORTS_PYG = 'reportes.pyg', 
  
  // Configuración de Sistema
  SETTINGS_VIEW = 'ajustes.ver',
  SETTINGS_EDIT = 'ajustes.editar',
  USERS_MANAGE = 'usuarios.gestionar',
  ROLES_MANAGE = 'roles.gestionar',
  BRANCH_MANAGE = 'sucursales.gestionar'
}

export interface RoleDefinition {
  role: UserRole;
  name: string;
  permissions: Permission[];
}

export enum OrderType {
  DINE_IN = 'DINE_IN',
  TAKEAWAY = 'TAKEAWAY',
  DELIVERY = 'DELIVERY'
}

export enum OrderStatus {
  OPEN = 'OPEN',
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  ON_WAY = 'ON_WAY',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum PurchaseOrderStatus {
  DRAFT = 'BORRADOR',
  APPROVED = 'APROBADA',
  PARTIAL = 'PARCIALMENTE_RECIBIDA',
  RECEIVED = 'RECIBIDA',
  CLOSED = 'CERRADA',
  CANCELLED = 'CANCELADA',
  REJECTED = 'RECHAZADA'
}

export enum ItemStatus {
  PENDING = 'PENDING',
  READY = 'READY'
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  QR = 'QR',
  MIXED = 'MIXED'
}

export enum ProductionArea {
  KITCHEN = 'CONSULTA / PROCEDIMIENTOS',
  BAR = 'HIGIENE / AUXILIAR',
  GRILL = 'ESPECIALIDADES'
}

export enum ProductType {
  DIRECT_SALE = 'VENTA_DIRECTA',
  PREPARED = 'PREPARADO',
  COMBO = 'COMBO'
}

export enum TableStatus {
  AVAILABLE = 'DISPONIBLE',
  OCCUPIED = 'OCUPADA',
  PENDING_PAYMENT = 'PENDIENTE_DE_PAGO',
  DEACTIVATED = 'DESACTIVADA'
}

export enum ExpenseCategory {
  RENT = 'ALQUILER',
  UTILITIES = 'SERVICIOS',
  SALARY = 'NÓMINA',
  MAINTENANCE = 'MANTENIMIENTO',
  INVENTORY = 'COMPRA_EXTRA',
  OPERATIONAL_COST = 'COSTO_OPERATIVO',
  MARKETING = 'PUBLICIDAD',
  TAXES = 'IMPUESTOS_TASAS',
  OTHER = 'OTROS'
}

export enum ExpensePeriodicity {
  UNIQUE = 'UNICO',
  WEEKLY = 'SEMANAL',
  FORTNIGHTLY = 'QUINCENAL',
  MONTHLY = 'MENSUAL',
  ANNUAL = 'ANUAL'
}

export enum MovementType {
  IN = 'ENTRADA',
  OUT = 'SALIDA',
  ADJUSTMENT = 'AJUSTE'
}

export enum PromotionType {
  PERCENTAGE = 'PORCENTAJE',
  FIXED_PRICE = 'PRECIO_FIJO',
  NONE = 'NINGUNA'
}

export type DocumentType = 'CC' | 'TI' | 'NIT' | 'CE' | 'PA' | 'TE' | 'FOREIGN_ID' | 'PEP' | 'NIT_FOREIGN';

export enum Documents {
  CC = 'CÉDULA CIUDADANÍA',
  TI = 'TARJETA DE IDENTIDAD', 
  NIT = 'NIT (EMPRESA)',
  CE = 'CÉDULA EXTRANJERÍA',
  PA = 'PASAPORTE',
  TE = 'TARJETA DE EXTRANJERÍA',
  FOREIGN_ID = 'DOCUMENTO DE IDENTIFICACIÓN EXTRANJERO',
  PEP = 'PEP',
  NIT_FOREIGN = 'NIT OTRO PAÍS'
}

export enum RegisterType {
  CAJA = 'CAJA',
  BARRA = 'BARRA',
  COCINA = 'COCINA',
  DOMICILIOS = 'DOMICILIOS',
  AUTOSERVICIO = 'AUTOSERVICIO'
}

export type TaxApplicability = 'PREPARED' | 'DIRECT' | 'BOTH';

export enum InventoryUnit {
  KG = 'KG',
  LT = 'LT',
  UND = 'UND',
  GR = 'GR',
}

export const InventoryUnitLabels: Record<InventoryUnit, string> = {
  [InventoryUnit.KG]: 'KILOGRAMO (KG)',
  [InventoryUnit.LT]: 'LITRO (LT)',
  [InventoryUnit.UND]: 'UNIDAD (UND)',
  [InventoryUnit.GR]: 'GRAMOS (GR)',
};

export interface ImpoconsumoConfig {
  enabled: boolean;
  rate: number;
  appliesTo: TaxApplicability;
  pucAccountId?: string;
}

// Configuración de Impresión y POS
export interface POSConfig {
  calculateChange: boolean;
  autoPrint: boolean;
  printType: 'PDF' | 'QZIO';
  qzPrinterName: string;
  ticketFooter: string;
}

export interface SystemLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  description: string;
  timestamp: Date;
  module: string;
  referenceId?: string;
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: MovementType;
  quantityIn: number;
  quantityOut: number;
  unitCost: number;
  totalValue: number;
  previousStock: number;
  newStock: number;
  balanceValue: number;
  date: Date;
  reference: string; 
  reason: string; 
  branchId: string;
  originType: 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'RECIPE_CONSUMPTION' | 'RETURN';
}

export interface Category {
  id: string;
  name: string;
  companyId: string;
  isActive: boolean;
}

export interface LoyaltyConfig {
  enabled: boolean;
  accumulationBaseAmount: number; 
  pointsPerCurrency: number; 
  currencyPerPoint: number; 
  minRedemptionPoints: number;
  birthdayDiscountPercentage: number; 
}

export interface Company {
  id: string;
  name: string;
  taxId: string;
  currency: string;
  taxRate: number; 
  impoconsumo: ImpoconsumoConfig;
  modules: {
    delivery: boolean;
    loyalty: boolean;
  };
}

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  ruc?: string;
  nit?: string;
  businessHours?: string; 
  isActive: boolean;
  logoUrl?: string; 
}

export interface CashRegister {
  id: string;
  branchId: string;
  name: string; 
  isOpen: boolean;
  currentUserId?: string; 
  currentUser?: string;
  isActive: boolean; 
  type: RegisterType;
  observations?: string;
  printType?: 'PDF' | 'QZIO';
  qzPrinterName?: string;
  ticketFooter?: string;
  autoPrint?: boolean; 
  activeSession?: RegisterSession
}

export interface RegisterSession {
  id: string;
  registerId: string;
  userId: string; 
  userName: string;
  openingAmount: number;
  closingAmount?: number;
  startTime: Date;
  endTime?: Date;
  totalSales: number; 
}

export interface Table {
  id?: string;
  branchId: string;
  name: string; 
  status: TableStatus;
  seats: number;
  currentOrderId?: string;
  isBar?: boolean; 
  occupiedSeats?: number[]; 
  mergedWith?: string[];
  parentId?: string;
}

export interface User {
  id: string;
  name: string;
  email: string; 
  pin: string; 
  role: UserRole;
  branchId?: string;
  companyId?: string;
  isActive: boolean; 
}

export interface RecipeItem {
  inventoryItemId: string; 
  quantity: number; 
}

export interface ComboItem {
  productId: string; 
  quantity: number;
}

export interface Product {
  id: string;
  sku?: string;
  companyId: string;
  name: string;
  price: number;
  cost: number; 
  categoryId?: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  productionArea: ProductionArea; 
  productType: ProductType;
  ingredients: RecipeItem[]; 
  requiresPreparation: boolean; 
  stock?: number; 
  minStock?: number;
  unit?: string;
  isCombo?: boolean; 
  comboItems?: ComboItem[]; 
  variants?: ProductVariant[];
  supplierId?: string;
  promotionType?: PromotionType;
  promotionValue?: number;
  taxType?: 'IVA' | 'IMPOCONSUMO';
  pucIncomeAccountId?: string;
  pucInventoryAccountId?: string;
  pucCostAccountId?: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  priceModifier: number;
}

export interface Supplier {
  id: string;
  taxId?: string;
  name: string;
  contactName: string;
  phone: string;
  email?: string;
  address?: string;
  companyId: string;
  isActive: boolean; 
}

export interface InventoryItem {
  id: string;
  internalCode?: string;
  branchId: string;
  name: string; 
  unit: string; 
  usageUnit?: string; 
  conversionFactor?: number; 
  stock: number;
  type?: String;
  minStock: number;
  maxStock: number; 
  cost: number; 
  productId?: string; 
  isActive: boolean; 
  supplierId?: string;
}

export interface ToothStatus {
  number: number;
  condition: string;
}

export interface DentalClinicalHistory {
  id: string;
  customerId: string;
  createdAt: string;

  motivoConsulta: string;
  enfermedadActual: string;
  antecedentesMedicos: string;
  antecedentesOdontologicos: string;
  examenExtraoral: string;
  examenIntraoral: string;

  diagnostico: string;
  planTratamiento: string;

  odontogram: ToothStatus[];
  consentimientoFirmado: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  points: number;
  address?: string;
  email?: string;
  birthDate?: string; 
  isActive: boolean; 
  documentType?: DocumentType;
  documentNumber?: string;
  fiscalResponsibility?: string;
  city?: string;
}

export interface CartItem {
  cartId: string;
  product: Product;
  quantity: number;
  variant?: ProductVariant;
  notes?: string;
  status: ItemStatus; 
  price?: number;
  clinicalHistory?: DentalClinicalHistory;
}

export interface Order {
  id: string;
  branchId: string;
  tableId?: string; 
  seatNumber?: number; 
  type: OrderType;
  status: OrderStatus;
  items: CartItem[];
  subtotal: number;
  tax: number;
  impoconsumoAmount?: number; 
  discount: number;
  total: number;
  totalCost: number; 
  paymentMethod?: PaymentMethod;
  customerId?: string;
  createdAt: Date;
  readyAt?: Date;
  receivedAmount?: number;
  changeAmount?: number;
  isSentToDIAN?: boolean;
  deliveryAddress?: string;
}

export interface Expense {
  id: string;
  branchId: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  type: 'GASTO' | 'COSTO';
  date: Date; // Fecha de Inicio / Emisión
  registeredBy: string; 
  isActive: boolean; 
  pucAccountId?: string; 
  periodicity: ExpensePeriodicity;
  nextExecution?: Date; // Fecha de Pago / Próxima ejecución
  notify: boolean;
  anticipationDays?: number;
  isExecuted: boolean; // Estado "Asentado"
  supplierId?: string;
  paymentMethod: PaymentMethod;
  taxAmount?: number; // IVA/Impoconsumo del gasto
}

export interface PurchaseOrderItem {
  inventoryItemId?: any;
  id: string;
  name: string;
  type: 'producto' | 'insumo';
  linkedId: string;
  quantity: number;
  receivedQuantity: number;
  cost: number;
  unit: string;
  taxRate?: number;
}

export interface PurchaseOrder {
  id: string;
  branchId: string;
  supplierId: string;
  items: PurchaseOrderItem[];
  status: PurchaseOrderStatus;
  total: number;
  subtotal: number;
  taxTotal: number;
  createdAt: Date;
  receivedAt?: Date;
  registeredBy: string;
  notes?: string;
  isActive: boolean; 
  isPurchase: boolean; // Indica si ya se convirtió en compra real
  paymentStatus: 'PENDIENTE' | 'PARCIAL' | 'PAGADO';
  paidAmount: number;
  rejectionReason?: string;
}

export interface Reservation {
  id: string;
  branchId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  date: string; // ISO Date string
  time: string;
  seats: number;
  tableId?: string;
  status: ReservationStatus;
  notes?: string;
  createdAt: Date;
}

export interface DashboardStats {
  todaySales: number;
  orderCount: number;
  topProducts: any[];
  totalIngredientCost: number;
  netProfit: number;
  profitMargin: number;
}

// ── Tipos: Módulo de Tratamientos y Seguimiento ─────────────────────────────

export enum TreatmentStatus {
  PENDIENTE    = 'PENDIENTE',
  EN_PROGRESO  = 'EN_PROGRESO',
  COMPLETADO   = 'COMPLETADO',
  CANCELADO    = 'CANCELADO',
}

export enum SessionStatus {
  PROGRAMADA  = 'PROGRAMADA',
  REALIZADA   = 'REALIZADA',
  CANCELADA   = 'CANCELADA',
  REPROGRAMADA = 'REPROGRAMADA',
  VENCIDA = 'VENCIDA',
}

// ── Tipos: Módulo de Tratamientos y Seguimiento ─────────────────────────────
export interface TreatmentSession {
  id: string;
  sessionNumber: number;
  label: string;           // ej: "Limpieza inicial", "Control 1"
  date?: string;           // ISO date string
  time?: string;           // "HH:mm"
  status: SessionStatus;
  notes?: string;
}

export interface PatientTreatment {
  id: string;
  customerId: string;      // referencia a Customer.id
  productId?: string;      // referencia a Product.id (opcional, si viene del catálogo)
  doctor: string;
  status: TreatmentStatus;
  sessions: TreatmentSession[];
  totalCost?: number;
  notes?: string;
  branchId: string;
  createdAt: string;       // ISO string
  updatedAt: string;
}