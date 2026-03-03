import React, { useState } from 'react';
import { Layers, Plus, Edit2, Search, X, Save, Lock } from 'lucide-react';
import { AccountingAccount, AccountNature, AccountingMapping } from '../types_accounting';
import { Permission } from '../types';
import {
  BookOpen
} from 'lucide-react';
import { useNotification } from './NotificationContext';

interface AccountingViewProps {
  puc: AccountingAccount[];
  mappings: AccountingMapping[];
  onAddAccount: (acc: AccountingAccount) => void;
  onUpdateAccount: (acc: AccountingAccount) => void;
  onAddMapping: (mapping: AccountingMapping) => void;
  onUpdateMapping: (mapping: AccountingMapping) => void;
  taxRate: number;
  userPermissions: Permission[];
}

export const AccountingView: React.FC<AccountingViewProps> = ({
  puc, onAddAccount, onUpdateAccount, userPermissions
}) => {
  const { notify } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  
  // PUC Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAcc, setEditingAcc] = useState<AccountingAccount | null>(null);
  const [accCode, setAccCode] = useState('');
  const [accName, setAccName] = useState('');
  const [accNature, setAccNature] = useState<AccountNature>(AccountNature.DEBIT);
  const [accStatement, setAccStatement] = useState<'Balance General' | 'Estado de Resultados' | 'Cuentas de Orden'>('Balance General');

  const canCreatePuc = userPermissions.includes(Permission.CONTABILIDAD_PUC_CREAR);
  const canEditPuc = userPermissions.includes(Permission.CONTABILIDAD_PUC_EDITAR);

  // Funciones PUC
  const openAccountModal = (acc?: AccountingAccount) => {
    if (acc) {
      setEditingAcc(acc);
      setAccCode(acc.code);
      setAccName(acc.name);
      setAccNature(acc.nature);
      setAccStatement(acc.financialStatement);
    } else {
      setEditingAcc(null);
      setAccCode('');
      setAccName('');
      setAccNature(AccountNature.DEBIT);
      setAccStatement('Balance General');
    }
    setIsModalOpen(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();

    const raw = localStorage.getItem("gastro_data");

    const companyId = raw
        ? JSON.parse(raw)?.user?.companyId
    : null;

    const data: AccountingAccount = {
      id: editingAcc?.id || `acc-${Date.now()}`,
      code: accCode,
      name: accName,
      nature: accNature,
      financialStatement: accStatement,
      companyId: companyId,
      isCustom: true
    };

    if (editingAcc) {
      onUpdateAccount(data);
      notify("Cuenta actualizada en el catálogo", "success");
    } else {
      onAddAccount(data);
      notify("Nueva cuenta registrada exitosamente", "success");
    }
    setIsModalOpen(false);
  };

  return (
    <div className="p-4 md:p-8 h-full bg-slate-50 overflow-y-auto pb-24 md:pb-8">
      <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
                <BookOpen className="text-brand-600" size={32} />
                Gestión Contable (PUC)
            </h2>
            <p className="text-xs tracking-widest text-slate-500 mt-1">Contabilidad normativa bajo estándares locales e internacionales.</p>
        </div>
      </div>

      <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-96">
                  <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                  <input type="text" placeholder="Buscar cuenta por código o nombre..." className="w-full pl-12 pr-4 py-3.5 bg-white border-none rounded-2xl text-sm font-medium shadow-sm focus:ring-2 focus:ring-brand-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              {/* 
                {canCreatePuc && (
                <button
                    onClick={() => openAccountModal()}
                    className="w-full md:w-auto bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl hover:bg-brand-600 transition-all active:scale-95"
                >
                    <Plus size={18}/> Nueva Cuenta PUC
                </button>
                )}
                */}
          </div>
          
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
              <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Código</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Nombre de Cuenta</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Balance</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Naturaleza</th>

                      {/* <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] text-right">Acciones</th>*/}
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                  {puc.filter(a => a.code.includes(searchTerm) || a.name.toLowerCase().includes(searchTerm.toLowerCase())).map(acc => (
                      <tr key={acc.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-5 font-mono font-black text-slate-900 text-sm tracking-tighter">{acc.code}</td>
                          <td className="px-8 py-5 uppercase text-[11px] text-slate-700 font-bold leading-tight">{acc.name}</td>
                          <td className="px-8 py-5"><span className="text-[9px] font-black uppercase px-2 py-1 rounded-md bg-slate-100 text-slate-400">{acc.financialStatement}</span></td>
                          <td className="px-8 py-5">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${acc.nature === AccountNature.DEBIT ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                  {acc.nature}
                              </span>
                          </td>
                          {/* 
                          <td className="px-8 py-5 text-right">
                              {canEditPuc ? (
                                <button onClick={() => openAccountModal(acc)} className="p-2 text-slate-300 hover:text-brand-600 transition-colors bg-slate-50 rounded-xl hover:bg-brand-50">
                                  <Edit2 size={16}/>
                                </button>
                              ) : (
                                <Lock size={16} className="text-slate-200 inline-block"/>
                              )}
                          </td> */}
                      </tr>
                  ))}
              </tbody>
              </table>
          </div>
      </div>

      {/* MODAL DE CUENTA PUC */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
              <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                  <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                          <div className="bg-slate-900 p-2 rounded-xl text-white"><Layers size={20}/></div>
                          <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">{editingAcc ? 'Editar Cuenta' : 'Nueva Cuenta PUC'}</h3>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white rounded-xl shadow-sm text-slate-400 hover:text-slate-800 transition-all"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleSaveAccount} className="p-8 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Código PUC</label>
                            <input required type="text" placeholder="Ej: 110505" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-sm focus:ring-2 focus:ring-brand-500 outline-none" value={accCode} onChange={e => setAccCode(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Naturaleza</label>
                            <select required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-xs" value={accNature} onChange={e => setAccNature(e.target.value as AccountNature)}>
                                <option value={AccountNature.DEBIT}>DÉBITO</option>
                                <option value={AccountNature.CREDIT}>CRÉDITO</option>
                            </select>
                        </div>
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nombre Descriptivo</label>
                          <input required type="text" placeholder="Ej. Caja General - Salón Principal" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 focus:ring-brand-500 outline-none" value={accName} onChange={e => setAccName(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Ubicación en Estados</label>
                          <select required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-xs" value={accStatement} onChange={e => setAccStatement(e.target.value as any)}>
                              <option value="Balance General">BALANCE GENERAL (ACT/PAS/PAT)</option>
                              <option value="Estado de Resultados">ESTADO DE RESULTADOS (ING/GTO/CST)</option>
                              <option value="Cuentas de Orden">CUENTAS DE ORDEN</option>
                          </select>
                      </div>
                      <button type="submit" className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] shadow-xl uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-brand-600 transition-all">
                          <Save size={18}/> {editingAcc ? 'Actualizar Ficha' : 'Registrar en Catálogo'}
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};