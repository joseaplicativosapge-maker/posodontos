import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';

import {
  ClipboardList, Search, RefreshCw, User, Phone, Mail,
  Activity, FileText, CalendarDays, AlertTriangle, DollarSign,
  Clock, CheckCircle2, XCircle, RotateCcw, AlertCircle,
  ChevronDown, ChevronUp, Plus, Filter, Loader2, Save,
  Stethoscope, Calendar, ChevronRight, Camera, Trash2,
  ImagePlus, ZoomIn, X as XIcon, BookOpen,
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

// ─── Foto de seguimiento ──────────────────────────────────────────────────────
interface TrackingPhoto {
  id:     string;
  date:   string;   // ISO
  label:  string;
  base64: string;   // data:image/...;base64,...
  author: string;
}

// ─── Tracking por sesión ──────────────────────────────────────────────────────
interface SessionTracking {
  odontograma: Record<number, Record<string, string>>;
  photos:      TrackingPhoto[];
  notes:       string;
  updatedAt?:  string;
  updatedBy?:  string;
}

const EMPTY_TRACKING = (): SessionTracking => ({
  odontograma: {},
  photos:      [],
  notes:       '',
});

// ─── Configuraciones de estado ────────────────────────────────────────────────
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

// ─── Odontograma ──────────────────────────────────────────────────────────────
const OD_CONDITIONS: Record<string, { color: string; stroke: string; label: string }> = {
  '':           { color: '#f1f5f9', stroke: '#cbd5e1', label: '#94a3b8' },
  'Sano':       { color: '#bbf7d0', stroke: '#22c55e', label: '#14532d' },
  'Caries':     { color: '#fca5a5', stroke: '#ef4444', label: '#7f1d1d' },
  'Obturado':   { color: '#93c5fd', stroke: '#3b82f6', label: '#1e3a8a' },
  'Corona':     { color: '#d8b4fe', stroke: '#9333ea', label: '#4c1d95' },
  'Endodoncia': { color: '#f9a8d4', stroke: '#ec4899', label: '#831843' },
  'Fractura':   { color: '#fde68a', stroke: '#eab308', label: '#713f12' },
  'Desgaste':   { color: '#fed7aa', stroke: '#f97316', label: '#7c2d12' },
};
const OD_GLOBAL: Record<string, { color: string; stroke: string; label: string }> = {
  'Ausente':    { color: '#e2e8f0', stroke: '#94a3b8', label: '#334155' },
  'Extracción': { color: '#fecaca', stroke: '#dc2626', label: '#7f1d1d' },
  'Implante':   { color: '#bfdbfe', stroke: '#3b82f6', label: '#1e3a8a' },
};
const OD_FACES = ['O','V','L','M','D'];
const OD_FACE_LABELS: Record<string, string> = {
  O:'Oclusal/Incisal', V:'Vestibular', L:'Lingual/Palatino', M:'Mesial', D:'Distal'
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
    const lines  = block.trim().split('\n');
    const header = lines[0] ?? '';
    const text   = lines.slice(1).join('\n').trim();
    const sepIdx = header.indexOf(' · ');
    if (sepIdx === -1 || !text) return null;
    return { id: `note-${Date.now()}-${Math.random()}`, date: header.slice(0, sepIdx).trim(), author: header.slice(sepIdx + 3).trim(), text };
  }).filter(Boolean) as ParsedNote[];
};

// ─── Odontograma Component ────────────────────────────────────────────────────
interface TrackingOdontogramProps {
  odontograma:    Record<number, Record<string, string>>;
  setOdontograma: (fn: (prev: Record<number, Record<string, string>>) => Record<number, Record<string, string>>) => void;
}

const TrackingOdontogram: React.FC<TrackingOdontogramProps> = ({ odontograma, setOdontograma }) => {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [selectedFace,  setSelectedFace]  = useState<string | null>(null);

  const getGlobalStatus = (n: number) => odontograma[n]?.['GLOBAL'] || '';
  const getFaceColor    = (n: number, f: string) => { const g = getGlobalStatus(n); if (g) return OD_GLOBAL[g]?.color || '#e2e8f0'; return OD_CONDITIONS[odontograma[n]?.[f] || '']?.color || OD_CONDITIONS[''].color; };
  const getFaceStroke   = (n: number, f: string) => { const g = getGlobalStatus(n); if (g) return OD_GLOBAL[g]?.stroke || '#94a3b8'; return OD_CONDITIONS[odontograma[n]?.[f] || '']?.stroke || OD_CONDITIONS[''].stroke; };
  const hasAny          = (n: number) => { const t = odontograma[n]; if (!t) return false; return Object.values(t).some(v => !!v); };
  const setFaceCond     = (n: number, f: string, c: string) => setOdontograma(prev => ({ ...prev, [n]: { ...(prev[n] || {}), [f]: c } }));
  const setGlobal       = (n: number, c: string) => setOdontograma(prev => ({ ...prev, [n]: { ...(prev[n] || {}), GLOBAL: c } }));
  const clearTooth      = (n: number) => setOdontograma(prev => { const nw = { ...prev }; delete nw[n]; return nw; });

  const Tooth = ({ num, isUpper }: { num: number; isUpper: boolean }) => {
    const isSel  = selectedTooth === num;
    const gs     = getGlobalStatus(num);
    const isAbs  = gs === 'Ausente' || gs === 'Extracción';
    const isImp  = gs === 'Implante';
    const isMol  = [16,17,18,26,27,28,36,37,38,46,47,48].includes(num);
    const S = isMol ? 46 : 36; const C = S/2; const ih = S*0.175; const ci = C-ih; const isz = ih*2; const bg = 2;
    const tf = isUpper ? 'V' : 'L'; const bf = isUpper ? 'L' : 'V';
    const cO=getFaceColor(num,'O'),cT=getFaceColor(num,tf),cB=getFaceColor(num,bf),cM=getFaceColor(num,'M'),cD=getFaceColor(num,'D'),sO=getFaceStroke(num,'O');
    const hl = '#0d9488'; const hd = hasAny(num);
    const bc = isSel ? hl : hd ? '#475569' : '#cbd5e1'; const bw = isSel ? 2 : 1;
    return (
      <div className={`flex flex-col items-center gap-0.5 cursor-pointer select-none ${isSel ? 'z-10 relative' : ''}`}
        onClick={() => { setSelectedTooth(isSel ? null : num); setSelectedFace(null); }}>
        {isUpper && <span className={`text-[7px] font-black tabular-nums leading-none ${isSel ? 'text-teal-600' : 'text-slate-400'}`}>{num}</span>}
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ overflow: 'visible' }}
          className={`transition-all duration-150 ${isSel ? 'scale-[1.35] drop-shadow-lg' : 'hover:scale-110'}`}>
          {isAbs ? (<>
            <rect x={bg} y={bg} width={S-bg*2} height={S-bg*2} rx="5" fill={OD_GLOBAL[gs].color} stroke={OD_GLOBAL[gs].stroke} strokeWidth="1.5"/>
            <line x1={bg+4} y1={bg+4} x2={S-bg-4} y2={S-bg-4} stroke={OD_GLOBAL[gs].stroke} strokeWidth="2" strokeLinecap="round"/>
            <line x1={S-bg-4} y1={bg+4} x2={bg+4} y2={S-bg-4} stroke={OD_GLOBAL[gs].stroke} strokeWidth="2" strokeLinecap="round"/>
          </>) : isImp ? (<>
            <rect x={bg} y={bg} width={S-bg*2} height={S-bg*2} rx="5" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5"/>
            <rect x={C-3.5} y={bg+5} width="7" height={S-bg*2-10} rx="3.5" fill="#3b82f6" opacity="0.65"/>
            <line x1={C-8} y1={C-5} x2={C+8} y2={C-5} stroke="#2563eb" strokeWidth="1.2"/>
            <line x1={C-8} y1={C+2} x2={C+8} y2={C+2} stroke="#2563eb" strokeWidth="1.2"/>
          </>) : (<>
            <rect x={bg} y={bg} width={S-bg*2} height={S-bg*2} rx="5" fill="#f8fafc" stroke={bc} strokeWidth={bw}/>
            <polygon points={`${bg},${bg} ${S-bg},${bg} ${ci+isz},${ci} ${ci},${ci}`} fill={cT} stroke="white" strokeWidth="0.6" style={{cursor:'pointer'}} onClick={e=>{e.stopPropagation();setSelectedTooth(num);setSelectedFace(tf);}}/>
            <polygon points={`${ci},${ci+isz} ${ci+isz},${ci+isz} ${S-bg},${S-bg} ${bg},${S-bg}`} fill={cB} stroke="white" strokeWidth="0.6" style={{cursor:'pointer'}} onClick={e=>{e.stopPropagation();setSelectedTooth(num);setSelectedFace(bf);}}/>
            <polygon points={`${bg},${bg} ${ci},${ci} ${ci},${ci+isz} ${bg},${S-bg}`} fill={cM} stroke="white" strokeWidth="0.6" style={{cursor:'pointer'}} onClick={e=>{e.stopPropagation();setSelectedTooth(num);setSelectedFace('M');}}/>
            <polygon points={`${ci+isz},${ci} ${S-bg},${bg} ${S-bg},${S-bg} ${ci+isz},${ci+isz}`} fill={cD} stroke="white" strokeWidth="0.6" style={{cursor:'pointer'}} onClick={e=>{e.stopPropagation();setSelectedTooth(num);setSelectedFace('D');}}/>
            <rect x={ci} y={ci} width={isz} height={isz} rx="2.5" fill={cO} stroke={sO} strokeWidth="1" style={{cursor:'pointer'}} onClick={e=>{e.stopPropagation();setSelectedTooth(num);setSelectedFace('O');}}/>
            <line x1={bg} y1={bg} x2={ci} y2={ci} stroke="white" strokeWidth="0.8"/>
            <line x1={S-bg} y1={bg} x2={ci+isz} y2={ci} stroke="white" strokeWidth="0.8"/>
            <line x1={bg} y1={S-bg} x2={ci} y2={ci+isz} stroke="white" strokeWidth="0.8"/>
            <line x1={S-bg} y1={S-bg} x2={ci+isz} y2={ci+isz} stroke="white" strokeWidth="0.8"/>
            {isSel && selectedFace===tf && <polygon points={`${bg},${bg} ${S-bg},${bg} ${ci+isz},${ci} ${ci},${ci}`} fill="none" stroke={hl} strokeWidth="1.8" strokeLinejoin="round"/>}
            {isSel && selectedFace===bf && <polygon points={`${ci},${ci+isz} ${ci+isz},${ci+isz} ${S-bg},${S-bg} ${bg},${S-bg}`} fill="none" stroke={hl} strokeWidth="1.8" strokeLinejoin="round"/>}
            {isSel && selectedFace==='M' && <polygon points={`${bg},${bg} ${ci},${ci} ${ci},${ci+isz} ${bg},${S-bg}`} fill="none" stroke={hl} strokeWidth="1.8" strokeLinejoin="round"/>}
            {isSel && selectedFace==='D' && <polygon points={`${ci+isz},${ci} ${S-bg},${bg} ${S-bg},${S-bg} ${ci+isz},${ci+isz}`} fill="none" stroke={hl} strokeWidth="1.8" strokeLinejoin="round"/>}
            {isSel && selectedFace==='O' && <rect x={ci-1} y={ci-1} width={isz+2} height={isz+2} rx="3.5" fill="none" stroke={hl} strokeWidth="2"/>}
          </>)}
          {isSel && <rect x="0.5" y="0.5" width={S-1} height={S-1} rx="6" fill="none" stroke={hl} strokeWidth="2" strokeDasharray="4 2.5" opacity="0.7"/>}
        </svg>
        {!isUpper && <span className={`text-[7px] font-black tabular-nums leading-none ${isSel ? 'text-teal-600' : 'text-slate-400'}`}>{num}</span>}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {selectedTooth !== null && (
        <div className="bg-slate-900 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-teal-900 border border-teal-600 rounded-xl flex items-center justify-center text-[10px] font-black text-teal-300">{selectedTooth}</div>
              <div>
                <p className="text-[10px] font-black text-white uppercase tracking-widest">Diente {selectedTooth}</p>
                <p className="text-[9px] text-slate-400">{selectedFace ? `Cara: ${OD_FACE_LABELS[selectedFace]}` : 'Selecciona una cara o estado global'}</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => clearTooth(selectedTooth)} className="text-[9px] font-black text-red-400 hover:text-red-300 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 uppercase tracking-wider">Limpiar</button>
              <button type="button" onClick={() => { setSelectedTooth(null); setSelectedFace(null); }} className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-lg"><XIcon size={13}/></button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <p className="w-full text-[8px] font-black text-slate-500 uppercase tracking-widest">Seleccionar cara:</p>
            {OD_FACES.map(f => (
              <button key={f} type="button" onClick={() => setSelectedFace(selectedFace === f ? null : f)}
                className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${selectedFace === f ? 'bg-teal-600 border-teal-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-teal-700 hover:text-teal-300'}`}>
                {f} <span className="font-normal normal-case text-[8px] opacity-70">— {OD_FACE_LABELS[f].split('/')[0]}</span>
              </button>
            ))}
          </div>
          {selectedFace && (
            <div className="space-y-1.5">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Condición — cara {OD_FACE_LABELS[selectedFace]}:</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(OD_CONDITIONS).map(([key, meta]) => {
                  const cur = odontograma[selectedTooth]?.[selectedFace] || ''; const isAct = cur === key;
                  return (
                    <button key={key} type="button" onClick={() => setFaceCond(selectedTooth, selectedFace, key)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[9px] font-black border-2 transition-all"
                      style={{ backgroundColor: isAct ? meta.color : '#1e293b', borderColor: isAct ? meta.stroke : (key ? meta.stroke+'44' : '#334155'), color: isAct ? meta.label : (key ? meta.color : '#475569') }}>
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: key ? meta.stroke : '#334155' }}/>{key || '— Sin hallazgo'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="space-y-1.5 border-t border-slate-700 pt-3">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Estado global del diente:</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(OD_GLOBAL).map(([key, meta]) => {
                const isAct = getGlobalStatus(selectedTooth) === key;
                return (
                  <button key={key} type="button" onClick={() => setGlobal(selectedTooth, isAct ? '' : key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black border-2 transition-all"
                    style={{ backgroundColor: isAct ? meta.color : '#1e293b', borderColor: isAct ? meta.stroke : meta.stroke+'44', color: isAct ? meta.label : meta.color }}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.stroke }}/>{key}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <div className="bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-100 p-4 overflow-x-auto">
        <div className="flex justify-center mb-1"><div className="flex gap-3 items-center"><span className="text-[7px] font-black text-slate-300 uppercase tracking-[0.15em]">Cuad. I (18→11)</span><div className="w-px h-3 bg-slate-200"/><span className="text-[7px] font-black text-slate-300 uppercase tracking-[0.15em]">Cuad. II (21→28)</span></div></div>
        <div className="flex items-end justify-center gap-[3px]">
          <div className="flex items-end gap-[3px]">{[18,17,16,15,14,13,12,11].map(t => <Tooth key={t} num={t} isUpper={true}/>)}</div>
          <div className="self-stretch mx-1 flex flex-col items-center justify-center"><div className="w-px flex-1 bg-slate-200"/><div className="w-2 h-2 rounded-full bg-slate-300 my-1"/><div className="w-px flex-1 bg-slate-200"/></div>
          <div className="flex items-end gap-[3px]">{[21,22,23,24,25,26,27,28].map(t => <Tooth key={t} num={t} isUpper={true}/>)}</div>
        </div>
        <div className="flex items-center gap-2 my-2"><div className="h-[1.5px] flex-1 bg-slate-200 rounded"/><span className="text-[7px] font-black text-slate-300 uppercase tracking-[0.15em] whitespace-nowrap px-1">Plano Oclusal</span><div className="h-[1.5px] flex-1 bg-slate-200 rounded"/></div>
        <div className="flex items-start justify-center gap-[3px]">
          <div className="flex items-start gap-[3px]">{[48,47,46,45,44,43,42,41].map(t => <Tooth key={t} num={t} isUpper={false}/>)}</div>
          <div className="self-stretch mx-1 flex flex-col items-center justify-center"><div className="w-px flex-1 bg-slate-200"/><div className="w-2 h-2 rounded-full bg-slate-300 my-1"/><div className="w-px flex-1 bg-slate-200"/></div>
          <div className="flex items-start gap-[3px]">{[31,32,33,34,35,36,37,38].map(t => <Tooth key={t} num={t} isUpper={false}/>)}</div>
        </div>
        <div className="flex justify-center mt-1"><div className="flex gap-3 items-center"><span className="text-[7px] font-black text-slate-300 uppercase tracking-[0.15em]">Cuad. IV (48→41)</span><div className="w-px h-3 bg-slate-200"/><span className="text-[7px] font-black text-slate-300 uppercase tracking-[0.15em]">Cuad. III (31→38)</span></div></div>
        <p className="text-center text-[9px] text-slate-400 font-medium mt-2 italic">Vista oclusal · Toca un diente, selecciona cara y condición</p>
      </div>
      <div>
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Condiciones por cara:</p>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-1">
          {Object.entries(OD_CONDITIONS).filter(([k]) => k).map(([key, meta]) => (
            <div key={key} className="flex flex-col items-center gap-1 p-2 rounded-xl border text-center" style={{backgroundColor:meta.color+'aa',borderColor:meta.stroke+'66'}}>
              <div className="w-3 h-3 rounded-full" style={{backgroundColor:meta.stroke}}/>
              <span className="text-[8px] font-black" style={{color:meta.label}}>{key}</span>
            </div>
          ))}
        </div>
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2 mb-1">Estados globales:</p>
        <div className="flex gap-2">
          {Object.entries(OD_GLOBAL).map(([key, meta]) => (
            <div key={key} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[9px] font-black" style={{backgroundColor:meta.color,borderColor:meta.stroke+'88',color:meta.label}}>
              <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:meta.stroke}}/>{key}
            </div>
          ))}
        </div>
      </div>
      {Object.keys(odontograma).length > 0 && (
        <div className="rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Hallazgos registrados</span>
            <span className="text-[9px] font-black bg-white text-slate-400 px-2 py-0.5 rounded-lg border border-slate-100">{Object.keys(odontograma).length} diente{Object.keys(odontograma).length !== 1 ? 's' : ''}</span>
          </div>
          <div className="p-3 space-y-1.5 bg-white max-h-40 overflow-y-auto">
            {Object.entries(odontograma).sort(([a],[b]) => Number(a)-Number(b)).map(([tooth, faces]) => {
              const global = faces['GLOBAL']; const faceConds = Object.entries(faces).filter(([f,v]) => f !== 'GLOBAL' && v);
              return (
                <div key={tooth} className="flex items-center gap-2 p-2 rounded-xl border border-slate-100 cursor-pointer hover:border-teal-200 hover:bg-teal-50 transition-all"
                  onClick={() => { setSelectedTooth(Number(tooth)); setSelectedFace(null); }}>
                  <span className="text-[10px] font-black text-slate-600 w-6 text-center bg-slate-100 rounded-lg py-0.5">{tooth}</span>
                  {global && <span className="text-[9px] font-black px-2 py-0.5 rounded-lg border" style={{backgroundColor:OD_GLOBAL[global]?.color,borderColor:OD_GLOBAL[global]?.stroke+'88',color:OD_GLOBAL[global]?.label}}>{global}</span>}
                  {faceConds.map(([face, cond]) => (<span key={face} className="text-[8px] font-black px-1.5 py-0.5 rounded-md border" style={{backgroundColor:OD_CONDITIONS[cond as string]?.color,borderColor:OD_CONDITIONS[cond as string]?.stroke+'66',color:OD_CONDITIONS[cond as string]?.label}}>{face}:{cond}</span>))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Galería de fotos ─────────────────────────────────────────────────────────
interface PhotoGalleryProps {
  photos:     TrackingPhoto[];
  setPhotos:  (fn: (prev: TrackingPhoto[]) => TrackingPhoto[]) => void;
  authorName: string;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ photos, setPhotos, authorName }) => {
  const fileRef               = useRef<HTMLInputElement>(null);
  const [newLabel, setNewLabel] = useState('');
  const [preview, setPreview]   = useState<TrackingPhoto | null>(null);
  const [loading, setLoading]   = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setLoading(true);
    const results: TrackingPhoto[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      results.push({
        id:     `photo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        date:   new Date().toISOString(),
        label:  newLabel.trim() || file.name,
        base64,
        author: authorName,
      });
    }
    setPhotos(prev => [...results, ...prev]);
    setNewLabel('');
    setLoading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removePhoto = (id: string) => setPhotos(prev => prev.filter(p => p.id !== id));

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-teal-200 rounded-2xl p-4 bg-teal-50/30 space-y-3">
        <div>
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Etiqueta (opcional)</label>
          <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)}
            placeholder="Ej: Rayos X inicial, Control 2 semanas..."
            className="w-full bg-white border-none rounded-xl px-4 py-2.5 font-medium text-xs outline-none focus:ring-2 focus:ring-teal-500"/>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)}/>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-white hover:bg-teal-50 border border-teal-200 rounded-2xl text-teal-600 font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50">
          {loading ? <Loader2 size={15} className="animate-spin"/> : <ImagePlus size={15}/>}
          {loading ? 'Procesando...' : 'Seleccionar imágenes'}
        </button>
        <p className="text-[8px] text-slate-400 font-medium text-center">PNG, JPG, WEBP — múltiples archivos · Base64</p>
      </div>
      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 opacity-40">
          <Camera size={32} className="text-slate-300 mb-2"/>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Sin imágenes</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map(photo => (
            <div key={photo.id} className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm hover:shadow-md transition-all">
              <img src={photo.base64} alt={photo.label} className="w-full h-28 object-cover"/>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button type="button" onClick={() => setPreview(photo)} className="bg-white text-slate-700 p-2 rounded-xl hover:bg-teal-500 hover:text-white transition-all"><ZoomIn size={13}/></button>
                <button type="button" onClick={() => removePhoto(photo.id)} className="bg-white text-red-500 p-2 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={13}/></button>
              </div>
              <div className="p-2">
                <p className="text-[9px] font-black text-slate-700 truncate">{photo.label}</p>
                <p className="text-[8px] text-slate-400 font-medium mt-0.5">{new Date(photo.date).toLocaleDateString('es-CO',{day:'2-digit',month:'short'})} · {photo.author}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {preview && (
        <div className="fixed inset-0 bg-black/90 z-[950] flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="max-w-3xl w-full space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-black text-sm">{preview.label}</p>
                <p className="text-slate-400 text-xs font-medium">{new Date(preview.date).toLocaleDateString('es-CO',{day:'2-digit',month:'long',year:'numeric'})} · {preview.author}</p>
              </div>
              <button onClick={() => setPreview(null)} className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-xl transition-all"><XIcon size={18}/></button>
            </div>
            <img src={preview.base64} alt={preview.label} className="w-full max-h-[75vh] object-contain rounded-2xl"/>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Modal de tracking por sesión ─────────────────────────────────────────────
interface SessionTrackingModalProps {
  session:       TreatmentSession;
  treatmentId:   string;
  tracking:      SessionTracking;
  authorName:    string;
  onSave:        (sessionId: string, data: SessionTracking) => Promise<void>;
  onClose:       () => void;
}

const SessionTrackingModal: React.FC<SessionTrackingModalProps> = ({
  session, treatmentId, tracking, authorName, onSave, onClose,
}) => {
  const [odontograma, setOdontograma] = useState<Record<number, Record<string, string>>>(
    JSON.parse(JSON.stringify(tracking.odontograma))
  );
  const [photos, setPhotos] = useState<TrackingPhoto[]>([...tracking.photos]);
  const [notes,  setNotes]  = useState(tracking.notes);
  const [saving, setSaving] = useState(false);
  const [tab,    setTab]    = useState<'odonto' | 'photos' | 'notes'>('odonto');

  const toothCount = Object.keys(odontograma).length;
  const photoCount = photos.length;

  const handleSave = async () => {
    setSaving(true);
    await onSave(session.id, {
      odontograma,
      photos,
      notes,
      updatedAt: new Date().toISOString(),
      updatedBy: authorName,
    });
    setSaving(false);
    onClose();
  };

  const effectiveStatus = getEffectiveStatus(session);
  const sc = S_CFG[effectiveStatus];

  return (
    <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm z-[900] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in duration-200">

        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-slate-50 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-teal-600 p-2.5 rounded-2xl text-white shadow-lg shadow-teal-200 flex-shrink-0">
                <BookOpen size={20}/>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black text-slate-800 uppercase leading-tight">Registro de Sesión</h3>
                  <span className={`${sc.bg} text-[7px] font-black uppercase px-2 py-0.5 rounded-full text-slate-600`}>{sc.label}</span>
                </div>
                <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mt-0.5">{session.label}</p>
                {(session.date || session.time) && (
                  <p className="text-[9px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                    <Calendar size={8}/> {session.date}{session.time ? ` · ${session.time}` : ''}
                  </p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="bg-white p-2.5 rounded-2xl text-slate-400 hover:text-slate-800 shadow-sm transition-all flex-shrink-0">
              <XIcon size={18}/>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 mt-4">
            {([
              { id: 'odonto', icon: <ClipboardList size={12}/>, label: 'Odontograma', badge: toothCount > 0 ? toothCount : null },
              { id: 'photos', icon: <Camera size={12}/>,        label: 'Fotografías',  badge: photoCount > 0 ? photoCount : null },
              { id: 'notes',  icon: <FileText size={12}/>,      label: 'Notas',        badge: notes.trim() ? '✓' : null },
            ] as const).map(({ id, icon, label, badge }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                  tab === id ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-100'
                }`}>
                {icon} {label}
                {badge !== null && (
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${tab === id ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'odonto' && (
            <div className="space-y-3">
              <p className="text-[9px] text-slate-400 font-medium">
                Registra el estado dental observado en esta sesión. Este odontograma es exclusivo para la sesión <strong className="text-slate-600">{session.label}</strong>.
              </p>
              <TrackingOdontogram odontograma={odontograma} setOdontograma={setOdontograma}/>
            </div>
          )}
          {tab === 'photos' && (
            <div className="space-y-3">
              <p className="text-[9px] text-slate-400 font-medium">
                Adjunta fotografías clínicas, radiografías o cualquier imagen relevante para esta sesión.
              </p>
              <PhotoGallery photos={photos} setPhotos={setPhotos} authorName={authorName}/>
            </div>
          )}
          {tab === 'notes' && (
            <div className="space-y-3">
              <p className="text-[9px] text-slate-400 font-medium">
                Escribe observaciones clínicas, procedimientos realizados, materiales usados, o cualquier nota relevante de esta sesión.
              </p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={12}
                placeholder={`Notas de la sesión: ${session.label}\n\n- Procedimiento realizado:\n- Materiales utilizados:\n- Observaciones:\n- Indicaciones al paciente:`}
                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-medium text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none leading-relaxed"
              />
              {tracking.updatedAt && (
                <p className="text-[8px] text-slate-400 font-medium flex items-center gap-1">
                  <Clock size={9}/> Último guardado: {new Date(tracking.updatedAt).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})} por {tracking.updatedBy}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex-shrink-0 flex items-center justify-between gap-3">
          <button onClick={onClose} className="px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-500 font-black text-[9px] uppercase tracking-widest hover:bg-slate-50 transition-all">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-black text-[9px] uppercase tracking-widest px-6 py-3 rounded-2xl transition-all disabled:opacity-50 shadow-lg shadow-teal-100">
            {saving ? <Loader2 size={13} className="animate-spin"/> : <Save size={13}/>}
            {saving ? 'Guardando...' : 'Guardar registro'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
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

  const openCustomerModal = useCallback(async (partial: Customer) => {
    setCustomerModal(partial);
    setLoadingCustomerModal(true);
    try {
      const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const res = await fetch(`${API}/api/customers/${partial.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const full: Customer = await res.json();
      setCustomerModal(full);
    } catch (err) {
      console.warn('[CustomerModal] fetch cliente completo falló:', err);
    } finally {
      setLoadingCustomerModal(false);
    }
  }, []);

  // ── Detalle tratamiento ────────────────────────────────────────────────────
  const [detailTreatment,   setDetailTreatment]   = useState<PatientTreatment | null>(null);
  const [loadingDetail,     setLoadingDetail]      = useState(false);
  const [noteText,          setNoteText]           = useState('');
  const [savingNote,        setSavingNote]         = useState(false);
  const [localNotes,        setLocalNotes]         = useState<ParsedNote[] | null>(null);
  const [updatingSessionId, setUpdatingSessionId]  = useState<string | null>(null);

  // ── Tracking por sesión ────────────────────────────────────────────────────
  // Mapa sessionId → SessionTracking (cargado al seleccionar tratamiento)
  const [sessionTrackings, setSessionTrackings]   = useState<Record<string, SessionTracking>>({});
  const [trackingModal,    setTrackingModal]       = useState<TreatmentSession | null>(null);

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

  // Convierte sessions[] con campos trackingXxx al mapa interno SessionTracking
  const buildTrackingMap = (sessions: any[]): Record<string, SessionTracking> => {
    const map: Record<string, SessionTracking> = {};
    for (const ses of sessions) {
      if (ses.trackingOdontogram || ses.trackingPhotos || ses.trackingNotes) {
        map[ses.id] = {
          odontograma: ses.trackingOdontogram ?? {},
          photos:      Array.isArray(ses.trackingPhotos) ? ses.trackingPhotos : [],
          notes:       ses.trackingNotes     ?? '',
          updatedAt:   ses.trackingUpdatedAt,
          updatedBy:   ses.trackingUpdatedBy,
        };
      }
    }
    return map;
  };

  const loadDetail = useCallback(async (treatmentId: string) => {
    setLoadingDetail(true);
    setLocalNotes(null);
    setSessionTrackings({});
    try {
      const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const res = await fetch(`${API}/api/follow/${treatmentId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDetailTreatment(data);
      // Soporta 2 formatos del API:
      // 1. { sessionTrackings: { [sessionId]: SessionTracking } }
      // 2. sessions[].trackingOdontogram / trackingPhotos / trackingNotes (PATCH extendido)
      if (data.sessionTrackings && typeof data.sessionTrackings === 'object') {
        setSessionTrackings(data.sessionTrackings);
      } else if (Array.isArray(data.sessions)) {
        setSessionTrackings(buildTrackingMap(data.sessions));
      }
    } catch {
      const t = (treatments as PatientTreatment[] ?? []).find(t => t.id === treatmentId);
      if (t) {
        setDetailTreatment(t);
        if ((t as any).sessionTrackings) {
          setSessionTrackings((t as any).sessionTrackings);
        } else if (Array.isArray(t.sessions)) {
          setSessionTrackings(buildTrackingMap(t.sessions as any[]));
        }
      }
    } finally {
      setLoadingDetail(false);
    }
  }, [treatments]);

  useEffect(() => {
    if (selectedId) { setExpandedSess(true); setExpandedNote(true); loadDetail(selectedId); }
    else setDetailTreatment(null);
  }, [selectedId]);

  const handleRefresh = async () => {
    await refreshBranchData();
    if (selectedId) loadDetail(selectedId);
  };

  const handleSessionStatus = async (treatmentId: string, sessionId: string, status: 'REALIZADA' | 'CANCELADA' | 'REPROGRAMADA') => {
    setUpdatingSessionId(sessionId);
    try {
      const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const res = await fetch(`${API}/api/follow/${treatmentId}/sessions/${sessionId}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      notify(status === 'REALIZADA' ? 'Sesión marcada como realizada' : status === 'CANCELADA' ? 'Sesión cancelada' : 'Sesión marcada para reagendar', 'success');
      await refreshBranchData();
      loadDetail(treatmentId);
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
      setNoteText('');
      notify('Nota clínica guardada', 'success');
    } catch { notify('Error al guardar la nota', 'error'); }
    finally { setSavingNote(false); }
  };

  // ── Guardar tracking de sesión ─────────────────────────────────────────────
  // PATCH /api/follow/:treatmentId/sessions/:sessionId
  // Extiende el endpoint existente con campos trackingXxx
  const handleSaveSessionTracking = async (sessionId: string, data: SessionTracking) => {
    if (!detailTreatment) return;
    try {
      const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const res = await fetch(
        `${API}/api/follow/${detailTreatment.id}/sessions/${sessionId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trackingOdontogram: data.odontograma,
            trackingPhotos:     data.photos,
            trackingNotes:      data.notes,
            trackingUpdatedAt:  data.updatedAt,
            trackingUpdatedBy:  data.updatedBy,
          }),
        }
      );
      if (!res.ok) throw new Error();
      // Reflejar cambios localmente sin necesidad de recargar todo el detalle
      setSessionTrackings(prev => ({ ...prev, [sessionId]: data }));
      notify('Registro de sesión guardado', 'success');
    } catch {
      notify('Error al guardar el registro de sesión', 'error');
      throw new Error('save failed');
    }
  };

  const detailCustomer = detailTreatment
    ? ((detailTreatment as any).customer as Customer) ?? (ctxCustomers as Customer[] ?? []).find((c: Customer) => c.id === detailTreatment.customerId)
    : null;

  const detailNotes: ParsedNote[] = localNotes ?? parseNotes((detailTreatment as any)?.notesRaw ?? detailTreatment?.notes);
  const detailPps      = detailTreatment ? pricePerSession(detailTreatment.totalCost, detailTreatment.sessions?.length ?? 0) : null;
  const detailAlert    = detailTreatment ? getAlert(detailTreatment.sessions ?? []) : null;
  const detailNextSes  = detailTreatment?.sessions?.filter(s => s.status === SessionStatus.PROGRAMADA && s.date)?.sort((a, b) => (a.date! > b.date! ? 1 : -1))[0] ?? null;

  // Helper: resumen del tracking de una sesión para el badge
  const getTrackingBadge = (sessionId: string) => {
    const t = sessionTrackings[sessionId];
    if (!t) return null;
    const parts: string[] = [];
    const teeth = Object.keys(t.odontograma).length;
    const imgs  = t.photos.length;
    if (teeth > 0) parts.push(`${teeth} diente${teeth !== 1 ? 's' : ''}`);
    if (imgs  > 0) parts.push(`${imgs} foto${imgs !== 1 ? 's' : ''}`);
    if (t.notes.trim()) parts.push('nota');
    return parts.length > 0 ? parts.join(' · ') : null;
  };

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden pb-20 md:pb-0">

      {/* ══ PANEL IZQUIERDO ══════════════════════════════════════════════════ */}
      <div className="w-96 flex-shrink-0 flex flex-col h-full bg-white border-r border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-2xl font-black text-slate-800 tracking-tighter flex items-center gap-3 mb-1">
            <ClipboardList className="text-teal-600" size={28}/> Seguimiento
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
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input type="text" placeholder="Buscar paciente, tratamiento o doctor..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-2xl font-medium text-sm outline-none focus:ring-2 focus:ring-teal-500"/>
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
              <ClipboardList size={52} className="text-slate-300 mb-3"/>
              <p className="text-sm font-black text-slate-400 uppercase">Sin resultados</p>
            </div>
          ) : (
            displayed.map(t => {
              const cust = (ctxCustomers as Customer[] ?? []).find((c: Customer) => c.id === t.customerId);
              const cfg  = T_CFG[t.status];
              const prog = getProgress(t.sessions ?? []);
              const done = (t.sessions ?? []).filter(s => s.status === SessionStatus.REALIZADA || s.status === SessionStatus.PAGADA).length;
              const alerta     = getAlert(t.sessions ?? []);
              const next       = (t.sessions ?? []).filter(s => s.status === SessionStatus.PROGRAMADA && s.date).sort((a, b) => (a.date! > b.date! ? 1 : -1))[0];
              const isSelected = selectedId === t.id;
              return (
                <button key={t.id} onClick={() => setSelectedId(isSelected ? null : t.id)}
                  className={`w-full text-left px-4 py-4 border-b border-slate-100 transition-all ${isSelected ? 'bg-teal-50 border-l-4 border-l-teal-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-black text-slate-800 uppercase truncate">{t.name || '—'}</span>
                        <span className={`${cfg.bg} ${cfg.text} text-[7px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0`}>{cfg.label}</span>
                        {alerta && <AlertTriangle size={11} className="text-red-500 flex-shrink-0"/>}
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5 flex items-center gap-1 hover:text-teal-600 transition-colors cursor-pointer w-fit group/name"
                        onClick={e => { e.stopPropagation(); if (cust) openCustomerModal(cust); }} title="Ver ficha del paciente">
                        <User size={9}/>{cust?.name ?? 'Paciente no encontrado'}
                        {cust && <ChevronRight size={8} className="opacity-0 group-hover/name:opacity-100 transition-opacity"/>}
                      </p>
                      <p className="text-[9px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                        <Stethoscope size={8}/> {t.doctor}
                      </p>
                    </div>
                    {t.totalCost ? (
                      <span className="text-[9px] font-black text-teal-600 flex-shrink-0 flex items-center gap-0.5">
                        <DollarSign size={9}/>{formatCOP(t.totalCost)}
                      </span>
                    ) : null}
                  </div>
                  {next && (
                    <p className="text-[8px] font-bold text-teal-600 flex items-center gap-1 mb-1.5">
                      <CalendarDays size={8}/> Próxima: {next.date}{next.time ? ` · ${next.time}` : ''}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-teal-500 h-1.5 rounded-full transition-all duration-700" style={{ width: `${prog}%` }}/>
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
            <RefreshCw size={13}/> Actualizar
          </button>
        </div>
      </div>

      {/* ══ PANEL DERECHO ════════════════════════════════════════════════════ */}
      <div className="flex-1 h-full overflow-y-auto">
        {!selectedId && (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-40 gap-4">
            <ClipboardList size={72} className="text-slate-300"/>
            <h3 className="text-xl font-black text-slate-400 uppercase">Selecciona un paciente</h3>
            <p className="text-slate-400 text-sm font-medium">Elige un tratamiento de la lista para ver su seguimiento</p>
          </div>
        )}

        {selectedId && loadingDetail && (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={32} className="animate-spin text-teal-500"/>
          </div>
        )}

        {selectedId && !loadingDetail && detailTreatment && (() => {
          const tStatus = normalizeTreatmentStatus(detailTreatment);
          const tCfg    = T_CFG[tStatus];
          return (
            <div className="p-6 md:p-8 space-y-5 max-w-3xl">

              {/* Tarjeta resumen */}
              <div className={`bg-white rounded-[2rem] border shadow-sm overflow-hidden ${tCfg.border}`}>
                <div className="p-6">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-xl font-black text-slate-800 uppercase leading-tight">{detailTreatment.name}</h3>
                        <span className={`${tCfg.bg} ${tCfg.text} text-[8px] font-black uppercase px-2 py-0.5 rounded-full`}>{tCfg.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                        <Stethoscope size={10}/> Dr(a). {detailTreatment.doctor}
                      </p>
                    </div>
                  </div>

                  {detailCustomer && (
                    <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 mb-4 flex items-center gap-3 cursor-pointer hover:bg-teal-100 hover:border-teal-200 transition-all group"
                      onClick={() => openCustomerModal(detailCustomer)} title="Clic para ver ficha completa del paciente">
                      <div className="bg-teal-600 p-2 rounded-xl text-white flex-shrink-0"><User size={16}/></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-teal-700 uppercase">{detailCustomer.name}</p>
                        <div className="flex flex-wrap gap-3 mt-0.5">
                          {detailCustomer.phone && <span className="text-[9px] text-teal-500 font-bold flex items-center gap-1"><Phone size={9}/>{detailCustomer.phone}</span>}
                          {detailCustomer.email && <span className="text-[9px] text-teal-500 font-bold flex items-center gap-1"><Mail size={9}/>{detailCustomer.email}</span>}
                          {(detailCustomer as any).documentNumber && <span className="text-[9px] text-teal-400 font-bold">Doc: {(detailCustomer as any).documentNumber}</span>}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-teal-400 group-hover:text-teal-600 transition-colors"><ChevronRight size={14}/></div>
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
                      <div className="bg-teal-500 h-2 rounded-full transition-all duration-700" style={{ width: `${getProgress(detailTreatment.sessions ?? [])}%` }}/>
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
                  <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5"/>
                  <div>
                    <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Alerta clínica</p>
                    <p className="text-[11px] text-red-700 font-bold leading-relaxed">{detailAlert}</p>
                  </div>
                </div>
              )}

              {/* ══ SESIONES ══════════════════════════════════════════════════ */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <button onClick={() => setExpandedSess(v => !v)} className="w-full flex items-center justify-between px-6 py-5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Activity size={15} className="text-teal-600"/>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sesiones del tratamiento</span>
                    {detailPps != null && (
                      <span className="flex items-center gap-1 bg-teal-50 border border-teal-100 text-teal-600 text-[9px] font-black px-2.5 py-1 rounded-full">
                        <DollarSign size={9}/>{formatCOP(detailPps)} / sesión
                      </span>
                    )}
                  </div>
                  {expandedSess ? <ChevronUp size={15} className="text-slate-400"/> : <ChevronDown size={15} className="text-slate-400"/>}
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
                        const trackBadge    = getTrackingBadge(ses.id);
                        const hasTracking   = !!sessionTrackings[ses.id];

                        return (
                          <div key={ses.id} className="bg-white rounded-2xl p-3.5 border border-slate-100">
                            <div className="flex items-start gap-3">
                              {/* Indicador numérico */}
                              <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                                <div className={`w-6 h-6 ${sc.dot} rounded-full flex items-center justify-center`}>
                                  <span className="text-[8px] font-black text-white">{idx + 1}</span>
                                </div>
                                {idx < (detailTreatment.sessions ?? []).length - 1 && <div className="w-0.5 h-4 bg-slate-200 rounded-full"/>}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-[10px] font-black text-slate-700 uppercase">{ses.label}</p>
                                  <span className={`${sc.bg} text-[7px] font-black uppercase px-2 py-0.5 rounded-full text-slate-600`}>{sc.label}</span>
                                </div>

                                {(ses.date || ses.time) && (
                                  <p className="text-[9px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                                    <Calendar size={8}/>{ses.date}{ses.time ? ` · ${ses.time}` : ''}
                                  </p>
                                )}
                                {detailPps != null && <p className="text-[9px] font-black text-teal-500 mt-0.5 flex items-center gap-1"><DollarSign size={8}/>{formatCOP(detailPps)}</p>}
                                {ses.notes && <p className="text-[9px] text-slate-400 italic mt-1">{ses.notes}</p>}

                                {/* Badge de tracking: resumen + fecha y autor del último registro */}
                                {hasTracking && (() => {
                                  const tr = sessionTrackings[ses.id];
                                  return (
                                    <div className="mt-1.5 flex flex-col gap-0.5">
                                      {trackBadge && (
                                        <p className="text-[8px] font-black text-teal-600 flex items-center gap-1">
                                          <BookOpen size={8}/> {trackBadge}
                                        </p>
                                      )}
                                      {tr.updatedAt && (
                                        <p className="text-[7px] text-slate-400 font-medium flex items-center gap-1">
                                          <Clock size={7}/>
                                          Registrado el {new Date(tr.updatedAt).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'})}
                                          {tr.updatedBy ? ` · ${tr.updatedBy}` : ''}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* Acciones */}
                                <div className="flex gap-1.5 mt-2 flex-wrap items-center">
                                  {canDone && (
                                    <button disabled={isUpd} onClick={() => handleSessionStatus(detailTreatment.id, ses.id, 'REALIZADA')}
                                      className="flex items-center gap-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-200 px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-50">
                                      <CheckCircle2 size={10}/>{isUpd ? '...' : 'Realizada'}
                                    </button>
                                  )}
                                  {canCancel && (
                                    <button disabled={isUpd} onClick={() => handleSessionStatus(detailTreatment.id, ses.id, 'CANCELADA')}
                                      className="flex items-center gap-1 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-200 px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-50">
                                      <XCircle size={10}/> Cancelar
                                    </button>
                                  )}
                                  {canReschedule && (
                                    <button disabled={isUpd} onClick={() => handleSessionStatus(detailTreatment.id, ses.id, 'REPROGRAMADA')}
                                      className="flex items-center gap-1 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-200 px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-50">
                                      <RotateCcw size={10}/> Reagendar
                                    </button>
                                  )}

                                  {/* ── Botón de registro de sesión ── */}
                                  <button onClick={() => setTrackingModal(ses)}
                                    className={`relative flex items-center gap-1.5 px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border ${
                                      hasTracking
                                        ? 'bg-teal-50 text-teal-600 border-teal-200 hover:bg-teal-500 hover:text-white'
                                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-200'
                                    }`}>
                                    {hasTracking && (
                                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-teal-500 rounded-full ring-2 ring-white"/>
                                    )}
                                    <BookOpen size={10}/>
                                    {hasTracking ? 'Ver registro' : 'Registrar'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* ══ NOTAS CLÍNICAS ════════════════════════════════════════════ */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <button onClick={() => setExpandedNote(v => !v)} className="w-full flex items-center justify-between px-6 py-5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText size={15} className="text-teal-600"/>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Notas clínicas</span>
                    {detailNotes.length > 0 && <span className="bg-slate-100 text-slate-500 text-[8px] font-black px-1.5 py-0.5 rounded-full">{detailNotes.length}</span>}
                  </div>
                  {expandedNote ? <ChevronUp size={15} className="text-slate-400"/> : <ChevronDown size={15} className="text-slate-400"/>}
                </button>

                {expandedNote && (
                  <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/60 space-y-3">
                    <div>
                      <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Escribe una nota clínica general del tratamiento..." rows={2}
                        className="w-full bg-white border-none rounded-2xl p-3 font-medium text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none shadow-sm"/>
                      <div className="flex justify-end mt-1.5">
                        <button onClick={handleAddNote} disabled={savingNote || !noteText.trim()}
                          className="flex items-center gap-1.5 bg-teal-600 text-white text-[9px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl hover:bg-teal-700 transition-all disabled:opacity-50">
                          {savingNote ? <Loader2 size={11} className="animate-spin"/> : <Save size={11}/>} Guardar nota
                        </button>
                      </div>
                    </div>
                    {detailNotes.length === 0 ? (
                      <p className="text-[11px] text-slate-400 font-medium text-center py-2">Sin notas clínicas</p>
                    ) : (
                      detailNotes.map(note => (
                        <div key={note.id} className="bg-teal-50 border border-teal-100 rounded-2xl p-3.5">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-black text-teal-700 uppercase flex items-center gap-1"><FileText size={9}/> {note.author}</span>
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
          onUpdateCustomer={updated => { onUpdateCustomer?.(updated); setCustomerModal(updated); }}
        />
      )}

      {/* ══ MODAL TRACKING DE SESIÓN ════════════════════════════════════════ */}
      {trackingModal && detailTreatment && (
        <SessionTrackingModal
          session={trackingModal}
          treatmentId={detailTreatment.id}
          tracking={sessionTrackings[trackingModal.id] ?? EMPTY_TRACKING()}
          authorName={currentUserName}
          onSave={handleSaveSessionTracking}
          onClose={() => setTrackingModal(null)}
        />
      )}
    </div>
  );
};

export default FollowView;