
import React, { useState } from 'react';
import { Branch, ReservationStatus } from '../types';
import { CalendarPlus2, Calendar, Clock, Users, Send, CheckCircle2, Phone, User, MessageSquare } from 'lucide-react';
import { dataService } from '../services/data.service';

interface PublicReservationProps {
  branch: Branch;
}

export const PublicReservation: React.FC<PublicReservationProps> = ({ branch }) => {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [seats, setSeats] = useState('2');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // reserva de sillas: Objeto de envío para el API
    const reservationData = {
      id: `res-${Date.now()}`,
      branchId: branch.id,
      customerName: name,
      customerPhone: phone,
      date,
      time,
      seats: parseInt(seats),
      notes,
      status: ReservationStatus.PENDING,
      createdAt: new Date()
    };

    try {
      await dataService.saveReservation(reservationData);
      setStep('success');
    } catch (error) {
      alert("Error al procesar reserva. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 text-center max-w-md animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-emerald-100">
                <CheckCircle2 size={48} strokeWidth={3} />
            </div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-4">¡Reserva Enviada!</h1>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">Hemos recibido tu solicitud para <b>{branch.name}</b>. Te contactaremos pronto para confirmar la disponibilidad.</p>
            <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Hacer otra reserva</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
      <div className="bg-slate-900 text-white relative overflow-hidden rounded-b-[2.5rem] shadow-2xl">
         <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-brand-600/30 via-slate-900 to-slate-950 z-0"></div>
         <div className="relative z-10 px-6 pt-12 pb-10 text-center">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-xl inline-flex mb-6">
                <Calendar size={32} className="text-brand-500" />
            </div>
            <h1 className="text-2xl font-black tracking-tight leading-none text-white uppercase mb-2">Reserva tu Silla</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{branch.name}</p>
         </div>
      </div>

      <div className="px-6 -mt-6 relative z-20 max-w-lg mx-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 space-y-6">
              <div className="space-y-4">
                  <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest flex items-center gap-2"><User size={12}/> Nombre Completo</label>
                      <input required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-brand-500" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Juan Pérez" />
                  </div>
                  <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest flex items-center gap-2"><Phone size={12}/> Teléfono Móvil</label>
                      <input required type="tel" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-brand-500" value={phone} onChange={e => setPhone(e.target.value)} placeholder="300 000 0000" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest flex items-center gap-2"><Calendar size={12}/> Fecha</label>
                          <input required type="date" min={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-xs outline-none" value={date} onChange={e => setDate(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest flex items-center gap-2"><Clock size={12}/> Hora</label>
                          <input required type="time" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-xs outline-none" value={time} onChange={e => setTime(e.target.value)} />
                      </div>
                  </div>
                  <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest flex items-center gap-2"><Users size={12}/> Nro de Clientes</label>
                      <select required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-xs outline-none" value={seats} onChange={e => setSeats(e.target.value)}>
                          {[1].map(n => <option key={n} value={n}>{n} Personas</option>)}
                      </select>
                  </div>
                  <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest flex items-center gap-2"><MessageSquare size={12}/> Nota Especial (Opcional)</label>
                      <textarea className="w-full bg-slate-50 border-none rounded-2xl p-4 font-medium text-xs outline-none" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Cumpleaños, alergias, silla cerca a ventana..." />
                  </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-[10px] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Send size={16}/> Confirmar Reserva</>}
              </button>
          </form>
          
          <div className="mt-12 text-center">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Powered by OdontOS Reservations</p>
          </div>
      </div>
    </div>
  );
};