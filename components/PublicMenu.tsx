import React, { useMemo, useState } from 'react';
import { Product, Branch, ReservationStatus } from '../types';
import { CalendarPlus2, Search, MapPin, Clock, Phone, ChevronRight, Info, Calendar, X, User, Users, Send, CheckCircle2, MessageSquare } from 'lucide-react';
import { dataService } from '../services/data.service';

interface PublicMenuProps {
  products: Product[];
  branch: Branch;
}

export const PublicMenu: React.FC<PublicMenuProps> = ({ products, branch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  
  const [isReserving, setIsReserving] = useState(false);
  const [resStep, setResStep] = useState<'form' | 'success'>('form');
  const [resLoading, setResLoading] = useState(false);
  
  const [resName, setResName] = useState('');
  const [resPhone, setResPhone] = useState('');
  const [resDate, setResDate] = useState('');
  const [resTime, setResTime] = useState('');
  const [resSeats, setResSeats] = useState('2');
  const [resNotes, setResNotes] = useState('');

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP', 
      minimumFractionDigits: 0 
    }).format(val) + " COP";
  };

  // ✅ FIX: Asegurar que category sea siempre string
  const categories = useMemo(() => {
    const cats = new Set(
      products
        .filter(p => p.isActive)
        .map(p => {
          // Si es string, retornar directamente
          if (typeof p.category === 'string') {
            return p.category;
          }
          // Si es objeto, obtener la propiedad 'name'
          if (typeof p.category === 'object' && p.category !== null) {
            return p.category.name || 'Sin categoría';
          }
          // Fallback
          return 'Sin categoría';
        })
    );
    return ['Todos', ...Array.from(cats)];
}, [products]);

  // ✅ FIX: Comparar correctamente las categorías
  const filteredProducts = products.filter(p => {
    if (!p.isActive) return false;
    
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Obtener el nombre de la categoría correctamente
    let productCategoryName = 'Sin categoría';
    if (typeof p.category === 'string') {
      productCategoryName = p.category;
    } else if (typeof p.category === 'object' && p.category !== null) {
      productCategoryName = p.category.name || 'Sin categoría';
    }
    
    const matchesCategory = selectedCategory === 'Todos' || productCategoryName === selectedCategory;
    
    return matchesSearch && matchesCategory;
});

  const handleReservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResLoading(true);
    
    const reservationData = {
      id: `res-${Date.now()}`,
      branchId: branch.id,
      customerName: resName,
      customerPhone: resPhone,
      date: resDate,
      time: resTime,
      seats: parseInt(resSeats),
      notes: resNotes,
      status: ReservationStatus.PENDING,
      createdAt: new Date()
    };

    try {
      await dataService.saveReservation(reservationData);
      setResStep('success');
    } catch (error) {
      alert("Error al procesar reserva. Intente nuevamente.");
    } finally {
      setResLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10 relative">
      <div className="bg-slate-900 text-white relative overflow-hidden rounded-b-[2.5rem] shadow-2xl">
         <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-brand-600/40 via-slate-900 to-slate-950 z-0"></div>
         <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-brand-500/10 rounded-full blur-[100px]"></div>
         
         <div className="relative z-10 px-6 pt-10 pb-8">
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 shadow-xl">
                        {branch.logoUrl ? (
                            <img src={branch.logoUrl} alt="Logo" className="w-8 h-8 object-cover rounded-lg" />
                        ) : (
                            <CalendarPlus2 size={32} className="text-brand-500" />
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight leading-none text-white uppercase">{branch.name}</h1>
                        <div className="flex items-center gap-1.5 mt-2">
                             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                             <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Abierto Ahora</p>
                        </div>
                    </div>
                </div>
                <button 
                  onClick={() => setIsReserving(true)}
                  className="bg-brand-600 text-white p-3 rounded-2xl shadow-lg shadow-brand-900/40 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Calendar size={18} />
                  <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Reservar</span>
                </button>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-8">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2.5 rounded-full backdrop-blur-md shrink-0" title={branch.address}>
                    <MapPin size={14} className="text-brand-500" />
                    <span className="text-xs font-bold text-slate-300 truncate max-w-[150px]">{branch.address}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2.5 rounded-full backdrop-blur-md shrink-0" title={branch.businessHours}>
                    <Clock size={14} className="text-brand-500" />
                    <span className="text-xs font-bold text-slate-300">{branch.businessHours || 'Consultar Horario'}</span>
                </div>
            </div>

            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="text-slate-500 group-focus-within:text-brand-500 transition-colors" size={20} />
                </div>
                <input 
                  type="text" 
                  placeholder="¿Buscas algo en especial?" 
                  className="w-full pl-12 pr-4 py-4 bg-white/95 border-none rounded-2xl shadow-2xl text-slate-900 font-medium placeholder:text-slate-400 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
         </div>
      </div>

     <div className="sticky top-0 z-20 bg-slate-50/80 backdrop-blur-xl py-4 border-b border-slate-200/50">
        <div className="flex space-x-3 overflow-x-auto no-scrollbar px-6">
            {categories.map(cat => {
            return (
                <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap uppercase tracking-widest transition-all duration-300 transform ${
                    selectedCategory === cat 
                    ? 'bg-brand-600 text-white shadow-xl shadow-brand-600/30 scale-105' 
                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                }`}
                >
                {cat}
                </button>
            );
            })}
        </div>
        </div>

      <div className="px-6 mt-8 space-y-6 max-w-3xl mx-auto">
          {filteredProducts.length === 0 ? (
              <div className="text-center py-24 text-slate-400 flex flex-col items-center">
                  <Search size={48} className="mb-4 opacity-20" />
                  <p className="font-bold">No encontramos resultados</p>
                  <button onClick={() => {setSearchTerm(''); setSelectedCategory('Todos');}} className="mt-4 text-brand-600 font-bold text-sm">Ver todo el servicio</button>
              </div>
          ) : (
              filteredProducts.map(product => (
                  <div key={product.id} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden active:scale-[0.98] transition-all flex flex-col sm:flex-row animate-in slide-in-from-bottom-4 duration-500">
                      <div className="w-full sm:w-40 h-48 sm:h-auto bg-slate-100 flex-shrink-0 relative">
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          {product.isCombo && (
                              <div className="absolute top-3 left-3 bg-brand-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg uppercase tracking-widest">
                                  Combo
                              </div>
                          )}
                      </div>
                      <div className="flex-1 p-6 flex flex-col justify-between">
                          <div>
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="font-black text-xl text-slate-900 leading-tight">{product.name}</h3>
                              </div>
                              <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">
                                  {product.description || 'Una de nuestras especialidades preparadas hoy por el chef con ingredientes frescos y locales.'}
                              </p>
                          </div>
                          
                          <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-50">
                              <div className="flex flex-col">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Precio</span>
                                  <span className="text-lg font-black text-brand-600 tabular-nums">{formatCOP(product.price)}</span>
                              </div>
                              <button className="bg-slate-100 text-slate-800 p-3 rounded-2xl hover:bg-brand-600 hover:text-white transition-all flex items-center gap-2 group">
                                  <span className="text-xs font-black uppercase tracking-widest">Detalles</span>
                                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                              </button>
                          </div>
                      </div>
                  </div>
              ))
          )}
      </div>

      <button 
        onClick={() => setIsReserving(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-brand-600 text-white rounded-full shadow-2xl flex items-center justify-center z-[100] active:scale-90 transition-all sm:hidden"
      >
        <Calendar size={28} />
      </button>

      {isReserving && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
           <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => !resLoading && setIsReserving(false)}></div>
           
           <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
              <div className="bg-slate-900 p-8 text-white flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-4">
                      <div className="bg-brand-600 p-2.5 rounded-2xl text-white shadow-lg"><Calendar size={20}/></div>
                      <div>
                        <h3 className="text-xl font-black uppercase tracking-tighter">Reservar Silla</h3>
                        <p className="text-[9px] font-black text-brand-500 uppercase tracking-widest">{branch.name}</p>
                      </div>
                  </div>
                  <button onClick={() => setIsReserving(false)} className="bg-white/10 p-2 rounded-xl text-white/50 hover:text-white transition-colors"><X size={20}/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  {resStep === 'success' ? (
                      <div className="py-10 text-center animate-in zoom-in">
                          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                              <CheckCircle2 size={40} />
                          </div>
                          <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-4">¡Solicitud Enviada!</h4>
                          <p className="text-slate-500 text-sm leading-relaxed mb-8">Te contactaremos pronto para confirmar tu silla.</p>
                          <button onClick={() => { setIsReserving(false); setResStep('form'); }} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Entendido</button>
                      </div>
                  ) : (
                      <form onSubmit={handleReservationSubmit} className="space-y-6">
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest flex items-center gap-2"><User size={12}/> Nombre</label>
                              <input required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-brand-500" value={resName} onChange={e => setResName(e.target.value)} placeholder="Tu nombre..." />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest flex items-center gap-2"><Phone size={12}/> Teléfono</label>
                              <input required type="tel" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-brand-500" value={resPhone} onChange={e => setResPhone(e.target.value)} placeholder="WhatsApp o Móvil" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest flex items-center gap-2"><Calendar size={12}/> Fecha</label>
                                  <input required type="date" min={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-xs outline-none" value={resDate} onChange={e => setResDate(e.target.value)} />
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest flex items-center gap-2"><Clock size={12}/> Hora</label>
                                  <input required type="time" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-xs outline-none" value={resTime} onChange={e => setResTime(e.target.value)} />
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest flex items-center gap-2"><Users size={12}/> Clientes</label>
                                  <select required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-xs outline-none" value={resSeats} onChange={e => setResSeats(e.target.value)}>
                                      {[1].map(n => <option key={n} value={n}>{n} Pers.</option>)}
                                  </select>
                              </div>
                              <div className="flex items-end">
                                  <button 
                                    type="submit" 
                                    disabled={resLoading}
                                    className="w-full bg-brand-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                                  >
                                      {resLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Send size={14}/> Reservar</>}
                                  </button>
                              </div>
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest flex items-center gap-2"><MessageSquare size={12}/> Notas</label>
                              <textarea className="w-full bg-slate-50 border-none rounded-2xl p-4 font-medium text-xs outline-none" rows={2} value={resNotes} onChange={e => setResNotes(e.target.value)} placeholder="Opcional..." />
                          </div>
                      </form>
                  )}
              </div>
           </div>
        </div>
      )}

      <div className="mt-16 text-center px-10">
          <div className="inline-flex items-center gap-2 bg-white px-6 py-3 rounded-full border border-slate-200 shadow-sm">
               <Info size={14} className="text-slate-400" />
               <p className="text-[10px] text-slate-500 font-medium">Los precios mostrados ya incluyen impuestos aplicables.</p>
          </div>
          <p className="mt-8 text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">Powered by OdontOS Cloud</p>
      </div>
    </div>
  );
};