
import React, { useState } from 'react';
import { Expense, ExpenseCategory, ExpensePeriodicity, Permission, PaymentMethod } from '../types';
import { Plus, Trash2, DollarSign, Calendar, Tag, Filter, X, Save, Edit2, Receipt, Search, Archive, RotateCcw, BookOpen, Clock, Bell, AlertCircle, ChevronRight, Lock } from 'lucide-react';
import { useNotification } from './NotificationContext';
import { AccountingAccount } from '../types_accounting';

interface ExpensesViewProps {
  expenses: Expense[];
  currentBranchId: string;
  puc?: AccountingAccount[];
  onAddExpense: (expense: Expense, pucAccountId: string) => void;
  onUpdateExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  userPermissions: Permission[];
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ expenses, currentBranchId, puc = [], onAddExpense, onUpdateExpense, onDeleteExpense, userPermissions }) => {
  const { notify } = useNotification();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.OTHER);
  const [pucAccountId, setPucAccountId] = useState('');
  
  // Fixed: Changed non-existent ExpensePeriodicity.IMMEDIATE to ExpensePeriodicity.UNIQUE (lines 26-27)
  const [periodicity, setPeriodicity] = useState<ExpensePeriodicity>(ExpensePeriodicity.UNIQUE);
  const [nextExecution, setNextExecution] = useState('');
  const [shouldNotify, setShouldNotify] = useState(false);
  const [anticipationDays, setAnticipationDays] = useState('2');
  const [searchTerm, setSearchTerm] = useState('');

  const canCreateExpense = userPermissions.includes(Permission.EXPENSES_CREATE);
  const canEditExpense = userPermissions.includes(Permission.EXPENSES_EDIT);
  const canManageExpenses = userPermissions.includes(Permission.EXPENSES_MANAGE);

  const activeExpenses = expenses.filter(e => e.isActive);
  const totalExecuted = activeExpenses.filter(e => e.isExecuted).reduce((sum, e) => sum + e.amount, 0);
  const totalProgrammed = activeExpenses.filter(e => !e.isExecuted).reduce((sum, e) => sum + e.amount, 0);

  const filteredExpenses = expenses.filter(e => 
    e.isActive && 
    (e.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
     e.category.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleOpenModal = (expense?: Expense) => {
      if (expense) {
          if (!canEditExpense) { notify("Sin permiso para editar gastos.", "error"); return; }
          setEditingExpense(expense); 
          setDescription(expense.description); 
          setAmount(expense.amount.toString()); 
          setCategory(expense.category);
          setPeriodicity(expense.periodicity);
          setNextExecution(expense.nextExecution ? new Date(expense.nextExecution).toISOString().split('T')[0] : '');
          setShouldNotify(expense.notify);
          setAnticipationDays(expense.anticipationDays?.toString() || '2');
          setPucAccountId(expense.pucAccountId || '');
      } else {
          if (!canCreateExpense) { notify("Sin permiso para crear gastos.", "error"); return; }
          setEditingExpense(null); 
          setDescription(''); 
          setAmount(''); 
          setCategory(ExpenseCategory.OTHER); 
          setPucAccountId('');
          // Fixed: Changed non-existent ExpensePeriodicity.IMMEDIATE to ExpensePeriodicity.UNIQUE (lines 65-66)
          setPeriodicity(ExpensePeriodicity.UNIQUE);
          setNextExecution('');
          setShouldNotify(false);
          setAnticipationDays('2');
      }
      setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pucAccountId) { notify("Seleccione cuenta PUC obligatoria", "error"); return; }
    // Fixed: Changed non-existent ExpensePeriodicity.IMMEDIATE to ExpensePeriodicity.UNIQUE (line 76)
    if (periodicity !== ExpensePeriodicity.UNIQUE && !nextExecution) { notify("Debe definir fecha de ejecución para gastos programados", "error"); return; }

    // Fix: Added missing properties 'type' and 'paymentMethod' to satisfy the Expense interface
    const expenseData: Expense = {
        id: editingExpense?.id || Math.random().toString(36).substr(2, 9),
        branchId: currentBranchId, 
        description, 
        amount: parseFloat(amount), 
        category, 
        type: 'GASTO',
        date: new Date(), 
        registeredBy: 'Admin', 
        isActive: true,
        pucAccountId,
        periodicity,
        nextExecution: nextExecution ? new Date(nextExecution) : undefined,
        notify: shouldNotify,
        anticipationDays: parseInt(anticipationDays),
        // Fixed: Changed non-existent ExpensePeriodicity.IMMEDIATE to ExpensePeriodicity.UNIQUE (line 94)
        isExecuted: periodicity === ExpensePeriodicity.UNIQUE,
        paymentMethod: PaymentMethod.CASH
    };

    if (editingExpense) onUpdateExpense(expenseData);
    else onAddExpense(expenseData, pucAccountId);
    setIsModalOpen(false);
  };

  return (
    <div className="p-4 md:p-8 h-full bg-slate-50 overflow-y-auto pb-24 md:pb-8 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Gestión de Gastos</h2>
          <p className="text-slate-500 text-sm">Registro de egresos con programación contable automática.</p>
        </div>
        <div className="flex gap-2 items-center">
            {canCreateExpense && (
                <button onClick={() => handleOpenModal()} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black flex items-center shadow-xl hover:scale-105 transition-transform uppercase text-[10px] tracking-widest">
                    <Plus size={18} className="mr-2" /> Nuevo Registro
                </button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Ejecutado</p>
             <h4 className="text-xl font-black text-slate-800">${totalExecuted.toLocaleString()}</h4>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Agendado</p>
             <h4 className="text-xl font-black text-orange-500">${totalProgrammed.toLocaleString()}</h4>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm md:col-span-2 relative">
             <Search className="absolute left-7 top-7 text-slate-400" size={18} />
             <input type="text" placeholder="Buscar gastos..." className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm mt-3" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExpenses.map(expense => (
              <div key={expense.id} className={`bg-white p-5 rounded-[2rem] shadow-sm border transition-all ${expense.isExecuted ? 'border-slate-100' : 'border-orange-200 ring-4 ring-orange-50'}`}>
                  <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${expense.isExecuted ? 'bg-slate-100 text-slate-500' : 'bg-orange-100 text-orange-600'}`}>
                             {expense.isExecuted ? <Receipt size={24} /> : <Clock size={24} />}
                          </div>
                          <div>
                             <h3 className="font-black text-slate-800 leading-tight uppercase text-xs truncate max-w-[150px]">{expense.description}</h3>
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md">{expense.category}</span>
                          </div>
                      </div>
                      <div className="flex gap-1">
                          {canEditExpense && <button onClick={() => handleOpenModal(expense)} className="p-2 text-slate-300 hover:text-brand-600"><Edit2 size={16}/></button>}
                          {canManageExpenses && <button onClick={() => onDeleteExpense(expense.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>}
                      </div>
                  </div>

                  <div className="space-y-3 mb-4">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-slate-400 uppercase">Periodicidad:</span>
                          <span className="text-slate-700 uppercase">{expense.periodicity}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-slate-400 uppercase">Programación:</span>
                          <span className={`${expense.isExecuted ? 'text-emerald-600' : 'text-orange-600'}`}>
                              {expense.isExecuted ? 'ASENTADO' : `EJECUTA: ${expense.nextExecution ? new Date(expense.nextExecution).toLocaleDateString() : 'N/A'}`}
                          </span>
                      </div>
                  </div>

                  <div className="flex justify-between items-end border-t border-slate-50 pt-4 mt-2">
                      <div className="flex flex-col">
                         <span className="text-[9px] font-black text-slate-300 uppercase leading-none mb-1">Total</span>
                         <span className={`font-black text-2xl tracking-tighter ${expense.isExecuted ? 'text-slate-900' : 'text-orange-600'}`}>
                            ${expense.amount.toLocaleString()}
                         </span>
                      </div>
                      <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${expense.isExecuted ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                          {expense.isExecuted ? 'Ejecutado' : 'Pendiente'}
                      </div>
                  </div>
              </div>
          ))}
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-[200] p-4 backdrop-blur-md">
              <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                  <div className="bg-slate-900 p-8 text-white flex justify-between items-center relative overflow-hidden">
                      <div className="relative z-10">
                        <h3 className="text-2xl font-black uppercase tracking-tighter">{editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}</h3>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="bg-white/10 p-2 rounded-2xl hover:bg-white/20 transition-colors relative z-10"><X size={24} /></button>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="p-10 space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Descripción</label>
                                <input required type="text" className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold uppercase focus:ring-2 focus:ring-brand-500 outline-none" value={description} onChange={e => setDescription(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Cuenta PUC</label>
                                <select required className="w-full bg-slate-50 border-none rounded-2xl p-4 text-xs font-bold" value={pucAccountId} onChange={e => setPucAccountId(e.target.value)}>
                                    <option value="">Seleccione Cuenta...</option>
                                    {puc.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Monto</label>
                                <input required type="number" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black" value={amount} onChange={e => setAmount(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                             <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] mb-4">Programación</h4>
                             <select className="w-full bg-white border border-slate-200 rounded-2xl p-3 text-xs font-bold" value={periodicity} onChange={e => setPeriodicity(e.target.value as ExpensePeriodicity)}>
                                {Object.values(ExpensePeriodicity).map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                             </select>
                             {/* Fixed: Changed non-existent ExpensePeriodicity.IMMEDIATE to ExpensePeriodicity.UNIQUE (line 215) */}
                             {periodicity !== ExpensePeriodicity.UNIQUE && (
                                <input required type="date" className="w-full bg-white border border-slate-200 rounded-2xl p-3 text-xs font-bold" value={nextExecution} onChange={e => setNextExecution(e.target.value)} />
                             )}
                        </div>
                      </div>
                      <button type="submit" className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] shadow-2xl uppercase tracking-widest text-xs flex items-center justify-center gap-3">
                          <Save size={20}/> Guardar Registro
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
