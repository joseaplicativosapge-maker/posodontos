import React, { useState, useEffect, useMemo } from 'react';
import { 
  Expense, 
  ExpenseCategory, 
  ExpensePeriodicity, 
  Permission, 
  Supplier, 
  InventoryItem, 
  PaymentMethod, 
  PurchaseOrder, 
  PurchaseOrderStatus, 
  PurchaseOrderItem,
  ImpoconsumoConfig
} from '../types';
import { AccountingAccount } from '../types_accounting';
import { 
  Download as DownloadIcon, Printer as PrinterIcon, Plus as PlusIcon, Search as SearchIcon, 
  ShoppingCart as ShoppingCartIcon, Receipt as ReceiptIcon, Calculator as CalculatorIcon, 
  Truck as TruckIcon, FileText as FileTextIcon, CheckCircle as CheckCircleIcon, X, 
  Save as SaveIcon, Trash2 as Trash2Icon, Clock as ClockIcon, 
  Edit2 as Edit2Icon, PackageOpen as PackageOpenIcon, Fingerprint as FingerprintIcon, 
  Phone as PhoneIcon, Mail as MailIcon, MapPin as MapPinIcon, User as UserIcon, Ban, Info, Eye, Calendar,
  Zap, Trash, Plus, CreditCard, Banknote, AlertCircle, DollarSign
} from 'lucide-react';
import { useNotification } from './NotificationContext';

// ─── NEW: Payment type for purchase orders ───────────────────────────────────
type PurchasePaymentType = 'CONTADO' | 'CREDITO';

interface OperationalManagementViewProps {
  currentBranchId: string;
  currentCompanyId: string;
  expenses: Expense[];
  puc: AccountingAccount[];
  suppliers: Supplier[];
  inventory: InventoryItem[];
  purchaseOrders: PurchaseOrder[];
  taxRate: number;
  impoconsumoConfig: ImpoconsumoConfig;
  onAddExpense: (e: Expense, pucId: string) => void;
  onUpdateExpense: (e: Expense) => void;
  onAddPurchaseOrder: (po: PurchaseOrder) => void;
  onUpdatePurchaseOrder: (po: PurchaseOrder) => void;
  onProcessPurchase: (items: PurchaseOrderItem[], total: number, supplierId: string, taxTotal: number, orderId?: string) => void;
  onAddSupplier: (s: Supplier) => void;
  onUpdateSupplier: (s: Supplier) => void;
  onEjecutarAsiento: (expenseId: string) => void;
  userPermissions: Permission[];
}

export const OperationalManagementView: React.FC<OperationalManagementViewProps> = ({
  currentBranchId, currentCompanyId,
  expenses, puc, suppliers, inventory, purchaseOrders, taxRate, impoconsumoConfig,
  onAddExpense, onUpdateExpense, onAddPurchaseOrder, onUpdatePurchaseOrder, onProcessPurchase,
  onAddSupplier, onUpdateSupplier, onEjecutarAsiento, userPermissions
}) => {
  const { notify, confirm } = useNotification();
  const [activeTab, setActiveTab] = useState<'orders' | 'expenses' | 'suppliers' | 'payables'>('orders');
  const [searchTerm, setSearchTerm] = useState('');

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);
  const [rejectingOrder, setRejectingOrder] = useState<PurchaseOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expType, setExpType] = useState<'GASTO' | 'COSTO'>('GASTO');
  const [expConcept, setExpConcept] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expTaxType, setExpTaxType] = useState<'NONE' | 'IVA' | 'IMPOCONSUMO'>('NONE');
  const [expTaxValue, setExpTaxValue] = useState(0);
  const [expCategory, setExpCategory] = useState<ExpenseCategory>(ExpenseCategory.OTHER);
  const [expPuc, setExpPuc] = useState('');
  const [expSupplier, setExpSupplier] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]); 
  const [expPeriodicity, setExpPeriodicity] = useState<ExpensePeriodicity>(ExpensePeriodicity.UNIQUE);

  useEffect(() => {
      const amount = parseFloat(expAmount) || 0;
      if (expTaxType === 'IVA') {
          setExpTaxValue(amount * taxRate);
      } else if (expTaxType === 'IMPOCONSUMO') {
          setExpTaxValue(amount * impoconsumoConfig.rate);
      } else {
          setExpTaxValue(0);
      }
  }, [expAmount, expTaxType, taxRate, impoconsumoConfig.rate]);

  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poItems, setPoItems] = useState<Partial<PurchaseOrderItem>[]>([]);
  const [poNotes, setPoNotes] = useState('');
  const [isRealPurchase, setIsRealPurchase] = useState(false);

  // ─── NEW: Credit purchase order state ─────────────────────────────────────
  const [poPaymentType, setPoPaymentType] = useState<PurchasePaymentType>('CONTADO');
  const [poCreditDays, setPoCreditDays] = useState<number>(30);
  const [poCreditDueDate, setPoCreditDueDate] = useState<string>('');

  // Compute due date automatically when credit days change
  useEffect(() => {
    if (poPaymentType === 'CREDITO' && poCreditDays > 0) {
      const due = new Date();
      due.setDate(due.getDate() + poCreditDays);
      setPoCreditDueDate(due.toISOString().split('T')[0]);
    } else {
      setPoCreditDueDate('');
    }
  }, [poPaymentType, poCreditDays]);

  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [sName, setSName] = useState('');
  const [sTaxId, setSTaxId] = useState('');
  const [sContact, setSContact] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sAddress, setSAddress] = useState('');

  const formatCOP = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  // ─── Derived: Accounts payable from credit orders ─────────────────────────
  const creditOrders = useMemo(() =>
    purchaseOrders.filter(po => (po as any).paymentType === 'CREDITO'),
    [purchaseOrders]
  );

  const totalPayables = useMemo(() =>
    creditOrders
      .filter(po => (po as any).paymentStatus !== 'PAGADO')
      .reduce((sum, po) => sum + (po.total - (po.paidAmount || 0)), 0),
    [creditOrders]
  );

  const overduePayables = useMemo(() =>
    creditOrders.filter(po => {
      const due = (po as any).creditDueDate;
      return due && new Date(due) < new Date() && (po as any).paymentStatus !== 'PAGADO';
    }),
    [creditOrders]
  );

  const getStatusStyle = (status: PurchaseOrderStatus) => {
    switch (status) {
      case PurchaseOrderStatus.RECEIVED: return 'bg-emerald-50 text-emerald-600';
      case PurchaseOrderStatus.REJECTED: return 'bg-red-50 text-red-600';
      case PurchaseOrderStatus.APPROVED: return 'bg-blue-50 text-blue-600';
      case PurchaseOrderStatus.PARTIAL: return 'bg-indigo-50 text-indigo-600';
      case PurchaseOrderStatus.CLOSED: return 'bg-slate-100 text-slate-600';
      case PurchaseOrderStatus.CANCELLED: return 'bg-gray-50 text-gray-400';
      case PurchaseOrderStatus.DRAFT:
      default: return 'bg-orange-50 text-orange-600';
    }
  };

  const getDaysUntilDue = (dueDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);
    return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleOpenSupplierModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier); setSName(supplier.name); setSTaxId(supplier.taxId || ''); setSContact(supplier.contactName); setSPhone(supplier.phone); setSEmail(supplier.email || ''); setSAddress(supplier.address || '');
    } else {
      setEditingSupplier(null); setSName(''); setSTaxId(''); setSContact(''); setSPhone(''); setSEmail(''); setSAddress('');
    }
    setIsSupplierModalOpen(true);
  };

  const saveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sName || !sPhone) { notify("Nombre y teléfono son obligatorios", "error"); return; }
    const data: Supplier = { 
        id: editingSupplier?.id || null, 
        name: sName.toUpperCase(), 
        taxId: sTaxId, 
        contactName: sContact, 
        phone: sPhone, 
        email: sEmail, 
        companyId: currentCompanyId,
        address: sAddress, 
        isActive: editingSupplier ? editingSupplier.isActive : true 
    };
    if (editingSupplier) onUpdateSupplier(data); else onAddSupplier(data);
    setIsSupplierModalOpen(false); notify("Proveedor guardado exitosamente", "success");
  };

  const handlePrintOrder = (order: PurchaseOrder) => {
    const isCredit = (order as any).paymentType === 'CREDITO';
    const ticketHTML = `<html><body style="font-family: sans-serif; padding: 20px;">
        <h1 style="text-transform: uppercase;">Orden de Compra #${order.id.slice(-6).toUpperCase()}</h1>
        <hr/>
        <p><b>Fecha:</b> ${new Date(order.createdAt).toLocaleString()}</p>
        <p><b>Proveedor:</b> ${suppliers.find(s => s.id === order.supplierId)?.name || 'N/A'}</p>
        <p><b>Condición de Pago:</b> ${isCredit ? `CRÉDITO — Vence: ${new Date((order as any).creditDueDate).toLocaleDateString()} (${(order as any).creditDays} días)` : 'CONTADO'}</p>
        <p><b>Notas:</b> ${order.notes || '-'}</p>
        <table border="1" width="100%" style="border-collapse: collapse; margin-top: 20px;">
            <thead>
                <tr style="background: #f1f5f9;">
                    <th style="padding: 10px;">Item</th>
                    <th style="padding: 10px;">Cantidad</th>
                    <th style="padding: 10px;">Costo Unit.</th>
                    <th style="padding: 10px;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${order.items.map(it => `
                    <tr>
                        <td style="padding: 10px;">${it.name}</td>
                        <td style="padding: 10px; text-align: center;">${it.quantity}</td>
                        <td style="padding: 10px; text-align: right;">${formatCOP(it.cost)}</td>
                        <td style="padding: 10px; text-align: right;">${formatCOP(it.cost * it.quantity)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <h2 style="text-align: right; margin-top: 30px;">TOTAL: ${formatCOP(order.total)}</h2>
        ${isCredit ? `<p style="text-align:right; color: #e67e22;"><b>⚠ Cuenta por Pagar — Vence: ${new Date((order as any).creditDueDate).toLocaleDateString()}</b></p>` : ''}
    </body></html>`;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(ticketHTML);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleExportCSV = () => {
    notify("Función de exportación ejecutada", "info");
  };

  const handleOpenOrderModal = (order?: PurchaseOrder, asPurchase: boolean = false) => {
    setIsRealPurchase(asPurchase);
    if (order) { 
        setEditingOrder(order); 
        setPoSupplierId(order.supplierId); 
        // Fix: normalize items so linkedId always points to the inventory item id
        setPoItems(order.items.map(item => ({
          ...item,
          linkedId: item.linkedId || item.inventoryItemId || '',
        })));
        setPoNotes(order.notes || '');
        setPoPaymentType((order as any).paymentType || 'CONTADO');
        setPoCreditDays((order as any).creditDays || 30);
    } else { 
        setEditingOrder(null); 
        setPoSupplierId(''); 
        setPoItems([{ id: `poi-${Date.now()}`, linkedId: '', quantity: 1, receivedQuantity: 0, cost: 0, type: 'insumo', name: '', unit: '', taxRate: 0 }]); 
        setPoNotes('');
        setPoPaymentType('CONTADO');
        setPoCreditDays(30);
    }
    setIsOrderModalOpen(true);
  };

  const handleOpenDetailModal = (order: PurchaseOrder) => {
      setViewingOrder(order);
      setIsDetailModalOpen(true);
  };

  const handleApproveOrder = async (order: PurchaseOrder) => {
        if (!await confirm({
            title: 'Aprobar Orden de Compra',
            message: `¿Estás seguro de aprobar la orden #${order.id.slice(-6).toUpperCase()}?`,
            type: 'info'
        })) return;

        const itemsForBackend = order.items.map(item => ({
            ...item,
            linkedId: item.inventoryItemId
        }));
        
        onUpdatePurchaseOrder({
            ...order,
            items: itemsForBackend as PurchaseOrderItem[],
            status: PurchaseOrderStatus.APPROVED
        });
        notify("Orden aprobada", "success");
    };

  const handleMarkAsPaid = async (order: PurchaseOrder) => {
    if (!await confirm({
        title: 'Registrar Pago',
        message: `¿Confirmar pago total de ${formatCOP(order.total - (order.paidAmount || 0))} a ${suppliers.find(s => s.id === order.supplierId)?.name || 'proveedor'}?`,
        type: 'info'
    })) return;
    onUpdatePurchaseOrder({
        ...order,
        paidAmount: order.total,
        paymentStatus: 'PAGADO'
    } as any);
    notify("Pago registrado. Cuenta por pagar liquidada.", "success");
  };

  const handleRejectOrderSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (rejectingOrder) {
          onUpdatePurchaseOrder({ ...rejectingOrder, status: PurchaseOrderStatus.REJECTED, rejectionReason });
          setIsRejectionModalOpen(false);
          notify("Orden rechazada", "info");
      }
  };

  const addPoItem = () => { setPoItems([...poItems, { id: `poi-${Date.now()}`, linkedId: '', quantity: 1, receivedQuantity: 0, cost: 0, type: 'insumo', taxRate: 0 }]); };

  const updatePoItem = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    const next = [...poItems];
    if (field === 'linkedId') {
      const item = inventory.find(i => i.id === value);
      if (item) next[index] = { ...next[index], linkedId: value, name: item.name, unit: item.unit, cost: item.cost };
    } else { next[index] = { ...next[index], [field]: value }; }
    setPoItems(next);
  };

  const saveOrderOrPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!poSupplierId || poItems.length === 0) {
        notify("Proveedor e ítems son requeridos", "warning");
        return;
    }

    const total = poItems.reduce((s, i) => s + (Number(i.quantity || 0) * Number(i.cost || 0)), 0);

    if (isRealPurchase) { 
        onProcessPurchase(poItems as PurchaseOrderItem[], total, poSupplierId, 0, editingOrder?.id); 
    } else {
        const data: PurchaseOrder = { 
            id: editingOrder?.id || null, 
            branchId: currentBranchId, 
            supplierId: poSupplierId, 
            items: poItems as PurchaseOrderItem[], 
            status: editingOrder ? editingOrder.status : PurchaseOrderStatus.DRAFT, 
            total, 
            subtotal: total, 
            taxTotal: 0, 
            createdAt: editingOrder ? editingOrder.createdAt : new Date(), 
            registeredBy: 'Admin', 
            isActive: true, 
            isPurchase: false, 
            // ─── Credit fields stored in paymentStatus / extras ───────────
            paymentStatus: poPaymentType === 'CREDITO' ? 'PENDIENTE' : 'PAGADO',
            paidAmount: poPaymentType === 'CREDITO' ? 0 : total,
            notes: poNotes,
            // Extended fields via casting — adapt to your actual type if needed
            ...(poPaymentType === 'CREDITO' && {
              paymentType: 'CREDITO',
              creditDays: poCreditDays,
              creditDueDate: poCreditDueDate,
            }),
            ...(poPaymentType === 'CONTADO' && {
              paymentType: 'CONTADO',
            }),
        } as any;
        if (editingOrder) onUpdatePurchaseOrder(data); else onAddPurchaseOrder(data);
        
        if (poPaymentType === 'CREDITO') {
          notify(`Orden a crédito creada. Vence el ${new Date(poCreditDueDate).toLocaleDateString()} (${poCreditDays} días)`, "info");
        }
    }
    setIsOrderModalOpen(false);
  };

  const handleOpenExpenseModal = (expense?: Expense) => {
      if (expense) {
          setEditingExpense(expense); 
          setExpType(expense.type); 
          setExpConcept(expense.description); 
          setExpAmount(expense.amount.toString()); 
          setExpCategory(expense.category); 
          setExpPuc(expense.pucAccountId || ''); 
          setExpSupplier(expense.supplierId || ''); 
          setExpDate(new Date(expense.date).toISOString().split('T')[0]);
          setExpPeriodicity(expense.periodicity);
      } else {
          setEditingExpense(null); setExpType('GASTO'); setExpConcept(''); setExpAmount(''); setExpCategory(ExpenseCategory.OTHER); setExpPuc(''); setExpSupplier(''); setExpDate(new Date().toISOString().split('T')[0]); setExpPeriodicity(ExpensePeriodicity.UNIQUE);
      }
      setIsExpenseModalOpen(true);
  };

  const handleEmptyAction = () => {
    if (activeTab === 'orders') handleOpenOrderModal();
    if (activeTab === 'expenses') handleOpenExpenseModal();
  };

  const isOrdersEmpty = purchaseOrders.length === 0;
  const isExpensesEmpty = expenses.filter(e => e.isActive).length === 0;

  const saveExpense = (e: React.FormEvent) => {
      e.preventDefault();
      if (!expPuc || !expConcept || !expAmount) { notify("Complete los campos obligatorios", "error"); return; }
      
      const accrualDate = new Date(expDate);
      const data: Expense = { 
        id: editingExpense?.id || null, 
        branchId: currentBranchId, 
        description: expConcept.toUpperCase(), 
        amount: parseFloat(expAmount) + expTaxValue, 
        taxAmount: expTaxValue, 
        category: expCategory, 
        type: expType, 
        date: accrualDate, 
        nextExecution: accrualDate, 
        registeredBy: 'Admin', 
        isActive: true, 
        pucAccountId: expPuc, 
        supplierId: expSupplier, 
        periodicity: expPeriodicity, 
        isExecuted: editingExpense ? editingExpense.isExecuted : false,
        notify: false, 
        paymentMethod: PaymentMethod.CASH 
      };
      if (editingExpense) onUpdateExpense(data); else onAddExpense(data, expPuc);
      setIsExpenseModalOpen(false); 
      notify("Gasto guardado", "success");
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-slate-50 pb-24 md:pb-8">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
             <CalculatorIcon className="text-brand-600" size={32} /> Gestión de Egresos
          </h2>
          <p className="text-slate-500 font-medium text-[10px] tracking-widest mt-1">Control de compras, costos operativos y proveedores.</p>
        </div>
        {creditOrders.length > 0 && (
          <div className="flex gap-2 print:hidden">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2 flex items-center gap-2">
              <CreditCard size={15} className="text-amber-500" />
              <div>
                <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest leading-none">Por Pagar</p>
                <p className="text-sm font-black text-amber-700 leading-tight">{formatCOP(totalPayables)}</p>
              </div>
            </div>
            {overduePayables.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-2 flex items-center gap-2">
                <AlertCircle size={15} className="text-red-500" />
                <div>
                  <p className="text-[8px] font-black text-red-400 uppercase tracking-widest leading-none">Vencidas</p>
                  <p className="text-sm font-black text-red-700 leading-tight">{overduePayables.length}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Tabs (now includes Cuentas por Pagar) ──────────────────────────── */}
      <div className="grid grid-cols-4 p-1.5 bg-slate-200/50 rounded-2xl mb-8 w-full shadow-inner print:hidden">
        <button onClick={() => setActiveTab('orders')} className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'orders' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}><ShoppingCartIcon size={14}/> Órdenes</button>
        <button onClick={() => setActiveTab('expenses')} className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'expenses' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}><ReceiptIcon size={14}/> Gastos</button>
        <button onClick={() => setActiveTab('payables')} className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap relative ${activeTab === 'payables' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'}`}>
          <CreditCard size={14}/> Ctas. x Pagar
          {overduePayables.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
        </button>
        <button onClick={() => setActiveTab('suppliers')} className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'suppliers' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}><TruckIcon size={14}/> Proveedores</button>
      </div>

      {/* ─── Contextual action bar per tab ──────────────────────────────── */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        {activeTab === 'orders' && (
          <div className="flex gap-2 ml-auto">
            <button onClick={handleExportCSV} className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"><DownloadIcon size={14}/> Excel</button>
            <button onClick={() => window.print()} className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"><PrinterIcon size={14}/> PDF</button>
            <button onClick={() => handleOpenOrderModal()} className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-brand-600 transition-all flex items-center gap-2"><PlusIcon size={14}/> Nueva Orden</button>
          </div>
        )}
        {activeTab === 'expenses' && (
          <div className="flex gap-2 ml-auto">
            <button onClick={handleExportCSV} className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"><DownloadIcon size={14}/> Excel</button>
            <button onClick={() => window.print()} className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"><PrinterIcon size={14}/> PDF</button>
            <button onClick={() => handleOpenExpenseModal()} className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-brand-600 transition-all flex items-center gap-2"><PlusIcon size={14}/> Nuevo Gasto</button>
          </div>
        )}
        {activeTab === 'payables' && (
          <div className="flex gap-2 ml-auto">
            <button onClick={handleExportCSV} className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"><DownloadIcon size={14}/> Exportar</button>
          </div>
        )}
      </div>

      <div className="animate-in fade-in duration-500">
        {(
            (activeTab === 'orders' && isOrdersEmpty) ||
            (activeTab === 'expenses' && isExpensesEmpty)
        ) && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <div className="bg-slate-100 w-32 h-32 rounded-full flex items-center justify-center mb-6">
                {activeTab === 'orders'? <ShoppingCartIcon size={48} className="text-slate-300" /> : <ReceiptIcon size={48} className="text-slate-300"/>}
            </div>
            <h3 className="text-2xl font-black">Sin {activeTab === 'orders'? 'órdenes de compra' : 'gastos'}</h3>
            <p className="text-slate-500 mt-3 max-w-xs">No existen {activeTab === 'orders' ? 'órdenes de compra registradas' : 'gastos registrados'}</p>
            <button onClick={handleEmptyAction} className="mt-8 bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
                <Plus size={18} />
                Crear {activeTab === 'orders'? 'orden de compra' : 'gasto'}
            </button>
          </div>
        )}

        {/* ─── ORDERS TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'orders' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {purchaseOrders.map(po => {
                  const isCredit = (po as any).paymentType === 'CREDITO';
                  const isPaid = (po as any).paymentStatus === 'PAGADO';
                  const dueDate = (po as any).creditDueDate;
                  const daysLeft = dueDate ? getDaysUntilDue(dueDate) : null;
                  const isOverdue = daysLeft !== null && daysLeft < 0 && !isPaid;

                  return (
                    <div key={po.id} className={`bg-white p-6 rounded-[2.5rem] border shadow-sm hover:shadow-xl transition-all ${isCredit && isOverdue ? 'border-red-200 ring-2 ring-red-50' : isCredit ? 'border-amber-100' : 'border-slate-100'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-black text-slate-800 uppercase text-xs">Orden #{po.id.slice(-6).toUpperCase()}</h4>
                              {/* ─── NEW: Payment type badge ─────────────────── */}
                              <div className="flex items-center gap-1.5 mt-1">
                                {isCredit ? (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${isPaid ? 'bg-emerald-50 text-emerald-600' : isOverdue ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                                    <CreditCard size={9}/> {isPaid ? 'CRÉDITO — PAGADO' : isOverdue ? `VENCIDO hace ${Math.abs(daysLeft!)}d` : `CRÉDITO — ${daysLeft}d`}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-slate-50 text-slate-500">
                                    <Banknote size={9}/> CONTADO
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => handleOpenDetailModal(po)} className="p-2 text-slate-300 hover:text-brand-600 transition-colors"><Eye size={16}/></button>
                                {po.status === PurchaseOrderStatus.DRAFT && <button onClick={() => handleOpenOrderModal(po)} className="p-2 text-slate-300 hover:text-brand-600 transition-colors"><Edit2Icon size={16}/></button>}
                            </div>
                        </div>

                        <div className="flex justify-between items-center mb-4">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getStatusStyle(po.status)}`}>{po.status}</span>
                            <span className="text-sm font-black text-slate-900">{formatCOP(po.total)}</span>
                        </div>

                        {/* ─── NEW: Credit progress bar ─────────────────────── */}
                        {isCredit && !isPaid && dueDate && (
                          <div className="mb-4 bg-slate-50 rounded-2xl p-3">
                            <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase mb-1.5">
                              <span>Vence</span>
                              <span className={isOverdue ? 'text-red-500' : daysLeft! <= 7 ? 'text-amber-500' : 'text-slate-500'}>
                                {new Date(dueDate).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex justify-between text-[9px] font-black mb-1">
                              <span className="text-slate-400 uppercase">Pendiente</span>
                              <span className="text-amber-600">{formatCOP(po.total - (po.paidAmount || 0))}</span>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col gap-2">
                            {po.status === PurchaseOrderStatus.DRAFT && <button onClick={() => handleApproveOrder(po)} className="py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all bg-brand-600 text-white shadow-lg">Aprobar Orden</button>}
                            {po.status === PurchaseOrderStatus.APPROVED && <button onClick={() => handleOpenOrderModal(po, true)} className="w-full bg-emerald-600 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Recibir Mercancía</button>}
                            {/* ─── NEW: Mark as paid button for credit orders ─── */}
                            {isCredit && !isPaid && po.status !== PurchaseOrderStatus.DRAFT && (
                              <button onClick={() => handleMarkAsPaid(po)} className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-1.5 ${isOverdue ? 'bg-red-600 text-white shadow-lg' : 'bg-amber-500 text-white shadow-lg'}`}>
                                <DollarSign size={12}/> Registrar Pago
                              </button>
                            )}
                            <button onClick={() => handlePrintOrder(po)} className="w-full bg-slate-50 text-slate-500 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Imprimir Ticket</button>
                        </div>
                    </div>
                  );
                })}
            </div>
        )}

        {/* ─── EXPENSES TAB ───────────────────────────────────────────────── */}
        {activeTab === 'expenses' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {expenses.filter(e => e.isActive).map(e => (
                    <div key={e.id} className={`bg-white p-6 rounded-[2.5rem] border shadow-sm transition-all ${e.isExecuted ? 'border-emerald-100 ring-2 ring-emerald-50' : 'border-slate-100'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${e.isExecuted ? 'bg-emerald-50 text-emerald-500' : (e.type === 'GASTO' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500')}`}>
                                    {e.isExecuted ? <CheckCircleIcon size={24}/> : <ReceiptIcon size={24}/>}
                                </div>
                                <div><h4 className="font-black text-slate-800 uppercase text-xs">{e.description}</h4><p className="text-[9px] text-slate-400 font-bold uppercase">{e.category}</p></div>
                            </div>
                            <button onClick={() => handleOpenExpenseModal(e)} className="p-2 text-slate-300 hover:text-brand-600 transition-colors"><Edit2Icon size={16}/></button>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl mb-4 text-[9px] font-black text-slate-400 uppercase space-y-1">
                            <div className="flex justify-between"><span>Causación:</span><span className="text-slate-600">{new Date(e.date).toLocaleDateString()}</span></div>
                            <div className="flex justify-between"><span>Estado:</span><span className="text-brand-600 font-black">{e.isExecuted ? 'ASENTADO' : 'PENDIENTE'}</span></div>
                        </div>
                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-end">
                                <div><p className="text-[9px] font-black text-slate-300 uppercase leading-none mb-1">Valor Total</p><p className="text-xl font-black text-slate-900">{formatCOP(e.amount)}</p></div>
                                {e.isExecuted && <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[8px] font-black uppercase">Reflejado en Ledger</span>}
                            </div>
                            <button onClick={() => onEjecutarAsiento(e.id)} className={`w-full ${e.isExecuted ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-slate-900 text-white shadow-lg hover:bg-brand-600'} py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95`}>
                                <Zap size={14} className={e.isExecuted ? 'text-slate-400' : 'text-brand-400 fill-brand-400'}/> {e.isExecuted ? 'Volver a Asentar' : 'Asentar Gasto (Manual)'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* ─── NEW: CUENTAS POR PAGAR TAB ─────────────────────────────────── */}
        {activeTab === 'payables' && (
          <div className="space-y-8">
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Total por Pagar</p>
                <p className="text-3xl font-black text-slate-900">{formatCOP(totalPayables)}</p>
                <p className="text-[9px] text-slate-400 font-bold mt-1">{creditOrders.filter(o => (o as any).paymentStatus !== 'PAGADO').length} obligaciones activas</p>
              </div>
              <div className="bg-red-50 rounded-[2rem] p-6 border border-red-100 shadow-sm">
                <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-2">Obligaciones Vencidas</p>
                <p className="text-3xl font-black text-red-600">{overduePayables.length}</p>
                <p className="text-[9px] text-red-400 font-bold mt-1">{formatCOP(overduePayables.reduce((s, o) => s + (o.total - (o.paidAmount || 0)), 0))}</p>
              </div>
              <div className="bg-emerald-50 rounded-[2rem] p-6 border border-emerald-100 shadow-sm">
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2">Pagadas este período</p>
                <p className="text-3xl font-black text-emerald-700">{creditOrders.filter(o => (o as any).paymentStatus === 'PAGADO').length}</p>
                <p className="text-[9px] text-emerald-500 font-bold mt-1">{formatCOP(creditOrders.filter(o => (o as any).paymentStatus === 'PAGADO').reduce((s, o) => s + o.total, 0))}</p>
              </div>
            </div>

            {/* Payables list */}
            {creditOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mb-4">
                  <CreditCard size={32} className="text-slate-300" />
                </div>
                <h3 className="text-xl font-black text-slate-700">Sin cuentas por pagar</h3>
                <p className="text-slate-400 text-sm mt-2">Las órdenes a crédito aparecerán aquí</p>
              </div>
            ) : (
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="bg-slate-900 text-white px-8 py-5 grid grid-cols-12 text-[9px] font-black uppercase tracking-widest">
                  <div className="col-span-1">#</div>
                  <div className="col-span-3">Proveedor</div>
                  <div className="col-span-2 text-center">Vencimiento</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-2 text-right">Pendiente</div>
                  <div className="col-span-2 text-center">Acción</div>
                </div>
                <div className="divide-y divide-slate-50">
                  {creditOrders.map(po => {
                    const isPaid = (po as any).paymentStatus === 'PAGADO';
                    const dueDate = (po as any).creditDueDate;
                    const daysLeft = dueDate ? getDaysUntilDue(dueDate) : null;
                    const isOverdue = daysLeft !== null && daysLeft < 0 && !isPaid;
                    const pending = po.total - (po.paidAmount || 0);
                    const supplier = suppliers.find(s => s.id === po.supplierId);

                    return (
                      <div key={po.id} className={`px-8 py-5 grid grid-cols-12 items-center text-xs ${isOverdue ? 'bg-red-50/40' : ''}`}>
                        <div className="col-span-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase">#{po.id.slice(-6).toUpperCase()}</span>
                        </div>
                        <div className="col-span-3">
                          <p className="font-black text-slate-800 uppercase text-[10px] leading-tight">{supplier?.name || 'N/A'}</p>
                          <p className="text-[9px] text-slate-400">{supplier?.phone}</p>
                        </div>
                        <div className="col-span-2 text-center">
                          {dueDate ? (
                            <div>
                              <p className={`text-[10px] font-black ${isOverdue ? 'text-red-600' : daysLeft! <= 7 ? 'text-amber-500' : 'text-slate-600'}`}>
                                {new Date(dueDate).toLocaleDateString()}
                              </p>
                              <p className={`text-[9px] font-bold ${isOverdue ? 'text-red-400' : 'text-slate-400'}`}>
                                {isPaid ? '—' : isOverdue ? `${Math.abs(daysLeft!)}d vencido` : `${daysLeft}d restantes`}
                              </p>
                            </div>
                          ) : '—'}
                        </div>
                        <div className="col-span-2 text-right">
                          <p className="font-black text-slate-800 text-[10px]">{formatCOP(po.total)}</p>
                        </div>
                        <div className="col-span-2 text-right">
                          {isPaid ? (
                            <span className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-full">Pagado</span>
                          ) : (
                            <p className={`font-black text-[10px] ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>{formatCOP(pending)}</p>
                          )}
                        </div>
                        <div className="col-span-2 flex justify-center">
                          {!isPaid ? (
                            <button onClick={() => handleMarkAsPaid(po)} className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center gap-1 ${isOverdue ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>
                              <DollarSign size={10}/> Pagar
                            </button>
                          ) : (
                            <button onClick={() => handleOpenDetailModal(po)} className="px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 flex items-center gap-1">
                              <Eye size={10}/> Ver
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── SUPPLIERS TAB ──────────────────────────────────────────────── */}
        {activeTab === 'suppliers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
                    <div key={s.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:border-brand-200 transition-all flex flex-col group relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 border border-slate-100 flex items-center justify-center font-black text-2xl group-hover:bg-brand-50 group-hover:text-brand-600 transition-all shadow-sm">{s.name.charAt(0)}</div>
                                <div>
                                    <h3 className="font-black text-slate-800 uppercase text-sm leading-tight">{s.name}</h3>
                                    <div className="flex items-center gap-1 mt-1 text-slate-400"><FingerprintIcon size={12}/><span className="text-[10px] font-bold uppercase">NIT: {s.taxId || 'SIN NIT'}</span></div>
                                </div>
                            </div>
                            <button onClick={() => handleOpenSupplierModal(s)} className="p-2 text-slate-300 hover:text-brand-600 transition-all bg-slate-50 rounded-xl"><Edit2Icon size={18}/></button>
                        </div>
                        <div className="space-y-2 mt-4 text-[11px] font-medium text-slate-600 relative z-10">
                            <div className="flex items-center gap-3"><UserIcon size={14} className="text-brand-500" /><span>{s.contactName}</span></div>
                            <div className="flex items-center gap-3"><PhoneIcon size={14} className="text-brand-500" /><span>{s.phone}</span></div>
                            <div className="flex items-center gap-3"><MailIcon size={14} className="text-brand-500" /><span className="truncate">{s.email || '--'}</span></div>
                        </div>
                        <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-brand-600 rounded-full opacity-5 pointer-events-none group-hover:scale-150 transition-transform"></div>
                    </div>
                ))}
                <button onClick={() => handleOpenSupplierModal()} className="h-full min-h-[200px] border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 hover:border-brand-600 hover:text-brand-600 transition-all">
                    <PlusIcon size={40} className="mb-2"/>
                    <span className="font-black uppercase tracking-widest text-[10px]">Nuevo Proveedor</span>
                </button>
            </div>
        )}
      </div>

      {/* ─── MODAL: ORDEN DE COMPRA / RECEPCIÓN ─────────────────────────────── */}
      {isOrderModalOpen && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[1100] p-4">
              <div className="bg-white rounded-[3rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[92vh]">
                  <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                      <div className="flex items-center gap-4">
                          <div className="bg-brand-600 p-3 rounded-2xl text-white shadow-lg"><ShoppingCartIcon size={24}/></div>
                          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800">
                              {isRealPurchase ? 'Recepcionar Mercancía' : (editingOrder ? 'Editar Orden' : 'Generar Orden de Compra')}
                          </h3>
                      </div>
                      <button onClick={() => setIsOrderModalOpen(false)} className="bg-white p-3 rounded-2xl text-slate-400 hover:text-slate-800 transition-all shadow-sm"><X size={24}/></button>
                  </div>
                  <form onSubmit={saveOrderOrPurchase} className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Proveedor Seleccionado</label>
                              <select required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black uppercase text-xs disabled:opacity-60" value={poSupplierId} onChange={e => setPoSupplierId(e.target.value)} disabled={isRealPurchase}>
                                  <option value="">-- Seleccione Proveedor --</option>
                                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Observaciones de la Compra</label>
                              <input className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-xs" value={poNotes} onChange={e => setPoNotes(e.target.value)} placeholder="Ej: Pago a 30 días, urgente..." />
                          </div>
                      </div>

                      {/* ─── NEW: Payment type selector ───────────────────────── */}
                      {!isRealPurchase && (
                        <div className="mb-8">
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Condición de Pago</label>
                          <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl">
                            <button
                              type="button"
                              onClick={() => setPoPaymentType('CONTADO')}
                              className={`flex items-center justify-center gap-2 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${poPaymentType === 'CONTADO' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}
                            >
                              <Banknote size={16} className={poPaymentType === 'CONTADO' ? 'text-emerald-500' : ''}/>
                              Contado
                            </button>
                            <button
                              type="button"
                              onClick={() => setPoPaymentType('CREDITO')}
                              className={`flex items-center justify-center gap-2 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${poPaymentType === 'CREDITO' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}
                            >
                              <CreditCard size={16} className={poPaymentType === 'CREDITO' ? 'text-amber-500' : ''}/>
                              A Crédito
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ─── NEW: Credit terms fields ─────────────────────────── */}
                      {poPaymentType === 'CREDITO' && !isRealPurchase && (
                        <div className="mb-8 bg-amber-50 border border-amber-100 rounded-[2rem] p-6">
                          <div className="flex items-center gap-2 mb-5">
                            <CreditCard size={16} className="text-amber-500"/>
                            <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Términos de Crédito — Cuenta por Pagar</span>
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <label className="block text-[10px] font-black text-amber-600 uppercase mb-2 tracking-widest">Plazo (días)</label>
                              <div className="flex items-center gap-2">
                                {[15, 30, 45, 60, 90].map(d => (
                                  <button
                                    key={d}
                                    type="button"
                                    onClick={() => setPoCreditDays(d)}
                                    className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${poCreditDays === d ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}
                                  >
                                    {d}d
                                  </button>
                                ))}
                              </div>
                              <input
                                type="number"
                                className="mt-3 w-full bg-white border-none rounded-2xl p-3 font-black text-xs text-center"
                                value={poCreditDays}
                                onChange={e => setPoCreditDays(parseInt(e.target.value) || 0)}
                                min={1}
                                placeholder="Días personalizados"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-amber-600 uppercase mb-2 tracking-widest">Fecha de Vencimiento</label>
                              <input
                                type="date"
                                className="w-full bg-white border-none rounded-2xl p-3 font-black text-xs"
                                value={poCreditDueDate}
                                onChange={e => {
                                  setPoCreditDueDate(e.target.value);
                                  const diff = getDaysUntilDue(e.target.value);
                                  setPoCreditDays(Math.max(1, diff));
                                }}
                              />
                              <div className="mt-3 bg-white rounded-2xl p-3 flex items-center gap-2">
                                <AlertCircle size={12} className="text-amber-400 flex-shrink-0"/>
                                <p className="text-[9px] text-amber-600 font-bold">Esta orden generará una <strong>cuenta por pagar</strong> registrada en el módulo de Cuentas por Pagar.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Items section */}
                      <div className="space-y-4">
                          <div className="flex justify-between items-center px-2">
                              <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">Desglose de Ítems</h4>
                              {!isRealPurchase && <button type="button" onClick={addPoItem} className="bg-slate-900 text-white p-2 rounded-xl shadow-lg hover:bg-brand-600 transition-all"><PlusIcon size={20}/></button>}
                          </div>
                          <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 space-y-3">
                              {poItems.map((item, idx) => (
                                  <div key={item.id} className="grid grid-cols-12 gap-3 items-center animate-in slide-in-from-left-2">
                                      <div className="col-span-6">
                                          <select required className="w-full bg-white rounded-xl p-3 text-[10px] font-bold uppercase border-none outline-none disabled:opacity-60" value={item.linkedId} onChange={e => updatePoItem(idx, 'linkedId', e.target.value)} disabled={isRealPurchase}>
                                              <option value="">Buscar Insumo...</option>
                                              {inventory.map(inv => <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>)}
                                          </select>
                                      </div>
                                      <div className="col-span-2 text-center">
                                          <input required type="number" className="w-full bg-white rounded-xl p-3 text-center font-black text-xs border-none outline-none" value={item.quantity} onChange={e => updatePoItem(idx, 'quantity', parseFloat(e.target.value))} placeholder="Cant" />
                                      </div>
                                      <div className="col-span-3">
                                          <input required type="number" className="w-full bg-white rounded-xl p-3 text-right font-black text-xs border-none outline-none" value={item.cost} onChange={e => updatePoItem(idx, 'cost', parseFloat(e.target.value))} placeholder="Costo" />
                                      </div>
                                      <div className="col-span-1 text-right">
                                          {!isRealPurchase && <button type="button" onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 transition-colors"><Trash size={16}/></button>}
                                      </div>
                                  </div>
                              ))}
                              {poItems.length === 0 && <p className="text-center py-6 text-slate-400 text-[10px] font-bold uppercase">Agregue insumos para continuar</p>}
                          </div>
                      </div>

                      <div className="mt-10 flex flex-col items-end gap-3 px-6">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Estimado Compra</p>
                          <h4 className="text-4xl font-black text-slate-900">{formatCOP(poItems.reduce((s, i) => s + (Number(i.quantity || 0) * Number(i.cost || 0)), 0))}</h4>
                          {poPaymentType === 'CREDITO' && poCreditDueDate && (
                            <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-2xl border border-amber-100">
                              <CreditCard size={13} className="text-amber-500"/>
                              <span className="text-[9px] font-black text-amber-600 uppercase">
                                Crédito — Vence el {new Date(poCreditDueDate).toLocaleDateString()} ({poCreditDays} días)
                              </span>
                            </div>
                          )}
                          <button type="submit" className={`mt-6 w-full py-6 rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-xl active:scale-95 transition-all ${isRealPurchase ? 'bg-emerald-600 text-white' : poPaymentType === 'CREDITO' ? 'bg-amber-500 text-white' : 'bg-slate-900 text-white'}`}>
                              {isRealPurchase ? 'Confirmar Recepción y Actualizar Stock' : (editingOrder ? 'Actualizar Orden' : poPaymentType === 'CREDITO' ? 'Generar Orden a Crédito — Cuenta por Pagar' : 'Generar Orden Maestra')}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* ─── MODAL: DETALLE DE ORDEN ─────────────────────────────────────────── */}
      {isDetailModalOpen && viewingOrder && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[1100] p-4">
              <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                  <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                          <div className="bg-slate-900 p-2.5 rounded-2xl text-white"><FileTextIcon size={24}/></div>
                          <h3 className="text-xl font-black uppercase tracking-tighter">Detalle Orden #{viewingOrder.id.slice(-6).toUpperCase()}</h3>
                      </div>
                      <button onClick={() => setIsDetailModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-800"><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 border border-slate-100 rounded-3xl">
                          <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Proveedor</p>
                              <p className="font-black text-slate-800 uppercase text-xs">{suppliers.find(s => s.id === viewingOrder.supplierId)?.name || 'N/A'}</p>
                          </div>
                          <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado Actual</p>
                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${getStatusStyle(viewingOrder.status)}`}>{viewingOrder.status}</span>
                          </div>
                          {/* ─── NEW: Credit details in order detail modal ─── */}
                          {(viewingOrder as any).paymentType === 'CREDITO' && (
                            <>
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Condición de Pago</p>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-50 text-amber-600">
                                  <CreditCard size={9}/> Crédito — {(viewingOrder as any).creditDays} días
                                </span>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Vencimiento</p>
                                <p className={`font-black text-xs ${getDaysUntilDue((viewingOrder as any).creditDueDate) < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                                  {new Date((viewingOrder as any).creditDueDate).toLocaleDateString()}
                                  <span className="ml-2 text-[9px] font-bold text-slate-400">
                                    {getDaysUntilDue((viewingOrder as any).creditDueDate) < 0
                                      ? `(vencido hace ${Math.abs(getDaysUntilDue((viewingOrder as any).creditDueDate))}d)`
                                      : `(${getDaysUntilDue((viewingOrder as any).creditDueDate)}d restantes)`}
                                  </span>
                                </p>
                              </div>
                            </>
                          )}
                      </div>
                      <div className="space-y-3">
                          <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest pl-2">Insumos Solicitados</h4>
                          <div className="bg-white border border-slate-100 overflow-hidden shadow-sm rounded-2xl">
                              <table className="w-full text-left text-[11px]">
                                  <thead className="bg-slate-900 text-white font-black uppercase tracking-widest">
                                      <tr><th className="px-6 py-4">Ítem</th><th className="px-6 py-4 text-center">Cant.</th><th className="px-6 py-4 text-right">Unitario</th><th className="px-6 py-4 text-right">Total</th></tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                      {viewingOrder.items.map((it, idx) => {
                                        const invItem = inventory.find(i => i.id === (it.inventoryItemId || (it as any).linkedId));
                                        const displayName = it.name || invItem?.name || '—';
                                        return (
                                          <tr key={idx}>
                                              <td className="px-6 py-4 font-bold uppercase">{displayName}</td>
                                              <td className="px-6 py-4 text-center font-black">{it.quantity}</td>
                                              <td className="px-6 py-4 text-right text-slate-500">{formatCOP(it.cost)}</td>
                                              <td className="px-6 py-4 text-right font-black text-brand-600">{formatCOP(it.cost * it.quantity)}</td>
                                          </tr>
                                        );
                                      })}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                      <div className="flex justify-end pt-4">
                          <button onClick={() => setIsDetailModalOpen(false)} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95">Cerrar</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* ─── MODAL: RECHAZO ──────────────────────────────────────────────────── */}
      {isRejectionModalOpen && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[1200] p-4">
              <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl p-8 overflow-hidden animate-in zoom-in duration-200">
                  <h3 className="text-xl font-black uppercase tracking-tighter text-red-600 mb-4 flex items-center gap-2"><Ban size={24}/> Rechazar Orden</h3>
                  <form onSubmit={handleRejectOrderSubmit} className="space-y-6">
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Motivo del Rechazo</label>
                          <textarea required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-xs" rows={4} value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Ej: Precios incorrectos, proveedor sin stock..."></textarea>
                      </div>
                      <div className="flex gap-2">
                          <button type="button" onClick={() => setIsRejectionModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl uppercase text-[10px]">Cancelar</button>
                          <button type="submit" className="flex-1 py-4 bg-red-600 text-white font-black rounded-2xl uppercase text-[10px] shadow-lg">Confirmar</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* ─── MODAL: GASTO ────────────────────────────────────────────────────── */}
      {isExpenseModalOpen && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[1100] p-4">
              <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                  <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                      <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">{editingExpense ? 'Ajustar Gasto' : 'Legalizar Egreso'}</h3>
                      <button onClick={() => setIsExpenseModalOpen(false)} className="bg-white p-2 rounded-xl shadow-sm text-slate-400"><X size={20}/></button>
                  </div>
                  <form onSubmit={saveExpense} className="p-8 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Concepto / Descripción</label><input required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black uppercase text-xs" value={expConcept} onChange={e => setExpConcept(e.target.value)} /></div>
                              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Valor Base ($)</label><input required type="number" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-sm" value={expAmount} onChange={e => setExpAmount(e.target.value)} /></div>
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Periodicidad</label>
                                  <select className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black uppercase text-[10px]" value={expPeriodicity} onChange={e => setExpPeriodicity(e.target.value as ExpensePeriodicity)}>
                                      <option value={ExpensePeriodicity.UNIQUE}>ÚNICO</option>
                                      <option value={ExpensePeriodicity.WEEKLY}>SEMANAL</option>
                                      <option value={ExpensePeriodicity.FORTNIGHTLY}>QUINCENAL</option>
                                      <option value={ExpensePeriodicity.MONTHLY}>MENSUAL</option>
                                      <option value={ExpensePeriodicity.ANNUAL}>ANUAL</option>
                                  </select>
                              </div>
                          </div>
                          <div className="space-y-4">
                              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Fecha Inicio (Causación)</label><input required type="date" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black uppercase text-xs" value={expDate} onChange={e => setExpDate(e.target.value)} /></div>
                              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Cuenta Contable</label><select required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black uppercase text-[10px]" value={expPuc} onChange={e => setExpPuc(e.target.value)}><option value="">Seleccione Cuenta...</option>{puc.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}</select></div>
                              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Tercero / Proveedor</label><select required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black uppercase text-[10px]" value={expSupplier} onChange={e => setExpSupplier(e.target.value)}><option value="">Seleccione...</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                          </div>
                      </div>
                      <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl uppercase tracking-widest text-[10px]">Guardar Registro</button>
                  </form>
              </div>
          </div>
      )}

      {/* ─── MODAL: PROVEEDOR ────────────────────────────────────────────────── */}
      {isSupplierModalOpen && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[1100] p-4">
              <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                  <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                      <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">{editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
                      <button onClick={() => setIsSupplierModalOpen(false)} className="bg-white p-2 rounded-xl shadow-sm text-slate-400"><X size={20}/></button>
                  </div>
                  <form onSubmit={saveSupplier} className="p-8 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nombre / Razón Social</label><input required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black uppercase text-xs" value={sName} onChange={e => setSName(e.target.value)} /></div>
                              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">NIT / RUT</label><input required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black uppercase text-xs" value={sTaxId} onChange={e => setSTaxId(e.target.value)} /></div>
                              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Persona de Contacto</label><input required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-xs" value={sContact} onChange={e => setSContact(e.target.value)} /></div>
                          </div>
                          <div className="space-y-4">
                              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Teléfono de Contacto</label><input required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black uppercase text-xs" value={sPhone} onChange={e => setSPhone(e.target.value)} /></div>
                              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Email Corporativo</label><input type="email" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-xs" value={sEmail} onChange={e => setSEmail(e.target.value)} /></div>
                              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Dirección de Despacho</label><input className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-xs" value={sAddress} onChange={e => setSAddress(e.target.value)} /></div>
                          </div>
                      </div>
                      <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl uppercase tracking-widest text-[10px]">Guardar Proveedor</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};