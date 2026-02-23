import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Plus, Minus, CreditCard, Banknote, QrCode, X, Lock, Send, ReceiptText, 
  UtensilsCrossed, Save, Grid3X3, Unlock, AlertTriangle, 
  Tag, User, Star, Edit2, History, Clock, Flame, Beer, CalendarPlus2, BellRing, Link
} from 'lucide-react';

import { 
  Product, CartItem, OrderType, Customer, PaymentMethod, Table, Order, TableStatus, OrderStatus, 
  ItemStatus, Role, LoyaltyConfig, InventoryItem, POSConfig, ProductType, PromotionType, 
  DocumentType, ImpoconsumoConfig, Branch, CashRegister, ProductionArea, Category 
} from '../types';

import { useNotification } from './NotificationContext';

interface POSViewProps {
  products: Product[];
  inventory: InventoryItem[];
  categories: Category[];
  onProcessPayment: (
    items: CartItem[], total: number, type: OrderType, method: PaymentMethod, 
    customer?: Customer, redeemedPoints?: number, existingOrderId?: string, 
    receivedAmount?: number, changeAmount?: number, seatNumber?: number, subtotal?: number, 
    tax?: number, impoconsumo?: number, deliveryAddress?: string, tableId?:string
  ) => void;
  onSendOrder: (
    items: CartItem[], type: OrderType, customer?: Customer, existingOrderId?: string, 
    toKDS?: boolean, seatNumber?: number, subtotal?: number, tax?: number, impoconsumo?: number, 
    deliveryAddress?: string
  ) => void;
  onCancelOrder: (order: Order) => void;
  customers: Customer[];
  selectedTable?: Table;
  selectedSeat?: number;
  onSelectTable: (table: Table | undefined, seatNumber?: number) => void;
  tables: Table[];
  isRegisterOpen: boolean;
  orders: Order[];
  taxRate: number;
  impoconsumoConfig?: ImpoconsumoConfig;
  userRole: Role;
  loyaltyConfig: LoyaltyConfig;
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onChangeTable: (orderId: string, newTableId: string) => void;
  onViewTables?: () => void;
  onOpenRegisterRequest?: () => void;
  posConfig: POSConfig;
  onPrintOrder?: (order: Order) => void;
  currentBranch?: Branch;
  activeRegister?: CashRegister;
  onPatchOrder?: (orderId: string, updates: Partial<Order>) => void;
}

export const POSView: React.FC<POSViewProps> = ({
  products, inventory, categories, onProcessPayment, onSendOrder, customers,
  selectedTable, selectedSeat, onSelectTable, tables, isRegisterOpen,
  orders, userRole, loyaltyConfig, onViewTables, onOpenRegisterRequest,
  posConfig, onPrintOrder, taxRate, impoconsumoConfig, onAddCustomer,
  currentBranch, activeRegister, onPatchOrder
}) => {
  const { notify } = useNotification();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [orderType, setOrderType] = useState<OrderType>(selectedTable ? OrderType.DINE_IN : OrderType.TAKEAWAY);
  const [selectedCustomerState, setSelectedCustomerState] = useState<Customer | undefined>(undefined);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [showCashEntry, setShowCashEntry] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [custSearch, setCustSearch] = useState('');
  const [showCustDropdown, setShowCustDropdown] = useState(false);
  const [isCustModalOpen, setIsCustModalOpen] = useState(false);
  const [rightTab, setRightTab] = useState<'gestion' | 'monitor'>('gestion');
  const [redeemedPoints, setRedeemedPoints] = useState(0);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [tempAddress, setTempAddress] = useState('');
  const [selectedMonitorOrder, setSelectedMonitorOrder] = useState<Order | null>(null);

  const formatCOP = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  const generalCustomer: Customer = useMemo(() => ({
    id: 'consumidor-final', name: 'Consumidor Final', phone: '0000000', points: 0, isActive: true, documentNumber: '222222222222'
  }), []);

  const activeCustomer = useMemo(() => {
    if (!selectedCustomerState || selectedCustomerState.id === 'consumidor-final') return selectedCustomerState || generalCustomer;
    return customers.find(c => c.id === selectedCustomerState.id) || selectedCustomerState;
  }, [customers, selectedCustomerState, generalCustomer]);

  useEffect(() => setCustSearch(''), [selectedCustomerState]);

  useEffect(() => {
    if (selectedTable) {
      setOrderType(OrderType.DINE_IN);
      setSelectedOrderId(null);
      const activeTableOrders = orders.filter(o =>
        o.tableId === selectedTable.id &&
        o.seatNumber === selectedSeat &&
        o.status !== OrderStatus.CANCELLED &&
        o.status !== OrderStatus.COMPLETED
      );
      if (activeTableOrders.length > 0) {
        const linkedCust = customers.find(c => c.id === activeTableOrders[0].customerId);
        setSelectedCustomerState(linkedCust || generalCustomer);
        if (activeTableOrders[0].deliveryAddress) setTempAddress(activeTableOrders[0].deliveryAddress);
      } else {
        setSelectedCustomerState(generalCustomer);
        setTempAddress('');
      }
    } else if (!selectedOrderId) {
      setOrderType(OrderType.TAKEAWAY);
      setSelectedCustomerState(generalCustomer);
      setTempAddress('');
    }
  }, [selectedTable?.id, selectedSeat, orders, customers, generalCustomer, selectedOrderId]);

  const focusedOrders = useMemo(() => {
    if (selectedTable) return orders.filter(o => o.tableId === selectedTable.id && o.seatNumber === selectedSeat && o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.COMPLETED);
    if (selectedOrderId) return orders.filter(o => o.id === selectedOrderId && o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.COMPLETED);
    return [];
  }, [selectedTable, selectedSeat, selectedOrderId, orders]);

  const allActiveOrders: Order[] = useMemo(() => {
      return orders.filter(o => 
          o.status !== OrderStatus.COMPLETED && 
          o.status !== OrderStatus.CANCELLED
      ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders]);

  const categoriesList = useMemo(() => [{ key: 'Todos', label: 'Todos' }, ...(categories ?? []).map(c => ({
    key: c.id,
    label: c.name
  }))], [categories]);

  const filteredCustomers: Customer[] = useMemo(() => {
    if (custSearch.length < 2) return [];
    return customers.filter(c =>
      c.name.toLowerCase().includes(custSearch.toLowerCase()) ||
      (c.documentNumber && c.documentNumber.includes(custSearch))
    ).slice(0, 5);
  }, [customers, custSearch]);

  const getEffectivePrice = (product: Product) => {
    if (product.promotionType === PromotionType.PERCENTAGE && product.promotionValue) return product.price * (1 - product.promotionValue / 100);
    if (product.promotionType === PromotionType.FIXED_PRICE && product.promotionValue) return product.promotionValue;
    return product.price;
  };

  const checkProductAvailability = (product: Product): boolean => {
    if (!product.isActive) return false;
    if (product.productType === ProductType.DIRECT_SALE) return (product.stock ?? 0) > 0;
    if (product.productType === ProductType.PREPARED) {
      if (!product.ingredients || product.ingredients.length === 0) return false;
      return product.ingredients.every(ingredient => {
        const invItem = inventory.find(inv => inv.id === ingredient.inventoryItemId);
        return invItem && invItem.stock >= ingredient.quantity;
      });
    }
    if (product.productType === ProductType.COMBO) {
      if (!product.comboItems || product.comboItems.length === 0) return false;
      return product.comboItems.every(comboItem => {
        const childProduct = products.find(p => p.id === comboItem.productId);
        return childProduct && checkProductAvailability(childProduct);
      });
    }
    return true;
  };

  const calculatePendingTaxes = useMemo(() => {
    let sub = 0, iva = 0, impoc = 0;
    cart.forEach(item => {
      const price = getEffectivePrice(item.product);
      const itemSub = price * item.quantity;
      sub += itemSub;
      iva += itemSub * taxRate;
      if (impoconsumoConfig?.enabled) {
        const appliesPrepared = (impoconsumoConfig.appliesTo === 'BOTH' || impoconsumoConfig.appliesTo === 'PREPARED') && item.product.productType === ProductType.PREPARED;
        const appliesDirect = (impoconsumoConfig.appliesTo === 'BOTH' || impoconsumoConfig.appliesTo === 'DIRECT') && item.product.productType === ProductType.DIRECT_SALE;
        if (appliesPrepared || appliesDirect) impoc += itemSub * impoconsumoConfig.rate;
      }
    });
    return { sub, iva, impoc };
  }, [cart, taxRate, impoconsumoConfig]);

  const sentSubtotal = focusedOrders.reduce((s, o) => s + (o.subtotal || 0), 0);
  const sentIva = focusedOrders.reduce((s, o) => s + (o.tax || 0), 0);
  const sentImpoc = focusedOrders.reduce((s, o) => s + (o.impoconsumoAmount || 0), 0);

  const currentSubtotal = calculatePendingTaxes.sub + sentSubtotal;
  const currentIva = calculatePendingTaxes.iva + sentIva;
  const currentImpoc = calculatePendingTaxes.impoc + sentImpoc;
  const loyaltyDiscount = redeemedPoints * loyaltyConfig.currencyPerPoint;
  const currentTotal = Math.max(0, (currentSubtotal + currentIva + currentImpoc) - loyaltyDiscount);
  const cashChange = useMemo(() => Math.max(0, (parseFloat(receivedAmount) || 0) - currentTotal), [receivedAmount, currentTotal]);

  const addToCart = (product: Product) => {
    if (!checkProductAvailability(product)) {
      notify(`Materiales insuficientes para ${product.name}`, 'error');
      return;
    }
    const effectivePrice = getEffectivePrice(product);
    const existing = cart.find(i => i.product.id === product.id && i.status === ItemStatus.PENDING);
    if (existing) {
      setCart(cart.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1, price: effectivePrice } : i));
    } else {
      setCart([...cart, {
        cartId: `c-${Date.now()}`,
        product,
        quantity: 1,
        status: ItemStatus.PENDING,
        price: effectivePrice
      }]);
    }
  };

  const handleSendToKitchen = () => {
    if (cart.length === 0) return;
    onSendOrder(cart.map(i => ({ ...i })), orderType, activeCustomer, focusedOrders[0]?.id, true, selectedSeat,
      currentSubtotal, currentIva, currentImpoc, tempAddress);
    setCart([]);
    if (selectedTable) onSelectTable(undefined);
    else setSelectedOrderId(null);
  };

  const handleFinalizePayment = (method: PaymentMethod) => {
        if (!selectedMonitorOrder) return;

        const itemsToCharge = selectedMonitorOrder.items || [];
        const received = parseFloat(receivedAmount) || currentTotal;
        const change = Math.max(0, received - currentTotal);
        const tableId = selectedTable?.id || undefined;

        onProcessPayment(
            itemsToCharge.map(i => ({ ...i })), // <-- items de la orden seleccionada
            currentTotal,
            orderType,
            method,
            activeCustomer,
            redeemedPoints,
            selectedMonitorOrder.id, // <-- id de la orden
            received,
            change,
            selectedSeat,
            currentSubtotal,
            currentIva,
            currentImpoc,
            tempAddress,
            tableId
        );

        // limpiar estados
        setSelectedMonitorOrder(null); 
        setCart([]);
        setRedeemedPoints(0);
        setIsPaymentModalOpen(false);
        setSelectedOrderId(null);
        if (selectedTable) onSelectTable(undefined);
    };

  const handleRedeemPoints = () => {
    if (activeCustomer.id === 'consumidor-final') return;
    if (activeCustomer.points < loyaltyConfig.minRedemptionPoints) {
      notify(`Mínimo ${loyaltyConfig.minRedemptionPoints} puntos para redimir`, 'warning');
      return;
    }
    const maxPossiblePointsForTotal = Math.floor((currentSubtotal + currentIva + currentImpoc) / loyaltyConfig.currencyPerPoint);
    const pointsToRedeem = Math.min(activeCustomer.points, maxPossiblePointsForTotal);
    setRedeemedPoints(pointsToRedeem);
    notify(`${pointsToRedeem} puntos aplicados como descuento`, 'success');
  };

  const handleLoadOrderFromMonitor = (order: Order) => {
    setSelectedMonitorOrder(order);
    if (order.tableId) {
      const table = tables.find(t => t.id === order.tableId);
      onSelectTable(table, order.seatNumber);
    } else {
      onSelectTable(undefined);
      setSelectedOrderId(order.id);
      setOrderType(order.type);
      setSelectedCustomerState(customers.find(c => c.id === order.customerId) || generalCustomer);
      if (order.deliveryAddress) setTempAddress(order.deliveryAddress);
    }
    setRightTab('gestion');
  };

  const handleSaveAddressUpdate = (orderId: string) => {
    if (onPatchOrder) {
      onPatchOrder(orderId, { deliveryAddress: tempAddress });
      setEditingAddressId(null);
      notify("Dirección actualizada", "success");
    }
  };

  const pendingByArea = useMemo(() => {
    const areas: Record<string, CartItem[]> = { [ProductionArea.KITCHEN]: [], [ProductionArea.GRILL]: [], [ProductionArea.BAR]: [] };
    focusedOrders.forEach(o => {
      o.items.filter(it => it.status === ItemStatus.PENDING || it.status === ItemStatus.READY).forEach(it => {
        if (areas[it.product.productionArea]) areas[it.product.productionArea].push(it);
      });
    });
    return areas;
  }, [focusedOrders]);

  const filteredProducts = products.filter(p =>
    (selectedCategory === 'Todos' || p.categoryId === selectedCategory) &&
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    p.isActive
    );

  if (!isRegisterOpen) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-100 text-slate-500 w-full p-4">
        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl text-center max-w-lg mx-auto border border-slate-200">
          <div className="bg-red-50 w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-10 text-red-600 ring-8 ring-red-50/50">
            <Lock size={56} strokeWidth={2.5} />
          </div>
          <h2 className="text-4xl font-black text-slate-800 mb-4 tracking-tighter">Terminal Bloqueada</h2>
          <p className="max-w-xs mx-auto text-slate-500 font-bold text-lg leading-tight mb-12 tracking-widest">Inicie un turno en el Dashboard para facturar.</p>
          <button onClick={onOpenRegisterRequest} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black py-6 rounded-[2.5rem] flex justify-center items-center uppercase tracking-widest text-sm shadow-2xl gap-3"><Unlock size={24} /> Abrir Caja</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <div className="flex-1 flex flex-col min-w-0 bg-slate-100 pb-20 md:pb-0">
        
        {Object.keys(products).length !== 0 && (
            <div className="p-4 md:p-6 space-y-4">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-brand-500" size={20} />
                        <input type="text" placeholder="Buscar plato..." className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-brand-500 font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    {onViewTables && (
                        <button onClick={onViewTables} className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg hover:bg-brand-600 transition-all active:scale-95 flex items-center gap-2"><Grid3X3 size={24} /><span className="hidden lg:inline text-[10px] font-black uppercase">Salón</span></button>
                    )}
                </div>
                <div className="flex space-x-2 overflow-x-auto no-scrollbar py-2">
                    {categoriesList.map(cat => (
                        <button key={cat.key} onClick={() => setSelectedCategory(cat.key)} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm ${
                            selectedCategory === cat.key
                                ? 'bg-brand-600 text-white scale-105'
                                : 'bg-white text-slate-500 hover:bg-slate-50'
                            }`}>
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>
        )}
        
        <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-8 custom-scrollbar relative">

            {(!products || products.length === 0 || filteredProducts.length === 0) ? (
                
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-50">
                <CalendarPlus2 size={100} className="mb-2 text-slate-300" />
                <p className="text-slate-400">Servicios vacío</p>
                </div>

            ) : (

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredProducts.map(product => {

                    const effectivePrice = getEffectivePrice(product);
                    const isPromo = product.promotionType !== PromotionType.NONE;
                    const isAvailable = checkProductAvailability(product);

                    return (
                    <button
                        key={product.id}
                        onClick={() => isAvailable && addToCart(product)}
                        className={`bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden transition-all group flex flex-col relative active:scale-95 animate-in fade-in ${
                        !isAvailable
                            ? 'opacity-50 cursor-not-allowed grayscale'
                            : 'hover:border-brand-300 hover:shadow-xl'
                        }`}
                    >
                        {isPromo && isAvailable && (
                        <div className="absolute top-3 left-3 z-10 bg-emerald-500 text-white px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1">
                            <Tag size={10}/> OFERTA
                        </div>
                        )}

                        {!isAvailable && (
                        <div className="absolute inset-0 z-20 bg-slate-900/40 backdrop-blur-[2px] flex flex-col items-center justify-center">
                            <div className="bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-1.5">
                            <AlertTriangle size={12}/> AGOTADO
                            </div>
                            <p className="text-[8px] text-white font-bold mt-1">
                            Sin materiales
                            </p>
                        </div>
                        )}

                        <div className="h-32 w-full overflow-hidden relative">
                        <img
                            src={product.imageUrl || `${import.meta.env.VITE_URL_BASE}/assets/img/default.png`}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        </div>

                        <div className="p-4 text-left flex-1 flex flex-col justify-between">
                        <div>
                            <h4 className="font-black text-slate-800 uppercase text-[11px] leading-tight mb-1 line-clamp-2">
                            {product.name}
                            </h4>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">
                            {product.category?.name}
                            </p>
                        </div>

                        <div className="flex justify-between items-end mt-2">
                            <div className="flex flex-col">
                            {isPromo ? (
                                <>
                                <span className="text-[10px] text-slate-400 line-through leading-none">
                                    {formatCOP(product.price)}
                                </span>
                                <span className="text-sm font-black text-brand-600">
                                    {formatCOP(effectivePrice)}
                                </span>
                                </>
                            ) : (
                                <span className="text-sm font-black text-slate-800">
                                {formatCOP(product.price)}
                                </span>
                            )}
                            </div>
                        </div>
                        </div>

                    </button>
                    );
                })}
                </div>

            )}

            </div>
      </div>

      <div className="w-full md:w-[380px] bg-white border-l border-slate-200 flex flex-col shadow-2xl relative z-40">
        <div className="flex bg-slate-100 p-1 border-b">
            <button onClick={() => setRightTab('gestion')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${rightTab === 'gestion' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <ReceiptText size={14}/> Venta
            </button>
            <button onClick={() => setRightTab('monitor')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${rightTab === 'monitor' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <BellRing size={14}/> Monitor {allActiveOrders.length > 0 && <span className="bg-brand-600 text-white w-4 h-4 flex items-center justify-center rounded-full text-[8px]">{allActiveOrders.length}</span>}
            </button>
        </div>

        {rightTab === 'gestion' ? (
            <>
                <div className="p-4 border-b bg-slate-50">
                    {selectedTable && (
                      <div className="mb-4 bg-brand-600 text-white rounded-2xl p-4 shadow-lg flex items-center justify-between animate-in slide-in-from-top-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                            {(selectedTable.mergedWith?.length || 0) > 0 ? <Link size={18}/> : <Grid3X3 size={18} />}
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
                                {(selectedTable.mergedWith?.length || 0) > 0 ? 'Grupo de Sillas' : 'Silla Seleccionada'}
                            </p>
                            <p className="text-sm font-black uppercase tracking-tighter">
                                {selectedTable.name} {selectedSeat && `- SILLA ${selectedSeat}`}
                                {(selectedTable.mergedWith?.length || 0) > 0 && (
                                    <span className="ml-2 text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
                                        CAP: {selectedTable.seats + (selectedTable.mergedWith?.length || 0) * 4} pers
                                    </span>
                                )}
                            </p>
                          </div>
                        </div>
                        <button onClick={() => onSelectTable(undefined)} className="hover:bg-white/10 p-2 rounded-xl transition-all"><X size={18} /></button>
                      </div>
                    )}

                    {/*
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <button onClick={() => { setOrderType(OrderType.TAKEAWAY); setSelectedOrderId(null); onSelectTable(undefined); }} className={`py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 ${orderType === OrderType.TAKEAWAY ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-500 border-slate-200'}`}><ShoppingBag size={12}/> Llevar</button>
                        <button onClick={() => { setOrderType(OrderType.DELIVERY); setSelectedOrderId(null); onSelectTable(undefined); }} className={`py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 ${orderType === OrderType.DELIVERY ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-500 border-slate-200'}`}><MapPin size={12}/> Domicilio</button>
                    </div>*/}

                    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                        <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                                <div className="bg-blue-50 p-1.5 rounded-lg text-blue-600"><User size={14}/></div>
                                <div><p className="text-[9px] font-black text-slate-800 uppercase leading-none">{activeCustomer.name}</p></div>
                            </div>
                            <div className="flex gap-1">
                                {activeCustomer.id !== 'consumidor-final' && (
                                    <button onClick={() => { setSelectedCustomerState(generalCustomer); setRedeemedPoints(0); }} className="text-red-500 hover:bg-red-50 p-1 rounded-lg transition-all" title="Cambiar Cliente"><X size={14}/></button>
                                )}
                                <button onClick={() => setIsCustModalOpen(true)} className="text-brand-600 hover:bg-brand p-1 rounded-lg transition-all"><Edit2 size={14}/></button>
                            </div>
                        </div>

                        {orderType === OrderType.DELIVERY && (
                            <div className="mt-2 relative">
                                <input 
                                    className="w-full bg-slate-50 border-none rounded-xl p-2 text-[9px] font-bold outline-none focus:ring-1 focus:ring-brand-500" 
                                    placeholder="Dirección de entrega..." 
                                    value={tempAddress} 
                                    onChange={e => setTempAddress(e.target.value)} 
                                />
                            </div>
                        )}
                        
                        {activeCustomer.id !== 'consumidor-final' && loyaltyConfig.enabled && (
                            <div className="mt-2 p-2 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Star size={12} className="text-emerald-600" fill="currentColor"/><span className="text-[9px] font-black text-emerald-800 uppercase">{activeCustomer.points} Pts</span>
                                </div>
                                <button onClick={handleRedeemPoints} className="px-2 py-1 bg-emerald-600 text-white text-[8px] font-black uppercase rounded-lg shadow-sm hover:bg-emerald-700 transition-all">Redimir</button>
                            </div>
                        )}

                        {activeCustomer.id === 'consumidor-final' && (
                            <div className="relative group mt-1">
                                <Search
                                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300"
                                    size={16}
                                    strokeWidth={2.2}
                                />
                                <input type="text" placeholder="Vincular cliente..." className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border-none rounded-xl text-[9px] font-bold focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-[9px] placeholder:text-slate-400" value={custSearch} onChange={e => { setCustSearch(e.target.value); setShowCustDropdown(true); }} />
                                {showCustDropdown && filteredCustomers.length > 0 && (
                                    <div className="absolute top-full left-0 w-full bg-white shadow-2xl rounded-2xl mt-1 border border-slate-100 overflow-hidden z-50">
                                        {filteredCustomers.map(c => (
                                            <button key={c.id} onClick={() => { setSelectedCustomerState(c); setShowCustDropdown(false); setRedeemedPoints(0); }} className="w-full p-2.5 text-left hover:bg-brand-50 border-b border-slate-50 last:border-0 flex justify-between items-center transition-all">
                                                <div className="flex flex-col"><span className="text-[10px] font-black uppercase text-slate-800">{c.name}</span></div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar space-y-3">
                    {focusedOrders.length > 0 && (
                        <div className="space-y-2 mb-4">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Producción Activa</span>
                            {(Object.entries(pendingByArea) as [string, CartItem[]][]).map(([area, items]) => {
                                if (items.length === 0) return null;
                                return (
                                    <div key={area} className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            {area === ProductionArea.KITCHEN ? <CalendarPlus2 size={10} className="text-brand-500"/> : area === ProductionArea.GRILL ? <Flame size={10} className="text-orange-500"/> : <Beer size={10} className="text-blue-500"/>}
                                            <span className="text-[8px] font-black text-slate-600 uppercase">{area}</span>
                                        </div>
                                        <div className="space-y-1">
                                            {items.map((it, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-[9px] font-bold text-slate-500">
                                                    <span className="uppercase">{it.quantity}x {it.product.name}</span>
                                                    <span className="text-brand-600">
                                                        <Clock size={8} className="inline mr-0.5"/> {it.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    
                    {cart.length === 0 && focusedOrders.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center py-16 text-slate-300 opacity-30">
                            <UtensilsCrossed size={48} className="mb-3" /><p className="font-black tracking-widest text-[10px]">Sin productos</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {cart.map(item => (
                                <div key={item.cartId} className="flex gap-3 items-center animate-in slide-in-from-right-2">
                                    <div className="flex-1 min-w-0">
                                        <h5 className="font-black text-slate-800 uppercase text-[9px] leading-tight truncate">{item.product.name}</h5>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="flex items-center bg-slate-100 rounded-lg"><button onClick={() => setCart(cart.map(i => i.cartId === item.cartId ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))} className="p-1 hover:text-brand-600 transition-colors"><Minus size={10}/></button><span className="text-[10px] font-black w-5 text-center tabular-nums">{item.quantity}</span><button onClick={() => setCart(cart.map(i => i.cartId === item.cartId ? { ...i, quantity: i.quantity + 1 } : i))} className="p-1 hover:text-brand-600 transition-colors"><Plus size={10}/></button></div>
                                            <span className="text-[10px] font-black text-brand-600 tabular-nums">{formatCOP(getEffectivePrice(item.product) * item.quantity)}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => setCart(cart.filter(i => i.cartId !== item.cartId))} className="text-slate-200 hover:text-red-500 transition-colors"><X size={16}/></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-900 text-white shadow-inner space-y-3">
                    <div className="space-y-1">
                        <div className="flex justify-between items-center text-[8px] font-bold text-slate-400 uppercase tracking-widest"><span>Subtotal</span><span className="tabular-nums">{formatCOP(currentSubtotal)}</span></div>
                        <div className="flex justify-between items-center text-[8px] font-bold text-slate-400 uppercase tracking-widest"><span>Iva</span><span className="tabular-nums">{formatCOP(currentIva)}</span></div>
                        {currentImpoc > 0 && <div className="flex justify-between items-center text-[8px] font-bold text-slate-400 uppercase tracking-widest"><span>Impoconsumo</span><span className="tabular-nums">{formatCOP(currentImpoc)}</span></div>}
                        {loyaltyDiscount > 0 && <div className="flex justify-between items-center text-[8px] font-bold text-emerald-400 uppercase tracking-widest"><span>Dcto Puntos ({redeemedPoints})</span><span className="tabular-nums">-{formatCOP(loyaltyDiscount)}</span></div>}
                        <div className="flex justify-between items-center pt-1 border-t border-white/10 mt-1"><span className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Total</span><span className="text-2xl font-black tabular-nums">{formatCOP(currentTotal)}</span></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={handleSendToKitchen} disabled={cart.length === 0} className="bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-black uppercase text-[8px] tracking-widest disabled:opacity-20 flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all"><Send size={14}/> Comanda</button>
                        <button onClick={() => setIsPaymentModalOpen(true)} disabled={!selectedMonitorOrder} className="bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-black uppercase text-[8px] tracking-widest disabled:opacity-20 flex items-center justify-center gap-1.5 shadow-xl active:scale-95 transition-all">
                            <Star size={14} fill="currentColor"/> Cobrar
                        </button>
                    </div>
                </div>
            </>
        ) : (
            <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
                <div className="p-4 border-b bg-white">
                    <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1 flex items-center gap-2"><BellRing size={14} className="text-brand-600"/> Monitor de Órdenes</h3>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Gestión de estados y despachos</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {allActiveOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-20"><History size={48} className="text-slate-400 mb-2"/><p className="text-[10px] font-black uppercase tracking-widest">Sin órdenes activas</p></div>
                    ) : allActiveOrders.map(o => {
                        const isDelivery = o.type === OrderType.DELIVERY;
                        const isDineIn = o.type === OrderType.DINE_IN;
                        const isTakeaway = o.type === OrderType.TAKEAWAY;

                        return (
                            <div key={o.id} className="bg-white p-4 rounded-[2rem] border-2 border-slate-50 shadow-sm space-y-3 animate-in fade-in">
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase text-slate-800">
                                            {o.tableId ? `UBICACIÓN: ${o.tableId.replace(/[^a-zA-Z0-9 ]/g, ' ').toUpperCase()}` : `ID: #${o.id.slice(-6).toUpperCase()}`}
                                        </span>
                                        <div className="mt-1 flex gap-1">
                                            {isDineIn && <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[7px] font-black uppercase">LOCAL</span>}
                                            {isTakeaway && <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[7px] font-black uppercase">LLEVAR</span>}
                                            {isDelivery && <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[7px] font-black uppercase">DOMICILIO</span>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleLoadOrderFromMonitor(o)}
                                        disabled={o.status !== OrderStatus.READY} // SOLO READY puede seleccionarse
                                        className={`p-2 rounded-xl transition-all ${
                                            o.status === OrderStatus.READY
                                            ? 'text-brand-600 bg-brand-50 hover:bg-brand-100'
                                            : 'text-slate-400 bg-slate-100 cursor-not-allowed'
                                        }`}
                                        title={
                                            o.status === OrderStatus.READY 
                                            ? 'Editar orden' 
                                            : `No disponible (estado: ${o.status})`
                                        }
                                        >
                                        <Edit2 size={14}/>
                                        </button>
                                </div>

                                {isDelivery && (
                                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Dirección de Entrega</span>
                                            {editingAddressId === o.id ? (
                                                <button onClick={() => handleSaveAddressUpdate(o.id)} className="text-emerald-600 text-[8px] font-black uppercase flex items-center gap-1"><Save size={10}/> Guardar</button>
                                            ) : (
                                                <button onClick={() => { setEditingAddressId(o.id); setTempAddress(o.deliveryAddress || ''); }} className="text-blue-600 text-[8px] font-black uppercase">Editar</button>
                                            )}
                                        </div>
                                        {editingAddressId === o.id ? (
                                            <input 
                                                autoFocus
                                                className="w-full bg-white border-none rounded-lg p-2 text-[9px] font-bold focus:ring-1 focus:ring-brand-500" 
                                                value={tempAddress}
                                                onChange={e => setTempAddress(e.target.value)}
                                            />
                                        ) : (
                                            <p className="text-[10px] font-bold text-slate-700 uppercase leading-tight">{o.deliveryAddress || 'Dirección no especificada'}</p>
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-between items-end">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-slate-400 uppercase">Items: {o.items.length}</span>
                                        <span className="text-sm font-black text-brand-600">{formatCOP(o.total)}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${o.status === OrderStatus.READY ? 'bg-emerald-500 text-white' : 'bg-orange-400 text-white'}`}>
                                            {o.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}
      </div>

      {isPaymentModalOpen && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[1000] flex items-center justify-center p-4">
              <div className="bg-white rounded-[3rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col md:flex-row max-h-[90vh]">
                  <div className="flex-1 p-10 border-r border-slate-100 overflow-y-auto">
                      <div className="flex justify-between items-center mb-10">
                          <div className="flex flex-col">
                              <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-800 flex items-center gap-3">Gestión de Pago</h3>
                              <p className="text-xs font-black text-brand-600 uppercase tracking-widest mt-1">Total a cobrar: <span className="text-xl text-slate-900 ml-2">{formatCOP(currentTotal)}</span></p>
                          </div>
                          <button onClick={() => { setIsPaymentModalOpen(false); setShowCashEntry(false); }} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-800 transition-all"><X size={24}/></button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                          <button onClick={() => { setShowCashEntry(true); setReceivedAmount(''); }} className={`h-40 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all ${showCashEntry ? 'bg-emerald-600 text-white shadow-2xl' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                              <Banknote size={44} /><span className="text-xs font-black uppercase tracking-widest">Efectivo</span>
                          </button>
                          <button onClick={() => handleFinalizePayment(PaymentMethod.CARD)} className="h-40 bg-slate-50 rounded-[2.5rem] text-slate-500 hover:bg-blue-600 hover:text-white transition-all flex flex-col items-center justify-center gap-4 active:scale-95">
                              <CreditCard size={44} /><span className="text-xs font-black uppercase tracking-widest">Datafono</span>
                          </button>
                          <button onClick={() => handleFinalizePayment(PaymentMethod.QR)} className="h-40 bg-slate-50 rounded-[2.5rem] text-slate-500 hover:bg-purple-600 hover:text-white transition-all flex flex-col items-center justify-center gap-4 active:scale-95">
                              <QrCode size={44} /><span className="text-xs font-black uppercase tracking-widest">QR Transfer</span>
                          </button>
                      </div>

                      {showCashEntry && (
                          <div className="mt-10 p-8 bg-emerald-50 rounded-[2.5rem] border-2 border-emerald-100 animate-in slide-in-from-top-4 flex flex-col sm:flex-row items-center gap-8">
                               <div className="flex-1 w-full text-center sm:text-left">
                                   <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">Monto Recibido</label>
                                   <input autoFocus type="number" className="w-full h-28 bg-slate-50 rounded-2xl px-6 !text-5xl leading-none font-black text-slate-800 text-center outline-none focus:ring-4 focus:ring-emerald-200 text-center" value={receivedAmount} onChange={e => setReceivedAmount(e.target.value)} placeholder="0" />
                               </div>
                               <div className="flex flex-col items-center sm:items-end gap-2">
                                   <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Vueltas</p>
                                   <h4 className="text-5xl font-black text-slate-800 tracking-tighter tabular-nums">{formatCOP(cashChange)}</h4>
                                   <button onClick={() => handleFinalizePayment(PaymentMethod.CASH)} className="mt-4 bg-emerald-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95">Confirmar</button>
                               </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};