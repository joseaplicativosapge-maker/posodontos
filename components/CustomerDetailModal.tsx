import React, { useState, useEffect } from 'react';
import {
  X, Save, User, Phone, Mail, MapPin, Fingerprint, ShieldCheck,
  Calendar, Edit2, ChevronRight, AlertCircle, Loader2, Stethoscope,
  Star, CheckSquare, Square, ClipboardList, Search,
  Briefcase, ChevronDown, ChevronUp
} from 'lucide-react';
import { Customer, DocumentType, Documents } from '../types';
import { dataService } from '../services/data.service';
import { useNotification } from './NotificationContext';

interface CustomerDetailModalProps {
  customer:         Customer;
  loading?:         boolean;
  onClose:          () => void;
  onUpdateCustomer: (updated: Customer) => void;
}

type ActiveTab = 'info' | 'edit' | 'clinical';

const calcAge = (birthDate?: string): string => {
  if (!birthDate) return '';
  const bd = new Date(birthDate); const now = new Date();
  let age = now.getFullYear() - bd.getFullYear();
  if (now.getMonth() - bd.getMonth() < 0 || (now.getMonth() === bd.getMonth() && now.getDate() < bd.getDate())) age--;
  return `${age} años`;
};

const FISCAL_LABELS: Record<string, string> = {
  'R-99-PN':'No responsable de IVA','O-48':'Impuesto sobre las ventas (IVA)',
  'O-47':'Régimen simple de tributación','O-05':'Impuesto sobre la renta',
};

const AVATAR_COLORS: Record<string, string> = {
  A:'from-rose-400 to-rose-600',B:'from-orange-400 to-orange-600',C:'from-amber-400 to-amber-600',
  D:'from-yellow-400 to-yellow-600',E:'from-lime-400 to-lime-600',F:'from-green-400 to-green-600',
  G:'from-teal-400 to-teal-600',H:'from-cyan-400 to-cyan-600',I:'from-sky-400 to-sky-600',
  J:'from-blue-400 to-blue-600',K:'from-indigo-400 to-indigo-600',L:'from-violet-400 to-violet-600',
  M:'from-purple-400 to-purple-600',N:'from-fuchsia-400 to-fuchsia-600',O:'from-pink-400 to-pink-600',
  P:'from-rose-300 to-rose-500',Q:'from-teal-300 to-teal-600',R:'from-blue-300 to-blue-600',
  S:'from-slate-400 to-slate-600',T:'from-emerald-400 to-emerald-600',U:'from-cyan-300 to-cyan-600',
  V:'from-violet-300 to-violet-600',W:'from-amber-300 to-amber-600',X:'from-red-400 to-red-600',
  Y:'from-yellow-300 to-yellow-600',Z:'from-slate-300 to-slate-500',
};

const CONDITIONS: Record<string, { color: string; stroke: string; label: string; short: string }> = {
  '':          { color:'#f1f5f9',stroke:'#cbd5e1',label:'#94a3b8',short:'' },
  'Sano':      { color:'#bbf7d0',stroke:'#22c55e',label:'#14532d',short:'S' },
  'Caries':    { color:'#fca5a5',stroke:'#ef4444',label:'#7f1d1d',short:'C' },
  'Obturado':  { color:'#93c5fd',stroke:'#3b82f6',label:'#1e3a8a',short:'Ob' },
  'Corona':    { color:'#d8b4fe',stroke:'#9333ea',label:'#4c1d95',short:'Cr' },
  'Endodoncia':{ color:'#f9a8d4',stroke:'#ec4899',label:'#831843',short:'En' },
  'Fractura':  { color:'#fde68a',stroke:'#eab308',label:'#713f12',short:'Fr' },
  'Desgaste':  { color:'#fed7aa',stroke:'#f97316',label:'#7c2d12',short:'Dg' },
};
const GLOBAL_CONDITIONS: Record<string, { color: string; stroke: string; label: string }> = {
  'Ausente':   { color:'#e2e8f0',stroke:'#94a3b8',label:'#334155' },
  'Extracción':{ color:'#fecaca',stroke:'#dc2626',label:'#7f1d1d' },
  'Implante':  { color:'#bfdbfe',stroke:'#3b82f6',label:'#1e3a8a' },
};
const FACES = ['O','V','L','M','D'];
const FACE_LABELS: Record<string, string> = {
  O:'Oclusal/Incisal',V:'Vestibular',L:'Lingual/Palatino',M:'Mesial',D:'Distal'
};

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value?: string | null; accent?: boolean }> = ({icon,label,value,accent}) => (
  <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
    <div className={`mt-0.5 flex-shrink-0 ${accent?'text-brand-500':'text-slate-400'}`}>{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className={`text-sm font-semibold truncate ${value?'text-slate-800':'text-slate-300 italic text-xs'}`}>{value||'Sin registrar'}</p>
    </div>
  </div>
);

const SectionAccordion: React.FC<{id:string;title:string;icon:React.ReactNode;open:boolean;onToggle:()=>void;children:React.ReactNode}> = ({title,icon,open,onToggle,children}) => (
  <div className="border border-slate-100 rounded-2xl overflow-hidden">
    <button type="button" onClick={onToggle} className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors">
      <div className="flex items-center gap-2.5"><span className="text-brand-600">{icon}</span><span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{title}</span></div>
      {open?<ChevronUp size={14} className="text-slate-400"/>:<ChevronDown size={14} className="text-slate-400"/>}
    </button>
    {open && <div className="p-5 space-y-4 bg-white">{children}</div>}
  </div>
);

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({customer, loading=false, onClose, onUpdateCustomer}) => {
  const { notify } = useNotification();
  const [activeTab,      setActiveTab]      = useState<ActiveTab>('info');
  const [saving,         setSaving]         = useState(false);
  const [dirty,          setDirty]          = useState(false);
  const [savingClinical, setSavingClinical] = useState(false);

  // Campos básicos
  const [name,               setName]               = useState(customer.name);
  const [phone,              setPhone]              = useState(customer.phone);
  const [email,              setEmail]              = useState(customer.email||'');
  const [address,            setAddress]            = useState(customer.address||'');
  const [city,               setCity]               = useState(customer.city||'');
  const [documentType,       setDocumentType]       = useState<DocumentType>(customer.documentType||'CC');
  const [documentNumber,     setDocumentNumber]     = useState(customer.documentNumber||'');
  const [birthDate,          setBirthDate]          = useState(customer.birthDate?new Date(customer.birthDate).toISOString().slice(0,10):'');
  const [fiscalResponsibility,setFiscalResponsibility]=useState(customer.fiscalResponsibility||'');

  // Historia Clínica
  const [openSection,         setOpenSection]         = useState<string|null>('anamnesis');
  const [motivoConsulta,      setMotivoConsulta]      = useState('');
  const [enfermedadActual,    setEnfermedadActual]    = useState('');
  const [antecedentesMed,     setAntecedentesMed]     = useState('');
  const [antecedentesOdonto,  setAntecedentesOdonto]  = useState('');
  const [antSistemicosList,   setAntSistemicosList]   = useState<Record<string,boolean>>({diabetes:false,hipertension:false,cardiopatia:false,asma:false,epilepsia:false,coagulopatia:false,vih:false,embarazo:false,alergias:false});
  const [otrosAntSistemicos,  setOtrosAntSistemicos]  = useState('');
  const [alergiaDetalle,      setAlergiaDetalle]      = useState('');
  const [medicamentosActuales,setMedicamentosActuales]= useState('');
  const [habitosBruxismo,     setHabitosBruxismo]     = useState(false);
  const [habitosFumador,      setHabitosFumador]      = useState(false);
  const [habitosOnicoFagia,   setHabitosOnicoFagia]   = useState('');
  const [habitosOtros,        setHabitosOtros]        = useState('');
  const [signos,              setSignos]              = useState({ta:'',fc:'',fr:'',temp:''});
  const [examenExtraoral,     setExamenExtraoral]     = useState('');
  const [examenIntraoral,     setExamenIntraoral]     = useState('');
  const [indiceHigiene,       setIndiceHigiene]       = useState('');
  const [indiceGingival,      setIndiceGingival]      = useState('');
  const [clasificacionAngle,  setClasificacionAngle]  = useState('');
  const [odontograma,         setOdontograma]         = useState<Record<number,Record<string,string>>>({});
  const [selectedTooth,       setSelectedTooth]       = useState<number|null>(null);
  const [selectedFace,        setSelectedFace]        = useState<string|null>(null);
  const [diagnosticoDetalle,  setDiagnosticoDetalle]  = useState('');
  const [planTratamiento,     setPlanTratamiento]     = useState('');
  const [pronostico,          setPronostico]          = useState('');
  const [consentimientoInfo,  setConsentimientoInfo]  = useState(false);
  const [observacionesGral,   setObservacionesGral]   = useState('');

  // Reset datos básicos cuando llega el cliente completo del API
  useEffect(() => {
    setName(customer.name);
    setPhone(customer.phone);
    setEmail(customer.email||'');
    setAddress(customer.address||'');
    setCity(customer.city||'');
    setDocumentType(customer.documentType||'CC');
    setDocumentNumber(customer.documentNumber||'');
    setBirthDate(customer.birthDate?new Date(customer.birthDate).toISOString().slice(0,10):'');
    setFiscalResponsibility(customer.fiscalResponsibility||'');
    setDirty(false);
  }, [customer.id, customer.documentNumber, customer.documentType, customer.birthDate, customer.fiscalResponsibility]);

  // Cargar HC cuando llega
  useEffect(() => {
    const ch = customer.clinicalHistory;
    if (!ch) return;
    setMotivoConsulta(ch.motivoConsulta||'');
    setEnfermedadActual(ch.enfermedadActual||'');
    setAntecedentesMed(ch.antecedentesMedicos||'');
    setAntecedentesOdonto(ch.antecedentesOdontologicos||'');
    if (ch.antSistemicosList) setAntSistemicosList(ch.antSistemicosList);
    setOtrosAntSistemicos(ch.otrosAntSistemicos||'');
    setAlergiaDetalle(ch.alergiaDetalle||'');
    setMedicamentosActuales(ch.medicamentosActuales||'');
    setHabitosBruxismo(ch.habitosBruxismo||false);
    setHabitosFumador(ch.habitosFumador||false);
    setHabitosOnicoFagia(ch.habitosOnicoFagia||'');
    setHabitosOtros(ch.habitosOtros||'');
    if (ch.signos) setSignos(ch.signos);
    setExamenExtraoral(ch.examenExtraoralDetalle||'');
    setExamenIntraoral(ch.examenIntraoralDetalle||'');
    setIndiceHigiene(ch.indiceHigiene||'');
    setIndiceGingival(ch.indiceGingival||'');
    setClasificacionAngle(ch.clasificacionAngle||'');
    if (ch.odontograma) setOdontograma(ch.odontograma);
    setDiagnosticoDetalle(ch.diagnosticoDetalle||'');
    setPlanTratamiento(ch.planTratamientoDetalle||'');
    setPronostico(ch.pronóstico||'');
    setConsentimientoInfo(ch.consentimientoInformado||false);
    setObservacionesGral(ch.observacionesGenerales||'');
  }, [customer.id, customer.clinicalHistory]);

  const mark = () => setDirty(true);

  const handleSave = async () => {
    if (!name.trim()||!phone.trim()) { notify('Nombre y teléfono son obligatorios','warning'); return; }
    setSaving(true);
    try {
      onUpdateCustomer({...customer,name:name.toUpperCase(),phone,email,address,city,documentType,documentNumber,birthDate,fiscalResponsibility});
      notify('Cliente actualizado correctamente','success');
      setDirty(false); setActiveTab('info');
    } catch { notify('Error al guardar los cambios','error'); }
    finally { setSaving(false); }
  };

  const handleSaveClinical = async () => {
    setSavingClinical(true);
    try {
      const clinicalHistory = {
        motivoConsulta,enfermedadActual,antecedentesMedicos:antecedentesMed,
        antecedentesOdontologicos:antecedentesOdonto,antSistemicosList,
        otrosAntSistemicos,alergiaDetalle,medicamentosActuales,
        habitosBruxismo,habitosFumador,habitosOnicoFagia,habitosOtros,
        signos,examenExtraoralDetalle:examenExtraoral,examenIntraoralDetalle:examenIntraoral,
        indiceHigiene,indiceGingival,clasificacionAngle,odontograma,
        diagnosticoDetalle,planTratamientoDetalle:planTratamiento,
        pronóstico:pronostico,consentimientoInformado:consentimientoInfo,
        observacionesGenerales:observacionesGral,
        fechaUltimaActualizacion:new Date().toISOString(),
      };
      await dataService.saveClinicalHistory(customer.id, clinicalHistory);
      onUpdateCustomer({...customer,clinicalHistory});
      notify('Historia clínica guardada correctamente','success');
    } catch { notify('Error al guardar la historia clínica','error'); }
    finally { setSavingClinical(false); }
  };

  // Odontograma helpers
  const getGlobalStatus  = (n:number) => odontograma[n]?.['GLOBAL']||'';
  const getFaceColor     = (n:number,f:string) => { const g=getGlobalStatus(n); if(g) return GLOBAL_CONDITIONS[g]?.color||'#e2e8f0'; return CONDITIONS[odontograma[n]?.[f]||'']?.color||CONDITIONS[''].color; };
  const getFaceStroke    = (n:number,f:string) => { const g=getGlobalStatus(n); if(g) return GLOBAL_CONDITIONS[g]?.stroke||'#94a3b8'; return CONDITIONS[odontograma[n]?.[f]||'']?.stroke||CONDITIONS[''].stroke; };
  const hasAnyCondition  = (n:number) => { const t=odontograma[n]; if(!t) return false; return Object.values(t).some(v=>!!v); };
  const setFaceCondition = (n:number,f:string,c:string) => setOdontograma(prev=>({...prev,[n]:{...(prev[n]||{}),[f]:c}}));
  const setGlobalCond    = (n:number,c:string) => setOdontograma(prev=>({...prev,[n]:{...(prev[n]||{}),GLOBAL:c}}));
  const clearTooth       = (n:number) => setOdontograma(prev=>{ const nw={...prev}; delete nw[n]; return nw; });

  const ToothDiagram = ({num,isUpper}:{num:number;isUpper:boolean}) => {
    const isSel=selectedTooth===num; const gs=getGlobalStatus(num);
    const isAbsent=gs==='Ausente'||gs==='Extracción'; const isImpl=gs==='Implante';
    const isMolar=[16,17,18,26,27,28,36,37,38,46,47,48].includes(num);
    const S=isMolar?46:36;const C=S/2;const ih=S*0.175;const ci=C-ih;const isz=ih*2;const bg=2;
    const tf=isUpper?'V':'L';const bf=isUpper?'L':'V';
    const cO=getFaceColor(num,'O'),cT=getFaceColor(num,tf),cB=getFaceColor(num,bf),cM=getFaceColor(num,'M'),cD=getFaceColor(num,'D'),sO=getFaceStroke(num,'O');
    const hlC='#0891b2';const hasData=hasAnyCondition(num);
    const bc=isSel?hlC:hasData?'#475569':'#cbd5e1';const bw=isSel?2:1;
    return (
      <div className={`flex flex-col items-center gap-0.5 cursor-pointer select-none ${isSel?'z-10 relative':''}`} onClick={()=>{setSelectedTooth(isSel?null:num);setSelectedFace(null);}}>
        {isUpper&&<span className={`text-[7px] font-black tabular-nums leading-none ${isSel?'text-cyan-600':'text-slate-400'}`}>{num}</span>}
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{overflow:'visible'}} className={`transition-all duration-150 ${isSel?'scale-[1.35] drop-shadow-lg':'hover:scale-110'}`}>
          {isAbsent?(<><rect x={bg} y={bg} width={S-bg*2} height={S-bg*2} rx="5" fill={GLOBAL_CONDITIONS[gs].color} stroke={GLOBAL_CONDITIONS[gs].stroke} strokeWidth="1.5"/><line x1={bg+4} y1={bg+4} x2={S-bg-4} y2={S-bg-4} stroke={GLOBAL_CONDITIONS[gs].stroke} strokeWidth="2" strokeLinecap="round"/><line x1={S-bg-4} y1={bg+4} x2={bg+4} y2={S-bg-4} stroke={GLOBAL_CONDITIONS[gs].stroke} strokeWidth="2" strokeLinecap="round"/></>
          ):isImpl?(<><rect x={bg} y={bg} width={S-bg*2} height={S-bg*2} rx="5" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5"/><rect x={C-3.5} y={bg+5} width="7" height={S-bg*2-10} rx="3.5" fill="#3b82f6" opacity="0.65"/><line x1={C-8} y1={C-5} x2={C+8} y2={C-5} stroke="#2563eb" strokeWidth="1.2"/><line x1={C-8} y1={C+2} x2={C+8} y2={C+2} stroke="#2563eb" strokeWidth="1.2"/></>
          ):(<>
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
            {isSel&&selectedFace===tf&&<polygon points={`${bg},${bg} ${S-bg},${bg} ${ci+isz},${ci} ${ci},${ci}`} fill="none" stroke={hlC} strokeWidth="1.8" strokeLinejoin="round"/>}
            {isSel&&selectedFace===bf&&<polygon points={`${ci},${ci+isz} ${ci+isz},${ci+isz} ${S-bg},${S-bg} ${bg},${S-bg}`} fill="none" stroke={hlC} strokeWidth="1.8" strokeLinejoin="round"/>}
            {isSel&&selectedFace==='M'&&<polygon points={`${bg},${bg} ${ci},${ci} ${ci},${ci+isz} ${bg},${S-bg}`} fill="none" stroke={hlC} strokeWidth="1.8" strokeLinejoin="round"/>}
            {isSel&&selectedFace==='D'&&<polygon points={`${ci+isz},${ci} ${S-bg},${bg} ${S-bg},${S-bg} ${ci+isz},${ci+isz}`} fill="none" stroke={hlC} strokeWidth="1.8" strokeLinejoin="round"/>}
            {isSel&&selectedFace==='O'&&<rect x={ci-1} y={ci-1} width={isz+2} height={isz+2} rx="3.5" fill="none" stroke={hlC} strokeWidth="2"/>}
          </>)}
          {isSel&&<rect x="0.5" y="0.5" width={S-1} height={S-1} rx="6" fill="none" stroke={hlC} strokeWidth="2" strokeDasharray="4 2.5" opacity="0.7"/>}
        </svg>
        {!isUpper&&<span className={`text-[7px] font-black tabular-nums leading-none ${isSel?'text-cyan-600':'text-slate-400'}`}>{num}</span>}
      </div>
    );
  };

  // Progreso HC
  const calcProgress = (ch:any):number => {
    if (!ch) return 0; let filled=0; const total=14;
    ['motivoConsulta','enfermedadActual','antecedentesMedicos','antecedentesOdontologicos',
     'examenExtraoralDetalle','examenIntraoralDetalle','diagnosticoDetalle','planTratamientoDetalle',
     'medicamentosActuales','observacionesGenerales'].forEach(f=>{if(ch[f]?.trim())filled++;});
    if(ch.signos&&Object.values(ch.signos).some((v:any)=>v?.trim()))filled++;
    if(ch.antSistemicosList&&Object.values(ch.antSistemicosList).some(Boolean))filled++;
    if(ch.odontograma&&Object.keys(ch.odontograma).length>0)filled++;
    if(ch.consentimientoInformado)filled++;
    return Math.round((filled/total)*100);
  };
  const hcFormPct = calcProgress({
    motivoConsulta,enfermedadActual,antecedentesMedicos:antecedentesMed,
    antecedentesOdontologicos:antecedentesOdonto,examenExtraoralDetalle:examenExtraoral,
    examenIntraoralDetalle:examenIntraoral,diagnosticoDetalle,planTratamientoDetalle:planTratamiento,
    medicamentosActuales,observacionesGenerales:observacionesGral,
    signos,antSistemicosList,odontograma,consentimientoInformado:consentimientoInfo,
  });
  const hcPct = calcProgress(customer.clinicalHistory);
  const pColor = (p:number) => p===100?'bg-emerald-500':p>=70?'bg-teal-500':p>=40?'bg-amber-500':p>0?'bg-orange-500':'bg-slate-200';
  const ptColor = (p:number) => p===100?'text-emerald-600':p>=70?'text-teal-600':p>=40?'text-amber-600':p>0?'text-orange-600':'text-slate-400';

  const initial=customer.name.charAt(0).toUpperCase();
  const avatarGrad=AVATAR_COLORS[initial]||'from-slate-400 to-slate-600';
  const inputCls=`w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-medium text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all`;
  const labelCls=`block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5`;
  const cIn=`w-full bg-slate-50 border-none rounded-xl p-4 font-medium text-xs focus:ring-2 focus:ring-brand-500 outline-none`;
  const cTa=`w-full bg-slate-50 border-none rounded-xl p-4 font-medium text-xs focus:ring-2 focus:ring-brand-500 outline-none resize-none`;
  const cLb=`block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest`;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[600] p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[92vh]">

        {/* HEADER */}
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-8 pt-7 pb-0 flex-shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl transition-all"><X size={16}/></button>
          <div className="flex items-center gap-5 mb-5">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-2xl font-black text-white shadow-xl border-2 border-white/10 flex-shrink-0 relative`}>
              {initial}
              {loading&&<div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-white"/></div>}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-black text-white uppercase leading-tight tracking-tight truncate">{customer.name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Fingerprint size={11} className="text-slate-400"/>
                  {loading?<span className="text-[10px] font-bold text-slate-500 italic">Cargando datos completos...</span>
                          :<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{customer.documentType}: {customer.documentNumber||'Sin documento'}</span>}
                </div>
                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${customer.isActive?'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30':'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                  {customer.isActive?'Activo':'Inactivo'}
                </span>
                {customer.birthDate&&<span className="text-[9px] text-slate-500 font-bold">{calcAge(customer.birthDate)}</span>}
              </div>
              {!loading&&customer.clinicalHistory&&(
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 bg-white/10 rounded-full h-1 overflow-hidden max-w-[120px]"><div className={`h-1 rounded-full ${pColor(hcPct)}`} style={{width:`${hcPct}%`}}/></div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">HC {hcPct}%</span>
                </div>
              )}
              {loading&&<div className="flex items-center gap-2 mt-2"><div className="flex-1 bg-white/10 rounded-full h-1 overflow-hidden max-w-[120px]"><div className="h-1 rounded-full bg-white/20 animate-pulse w-full"/></div><span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">HC ...</span></div>}
            </div>
          </div>
          <div className="flex gap-0.5">
            {([{id:'info',label:'Ficha',icon:<User size={12}/>},{id:'edit',label:'Editar',icon:<Edit2 size={12}/>},{id:'clinical',label:'Hist. Clínica',icon:<Stethoscope size={12}/>}] as const).map(tab=>(
              <button key={tab.id} onClick={()=>!loading&&setActiveTab(tab.id)} disabled={loading}
                className={`flex items-center gap-1.5 px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-all rounded-t-xl disabled:opacity-40 disabled:cursor-not-allowed ${activeTab===tab.id?'bg-white text-slate-800':'text-slate-500 hover:text-white hover:bg-white/10'}`}>
                {tab.icon}{tab.label}
                {tab.id==='edit'&&dirty&&<span className="w-1.5 h-1.5 rounded-full bg-amber-400"/>}
                {tab.id==='clinical'&&<span className="bg-cyan-500/30 text-cyan-300 text-[7px] font-black px-1.5 py-0.5 rounded-full">{customer.clinicalHistory?`${hcPct}%`:'Nueva'}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* BODY */}
        <div className="overflow-y-auto flex-1 custom-scrollbar relative">
          {loading&&(
            <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
              <Loader2 size={28} className="animate-spin text-slate-400"/>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargando ficha completa...</p>
              <div className="w-64 space-y-2 mt-2">{[80,60,72,50,66].map((w,i)=><div key={i} className="h-2.5 bg-slate-200 rounded-full animate-pulse" style={{width:`${w}%`,animationDelay:`${i*80}ms`}}/>)}</div>
            </div>
          )}

          {/* TAB FICHA */}
          {activeTab==='info'&&(
            <div className="p-6 space-y-3">
              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Phone size={9}/> Contacto</p>
                <InfoRow icon={<Phone size={14}/>} label="Celular" value={customer.phone} accent/>
                <InfoRow icon={<Mail size={14}/>} label="Correo" value={customer.email}/>
                <InfoRow icon={<MapPin size={14}/>} label="Dirección" value={[customer.address,customer.city].filter(Boolean).join(', ')||undefined}/>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><User size={9}/> Datos personales</p>
                <InfoRow icon={<Calendar size={14}/>} label="Fecha de nacimiento" value={customer.birthDate?`${new Date(customer.birthDate).toLocaleDateString('es-CO',{day:'2-digit',month:'long',year:'numeric'})} · ${calcAge(customer.birthDate)}`:undefined}/>
                <InfoRow icon={<Fingerprint size={14}/>} label="Documento" value={customer.documentNumber?`${customer.documentType} ${customer.documentNumber}`:undefined} accent/>
                <InfoRow icon={<ShieldCheck size={14}/>} label="Responsabilidad fiscal" value={customer.fiscalResponsibility?(FISCAL_LABELS[customer.fiscalResponsibility]||customer.fiscalResponsibility):undefined}/>
                <InfoRow icon={<Star size={14}/>} label="Puntos de fidelización" value={customer.points?`${customer.points} puntos`:'0 puntos'}/>
              </div>
              <div className={`rounded-2xl p-4 border ${customer.clinicalHistory?'bg-cyan-50 border-cyan-100':'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Stethoscope size={16} className={customer.clinicalHistory?'text-cyan-500':'text-slate-300'}/>
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Historia Clínica</p>
                      <p className={`text-xs font-bold mt-0.5 ${customer.clinicalHistory?'text-cyan-600':'text-slate-400'}`}>
                        {customer.clinicalHistory?(customer.clinicalHistory.fechaUltimaActualizacion?`Actualizada: ${new Date(customer.clinicalHistory.fechaUltimaActualizacion).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'})}`:'Registrada'):'Sin historia clínica registrada'}
                      </p>
                    </div>
                  </div>
                  <button onClick={()=>setActiveTab('clinical')} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${customer.clinicalHistory?'bg-cyan-500 text-white hover:bg-cyan-600':'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}>
                    {customer.clinicalHistory?'Ver / Editar HC':'Crear HC'} <ChevronRight size={10}/>
                  </button>
                </div>
                {customer.clinicalHistory&&(<div className="mt-3"><div className="w-full bg-white/60 rounded-full h-1.5 overflow-hidden"><div className={`h-1.5 rounded-full transition-all ${pColor(hcPct)}`} style={{width:`${hcPct}%`}}/></div><p className="text-[8px] text-slate-400 font-medium mt-1">{hcPct}% completada · {Math.round(hcPct*14/100)}/14 secciones</p></div>)}
              </div>
            </div>
          )}

          {/* TAB EDITAR */}
          {activeTab==='edit'&&(
            <div className="p-6 space-y-5">
              {dirty&&<div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3"><AlertCircle size={14} className="text-amber-500 flex-shrink-0"/><p className="text-[10px] font-bold text-amber-700">Cambios sin guardar</p></div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><label className={labelCls}>Nombre completo / Razón social *</label><input type="text" className={inputCls+' uppercase font-bold'} value={name} onChange={e=>{setName(e.target.value);mark();}}/></div>
                <div><label className={labelCls}>Tipo de documento</label><select className={inputCls+' font-black uppercase text-xs'} value={documentType} onChange={e=>{setDocumentType(e.target.value as DocumentType);mark();}}>{Object.entries(Documents).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
                <div><label className={labelCls}>Número de documento</label><input type="text" className={inputCls+' font-black'} value={documentNumber} onChange={e=>{setDocumentNumber(e.target.value);mark();}}/></div>
                <div><label className={labelCls}>Celular *</label><input type="tel" className={inputCls} value={phone} onChange={e=>{setPhone(e.target.value);mark();}}/></div>
                <div><label className={labelCls}>Correo electrónico</label><input type="email" className={inputCls} value={email} onChange={e=>{setEmail(e.target.value);mark();}}/></div>
                <div><label className={labelCls}>Fecha de nacimiento</label><input type="date" className={inputCls} value={birthDate} onChange={e=>{setBirthDate(e.target.value);mark();}}/></div>
                <div><label className={labelCls}>Ciudad</label><input type="text" className={inputCls+' uppercase'} value={city} onChange={e=>{setCity(e.target.value);mark();}}/></div>
                <div className="sm:col-span-2"><label className={labelCls}>Dirección</label><input type="text" className={inputCls+' uppercase'} value={address} onChange={e=>{setAddress(e.target.value);mark();}}/></div>
                <div className="sm:col-span-2"><label className={labelCls+' flex items-center gap-1'}><ShieldCheck size={9}/> Responsabilidad fiscal</label><select className={inputCls+' font-black text-xs'} value={fiscalResponsibility} onChange={e=>{setFiscalResponsibility(e.target.value);mark();}}><option value="">Ninguna / No aplica</option><option value="R-99-PN">No responsable de IVA</option><option value="O-48">Impuesto sobre las ventas (IVA)</option><option value="O-47">Régimen simple de tributación</option><option value="O-05">Impuesto sobre la renta</option></select></div>
              </div>
            </div>
          )}

          {/* TAB HISTORIA CLÍNICA — idéntico a CustomersView */}
          {activeTab==='clinical'&&(
            <div className="p-4 space-y-3">

              {/* Barra de progreso */}
              <div className="bg-white border border-slate-100 rounded-2xl px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Completitud de la historia clínica</span>
                  <span className={`text-[11px] font-black ${ptColor(hcFormPct)}`}>{hcFormPct}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden"><div className={`h-2 rounded-full transition-all duration-500 ${pColor(hcFormPct)}`} style={{width:`${hcFormPct}%`}}/></div>
                <div className="flex justify-between mt-1">
                  <span className="text-[8px] text-slate-400">{hcFormPct===0?'Sin datos':hcFormPct<40?'Inicio':hcFormPct<70?'En progreso':hcFormPct<100?'Casi completa':'¡Completa!'}</span>
                  <span className="text-[8px] text-slate-400">{Math.round(hcFormPct*14/100)}/14 secciones</span>
                </div>
              </div>

              <SectionAccordion id="anamnesis" title="Anamnesis / Motivo de Consulta" icon={<ClipboardList size={14}/>} open={openSection==='anamnesis'} onToggle={()=>setOpenSection(p=>p==='anamnesis'?null:'anamnesis')}>
                <div><label className={cLb}>Motivo de Consulta</label><textarea rows={2} className={cTa} value={motivoConsulta} onChange={e=>setMotivoConsulta(e.target.value)} placeholder="¿Por qué viene el paciente?"/></div>
                <div><label className={cLb}>Enfermedad Actual / Historia del Problema</label><textarea rows={3} className={cTa} value={enfermedadActual} onChange={e=>setEnfermedadActual(e.target.value)} placeholder="Descripción detallada del problema actual..."/></div>
              </SectionAccordion>

              <SectionAccordion id="antecedentes" title="Antecedentes Médicos y Sistémicos" icon={<ShieldCheck size={14}/>} open={openSection==='antecedentes'} onToggle={()=>setOpenSection(p=>p==='antecedentes'?null:'antecedentes')}>
                <div>
                  <label className={cLb}>Antecedentes Sistémicos (marcar los que aplican)</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {Object.entries({diabetes:'Diabetes',hipertension:'Hipertensión',cardiopatia:'Cardiopatía',asma:'Asma / EPOC',epilepsia:'Epilepsia',coagulopatia:'Coagulopatía',vih:'VIH / SIDA',embarazo:'Embarazo',alergias:'Alergias'}).map(([key,label])=>(
                      <button key={key} type="button" onClick={()=>setAntSistemicosList(prev=>({...prev,[key]:!prev[key]}))} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${antSistemicosList[key]?'bg-red-50 border-red-200 text-red-700':'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}>
                        {antSistemicosList[key]?<CheckSquare size={12}/>:<Square size={12}/>}{label}
                      </button>
                    ))}
                  </div>
                </div>
                {antSistemicosList.alergias&&<div><label className={cLb}>Detalle de Alergias</label><input type="text" className={cIn} value={alergiaDetalle} onChange={e=>setAlergiaDetalle(e.target.value)} placeholder="Medicamentos, látex, anestésicos..."/></div>}
                <div><label className={cLb}>Otros Antecedentes Sistémicos</label><input type="text" className={cIn} value={otrosAntSistemicos} onChange={e=>setOtrosAntSistemicos(e.target.value)} placeholder="Enfermedades no listadas arriba..."/></div>
                <div><label className={cLb}>Medicamentos Actuales</label><textarea rows={2} className={cTa} value={medicamentosActuales} onChange={e=>setMedicamentosActuales(e.target.value)} placeholder="Nombre, dosis, frecuencia..."/></div>
                <div><label className={cLb}>Antecedentes Odontológicos</label><textarea rows={2} className={cTa} value={antecedentesOdonto} onChange={e=>setAntecedentesOdonto(e.target.value)} placeholder="Tratamientos previos, extracciones, ortodoncia..."/></div>
              </SectionAccordion>

              <SectionAccordion id="habitos" title="Hábitos Parafuncionales" icon={<User size={14}/>} open={openSection==='habitos'} onToggle={()=>setOpenSection(p=>p==='habitos'?null:'habitos')}>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={()=>setHabitosBruxismo(!habitosBruxismo)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${habitosBruxismo?'bg-amber-50 border-amber-200 text-amber-700':'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}>{habitosBruxismo?<CheckSquare size={12}/>:<Square size={12}/>} Bruxismo</button>
                  <button type="button" onClick={()=>setHabitosFumador(!habitosFumador)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${habitosFumador?'bg-amber-50 border-amber-200 text-amber-700':'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}>{habitosFumador?<CheckSquare size={12}/>:<Square size={12}/>} Fumador</button>
                </div>
                <div><label className={cLb}>Onicofagia / Succión de Dedo u otros hábitos</label><input type="text" className={cIn} value={habitosOnicoFagia} onChange={e=>setHabitosOnicoFagia(e.target.value)} placeholder="Descripción..."/></div>
                <div><label className={cLb}>Otros Hábitos</label><input type="text" className={cIn} value={habitosOtros} onChange={e=>setHabitosOtros(e.target.value)}/></div>
              </SectionAccordion>

              <SectionAccordion id="signos" title="Signos Vitales" icon={<Stethoscope size={14}/>} open={openSection==='signos'} onToggle={()=>setOpenSection(p=>p==='signos'?null:'signos')}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><label className={cLb}>T/A (mmHg)</label><input type="text" className={cIn} value={signos.ta} onChange={e=>setSignos(p=>({...p,ta:e.target.value}))} placeholder="120/80"/></div>
                  <div><label className={cLb}>FC (lpm)</label><input type="text" className={cIn} value={signos.fc} onChange={e=>setSignos(p=>({...p,fc:e.target.value}))} placeholder="72"/></div>
                  <div><label className={cLb}>FR (rpm)</label><input type="text" className={cIn} value={signos.fr} onChange={e=>setSignos(p=>({...p,fr:e.target.value}))} placeholder="16"/></div>
                  <div><label className={cLb}>Temp (°C)</label><input type="text" className={cIn} value={signos.temp} onChange={e=>setSignos(p=>({...p,temp:e.target.value}))} placeholder="36.5"/></div>
                </div>
              </SectionAccordion>

              <SectionAccordion id="examen" title="Examen Clínico" icon={<Search size={14}/>} open={openSection==='examen'} onToggle={()=>setOpenSection(p=>p==='examen'?null:'examen')}>
                <div><label className={cLb}>Examen Extraoral</label><textarea rows={3} className={cTa} value={examenExtraoral} onChange={e=>setExamenExtraoral(e.target.value)} placeholder="ATM, ganglios, asimetría facial, perfil, labios..."/></div>
                <div><label className={cLb}>Examen Intraoral</label><textarea rows={3} className={cTa} value={examenIntraoral} onChange={e=>setExamenIntraoral(e.target.value)} placeholder="Mucosas, lengua, paladar, encías, piso de boca..."/></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><label className={cLb}>Índice de Higiene Oral</label><input type="text" className={cIn} value={indiceHigiene} onChange={e=>setIndiceHigiene(e.target.value)} placeholder="0.0 - 3.0"/></div>
                  <div><label className={cLb}>Índice Gingival</label><input type="text" className={cIn} value={indiceGingival} onChange={e=>setIndiceGingival(e.target.value)} placeholder="0 - 3"/></div>
                  <div><label className={cLb}>Clasificación de Angle</label><select className={cIn} value={clasificacionAngle} onChange={e=>setClasificacionAngle(e.target.value)}><option value="">Seleccionar</option><option value="Clase I">Clase I</option><option value="Clase II Div 1">Clase II Div. 1</option><option value="Clase II Div 2">Clase II Div. 2</option><option value="Clase III">Clase III</option></select></div>
                </div>
              </SectionAccordion>

              <SectionAccordion id="odontograma" title="Odontograma Dental — 5 Caras" icon={<ClipboardList size={14}/>} open={openSection==='odontograma'} onToggle={()=>setOpenSection(p=>p==='odontograma'?null:'odontograma')}>
                {selectedTooth!==null&&(
                  <div className="bg-slate-900 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-cyan-900 border border-cyan-600 rounded-xl flex items-center justify-center text-[10px] font-black text-cyan-300">{selectedTooth}</div>
                        <div><p className="text-[10px] font-black text-white uppercase tracking-widest">Diente {selectedTooth}</p><p className="text-[9px] text-slate-400">{selectedFace?`Cara: ${FACE_LABELS[selectedFace]}`:'Selecciona una cara o aplica condición global'}</p></div>
                      </div>
                      <div className="flex gap-1.5">
                        <button type="button" onClick={()=>clearTooth(selectedTooth)} className="text-[9px] font-black text-red-400 hover:text-red-300 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 uppercase tracking-wider">Limpiar</button>
                        <button type="button" onClick={()=>{setSelectedTooth(null);setSelectedFace(null);}} className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-lg"><X size={13}/></button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <p className="w-full text-[8px] font-black text-slate-500 uppercase tracking-widest">Seleccionar cara:</p>
                      {FACES.map(f=>(<button key={f} type="button" onClick={()=>setSelectedFace(selectedFace===f?null:f)} className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${selectedFace===f?'bg-cyan-600 border-cyan-500 text-white':'bg-slate-800 border-slate-700 text-slate-400 hover:border-cyan-700 hover:text-cyan-300'}`}>{f} <span className="font-normal normal-case text-[8px] opacity-70">— {FACE_LABELS[f].split('/')[0]}</span></button>))}
                    </div>
                    {selectedFace&&(
                      <div className="space-y-1.5">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Condición para cara {FACE_LABELS[selectedFace]}:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(CONDITIONS).map(([key,meta])=>{const cur=odontograma[selectedTooth]?.[selectedFace]||'';const isAct=cur===key;return(<button key={key} type="button" onClick={()=>setFaceCondition(selectedTooth,selectedFace,key)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[9px] font-black border-2 transition-all" style={{backgroundColor:isAct?meta.color:'#1e293b',borderColor:isAct?meta.stroke:(key?meta.stroke+'44':'#334155'),color:isAct?meta.label:(key?meta.color:'#475569')}}><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor:key?meta.stroke:'#334155'}}/>{key||'— Sin hallazgo'}</button>);})}
                        </div>
                      </div>
                    )}
                    <div className="space-y-1.5 border-t border-slate-700 pt-3">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Estado global del diente:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(GLOBAL_CONDITIONS).map(([key,meta])=>{const isAct=getGlobalStatus(selectedTooth)===key;return(<button key={key} type="button" onClick={()=>setGlobalCond(selectedTooth,isAct?'':key)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black border-2 transition-all" style={{backgroundColor:isAct?meta.color:'#1e293b',borderColor:isAct?meta.stroke:meta.stroke+'44',color:isAct?meta.label:meta.color}}><span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:meta.stroke}}/>{key}</button>);})}
                      </div>
                    </div>
                  </div>
                )}
                <div className="bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-100 p-4 overflow-x-auto">
                  <div className="flex justify-center mb-1"><div className="flex gap-3 items-center"><span className="text-[7px] font-black text-slate-300 uppercase tracking-[0.15em]">Cuad. I (18→11)</span><div className="w-px h-3 bg-slate-200"/><span className="text-[7px] font-black text-slate-300 uppercase tracking-[0.15em]">Cuad. II (21→28)</span></div></div>
                  <div className="flex justify-end mb-0.5 pr-1"><span className="text-[7px] text-slate-300 font-bold italic">↑ Vestibular</span></div>
                  <div className="flex items-end justify-center gap-[3px]">
                    <div className="flex items-end gap-[3px]">{[18,17,16,15,14,13,12,11].map(t=><ToothDiagram key={t} num={t} isUpper={true}/>)}</div>
                    <div className="self-stretch mx-1 flex flex-col items-center justify-center"><div className="w-px flex-1 bg-slate-200"/><div className="w-2 h-2 rounded-full bg-slate-300 my-1"/><div className="w-px flex-1 bg-slate-200"/></div>
                    <div className="flex items-end gap-[3px]">{[21,22,23,24,25,26,27,28].map(t=><ToothDiagram key={t} num={t} isUpper={true}/>)}</div>
                  </div>
                  <div className="flex items-center gap-2 my-2"><div className="h-[1.5px] flex-1 bg-slate-200 rounded"/><span className="text-[7px] font-black text-slate-300 uppercase tracking-[0.15em] whitespace-nowrap px-1">Plano Oclusal</span><div className="h-[1.5px] flex-1 bg-slate-200 rounded"/></div>
                  <div className="flex items-start justify-center gap-[3px]">
                    <div className="flex items-start gap-[3px]">{[48,47,46,45,44,43,42,41].map(t=><ToothDiagram key={t} num={t} isUpper={false}/>)}</div>
                    <div className="self-stretch mx-1 flex flex-col items-center justify-center"><div className="w-px flex-1 bg-slate-200"/><div className="w-2 h-2 rounded-full bg-slate-300 my-1"/><div className="w-px flex-1 bg-slate-200"/></div>
                    <div className="flex items-start gap-[3px]">{[31,32,33,34,35,36,37,38].map(t=><ToothDiagram key={t} num={t} isUpper={false}/>)}</div>
                  </div>
                  <div className="flex justify-end mt-0.5 pr-1"><span className="text-[7px] text-slate-300 font-bold italic">↓ Vestibular</span></div>
                  <div className="flex justify-center mt-1"><div className="flex gap-3 items-center"><span className="text-[7px] font-black text-slate-300 uppercase tracking-[0.15em]">Cuad. IV (48→41)</span><div className="w-px h-3 bg-slate-200"/><span className="text-[7px] font-black text-slate-300 uppercase tracking-[0.15em]">Cuad. III (31→38)</span></div></div>
                  <p className="text-center text-[9px] text-slate-400 font-medium mt-2 italic">Vista oclusal · Toca un diente, luego selecciona cara y condición</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Condiciones por cara:</p>
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-1">{Object.entries(CONDITIONS).filter(([k])=>k).map(([key,meta])=>(<div key={key} className="flex flex-col items-center gap-1 p-2 rounded-xl border text-center" style={{backgroundColor:meta.color+'aa',borderColor:meta.stroke+'66'}}><div className="w-3 h-3 rounded-full" style={{backgroundColor:meta.stroke}}/><span className="text-[8px] font-black" style={{color:meta.label}}>{key}</span></div>))}</div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2 mb-1">Estados globales:</p>
                  <div className="flex gap-2">{Object.entries(GLOBAL_CONDITIONS).map(([key,meta])=>(<div key={key} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[9px] font-black" style={{backgroundColor:meta.color,borderColor:meta.stroke+'88',color:meta.label}}><div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:meta.stroke}}/>{key}</div>))}</div>
                </div>
                {Object.keys(odontograma).length>0&&(
                  <div className="rounded-2xl border border-slate-100 overflow-hidden">
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between"><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Hallazgos registrados</span><span className="text-[9px] font-black bg-white text-slate-400 px-2 py-0.5 rounded-lg border border-slate-100">{Object.keys(odontograma).length} diente{Object.keys(odontograma).length!==1?'s':''}</span></div>
                    <div className="p-3 space-y-1.5 bg-white max-h-48 overflow-y-auto">
                      {Object.entries(odontograma).sort(([a],[b])=>Number(a)-Number(b)).map(([tooth,faces])=>{
                        const global=faces['GLOBAL'];const faceConds=Object.entries(faces).filter(([f,v])=>f!=='GLOBAL'&&v);
                        return(<div key={tooth} className="flex items-center gap-2 p-2 rounded-xl border border-slate-100 cursor-pointer hover:border-cyan-200 hover:bg-cyan-50 transition-all" onClick={()=>{setSelectedTooth(Number(tooth));setSelectedFace(null);}}><span className="text-[10px] font-black text-slate-600 w-6 text-center bg-slate-100 rounded-lg py-0.5">{tooth}</span>{global&&(<span className="text-[9px] font-black px-2 py-0.5 rounded-lg border" style={{backgroundColor:GLOBAL_CONDITIONS[global]?.color,borderColor:GLOBAL_CONDITIONS[global]?.stroke+'88',color:GLOBAL_CONDITIONS[global]?.label}}>{global}</span>)}{faceConds.map(([face,cond])=>(<span key={face} className="text-[8px] font-black px-1.5 py-0.5 rounded-md border flex items-center gap-1" style={{backgroundColor:CONDITIONS[cond as string]?.color,borderColor:CONDITIONS[cond as string]?.stroke+'66',color:CONDITIONS[cond as string]?.label}}>{face}: {cond}</span>))}</div>);
                      })}
                    </div>
                  </div>
                )}
              </SectionAccordion>

              <SectionAccordion id="diagnostico" title="Diagnóstico" icon={<Briefcase size={14}/>} open={openSection==='diagnostico'} onToggle={()=>setOpenSection(p=>p==='diagnostico'?null:'diagnostico')}>
                <div><label className={cLb}>Diagnóstico</label><textarea rows={3} className={cTa} value={diagnosticoDetalle} onChange={e=>setDiagnosticoDetalle(e.target.value)} placeholder="Diagnóstico presuntivo y definitivo..."/></div>
                <div><label className={cLb}>Pronóstico</label><select className={cIn} value={pronostico} onChange={e=>setPronostico(e.target.value)}><option value="">Seleccionar pronóstico</option><option value="Bueno">Bueno</option><option value="Regular">Regular</option><option value="Reservado">Reservado</option><option value="Malo">Malo</option></select></div>
                <div><label className={cLb}>Observaciones Generales</label><textarea rows={2} className={cTa} value={observacionesGral} onChange={e=>setObservacionesGral(e.target.value)} placeholder="Notas adicionales relevantes..."/></div>
              </SectionAccordion>

              <SectionAccordion id="consentimiento" title="Consentimiento Informado" icon={<ShieldCheck size={14}/>} open={openSection==='consentimiento'} onToggle={()=>setOpenSection(p=>p==='consentimiento'?null:'consentimiento')}>
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">El/la paciente <strong>{customer.name}</strong>, identificado/a con {customer.documentType} N° <strong>{customer.documentNumber}</strong>, declara haber sido informado/a sobre su diagnóstico, opciones de tratamiento, riesgos y beneficios de los procedimientos odontológicos a realizar, y autoriza al profesional tratante a ejecutar el plan de tratamiento propuesto.</p>
                  <button type="button" onClick={()=>setConsentimientoInfo(!consentimientoInfo)}
                    className={`mt-4 flex items-center gap-3 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider border-2 transition-all w-full justify-center ${consentimientoInfo?'bg-emerald-50 border-emerald-300 text-emerald-700':'bg-white border-slate-200 text-slate-500 hover:border-emerald-200'}`}>
                    {consentimientoInfo?<CheckSquare size={16}/>:<Square size={16}/>}
                    {consentimientoInfo?'Consentimiento Firmado ✓':'Marcar como Firmado'}
                  </button>
                </div>
              </SectionAccordion>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex gap-3 flex-shrink-0">
          {activeTab==='edit'?(
            <>
              <button type="button" onClick={()=>{setActiveTab('info');setDirty(false);}} className="flex-1 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all">Cancelar</button>
              <button type="button" onClick={handleSave} disabled={saving||!dirty} className="flex-1 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {saving?<><Loader2 size={14} className="animate-spin"/> Guardando...</>:<><Save size={14}/> Guardar cambios</>}
              </button>
            </>
          ):activeTab==='clinical'?(
            <button type="button" onClick={handleSaveClinical} disabled={savingClinical}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-cyan-100 uppercase tracking-[0.2em] text-xs active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed">
              {savingClinical?<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Guardando...</>:<><Save size={16}/> Guardar Historia Clínica</>}
            </button>
          ):(
            <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest transition-all">Cerrar</button>
          )}
        </div>
      </div>
    </div>
  );
};