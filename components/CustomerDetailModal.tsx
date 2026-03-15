import React, { useState, useEffect } from 'react';
import {
  X, Save, User, Phone, Mail, MapPin, Fingerprint, ShieldCheck,
  Calendar, Edit2, ChevronRight, AlertCircle, Loader2, Stethoscope,
  Star, Building2, CheckSquare, Square, ClipboardList, Search,
  Briefcase, ChevronDown, ChevronUp
} from 'lucide-react';
import { Customer, DocumentType, Documents } from '../types';
import { dataService } from '../services/data.service';
import { useNotification } from './NotificationContext';

// ─── Types ─────────────────────────────────────────────────────────────────

interface CustomerDetailModalProps {
  customer:        Customer;
  onClose:         () => void;
  onUpdateCustomer: (updated: Customer) => void;
}

type ActiveTab = 'info' | 'edit' | 'clinical';

// ─── Helpers ────────────────────────────────────────────────────────────────

const calcAge = (birthDate?: string): string => {
  if (!birthDate) return '';
  const bd  = new Date(birthDate);
  const now = new Date();
  let age   = now.getFullYear() - bd.getFullYear();
  if (now.getMonth() - bd.getMonth() < 0 ||
     (now.getMonth() === bd.getMonth() && now.getDate() < bd.getDate())) age--;
  return `${age} años`;
};

const FISCAL_LABELS: Record<string, string> = {
  'R-99-PN': 'No responsable de IVA',
  'O-48':    'Impuesto sobre las ventas (IVA)',
  'O-47':    'Régimen simple de tributación',
  'O-05':    'Impuesto sobre la renta',
};

const AVATAR_COLORS: Record<string, string> = {
  A:'from-rose-400 to-rose-600',    B:'from-orange-400 to-orange-600',
  C:'from-amber-400 to-amber-600',  D:'from-yellow-400 to-yellow-600',
  E:'from-lime-400 to-lime-600',    F:'from-green-400 to-green-600',
  G:'from-teal-400 to-teal-600',    H:'from-cyan-400 to-cyan-600',
  I:'from-sky-400 to-sky-600',      J:'from-blue-400 to-blue-600',
  K:'from-indigo-400 to-indigo-600',L:'from-violet-400 to-violet-600',
  M:'from-purple-400 to-purple-600',N:'from-fuchsia-400 to-fuchsia-600',
  O:'from-pink-400 to-pink-600',    P:'from-rose-300 to-rose-500',
  Q:'from-teal-300 to-teal-600',    R:'from-blue-300 to-blue-600',
  S:'from-slate-400 to-slate-600',  T:'from-emerald-400 to-emerald-600',
  U:'from-cyan-300 to-cyan-600',    V:'from-violet-300 to-violet-600',
  W:'from-amber-300 to-amber-600',  X:'from-red-400 to-red-600',
  Y:'from-yellow-300 to-yellow-600',Z:'from-slate-300 to-slate-500',
};

// ─── Odontograma conditions (mirror de CustomersView) ───────────────────────

const CONDITIONS: Record<string, { color: string; stroke: string; label: string }> = {
  '':           { color: '#f1f5f9', stroke: '#cbd5e1', label: '#94a3b8' },
  'Sano':       { color: '#bbf7d0', stroke: '#22c55e', label: '#14532d' },
  'Caries':     { color: '#fca5a5', stroke: '#ef4444', label: '#7f1d1d' },
  'Obturado':   { color: '#93c5fd', stroke: '#3b82f6', label: '#1e3a8a' },
  'Corona':     { color: '#d8b4fe', stroke: '#9333ea', label: '#4c1d95' },
  'Endodoncia': { color: '#f9a8d4', stroke: '#ec4899', label: '#831843' },
  'Fractura':   { color: '#fde68a', stroke: '#eab308', label: '#713f12' },
  'Desgaste':   { color: '#fed7aa', stroke: '#f97316', label: '#7c2d12' },
};
const GLOBAL_CONDITIONS: Record<string, { color: string; stroke: string; label: string }> = {
  'Ausente':    { color: '#e2e8f0', stroke: '#94a3b8', label: '#334155' },
  'Extracción': { color: '#fecaca', stroke: '#dc2626', label: '#7f1d1d' },
  'Implante':   { color: '#bfdbfe', stroke: '#3b82f6', label: '#1e3a8a' },
};
const FACES = ['O','V','L','M','D'];
const FACE_LABELS: Record<string, string> = {
  O:'Oclusal/Incisal', V:'Vestibular', L:'Lingual/Palatino', M:'Mesial', D:'Distal'
};

// ─── Sub-componentes ─────────────────────────────────────────────────────────

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value?: string | null; accent?: boolean }> = ({
  icon, label, value, accent
}) => (
  <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
    <div className={`mt-0.5 flex-shrink-0 ${accent ? 'text-brand-500' : 'text-slate-400'}`}>{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className={`text-sm font-semibold truncate ${value ? 'text-slate-800' : 'text-slate-300 italic text-xs'}`}>
        {value || 'Sin registrar'}
      </p>
    </div>
  </div>
);

const SectionAccordion: React.FC<{
  id: string; title: string; icon: React.ReactNode;
  open: boolean; onToggle: () => void; children: React.ReactNode;
}> = ({ id, title, icon, open, onToggle, children }) => (
  <div className="border border-slate-100 rounded-2xl overflow-hidden">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors"
    >
      <div className="flex items-center gap-2.5">
        <span className="text-brand-600">{icon}</span>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{title}</span>
      </div>
      {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
    </button>
    {open && <div className="p-5 space-y-4 bg-white">{children}</div>}
  </div>
);

// ─── Clinical History Read-Only View ────────────────────────────────────────

const ClinicalHistoryView: React.FC<{
  ch: any;
  customerName: string;
  docType: string;
  docNumber: string;
}> = ({ ch, customerName, docType, docNumber }) => {
  const [openSection, setOpenSection] = useState<string | null>('anamnesis');
  const toggle = (s: string) => setOpenSection(p => p === s ? null : s);

  const textareaCls = "w-full bg-slate-50 border-none rounded-xl p-3.5 font-medium text-xs text-slate-700 resize-none";
  const inputCls    = "w-full bg-slate-50 border-none rounded-xl p-3.5 font-medium text-xs text-slate-700";
  const labelCls    = "block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest";

  if (!ch) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Stethoscope size={40} className="text-slate-200 mb-4" />
      <p className="text-sm font-black text-slate-400 uppercase tracking-wide">Sin historia clínica</p>
      <p className="text-xs text-slate-400 mt-1 font-medium">No se ha registrado información clínica para este paciente</p>
    </div>
  );

  // Mini odontograma read-only
  const ToothMini = ({ num, isUpper }: { num: number; isUpper: boolean }) => {
    const odontograma = ch.odontograma || {};
    const S = 28; const C = S/2; const innerHalf = S*0.175; const ci = C-innerHalf; const innerSize = innerHalf*2; const bg = 1.5;
    const globalStatus = odontograma[num]?.['GLOBAL'] || '';
    const isAbsent = globalStatus === 'Ausente' || globalStatus === 'Extracción';
    const getFaceColor = (face: string) => {
      if (globalStatus) return GLOBAL_CONDITIONS[globalStatus]?.color || '#e2e8f0';
      return CONDITIONS[odontograma[num]?.[face] || '']?.color || CONDITIONS[''].color;
    };
    const getFaceStroke = (face: string) => {
      if (globalStatus) return GLOBAL_CONDITIONS[globalStatus]?.stroke || '#94a3b8';
      return CONDITIONS[odontograma[num]?.[face] || '']?.stroke || CONDITIONS[''].stroke;
    };
    const topFace = isUpper ? 'V' : 'L';
    const bottomFace = isUpper ? 'L' : 'V';
    const hasData = odontograma[num] && Object.values(odontograma[num]).some((v: any) => !!v);
    return (
      <div className="flex flex-col items-center gap-0.5">
        {isUpper && <span className="text-[5px] font-black tabular-nums text-slate-300 leading-none">{num}</span>}
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
          {isAbsent ? (<>
            <rect x={bg} y={bg} width={S-bg*2} height={S-bg*2} rx="3" fill={GLOBAL_CONDITIONS[globalStatus].color} stroke={GLOBAL_CONDITIONS[globalStatus].stroke} strokeWidth="1"/>
            <line x1={bg+3} y1={bg+3} x2={S-bg-3} y2={S-bg-3} stroke={GLOBAL_CONDITIONS[globalStatus].stroke} strokeWidth="1.5" strokeLinecap="round"/>
            <line x1={S-bg-3} y1={bg+3} x2={bg+3} y2={S-bg-3} stroke={GLOBAL_CONDITIONS[globalStatus].stroke} strokeWidth="1.5" strokeLinecap="round"/>
          </>) : (<>
            <rect x={bg} y={bg} width={S-bg*2} height={S-bg*2} rx="3" fill="#f8fafc" stroke={hasData ? '#475569' : '#cbd5e1'} strokeWidth="0.8"/>
            <polygon points={`${bg},${bg} ${S-bg},${bg} ${ci+innerSize},${ci} ${ci},${ci}`} fill={getFaceColor(topFace)} stroke="white" strokeWidth="0.4"/>
            <polygon points={`${ci},${ci+innerSize} ${ci+innerSize},${ci+innerSize} ${S-bg},${S-bg} ${bg},${S-bg}`} fill={getFaceColor(bottomFace)} stroke="white" strokeWidth="0.4"/>
            <polygon points={`${bg},${bg} ${ci},${ci} ${ci},${ci+innerSize} ${bg},${S-bg}`} fill={getFaceColor('M')} stroke="white" strokeWidth="0.4"/>
            <polygon points={`${ci+innerSize},${ci} ${S-bg},${bg} ${S-bg},${S-bg} ${ci+innerSize},${ci+innerSize}`} fill={getFaceColor('D')} stroke="white" strokeWidth="0.4"/>
            <rect x={ci} y={ci} width={innerSize} height={innerSize} rx="1.5" fill={getFaceColor('O')} stroke={getFaceStroke('O')} strokeWidth="0.7"/>
          </>)}
        </svg>
        {!isUpper && <span className="text-[5px] font-black tabular-nums text-slate-300 leading-none">{num}</span>}
      </div>
    );
  };

  return (
    <div className="space-y-3">

      {/* Última actualización */}
      {ch.fechaUltimaActualizacion && (
        <div className="flex items-center gap-2 bg-cyan-50 border border-cyan-100 rounded-2xl px-4 py-2.5">
          <Calendar size={12} className="text-cyan-500" />
          <span className="text-[9px] font-bold text-cyan-600">
            Última actualización: {new Date(ch.fechaUltimaActualizacion).toLocaleDateString('es-CO', {
              day: '2-digit', month: 'long', year: 'numeric'
            })}
          </span>
        </div>
      )}

      <SectionAccordion id="anamnesis" title="Anamnesis" icon={<ClipboardList size={14}/>} open={openSection==='anamnesis'} onToggle={() => toggle('anamnesis')}>
        {ch.motivoConsulta && <div><label className={labelCls}>Motivo de consulta</label><textarea rows={2} readOnly className={textareaCls} value={ch.motivoConsulta}/></div>}
        {ch.enfermedadActual && <div><label className={labelCls}>Enfermedad actual</label><textarea rows={3} readOnly className={textareaCls} value={ch.enfermedadActual}/></div>}
        {!ch.motivoConsulta && !ch.enfermedadActual && <p className="text-xs text-slate-400 italic">Sin datos registrados</p>}
      </SectionAccordion>

      <SectionAccordion id="antecedentes" title="Antecedentes médicos" icon={<ShieldCheck size={14}/>} open={openSection==='antecedentes'} onToggle={() => toggle('antecedentes')}>
        {ch.antSistemicosList && Object.entries(ch.antSistemicosList).some(([,v]) => v) && (
          <div>
            <label className={labelCls}>Antecedentes sistémicos</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {Object.entries({ diabetes:'Diabetes',hipertension:'Hipertensión',cardiopatia:'Cardiopatía',asma:'Asma',epilepsia:'Epilepsia',coagulopatia:'Coagulopatía',vih:'VIH',embarazo:'Embarazo',alergias:'Alergias' })
                .filter(([key]) => ch.antSistemicosList[key])
                .map(([key, label]) => (
                  <span key={key} className="flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 text-[9px] font-black px-2.5 py-1 rounded-xl">
                    <CheckSquare size={10}/> {label}
                  </span>
                ))}
            </div>
            {ch.alergiaDetalle && <p className="text-[10px] text-slate-600 mt-2 font-medium">Alergias: {ch.alergiaDetalle}</p>}
          </div>
        )}
        {ch.medicamentosActuales && (
          <div><label className={labelCls}>Medicamentos actuales</label><textarea rows={2} readOnly className={textareaCls} value={ch.medicamentosActuales}/></div>
        )}
        {ch.antecedentesOdontologicos && (
          <div><label className={labelCls}>Antecedentes odontológicos</label><textarea rows={2} readOnly className={textareaCls} value={ch.antecedentesOdontologicos}/></div>
        )}
        {(!ch.antSistemicosList || !Object.values(ch.antSistemicosList).some(Boolean)) && !ch.medicamentosActuales && !ch.antecedentesOdontologicos && (
          <p className="text-xs text-slate-400 italic">Sin datos registrados</p>
        )}
      </SectionAccordion>

      <SectionAccordion id="signos" title="Signos vitales" icon={<Stethoscope size={14}/>} open={openSection==='signos'} onToggle={() => toggle('signos')}>
        {ch.signos && Object.values(ch.signos).some((v: any) => v) ? (
          <div className="grid grid-cols-4 gap-3">
            {[['T/A','ta'],['FC','fc'],['FR','fr'],['Temp','temp']].map(([label, key]) => (
              ch.signos[key] && (
                <div key={key} className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                  <p className="text-sm font-black text-slate-700 mt-1">{ch.signos[key]}</p>
                </div>
              )
            ))}
          </div>
        ) : <p className="text-xs text-slate-400 italic">Sin signos vitales registrados</p>}
      </SectionAccordion>

      <SectionAccordion id="examen" title="Examen clínico" icon={<Search size={14}/>} open={openSection==='examen'} onToggle={() => toggle('examen')}>
        {ch.examenExtraoralDetalle && <div><label className={labelCls}>Examen extraoral</label><textarea rows={3} readOnly className={textareaCls} value={ch.examenExtraoralDetalle}/></div>}
        {ch.examenIntraoralDetalle && <div><label className={labelCls}>Examen intraoral</label><textarea rows={3} readOnly className={textareaCls} value={ch.examenIntraoralDetalle}/></div>}
        {(ch.indiceHigiene || ch.indiceGingival || ch.clasificacionAngle) && (
          <div className="grid grid-cols-3 gap-3">
            {ch.indiceHigiene && <div><label className={labelCls}>Índice higiene</label><input readOnly className={inputCls} value={ch.indiceHigiene}/></div>}
            {ch.indiceGingival && <div><label className={labelCls}>Índice gingival</label><input readOnly className={inputCls} value={ch.indiceGingival}/></div>}
            {ch.clasificacionAngle && <div><label className={labelCls}>Angle</label><input readOnly className={inputCls} value={ch.clasificacionAngle}/></div>}
          </div>
        )}
        {!ch.examenExtraoralDetalle && !ch.examenIntraoralDetalle && <p className="text-xs text-slate-400 italic">Sin datos registrados</p>}
      </SectionAccordion>

      {/* Odontograma compacto */}
      {ch.odontograma && Object.keys(ch.odontograma).length > 0 && (
        <SectionAccordion id="odontograma" title="Odontograma" icon={<ClipboardList size={14}/>} open={openSection==='odontograma'} onToggle={() => toggle('odontograma')}>
          <div className="bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-100 p-3 overflow-x-auto">
            <div className="flex items-end justify-center gap-[2px]">
              <div className="flex items-end gap-[2px]">{[18,17,16,15,14,13,12,11].map(t => <ToothMini key={t} num={t} isUpper={true}/>)}</div>
              <div className="self-stretch mx-1 flex flex-col items-center justify-center"><div className="w-px flex-1 bg-slate-200"/><div className="w-1.5 h-1.5 rounded-full bg-slate-300 my-1"/><div className="w-px flex-1 bg-slate-200"/></div>
              <div className="flex items-end gap-[2px]">{[21,22,23,24,25,26,27,28].map(t => <ToothMini key={t} num={t} isUpper={true}/>)}</div>
            </div>
            <div className="flex items-center gap-2 my-1.5"><div className="h-px flex-1 bg-slate-200 rounded"/><span className="text-[6px] font-black text-slate-300 uppercase tracking-widest whitespace-nowrap px-1">Plano Oclusal</span><div className="h-px flex-1 bg-slate-200 rounded"/></div>
            <div className="flex items-start justify-center gap-[2px]">
              <div className="flex items-start gap-[2px]">{[48,47,46,45,44,43,42,41].map(t => <ToothMini key={t} num={t} isUpper={false}/>)}</div>
              <div className="self-stretch mx-1 flex flex-col items-center justify-center"><div className="w-px flex-1 bg-slate-200"/><div className="w-1.5 h-1.5 rounded-full bg-slate-300 my-1"/><div className="w-px flex-1 bg-slate-200"/></div>
              <div className="flex items-start gap-[2px]">{[31,32,33,34,35,36,37,38].map(t => <ToothMini key={t} num={t} isUpper={false}/>)}</div>
            </div>
          </div>
          {/* Leyenda hallazgos */}
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {Object.entries(ch.odontograma).sort(([a],[b]) => Number(a)-Number(b)).map(([tooth, faces]: [string, any]) => {
              const global = faces['GLOBAL'];
              const faceConds = Object.entries(faces).filter(([f,v]) => f !== 'GLOBAL' && v);
              return (
                <div key={tooth} className="flex items-center gap-2 bg-slate-50 rounded-xl px-2.5 py-1.5 border border-slate-100">
                  <span className="text-[9px] font-black text-slate-500 w-5 text-center">{tooth}</span>
                  {global && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-lg border" style={{backgroundColor:GLOBAL_CONDITIONS[global]?.color,borderColor:GLOBAL_CONDITIONS[global]?.stroke+'88',color:GLOBAL_CONDITIONS[global]?.label}}>{global}</span>}
                  {faceConds.slice(0,3).map(([face, cond]) => (
                    <span key={face} className="text-[7px] font-black px-1.5 py-0.5 rounded-md border" style={{backgroundColor:CONDITIONS[cond as string]?.color,borderColor:CONDITIONS[cond as string]?.stroke+'66',color:CONDITIONS[cond as string]?.label}}>{face}:{cond}</span>
                  ))}
                </div>
              );
            })}
          </div>
        </SectionAccordion>
      )}

      <SectionAccordion id="diagnostico" title="Diagnóstico y Plan" icon={<Briefcase size={14}/>} open={openSection==='diagnostico'} onToggle={() => toggle('diagnostico')}>
        {ch.diagnosticoDetalle && <div><label className={labelCls}>Diagnóstico</label><textarea rows={3} readOnly className={textareaCls} value={ch.diagnosticoDetalle}/></div>}
        {ch.planTratamientoDetalle && <div><label className={labelCls}>Plan de tratamiento</label><textarea rows={3} readOnly className={textareaCls} value={ch.planTratamientoDetalle}/></div>}
        {ch.pronóstico && (
          <div className="flex items-center gap-2">
            <label className={labelCls + ' mb-0'}>Pronóstico:</label>
            <span className={`text-[9px] font-black px-2.5 py-1 rounded-xl uppercase tracking-wider ${
              ch.pronóstico === 'Bueno' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
              ch.pronóstico === 'Regular' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
              ch.pronóstico === 'Reservado' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
              'bg-red-50 text-red-700 border border-red-200'
            }`}>{ch.pronóstico}</span>
          </div>
        )}
        {ch.observacionesGenerales && <div><label className={labelCls}>Observaciones</label><textarea rows={2} readOnly className={textareaCls} value={ch.observacionesGenerales}/></div>}
        {!ch.diagnosticoDetalle && !ch.planTratamientoDetalle && <p className="text-xs text-slate-400 italic">Sin datos registrados</p>}
      </SectionAccordion>

      {/* Consentimiento */}
      {ch.consentimientoInformado && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
          <CheckSquare size={16} className="text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Consentimiento informado firmado</p>
            <p className="text-[9px] text-emerald-600 font-medium mt-0.5">{customerName} · {docType} {docNumber}</p>
          </div>
        </div>
      )}

    </div>
  );
};

// ─── Componente principal ────────────────────────────────────────────────────

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  onClose,
  onUpdateCustomer,
}) => {
  const { notify } = useNotification();
  const [activeTab, setActiveTab] = useState<ActiveTab>('info');
  const [saving,    setSaving]    = useState(false);
  const [dirty,     setDirty]     = useState(false);

  // ── Campos edit ─────────────────────────────────────────────────────────
  const [name,               setName]               = useState(customer.name);
  const [phone,              setPhone]              = useState(customer.phone);
  const [email,              setEmail]              = useState(customer.email || '');
  const [address,            setAddress]            = useState(customer.address || '');
  const [city,               setCity]               = useState(customer.city || '');
  const [documentType,       setDocumentType]       = useState<DocumentType>(customer.documentType || 'CC');
  const [documentNumber,     setDocumentNumber]     = useState(customer.documentNumber || '');
  const [birthDate,          setBirthDate]          = useState(
    customer.birthDate ? new Date(customer.birthDate).toISOString().slice(0, 10) : ''
  );
  const [fiscalResponsibility, setFiscalResponsibility] = useState(customer.fiscalResponsibility || '');

  // Reset al cambiar de cliente
  useEffect(() => {
    setName(customer.name);
    setPhone(customer.phone);
    setEmail(customer.email || '');
    setAddress(customer.address || '');
    setCity(customer.city || '');
    setDocumentType(customer.documentType || 'CC');
    setDocumentNumber(customer.documentNumber || '');
    setBirthDate(customer.birthDate ? new Date(customer.birthDate).toISOString().slice(0, 10) : '');
    setFiscalResponsibility(customer.fiscalResponsibility || '');
    setDirty(false);
  }, [customer.id]);

  const mark = () => setDirty(true);

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) {
      notify('Nombre y teléfono son obligatorios', 'warning');
      return;
    }
    setSaving(true);
    try {
      const updated: Customer = {
        ...customer,
        name: name.toUpperCase(),
        phone,
        email,
        address,
        city,
        documentType,
        documentNumber,
        birthDate,
        fiscalResponsibility,
      };
      onUpdateCustomer(updated);
      notify('Cliente actualizado correctamente', 'success');
      setDirty(false);
      setActiveTab('info');
    } catch {
      notify('Error al guardar los cambios', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Avatar
  const initial    = customer.name.charAt(0).toUpperCase();
  const avatarGrad = AVATAR_COLORS[initial] || 'from-slate-400 to-slate-600';

  const inputCls = `w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-medium text-sm
    focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all`;
  const labelCls = `block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5`;

  // HC progress
  const calcProgress = (ch: any): number => {
    if (!ch) return 0;
    let filled = 0; const total = 14;
    ['motivoConsulta','enfermedadActual','antecedentesMedicos','antecedentesOdontologicos',
     'examenExtraoralDetalle','examenIntraoralDetalle','diagnosticoDetalle','planTratamientoDetalle',
     'medicamentosActuales','observacionesGenerales'].forEach(f => { if (ch[f]?.trim()) filled++; });
    if (ch.signos && Object.values(ch.signos).some((v: any) => v?.trim())) filled++;
    if (ch.antSistemicosList && Object.values(ch.antSistemicosList).some(Boolean)) filled++;
    if (ch.odontograma && Object.keys(ch.odontograma).length > 0) filled++;
    if (ch.consentimientoInformado) filled++;
    return Math.round((filled / total) * 100);
  };

  const hcPct = calcProgress(customer.clinicalHistory);
  const progressColor = (pct: number) =>
    pct === 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-teal-500' : pct >= 40 ? 'bg-amber-500' : pct > 0 ? 'bg-orange-500' : 'bg-slate-200';

  const TABS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'info',     label: 'Ficha',    icon: <User size={12}/> },
    { id: 'edit',     label: 'Editar',   icon: <Edit2 size={12}/> },
    { id: 'clinical', label: 'Hist. Clínica', icon: <Stethoscope size={12}/> },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[600] p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[92vh]">

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-8 pt-7 pb-0 flex-shrink-0">

          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl transition-all"
          >
            <X size={16} />
          </button>

          {/* Avatar + datos */}
          <div className="flex items-center gap-5 mb-5">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-2xl font-black text-white shadow-xl border-2 border-white/10 flex-shrink-0`}>
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-black text-white uppercase leading-tight tracking-tight truncate">
                {customer.name}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Fingerprint size={11} className="text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {customer.documentType}: {customer.documentNumber || 'Sin documento'}
                  </span>
                </div>
                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                  customer.isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {customer.isActive ? 'Activo' : 'Inactivo'}
                </span>
                {customer.birthDate && (
                  <span className="text-[9px] text-slate-500 font-bold">{calcAge(customer.birthDate)}</span>
                )}
              </div>

              {/* Mini HC progress bar */}
              {customer.clinicalHistory && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 bg-white/10 rounded-full h-1 overflow-hidden max-w-[120px]">
                    <div className={`h-1 rounded-full ${progressColor(hcPct)}`} style={{ width: `${hcPct}%` }} />
                  </div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">HC {hcPct}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-all rounded-t-xl ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-800'
                    : 'text-slate-500 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'edit' && dirty && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
                {tab.id === 'clinical' && customer.clinicalHistory && (
                  <span className="bg-cyan-500/30 text-cyan-300 text-[7px] font-black px-1.5 py-0.5 rounded-full">
                    {hcPct}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── BODY ────────────────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">

          {/* TAB: INFO */}
          {activeTab === 'info' && (
            <div className="p-6 space-y-3">

              {/* Contacto */}
              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Phone size={9}/> Contacto
                </p>
                <InfoRow icon={<Phone size={14}/>}  label="Celular"   value={customer.phone}  accent />
                <InfoRow icon={<Mail size={14}/>}   label="Correo"    value={customer.email} />
                <InfoRow icon={<MapPin size={14}/>} label="Dirección" value={
                  [customer.address, customer.city].filter(Boolean).join(', ') || undefined
                } />
              </div>

              {/* Datos personales */}
              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <User size={9}/> Datos personales
                </p>
                <InfoRow
                  icon={<Calendar size={14}/>}
                  label="Fecha de nacimiento"
                  value={customer.birthDate
                    ? `${new Date(customer.birthDate).toLocaleDateString('es-CO', {day:'2-digit',month:'long',year:'numeric'})} · ${calcAge(customer.birthDate)}`
                    : undefined
                  }
                />
                <InfoRow
                  icon={<Fingerprint size={14}/>}
                  label="Documento"
                  value={customer.documentNumber ? `${customer.documentType} ${customer.documentNumber}` : undefined}
                  accent
                />
                <InfoRow
                  icon={<ShieldCheck size={14}/>}
                  label="Responsabilidad fiscal"
                  value={customer.fiscalResponsibility
                    ? (FISCAL_LABELS[customer.fiscalResponsibility] || customer.fiscalResponsibility)
                    : undefined
                  }
                />
                <InfoRow
                  icon={<Star size={14}/>}
                  label="Puntos de fidelización"
                  value={customer.points ? `${customer.points} puntos` : '0 puntos'}
                />
              </div>

              {/* HC resumen */}
              <div className={`rounded-2xl p-4 border ${customer.clinicalHistory ? 'bg-cyan-50 border-cyan-100' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Stethoscope size={16} className={customer.clinicalHistory ? 'text-cyan-500' : 'text-slate-300'} />
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Historia Clínica</p>
                      <p className={`text-xs font-bold mt-0.5 ${customer.clinicalHistory ? 'text-cyan-600' : 'text-slate-400'}`}>
                        {customer.clinicalHistory
                          ? (customer.clinicalHistory.fechaUltimaActualizacion
                              ? `Actualizada: ${new Date(customer.clinicalHistory.fechaUltimaActualizacion).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'})}`
                              : 'Registrada')
                          : 'Sin historia clínica registrada'
                        }
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('clinical')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                      customer.clinicalHistory
                        ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                        : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                    }`}
                  >
                    Ver HC <ChevronRight size={10}/>
                  </button>
                </div>
                {customer.clinicalHistory && (
                  <div className="mt-3">
                    <div className="w-full bg-white/60 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-1.5 rounded-full transition-all ${progressColor(hcPct)}`} style={{ width: `${hcPct}%` }} />
                    </div>
                    <p className="text-[8px] text-slate-400 font-medium mt-1">{hcPct}% completada · {Math.round(hcPct * 14 / 100)}/14 secciones</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: EDIT */}
          {activeTab === 'edit' && (
            <div className="p-6 space-y-5">
              {dirty && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                  <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
                  <p className="text-[10px] font-bold text-amber-700">Cambios sin guardar</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Nombre completo / Razón social *</label>
                  <input type="text" className={inputCls + ' uppercase font-bold'} value={name} onChange={e => { setName(e.target.value); mark(); }} />
                </div>
                <div>
                  <label className={labelCls}>Tipo de documento</label>
                  <select className={inputCls + ' font-black uppercase text-xs'} value={documentType} onChange={e => { setDocumentType(e.target.value as DocumentType); mark(); }}>
                    {Object.entries(Documents).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Número de documento</label>
                  <input type="text" className={inputCls + ' font-black'} value={documentNumber} onChange={e => { setDocumentNumber(e.target.value); mark(); }} />
                </div>
                <div>
                  <label className={labelCls}>Celular *</label>
                  <input type="tel" className={inputCls} value={phone} onChange={e => { setPhone(e.target.value); mark(); }} />
                </div>
                <div>
                  <label className={labelCls}>Correo electrónico</label>
                  <input type="email" className={inputCls} value={email} onChange={e => { setEmail(e.target.value); mark(); }} />
                </div>
                <div>
                  <label className={labelCls}>Fecha de nacimiento</label>
                  <input type="date" className={inputCls} value={birthDate} onChange={e => { setBirthDate(e.target.value); mark(); }} />
                </div>
                <div>
                  <label className={labelCls}>Ciudad</label>
                  <input type="text" className={inputCls + ' uppercase'} value={city} onChange={e => { setCity(e.target.value); mark(); }} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Dirección</label>
                  <input type="text" className={inputCls + ' uppercase'} value={address} onChange={e => { setAddress(e.target.value); mark(); }} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls + ' flex items-center gap-1'}><ShieldCheck size={9}/> Responsabilidad fiscal</label>
                  <select className={inputCls + ' font-black text-xs'} value={fiscalResponsibility} onChange={e => { setFiscalResponsibility(e.target.value); mark(); }}>
                    <option value="">Ninguna / No aplica</option>
                    <option value="R-99-PN">No responsable de IVA</option>
                    <option value="O-48">Impuesto sobre las ventas (IVA)</option>
                    <option value="O-47">Régimen simple de tributación</option>
                    <option value="O-05">Impuesto sobre la renta</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CLINICAL */}
          {activeTab === 'clinical' && (
            <div className="p-6">
              <ClinicalHistoryView
                ch={customer.clinicalHistory}
                customerName={customer.name}
                docType={customer.documentType || ''}
                docNumber={customer.documentNumber || ''}
              />
            </div>
          )}
        </div>

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex gap-3 flex-shrink-0">
          {activeTab === 'edit' ? (
            <>
              <button
                type="button"
                onClick={() => { setActiveTab('info'); setDirty(false); }}
                className="flex-1 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !dirty}
                className="flex-1 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving
                  ? <><Loader2 size={14} className="animate-spin"/> Guardando...</>
                  : <><Save size={14}/> Guardar cambios</>
                }
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest transition-all"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};