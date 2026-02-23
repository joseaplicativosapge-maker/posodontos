
import React, { useState } from 'react';
import { Customer, DocumentType, Documents } from '../types';
import { Users, Search, Plus, Phone, MapPin, Mail, X, Save, Trash2, Edit2, RotateCcw, Archive, Star, Fingerprint, ShieldCheck, Download, Printer, Building2, User, Calendar, Briefcase } from 'lucide-react';
import { useNotification } from './NotificationContext';

interface CustomersViewProps {
  customers: Customer[];
  currentCompanyId: string;
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ customers, currentCompanyId, onAddCustomer, onUpdateCustomer }) => {
  const { notify, confirm } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showTrash, setShowTrash] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('CC');
  const [documentNumber, setDocumentNumber] = useState('');
  const [city, setCity] = useState('');
  // aca: nuevos estados para campos requeridos
  const [fiscalResponsibility, setFiscalResponsibility] = useState('');
  const [birthDate, setBirthDate] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setDocumentType('CC');
    setDocumentNumber('');
    setCity('');
    // aca: reset de campos
    setFiscalResponsibility('');
    setBirthDate('');
  };

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingId(customer.id);
      setName(customer.name);
      setPhone(customer.phone);
      setEmail(customer.email || '');
      setAddress(customer.address || '');
      setDocumentType(customer.documentType || 'CC');
      setDocumentNumber(customer.documentNumber || '');
      setCity(customer.city || '');
      // aca: carga de datos existentes para edición
      setFiscalResponsibility(customer.fiscalResponsibility || '');
      setBirthDate(
        customer.birthDate
          ? new Date(customer.birthDate).toISOString().slice(0, 10)
          : ''
      );
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // aca: se incluyen fiscalResponsibility y birthDate en el objeto de datos
    const customerData = { 
      name: name.toUpperCase(), 
      phone, 
      email, 
      address, 
      documentType, 
      documentNumber, 
      city,
      fiscalResponsibility,
      birthDate,
      currentCompanyId
    };
    
    if (editingId) {
      const original = customers.find(c => c.id === editingId);
      if (original) { 
        onUpdateCustomer({ ...original, ...customerData }); 
        notify('Cliente actualizado correctamente.', 'success'); 
      }
    } else {
      const newCustomer: Customer = { 
        id: `c-${Date.now()}`, 
        ...customerData, 
        points: 0, 
        isActive: true 
      };
      onAddCustomer(newCustomer); 
      notify('Cliente registrado con éxito.', 'success');
    }
    setIsModalOpen(false);
    resetForm();
  };

  const toggleStatus = async (customer: Customer) => {
    const action = customer.isActive ? 'Desactivar' : 'Restaurar';
    const confirmed = await confirm({ 
      title: `${action} Cliente`, 
      message: `¿Desea ${action.toLowerCase()} a "${customer.name}"?`, 
      type: customer.isActive ? 'warning' : 'info' 
    });

    if (confirmed) {
      onUpdateCustomer({ ...customer, isActive: !customer.isActive });
      notify(`Cliente ${customer.isActive ? 'inhabilitado' : 'restaurado'}.`, 'info');
    }
  };

  const filteredCustomers = customers.filter(c => {
    const isMatchedStatus = showTrash ? !c.isActive : c.isActive;
    if (!isMatchedStatus) return false;
    const searchLower = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(searchLower) || 
           c.phone.includes(searchTerm) || 
           (c.documentNumber && c.documentNumber.includes(searchTerm));
  });

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-slate-50 pb-24 md:pb-8 relative animate-in fade-in duration-500">
      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
             <Users className="text-brand-600" size={32}/> Maestro de Clientes
          </h2>
          <p className="text-slate-500 font-medium text-[10px] tracking-widest mt-1">Base de datos de fidelización y facturación</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button onClick={() => window.print()} className="px-5 py-2.5 rounded-xl font-bold border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 transition-all flex items-center text-xs uppercase tracking-widest"><Printer size={16} className="mr-2"/> Reporte</button>
          <button onClick={() => setShowTrash(!showTrash)} className={`px-5 py-2.5 rounded-xl font-bold border transition-all flex items-center text-xs uppercase tracking-widest ${showTrash ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{showTrash ? <Users size={16} className="mr-2"/> : <Archive size={16} className="mr-2" />}{showTrash ? 'Ver Activos' : 'Ver Archivo'}</button>
          {!showTrash && <button onClick={() => handleOpenModal()} className="bg-slate-900 hover:bg-brand-600 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest flex items-center shadow-xl transition-all active:scale-95 text-xs"><Plus size={18} className="mr-2" /> Agregar</button>}
        </div>
      </div>

      <div className="mb-8 relative group print:hidden">
        <Search className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-brand-500" size={20} />
        <input type="text" placeholder="Buscar por nombre, documento o teléfono..." className="w-full pl-12 pr-4 py-4 border-none bg-white rounded-2xl focus:ring-2 focus:ring-brand-500 shadow-sm font-medium text-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map(customer => (
          <div key={customer.id} className={`bg-white p-6 rounded-[2.5rem] border transition-all relative overflow-hidden group shadow-sm hover:shadow-xl ${!customer.isActive ? 'opacity-70 grayscale' : 'border-slate-100 hover:border-brand-200'}`}>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg border-2 shadow-sm transition-all group-hover:scale-105 ${customer.isActive ? 'bg-brand-50 text-brand-600 border-brand-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                  {customer.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 uppercase text-sm leading-tight truncate max-w-[150px]">{customer.name}</h3>
                  <div className="flex items-center gap-1 mt-1 text-slate-400">
                    <Fingerprint size={12} className="text-brand-500" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">{customer.documentType}: {customer.documentNumber || 'SIN REGISTRO'}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleOpenModal(customer)} className="text-slate-400 hover:text-brand-600 p-2 transition-colors bg-slate-50 rounded-xl"><Edit2 size={18}/></button>
                <button onClick={() => toggleStatus(customer)} className={`p-2 transition-colors bg-slate-50 rounded-xl ${showTrash ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-400 hover:text-red-500'}`}>{showTrash ? <RotateCcw size={18}/> : <Trash2 size={18}/>}</button>
              </div>
            </div>

            <div className="space-y-2 mt-4 text-[11px] font-medium text-slate-600">
                <div className="flex items-center gap-3"><Phone size={14} className="text-brand-500" /><span>{customer.phone}</span></div>
                <div className="flex items-center gap-3"><Mail size={14} className="text-brand-500" /><span className="truncate">{customer.email || 'Sin correo registrado'}</span></div>
                <div className="flex items-center gap-3"><MapPin size={14} className="text-slate-300" /><span className="truncate">{customer.address || 'Sin dirección'}, {customer.city || '--'}</span></div>
                {customer.fiscalResponsibility && (
                  <div className="flex items-center gap-3"><ShieldCheck size={14} className="text-brand-500" /><span>Resp. Fiscal: {customer.fiscalResponsibility}</span></div>
                )}
            </div>

            <div className="mt-6 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                    <Star size={14} className="text-emerald-500" fill="currentColor"/>
                    <span className="text-[11px] font-black text-emerald-700 tabular-nums">{customer.points} Puntos</span>
                </div>
                <button onClick={() => handleOpenModal(customer)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${customer.isActive ? 'bg-slate-50 text-slate-500 hover:bg-slate-100' : 'bg-slate-200 text-slate-400'}`}>
                    Ver Ficha
                </button>
            </div>

            <div className={`absolute -right-8 -bottom-8 w-24 h-24 rounded-full opacity-5 pointer-events-none group-hover:scale-150 transition-transform ${customer.isActive ? 'bg-brand-600' : 'bg-slate-600'}`}></div>
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && (


          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                                  <div className="bg-slate-100 w-32 h-32 rounded-full flex items-center justify-center mb-6">
                                    <User size={48} className="text-slate-300" />
                                  </div>
                                  <h3 className="text-2xl font-black">
                                    Sin clientes
                                  </h3>
                                  <p className="text-slate-500 mt-3 max-w-xs">
                                    No existen clientes registrados
                                  </p>
                                  <button onClick={() => handleOpenModal()} className="mt-8 bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
                                    <Plus size={18} />
                                    Crear primera cliente
                                  </button>
                                </div>
        )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                  <div className="bg-brand-600 p-2.5 rounded-2xl text-white shadow-lg shadow-brand-200"><Users size={24}/></div>
                  <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">{editingId ? 'Ficha de Cliente' : 'Nuevo Cliente'}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-white p-3 rounded-2xl text-slate-400 hover:text-slate-800 shadow-sm transition-all"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nombre Completo / Razón Social</label>
                    <input required type="text" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-bold focus:ring-2 focus:ring-brand-500 outline-none uppercase text-sm" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Tipo Identificación</label>
                    <select required className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black uppercase text-xs outline-none" value={documentType} onChange={(e) => setDocumentType(e.target.value as keyof typeof Documents)}>
                      {Object.entries(Documents).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nro de Documento</label>
                    <input required type="text" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black focus:ring-2 focus:ring-brand-500 outline-none" value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Celular Principal</label>
                    <input required type="tel" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black focus:ring-2 focus:ring-brand-500 outline-none" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Correo Electrónico</label>
                    <input type="email" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-bold focus:ring-2 focus:ring-brand-500 outline-none" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                {/* aca: campos agregados birthDate y fiscalResponsibility */}
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest flex items-center gap-1"><Calendar size={12}/> Fecha de Nacimiento</label>
                    <input type="date" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-bold focus:ring-2 focus:ring-brand-500 outline-none" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest flex items-center gap-1"><ShieldCheck size={12}/> Responsabilidad Fiscal</label>
                    <select className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black uppercase text-xs outline-none" value={fiscalResponsibility} onChange={e => setFiscalResponsibility(e.target.value)}>
                        <option value="">Ninguna / No aplica</option>
                        <option value="R-99-PN">NO RESPONSABLE DE IVA</option>
                        <option value="O-48">IMPUESTO SOBRE LAS VENTAS (IVA)</option>
                        <option value="O-47">RÉGIMEN SIMPLE DE TRIBUTACIÓN</option>
                        <option value="O-05">IMPUESTO SOBRE LA RENTA</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Ciudad</label>
                    <input className="w-full bg-slate-50 border-none rounded-2xl p-5 font-bold focus:ring-2 focus:ring-brand-500 outline-none uppercase" value={city} onChange={e => setCity(e.target.value)} />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Dirección de Envío</label>
                    <input className="w-full bg-slate-50 border-none rounded-2xl p-5 font-bold focus:ring-2 focus:ring-brand-500 outline-none uppercase" value={address} onChange={e => setAddress(e.target.value)} />
                </div>
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white font-black py-6 rounded-[2.5rem] shadow-2xl shadow-slate-200 uppercase tracking-[0.2em] text-xs active:scale-95 transition-all mt-6 flex items-center justify-center gap-3">
                  <Save size={20}/> Guardar Datos de Cliente
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};