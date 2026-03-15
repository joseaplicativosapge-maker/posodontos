import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ClipboardList, Search, RefreshCw, User, Phone, Mail,
  Activity, FileText, CalendarDays, AlertTriangle, DollarSign,
  Clock, CheckCircle2, XCircle, RotateCcw, AlertCircle,
  ChevronDown, ChevronUp, Plus, Filter, Loader2, Save,
  Stethoscope, Calendar, ChevronRight,
} from 'lucide-react';
import {
  Customer, PatientTreatment, TreatmentSession,
  TreatmentStatus, SessionStatus,
} from '../types';
import { useBranch } from './BranchContext';
import { dataService } from '../services/data.service';
import { useNotification } from './NotificationContext';
import { CustomerDetailModal } from './CustomerDetailModal';

interface FollowViewProps {
  branchId:          string;
  currentUserName?:  string;
  onUpdateCustomer?: (c: Customer) => void;
}

const T_CFG: Record<TreatmentStatus, { label: string; bg: string; text: string; border: string }> = {
  [TreatmentStatus.PENDIENTE]:   { label: 'Pendiente',   bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  [TreatmentStatus.EN_PROGRESO]: { label: 'En Progreso', bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200'   },
  [TreatmentStatus.COMPLETADO]:  { label: 'Completado',  bg: 'bg-emerald-100',text: 'text-emerald-700',border: 'border-emerald-200' },
  [TreatmentStatus.CANCELADO]:   { label: 'Cancelado',   bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200'    },
};

const S_CFG: Record<SessionStatus, { label: string; dot: string; bg: string }> = {
  [SessionStatus.PROGRAMADA]:   { label: 'Programada',   dot: 'bg-slate-400',   bg: 'bg-slate-100'   },
  [SessionStatus.REALIZADA]:    { label: 'Realizada',    dot: 'bg-emerald-500', bg: 'bg-emerald-100' },
  [SessionStatus.CANCELADA]:    { label: 'Cancelada',    dot: 'bg-red-500',     bg: 'bg-red-100'     },
  [SessionStatus.REPROGRAMADA]: { label: 'Reprogramada', dot: 'bg-yellow-500',  bg: 'bg-yellow-100'  },
  [SessionStatus.VENCIDA]:      { label: 'Vencida',      dot: 'bg-red-700',     bg: 'bg-red-200'     },
  [SessionStatus.PAGADA]:       { label: 'Pagada',       dot: 'bg-violet-500',  bg: 'bg-violet-100'  },
};

const normalizeTreatmentStatus = (t: any): TreatmentStatus => {
  const raw: string = t?.rawStatus ?? t?.status ?? '';
  switch (raw) {
    case 'EN_PROGRESO': return TreatmentStatus.EN_PROGRESO;
    case 'COMPLETADO':  return TreatmentStatus.COMPLETADO;
    case 'CANCELADO':   return TreatmentStatus.CANCELADO;
    default:            return TreatmentStatus.PENDIENTE;
  }
};

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

const getEffectiveStatus = (ses: TreatmentSession): SessionStatus => {
  if (ses.date && ses.status !== SessionStatus.REALIZADA && ses.status !== SessionStatus.CANCELADA && ses.status !== SessionStatus.PAGADA) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(ses.date); d.setHours(0, 0, 0, 0);
    if (d < today) return SessionStatus.VENCIDA;
  }
  return ses.status;
};

const getProgress = (sessions: TreatmentSession[]): number => {
  if (!sessions.length) return 0;
  return Math.round((sessions.filter(s => s.status === SessionStatus.REALIZADA || s.status === SessionStatus.PAGADA).length / sessions.length) * 100);
};

const getAlert = (sessions: TreatmentSession[]): string | null => {
  const canceladas = sessions.filter(s => s.status === SessionStatus.CANCELADA).length;
  const vencidas   = sessions.filter(s => getEffectiveStatus(s) === SessionStatus.VENCIDA).length;
  if (canceladas >= 2) return `No se ha presentado a ${canceladas} citas. Requiere contacto urgente.`;
  if (vencidas   >= 1) return `Tiene ${vencidas} sesión(es) vencida(s) sin reprogramar.`;
  return null;
};

const pricePerSession = (totalCost: number | null | undefined, sessionCount: number) =>
  sessionCount > 0 && totalCost && totalCost > 0 ? totalCost / sessionCount : null;

const NOTE_SEP = '\n---\n';
interface ParsedNote { id: string; date: string; author: string; text: string; }

const parseNotes = (raw: string | null | undefined): ParsedNote[] => {
  if (!raw) return [];
  return raw.split(NOTE_SEP).map(block => {
    const lines = block.trim().split('\n');
    const header = lines[0] ?? '';
    const text = lines.slice(1).join('\n').trim();
    const sepIdx = header.indexOf(' · ');
    if (sepIdx === -1 || !text) return null;
    return { id: `note-${Date.now()}-${Math.random()}`, date: header.slice(0, sepIdx).trim(), author: header.slice(sepIdx + 3).trim(), text };
  }).filter(Boolean) as ParsedNote[];
};

export const FollowView: React.FC<FollowViewProps> = ({
  branchId,
  currentUserName = 'Doctor',
  onUpdateCustomer,
}) => {
  const { treatments, customers: ctxCustomers, refreshBranchData } = useBranch() as any;
  const { notify } = useNotification();

  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState<TreatmentStatus | 'TODOS'>('TODOS');
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [expandedSess, setExpandedSess] = useState(true);
  const [expandedNote, setExpandedNote] = useState(true);

  // ── Modal cliente ──────────────────────────────────────────────────────────
  const [customerModal,        setCustomerModal]        = useState<Customer | null>(null);
  const [loadingCustomerModal, setLoadingCustomerModal] = useState(false);

  /**
   * Abre el modal inmediatamente con datos parciales del contexto,
   * luego hace fetch del cliente completo (documentNumber, birthDate,
   * fiscalResponsibility, clinicalHistory, etc.) y actualiza el modal.
   *
   * IMPORTANTE: si tu endpoint no es GET /api/customers/:id, ajusta la URL aquí.
   */
  const openCustomerModal = useCallback(async (partial: Customer) => {
    setCustomerModal(partial);         // feedback visual inmediato
    setLoadingCustomerModal(true);
    try {
      const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const res = await fetch(`${API}/api/customers/${partial.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const full: Customer = await res.json();
      setCustomerModal(full);          // reemplaza con datos completos
    } catch (err) {
      console.warn('[CustomerModal] fetch cliente completo falló:', err);
      // el modal sigue abierto con datos parciales — mejor algo que nada
    } finally {
      setLoadingCustomerModal(false);
    }
  }, []);

  // ── Detalle tratamiento ────────────────────────────────────────────────────
  const [detailTreatment, setDetailTreatment] = useState<PatientTreatment | null>(null);
  const [loadingDetail,   setLoadingDetail]   = useState(false);
  const [noteText,        setNoteText]        = useState('');
  const [savingNote,      setSavingNote]      = useState(false);
  const [localNotes,      setLocalNotes]      = useState<ParsedNote[] | null>(null);
  const [updatingSessionId, setUpdatingSessionId] = useState<string | null>(null);

  const displayed = useMemo(() => {
    const q = search.toLowerCase();
    return (treatments as PatientTreatment[] ?? []).filter(t => {
      const cust = (ctxCustomers as Customer[] ?? []).find((c: Customer) => c.id === t.customerId);
      const matchSearch = t.name?.toLowerCase().includes(q) || t.doctor.toLowerCase().includes(q) || cust?.name.toLowerCase().includes(q);
      return matchSearch && (filterStatus === 'TODOS' || t.status === filterStatus);
    });
  }, [treatments, ctxCustomers, search, filterStatus]);

  const stats = useMemo(() => ({
    total:      (treatments ?? []).length,
    progreso:   (treatments ?? []).filter((t: PatientTreatment) => t.status === TreatmentStatus.EN_PROGRESO).length,
    completado: (treatments ?? []).filter((t: PatientTreatment) => t.status === TreatmentStatus.COMPLETADO).length,
    alerta:     (treatments ?? []).filter((t: PatientTreatment) => getAlert(t.sessions ?? []) !== null).length,
  }), [treatments]);

  const loadDetail = useCallback(async (treatmentId: string) => {
    setLoadingDetail(true); setLocalNotes(null);
    try {
      const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const res = await fetch(`${API}/api/follow/${treatmentId}`);
      if (!res.ok) throw new Error();
      setDetailTreatment(await res.json());
    } catch {
      const t = (treatments as PatientTreatment[] ?? []).find(t => t.id === treatmentId);
      if (t) setDetailTreatment(t);
    } finally { setLoadingDetail(false); }
  }, [treatments]);

  useEffect(() => {
    if (selectedId) { setExpandedSess(true); setExpandedNote(true); loadDetail(selectedId); }
    else setDetailTreatment(null);
  }, [selectedId]);

  const handleRefresh = async () => { await refreshBranchData(); if (selectedId) loadDetail(selectedId); };

  const handleSessionStatus = async (treatmentId: string, sessionId: string, status: 'REALIZADA' | 'CANCELADA' | 'REPROGRAMADA') => {
    setUpdatingSessionId(sessionId);
    try {
      const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const res = await fetch(`${API}/api/follow/${treatmentId}/sessions/${sessionId}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      notify(status === 'REALIZADA' ? 'Sesión marcada como realizada' : status === 'CANCELADA' ? 'Sesión cancelada' : 'Sesión marcada para reagendar', 'success');
      await refreshBranchData(); loadDetail(treatmentId);
    } catch { notify('Error al actualizar la sesión', 'error'); }
    finally { setUpdatingSessionId(null); }
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || !detailTreatment) return;
    setSavingNote(true);
    try {
      const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const res = await fetch(`${API}/api/follow/${detailTreatment.id}/notes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: currentUserName, text: noteText.trim() }),
      });
      if (!res.ok) throw new Error();
      const saved: ParsedNote = await res.json();
      setLocalNotes([saved, ...(localNotes ?? parseNotes((detailTreatment as any).notesRaw ?? detailTreatment.notes))]);
      setNoteText(''); notify('Nota clínica guardada', 'success');
    } catch { notify('Error al guardar la nota', 'error'); }
    finally { setSavingNote(false); }
  };

  const detailCustomer = detailTreatment
    ? ((detailTreatment as any).customer as Customer) ?? (ctxCustomers as Customer[] ?? []).find((c: Customer) => c.id === detailTreatment.customerId)
    : null;
  const detailNotes: ParsedNote[] = localNotes ?? parseNotes((detailTreatment as any)?.notesRaw ?? detailTreatment?.notes);
  const detailPps      = detailTreatment ? pricePerSession(detailTreatment.totalCost, detailTreatment.sessions?.length ?? 0) : null;
  const detailAlert    = detailTreatment ? getAlert(detailTreatment.sessions ?? []) : null;
  const detailNextSes  = detailTreatment?.sessions?.filter(s => s.status === SessionStatus.PROGRAMADA && s.date)?.sort((a, b) => (a.date! > b.date! ? 1 : -1))[0] ?? null;

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden pb-20 md:pb-0">

      {/* ══ PANEL IZQUIERDO ══════════════════════════════════════════════════ */}
      <div className="w-96 flex-shrink-0 flex flex-col h-full bg-white border-r border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-2xl font-black text-slate-800 tracking-tighter flex items-center gap-3 mb-1">
            <ClipboardList className="text-teal-600" size={28} /> Seguimiento
          </h2>
          <p className="text-slate-500 font-medium text-[10px] tracking-widest">Seguimiento clínico de pacientes</p>
        </div>

        <div className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-slate-100">
          {[{label:'Total',val:stats.total},{label:'Progreso',val:stats.progreso},{label:'Completado',val:stats.completado},{label:'Alertas',val:stats.alerta}].map(s => (
            <div key={s.label} className="bg-slate-900 text-white rounded-2xl p-3 text-center">
              <p className="text-xl font-black leading-none">{s.val}</p>
              <p className="text-[7px] font-black uppercase tracking-widest opacity-60 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-b border-slate-100 space-y-2">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Buscar paciente, tratamiento o doctor..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-2xl font-medium text-sm outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(['TODOS', ...Object.values(TreatmentStatus)] as const).map(s => {
              const cfg = s !== 'TODOS' ? T_CFG[s] : null;
              return (
                <button key={s} onClick={() => setFilterStatus(s as any)}
                  className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${filterStatus === s ? 'bg-slate-900 text-white' : `${cfg?.bg ?? 'bg-slate-100'} ${cfg?.text ?? 'text-slate-500'} hover:opacity-80`}`}>
                  {s === 'TODOS' ? 'Todos' : cfg!.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[40vh] text-center opacity-40">
              <ClipboardList size={52} className="text-slate-300 mb-3" />
              <p className="text-sm font-black text-slate-400 uppercase">Sin resultados</p>
            </div>
          ) : (
            displayed.map(t => {
              const cust = (ctxCustomers as Customer[] ?? []).find((c: Customer) => c.id === t.customerId);
              const cfg  = T_CFG[t.status];
              const prog = getProgress(t.sessions ?? []);
              const done = (t.sessions ?? []).filter(s => s.status === SessionStatus.REALIZADA || s.status === SessionStatus.PAGADA).length;
              const alerta    = getAlert(t.sessions ?? []);
              const next      = (t.sessions ?? []).filter(s => s.status === SessionStatus.PROGRAMADA && s.date).sort((a, b) => (a.date! > b.date! ? 1 : -1))[0];
              const isSelected = selectedId === t.id;

              return (
                <button key={t.id} onClick={() => setSelectedId(isSelected ? null : t.id)}
                  className={`w-full text-left px-4 py-4 border-b border-slate-100 transition-all ${isSelected ? 'bg-teal-50 border-l-4 border-l-teal-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-black text-slate-800 uppercase truncate">{t.name || '—'}</span>
                        <span className={`${cfg.bg} ${cfg.text} text-[7px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0`}>{cfg.label}</span>
                        {alerta && <AlertTriangle size={11} className="text-red-500 flex-shrink-0" />}
                      </div>

                      {/* ── Nombre del paciente — clic → modal completo ── */}
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5 flex items-center gap-1 hover:text-teal-600 transition-colors cursor-pointer w-fit group/name"
                        onClick={e => { e.stopPropagation(); if (cust) openCustomerModal(cust); }}
                        title="Ver ficha del paciente">
                        <User size={9} />
                        {cust?.name ?? 'Paciente no encontrado'}
                        {cust && <ChevronRight size={8} className="opacity-0 group-hover/name:opacity-100 transition-opacity" />}
                      </p>

                      <p className="text-[9px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                        <Stethoscope size={8} /> {t.doctor}
                      </p>
                    </div>
                    {t.totalCost ? (
                      <span className="text-[9px] font-black text-teal-600 flex-shrink-0 flex items-center gap-0.5">
                        <DollarSign size={9} />{formatCOP(t.totalCost)}
                      </span>
                    ) : null}
                  </div>
                  {next && (
                    <p className="text-[8px] font-bold text-teal-600 flex items-center gap-1 mb-1.5">
                      <CalendarDays size={8} /> Próxima: {next.date}{next.time ? ` · ${next.time}` : ''}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-teal-500 h-1.5 rounded-full transition-all duration-700" style={{ width: `${prog}%` }} />
                    </div>
                    <span className="text-[8px] font-black text-slate-400 shrink-0 tabular-nums">{done}/{(t.sessions ?? []).length} · {prog}%</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="p-3 border-t border-slate-100">
          <button onClick={handleRefresh} className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-teal-50 hover:text-teal-600 text-slate-500 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all">
            <RefreshCw size={13} /> Actualizar
          </button>
        </div>
      </div>

      {/* ══ PANEL DERECHO ════════════════════════════════════════════════════ */}
      <div className="flex-1 h-full overflow-y-auto">
        {!selectedId && (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-40 gap-4">
            <ClipboardList size={72} className="text-slate-300" />
            <h3 className="text-xl font-black text-slate-400 uppercase">Selecciona un paciente</h3>
            <p className="text-slate-400 text-sm font-medium">Elige un tratamiento de la lista para ver su seguimiento</p>
          </div>
        )}
        {selectedId && loadingDetail && (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={32} className="animate-spin text-teal-500" />
          </div>
        )}
        {selectedId && !loadingDetail && detailTreatment && (() => {
          const tStatus = normalizeTreatmentStatus(detailTreatment);
          const tCfg    = T_CFG[tStatus];
          return (
            <div className="p-6 md:p-8 space-y-5 max-w-3xl">
              <div className={`bg-white rounded-[2rem] border shadow-sm overflow-hidden ${tCfg.border}`}>
                <div className="p-6">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-xl font-black text-slate-800 uppercase leading-tight">{detailTreatment.name}</h3>
                        <span className={`${tCfg.bg} ${tCfg.text} text-[8px] font-black uppercase px-2 py-0.5 rounded-full`}>{tCfg.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                        <Stethoscope size={10} /> Dr(a). {detailTreatment.doctor}
                      </p>
                    </div>
                  </div>

                  {/* Tarjeta paciente — clic → openCustomerModal */}
                  {detailCustomer && (
                    <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 mb-4 flex items-center gap-3 cursor-pointer hover:bg-teal-100 hover:border-teal-200 transition-all group"
                      onClick={() => openCustomerModal(detailCustomer)}
                      title="Clic para ver ficha completa del paciente">
                      <div className="bg-teal-600 p-2 rounded-xl text-white flex-shrink-0"><User size={16} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-teal-700 uppercase">{detailCustomer.name}</p>
                        <div className="flex flex-wrap gap-3 mt-0.5">
                          {detailCustomer.phone && <span className="text-[9px] text-teal-500 font-bold flex items-center gap-1"><Phone size={9} />{detailCustomer.phone}</span>}
                          {detailCustomer.email && <span className="text-[9px] text-teal-500 font-bold flex items-center gap-1"><Mail size={9} />{detailCustomer.email}</span>}
                          {(detailCustomer as any).documentNumber && <span className="text-[9px] text-teal-400 font-bold">Doc: {(detailCustomer as any).documentNumber}</span>}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-teal-400 group-hover:text-teal-600 transition-colors"><ChevronRight size={14} /></div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="bg-slate-50 rounded-2xl p-3">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sesiones</p>
                      <p className="text-lg font-black text-slate-700 mt-0.5">
                        {(detailTreatment.sessions ?? []).filter(s => s.status === SessionStatus.REALIZADA || s.status === SessionStatus.PAGADA).length}
                        <span className="text-slate-400">/{(detailTreatment.sessions ?? []).length}</span>
                      </p>
                    </div>
                    {detailTreatment.totalCost != null && (
                      <div className="bg-slate-50 rounded-2xl p-3">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Costo total</p>
                        <p className="text-sm font-black text-teal-600 mt-0.5">{formatCOP(detailTreatment.totalCost)}</p>
                      </div>
                    )}
                    {detailPps != null && (
                      <div className="bg-slate-50 rounded-2xl p-3">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Por sesión</p>
                        <p className="text-sm font-black text-slate-600 mt-0.5">{formatCOP(detailPps)}</p>
                      </div>
                    )}
                    {detailNextSes && (
                      <div className="bg-teal-50 border border-teal-100 rounded-2xl p-3">
                        <p className="text-[8px] font-black text-teal-500 uppercase tracking-widest">Próxima cita</p>
                        <p className="text-[10px] font-black text-teal-700 mt-0.5">{detailNextSes.date}{detailNextSes.time ? ` · ${detailNextSes.time}` : ''}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden mb-1.5">
                      <div className="bg-teal-500 h-2 rounded-full transition-all duration-700" style={{ width: `${getProgress(detailTreatment.sessions ?? [])}%` }} />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Avance del tratamiento</span>
                      <span className="text-[9px] font-black text-teal-600">{getProgress(detailTreatment.sessions ?? [])}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {detailAlert && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-[2rem] p-5">
                  <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Alerta clínica</p>
                    <p className="text-[11px] text-red-700 font-bold leading-relaxed">{detailAlert}</p>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <button onClick={() => setExpandedSess(v => !v)} className="w-full flex items-center justify-between px-6 py-5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Activity size={15} className="text-teal-600" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sesiones del tratamiento</span>
                    {detailPps != null && (
                      <span className="flex items-center gap-1 bg-teal-50 border border-teal-100 text-teal-600 text-[9px] font-black px-2.5 py-1 rounded-full">
                        <DollarSign size={9} />{formatCOP(detailPps)} / sesión
                      </span>
                    )}
                  </div>
                  {expandedSess ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                </button>
                {expandedSess && (
                  <div className="border-t border-slate-100 px-5 py-4 space-y-2 bg-slate-50/60">
                    {(detailTreatment.sessions ?? []).length === 0 ? (
                      <p className="text-xs text-slate-400 font-medium text-center py-4">Sin sesiones registradas.</p>
                    ) : (
                      (detailTreatment.sessions ?? []).map((ses, idx) => {
                        const effectiveStatus = getEffectiveStatus(ses);
                        const sc    = S_CFG[effectiveStatus];
                        const isUpd = updatingSessionId === ses.id;
                        const canDone       = !['REALIZADA','CANCELADA','PAGADA'].includes(ses.status);
                        const canCancel     = !['REALIZADA','CANCELADA','PAGADA'].includes(ses.status);
                        const canReschedule = effectiveStatus === SessionStatus.VENCIDA || ses.status === SessionStatus.REPROGRAMADA;
                        return (
                          <div key={ses.id} className="flex items-start gap-3 bg-white rounded-2xl p-3.5 border border-slate-100">
                            <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                              <div className={`w-6 h-6 ${sc.dot} rounded-full flex items-center justify-center`}>
                                <span className="text-[8px] font-black text-white">{idx + 1}</span>
                              </div>
                              {idx < (detailTreatment.sessions ?? []).length - 1 && <div className="w-0.5 h-4 bg-slate-200 rounded-full" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-[10px] font-black text-slate-700 uppercase">{ses.label}</p>
                                <span className={`${sc.bg} text-[7px] font-black uppercase px-2 py-0.5 rounded-full text-slate-600`}>{sc.label}</span>
                              </div>
                              {(ses.date || ses.time) && (
                                <p className="text-[9px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                                  <Calendar size={8} />{ses.date}{ses.time ? ` · ${ses.time}` : ''}
                                </p>
                              )}
                              {detailPps != null && <p className="text-[9px] font-black text-teal-500 mt-0.5 flex items-center gap-1"><DollarSign size={8} />{formatCOP(detailPps)}</p>}
                              {ses.notes && <p className="text-[9px] text-slate-400 italic mt-1">{ses.notes}</p>}
                              <div className="flex gap-1.5 mt-2 flex-wrap">
                                {canDone && <button disabled={isUpd} onClick={() => handleSessionStatus(detailTreatment.id, ses.id, 'REALIZADA')} className="flex items-center gap-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-200 px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-50"><CheckCircle2 size={10} />{isUpd ? '...' : 'Realizada'}</button>}
                                {canCancel && <button disabled={isUpd} onClick={() => handleSessionStatus(detailTreatment.id, ses.id, 'CANCELADA')} className="flex items-center gap-1 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-200 px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-50"><XCircle size={10} /> Cancelar</button>}
                                {canReschedule && <button disabled={isUpd} onClick={() => handleSessionStatus(detailTreatment.id, ses.id, 'REPROGRAMADA')} className="flex items-center gap-1 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-200 px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-50"><RotateCcw size={10} /> Reagendar</button>}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <button onClick={() => setExpandedNote(v => !v)} className="w-full flex items-center justify-between px-6 py-5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText size={15} className="text-teal-600" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Notas clínicas</span>
                    {detailNotes.length > 0 && <span className="bg-slate-100 text-slate-500 text-[8px] font-black px-1.5 py-0.5 rounded-full">{detailNotes.length}</span>}
                  </div>
                  {expandedNote ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                </button>
                {expandedNote && (
                  <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/60 space-y-3">
                    <div>
                      <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Escribe una nota clínica..." rows={2}
                        className="w-full bg-white border-none rounded-2xl p-3 font-medium text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none shadow-sm" />
                      <div className="flex justify-end mt-1.5">
                        <button onClick={handleAddNote} disabled={savingNote || !noteText.trim()}
                          className="flex items-center gap-1.5 bg-teal-600 text-white text-[9px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl hover:bg-teal-700 transition-all disabled:opacity-50">
                          {savingNote ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Guardar nota
                        </button>
                      </div>
                    </div>
                    {detailNotes.length === 0 ? (
                      <p className="text-[11px] text-slate-400 font-medium text-center py-2">Sin notas clínicas</p>
                    ) : (
                      detailNotes.map(note => (
                        <div key={note.id} className="bg-teal-50 border border-teal-100 rounded-2xl p-3.5">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-black text-teal-700 uppercase flex items-center gap-1"><FileText size={9} /> {note.author}</span>
                            <span className="text-[8px] text-teal-400 font-bold">{note.date}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">{note.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ══ MODAL CLIENTE ════════════════════════════════════════════════════ */}
      {customerModal && (
        <CustomerDetailModal
          customer={customerModal}
          loading={loadingCustomerModal}
          onClose={() => { setCustomerModal(null); setLoadingCustomerModal(false); }}
          onUpdateCustomer={updated => {
            onUpdateCustomer?.(updated);
            setCustomerModal(updated);
          }}
        />
      )}
    </div>
  );
};

export default FollowView;