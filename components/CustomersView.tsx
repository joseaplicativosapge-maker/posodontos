import React, { useState } from 'react';
import { Customer, DocumentType, Documents } from '../types';
import { Users, Search, Plus, Phone, MapPin, Mail, X, Save, Trash2, Edit2, RotateCcw, Archive, Star, Fingerprint, ShieldCheck, Download, Printer, Building2, User, Calendar, Briefcase, Stethoscope, ClipboardList, ChevronDown, ChevronUp, CheckSquare, Square } from 'lucide-react';
import { useNotification } from './NotificationContext';
// ── CAMBIO 1: importar dataService para la ruta dedicada de historia clínica ──
import { dataService } from '../services/data.service';

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
  const [fiscalResponsibility, setFiscalResponsibility] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [isClinicalModalOpen, setIsClinicalModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // ── CAMBIO 2: estado de guardado para el botón con loading ────────────────
  const [savingClinical, setSavingClinical] = useState(false);

  const [motivoConsulta, setMotivoConsulta] = useState('');
  const [enfermedadActual, setEnfermedadActual] = useState('');
  const [antecedentesMedicos, setAntecedentesMedicos] = useState('');
  const [antecedentesOdontologicos, setAntecedentesOdontologicos] = useState('');
  const [examenExtraoral, setExamenExtraoral] = useState('');
  const [examenIntraoral, setExamenIntraoral] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [planTratamiento, setPlanTratamiento] = useState('');
  const [consentimientoFirmado, setConsentimientoFirmado] = useState(false);

  const [openSection, setOpenSection] = useState<string | null>('anamnesis');

  const [antSistemicosList, setAntSistemicosList] = useState<Record<string, boolean>>({
    diabetes: false,
    hipertension: false,
    cardiopatia: false,
    asma: false,
    epilepsia: false,
    coagulopatia: false,
    vih: false,
    embarazo: false,
    alergias: false,
  });
  const [otrosAntSistemicos, setOtrosAntSistemicos] = useState('');
  const [alergiaDetalle, setAlergiaDetalle] = useState('');
  const [medicamentosActuales, setMedicamentosActuales] = useState('');

  const [habitosBruxismo, setHabitosBruxismo] = useState(false);
  const [habitosFumador, setHabitosFumador] = useState(false);
  const [habitosOnicoFagia, setHabitosOnicoFagia] = useState('');
  const [habitosOtros, setHabitosOtros] = useState('');

  const [signos, setSignos] = useState({ ta: '', fc: '', fr: '', temp: '' });
  const [examenExtraoralDetalle, setExamenExtraoralDetalle] = useState('');
  const [examenIntraoralDetalle, setExamenIntraoralDetalle] = useState('');
  const [indiceHigiene, setIndiceHigiene] = useState('');
  const [indiceGingival, setIndiceGingival] = useState('');
  const [clasificacionAngle, setClasificacionAngle] = useState('');

  const [odontograma, setOdontograma] = useState<Record<number, Record<string, string>>>({});
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [selectedFace, setSelectedFace] = useState<string | null>(null);

  const [diagnosticoDetalle, setDiagnosticoDetalle] = useState('');
  const [planTratamientoDetalle, setPlanTratamientoDetalle] = useState('');
  const [pronóstico, setPronóstico] = useState('');
  const [consentimientoInformado, setConsentimientoInformado] = useState(false);
  const [observacionesGenerales, setObservacionesGenerales] = useState('');

  // ── ODONTOGRAMA ────────────────────────────────────────────────────────────
  const CONDITIONS: Record<string, { color: string; stroke: string; label: string; short: string }> = {
    '':           { color: '#f1f5f9', stroke: '#cbd5e1', label: '#94a3b8', short: '' },
    'Sano':       { color: '#bbf7d0', stroke: '#22c55e', label: '#14532d', short: 'S' },
    'Caries':     { color: '#fca5a5', stroke: '#ef4444', label: '#7f1d1d', short: 'C' },
    'Obturado':   { color: '#93c5fd', stroke: '#3b82f6', label: '#1e3a8a', short: 'Ob' },
    'Corona':     { color: '#d8b4fe', stroke: '#9333ea', label: '#4c1d95', short: 'Cr' },
    'Endodoncia': { color: '#f9a8d4', stroke: '#ec4899', label: '#831843', short: 'En' },
    'Fractura':   { color: '#fde68a', stroke: '#eab308', label: '#713f12', short: 'Fr' },
    'Desgaste':   { color: '#fed7aa', stroke: '#f97316', label: '#7c2d12', short: 'Dg' },
  };
  const GLOBAL_CONDITIONS: Record<string, { color: string; stroke: string; label: string }> = {
    'Ausente':    { color: '#e2e8f0', stroke: '#94a3b8', label: '#334155' },
    'Extracción': { color: '#fecaca', stroke: '#dc2626', label: '#7f1d1d' },
    'Implante':   { color: '#bfdbfe', stroke: '#3b82f6', label: '#1e3a8a' },
  };
  const FACE_LABELS: Record<string, string> = { O:'Oclusal/Incisal', V:'Vestibular', L:'Lingual/Palatino', M:'Mesial', D:'Distal' };
  const FACES = ['O','V','L','M','D'];

  const getGlobalStatus  = (num: number) => odontograma[num]?.['GLOBAL'] || '';
  const getFaceColor     = (num: number, face: string) => {
    const g = getGlobalStatus(num);
    if (g) return GLOBAL_CONDITIONS[g]?.color || '#e2e8f0';
    const cond = odontograma[num]?.[face] || '';
    return CONDITIONS[cond]?.color || CONDITIONS[''].color;
  };
  const getFaceStroke    = (num: number, face: string) => {
    const g = getGlobalStatus(num);
    if (g) return GLOBAL_CONDITIONS[g]?.stroke || '#94a3b8';
    const cond = odontograma[num]?.[face] || '';
    return CONDITIONS[cond]?.stroke || CONDITIONS[''].stroke;
  };
  const hasAnyCondition  = (num: number) => { const t = odontograma[num]; if (!t) return false; return Object.values(t).some(v => !!v); };
  const setFaceCondition = (num: number, face: string, cond: string) => setOdontograma(prev => ({ ...prev, [num]: { ...(prev[num] || {}), [face]: cond } }));
  const setGlobalCondition = (num: number, cond: string) => setOdontograma(prev => ({ ...prev, [num]: { ...(prev[num] || {}), GLOBAL: cond } }));
  const clearTooth       = (num: number) => setOdontograma(prev => { const n = {...prev}; delete n[num]; return n; });

  const ToothDiagram = ({ num, isUpper }: { num: number; isUpper: boolean }) => {
    const isSelected  = selectedTooth === num;
    const globalStatus = getGlobalStatus(num);
    const isAbsent    = globalStatus === 'Ausente' || globalStatus === 'Extracción';
    const isImplant   = globalStatus === 'Implante';
    const isMolar     = [16,17,18,26,27,28,36,37,38,46,47,48].includes(num);
    const S = isMolar ? 46 : 36; const C = S/2; const innerHalf = S*0.175; const ci = C-innerHalf; const innerSize = innerHalf*2; const bg = 2;
    const topFace = isUpper ? 'V' : 'L'; const bottomFace = isUpper ? 'L' : 'V';
    const colO = getFaceColor(num,'O'); const colT = getFaceColor(num,topFace); const colB = getFaceColor(num,bottomFace);
    const colM = getFaceColor(num,'M'); const colD = getFaceColor(num,'D'); const strO = getFaceStroke(num,'O');
    const hlColor = '#0891b2'; const hasData = hasAnyCondition(num);
    const borderColor = isSelected ? hlColor : hasData ? '#475569' : '#cbd5e1'; const borderW = isSelected ? 2 : 1;
    return (
      <div className={`flex flex-col items-center gap-0.5 cursor-pointer select-none transition-transform duration-100 ${isSelected ? 'z-10 relative' : ''}`}
        onClick={() => { setSelectedTooth(isSelected ? null : num); setSelectedFace(null); }}>
        {isUpper && <span className={`text-[7px] font-black tabular-nums leading-none ${isSelected ? 'text-cyan-600' : 'text-slate-400'}`}>{num}</span>}
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ overflow: 'visible' }}
          className={`transition-all duration-150 ${isSelected ? 'scale-[1.35] drop-shadow-lg' : 'hover:scale-110'}`}>
          {isAbsent ? (<>
            <rect x={bg} y={bg} width={S-bg*2} height={S-bg*2} rx="5" fill={GLOBAL_CONDITIONS[globalStatus].color} stroke={GLOBAL_CONDITIONS[globalStatus].stroke} strokeWidth="1.5"/>
            <line x1={bg+4} y1={bg+4} x2={S-bg-4} y2={S-bg-4} stroke={GLOBAL_CONDITIONS[globalStatus].stroke} strokeWidth="2" strokeLinecap="round"/>
            <line x1={S-bg-4} y1={bg+4} x2={bg+4} y2={S-bg-4} stroke={GLOBAL_CONDITIONS[globalStatus].stroke} strokeWidth="2" strokeLinecap="round"/>
          </>) : isImplant ? (<>
            <rect x={bg} y={bg} width={S-bg*2} height={S-bg*2} rx="5" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5"/>
            <rect x={C-3.5} y={bg+5} width="7" height={S-bg*2-10} rx="3.5" fill="#3b82f6" opacity="0.65"/>
            <line x1={C-8} y1={C-5} x2={C+8} y2={C-5} stroke="#2563eb" strokeWidth="1.2"/>
            <line x1={C-8} y1={C+2} x2={C+8} y2={C+2} stroke="#2563eb" strokeWidth="1.2"/>
          </>) : (<>
            <rect x={bg} y={bg} width={S-bg*2} height={S-bg*2} rx="5" fill="#f8fafc" stroke={borderColor} strokeWidth={borderW}/>
            <polygon points={`${bg},${bg} ${S-bg},${bg} ${ci+innerSize},${ci} ${ci},${ci}`} fill={colT} stroke="white" strokeWidth="0.6" style={{cursor:'pointer'}} onClick={e=>{e.stopPropagation();setSelectedTooth(num);setSelectedFace(topFace);}}/>
            <polygon points={`${ci},${ci+innerSize} ${ci+innerSize},${ci+innerSize} ${S-bg},${S-bg} ${bg},${S-bg}`} fill={colB} stroke="white" strokeWidth="0.6" style={{cursor:'pointer'}} onClick={e=>{e.stopPropagation();setSelectedTooth(num);setSelectedFace(bottomFace);}}/>
            <polygon points={`${bg},${bg} ${ci},${ci} ${ci},${ci+innerSize} ${bg},${S-bg}`} fill={colM} stroke="white" strokeWidth="0.6" style={{cursor:'pointer'}} onClick={e=>{e.stopPropagation();setSelectedTooth(num);setSelectedFace('M');}}/>
            <polygon points={`${ci+innerSize},${ci} ${S-bg},${bg} ${S-bg},${S-bg} ${ci+innerSize},${ci+innerSize}`} fill={colD} stroke="white" strokeWidth="0.6" style={{cursor:'pointer'}} onClick={e=>{e.stopPropagation();setSelectedTooth(num);setSelectedFace('D');}}/>
            <rect x={ci} y={ci} width={innerSize} height={innerSize} rx="2.5" fill={colO} stroke={strO} strokeWidth="1" style={{cursor:'pointer'}} onClick={e=>{e.stopPropagation();setSelectedTooth(num);setSelectedFace('O');}}/>
            <line x1={bg} y1={bg} x2={ci} y2={ci} stroke="white" strokeWidth="0.8"/>
            <line x1={S-bg} y1={bg} x2={ci+innerSize} y2={ci} stroke="white" strokeWidth="0.8"/>
            <line x1={bg} y1={S-bg} x2={ci} y2={ci+innerSize} stroke="white" strokeWidth="0.8"/>
            <line x1={S-bg} y1={S-bg} x2={ci+innerSize} y2={ci+innerSize} stroke="white" strokeWidth="0.8"/>
            {isSelected && selectedFace===topFace && <polygon points={`${bg},${bg} ${S-bg},${bg} ${ci+innerSize},${ci} ${ci},${ci}`} fill="none" stroke={hlColor} strokeWidth="1.8" strokeLinejoin="round"/>}
            {isSelected && selectedFace===bottomFace && <polygon points={`${ci},${ci+innerSize} ${ci+innerSize},${ci+innerSize} ${S-bg},${S-bg} ${bg},${S-bg}`} fill="none" stroke={hlColor} strokeWidth="1.8" strokeLinejoin="round"/>}
            {isSelected && selectedFace==='M' && <polygon points={`${bg},${bg} ${ci},${ci} ${ci},${ci+innerSize} ${bg},${S-bg}`} fill="none" stroke={hlColor} strokeWidth="1.8" strokeLinejoin="round"/>}
            {isSelected && selectedFace==='D' && <polygon points={`${ci+innerSize},${ci} ${S-bg},${bg} ${S-bg},${S-bg} ${ci+innerSize},${ci+innerSize}`} fill="none" stroke={hlColor} strokeWidth="1.8" strokeLinejoin="round"/>}
            {isSelected && selectedFace==='O' && <rect x={ci-1} y={ci-1} width={innerSize+2} height={innerSize+2} rx="3.5" fill="none" stroke={hlColor} strokeWidth="2"/>}
          </>)}
          {isSelected && <rect x="0.5" y="0.5" width={S-1} height={S-1} rx="6" fill="none" stroke={hlColor} strokeWidth="2" strokeDasharray="4 2.5" opacity="0.7"/>}
        </svg>
        {!isUpper && <span className={`text-[7px] font-black tabular-nums leading-none ${isSelected ? 'text-cyan-600' : 'text-slate-400'}`}>{num}</span>}
      </div>
    );
  };

  const resetForm = () => {
    setEditingId(null); setName(''); setPhone(''); setEmail(''); setAddress('');
    setDocumentType('CC'); setDocumentNumber(''); setCity('');
    setFiscalResponsibility(''); setBirthDate('');
  };

  const resetClinicalForm = () => {
    setMotivoConsulta(''); setEnfermedadActual(''); setAntecedentesMedicos(''); setAntecedentesOdontologicos('');
    setExamenExtraoral(''); setExamenIntraoral(''); setDiagnostico(''); setPlanTratamiento(''); setConsentimientoFirmado(false);
    setOpenSection('anamnesis');
    setAntSistemicosList({ diabetes:false,hipertension:false,cardiopatia:false,asma:false,epilepsia:false,coagulopatia:false,vih:false,embarazo:false,alergias:false });
    setOtrosAntSistemicos(''); setAlergiaDetalle(''); setMedicamentosActuales('');
    setHabitosBruxismo(false); setHabitosFumador(false); setHabitosOnicoFagia(''); setHabitosOtros('');
    setSignos({ ta:'',fc:'',fr:'',temp:'' });
    setExamenExtraoralDetalle(''); setExamenIntraoralDetalle(''); setIndiceHigiene(''); setIndiceGingival(''); setClasificacionAngle('');
    setOdontograma({}); setDiagnosticoDetalle(''); setPlanTratamientoDetalle(''); setPronóstico('');
    setConsentimientoInformado(false); setObservacionesGenerales('');
    setSelectedTooth(null); setSelectedFace(null);
  };

  const handleOpenClinicalModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    resetClinicalForm();
    if (customer.clinicalHistory) {
      const ch = customer.clinicalHistory;
      setMotivoConsulta(ch.motivoConsulta || ''); setEnfermedadActual(ch.enfermedadActual || '');
      setAntecedentesMedicos(ch.antecedentesMedicos || ''); setAntecedentesOdontologicos(ch.antecedentesOdontologicos || '');
      setExamenExtraoral(ch.examenExtraoral || ''); setExamenIntraoral(ch.examenIntraoral || '');
      setDiagnostico(ch.diagnostico || ''); setPlanTratamiento(ch.planTratamiento || '');
      setConsentimientoFirmado(ch.consentimientoFirmado || false);
      if (ch.antSistemicosList) setAntSistemicosList(ch.antSistemicosList);
      setOtrosAntSistemicos(ch.otrosAntSistemicos || ''); setAlergiaDetalle(ch.alergiaDetalle || '');
      setMedicamentosActuales(ch.medicamentosActuales || '');
      setHabitosBruxismo(ch.habitosBruxismo || false); setHabitosFumador(ch.habitosFumador || false);
      setHabitosOnicoFagia(ch.habitosOnicoFagia || ''); setHabitosOtros(ch.habitosOtros || '');
      if (ch.signos) setSignos(ch.signos);
      setExamenExtraoralDetalle(ch.examenExtraoralDetalle || ''); setExamenIntraoralDetalle(ch.examenIntraoralDetalle || '');
      setIndiceHigiene(ch.indiceHigiene || ''); setIndiceGingival(ch.indiceGingival || ''); setClasificacionAngle(ch.clasificacionAngle || '');
      if (ch.odontograma) setOdontograma(ch.odontograma);
      setDiagnosticoDetalle(ch.diagnosticoDetalle || ''); setPlanTratamientoDetalle(ch.planTratamientoDetalle || '');
      setPronóstico(ch.pronóstico || ''); setConsentimientoInformado(ch.consentimientoInformado || false);
      setObservacionesGenerales(ch.observacionesGenerales || '');
    }
    setIsClinicalModalOpen(true);
  };

  // ── CAMBIO 3: handleSaveClinicalHistory async — llama la ruta dedicada ─────
  const handleSaveClinicalHistory = async () => {
    if (!selectedCustomer) return;
    setSavingClinical(true);

    const clinicalHistory = {
      motivoConsulta, enfermedadActual, antecedentesMedicos, antecedentesOdontologicos,
      examenExtraoral, examenIntraoral, diagnostico, planTratamiento, consentimientoFirmado,
      antSistemicosList, otrosAntSistemicos, alergiaDetalle, medicamentosActuales,
      habitosBruxismo, habitosFumador, habitosOnicoFagia, habitosOtros,
      signos, examenExtraoralDetalle, examenIntraoralDetalle,
      indiceHigiene, indiceGingival, clasificacionAngle,
      odontograma, diagnosticoDetalle, planTratamientoDetalle,
      pronóstico, consentimientoInformado, observacionesGenerales,
      fechaUltimaActualizacion: new Date().toISOString(),
    };

    try {
      // Llama PUT /customers/:id/clinical-history directamente
      await dataService.saveClinicalHistory(selectedCustomer.id, clinicalHistory);
      // Notifica al App para actualizar el estado local sin recargar toda la lista
      onUpdateCustomer({ ...selectedCustomer, clinicalHistory });
      notify('Historia clínica guardada correctamente.', 'success');
      setIsClinicalModalOpen(false);
    } catch (e) {
      notify('Error al guardar la historia clínica. Intenta de nuevo.', 'error');
      console.error('[clinical] save error:', e);
    } finally {
      setSavingClinical(false);
    }
  };

  const toggleSection = (section: string) => setOpenSection(prev => prev === section ? null : section);

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingId(customer.id); setName(customer.name); setPhone(customer.phone);
      setEmail(customer.email || ''); setAddress(customer.address || '');
      setDocumentType(customer.documentType || 'CC'); setDocumentNumber(customer.documentNumber || '');
      setCity(customer.city || ''); setFiscalResponsibility(customer.fiscalResponsibility || '');
      setBirthDate(customer.birthDate ? new Date(customer.birthDate).toISOString().slice(0, 10) : '');
    } else { resetForm(); }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const customerData = { name: name.toUpperCase(), phone, email, address, documentType, documentNumber, city, fiscalResponsibility, birthDate, currentCompanyId };
    if (editingId) {
      const original = customers.find(c => c.id === editingId);
      if (original) { onUpdateCustomer({ ...original, ...customerData }); notify('Cliente actualizado correctamente.', 'success'); }
    } else {
      const newCustomer: Customer = { id: `c-${Date.now()}`, ...customerData, points: 0, isActive: true };
      onAddCustomer(newCustomer); notify('Cliente registrado con éxito.', 'success');
    }
    setIsModalOpen(false); resetForm();
  };

  const toggleStatus = async (customer: Customer) => {
    const action = customer.isActive ? 'Desactivar' : 'Restaurar';
    const confirmed = await confirm({ title: `${action} Cliente`, message: `¿Desea ${action.toLowerCase()} a "${customer.name}"?`, type: customer.isActive ? 'warning' : 'info' });
    if (confirmed) { onUpdateCustomer({ ...customer, isActive: !customer.isActive }); notify(`Cliente ${customer.isActive ? 'inhabilitado' : 'restaurado'}.`, 'info'); }
  };

  const filteredCustomers = customers.filter(c => {
    const isMatchedStatus = showTrash ? !c.isActive : c.isActive;
    if (!isMatchedStatus) return false;
    const searchLower = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(searchLower) || c.phone.includes(searchTerm) || (c.documentNumber && c.documentNumber.includes(searchTerm));
  });

  const SectionAccordion = ({ id, title, icon, children }: { id: string; title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="border border-slate-100 rounded-2xl overflow-hidden">
      <button type="button" onClick={() => toggleSection(id)} className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 hover:bg-slate-100 transition-colors">
        <div className="flex items-center gap-3"><span className="text-brand-600">{icon}</span><span className="text-xs font-black uppercase tracking-widest text-slate-700">{title}</span></div>
        {openSection === id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {openSection === id && <div className="p-6 space-y-4 bg-white">{children}</div>}
    </div>
  );

  const inputCls    = "w-full bg-slate-50 border-none rounded-xl p-4 font-medium text-xs focus:ring-2 focus:ring-brand-500 outline-none";
  const labelCls    = "block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest";
  const textareaCls = "w-full bg-slate-50 border-none rounded-xl p-4 font-medium text-xs focus:ring-2 focus:ring-brand-500 outline-none resize-none";

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-slate-50 pb-24 md:pb-8 relative animate-in fade-in duration-500">
      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-3"><Users className="text-brand-600" size={32}/> Maestro de Clientes</h2>
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
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg border-2 shadow-sm transition-all group-hover:scale-105 ${customer.isActive ? 'bg-brand-50 text-brand-600 border-brand-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>{customer.name.charAt(0)}</div>
                <div>
                  <h3 className="font-black text-slate-800 uppercase text-sm leading-tight truncate max-w-[150px]">{customer.name}</h3>
                  <div className="flex items-center gap-1 mt-1 text-slate-400"><Fingerprint size={12} className="text-brand-500" /><span className="text-[10px] font-bold uppercase tracking-tighter">{customer.documentType}: {customer.documentNumber || 'SIN REGISTRO'}</span></div>
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
              {customer.fiscalResponsibility && <div className="flex items-center gap-3"><ShieldCheck size={14} className="text-brand-500" /><span>Resp. Fiscal: {customer.fiscalResponsibility}</span></div>}
            </div>
            <div className="mt-6 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100"><Star size={14} className="text-emerald-500" fill="currentColor"/><span className="text-[11px] font-black text-emerald-700 tabular-nums">{customer.points} Puntos</span></div>
              <div className="flex gap-2">
                <button onClick={() => handleOpenClinicalModal(customer)}
                  className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1 ${customer.clinicalHistory ? 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100 border border-cyan-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                  title="Historia Clínica Odontológica">
                  <Stethoscope size={12} />{customer.clinicalHistory ? 'HC ✓' : 'HC'}
                </button>
                <button onClick={() => handleOpenModal(customer)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${customer.isActive ? 'bg-slate-50 text-slate-500 hover:bg-slate-100' : 'bg-slate-200 text-slate-400'}`}>Ver Ficha</button>
              </div>
            </div>
            <div className={`absolute -right-8 -bottom-8 w-24 h-24 rounded-full opacity-5 pointer-events-none group-hover:scale-150 transition-transform ${customer.isActive ? 'bg-brand-600' : 'bg-slate-600'}`}></div>
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <div className="bg-slate-100 w-32 h-32 rounded-full flex items-center justify-center mb-6"><User size={48} className="text-slate-300" /></div>
          <h3 className="text-2xl font-black">Sin clientes</h3>
          <p className="text-slate-500 mt-3 max-w-xs">No existen clientes registrados</p>
          <button onClick={() => handleOpenModal()} className="mt-8 bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] flex items-center gap-2"><Plus size={18} />Crear primera cliente</button>
        </div>
      )}

      {/* Modal datos cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3"><div className="bg-brand-600 p-2.5 rounded-2xl text-white shadow-lg shadow-brand-200"><Users size={24}/></div><h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">{editingId ? 'Ficha de Cliente' : 'Nuevo Cliente'}</h3></div>
              <button onClick={() => setIsModalOpen(false)} className="bg-white p-3 rounded-2xl text-slate-400 hover:text-slate-800 shadow-sm transition-all"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2"><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nombre Completo / Razón Social</label><input required type="text" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-bold focus:ring-2 focus:ring-brand-500 outline-none uppercase text-sm" value={name} onChange={e => setName(e.target.value)} /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Tipo Identificación</label><select required className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black uppercase text-xs outline-none" value={documentType} onChange={(e) => setDocumentType(e.target.value as keyof typeof Documents)}>{Object.entries(Documents).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}</select></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nro de Documento</label><input required type="text" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black focus:ring-2 focus:ring-brand-500 outline-none" value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Celular Principal</label><input required type="tel" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black focus:ring-2 focus:ring-brand-500 outline-none" value={phone} onChange={e => setPhone(e.target.value)} /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Correo Electrónico</label><input type="email" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-bold focus:ring-2 focus:ring-brand-500 outline-none" value={email} onChange={e => setEmail(e.target.value)} /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest flex items-center gap-1"><Calendar size={12}/> Fecha de Nacimiento</label><input type="date" className="w-full bg-slate-50 border-none rounded-2xl p-5 font-bold focus:ring-2 focus:ring-brand-500 outline-none" value={birthDate} onChange={e => setBirthDate(e.target.value)} /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest flex items-center gap-1"><ShieldCheck size={12}/> Responsabilidad Fiscal</label><select className="w-full bg-slate-50 border-none rounded-2xl p-5 font-black uppercase text-xs outline-none" value={fiscalResponsibility} onChange={e => setFiscalResponsibility(e.target.value)}><option value="">Ninguna / No aplica</option><option value="R-99-PN">NO RESPONSABLE DE IVA</option><option value="O-48">IMPUESTO SOBRE LAS VENTAS (IVA)</option><option value="O-47">RÉGIMEN SIMPLE DE TRIBUTACIÓN</option><option value="O-05">IMPUESTO SOBRE LA RENTA</option></select></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Ciudad</label><input className="w-full bg-slate-50 border-none rounded-2xl p-5 font-bold focus:ring-2 focus:ring-brand-500 outline-none uppercase" value={city} onChange={e => setCity(e.target.value)} /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Dirección de Envío</label><input className="w-full bg-slate-50 border-none rounded-2xl p-5 font-bold focus:ring-2 focus:ring-brand-500 outline-none uppercase" value={address} onChange={e => setAddress(e.target.value)} /></div>
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white font-black py-6 rounded-[2.5rem] shadow-2xl shadow-slate-200 uppercase tracking-[0.2em] text-xs active:scale-95 transition-all mt-6 flex items-center justify-center gap-3"><Save size={20}/> Guardar Datos de Cliente</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal historia clínica */}
      {isClinicalModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[95vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-cyan-50 to-blue-50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-cyan-600 p-2.5 rounded-2xl text-white shadow-lg shadow-cyan-200"><Stethoscope size={22}/></div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tighter text-slate-800">Historia Clínica Odontológica</h3>
                  <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-widest">{selectedCustomer.name} · {selectedCustomer.documentType}: {selectedCustomer.documentNumber}</p>
                </div>
              </div>
              <button onClick={() => setIsClinicalModalOpen(false)} className="bg-white p-3 rounded-2xl text-slate-400 hover:text-slate-800 shadow-sm transition-all"><X size={20} /></button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-3 custom-scrollbar">

              <SectionAccordion id="anamnesis" title="Anamnesis / Motivo de Consulta" icon={<ClipboardList size={16}/>}>
                <div><label className={labelCls}>Motivo de Consulta</label><textarea rows={2} className={textareaCls} value={motivoConsulta} onChange={e => setMotivoConsulta(e.target.value)} placeholder="¿Por qué viene el paciente?" /></div>
                <div><label className={labelCls}>Enfermedad Actual / Historia del Problema</label><textarea rows={3} className={textareaCls} value={enfermedadActual} onChange={e => setEnfermedadActual(e.target.value)} placeholder="Descripción detallada del problema actual..." /></div>
              </SectionAccordion>

              <SectionAccordion id="antecedentes" title="Antecedentes Médicos y Sistémicos" icon={<ShieldCheck size={16}/>}>
                <div>
                  <label className={labelCls}>Antecedentes Sistémicos (marcar los que aplican)</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {Object.entries({ diabetes:'Diabetes',hipertension:'Hipertensión',cardiopatia:'Cardiopatía',asma:'Asma / EPOC',epilepsia:'Epilepsia',coagulopatia:'Coagulopatía',vih:'VIH / SIDA',embarazo:'Embarazo',alergias:'Alergias' }).map(([key, label]) => (
                      <button key={key} type="button" onClick={() => setAntSistemicosList(prev => ({ ...prev, [key]: !prev[key] }))}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${antSistemicosList[key] ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}>
                        {antSistemicosList[key] ? <CheckSquare size={12} /> : <Square size={12} />}{label}
                      </button>
                    ))}
                  </div>
                </div>
                {antSistemicosList.alergias && <div><label className={labelCls}>Detalle de Alergias</label><input type="text" className={inputCls} value={alergiaDetalle} onChange={e => setAlergiaDetalle(e.target.value)} placeholder="Medicamentos, látex, anestésicos..." /></div>}
                <div><label className={labelCls}>Otros Antecedentes Sistémicos</label><input type="text" className={inputCls} value={otrosAntSistemicos} onChange={e => setOtrosAntSistemicos(e.target.value)} placeholder="Enfermedades no listadas arriba..." /></div>
                <div><label className={labelCls}>Medicamentos Actuales</label><textarea rows={2} className={textareaCls} value={medicamentosActuales} onChange={e => setMedicamentosActuales(e.target.value)} placeholder="Nombre del medicamento, dosis, frecuencia..." /></div>
                <div><label className={labelCls}>Antecedentes Odontológicos</label><textarea rows={2} className={textareaCls} value={antecedentesOdontologicos} onChange={e => setAntecedentesOdontologicos(e.target.value)} placeholder="Tratamientos previos, extracciones, ortodoncia..." /></div>
              </SectionAccordion>

              <SectionAccordion id="habitos" title="Hábitos Parafuncionales" icon={<User size={16}/>}>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => setHabitosBruxismo(!habitosBruxismo)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${habitosBruxismo ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}>{habitosBruxismo ? <CheckSquare size={12}/> : <Square size={12}/>} Bruxismo</button>
                  <button type="button" onClick={() => setHabitosFumador(!habitosFumador)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${habitosFumador ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}>{habitosFumador ? <CheckSquare size={12}/> : <Square size={12}/>} Fumador</button>
                </div>
                <div><label className={labelCls}>Onicofagia / Succión de Dedo u otros hábitos</label><input type="text" className={inputCls} value={habitosOnicoFagia} onChange={e => setHabitosOnicoFagia(e.target.value)} placeholder="Descripción..." /></div>
                <div><label className={labelCls}>Otros Hábitos</label><input type="text" className={inputCls} value={habitosOtros} onChange={e => setHabitosOtros(e.target.value)} /></div>
              </SectionAccordion>

              <SectionAccordion id="signos" title="Signos Vitales" icon={<Stethoscope size={16}/>}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><label className={labelCls}>T/A (mmHg)</label><input type="text" className={inputCls} value={signos.ta} onChange={e => setSignos(p => ({...p, ta: e.target.value}))} placeholder="120/80" /></div>
                  <div><label className={labelCls}>FC (lpm)</label><input type="text" className={inputCls} value={signos.fc} onChange={e => setSignos(p => ({...p, fc: e.target.value}))} placeholder="72" /></div>
                  <div><label className={labelCls}>FR (rpm)</label><input type="text" className={inputCls} value={signos.fr} onChange={e => setSignos(p => ({...p, fr: e.target.value}))} placeholder="16" /></div>
                  <div><label className={labelCls}>Temp (°C)</label><input type="text" className={inputCls} value={signos.temp} onChange={e => setSignos(p => ({...p, temp: e.target.value}))} placeholder="36.5" /></div>
                </div>
              </SectionAccordion>

              <SectionAccordion id="examen" title="Examen Clínico" icon={<Search size={16}/>}>
                <div><label className={labelCls}>Examen Extraoral</label><textarea rows={3} className={textareaCls} value={examenExtraoralDetalle} onChange={e => setExamenExtraoralDetalle(e.target.value)} placeholder="ATM, ganglios, asimetría facial, perfil, labios..." /></div>
                <div><label className={labelCls}>Examen Intraoral</label><textarea rows={3} className={textareaCls} value={examenIntraoralDetalle} onChange={e => setExamenIntraoralDetalle(e.target.value)} placeholder="Mucosas, lengua, paladar, encías, piso de boca..." /></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><label className={labelCls}>Índice de Higiene Oral</label><input type="text" className={inputCls} value={indiceHigiene} onChange={e => setIndiceHigiene(e.target.value)} placeholder="0.0 - 3.0" /></div>
                  <div><label className={labelCls}>Índice Gingival</label><input type="text" className={inputCls} value={indiceGingival} onChange={e => setIndiceGingival(e.target.value)} placeholder="0 - 3" /></div>
                  <div><label className={labelCls}>Clasificación de Angle</label><select className={inputCls} value={clasificacionAngle} onChange={e => setClasificacionAngle(e.target.value)}><option value="">Seleccionar</option><option value="Clase I">Clase I</option><option value="Clase II Div 1">Clase II Div. 1</option><option value="Clase II Div 2">Clase II Div. 2</option><option value="Clase III">Clase III</option></select></div>
                </div>
              </SectionAccordion>

              <SectionAccordion id="odontograma" title="Odontograma Dental — 5 Caras" icon={<ClipboardList size={16}/>}>
                {selectedTooth !== null && (
                  <div className="bg-slate-900 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-cyan-900 border border-cyan-600 rounded-xl flex items-center justify-center text-[10px] font-black text-cyan-300">{selectedTooth}</div>
                        <div><p className="text-[10px] font-black text-white uppercase tracking-widest">Diente {selectedTooth}</p><p className="text-[9px] text-slate-400">{selectedFace ? `Cara: ${FACE_LABELS[selectedFace]}` : 'Selecciona una cara o aplica condición global'}</p></div>
                      </div>
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => clearTooth(selectedTooth)} className="text-[9px] font-black text-red-400 hover:text-red-300 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 uppercase tracking-wider transition-colors">Limpiar</button>
                        <button type="button" onClick={() => { setSelectedTooth(null); setSelectedFace(null); }} className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-lg transition-colors"><X size={13}/></button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <p className="w-full text-[8px] font-black text-slate-500 uppercase tracking-widest">Seleccionar cara:</p>
                      {FACES.map(f => (<button key={f} type="button" onClick={() => setSelectedFace(selectedFace === f ? null : f)} className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${selectedFace === f ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-cyan-700 hover:text-cyan-300'}`}>{f} <span className="font-normal normal-case text-[8px] opacity-70">— {FACE_LABELS[f].split('/')[0]}</span></button>))}
                    </div>
                    {selectedFace && (
                      <div className="space-y-1.5">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Condición para cara {FACE_LABELS[selectedFace]}:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(CONDITIONS).map(([key, meta]) => {
                            const current = odontograma[selectedTooth]?.[selectedFace] || ''; const isActive = current === key;
                            return (<button key={key} type="button" onClick={() => setFaceCondition(selectedTooth, selectedFace, key)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[9px] font-black border-2 transition-all" style={{ backgroundColor: isActive ? meta.color : '#1e293b', borderColor: isActive ? meta.stroke : (key ? meta.stroke+'44' : '#334155'), color: isActive ? meta.label : (key ? meta.color : '#475569') }}><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: key ? meta.stroke : '#334155' }}/>{key || '— Sin hallazgo'}</button>);
                          })}
                        </div>
                      </div>
                    )}
                    <div className="space-y-1.5 border-t border-slate-700 pt-3">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Estado global del diente:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(GLOBAL_CONDITIONS).map(([key, meta]) => {
                          const isActive = getGlobalStatus(selectedTooth) === key;
                          return (<button key={key} type="button" onClick={() => setGlobalCondition(selectedTooth, isActive ? '' : key)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black border-2 transition-all" style={{ backgroundColor: isActive ? meta.color : '#1e293b', borderColor: isActive ? meta.stroke : meta.stroke+'44', color: isActive ? meta.label : meta.color }}><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.stroke }}/>{key}</button>);
                        })}
                      </div>
                    </div>
                  </div>
                )}
                <div className="bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-100 p-4 overflow-x-auto">
                  <div className="flex justify-center mb-1"><div className="flex gap-3 items-center"><span className="text-[7px] font-black text-slate-300 uppercase tracking-[0.15em]">Cuad. I (18→11)</span><div className="w-px h-3 bg-slate-200"/><span className="text-[7px] font-black text-slate-300 uppercase tracking-[0.15em]">Cuad. II (21→28)</span></div></div>
                  <div className="flex justify-end mb-0.5 pr-1"><span className="text-[7px] text-slate-300 font-bold italic">↑ Vestibular</span></div>
                  <div className="flex items-end justify-center gap-[3px]">
                    <div className="flex items-end gap-[3px]">{[18,17,16,15,14,13,12,11].map(t => <ToothDiagram key={t} num={t} isUpper={true}/>)}</div>
                    <div className="self-stretch mx-1 flex flex-col items-center justify-center"><div className="w-px flex-1 bg-slate-200"/><div className="w-2 h-2 rounded-full bg-slate-300 my-1"/><div className="w-px flex-1 bg-slate-200"/></div>
                    <div className="flex items-end gap-[3px]">{[21,22,23,24,25,26,27,28].map(t => <ToothDiagram key={t} num={t} isUpper={true}/>)}</div>
                  </div>
                  <div className="flex items-center gap-2 my-2"><div className="h-[1.5px] flex-1 bg-slate-200 rounded"/><span className="text-[7px] font-black text-slate-300 uppercase tracking-[0.15em] whitespace-nowrap px-1">Plano Oclusal</span><div className="h-[1.5px] flex-1 bg-slate-200 rounded"/></div>
                  <div className="flex items-start justify-center gap-[3px]">
                    <div className="flex items-start gap-[3px]">{[48,47,46,45,44,43,42,41].map(t => <ToothDiagram key={t} num={t} isUpper={false}/>)}</div>
                    <div className="self-stretch mx-1 flex flex-col items-center justify-center"><div className="w-px flex-1 bg-slate-200"/><div className="w-2 h-2 rounded-full bg-slate-300 my-1"/><div className="w-px flex-1 bg-slate-200"/></div>
                    <div className="flex items-start gap-[3px]">{[31,32,33,34,35,36,37,38].map(t => <ToothDiagram key={t} num={t} isUpper={false}/>)}</div>
                  </div>
                  <div className="flex justify-end mt-0.5 pr-1"><span className="text-[7px] text-slate-300 font-bold italic">↓ Vestibular</span></div>
                  <div className="flex justify-center mt-1"><div className="flex gap-3 items-center"><span className="text-[7px] font-black text-slate-300 uppercase tracking-[0.15em]">Cuad. IV (48→41)</span><div className="w-px h-3 bg-slate-200"/><span className="text-[7px] font-black text-slate-300 uppercase tracking-[0.15em]">Cuad. III (31→38)</span></div></div>
                  <p className="text-center text-[9px] text-slate-400 font-medium mt-2 italic">Vista oclusal · Toca un diente, luego selecciona cara y condición</p>
                </div>
                <div className="bg-slate-50 rounded-xl border border-slate-100 p-3">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Referencia de caras (vista oclusal):</p>
                  <div className="flex items-center justify-center gap-6">
                    <svg width={70} height={70} viewBox="0 0 70 70"><rect x="2" y="2" width="66" height="66" rx="8" fill="white" stroke="#e2e8f0" strokeWidth="1.5"/><polygon points="2,2 68,2 50,20 20,20" fill="#f0fdf4" stroke="white" strokeWidth="1"/><polygon points="20,50 50,50 68,68 2,68" fill="#eff6ff" stroke="white" strokeWidth="1"/><polygon points="2,2 20,20 20,50 2,68" fill="#fef9c3" stroke="white" strokeWidth="1"/><polygon points="50,20 68,2 68,68 50,50" fill="#fdf4ff" stroke="white" strokeWidth="1"/><rect x="20" y="20" width="30" height="30" rx="4" fill="#f0fdf4" stroke="#22c55e" strokeWidth="1"/><text x="35" y="10" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#16a34a">V</text><text x="35" y="63" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#2563eb">L</text><text x="9" y="37" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#ca8a04">M</text><text x="61" y="37" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#9333ea">D</text><text x="35" y="38" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#374151">O</text></svg>
                    <div className="space-y-1">{[['V','Vestibular (labio/mejilla)','#16a34a'],['L','Lingual / Palatino','#2563eb'],['M','Mesial (hacia línea media)','#ca8a04'],['D','Distal (alejado línea media)','#9333ea'],['O','Oclusal / Incisal','#374151']].map(([f,desc,col]) => (<div key={f} className="flex items-center gap-2"><span className="text-[9px] font-black w-4" style={{color:col as string}}>{f}</span><span className="text-[9px] text-slate-500">{desc}</span></div>))}</div>
                  </div>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Condiciones por cara:</p>
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-1">{Object.entries(CONDITIONS).filter(([k]) => k).map(([key, meta]) => (<div key={key} className="flex flex-col items-center gap-1 p-2 rounded-xl border text-center" style={{backgroundColor:meta.color+'aa',borderColor:meta.stroke+'66'}}><div className="w-3 h-3 rounded-full" style={{backgroundColor:meta.stroke}}/><span className="text-[8px] font-black" style={{color:meta.label}}>{key}</span></div>))}</div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2 mb-1">Estados globales:</p>
                  <div className="flex gap-2">{Object.entries(GLOBAL_CONDITIONS).map(([key, meta]) => (<div key={key} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[9px] font-black" style={{backgroundColor:meta.color,borderColor:meta.stroke+'88',color:meta.label}}><div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:meta.stroke}}/>{key}</div>))}</div>
                </div>
                {Object.keys(odontograma).length > 0 && (
                  <div className="rounded-2xl border border-slate-100 overflow-hidden">
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between"><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Hallazgos registrados</span><span className="text-[9px] font-black bg-white text-slate-400 px-2 py-0.5 rounded-lg border border-slate-100">{Object.keys(odontograma).length} diente{Object.keys(odontograma).length !== 1 ? 's' : ''}</span></div>
                    <div className="p-3 space-y-1.5 bg-white max-h-48 overflow-y-auto">
                      {Object.entries(odontograma).sort(([a],[b]) => Number(a)-Number(b)).map(([tooth, faces]) => {
                        const global = faces['GLOBAL']; const faceConds = Object.entries(faces).filter(([f,v]) => f !== 'GLOBAL' && v);
                        return (<div key={tooth} className="flex items-center gap-2 p-2 rounded-xl border border-slate-100 cursor-pointer hover:border-cyan-200 hover:bg-cyan-50 transition-all" onClick={() => { setSelectedTooth(Number(tooth)); setSelectedFace(null); }}><span className="text-[10px] font-black text-slate-600 w-6 text-center bg-slate-100 rounded-lg py-0.5">{tooth}</span>{global && (<span className="text-[9px] font-black px-2 py-0.5 rounded-lg border" style={{backgroundColor:GLOBAL_CONDITIONS[global]?.color,borderColor:GLOBAL_CONDITIONS[global]?.stroke+'88',color:GLOBAL_CONDITIONS[global]?.label}}>{global}</span>)}{faceConds.map(([face, cond]) => (<span key={face} className="text-[8px] font-black px-1.5 py-0.5 rounded-md border flex items-center gap-1" style={{backgroundColor:CONDITIONS[cond]?.color,borderColor:CONDITIONS[cond]?.stroke+'66',color:CONDITIONS[cond]?.label}}>{face}: {cond}</span>))}</div>);
                      })}
                    </div>
                  </div>
                )}
              </SectionAccordion>

              <SectionAccordion id="diagnostico" title="Diagnóstico y Plan de Tratamiento" icon={<Briefcase size={16}/>}>
                <div><label className={labelCls}>Diagnóstico</label><textarea rows={3} className={textareaCls} value={diagnosticoDetalle} onChange={e => setDiagnosticoDetalle(e.target.value)} placeholder="Diagnóstico presuntivo y definitivo..." /></div>
                <div><label className={labelCls}>Plan de Tratamiento</label><textarea rows={4} className={textareaCls} value={planTratamientoDetalle} onChange={e => setPlanTratamientoDetalle(e.target.value)} placeholder="Procedimientos a realizar en orden de prioridad..." /></div>
                <div><label className={labelCls}>Pronóstico</label><select className={inputCls} value={pronóstico} onChange={e => setPronóstico(e.target.value)}><option value="">Seleccionar pronóstico</option><option value="Bueno">Bueno</option><option value="Regular">Regular</option><option value="Reservado">Reservado</option><option value="Malo">Malo</option></select></div>
                <div><label className={labelCls}>Observaciones Generales</label><textarea rows={2} className={textareaCls} value={observacionesGenerales} onChange={e => setObservacionesGenerales(e.target.value)} placeholder="Notas adicionales relevantes..." /></div>
              </SectionAccordion>

              <SectionAccordion id="consentimiento" title="Consentimiento Informado" icon={<ShieldCheck size={16}/>}>
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">El/la paciente <strong>{selectedCustomer.name}</strong>, identificado/a con {selectedCustomer.documentType} N° <strong>{selectedCustomer.documentNumber}</strong>, declara haber sido informado/a sobre su diagnóstico, opciones de tratamiento, riesgos y beneficios de los procedimientos odontológicos a realizar, y autoriza al profesional tratante a ejecutar el plan de tratamiento propuesto.</p>
                  <button type="button" onClick={() => setConsentimientoInformado(!consentimientoInformado)}
                    className={`mt-4 flex items-center gap-3 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider border-2 transition-all w-full justify-center ${consentimientoInformado ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-200'}`}>
                    {consentimientoInformado ? <CheckSquare size={16}/> : <Square size={16}/>}
                    {consentimientoInformado ? 'Consentimiento Firmado ✓' : 'Marcar como Firmado'}
                  </button>
                </div>
              </SectionAccordion>

            </div>

            {/* Footer — botón guardar con loading */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
              <button
                type="button"
                onClick={handleSaveClinicalHistory}
                disabled={savingClinical}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-cyan-100 uppercase tracking-[0.2em] text-xs active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingClinical
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
                  : <><Save size={18}/> Guardar Historia Clínica</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};