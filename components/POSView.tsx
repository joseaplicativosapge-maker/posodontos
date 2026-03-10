import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Plus, Minus, CreditCard, Banknote, QrCode, X, Lock, Send, ReceiptText, 
  UtensilsCrossed, Save, Grid3X3, Unlock, AlertTriangle, 
  Tag, User, Star, Edit2, History, Clock, Flame, Beer, CalendarPlus2, BellRing, Link, CheckCircle,
  Stethoscope, ChevronDown, ChevronUp, Calendar, DollarSign, Wallet
} from 'lucide-react';

import { 
  Product, CartItem, OrderType, Customer, PaymentMethod, Table, Order, TableStatus, OrderStatus, 
  ItemStatus, Role, LoyaltyConfig, InventoryItem, POSConfig, ProductType, PromotionType, 
  DocumentType, ImpoconsumoConfig, Branch, CashRegister, ProductionArea, Category,
  PatientTreatment, TreatmentStatus, SessionStatus
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
  treatments?: PatientTreatment[];
  onSessionRealized?: (treatmentId: string, sessionId: string) => Promise<void>;
}

// ─── Configs visuales ────────────────────────────────────────────────────────
const T_CFG: Record<TreatmentStatus, { label: string; bg: string; text: string; border: string }> = {
  [TreatmentStatus.PENDIENTE]:   { label: 'Pendiente',   bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  [TreatmentStatus.EN_PROGRESO]: { label: 'En Progreso', bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200'   },
  [TreatmentStatus.COMPLETADO]:  { label: 'Completado',  bg: 'bg-emerald-100',text: 'text-emerald-700',border: 'border-emerald-200'},
  [TreatmentStatus.CANCELADO]:   { label: 'Cancelado',   bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200'    },
};

const S_CFG: Record<SessionStatus, { label: string; dot: string; bg: string }> = {
  [SessionStatus.PROGRAMADA]:   { label: 'Programada',   dot: 'bg-slate-400',   bg: 'bg-slate-50'    },
  [SessionStatus.REALIZADA]:    { label: 'Realizada',    dot: 'bg-emerald-500', bg: 'bg-emerald-50'  },
  [SessionStatus.CANCELADA]:    { label: 'Cancelada',    dot: 'bg-red-500',     bg: 'bg-red-50'      },
  [SessionStatus.REPROGRAMADA]: { label: 'Reprogramada', dot: 'bg-yellow-500',  bg: 'bg-yellow-50'   },
  [SessionStatus.VENCIDA]:      { label: 'Vencida',      dot: 'bg-red-700',     bg: 'bg-red-100'     },
  [SessionStatus.PAGADA]:       { label: 'Pagada',       dot: 'bg-violet-500',  bg: 'bg-violet-50'   },
};

const fmtCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

// ─── Panel lateral: tratamientos del cliente seleccionado ────────────────────
interface CustomerTreatmentPanelProps {
  customer:   Customer;
  treatments: PatientTreatment[];
  onBill:     (treatment: PatientTreatment) => void;
}

const CustomerTreatmentPanel: React.FC<CustomerTreatmentPanelProps> = ({
  customer, treatments, onBill,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const customerTreatments = useMemo(() =>
    treatments.filter(t =>
      t.customerId === customer.id &&
      t.status !== TreatmentStatus.CANCELADO
    ), [treatments, customer.id]);

  if (customerTreatments.length === 0) return (
    <div className="mx-4 mb-3 bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden">
      <div className="px-4 py-2.5 flex items-center gap-2 bg-slate-200">
        <Stethoscope size={13} className="text-slate-400 shrink-0" />
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sin tratamientos activos</p>
      </div>
    </div>
  );

  return (
    <div className="mx-4 mb-3 bg-teal-50 border border-teal-100 rounded-2xl overflow-hidden mt-3">
      {/* Header */}
      <div className="px-4 py-2.5 flex items-center gap-2 border-b border-teal-100 bg-teal-600">
        <Stethoscope size={13} className="text-white shrink-0" />
        <p className="text-[9px] font-black text-white uppercase tracking-widest flex-1">
          Tratamientos del paciente
        </p>
        <span className="bg-white/20 text-white text-[8px] font-black px-2 py-0.5 rounded-full">
          {customerTreatments.length}
        </span>
      </div>

      <div className="divide-y divide-teal-100">
        {customerTreatments.map(t => {
          const cfg              = T_CFG[t.status];
          const totalSessions    = t.sessions.length;
          const doneSessions     = t.sessions.filter(s => s.status === SessionStatus.REALIZADA).length;
          const pendingSessions  = t.sessions.filter(s =>
            s.status === SessionStatus.PROGRAMADA || s.status === SessionStatus.REPROGRAMADA
          ).length;
          const pricePerSes      = totalSessions > 0 && t.totalCost ? t.totalCost / totalSessions : 0;
          const billableCount    = t.sessions.filter(s => s.status === SessionStatus.REALIZADA).length;
          const billableAmount   = pricePerSes * billableCount;
          const isExp            = expandedId === t.id;
          const hasBillable      = billableCount > 0;

          // Próxima sesión programada con fecha
          const nextSes = t.sessions.find(s =>
            (s.status === SessionStatus.PROGRAMADA || s.status === SessionStatus.REPROGRAMADA) && s.date
          );

          return (
            <div key={t.id} className="bg-white">
              {/* Fila principal */}
              <button
                type="button"
                onClick={() => setExpandedId(isExp ? null : t.id)}
                className="w-full px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-all text-left"
              >
                {/* Indicador estado */}
                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                  t.status === TreatmentStatus.EN_PROGRESO ? 'bg-blue-500' :
                  t.status === TreatmentStatus.COMPLETADO  ? 'bg-emerald-500' : 'bg-orange-400'
                }`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black text-slate-800 uppercase leading-tight">{t.name}</span>
                    <span className={`${cfg.bg} ${cfg.text} text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full`}>
                      {cfg.label}
                    </span>
                    {hasBillable && (
                      <span className="bg-emerald-100 text-emerald-700 text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full">
                        {billableCount} por cobrar
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {/* Progreso */}
                    <span className="text-[8px] text-slate-400 font-bold tabular-nums">
                      {doneSessions}/{totalSessions} sesiones
                    </span>
                    {/* Precio por sesión */}
                    {pricePerSes > 0 && (
                      <span className="text-[8px] font-black text-teal-600 flex items-center gap-0.5">
                        <DollarSign size={7} />{fmtCOP(pricePerSes)}/ses
                      </span>
                    )}
                    {/* Próxima cita */}
                    {nextSes?.date && (
                      <span className="text-[8px] text-slate-400 font-bold flex items-center gap-1">
                        <Calendar size={8} className="text-teal-400" />
                        {nextSes.date}{nextSes.time ? ` · ${nextSes.time}` : ''}
                      </span>
                    )}
                  </div>

                  {/* Barra de progreso */}
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-1 overflow-hidden">
                      <div
                        className="bg-teal-500 h-1 rounded-full transition-all duration-500"
                        style={{ width: totalSessions > 0 ? `${Math.round(doneSessions / totalSessions * 100)}%` : '0%' }}
                      />
                    </div>
                    <span className="text-[7px] font-black text-slate-400 tabular-nums shrink-0">
                      {totalSessions > 0 ? Math.round(doneSessions / totalSessions * 100) : 0}%
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-slate-300 mt-0.5">
                  {isExp ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </div>
              </button>

              {/* Detalle expandido */}
              {isExp && (
                <div className="px-4 pb-3 space-y-2 bg-slate-50/80 border-t border-slate-100 animate-in slide-in-from-top-1">
                  
                  {/* Sesiones */}
                  <div className="pt-2 space-y-1.5">
                    {t.sessions.map((ses, idx) => {
                      // Calcular estado efectivo (vencida si fecha pasada)
                      const today = new Date(); today.setHours(0,0,0,0);
                      let effStatus = ses.status;
                      if (ses.date && ses.status !== SessionStatus.REALIZADA && ses.status !== SessionStatus.CANCELADA && ses.status !== SessionStatus.PAGADA) {
                        const d = new Date(ses.date); d.setHours(0,0,0,0);
                        if (d < today) effStatus = SessionStatus.VENCIDA;
                      }
                      const sc = S_CFG[effStatus];

                      return (
                        <div key={ses.id} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${sc.bg} border border-white`}>
                          <div className={`w-4 h-4 ${sc.dot} rounded-full flex items-center justify-center shrink-0`}>
                            <span className="text-[7px] font-black text-white">{idx + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-black text-slate-700 uppercase truncate">{ses.label}</p>
                            {ses.date && (
                              <p className="text-[7px] text-slate-400 font-medium flex items-center gap-0.5">
                                <Calendar size={7} />{ses.date}{ses.time && ` · ${ses.time}`}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {pricePerSes > 0 && (
                              <span className="text-[8px] font-black text-teal-600">{fmtCOP(pricePerSes)}</span>
                            )}
                            <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                              effStatus === SessionStatus.REALIZADA    ? 'bg-emerald-500 text-white' :
                              effStatus === SessionStatus.CANCELADA    ? 'bg-red-500 text-white'     :
                              effStatus === SessionStatus.VENCIDA      ? 'bg-red-700 text-white'     :
                              effStatus === SessionStatus.REPROGRAMADA ? 'bg-yellow-500 text-white'  :
                              effStatus === SessionStatus.PAGADA       ? 'bg-violet-500 text-white'  :
                              'bg-slate-400 text-white'
                            }`}>
                              {sc.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Totalizador + botón cobrar si hay sesiones realizadas */}
                  {hasBillable && (
                    <div className="bg-slate-900 rounded-xl p-3 flex items-center justify-between mt-1">
                      <div>
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">
                          {billableCount} sesión{billableCount !== 1 ? 'es' : ''} · Total
                        </p>
                        <p className="text-sm font-black text-white">{fmtCOP(billableAmount)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); onBill(t); }}
                        className="bg-teal-500 hover:bg-teal-400 text-white px-3 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1 transition-all active:scale-95"
                      >
                        <DollarSign size={11} /> Cobrar
                      </button>
                    </div>
                  )}

                  {/* Notas */}
                  {t.notes && (
                    <p className="text-[8px] text-slate-400 italic px-1">{t.notes}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Mini-modal: elegir monto ─────────────────────────────────────────────────
interface PaymentAmountModalProps {
  treatment: PatientTreatment;
  customer:  Customer;
  onClose:   () => void;
  onConfirm: (treatment: PatientTreatment, customer: Customer, amount: number) => void;
}

const PaymentAmountModal: React.FC<PaymentAmountModalProps> = ({
  treatment, customer, onClose, onConfirm,
}) => {
  const { notify } = useNotification();

  const realizedSessions = treatment.sessions.filter(s => s.status === SessionStatus.REALIZADA);
  const totalSessions    = treatment.sessions.length;
  const pricePerSession  = totalSessions > 0 && treatment.totalCost ? treatment.totalCost / totalSessions : 0;
  const totalRealized    = pricePerSession * realizedSessions.length;

  const [mode,         setMode]         = useState<'total' | 'parcial'>('total');
  const [partialInput, setPartialInput] = useState('');

  const amount = mode === 'total' ? totalRealized : parseFloat(partialInput) || 0;

  const handleConfirm = () => {
    if (amount <= 0)              { notify('El monto debe ser mayor a 0', 'warning'); return; }
    if (mode === 'parcial' && amount > totalRealized) {
      notify(`El monto no puede superar ${fmtCOP(totalRealized)}`, 'warning');
      return;
    }
    onConfirm(treatment, customer, amount);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[600] p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl animate-in zoom-in duration-200 overflow-hidden">

        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-teal-600 p-2 rounded-xl text-white shadow-lg"><Wallet size={18} /></div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tighter text-slate-800">Monto a Facturar</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{treatment.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-white p-2 rounded-xl shadow-sm text-slate-400 hover:text-slate-700 transition-all"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">

          <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <User size={12} className="text-teal-500" />
              <p className="text-[10px] font-black text-teal-700 uppercase">{customer.name}</p>
            </div>
            <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase">
              <span>Sesiones realizadas</span>
              <span className="font-black text-slate-700">{realizedSessions.length}</span>
            </div>
            <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase">
              <span>Valor por sesión</span>
              <span className="font-black text-teal-600">{fmtCOP(pricePerSession)}</span>
            </div>
            <div className="flex justify-between text-[9px] font-black text-slate-700 uppercase pt-2 border-t border-teal-100">
              <span>Total a cobrar</span>
              <span className="text-teal-700">{fmtCOP(totalRealized)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setMode('total')}
              className={`p-3 rounded-2xl border-2 text-[9px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-1.5 ${mode === 'total' ? 'bg-teal-600 border-teal-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:border-teal-300'}`}>
              <DollarSign size={16} />
              Pago Total
              <span className={`text-[8px] font-bold ${mode === 'total' ? 'text-teal-100' : 'text-slate-400'}`}>{fmtCOP(totalRealized)}</span>
            </button>
            <button type="button" onClick={() => setMode('parcial')}
              className={`p-3 rounded-2xl border-2 text-[9px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-1.5 ${mode === 'parcial' ? 'bg-amber-500 border-amber-500 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:border-amber-300'}`}>
              <Wallet size={16} />
              Pago Parcial
              <span className={`text-[8px] font-bold ${mode === 'parcial' ? 'text-amber-100' : 'text-slate-400'}`}>Ingresa monto</span>
            </button>
          </div>

          {mode === 'parcial' && (
            <div className="animate-in slide-in-from-top-2">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Monto parcial (máx. {fmtCOP(totalRealized)})
              </label>
              <input
                autoFocus
                type="number"
                min="1"
                max={totalRealized}
                className="w-full bg-slate-50 rounded-2xl p-4 text-xl font-black text-slate-800 text-center outline-none focus:ring-2 focus:ring-amber-400 border-none"
                placeholder="0"
                value={partialInput}
                onChange={e => setPartialInput(e.target.value)}
              />
              {parseFloat(partialInput) > 0 && (
                <p className="text-[9px] text-amber-600 font-bold text-center mt-1.5">
                  Saldo pendiente: {fmtCOP(Math.max(0, totalRealized - (parseFloat(partialInput) || 0)))}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-12 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">
              Cancelar
            </button>
            <button type="button" onClick={handleConfirm}
              className={`flex-1 h-12 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                mode === 'total'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
              }`}>
              <Plus size={14} /> Agregar al Carrito
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Modal principal: buscar paciente → tratamientos → sesiones REALIZADA ─────
interface TreatmentBillingModalProps {
  customers:   Customer[];
  treatments:  PatientTreatment[];
  onClose:     () => void;
  onAddToCart: (treatment: PatientTreatment, customer: Customer, amount: number) => void;
}

const TreatmentBillingModal: React.FC<TreatmentBillingModalProps> = ({
  customers, treatments, onClose, onAddToCart,
}) => {
  const [custSearch,    setCustSearch]    = useState('');
  const [selectedCust,  setSelectedCust]  = useState<Customer | null>(null);
  const [expandedTreat, setExpandedTreat] = useState<string | null>(null);
  const [showDrop,      setShowDrop]      = useState(false);
  const [payTarget,     setPayTarget]     = useState<PatientTreatment | null>(null);

  const filteredCusts = useMemo(() => {
    if (custSearch.length < 2) return [];
    const q = custSearch.toLowerCase();
    return customers
      .filter(c => c.isActive && (
        c.name.toLowerCase().includes(q) ||
        c.documentNumber?.includes(custSearch) ||
        c.phone?.includes(custSearch)
      ))
      .slice(0, 6);
  }, [customers, custSearch]);

  const billableTreatments = useMemo(() => {
    if (!selectedCust) return [];
    return treatments.filter(t =>
      t.customerId === selectedCust.id &&
      t.status !== TreatmentStatus.CANCELADO &&
      t.sessions.some(s => s.status === SessionStatus.REALIZADA)
    );
  }, [treatments, selectedCust]);

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[500] p-4">
        <div className="bg-white rounded-[2.5rem] w-full max-w-5xl shadow-2xl flex flex-col h-[92vh] overflow-hidden animate-in zoom-in duration-200">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-teal-600 p-2 rounded-xl text-white shadow-lg"><Stethoscope size={18} /></div>
              <div>
                <h3 className="text-base font-black uppercase tracking-tighter text-slate-800">Facturar Tratamiento</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Sesiones realizadas pendientes de cobro</p>
              </div>
            </div>
            <button onClick={onClose} className="bg-white p-2 rounded-xl shadow-sm text-slate-400 hover:text-slate-700 transition-all"><X size={18} /></button>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">

            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <User size={10} /> Paso 1 · Buscar paciente
              </p>
              {selectedCust ? (
                <div className="flex items-center justify-between bg-teal-50 border border-teal-100 rounded-2xl p-4">
                  <div>
                    <p className="text-sm font-black text-teal-700 uppercase">{selectedCust.name}</p>
                    <p className="text-[9px] text-teal-400 font-bold mt-0.5">
                      {selectedCust.phone}{selectedCust.documentNumber && ` · ${selectedCust.documentNumber}`}
                    </p>
                  </div>
                  <button onClick={() => { setSelectedCust(null); setCustSearch(''); setExpandedTreat(null); }}
                    className="text-red-400 hover:text-red-600 p-1.5 rounded-xl hover:bg-red-50 transition-colors">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 text-slate-400" size={16} />
                  <input
                    type="text" autoComplete="off"
                    placeholder="Buscar por nombre, documento o teléfono..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500"
                    value={custSearch}
                    onChange={e => { setCustSearch(e.target.value); setShowDrop(true); }}
                    onFocus={() => setShowDrop(true)}
                    onBlur={() => setTimeout(() => setShowDrop(false), 200)}
                  />
                  {showDrop && filteredCusts.length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-white shadow-2xl rounded-2xl mt-1 border border-slate-100 overflow-hidden z-50">
                      {filteredCusts.map(c => (
                        <button key={c.id} type="button" onMouseDown={e => e.preventDefault()}
                          onClick={() => { setSelectedCust(c); setCustSearch(c.name); setShowDrop(false); }}
                          className="w-full p-3.5 text-left hover:bg-teal-50 border-b border-slate-50 last:border-0 transition-all">
                          <p className="text-[11px] font-black text-slate-800 uppercase">{c.name}</p>
                          <p className="text-[9px] text-slate-400 font-medium mt-0.5">{c.phone}{c.documentNumber && ` · ${c.documentNumber}`}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedCust && (
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Stethoscope size={10} /> Paso 2 · Tratamientos con sesiones realizadas
                </p>

                {billableTreatments.length === 0 ? (
                  <div className="bg-slate-50 rounded-2xl p-6 text-center border border-slate-100">
                    <Stethoscope size={32} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sin sesiones realizadas</p>
                    <p className="text-[9px] text-slate-300 font-medium mt-1">
                      Este paciente no tiene sesiones realizadas pendientes de cobro
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {billableTreatments.map(t => {
                      const cfg              = T_CFG[t.status];
                      const realizedSessions = t.sessions.filter(s => s.status === SessionStatus.REALIZADA);
                      const pricePerSes      = t.sessions.length > 0 && t.totalCost ? t.totalCost / t.sessions.length : 0;
                      const totalRealized    = pricePerSes * realizedSessions.length;
                      const isExp            = expandedTreat === t.id;

                      return (
                        <div key={t.id} className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${cfg.border}`}>
                          <button type="button" onClick={() => setExpandedTreat(isExp ? null : t.id)}
                            className="w-full p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-all">
                            <div className="text-left flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-black text-slate-800 uppercase">{t.name}</span>
                                <span className={`${cfg.bg} ${cfg.text} text-[7px] font-black uppercase px-2 py-0.5 rounded-full`}>{cfg.label}</span>
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1"><User size={9}/>{t.doctor}</span>
                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                  {realizedSessions.length} realizada{realizedSessions.length !== 1 ? 's' : ''}
                                </span>
                                {totalRealized > 0 && <span className="text-[9px] font-black text-teal-600">{fmtCOP(totalRealized)}</span>}
                              </div>
                            </div>
                            <div className="shrink-0 text-slate-400">{isExp ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</div>
                          </button>

                          {isExp && (
                            <div className="border-t border-slate-100 bg-slate-50/60 p-3 space-y-2 animate-in slide-in-from-top-2">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Sesiones realizadas</p>
                              {realizedSessions.map(ses => (
                                <div key={ses.id} className="bg-white rounded-xl border border-emerald-100 p-3 flex items-center gap-3">
                                  <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                                    <span className="text-[7px] font-black text-white">{ses.sessionNumber}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black text-slate-700 uppercase">{ses.label}</p>
                                    {ses.date && (
                                      <p className="text-[8px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                        <Calendar size={8}/>{ses.date}{ses.time && ` · ${ses.time}`}
                                      </p>
                                    )}
                                  </div>
                                  {pricePerSes > 0 && <span className="text-[9px] font-black text-teal-600 shrink-0">{fmtCOP(pricePerSes)}</span>}
                                </div>
                              ))}

                              <div className="bg-slate-900 rounded-2xl p-3 flex items-center justify-between mt-2">
                                <div>
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total a cobrar</p>
                                  <p className="text-base font-black text-white">{fmtCOP(totalRealized)}</p>
                                </div>
                                <button type="button" onClick={() => setPayTarget(t)}
                                  className="bg-teal-500 hover:bg-teal-400 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all active:scale-95 shadow-sm">
                                  <DollarSign size={12}/> Cobrar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {payTarget && selectedCust && (
        <PaymentAmountModal
          treatment={payTarget}
          customer={selectedCust}
          onClose={() => setPayTarget(null)}
          onConfirm={(t, c, amount) => {
            onAddToCart(t, c, amount);
            onClose();
          }}
        />
      )}
    </>
  );
};

// ─── POSView ──────────────────────────────────────────────────────────────────
export const POSView: React.FC<POSViewProps> = ({
  products, inventory, categories, onProcessPayment, onSendOrder, customers,
  selectedTable, selectedSeat, onSelectTable, tables, isRegisterOpen,
  orders, userRole, loyaltyConfig, onViewTables, onOpenRegisterRequest,
  posConfig, onPrintOrder, taxRate, impoconsumoConfig, onAddCustomer,
  currentBranch, activeRegister, onPatchOrder,
  treatments = [],
  onSessionRealized,
}) => {
  const { notify } = useNotification();
  const [cart,                  setCart]                  = useState<CartItem[]>([]);
  const [searchTerm,            setSearchTerm]            = useState('');
  const [selectedCategory,      setSelectedCategory]      = useState('Todos');
  const [orderType,             setOrderType]             = useState<OrderType>(selectedTable ? OrderType.DINE_IN : OrderType.TAKEAWAY);
  const [selectedCustomerState, setSelectedCustomerState] = useState<Customer | undefined>(undefined);
  const [selectedOrderId,       setSelectedOrderId]       = useState<string | null>(null);
  const [isPaymentModalOpen,    setIsPaymentModalOpen]    = useState(false);
  const [showCashEntry,         setShowCashEntry]         = useState(false);
  const [receivedAmount,        setReceivedAmount]        = useState('');
  const [custSearch,            setCustSearch]            = useState('');
  const [showCustDropdown,      setShowCustDropdown]      = useState(false);
  const [isCustModalOpen,       setIsCustModalOpen]       = useState(false);
  const [rightTab,              setRightTab]              = useState<'gestion' | 'monitor'>('gestion');
  const [redeemedPoints,        setRedeemedPoints]        = useState(0);
  const [editingAddressId,      setEditingAddressId]      = useState<string | null>(null);
  const [tempAddress,           setTempAddress]           = useState('');
  const [selectedMonitorOrder,  setSelectedMonitorOrder]  = useState<Order | null>(null);
  const [isTreatmentModalOpen,  setIsTreatmentModalOpen]  = useState(false);
  // Tratamiento a cobrar iniciado desde el panel lateral del cliente
  const [quickBillTarget,       setQuickBillTarget]       = useState<PatientTreatment | null>(null);

  const impoconsumoRate = impoconsumoConfig?.rate ?? 0.08;

  const hasBillableTreatments = useMemo(() =>
    treatments.some(t =>
      t.status !== TreatmentStatus.CANCELADO &&
      t.sessions.some(s => s.status === SessionStatus.REALIZADA)
    ), [treatments]);

  const hasTreatmentItems = useMemo(() =>
    cart.some(i => i.cartId.startsWith('c-treat-')), [cart]);

  // Tratamientos del cliente activo seleccionado.
  // Usamos selectedCustomerState?.id como fuente primaria (evita la cadena de memos que
  // causa que activeCustomer no esté listo cuando el panel intenta renderizar).
  const getTaxBadge = (item: CartItem) => {
    const taxType   = (item.product as any).taxType;
    const linePrice = getEffectivePrice(item.product) * item.quantity;
    if (!taxType || taxType === 'NONE') return <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider">Sin impuesto</span>;
    if (taxType === 'IVA')         return <span className="text-[7px] font-black text-blue-400 uppercase tracking-wider">IVA ({(taxRate * 100).toFixed(0)}%): {fmtCOP(linePrice * taxRate)}</span>;
    if (taxType === 'IMPOCONSUMO') return <span className="text-[7px] font-black text-orange-400 uppercase tracking-wider">IMPOC ({(impoconsumoRate * 100).toFixed(0)}%): {fmtCOP(linePrice * impoconsumoRate)}</span>;
    return null;
  };

  const generalCustomer: Customer = useMemo(() => ({
    id: 'consumidor-final', name: 'Consumidor Final', phone: '0000000', points: 0, isActive: true, documentNumber: '222222222222'
  }), []);

  const activeCustomer = useMemo(() => {
    if (!selectedCustomerState || selectedCustomerState.id === 'consumidor-final') return selectedCustomerState || generalCustomer;
    return customers.find(c => c.id === selectedCustomerState.id) || selectedCustomerState;
  }, [customers, selectedCustomerState, generalCustomer]);

  // Tratamientos del cliente activo — debe ir DESPUÉS de activeCustomer
  const activeCustomerTreatments = useMemo(() => {
    // selectedCustomerState?.id como fuente primaria (evita race entre memos)
    const cid =
      selectedCustomerState?.id && selectedCustomerState.id !== 'consumidor-final'
        ? selectedCustomerState.id
        : (activeCustomer?.id !== 'consumidor-final' ? activeCustomer?.id : undefined);
    if (!cid) return [];
    return treatments.filter(t => t.customerId === cid && t.status !== TreatmentStatus.CANCELADO);
  }, [treatments, selectedCustomerState?.id, activeCustomer]);

  useEffect(() => setCustSearch(''), [selectedCustomerState]);

  useEffect(() => {
    if (selectedTable) {
      setOrderType(OrderType.DINE_IN);
      setSelectedOrderId(null);
      const active = orders.filter(o => o.tableId === selectedTable.id && o.seatNumber === selectedSeat && o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.COMPLETED);
      if (active.length > 0) {
        setSelectedCustomerState(customers.find(c => c.id === active[0].customerId) || generalCustomer);
        if (active[0].deliveryAddress) setTempAddress(active[0].deliveryAddress);
      } else { setSelectedCustomerState(generalCustomer); setTempAddress(''); }
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

  const allActiveOrders: Order[] = useMemo(() =>
    orders.filter(o => o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  [orders]);

  const categoriesList = useMemo(() => [
    { key: 'Todos', label: 'Todos' },
    ...(categories ?? []).map(c => ({ key: c.id, label: c.name })),
  ], [categories]);

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
      return product.ingredients.every(i => { const inv = inventory.find(iv => iv.id === i.inventoryItemId); return inv && inv.stock >= i.quantity; });
    }
    if (product.productType === ProductType.COMBO) {
      if (!product.comboItems || product.comboItems.length === 0) return false;
      return product.comboItems.every(ci => { const p = products.find(pr => pr.id === ci.productId); return p && checkProductAvailability(p); });
    }
    return true;
  };

  const calculatePendingTaxes = useMemo(() => {
    let sub = 0, iva = 0, impoc = 0;
    cart.forEach(item => {
      const price   = getEffectivePrice(item.product);
      const itemSub = price * item.quantity;
      sub += itemSub;
      const taxType = (item.product as any).taxType;
      if (taxType === 'IVA')         iva   += itemSub * taxRate;
      if (taxType === 'IMPOCONSUMO') impoc += itemSub * impoconsumoRate;
    });
    return { sub, iva, impoc };
  }, [cart, taxRate, impoconsumoRate]);

  const sentSubtotal = focusedOrders.reduce((s, o) => s + (o.subtotal || 0), 0);
  const sentIva      = focusedOrders.reduce((s, o) => s + (o.tax || 0), 0);
  const sentImpoc    = focusedOrders.reduce((s, o) => s + (o.impoconsumoAmount || 0), 0);

  const currentSubtotal = calculatePendingTaxes.sub  + sentSubtotal;
  const currentIva      = calculatePendingTaxes.iva   + sentIva;
  const currentImpoc    = calculatePendingTaxes.impoc + sentImpoc;
  const loyaltyDiscount = redeemedPoints * loyaltyConfig.currencyPerPoint;
  const currentTotal    = Math.max(0, currentSubtotal + currentIva + currentImpoc - loyaltyDiscount);
  const cashChange      = useMemo(() => Math.max(0, (parseFloat(receivedAmount) || 0) - currentTotal), [receivedAmount, currentTotal]);

  const addToCart = (product: Product) => {
    if (!checkProductAvailability(product)) { notify(`Materiales insuficientes para ${product.name}`, 'error'); return; }
    const ep = getEffectivePrice(product);
    const ex = cart.find(i => i.product.id === product.id && i.status === ItemStatus.PENDING);
    if (ex) setCart(cart.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1, price: ep } : i));
    else    setCart([...cart, { cartId: `c-${Date.now()}`, product, quantity: 1, status: ItemStatus.PENDING, price: ep }]);
  };

  const handleAddTreatmentToCart = (
    treatment: PatientTreatment,
    customer:  Customer,
    amount:    number,
  ) => {
    setSelectedCustomerState(customer);
    const realizedCount = treatment.sessions.filter(s => s.status === SessionStatus.REALIZADA).length;

    const syntheticProduct: Product = {
      id:            `treat__${treatment.id}`,
      name:          treatment.name,
      price:         amount,
      categoryId:    '',
      isActive:      true,
      productType:   ProductType.DIRECT_SALE,
      promotionType: PromotionType.NONE,
      stock:         999,
      productionArea: ProductionArea.KITCHEN,
      taxType:       'NONE',
    } as unknown as Product;

    setCart(prev => [...prev, {
      cartId:   `c-treat-${Date.now()}`,
      product:  syntheticProduct,
      quantity: 1,
      status:   ItemStatus.PENDING,
      price:    amount,
      notes:    `${realizedCount} sesión${realizedCount !== 1 ? 'es' : ''} realizada${realizedCount !== 1 ? 's' : ''}`,
    }]);

    notify(`${treatment.name} · ${fmtCOP(amount)} agregado al carrito`, 'success');
  };

  const handleClearAndNewSale = () => {
    setSelectedMonitorOrder(null); setSelectedOrderId(null);
    setCart([]); setRedeemedPoints(0); setTempAddress('');
    setSelectedCustomerState(generalCustomer);
    if (selectedTable) onSelectTable(undefined);
  };

  const handleSendToKitchen = () => {
    if (cart.length === 0) return;
    onSendOrder(cart.map(i => ({ ...i })), orderType, activeCustomer, focusedOrders[0]?.id, true, selectedSeat, currentSubtotal, currentIva, currentImpoc, tempAddress);
    setCart([]);
    if (selectedTable) onSelectTable(undefined); else setSelectedOrderId(null);
  };

  const handleFinalizePayment = async (method: PaymentMethod) => {
    const isTreatmentDirect = hasTreatmentItems && !selectedMonitorOrder;
    if (!selectedMonitorOrder && !isTreatmentDirect) return;

    const received = parseFloat(receivedAmount) || currentTotal;
    const change   = Math.max(0, received - currentTotal);
    const itemsToCharge = isTreatmentDirect
      ? cart.map(i => ({ ...i }))
      : (selectedMonitorOrder!.items || []).map(i => ({ ...i }));

    onProcessPayment(
      itemsToCharge,
      currentTotal, orderType, method, activeCustomer, redeemedPoints,
      selectedMonitorOrder?.id, received, change, selectedSeat,
      currentSubtotal, currentIva, currentImpoc, tempAddress, selectedTable?.id
    );

    if (onSessionRealized) {
      for (const item of cart.filter(i => i.cartId.startsWith('c-treat-'))) {
        const treatmentId = item.product.id.replace('treat__', '');
        const treatment   = treatments.find(t => t.id === treatmentId);
        if (treatment) {
          for (const ses of treatment.sessions.filter(s => s.status === SessionStatus.REALIZADA)) {
            try { await onSessionRealized(treatmentId, ses.id); } catch { /* continuar */ }
          }
        }
      }
    }

    setSelectedMonitorOrder(null); setCart([]); setRedeemedPoints(0);
    setIsPaymentModalOpen(false); setSelectedOrderId(null);
    if (selectedTable) onSelectTable(undefined);
  };

  const handleRedeemPoints = () => {
    if (activeCustomer.id === 'consumidor-final') return;
    if (activeCustomer.points < loyaltyConfig.minRedemptionPoints) { notify(`Mínimo ${loyaltyConfig.minRedemptionPoints} puntos para redimir`, 'warning'); return; }
    const max = Math.floor((currentSubtotal + currentIva + currentImpoc) / loyaltyConfig.currencyPerPoint);
    const pts = Math.min(activeCustomer.points, max);
    setRedeemedPoints(pts);
    notify(`${pts} puntos aplicados como descuento`, 'success');
  };

  const handleLoadOrderFromMonitor = (order: Order) => {
    setSelectedMonitorOrder(order);
    if (order.tableId) { onSelectTable(tables.find(t => t.id === order.tableId), order.seatNumber); }
    else {
      onSelectTable(undefined); setSelectedOrderId(order.id); setOrderType(order.type);
      setSelectedCustomerState(customers.find(c => c.id === order.customerId) || generalCustomer);
      if (order.deliveryAddress) setTempAddress(order.deliveryAddress);
    }
    setRightTab('gestion');
  };

  const handleSaveAddressUpdate = (orderId: string) => {
    if (onPatchOrder) { onPatchOrder(orderId, { deliveryAddress: tempAddress }); setEditingAddressId(null); notify("Dirección actualizada", "success"); }
  };

  const pendingByArea = useMemo(() => {
    const areas: Record<string, CartItem[]> = { [ProductionArea.KITCHEN]: [], [ProductionArea.GRILL]: [], [ProductionArea.BAR]: [] };
    focusedOrders.forEach(o => o.items.filter(it => it.status === ItemStatus.PENDING || it.status === ItemStatus.READY).forEach(it => { if (areas[it.product.productionArea]) areas[it.product.productionArea].push(it); }));
    return areas;
  }, [focusedOrders]);

  const filteredProducts = products.filter(p =>
    (selectedCategory === 'Todos' || p.categoryId === selectedCategory) &&
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) && p.isActive
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
          <button onClick={onOpenRegisterRequest} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black py-6 rounded-[2.5rem] flex justify-center items-center uppercase tracking-widest text-sm shadow-2xl gap-3"><Unlock size={24}/> Abrir Caja</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">

      {/* ── Área productos ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-100 pb-20 md:pb-0 relative">

        {selectedMonitorOrder && (
          <div className="absolute inset-0 z-30 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center pointer-events-none">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl px-6 py-4 text-center">
              <CheckCircle size={28} className="text-emerald-400 mx-auto mb-2"/>
              <p className="text-white font-black text-xs uppercase tracking-widest">Orden lista para cobro</p>
              <p className="text-white/60 font-bold text-[9px] uppercase tracking-widest mt-1">#{selectedMonitorOrder.id.slice(-6).toUpperCase()} · {fmtCOP(selectedMonitorOrder.total)}</p>
            </div>
          </div>
        )}

        <div className="p-4 md:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-brand-500" size={20}/>
              <input type="text" placeholder="Buscar servicio..." className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-brand-500 font-medium" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
            </div>

            {hasBillableTreatments && (
              <button onClick={() => setIsTreatmentModalOpen(true)}
                className="relative bg-teal-600 hover:bg-teal-700 text-white p-4 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center gap-2"
                title="Facturar sesiones realizadas">
                <Stethoscope size={22}/>
                <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest">Tratamientos</span>
                <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white"/>
              </button>
            )}

            {onViewTables && (
              <button onClick={onViewTables} className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg hover:bg-brand-600 transition-all active:scale-95 flex items-center gap-2">
                <Grid3X3 size={24}/><span className="hidden lg:inline text-[10px] font-black uppercase">Salón</span>
              </button>
            )}
          </div>
          <div className="flex space-x-2 overflow-x-auto no-scrollbar py-2">
            {categoriesList.map(cat => (
              <button key={cat.key} onClick={() => setSelectedCategory(cat.key)}
                className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm ${selectedCategory === cat.key ? 'bg-brand-600 text-white scale-105' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-8 custom-scrollbar relative">
          {filteredProducts.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-50">
              <CalendarPlus2 size={100} className="mb-2 text-slate-300"/><p className="text-slate-400">Sin productos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map(product => {
                const ep          = getEffectivePrice(product);
                const isPromo     = product.promotionType !== PromotionType.NONE;
                const isAvailable = checkProductAvailability(product);
                const taxType     = (product as any).taxType;
                return (
                  <button key={product.id} onClick={() => isAvailable && addToCart(product)}
                    className={`bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden transition-all group flex flex-col relative active:scale-95 animate-in fade-in ${!isAvailable ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:border-brand-300 hover:shadow-xl'}`}>
                    {isPromo && isAvailable && <div className="absolute top-3 left-3 z-10 bg-emerald-500 text-white px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1"><Tag size={10}/> OFERTA</div>}
                    {taxType && taxType !== 'NONE' && isAvailable && (
                      <div className={`absolute top-3 right-3 z-10 px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase shadow ${taxType === 'IVA' ? 'bg-blue-500 text-white' : 'bg-orange-500 text-white'}`}>
                        {taxType === 'IVA' ? `IVA ${(taxRate*100).toFixed(0)}%` : `IMPOC ${(impoconsumoRate*100).toFixed(0)}%`}
                      </div>
                    )}
                    {!isAvailable && (
                      <div className="absolute inset-0 z-20 bg-slate-900/40 backdrop-blur-[2px] flex flex-col items-center justify-center">
                        <div className="bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-1.5"><AlertTriangle size={12}/> AGOTADO</div>
                        <p className="text-[8px] text-white font-bold mt-1">Sin materiales</p>
                      </div>
                    )}
                    <div className="h-32 w-full overflow-hidden relative">
                      <img src={product.imageUrl || `${import.meta.env.VITE_URL_BASE}/assets/img/default.png`} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                    </div>
                    <div className="p-4 text-left flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-black text-slate-800 uppercase text-[11px] leading-tight mb-1 line-clamp-2">{product.name}</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{product.category?.name}</p>
                      </div>
                      <div className="flex justify-between items-end mt-2">
                        <div className="flex flex-col">
                          {isPromo ? (<><span className="text-[10px] text-slate-400 line-through leading-none">{fmtCOP(product.price)}</span><span className="text-sm font-black text-brand-600">{fmtCOP(ep)}</span></>) : (<span className="text-sm font-black text-slate-800">{fmtCOP(product.price)}</span>)}
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

      {/* ── Panel derecho ── */}
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
                      {(selectedTable.mergedWith?.length || 0) > 0 ? <Link size={18}/> : <Grid3X3 size={18}/>}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{(selectedTable.mergedWith?.length || 0) > 0 ? 'Grupo de Sillas' : 'Silla Seleccionada'}</p>
                      <p className="text-sm font-black uppercase tracking-tighter">
                        {selectedTable.name} {selectedSeat && `- SILLA ${selectedSeat}`}
                        {(selectedTable.mergedWith?.length || 0) > 0 && <span className="ml-2 text-[10px] bg-white/20 px-2 py-0.5 rounded-full">CAP: {selectedTable.seats + (selectedTable.mergedWith?.length || 0) * 4} pers</span>}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => onSelectTable(undefined)} className="hover:bg-white/10 p-2 rounded-xl transition-all"><X size={18}/></button>
                </div>
              )}

              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-50 p-1.5 rounded-lg text-blue-600"><User size={14}/></div>
                    <p className="text-[9px] font-black text-slate-800 uppercase leading-none">{activeCustomer.name}</p>
                  </div>
                  <div className="flex gap-1">
                    {activeCustomer.id !== 'consumidor-final' && (
                      <button onClick={() => { setSelectedCustomerState(generalCustomer); setRedeemedPoints(0); }} className="text-red-500 hover:bg-red-50 p-1 rounded-lg transition-all"><X size={14}/></button>
                    )}
                    <button onClick={() => setIsCustModalOpen(true)} className="text-brand-600 p-1 rounded-lg transition-all"><Edit2 size={14}/></button>
                  </div>
                </div>

                {orderType === OrderType.DELIVERY && (
                  <div className="mt-2">
                    <input className="w-full bg-slate-50 border-none rounded-xl p-2 text-[9px] font-bold outline-none focus:ring-1 focus:ring-brand-500" placeholder="Dirección de entrega..." value={tempAddress} onChange={e => setTempAddress(e.target.value)}/>
                  </div>
                )}

                {activeCustomer.id !== 'consumidor-final' && loyaltyConfig.enabled && (
                  <div className="mt-2 p-2 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center">
                    <div className="flex items-center gap-2"><Star size={12} className="text-emerald-600" fill="currentColor"/><span className="text-[9px] font-black text-emerald-800 uppercase">{activeCustomer.points} Pts</span></div>
                    <button onClick={handleRedeemPoints} className="px-2 py-1 bg-emerald-600 text-white text-[8px] font-black uppercase rounded-lg shadow-sm hover:bg-emerald-700 transition-all">Redimir</button>
                  </div>
                )}

                {activeCustomer.id === 'consumidor-final' && (
                  <div className="relative mt-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} strokeWidth={2.2}/>
                    <input type="text" placeholder="Vincular cliente..." className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border-none rounded-xl text-[9px] font-bold focus:ring-1 focus:ring-brand-500 transition-all" value={custSearch} onChange={e => { setCustSearch(e.target.value); setShowCustDropdown(true); }}/>
                    {showCustDropdown && filteredCustomers.length > 0 && (
                      <div className="absolute top-full left-0 w-full bg-white shadow-2xl rounded-2xl mt-1 border border-slate-100 overflow-hidden z-50">
                        {filteredCustomers.map(c => (
                          <button key={c.id} onClick={() => { setSelectedCustomerState(c); setShowCustDropdown(false); setRedeemedPoints(0); }} className="w-full p-2.5 text-left hover:bg-brand-50 border-b border-slate-50 last:border-0 transition-all">
                            <span className="text-[10px] font-black uppercase text-slate-800">{c.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Panel de tratamientos del cliente activo ── */}
            {activeCustomer.id !== 'consumidor-final' && (
              <CustomerTreatmentPanel
                customer={activeCustomer}
                treatments={activeCustomerTreatments}
                onBill={t => setQuickBillTarget(t)}
              />
            )}

            {/* CARRITO */}
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
                        {items.map((it, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[9px] font-bold text-slate-500">
                            <span className="uppercase">{it.quantity}x {it.product.name}</span>
                            <span className="text-brand-600"><Clock size={8} className="inline mr-0.5"/> {it.status}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}

              {cart.length === 0 && focusedOrders.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-16 text-slate-300 opacity-30">
                  <UtensilsCrossed size={48} className="mb-3"/><p className="font-black tracking-widest text-[10px]">Sin productos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => {
                    const isTreat = item.cartId.startsWith('c-treat-');
                    return (
                      <div key={item.cartId} className="flex gap-3 items-start animate-in slide-in-from-right-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {isTreat && <div className="bg-teal-100 p-1 rounded-lg shrink-0"><Stethoscope size={10} className="text-teal-600"/></div>}
                            <h5 className="font-black text-slate-800 uppercase text-[9px] leading-tight truncate">{item.product.name}</h5>
                          </div>
                          {item.notes && <p className="text-[8px] text-teal-500 font-bold mt-0.5">{item.notes}</p>}
                          {!isTreat && <div className="mt-0.5 mb-1">{getTaxBadge(item)}</div>}
                          <div className="flex items-center gap-2 mt-1">
                            {!isTreat && (
                              <div className="flex items-center bg-slate-100 rounded-lg">
                                <button onClick={() => setCart(cart.map(i => i.cartId === item.cartId ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))} className="p-1 hover:text-brand-600 transition-colors"><Minus size={10}/></button>
                                <span className="text-[10px] font-black w-5 text-center tabular-nums">{item.quantity}</span>
                                <button onClick={() => setCart(cart.map(i => i.cartId === item.cartId ? { ...i, quantity: i.quantity + 1 } : i))} className="p-1 hover:text-brand-600 transition-colors"><Plus size={10}/></button>
                              </div>
                            )}
                            <span className="text-[10px] font-black text-brand-600 tabular-nums">{fmtCOP(item.price * item.quantity)}</span>
                          </div>
                        </div>
                        <button onClick={() => setCart(cart.filter(i => i.cartId !== item.cartId))} className="text-slate-200 hover:text-red-500 transition-colors mt-0.5"><X size={16}/></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* TOTALES */}
            <div className="p-4 bg-slate-900 text-white shadow-inner space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-widest"><span>Subtotal</span><span>{fmtCOP(currentSubtotal)}</span></div>
                <div className="flex justify-between text-[8px] font-bold text-blue-400 uppercase tracking-widest"><span>IVA ({(taxRate*100).toFixed(0)}%)</span><span>{fmtCOP(currentIva)}</span></div>
                <div className="flex justify-between text-[9px] font-bold text-orange-500 uppercase"><span>Impoconsumo ({(impoconsumoRate*100).toFixed(0)}%)</span><span>{fmtCOP(currentImpoc)}</span></div>
                {loyaltyDiscount > 0 && <div className="flex justify-between text-[8px] font-bold text-emerald-400 uppercase tracking-widest"><span>Dcto Puntos ({redeemedPoints})</span><span>-{fmtCOP(loyaltyDiscount)}</span></div>}
                <div className="flex justify-between items-center pt-1 border-t border-white/10 mt-1">
                  <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Total</span>
                  <span className="text-2xl font-black tabular-nums">{fmtCOP(currentTotal)}</span>
                </div>
              </div>
              <div className="space-y-2">
                {selectedMonitorOrder && (
                  <button onClick={handleClearAndNewSale} className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 py-3 rounded-xl font-black uppercase text-[8px] tracking-widest flex items-center justify-center gap-1.5 active:scale-95 transition-all">
                    <X size={14}/> Cancelar y nueva venta
                  </button>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleSendToKitchen} disabled={cart.length === 0 || hasTreatmentItems} className="bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-black uppercase text-[8px] tracking-widest disabled:opacity-20 flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all"><Send size={14}/> Comanda</button>
                  <button onClick={() => setIsPaymentModalOpen(true)} disabled={!selectedMonitorOrder && !hasTreatmentItems} className="bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-black uppercase text-[8px] tracking-widest disabled:opacity-20 flex items-center justify-center gap-1.5 shadow-xl active:scale-95 transition-all"><Star size={14} fill="currentColor"/> Cobrar</button>
                </div>
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
                const isSelected = selectedMonitorOrder?.id === o.id;
                return (
                  <div key={o.id} className={`bg-white p-4 rounded-[2rem] border-2 shadow-sm space-y-3 animate-in fade-in transition-all ${isSelected ? 'border-brand-500' : 'border-slate-50'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-800">
                          {o.tableId ? `UBICACIÓN: ${o.tableId.replace(/[^a-zA-Z0-9 ]/g, ' ').toUpperCase()}` : `ID: #${o.id.slice(-6).toUpperCase()}`}
                        </span>
                        <div className="mt-1 flex gap-1 flex-wrap">
                          {o.type === OrderType.DINE_IN  && <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[7px] font-black uppercase">LOCAL</span>}
                          {o.type === OrderType.TAKEAWAY && <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[7px] font-black uppercase">LLEVAR</span>}
                          {o.type === OrderType.DELIVERY && <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[7px] font-black uppercase">DOMICILIO</span>}
                          {isSelected && <span className="bg-brand-600 text-white px-2 py-0.5 rounded text-[7px] font-black uppercase">CARGADA</span>}
                        </div>
                      </div>
                      <button onClick={() => handleLoadOrderFromMonitor(o)} disabled={o.status !== OrderStatus.READY}
                        className={`p-2 rounded-xl transition-all ${o.status === OrderStatus.READY ? 'text-brand-600 bg-brand-50 hover:bg-brand-100' : 'text-slate-400 bg-slate-100 cursor-not-allowed'}`}>
                        <Edit2 size={14}/>
                      </button>
                    </div>

                    {o.type === OrderType.DELIVERY && (
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Dirección de Entrega</span>
                          {editingAddressId === o.id
                            ? <button onClick={() => handleSaveAddressUpdate(o.id)} className="text-emerald-600 text-[8px] font-black uppercase flex items-center gap-1"><Save size={10}/> Guardar</button>
                            : <button onClick={() => { setEditingAddressId(o.id); setTempAddress(o.deliveryAddress || ''); }} className="text-blue-600 text-[8px] font-black uppercase">Editar</button>}
                        </div>
                        {editingAddressId === o.id
                          ? <input autoFocus className="w-full bg-white border-none rounded-lg p-2 text-[9px] font-bold focus:ring-1 focus:ring-brand-500" value={tempAddress} onChange={e => setTempAddress(e.target.value)}/>
                          : <p className="text-[10px] font-bold text-slate-700 uppercase leading-tight">{o.deliveryAddress || 'Dirección no especificada'}</p>}
                      </div>
                    )}

                    <div className="flex justify-between items-end">
                      <div><span className="text-[8px] font-black text-slate-400 uppercase">Items: {o.items.length}</span><br/><span className="text-sm font-black text-brand-600">{fmtCOP(o.total)}</span></div>
                      <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${o.status === OrderStatus.READY ? 'bg-emerald-500 text-white' : 'bg-orange-400 text-white'}`}>{o.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal tratamientos (búsqueda global) */}
      {isTreatmentModalOpen && (
        <TreatmentBillingModal
          customers={customers}
          treatments={treatments}
          onClose={() => setIsTreatmentModalOpen(false)}
          onAddToCart={handleAddTreatmentToCart}
        />
      )}

      {/* Quick-bill desde panel lateral del cliente */}
      {quickBillTarget && activeCustomer.id !== 'consumidor-final' && (
        <PaymentAmountModal
          treatment={quickBillTarget}
          customer={activeCustomer}
          onClose={() => setQuickBillTarget(null)}
          onConfirm={(t, c, amount) => {
            handleAddTreatmentToCart(t, c, amount);
            setQuickBillTarget(null);
          }}
        />
      )}

      {/* Modal pago */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col md:flex-row max-h-[90vh]">
            <div className="flex-1 p-10 border-r border-slate-100 overflow-y-auto">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-800">Gestión de Pago</h3>
                  <p className="text-xs font-black text-brand-600 uppercase tracking-widest mt-1">Total a cobrar: <span className="text-xl text-slate-900 ml-2">{fmtCOP(currentTotal)}</span></p>
                </div>
                <button onClick={() => { setIsPaymentModalOpen(false); setShowCashEntry(false); }} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-800 transition-all"><X size={24}/></button>
              </div>

              <div className="mb-8 bg-slate-50 rounded-2xl p-4 space-y-1 border border-slate-100">
                <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase"><span>Subtotal</span><span>{fmtCOP(currentSubtotal)}</span></div>
                <div className="flex justify-between text-[9px] font-bold text-blue-500 uppercase"><span>IVA ({(taxRate*100).toFixed(0)}%)</span><span>{fmtCOP(currentIva)}</span></div>
                {currentImpoc > 0 && <div className="flex justify-between text-[9px] font-bold text-orange-500 uppercase"><span>Impoconsumo</span><span>{fmtCOP(currentImpoc)}</span></div>}
                {loyaltyDiscount > 0 && <div className="flex justify-between text-[9px] font-bold text-emerald-500 uppercase"><span>Dcto Puntos</span><span>-{fmtCOP(loyaltyDiscount)}</span></div>}
                <div className="flex justify-between text-sm font-black text-slate-800 uppercase pt-1 border-t border-slate-200 mt-1"><span>Total</span><span>{fmtCOP(currentTotal)}</span></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <button onClick={() => { setShowCashEntry(true); setReceivedAmount(''); }} className={`h-40 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all ${showCashEntry ? 'bg-emerald-600 text-white shadow-2xl' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                  <Banknote size={44}/><span className="text-xs font-black uppercase tracking-widest">Efectivo</span>
                </button>
                <button onClick={() => handleFinalizePayment(PaymentMethod.CARD)} className="h-40 bg-slate-50 rounded-[2.5rem] text-slate-500 hover:bg-blue-600 hover:text-white transition-all flex flex-col items-center justify-center gap-4 active:scale-95">
                  <CreditCard size={44}/><span className="text-xs font-black uppercase tracking-widest">Datafono</span>
                </button>
                <button onClick={() => handleFinalizePayment(PaymentMethod.QR)} className="h-40 bg-slate-50 rounded-[2.5rem] text-slate-500 hover:bg-purple-600 hover:text-white transition-all flex flex-col items-center justify-center gap-4 active:scale-95">
                  <QrCode size={44}/><span className="text-xs font-black uppercase tracking-widest">QR Transfer</span>
                </button>
              </div>

              {showCashEntry && (
                <div className="mt-10 p-8 bg-emerald-50 rounded-[2.5rem] border-2 border-emerald-100 animate-in slide-in-from-top-4 flex flex-col sm:flex-row items-center gap-8">
                  <div className="flex-1 w-full text-center sm:text-left">
                    <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">Monto Recibido</label>
                    <input autoFocus type="number" className="w-full h-28 bg-slate-50 rounded-2xl px-6 !text-5xl leading-none font-black text-slate-800 text-center outline-none focus:ring-4 focus:ring-emerald-200" value={receivedAmount} onChange={e => setReceivedAmount(e.target.value)} placeholder="0"/>
                  </div>
                  <div className="flex flex-col items-center sm:items-end gap-2">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Vueltas</p>
                    <h4 className="text-5xl font-black text-slate-800 tracking-tighter tabular-nums">{fmtCOP(cashChange)}</h4>
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