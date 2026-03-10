import React, { useState, useMemo } from 'react';
import {
  Stethoscope, Plus, X, Search, Edit2, Trash2, ChevronDown, ChevronUp,
  User, Calendar, DollarSign, Filter, FileText, Save, CalendarPlus, Clock
} from 'lucide-react';
import {
  Customer, Product,
  PatientTreatment, TreatmentSession, TreatmentStatus, SessionStatus
} from '../types';
import { useNotification } from './NotificationContext';
import { dataService } from '../services/data.service';

interface TreatmentViewProps {
  customers:         Customer[];
  products:          Product[];
  treatments:        PatientTreatment[];
  onAddTreatment:    (t: PatientTreatment) => Promise<void>;
  onUpdateTreatment: (t: PatientTreatment) => Promise<void>;
  onDeleteTreatment: (id: string) => Promise<void>;
  currentBranchId:   string;
}

const T_CFG: Record<TreatmentStatus, { label: string; bg: string; text: string; border: string }> = {
  [TreatmentStatus.PENDIENTE]:   { label: 'Pendiente',   bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  [TreatmentStatus.EN_PROGRESO]: { label: 'En Progreso', bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200'   },
  [TreatmentStatus.COMPLETADO]:  { label: 'Completado',  bg: 'bg-emerald-100',text: 'text-emerald-700',border: 'border-emerald-200'},
  [TreatmentStatus.CANCELADO]:   { label: 'Cancelado',   bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200'    },
};

const S_CFG: Record<SessionStatus, { label: string; dot: string; bg: string }> = {
  [SessionStatus.PROGRAMADA]:   { label: 'Programada',   dot: 'bg-slate-400',   bg: 'bg-slate-100'   },
  [SessionStatus.REALIZADA]:    { label: 'Realizada',    dot: 'bg-emerald-500', bg: 'bg-emerald-100' },
  [SessionStatus.CANCELADA]:    { label: 'Cancelada',    dot: 'bg-red-500',     bg: 'bg-red-100'     },
  [SessionStatus.REPROGRAMADA]: { label: 'Reprogramada', dot: 'bg-yellow-500',  bg: 'bg-yellow-100'  },
};

const newSes = (num: number): TreatmentSession => ({
  id: `ses-${Date.now()}-${num}`,
  sessionNumber: num,
  label: `Sesión ${num}`,
  status: SessionStatus.PROGRAMADA,
});

type FormData = Omit<PatientTreatment, 'id' | 'createdAt' | 'updatedAt'>;

const blank = (branchId: string): FormData => ({
  customerId: '',
  productId:  '',
  name:       '',
  doctor:     '',
  status:     TreatmentStatus.PENDIENTE,
  sessions:   [newSes(1)],
  totalCost:  0,
  notes:      '',
  branchId,
});

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

// ─── Mini-modal agendar / reagendar cita ─────────────────────────────────────
interface ScheduleModalProps {
  treatment: PatientTreatment;
  session:   TreatmentSession;
  customer:  Customer | undefined;
  branchId:  string;
  onClose:   () => void;
  onSaved:   (sesId: string, date: string, time: string) => void;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({
  treatment, session, customer, branchId, onClose, onSaved,
}) => {
  const { notify } = useNotification();
  const isRescheduling = !!session.date;

  const [date,   setDate]   = useState('');
  const [time,   setTime]   = useState('');
  const [notes,  setNotes]  = useState(session.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!date) { notify('Selecciona una fecha', 'warning'); return; }
    if (!time) { notify('Selecciona una hora',  'warning'); return; }
    if (isRescheduling && date === session.date && time === session.time) {
      notify('Debes seleccionar una fecha u hora diferente para reagendar', 'warning');
      return;
    }
    setSaving(true);
    try {
      await dataService.saveReservation({
        id:            `res-${Date.now()}-new`,
        branchId,
        customerName:  customer?.name  || 'Paciente',
        customerPhone: customer?.phone || '',
        customerEmail: customer?.email || '',
        date,
        time,
        seats:  1,
        status: 'PENDIENTE',
        notes:  `${isRescheduling ? 'REAGENDADO' : 'Tratamiento'}: ${treatment.name} · ${session.label}${notes ? ` · ${notes}` : ''}`,
      });
      onSaved(session.id, date, time);
      notify(isRescheduling ? 'Cita reagendada correctamente' : 'Cita agendada correctamente', 'success');
      onClose();
    } catch {
      notify('Error al agendar la cita', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[400] p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in duration-200 overflow-hidden">

        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className={`${isRescheduling ? 'bg-amber-500' : 'bg-teal-600'} p-2 rounded-xl text-white shadow-lg`}>
              <CalendarPlus size={18} />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tighter text-slate-800">
                {isRescheduling ? 'Reagendar Cita' : 'Agendar Cita'}
              </h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                {session.label} · {treatment.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="bg-white p-2 rounded-xl shadow-sm text-slate-400 hover:text-slate-700 transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">

          {isRescheduling && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-3">
              <Calendar size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Cita anterior</p>
                <p className="text-sm font-bold text-amber-700 mt-0.5">
                  {session.date} · {session.time}
                </p>
                <p className="text-[9px] text-amber-500 font-medium mt-0.5">
                  Selecciona una nueva fecha y hora para reagendar
                </p>
              </div>
            </div>
          )}

          {customer && (
            <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 flex items-center gap-3">
              <div className="bg-teal-600 p-2 rounded-xl text-white">
                <User size={14} />
              </div>
              <div>
                <p className="text-sm font-black text-teal-700 uppercase">{customer.name}</p>
                <p className="text-[9px] text-teal-400 font-bold mt-0.5">
                  {customer.phone}{customer.documentNumber && ` · ${customer.documentNumber}`}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest flex items-center gap-1">
                <Calendar size={10} /> {isRescheduling ? 'Nueva Fecha *' : 'Fecha *'}
              </label>
              <input
                type="date"
                min={isRescheduling && session.date
                    ? (() => {
                        const d = new Date(session.date);
                        d.setDate(d.getDate() + 1);
                        return d.toISOString().split('T')[0];
                        })()
                    : new Date().toISOString().split('T')[0]
                }
                className="w-full bg-slate-50 rounded-2xl p-3 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-teal-500"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest flex items-center gap-1">
                <Clock size={10} /> {isRescheduling ? 'Nueva Hora *' : 'Hora *'}
              </label>
              <input
                type="time"
                className="w-full bg-slate-50 rounded-2xl p-3 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-teal-500"
                value={time}
                onChange={e => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-3 flex items-center gap-2">
            <Stethoscope size={14} className="text-slate-400 shrink-0" />
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Profesional</p>
              <p className="text-sm font-bold text-slate-700">{treatment.doctor}</p>
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest flex items-center gap-1">
              <FileText size={10} /> {isRescheduling ? 'Motivo del reagendamiento' : 'Notas adicionales'}
            </label>
            <textarea
              rows={2}
              className="w-full bg-slate-50 border-none rounded-2xl p-3 font-medium text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={isRescheduling ? 'Ej: Paciente solicitó cambio de horario...' : 'Indicaciones especiales...'}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 text-slate-600 font-black py-4 rounded-[2rem] uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`flex-2 flex-grow-[2] ${isRescheduling ? 'bg-amber-500 hover:bg-amber-600' : 'bg-teal-600 hover:bg-teal-700'} text-white font-black py-4 rounded-[2rem] shadow-lg uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 disabled:opacity-60`}
            >
              <CalendarPlus size={14} />
              {saving ? 'Guardando...' : isRescheduling ? 'Confirmar Reagendamiento' : 'Confirmar Cita'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
export const TreatmentView: React.FC<TreatmentViewProps> = ({
  customers, products, treatments,
  onAddTreatment, onUpdateTreatment, onDeleteTreatment,
  currentBranchId,
}) => {
  const { notify, confirm } = useNotification();

  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState<TreatmentStatus | 'TODOS'>('TODOS');
  const [expandedId,   setExpandedId]   = useState<string | null>(null);
  const [isOpen,       setIsOpen]       = useState(false);
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [form,         setForm]         = useState<FormData>(blank(currentBranchId));
  const [custSearch,   setCustSearch]   = useState('');
  const [showDrop,     setShowDrop]     = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [scheduleTarget, setScheduleTarget] = useState<{
    treatment: PatientTreatment;
    session:   TreatmentSession;
  } | null>(null);

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

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const displayed = useMemo(() => {
    const q = search.toLowerCase();
    return treatments.filter(t => {
      const cust = customers.find(c => c.id === t.customerId);
      const matchSearch =
        t.name?.toLowerCase().includes(q) ||
        t.doctor.toLowerCase().includes(q) ||
        cust?.name.toLowerCase().includes(q);
      const matchStatus = filterStatus === 'TODOS' || t.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [treatments, customers, search, filterStatus]);

  const stats = useMemo(() => ({
    total:      treatments.length,
    progreso:   treatments.filter(t => t.status === TreatmentStatus.EN_PROGRESO).length,
    completado: treatments.filter(t => t.status === TreatmentStatus.COMPLETADO).length,
    pendiente:  treatments.filter(t => t.status === TreatmentStatus.PENDIENTE).length,
  }), [treatments]);

  const openNew = () => {
    setEditingId(null);
    setForm(blank(currentBranchId));
    setCustSearch('');
    setSelectedCustomerId('');
    setShowDrop(false);
    setIsOpen(true);
  };

  const openEdit = (t: PatientTreatment) => {
    setEditingId(t.id);
    setForm({
      customerId: t.customerId,
      productId:  t.productId || '',
      name:       t.name || '',
      doctor:     t.doctor,
      status:     t.status,
      sessions:   t.sessions,
      totalCost:  t.totalCost || 0,
      notes:      t.notes || '',
      branchId:   t.branchId,
    });
    setSelectedCustomerId(t.customerId);
    setCustSearch(customers.find(c => c.id === t.customerId)?.name || '');
    setShowDrop(false);
    setIsOpen(true);
  };

  const selectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setForm(prev => ({ ...prev, customerId: c.id }));
    setCustSearch(c.name);
    setShowDrop(false);
  };

  const clearCustomer = () => {
    setSelectedCustomerId('');
    setForm(prev => ({ ...prev, customerId: '' }));
    setCustSearch('');
    setShowDrop(false);
  };

  const setField = (field: keyof FormData, val: any) =>
    setForm(f => ({ ...f, [field]: val }));

  const handleProductSelect = (productId: string) => {
    const p = products.find(pr => pr.id === productId);
    setForm(f => ({
      ...f,
      productId,
      name:      p ? p.name : f.name,
      totalCost: p ? p.price : f.totalCost,
    }));
  };

  const addSes    = () => setField('sessions', [...form.sessions, newSes(form.sessions.length + 1)]);
  const removeSes = (i: number) => setField('sessions', form.sessions.filter((_, idx) => idx !== i));
  const updateSes = (i: number, field: keyof TreatmentSession, val: any) => {
    const arr = [...form.sessions];
    arr[i] = { ...arr[i], [field]: val };
    setField('sessions', arr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId)  { notify('Selecciona un paciente', 'warning'); return; }
    if (!form.name.trim())    { notify('Ingresa el nombre del tratamiento', 'warning'); return; }
    if (!form.doctor.trim())  { notify('Ingresa el profesional responsable', 'warning'); return; }

    const payload: FormData = { ...form, customerId: selectedCustomerId };
    setSaving(true);
    const now = new Date().toISOString();
    try {
      if (editingId) {
        await onUpdateTreatment({ ...payload, id: editingId, createdAt: now, updatedAt: now });
        notify('Tratamiento actualizado', 'success');
      } else {
        await onAddTreatment({ ...payload, id: `trx-${Date.now()}`, createdAt: now, updatedAt: now });
        notify('Tratamiento asignado', 'success');
      }
      setIsOpen(false);
    } catch (err) {
      notify('Error al guardar el tratamiento', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleScheduleSaved = async (sesId: string, date: string, time: string) => {
    if (!scheduleTarget) return;
    const t = scheduleTarget.treatment;
    const updatedSessions = t.sessions.map(s =>
      s.id === sesId ? { ...s, date, time, status: SessionStatus.REPROGRAMADA } : s
    );
    const now = new Date().toISOString();
    try {
      await onUpdateTreatment({ ...t, sessions: updatedSessions, updatedAt: now });
    } catch {
      // reservación ya creada, error secundario
    }
  };

  const getProgress = (t: PatientTreatment) => {
    if (!t.sessions.length) return 0;
    return Math.round((t.sessions.filter(s => s.status === SessionStatus.REALIZADA).length / t.sessions.length) * 100);
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-slate-50 pb-24">

      {/* HEADER */}
      <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-start gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
            <Stethoscope className="text-teal-600" size={32} />
            Tratamientos
          </h2>
          <p className="text-slate-500 font-medium text-xs tracking-widest mt-1">
            Gestión de tratamientos asignados a pacientes
          </p>
        </div>
        <button
          onClick={openNew}
          className="bg-slate-900 text-white px-8 py-3.5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-xl hover:bg-teal-600 transition-all active:scale-95 shrink-0"
        >
          <Plus size={16} /> Nuevo Tratamiento
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total',       val: stats.total      },
          { label: 'En Progreso', val: stats.progreso   },
          { label: 'Completados', val: stats.completado },
          { label: 'Pendientes',  val: stats.pendiente  },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 text-white rounded-[2rem] p-5 shadow-sm">
            <p className="text-3xl font-black leading-none">{s.val}</p>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* FILTROS */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por paciente, tratamiento o doctor..."
            className="w-full pl-11 pr-4 py-3.5 bg-white border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-teal-500 font-medium text-sm outline-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-3.5 text-slate-400" size={16} />
          <select
            className="pl-9 pr-6 py-3.5 bg-white border-none rounded-2xl shadow-sm font-black text-[10px] uppercase tracking-widest outline-none appearance-none cursor-pointer"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
          >
            <option value="TODOS">Todos los estados</option>
            {Object.values(TreatmentStatus).map(s => (
              <option key={s} value={s}>{T_CFG[s].label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* LISTA */}
      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[45vh] text-center opacity-40">
          <Stethoscope size={64} className="text-slate-300 mb-4" />
          <h3 className="text-xl font-black text-slate-400 uppercase">Sin tratamientos</h3>
          <p className="text-slate-400 text-sm mt-2 font-medium">
            {search || filterStatus !== 'TODOS'
              ? 'Sin resultados para los filtros aplicados'
              : 'Crea el primer tratamiento con el botón de arriba'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(t => {
            const cust    = customers.find(c => c.id === t.customerId);
            const cfg     = T_CFG[t.status];
            const prog    = getProgress(t);
            const done    = t.sessions.filter(s => s.status === SessionStatus.REALIZADA).length;
            const isExp   = expandedId === t.id;
            const nextSes = t.sessions.find(s => s.status === SessionStatus.PROGRAMADA && s.date);

            return (
              <div key={t.id} className={`bg-white rounded-[2rem] border shadow-sm overflow-hidden transition-all ${cfg.border}`}>
                <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-black text-slate-800 uppercase text-sm leading-tight">{t.name || '—'}</h4>
                      <span className={`${cfg.bg} ${cfg.text} text-[8px] font-black uppercase px-2 py-0.5 rounded-full`}>{cfg.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                      <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                        <User size={10} />{cust?.name || 'Paciente no encontrado'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                        <Stethoscope size={10} />{t.doctor}
                      </span>
                      {!!t.totalCost && (
                        <span className="text-[10px] text-teal-600 font-black flex items-center gap-1">
                          <DollarSign size={10} />{formatCOP(t.totalCost)}
                        </span>
                      )}
                    </div>
                    {nextSes && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <Calendar size={10} className="text-teal-500" />
                        <span className="text-[9px] font-bold text-teal-600">
                          Próxima: {nextSes.date} {nextSes.time && `· ${nextSes.time}`}
                        </span>
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-teal-500 h-1.5 rounded-full transition-all duration-700" style={{ width: `${prog}%` }} />
                      </div>
                      <span className="text-[9px] font-black text-slate-400 shrink-0 tabular-nums">
                        {done}/{t.sessions.length} · {prog}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => openEdit(t)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all" title="Editar">
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={async () => {
                        const ok = await confirm({
                          title: '¿Eliminar tratamiento?',
                          message: `Se eliminará "${t.name || 'este tratamiento'}" y todas sus sesiones. Esta acción no se puede deshacer.`,
                          type: 'danger',
                          confirmText: 'Sí, eliminar',
                          cancelText: 'Cancelar',
                        });
                        if (ok) await onDeleteTreatment(t.id);
                      }}
                      className="p-2.5 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="Eliminar"
                    >
                      <Trash2 size={15} />
                    </button>
                    <button onClick={() => setExpandedId(isExp ? null : t.id)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-slate-700 rounded-xl transition-all">
                      {isExp ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>

                {isExp && (
                  <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/60 space-y-2 animate-in slide-in-from-top-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Calendar size={11} /> Sesiones del tratamiento
                    </p>
                    {t.sessions.length === 0 ? (
                      <p className="text-xs text-slate-400 font-medium text-center py-4">Sin sesiones registradas.</p>
                    ) : (
                      <div className="space-y-2">
                        {t.sessions.map((ses, idx) => {
                          const sc = S_CFG[ses.status];
                          const canSchedule = ses.status !== SessionStatus.REALIZADA && ses.status !== SessionStatus.CANCELADA;
                          const hasDate = !!ses.date;
                          return (
                            <div key={ses.id} className="flex items-start gap-3 bg-white rounded-2xl p-3.5 border border-slate-100">
                              <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                                <div className={`w-6 h-6 ${sc.dot} rounded-full flex items-center justify-center`}>
                                  <span className="text-[8px] font-black text-white">{idx + 1}</span>
                                </div>
                                {idx < t.sessions.length - 1 && <div className="w-0.5 h-4 bg-slate-200 rounded-full" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-[10px] font-black text-slate-700 uppercase">{ses.label}</p>
                                  <span className={`${sc.bg} text-[7px] font-black uppercase px-2 py-0.5 rounded-full text-slate-600`}>{sc.label}</span>
                                </div>
                                {(ses.date || ses.time) && (
                                  <p className="text-[9px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                                    <Calendar size={8} />{ses.date} {ses.time && `· ${ses.time}`}
                                  </p>
                                )}
                                {ses.notes && <p className="text-[9px] text-slate-400 italic mt-1">{ses.notes}</p>}
                              </div>

                              {canSchedule && (
                                <button
                                  type="button"
                                  onClick={() => setScheduleTarget({ treatment: t, session: ses })}
                                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border ${
                                    hasDate
                                      ? 'bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white border-amber-200'
                                      : 'bg-teal-50 text-teal-600 hover:bg-teal-600 hover:text-white border-teal-200'
                                  }`}
                                  title={hasDate ? 'Reagendar esta sesión' : 'Agendar cita para esta sesión'}
                                >
                                  <CalendarPlus size={12} />
                                  {hasDate ? 'Reagendar' : 'Agendar'}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {t.notes && (
                      <div className="mt-3 bg-teal-50 border border-teal-100 rounded-2xl p-3">
                        <p className="text-[9px] font-black text-teal-600 uppercase mb-1 flex items-center gap-1">
                          <FileText size={9} /> Notas clínicas
                        </p>
                        <p className="text-[10px] text-slate-600">{t.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL AGENDAR / REAGENDAR */}
      {scheduleTarget && (
        <ScheduleModal
          treatment={scheduleTarget.treatment}
          session={scheduleTarget.session}
          customer={customers.find(c => c.id === scheduleTarget.treatment.customerId)}
          branchId={currentBranchId}
          onClose={() => setScheduleTarget(null)}
          onSaved={handleScheduleSaved}
        />
      )}

      {/* MODAL TRATAMIENTO */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[300] p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[92vh]">

            <div className="p-7 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-teal-600 p-2 rounded-xl text-white shadow-lg">
                  <Stethoscope size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">
                    {editingId ? 'Editar Tratamiento' : 'Asignar Tratamiento'}
                  </h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                    {editingId ? 'Modifica datos y sesiones' : 'Asigna un tratamiento a un paciente'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="bg-white p-2 rounded-xl shadow-sm text-slate-400 hover:text-slate-700 transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-7 space-y-6 overflow-y-auto custom-scrollbar">

              {/* Paciente */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <User size={13} /> Paciente *
                </h4>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between bg-teal-50 border border-teal-100 rounded-2xl p-4">
                    <div>
                      <p className="text-sm font-black text-teal-700 uppercase">{selectedCustomer.name}</p>
                      <p className="text-[9px] text-teal-400 font-bold mt-0.5">
                        {selectedCustomer.phone}{selectedCustomer.documentNumber && ` · ${selectedCustomer.documentNumber}`}
                      </p>
                    </div>
                    <button type="button" onClick={clearCustomer} className="text-red-400 hover:text-red-600 p-1.5 rounded-xl hover:bg-red-50 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-3.5 text-slate-400" size={16} />
                    <input
                      type="text"
                      autoComplete="off"
                      placeholder="Buscar por nombre, documento o teléfono..."
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500"
                      value={custSearch}
                      onChange={e => { setCustSearch(e.target.value); setShowDrop(true); }}
                      onFocus={() => setShowDrop(true)}
                      onBlur={() => setTimeout(() => setShowDrop(false), 200)}
                    />
                    {showDrop && filteredCusts.length > 0 && (
                      <div className="absolute top-full left-0 w-full bg-white shadow-2xl rounded-2xl mt-1 border border-slate-100 overflow-hidden z-50">
                        {filteredCusts.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => selectCustomer(c)}
                            className="w-full p-3.5 text-left hover:bg-teal-50 border-b border-slate-50 last:border-0 transition-all"
                          >
                            <p className="text-[11px] font-black text-slate-800 uppercase">{c.name}</p>
                            <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                              {c.phone}{c.documentNumber && ` · ${c.documentNumber}`}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Datos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Desde catálogo (opcional)</label>
                  <select className="w-full bg-slate-50 border-none rounded-2xl p-3.5 font-bold text-[11px] uppercase outline-none focus:ring-2 focus:ring-teal-500" value={form.productId || ''} onChange={e => handleProductSelect(e.target.value)}>
                    <option value="">Seleccionar del catálogo...</option>
                    {products.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Estado</label>
                  <select className="w-full bg-slate-900 text-white border-none rounded-2xl p-3.5 font-black text-[11px] uppercase outline-none" value={form.status} onChange={e => setField('status', e.target.value as TreatmentStatus)}>
                    {Object.values(TreatmentStatus).map(s => <option key={s} value={s}>{T_CFG[s].label}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nombre del Tratamiento *</label>
                  <input required type="text" className="w-full bg-slate-50 border-none rounded-2xl p-3.5 font-bold text-sm uppercase outline-none focus:ring-2 focus:ring-teal-500" value={form.name} onChange={e => setField('name', e.target.value.toUpperCase())} placeholder="Ej: ORTODONCIA COMPLETA" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Profesional / Doctor *</label>
                  <input required type="text" className="w-full bg-slate-50 border-none rounded-2xl p-3.5 font-bold text-sm outline-none focus:ring-2 focus:ring-teal-500" value={form.doctor} onChange={e => setField('doctor', e.target.value)} placeholder="Nombre del profesional" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Costo Total ($)</label>
                  <input type="number" min="0" className="w-full bg-slate-50 border-none rounded-2xl p-3.5 font-black text-sm outline-none focus:ring-2 focus:ring-teal-500" value={form.totalCost || ''} onChange={e => setField('totalCost', parseFloat(e.target.value) || 0)} placeholder="0" />
                </div>
              </div>

              {/* Sesiones */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={13} /> Sesiones ({form.sessions.length})
                  </h4>
                  <button type="button" onClick={addSes} className="bg-teal-600 text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5 hover:bg-teal-700 transition-all">
                    <Plus size={12} /> Agregar sesión
                  </button>
                </div>
                <div className="space-y-3">
                  {form.sessions.map((ses, idx) => (
                    <div key={ses.id} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-teal-600 uppercase tracking-widest">Sesión {ses.sessionNumber}</span>
                        {form.sessions.length > 1 && (
                          <button type="button" onClick={() => removeSes(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Etiqueta</label>
                          <input type="text" className="w-full bg-slate-50 rounded-xl p-2.5 text-[11px] font-bold uppercase border-none outline-none" value={ses.label} onChange={e => updateSes(idx, 'label', e.target.value)} placeholder="Ej: Limpieza inicial" />
                        </div>
                        <div>
                          <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Estado</label>
                          <select className="w-full bg-slate-50 rounded-xl p-2.5 text-[11px] font-black uppercase border-none outline-none" value={ses.status} onChange={e => updateSes(idx, 'status', e.target.value as SessionStatus)}>
                            {Object.values(SessionStatus).map(s => <option key={s} value={s}>{S_CFG[s].label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Fecha</label>
                          <input type="date" className="w-full bg-slate-50 rounded-xl p-2.5 text-[11px] font-bold border-none outline-none" value={ses.date || ''} onChange={e => updateSes(idx, 'date', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Hora</label>
                          <input type="time" className="w-full bg-slate-50 rounded-xl p-2.5 text-[11px] font-bold border-none outline-none" value={ses.time || ''} onChange={e => updateSes(idx, 'time', e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Notas de sesión</label>
                        <input type="text" className="w-full bg-slate-50 rounded-xl p-2.5 text-[11px] font-medium border-none outline-none" value={ses.notes || ''} onChange={e => updateSes(idx, 'notes', e.target.value)} placeholder="Observaciones..." />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notas clínicas */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest flex items-center gap-2">
                  <FileText size={12} /> Notas Clínicas
                </label>
                <textarea rows={3} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-medium text-sm outline-none focus:ring-2 focus:ring-teal-500" value={form.notes || ''} onChange={e => setField('notes', e.target.value)} placeholder="Observaciones generales del tratamiento..." />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] shadow-xl uppercase tracking-widest text-xs active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                {saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Asignar Tratamiento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};