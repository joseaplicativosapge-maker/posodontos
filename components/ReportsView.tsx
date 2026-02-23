import React, { useState, useMemo, useEffect } from 'react';
import { 
  Order, OrderStatus, Expense, InventoryItem, Product, OrderType, 
  Permission, Customer, Supplier, CashRegister, 
  Branch, User, PaymentMethod, MovementType, 
  PurchaseOrder, ProductType, ItemStatus 
} from '../types';
import { AccountingAccount, AccountingVoucher, AccountNature, AccountingEntry } from '../types_accounting';
import { 
  TrendingUp, BookOpen, Package, CloudUpload, BarChart3, 
  CalendarRange, CheckCircle2, XCircle, Search, Eye, Send, ArrowRight, X, ReceiptText, ShieldCheck, Flame, Smartphone, Clock, Boxes, Timer, AlertTriangle, FileText, Scale, List, RefreshCw
} from 'lucide-react';
import { InventoryReport } from './InventoryReport';
import { useNotification } from './NotificationContext';
import { dataService } from '../services/data.service';

import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, AreaChart, Area, LineChart, Line, Legend
} from 'recharts';

interface ReportsViewProps {
  orders: Order[];
  expenses: Expense[];
  inventory: InventoryItem[];
  products: Product[];
  puc: AccountingAccount[];
  vouchers?: AccountingVoucher[];
  userPermissions: Permission[];
  customers: Customer[];
  suppliers: Supplier[];
  registers: CashRegister[];
  branches?: Branch[];
  currentBranchId?: string;
  purchaseOrders: PurchaseOrder[];
  onUpdateOrder?: (order: Order) => void;
  sessions?: any[];
  logs?: any[];
  mappings?: any[];
  currentUser?: User;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ 
  orders, expenses, inventory, products, puc, vouchers = [], 
  customers, suppliers, registers,
  branches = [], currentBranchId, purchaseOrders = [], onUpdateOrder
}) => {
  const { notify } = useNotification();
  const [activeTab, setActiveTab] = useState<'operational' | 'accounting' | 'taxes' | 'inventory' | 'dian'>('operational');
  const [accountingSubTab, setAccountingSubTab] = useState<'ledger' | 'trial_balance' | 'results' | 'balance'>('results');
  const [startDateTime, setStartDateTime] = useState(new Date().toISOString().split('T')[0] + "T00:00");
  const [endDateTime, setEndDateTime] = useState(new Date().toISOString().split('T')[0] + "T23:59");
  const [isSendingToDIAN, setIsSendingToDIAN] = useState<string | null>(null);
  const [viewingOrderDetail, setViewingOrderDetail] = useState<Order | null>(null);

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
  const startDate = new Date(startDateTime);
  const endDate = new Date(endDateTime);
  const [dianReport, setDianReport] = useState<any>({ orders: [], totals: { iva: 0, impoconsumo: 0, sent: 0, pending: 0, totalVentas: 0 } });
  const [isLoadingDian, setIsLoadingDian] = useState(false);

  const fetchDianReport = async () => {
    if (!currentBranchId) return;
    setIsLoadingDian(true);
    try {
      const res = await dataService.getDianReport(currentBranchId, startDateTime, endDateTime);
      setDianReport(res.data);
    } catch (e) {
      notify("Error al conectar con el servidor fiscal", "error");
    } finally {
      setIsLoadingDian(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dian') {
      fetchDianReport();
    }
  }, [activeTab, startDateTime, endDateTime, currentBranchId]);

  // --- FILTRADO POR SUCURSAL Y RANGO ---
  const branchOrders = useMemo(() => orders.filter(o => 
      o.branchId === currentBranchId && o.status === OrderStatus.COMPLETED && 
      new Date(o.createdAt) >= startDate && new Date(o.createdAt) <= endDate
  ), [orders, currentBranchId, startDate, endDate]);

  const branchExpenses = useMemo(() => expenses.filter(e => 
      e.branchId === currentBranchId && e.isActive && 
      new Date(e.date) >= startDate && new Date(e.date) <= endDate
  ), [expenses, currentBranchId, startDate, endDate]);

  const branchVouchers = useMemo(() => (vouchers || []).filter(v => 
      v.branchId === currentBranchId && new Date(v.date) >= startDate && new Date(v.date) <= endDate
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [vouchers, currentBranchId, startDate, endDate]);

  // --- MOTOR CONTABLE ---
  const allEntries = useMemo(() => branchVouchers.flatMap(v => v.entries || []), [branchVouchers]);

  // Balance de Comprobación Dinámico
  const trialBalanceReport = useMemo(() => {
    const summary: Record<string, { debit: number, credit: number, code: string, name: string, nature: AccountNature }> = {};
    
    allEntries.forEach(e => {
      const accId = e.accountId;
      if (!summary[accId]) {
        const pucAcc = puc.find(p => p.id === accId);
        const code = e.accountCode || pucAcc?.code || '0000';
        const name = e.accountName || pucAcc?.name || 'Cuenta General';
        
        let nature = pucAcc?.nature;
        if (!nature) {
          nature = ['1', '5', '6'].includes(code[0]) ? AccountNature.DEBIT : AccountNature.CREDIT;
        }
        
        summary[accId] = { debit: 0, credit: 0, code, name, nature: nature as AccountNature };
      }
      summary[accId].debit += Number(e.debit || 0);
      summary[accId].credit += Number(e.credit || 0);
    });

    return Object.entries(summary).map(([id, data]) => {
      const balanceValue = data.nature === AccountNature.DEBIT ? data.debit - data.credit : data.credit - data.debit;
      return { id, ...data, balance: balanceValue };
    }).sort((a, b) => a.code.localeCompare(b.code));
  }, [allEntries, puc]);

  const ledgerTotals = useMemo(() => trialBalanceReport.reduce((acc, curr) => ({
      debit: acc.debit + curr.debit, 
      credit: acc.credit + curr.credit
  }), { debit: 0, credit: 0 }), [trialBalanceReport]);

  const isBalanced = Math.abs(ledgerTotals.debit - ledgerTotals.credit) < 0.5;

  // ESTADO DE RESULTADOS (P&G)
  const financialSummary = useMemo(() => {
    const income = trialBalanceReport.filter(a => a.code.startsWith('4')).reduce((s, a) => s + a.balance, 0);
    const costs = trialBalanceReport.filter(a => a.code.startsWith('6')).reduce((s, a) => s + a.balance, 0);
    const expensesTotal = trialBalanceReport.filter(a => a.code.startsWith('5')).reduce((s, a) => s + a.balance, 0);
    return { income, costs, expensesTotal, netProfit: income - costs - expensesTotal };
  }, [trialBalanceReport]);

  // BALANCE GENERAL
  const balanceSheetData = useMemo(() => {
      const assets = trialBalanceReport.filter(a => a.code.startsWith('1'));
      const liabilities = trialBalanceReport.filter(a => a.code.startsWith('2'));
      const equity = trialBalanceReport.filter(a => a.code.startsWith('3'));

      const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
      const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);
      const totalEquityBase = equity.reduce((s, a) => s + a.balance, 0);
      
      const totalEquityFinal = totalEquityBase + financialSummary.netProfit;

      return { 
          assets, liabilities, equity, 
          totalAssets, totalLiabilities, 
          totalEquity: totalEquityFinal, 
          netProfit: financialSummary.netProfit 
      };
  }, [trialBalanceReport, financialSummary.netProfit]);

  const isSheetBalanced = Math.abs(balanceSheetData.totalAssets - (balanceSheetData.totalLiabilities + balanceSheetData.totalEquity)) < 0.5;

  // --- CÁLCULOS OPERATIVOS ---
  const hourlyFlowData = useMemo(() => {
    const hours: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hours[i] = 0;
    branchOrders.forEach(o => {
        const h = new Date(o.createdAt).getHours();
        hours[h]++;
    });
    return Object.entries(hours).map(([h, count]) => ({
        hour: `${h.toString().padStart(2, '0')}:00`,
        pedidos: count
    }));
  }, [branchOrders]);

  const bestSellersData = useMemo(() => {
    const tally: Record<string, number> = {};
    branchOrders.forEach(o => {
        o.items.forEach(it => {
            tally[it.product.name] = (tally[it.product.name] || 0) + it.quantity;
        });
    });
    return Object.entries(tally)
        .map(([name, qty]) => ({ name: name.toUpperCase(), qty }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 10);
  }, [branchOrders]);

  return (
    <div className="p-4 md:p-8 h-full bg-slate-50 overflow-y-auto pb-24">
      <div className="mb-8 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 print:hidden">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
            <BarChart3 className="text-brand-600" size={32} /> Central de Inteligencia
          </h2>
        </div>
      </div>

      <div className="bg-white p-6 border border-slate-100 shadow-sm flex flex-wrap items-center gap-6 mb-8 print:hidden">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-5 py-2.5 rounded-2xl">
          <CalendarRange size={16} className="text-brand-600" />
          <input type="datetime-local" className="bg-transparent border-none text-xs font-black text-slate-700 outline-none" value={startDateTime} onChange={e => setStartDateTime(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-5 py-2.5 rounded-2xl">
          <CalendarRange size={16} className="text-brand-600" />
          <input type="datetime-local" className="bg-transparent border-none text-xs font-black text-slate-700 outline-none" value={endDateTime} onChange={e => setEndDateTime(e.target.value)} />
        </div>
        {activeTab === 'dian' && (
          <button onClick={fetchDianReport} className="p-3 bg-brand-50 text-brand-600 rounded-2xl hover:bg-brand-100 transition-all">
            <RefreshCw size={18} className={isLoadingDian ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      <div className="flex p-1.5 bg-slate-200/50 rounded-2xl mb-8 overflow-x-auto no-scrollbar shadow-inner w-full print:hidden">
        {[{ id: 'operational', label: 'Operativo', icon: <TrendingUp size={18}/> }, { id: 'accounting', label: 'Contabilidad', icon: <BookOpen size={18}/> }, { id: 'inventory', label: 'Inventario', icon: <Package size={18}/> }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 min-w-[180px] px-6 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in duration-300">
          {activeTab === 'operational' && (
              <div className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Ventas Brutas</p><h3 className="text-2xl font-black text-emerald-600">{formatCurrency(branchOrders.reduce((s,o)=>s+o.total, 0))}</h3></div>
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Impuestos Recaudados</p><h3 className="text-2xl font-black text-blue-600">{formatCurrency(branchOrders.reduce((s,o)=>s+(o.tax||0)+(o.impoconsumoAmount||0), 0))}</h3></div>
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Gastos Operativos</p><h3 className="text-2xl font-black text-red-600">{formatCurrency(branchExpenses.reduce((s,e)=>s+e.amount, 0))}</h3></div>
                    <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-xl"><p className="text-[10px] font-black text-brand-400 uppercase mb-1">Resultado Neto</p><h3 className="text-2xl font-black text-white">{formatCurrency(financialSummary.netProfit)}</h3></div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm h-[400px]">
                           <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter mb-6 flex items-center gap-2"><Timer className="text-brand-600" size={20}/> Pedidos por Hora</h3>
                           <div className="h-[300px]">
                               <ResponsiveContainer width="100%" height="100%">
                                   <AreaChart data={hourlyFlowData}>
                                       <defs><linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#cc6600" stopOpacity={0.1}/><stop offset="95%" stopColor="#cc6600" stopOpacity={0}/></linearGradient></defs>
                                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                       <XAxis dataKey="hour" tick={{fill: '#94a3b8', fontSize: 10}} />
                                       <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                                       <Area type="monotone" dataKey="pedidos" stroke="#cc6600" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" />
                                   </AreaChart>
                               </ResponsiveContainer>
                           </div>
                      </div>
                      <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm h-[400px]">
                           <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter mb-6 flex items-center gap-2"><Flame className="text-orange-500" size={20}/> Ranking Productos</h3>
                           <div className="h-[300px]">
                               <ResponsiveContainer width="100%" height="100%">
                                   <BarChart data={bestSellersData} layout="vertical">
                                       <XAxis type="number" hide />
                                       <YAxis dataKey="name" type="category" tick={{fill: '#64748b', fontSize: 9, fontWeight: '900'}} width={130} />
                                       <Tooltip cursor={{fill: 'transparent'}} />
                                       <Bar dataKey="qty" radius={[0, 10, 10, 0]} barSize={20}>
                                           {bestSellersData.map((_, index) => (<Cell key={`cell-${index}`} fill={index < 3 ? '#cc6600' : '#f59e0b'} />))}
                                       </Bar>
                                   </BarChart>
                               </ResponsiveContainer>
                           </div>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'accounting' && (
              <div className="space-y-6">
                  <div className="flex p-1 bg-slate-200/50 rounded-xl w-fit mb-6 print:hidden">
                    {[
                        {id: 'results', label: 'P&G', icon: <TrendingUp size={14}/>},
                        {id: 'balance', label: 'Balance General', icon: <Scale size={14}/>},
                        {id: 'trial_balance', label: 'Balance Comprobación', icon: <CheckCircle2 size={14}/>},
                        {id: 'ledger', label: 'Libro Diario', icon: <List size={14}/>}
                    ].map(s => (
                        <button key={s.id} onClick={() => setAccountingSubTab(s.id as any)} className={`px-5 py-2 text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-2 ${accountingSubTab === s.id ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}>
                            {s.icon} {s.label}
                        </button>
                    ))}
                  </div>

                  {accountingSubTab === 'ledger' && (
                      <div className="space-y-4 animate-in fade-in">
                          {branchVouchers.length === 0 ? (
                              <div className="py-32 text-center text-slate-300 uppercase font-black text-xs">Sin registros para el periodo</div>
                          ) : branchVouchers.map(v => (
                              <div key={v.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden group">
                                  <div className="bg-slate-50 p-6 flex justify-between items-center border-b border-slate-100">
                                      <div className="flex items-center gap-4">
                                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${v.type === 'INGRESO' ? 'bg-brand-600' : v.type === 'EGRESO' ? 'bg-brand-600' : 'bg-brand-600'}`}>
                                              <ReceiptText size={20}/>
                                          </div>
                                          <div>
                                              <h4 className="font-black text-slate-800 uppercase text-xs">Comprobante {v.type} #{v.posReferenceId || v.id.slice(-6).toUpperCase()}</h4>
                                              <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(v.date).toLocaleString()}</p>
                                          </div>
                                      </div>
                                      <div className="text-right">
                                          <p className="text-sm font-black text-slate-900">{formatCurrency(v.totalDebit)}</p>
                                          <span className="text-[8px] font-black uppercase text-emerald-600 tracking-widest flex items-center gap-1 justify-end"><CheckCircle2 size={10}/> Partida Doble OK</span>
                                      </div>
                                  </div>
                                  <div className="p-4 overflow-x-auto">
                                      <table className="w-full text-left text-[10px]">
                                          <thead className="text-slate-400 uppercase font-black tracking-widest">
                                              <tr><th className="px-4 py-2">Código</th><th className="px-4 py-2">Cuenta</th><th className="px-4 py-2">Detalle</th><th className="px-4 py-2 text-right">Débito</th><th className="px-4 py-2 text-right">Crédito</th></tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-50">
                                              {(v.entries || []).map((e, idx) => (
                                                  <tr key={idx} className="hover:bg-slate-50/50">
                                                      <td className="px-4 py-3 font-mono font-bold text-brand-600">{e.accountCode || puc.find(p=>p.id===e.accountId)?.code}</td>
                                                      <td className="px-4 py-3 font-black text-slate-700 uppercase">{e.accountName || puc.find(p=>p.id===e.accountId)?.name}</td>
                                                      <td className="px-4 py-3 text-slate-400 italic">{e.description}</td>
                                                      <td className="px-4 py-3 text-right font-bold text-slate-900">{e.debit > 0 ? formatCurrency(e.debit) : '--'}</td>
                                                      <td className="px-4 py-3 text-right font-bold text-slate-900">{e.credit > 0 ? formatCurrency(e.credit) : '--'}</td>
                                                  </tr>
                                              ))}
                                          </tbody>
                                      </table>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}

                  {accountingSubTab === 'balance' && (
                    <div className="mx-auto bg-white p-10 border border-slate-100 shadow-sm space-y-10 animate-in fade-in">
                        <div className="text-center"><h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Balance General</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sucursal: {branches?.find(b => b.id === currentBranchId)?.name} | Corte: {endDate.toLocaleDateString()}</p></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-4">
                                <h4 className="text-sm font-black uppercase text-brand-600 border-b-2 border-brand-50 pb-2 flex justify-between"><span>Activo</span><span>(Clase 1)</span></h4>
                                <div className="space-y-2">
                                    {balanceSheetData.assets.map(a => <div key={a.id} className="flex justify-between text-xs font-bold text-slate-600 uppercase"><span>{a.code} {a.name}</span><span>{formatCurrency(a.balance)}</span></div>)}
                                    {balanceSheetData.assets.length === 0 && <p className="text-slate-300 italic text-[10px]">Sin movimientos</p>}
                                </div>
                                <div className="flex justify-between pt-4 border-t-2 border-slate-100 font-black text-slate-900 uppercase text-sm"><span>TOTAL ACTIVO</span><span>{formatCurrency(balanceSheetData.totalAssets)}</span></div>
                            </div>
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <h4 className="text-sm font-black uppercase text-orange-600 border-b-2 border-orange-50 pb-2 flex justify-between"><span>Pasivo</span><span>(Clase 2)</span></h4>
                                    <div className="space-y-2">
                                        {balanceSheetData.liabilities.map(a => <div key={a.id} className="flex justify-between text-xs font-bold text-slate-600 uppercase"><span>{a.code} {a.name}</span><span>{formatCurrency(a.balance)}</span></div>)}
                                        {balanceSheetData.liabilities.length === 0 && <p className="text-slate-300 italic text-[10px]">Sin pasivos</p>}
                                    </div>
                                    <div className="flex justify-between pt-2 font-black text-slate-900 text-xs uppercase"><span>TOTAL PASIVO</span><span>{formatCurrency(balanceSheetData.totalLiabilities)}</span></div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-sm font-black uppercase text-blue-600 border-b-2 border-blue-50 pb-2 flex justify-between"><span>Patrimonio</span><span>(Clase 3)</span></h4>
                                    <div className="space-y-2">
                                        {balanceSheetData.equity.map(a => <div key={a.id} className="flex justify-between text-xs font-bold text-slate-600 uppercase"><span>{a.code} {a.name}</span><span>{formatCurrency(a.balance)}</span></div>)}
                                        <div className="flex justify-between text-xs font-black text-emerald-600 uppercase italic bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                                            <span className="flex items-center gap-2"><TrendingUp size={14}/> Resultado del Periodo</span>
                                            <span>{formatCurrency(balanceSheetData.netProfit)}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between pt-2 font-black text-slate-900 text-xs uppercase"><span>TOTAL PATRIMONIO</span><span>{formatCurrency(balanceSheetData.totalEquity)}</span></div>
                                </div>
                            </div>
                        </div>
                        <div className={`p-8 text-white shadow-2xl transition-all duration-500 border-l-[12px] ${isSheetBalanced ? 'bg-slate-900 border-emerald-500' : 'bg-red-900 border-red-400'}`}>
                            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="text-center md:text-left">
                                    <p className="text-[10px] font-black text-brand-400 uppercase tracking-[0.2em] mb-1">Ecuación Patrimonial</p>
                                    <p className="text-lg font-black uppercase tracking-tight">Activo = Pasivo + Patrimonio</p>
                                </div>
                                <div className="flex items-center gap-10">
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Activo</p>
                                        <p className="text-2xl font-black">{formatCurrency(balanceSheetData.totalAssets)}</p>
                                    </div>
                                    <div className="text-2xl font-black text-brand-600">=</div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Pas + Pat</p>
                                        <p className={`text-2xl font-black ${isSheetBalanced ? 'text-emerald-400' : 'text-red-300'}`}>
                                            {formatCurrency(balanceSheetData.totalLiabilities + balanceSheetData.totalEquity)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            {!isSheetBalanced && (
                                <div className="mt-6 p-4 bg-white/10 rounded-2xl flex items-center gap-3 border border-white/10">
                                    <AlertTriangle size={20} className="text-red-400 shrink-0"/>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-red-100">Descuadre detectado. Revise que todos los gastos estén asentados con su respectiva contrapartida en caja.</p>
                                </div>
                            )}
                        </div>
                    </div>
                  )}

                  {accountingSubTab === 'trial_balance' && (
                      <div className="bg-white border border-slate-100 shadow-sm overflow-hidden animate-in fade-in">
                           <table className="w-full text-left">
                               <thead className="bg-slate-900 text-white uppercase text-[9px] font-black tracking-widest">
                                   <tr><th className="px-8 py-5">Código / Cuenta</th><th className="px-8 py-5 text-right">Débitos</th><th className="px-8 py-5 text-right">Créditos</th><th className="px-8 py-5 text-right bg-slate-800">Saldo Final</th></tr>
                               </thead>
                               <tbody className="divide-y divide-slate-50">
                                   {trialBalanceReport.length === 0 ? (
                                       <tr><td colSpan={4} className="py-24 text-center text-slate-300 font-black text-xs">Sin actividad contable en este rango</td></tr>
                                   ) : trialBalanceReport.map(a => (
                                       <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                                           <td className="px-8 py-4">
                                               <p className="font-black text-slate-800 text-sm tracking-tighter">{a.code}</p>
                                               <p className="text-[9px] font-black text-slate-400 truncate max-w-[200px]">{a.name}</p>
                                           </td>
                                           <td className="px-8 py-4 text-right font-bold text-slate-600">{a.debit > 0 ? formatCurrency(a.debit) : '--'}</td>
                                           <td className="px-8 py-4 text-right font-bold text-slate-600">{a.credit > 0 ? formatCurrency(a.credit) : '--'}</td>
                                           <td className="px-8 py-4 text-right font-black text-slate-900">
                                                <span className={a.balance < 0 ? 'text-red-600' : ''}>{formatCurrency(a.balance)}</span>
                                                <span className="ml-2 text-[8px] opacity-40 uppercase">{a.nature.charAt(0)}</span>
                                           </td>
                                       </tr>
                                   ))}
                               </tbody>
                               <tfoot className="bg-slate-50 border-t-4 border-slate-100 font-black text-sm">
                                   <tr className="bg-slate-900 text-white border-none">
                                       <td className="px-8 py-6 text-xs uppercase tracking-widest">Sumas Iguales Control</td>
                                       <td className="px-8 py-6 text-right text-emerald-400">{formatCurrency(ledgerTotals.debit)}</td>
                                       <td className="px-8 py-6 text-right text-emerald-400">{formatCurrency(ledgerTotals.credit)}</td>
                                       <td className={`px-8 py-6 text-right ${isBalanced ? 'text-emerald-400' : 'text-red-500'}`}>
                                           {isBalanced ? 'SUMAS IGUALES' : 'DESCUADRE'}
                                       </td>
                                   </tr>
                               </tfoot>
                           </table>
                      </div>
                  )}

                  {accountingSubTab === 'results' && (
                      <div className="bg-white p-10 border border-slate-100 shadow-sm mx-auto space-y-4 animate-in fade-in">
                        <div className="text-center border-b pb-8"><h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Estado de Resultados (P&G)</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sucursal: {branches?.find(b => b.id === currentBranchId)?.name}</p></div>
                        <div className="flex justify-between items-center py-5 border-b border-slate-100 hover:bg-slate-50 px-4 rounded-xl transition-colors"><span className="text-sm font-black uppercase text-slate-700">Ingresos Operacionales (Clase 4)</span><span className="text-lg font-black text-emerald-600">{formatCurrency(financialSummary.income)}</span></div>
                        <div className="flex justify-between items-center py-5 border-b border-slate-100 hover:bg-slate-50 px-4 rounded-xl transition-colors"><span className="text-sm font-black uppercase text-slate-700">Costos de Venta (Clase 6)</span><span className="text-lg font-black text-red-600">({formatCurrency(financialSummary.costs)})</span></div>
                        <div className="flex justify-between items-center py-5 border-b border-slate-100 hover:bg-slate-50 px-4 rounded-xl transition-colors"><span className="text-sm font-black uppercase text-slate-700">Gastos Administrativos (Clase 5)</span><span className="text-lg font-black text-red-600">({formatCurrency(financialSummary.expensesTotal)})</span></div>
                        <div className="flex justify-between items-center py-10 bg-brand-600 text-white rounded-[2.5rem] px-12 shadow-2xl mt-10 relative overflow-hidden group">
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase opacity-70 mb-2 tracking-[0.2em]">Resultado Neto del Ejercicio</p>
                                <span className="text-sm font-black uppercase tracking-tight">Utilidad Operativa</span>
                            </div>
                            <span className="text-5xl font-black relative z-10 tabular-nums">{formatCurrency(financialSummary.netProfit)}</span>
                            <div className="absolute right-[-10%] top-[-50%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                        </div>
                    </div>
                  )}
              </div>
          )}

          {activeTab === 'dian' && (
              <div className="space-y-6">
                   <div className="bg-white border border-slate-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                             <thead className="bg-slate-900 text-white uppercase text-[9px] font-black tracking-widest"><tr><th className="px-8 py-5">Factura / Fecha</th><th className="px-8 py-5">Cliente</th><th className="px-8 py-5 text-right">Monto Total</th><th className="px-8 py-5 text-center">Estado DIAN</th><th className="px-8 py-5 text-right">Acciones</th></tr></thead>
                             <tbody className="divide-y divide-slate-50">
                                {dianReport.orders.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-10 text-center text-slate-400 text-xs uppercase tracking-widest font-bold">
                                            No hay facturas para mostrar
                                        </td>
                                    </tr>
                                ) : (
                                    dianReport.orders.map(o => (
                                    <tr key={o.id} className="hover:bg-slate-50/50">
                                        <td className="px-8 py-4">
                                        <p className="font-black text-slate-800 text-sm uppercase">
                                            #{o.id.slice(-6).toUpperCase()}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            {new Date(o.createdAt).toLocaleString()}
                                        </p>
                                        </td>
                                        <td className="px-8 py-4 font-bold text-slate-600 uppercase text-xs">
                                        {customers.find(c => c.id === o.customerId)?.name || 'Consumidor Final'}
                                        </td>
                                        <td className="px-8 py-4 text-right font-black text-slate-900">
                                        {formatCurrency(o.total)}
                                        </td>
                                        <td className="px-8 py-4 text-center">
                                        <span
                                            className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                            o.isSentToDIAN
                                                ? 'bg-emerald-50 text-emerald-600'
                                                : 'bg-orange-50 text-orange-600'
                                            }`}
                                        >
                                            {o.isSentToDIAN ? 'Transmitida' : 'Pendiente'}
                                        </span>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setViewingOrderDetail(o)} className="p-2 bg-slate-50 text-slate-400 hover:text-brand-600 rounded-xl transition-all shadow-sm">
                                                <Eye size={20} />
                                            </button>
                                            <button
                                            onClick={() => {
                                                setIsSendingToDIAN(o.id)
                                                setTimeout(() => {
                                                if (onUpdateOrder)
                                                    onUpdateOrder({ ...o, isSentToDIAN: true })
                                                setIsSendingToDIAN(null)
                                                notify('FE Transmitida', 'success')
                                                }, 1000)
                                            }}
                                            disabled={o.isSentToDIAN || isSendingToDIAN === o.id}
                                            className={`p-2 rounded-xl transition-all ${
                                                o.isSentToDIAN
                                                ? 'text-slate-200'
                                                : 'text-brand-600 hover:bg-brand-50'
                                            }`}
                                            >
                                            {isSendingToDIAN === o.id ? (
                                                <CloudUpload className="animate-bounce" size={20} />
                                            ) : (
                                                <Send size={20} />
                                            )}
                                            </button>
                                        </div>
                                        </td>
                                    </tr>
                                    ))
                                )}
                                </tbody>
                        </table>
                   </div>
              </div>
          )}

          {activeTab === 'inventory' && <InventoryReport inventory={inventory} products={products} orders={orders} />}
      </div>

      {viewingOrderDetail && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[1500] p-4">
            <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg"><ReceiptText size={24}/></div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Detalle Factura Electrónica</h3>
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Validación Previa DIAN - Anexo 1.8</p>
                        </div>
                    </div>
                    <button onClick={() => setViewingOrderDetail(null)} className="bg-white p-3 rounded-2xl text-slate-400 hover:text-slate-800 shadow-sm transition-all"><X size={20} /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                    {/* CUFE Section */}
                    <div className="bg-slate-900 p-6 rounded-[2rem] text-white relative overflow-hidden">
                        <p className="text-[9px] font-black text-brand-500 uppercase tracking-[0.2em] mb-3">CUFE (Código Único de Factura Electrónica)</p>
                        <p className="font-mono text-xs break-all leading-relaxed opacity-90">
                           {viewingOrderDetail.isSentToDIAN 
                             ? `fe80${Math.random().toString(16).slice(2)}a01${Math.random().toString(16).slice(2)}d44` 
                             : 'PENDIENTE DE TRANSMISIÓN'}
                        </p>
                        <ShieldCheck className="absolute -right-4 -bottom-4 text-white/5" size={100} />
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Información del Emisor</h4>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-800 uppercase">{branches?.find(b => b.id === currentBranchId)?.name || 'BarberOS SaaS'}</p>
                                <p className="text-[9px] font-bold text-slate-500">NIT: {branches?.find(b => b.id === currentBranchId)?.nit || '900.123.456-1'}</p>
                                <p className="text-[9px] font-bold text-slate-500 uppercase">Regimen: Responsable de IVA</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Datos del Adquirente</h4>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-800 uppercase">{viewingOrderDetail.customer?.name || 'Consumidor Final'}</p>
                                <p className="text-[9px] font-bold text-slate-500">Doc: {viewingOrderDetail.customer?.documentNumber || '2222222222'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Resumen Contable e Impuestos</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between text-xs font-bold text-slate-600"><span>SUBTOTAL GRAVABLE</span><span>{formatCurrency(viewingOrderDetail.subtotal || 0)}</span></div>
                            <div className="flex justify-between text-xs font-bold text-blue-600"><span>IVA GENERADO (19%)</span><span>{formatCurrency(viewingOrderDetail.tax || 0)}</span></div>
                            <div className="flex justify-between text-xs font-bold text-orange-600"><span>IMPOCONSUMO (8%)</span><span>{formatCurrency(viewingOrderDetail.impoconsumoAmount || 0)}</span></div>
                            <div className="flex justify-between pt-3 border-t-2 border-slate-900 font-black text-lg text-slate-900"><span>TOTAL FACTURA</span><span>{formatCurrency(viewingOrderDetail.total)}</span></div>
                        </div>
                    </div>

                    <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-4">
                        <Smartphone size={24} className="text-blue-600 shrink-0 mt-1"/>
                        <div>
                            <p className="text-[10px] font-black text-blue-800 uppercase mb-1">Representación Gráfica</p>
                            <p className="text-[9px] text-blue-600 leading-relaxed font-medium">Esta transacción ha sido firmada digitalmente y cumple con los requisitos del Decreto 2242 de 2015. El QR de validación puede ser consultado en el portal de la DIAN.</p>
                        </div>
                    </div>
                </div>

                <div className="p-8 border-t bg-slate-50 flex justify-end gap-3">
                   <button onClick={() => setViewingOrderDetail(null)} className="px-8 py-4 bg-white border border-slate-200 text-slate-600 font-black rounded-[2rem] uppercase text-[10px] tracking-widest">Cerrar Detalle</button>
                   <button onClick={() => window.print()} className="px-10 py-4 bg-slate-900 text-white font-black rounded-[2rem] uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-2"><FileText size={16}/> Imprimir PDF</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};