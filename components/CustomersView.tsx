import React, { useState } from 'react';
import { Customer, DocumentType, Documents } from '../types';
import { Users, Search, Plus, Phone, MapPin, Mail, X, Save, Trash2, Edit2, RotateCcw, Archive, Star, Fingerprint, ShieldCheck, Download, Printer, Building2, User, Calendar, Briefcase, Stethoscope, ClipboardList, ChevronDown, ChevronUp, CheckSquare, Square } from 'lucide-react';
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
  const [isClinicalModalOpen, setIsClinicalModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [motivoConsulta, setMotivoConsulta] = useState('');
  const [enfermedadActual, setEnfermedadActual] = useState('');
  const [antecedentesMedicos, setAntecedentesMedicos] = useState('');
  const [antecedentesOdontologicos, setAntecedentesOdontologicos] = useState('');
  const [examenExtraoral, setExamenExtraoral] = useState('');
  const [examenIntraoral, setExamenIntraoral] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [planTratamiento, setPlanTratamiento] = useState('');
  const [consentimientoFirmado, setConsentimientoFirmado] = useState(false);

  // aca: nuevos estados para historia clínica odontológica extendida
  const [openSection, setOpenSection] = useState<string | null>('anamnesis');

  // Antecedentes sistémicos (checkboxes)
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

  // Hábitos
  const [habitosBruxismo, setHabitosBruxismo] = useState(false);
  const [habitosFumador, setHabitosFumador] = useState(false);
  const [habitosOnicoFagia, setHabitosOnicoFagia] = useState('');
  const [habitosOtros, setHabitosOtros] = useState('');

  // Examen clínico
  const [signos, setSignos] = useState({ ta: '', fc: '', fr: '', temp: '' });
  const [examenExtraoralDetalle, setExamenExtraoralDetalle] = useState('');
  const [examenIntraoralDetalle, setExamenIntraoralDetalle] = useState('');
  const [indiceHigiene, setIndiceHigiene] = useState('');
  const [indiceGingival, setIndiceGingival] = useState('');
  const [clasificacionAngle, setClasificacionAngle] = useState('');

  // Odontograma básico (estado de dientes numerados)
  const [odontograma, setOdontograma] = useState<Record<number, string>>({});

  // Diagnóstico y plan
  const [diagnosticoDetalle, setDiagnosticoDetalle] = useState('');
  const [planTratamientoDetalle, setPlanTratamientoDetalle] = useState('');
  const [pronóstico, setPronóstico] = useState('');
  const [consentimientoInformado, setConsentimientoInformado] = useState(false);
  const [observacionesGenerales, setObservacionesGenerales] = useState('');

  // Secuencia de dientes para odontograma (adulto)
  const TEETH_UPPER = [18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28];
  const TEETH_LOWER = [48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38];
  const TOOTH_STATUS_OPTIONS = ['', 'Sano', 'Caries', 'Extracción', 'Corona', 'Endodoncia', 'Fractura', 'Ausente', 'Implante'];
  const TOOTH_STATUS_COLORS: Record<string, string> = {
    '': 'bg-white',
    'Sano': 'bg-emerald-100 text-emerald-700',
    'Caries': 'bg-red-100 text-red-700',
    'Extracción': 'bg-orange-100 text-orange-700',
    'Corona': 'bg-purple-100 text-purple-700',
    'Endodoncia': 'bg-pink-100 text-pink-700',
    'Fractura': 'bg-yellow-100 text-yellow-700',
    'Ausente': 'bg-slate-200 text-slate-500',
    'Implante': 'bg-blue-100 text-blue-700',
  };

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

  const resetClinicalForm = () => {
    setMotivoConsulta('');
    setEnfermedadActual('');
    setAntecedentesMedicos('');
    setAntecedentesOdontologicos('');
    setExamenExtraoral('');
    setExamenIntraoral('');
    setDiagnostico('');
    setPlanTratamiento('');
    setConsentimientoFirmado(false);
    setOpenSection('anamnesis');
    setAntSistemicosList({ diabetes: false, hipertension: false, cardiopatia: false, asma: false, epilepsia: false, coagulopatia: false, vih: false, embarazo: false, alergias: false });
    setOtrosAntSistemicos('');
    setAlergiaDetalle('');
    setMedicamentosActuales('');
    setHabitosBruxismo(false);
    setHabitosFumador(false);
    setHabitosOnicoFagia('');
    setHabitosOtros('');
    setSignos({ ta: '', fc: '', fr: '', temp: '' });
    setExamenExtraoralDetalle('');
    setExamenIntraoralDetalle('');
    setIndiceHigiene('');
    setIndiceGingival('');
    setClasificacionAngle('');
    setOdontograma({});
    setDiagnosticoDetalle('');
    setPlanTratamientoDetalle('');
    setPronóstico('');
    setConsentimientoInformado(false);
    setObservacionesGenerales('');
  };

  const handleOpenClinicalModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    resetClinicalForm();
    // aca: si el cliente tiene historia clínica guardada, cargarla
    if (customer.clinicalHistory) {
      const ch = customer.clinicalHistory;
      setMotivoConsulta(ch.motivoConsulta || '');
      setEnfermedadActual(ch.enfermedadActual || '');
      setAntecedentesMedicos(ch.antecedentesMedicos || '');
      setAntecedentesOdontologicos(ch.antecedentesOdontologicos || '');
      setExamenExtraoral(ch.examenExtraoral || '');
      setExamenIntraoral(ch.examenIntraoral || '');
      setDiagnostico(ch.diagnostico || '');
      setPlanTratamiento(ch.planTratamiento || '');
      setConsentimientoFirmado(ch.consentimientoFirmado || false);
      if (ch.antSistemicosList) setAntSistemicosList(ch.antSistemicosList);
      setOtrosAntSistemicos(ch.otrosAntSistemicos || '');
      setAlergiaDetalle(ch.alergiaDetalle || '');
      setMedicamentosActuales(ch.medicamentosActuales || '');
      setHabitosBruxismo(ch.habitosBruxismo || false);
      setHabitosFumador(ch.habitosFumador || false);
      setHabitosOnicoFagia(ch.habitosOnicoFagia || '');
      setHabitosOtros(ch.habitosOtros || '');
      if (ch.signos) setSignos(ch.signos);
      setExamenExtraoralDetalle(ch.examenExtraoralDetalle || '');
      setExamenIntraoralDetalle(ch.examenIntraoralDetalle || '');
      setIndiceHigiene(ch.indiceHigiene || '');
      setIndiceGingival(ch.indiceGingival || '');
      setClasificacionAngle(ch.clasificacionAngle || '');
      if (ch.odontograma) setOdontograma(ch.odontograma);
      setDiagnosticoDetalle(ch.diagnosticoDetalle || '');
      setPlanTratamientoDetalle(ch.planTratamientoDetalle || '');
      setPronóstico(ch.pronóstico || '');
      setConsentimientoInformado(ch.consentimientoInformado || false);
      setObservacionesGenerales(ch.observacionesGenerales || '');
    }
    setIsClinicalModalOpen(true);
  };

  const handleSaveClinicalHistory = () => {
    if (!selectedCustomer) return;
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
    onUpdateCustomer({ ...selectedCustomer, clinicalHistory });
    notify('Historia clínica guardada correctamente.', 'success');
    setIsClinicalModalOpen(false);
  };

  const toggleSection = (section: string) => {
    setOpenSection(prev => prev === section ? null : section);
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

  // aca: componente acordeón para secciones de historia clínica
  const SectionAccordion = ({ id, title, icon, children }: { id: string; title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="border border-slate-100 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-brand-600">{icon}</span>
          <span className="text-xs font-black uppercase tracking-widest text-slate-700">{title}</span>
        </div>
        {openSection === id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {openSection === id && (
        <div className="p-6 space-y-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );

  const inputCls = "w-full bg-slate-50 border-none rounded-xl p-4 font-medium text-xs focus:ring-2 focus:ring-brand-500 outline-none";
  const labelCls = "block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest";
  const textareaCls = "w-full bg-slate-50 border-none rounded-xl p-4 font-medium text-xs focus:ring-2 focus:ring-brand-500 outline-none resize-none";

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
                <div className="flex gap-2">
                  {/* aca: botón historia clínica odontológica */}
                  <button
                    onClick={() => handleOpenClinicalModal(customer)}
                    className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1 ${customer.clinicalHistory ? 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100 border border-cyan-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                    title="Historia Clínica Odontológica"
                  >
                    <Stethoscope size={12} />
                    {customer.clinicalHistory ? 'HC ✓' : 'HC'}
                  </button>
                  <button onClick={() => handleOpenModal(customer)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${customer.isActive ? 'bg-slate-50 text-slate-500 hover:bg-slate-100' : 'bg-slate-200 text-slate-400'}`}>
                      Ver Ficha
                  </button>
                </div>
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

      {/* aca: modal de historia clínica odontológica */}
      {isClinicalModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[95vh]">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-cyan-50 to-blue-50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-cyan-600 p-2.5 rounded-2xl text-white shadow-lg shadow-cyan-200">
                  <Stethoscope size={22}/>
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tighter text-slate-800">Historia Clínica Odontológica</h3>
                  <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-widest">{selectedCustomer.name} · {selectedCustomer.documentType}: {selectedCustomer.documentNumber}</p>
                </div>
              </div>
              <button onClick={() => setIsClinicalModalOpen(false)} className="bg-white p-3 rounded-2xl text-slate-400 hover:text-slate-800 shadow-sm transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Body scrollable */}
            <div className="overflow-y-auto flex-1 p-6 space-y-3 custom-scrollbar">

              {/* 1. Anamnesis */}
              <SectionAccordion id="anamnesis" title="Anamnesis / Motivo de Consulta" icon={<ClipboardList size={16}/>}>
                <div>
                  <label className={labelCls}>Motivo de Consulta</label>
                  <textarea rows={2} className={textareaCls} value={motivoConsulta} onChange={e => setMotivoConsulta(e.target.value)} placeholder="¿Por qué viene el paciente?" />
                </div>
                <div>
                  <label className={labelCls}>Enfermedad Actual / Historia del Problema</label>
                  <textarea rows={3} className={textareaCls} value={enfermedadActual} onChange={e => setEnfermedadActual(e.target.value)} placeholder="Descripción detallada del problema actual..." />
                </div>
              </SectionAccordion>

              {/* 2. Antecedentes */}
              <SectionAccordion id="antecedentes" title="Antecedentes Médicos y Sistémicos" icon={<ShieldCheck size={16}/>}>
                <div>
                  <label className={labelCls}>Antecedentes Sistémicos (marcar los que aplican)</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {Object.entries({ diabetes: 'Diabetes', hipertension: 'Hipertensión', cardiopatia: 'Cardiopatía', asma: 'Asma / EPOC', epilepsia: 'Epilepsia', coagulopatia: 'Coagulopatía', vih: 'VIH / SIDA', embarazo: 'Embarazo', alergias: 'Alergias' }).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAntSistemicosList(prev => ({ ...prev, [key]: !prev[key] }))}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${antSistemicosList[key] ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}
                      >
                        {antSistemicosList[key] ? <CheckSquare size={12} /> : <Square size={12} />}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {antSistemicosList.alergias && (
                  <div>
                    <label className={labelCls}>Detalle de Alergias</label>
                    <input type="text" className={inputCls} value={alergiaDetalle} onChange={e => setAlergiaDetalle(e.target.value)} placeholder="Medicamentos, látex, anestésicos..." />
                  </div>
                )}
                <div>
                  <label className={labelCls}>Otros Antecedentes Sistémicos</label>
                  <input type="text" className={inputCls} value={otrosAntSistemicos} onChange={e => setOtrosAntSistemicos(e.target.value)} placeholder="Enfermedades no listadas arriba..." />
                </div>
                <div>
                  <label className={labelCls}>Medicamentos Actuales</label>
                  <textarea rows={2} className={textareaCls} value={medicamentosActuales} onChange={e => setMedicamentosActuales(e.target.value)} placeholder="Nombre del medicamento, dosis, frecuencia..." />
                </div>
                <div>
                  <label className={labelCls}>Antecedentes Odontológicos</label>
                  <textarea rows={2} className={textareaCls} value={antecedentesOdontologicos} onChange={e => setAntecedentesOdontologicos(e.target.value)} placeholder="Tratamientos previos, extracciones, ortodoncia..." />
                </div>
              </SectionAccordion>

              {/* 3. Hábitos */}
              <SectionAccordion id="habitos" title="Hábitos Parafuncionales" icon={<User size={16}/>}>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setHabitosBruxismo(!habitosBruxismo)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${habitosBruxismo ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}
                  >
                    {habitosBruxismo ? <CheckSquare size={12}/> : <Square size={12}/>} Bruxismo
                  </button>
                  <button
                    type="button"
                    onClick={() => setHabitosFumador(!habitosFumador)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${habitosFumador ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}
                  >
                    {habitosFumador ? <CheckSquare size={12}/> : <Square size={12}/>} Fumador
                  </button>
                </div>
                <div>
                  <label className={labelCls}>Onicofagia / Succión de Dedo u otros hábitos</label>
                  <input type="text" className={inputCls} value={habitosOnicoFagia} onChange={e => setHabitosOnicoFagia(e.target.value)} placeholder="Descripción..." />
                </div>
                <div>
                  <label className={labelCls}>Otros Hábitos</label>
                  <input type="text" className={inputCls} value={habitosOtros} onChange={e => setHabitosOtros(e.target.value)} />
                </div>
              </SectionAccordion>

              {/* 4. Signos Vitales */}
              <SectionAccordion id="signos" title="Signos Vitales" icon={<Stethoscope size={16}/>}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className={labelCls}>T/A (mmHg)</label>
                    <input type="text" className={inputCls} value={signos.ta} onChange={e => setSignos(p => ({...p, ta: e.target.value}))} placeholder="120/80" />
                  </div>
                  <div>
                    <label className={labelCls}>FC (lpm)</label>
                    <input type="text" className={inputCls} value={signos.fc} onChange={e => setSignos(p => ({...p, fc: e.target.value}))} placeholder="72" />
                  </div>
                  <div>
                    <label className={labelCls}>FR (rpm)</label>
                    <input type="text" className={inputCls} value={signos.fr} onChange={e => setSignos(p => ({...p, fr: e.target.value}))} placeholder="16" />
                  </div>
                  <div>
                    <label className={labelCls}>Temp (°C)</label>
                    <input type="text" className={inputCls} value={signos.temp} onChange={e => setSignos(p => ({...p, temp: e.target.value}))} placeholder="36.5" />
                  </div>
                </div>
              </SectionAccordion>

              {/* 5. Examen Clínico */}
              <SectionAccordion id="examen" title="Examen Clínico" icon={<Search size={16}/>}>
                <div>
                  <label className={labelCls}>Examen Extraoral</label>
                  <textarea rows={3} className={textareaCls} value={examenExtraoralDetalle} onChange={e => setExamenExtraoralDetalle(e.target.value)} placeholder="ATM, ganglios, asimetría facial, perfil, labios..." />
                </div>
                <div>
                  <label className={labelCls}>Examen Intraoral</label>
                  <textarea rows={3} className={textareaCls} value={examenIntraoralDetalle} onChange={e => setExamenIntraoralDetalle(e.target.value)} placeholder="Mucosas, lengua, paladar, encías, piso de boca..." />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>Índice de Higiene Oral</label>
                    <input type="text" className={inputCls} value={indiceHigiene} onChange={e => setIndiceHigiene(e.target.value)} placeholder="0.0 - 3.0" />
                  </div>
                  <div>
                    <label className={labelCls}>Índice Gingival</label>
                    <input type="text" className={inputCls} value={indiceGingival} onChange={e => setIndiceGingival(e.target.value)} placeholder="0 - 3" />
                  </div>
                  <div>
                    <label className={labelCls}>Clasificación de Angle</label>
                    <select className={inputCls} value={clasificacionAngle} onChange={e => setClasificacionAngle(e.target.value)}>
                      <option value="">Seleccionar</option>
                      <option value="Clase I">Clase I</option>
                      <option value="Clase II Div 1">Clase II Div. 1</option>
                      <option value="Clase II Div 2">Clase II Div. 2</option>
                      <option value="Clase III">Clase III</option>
                    </select>
                  </div>
                </div>
              </SectionAccordion>

              {/* 6. Odontograma */}
              <SectionAccordion id="odontograma" title="Odontograma" icon={<ClipboardList size={16}/>}>
                <p className="text-[10px] text-slate-400 font-medium">Haga clic en un diente y seleccione su estado. Los dientes coloreados tienen una condición registrada.</p>
                
                {/* Superior */}
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Superior (Derecha → Izquierda)</p>
                  <div className="flex flex-wrap gap-1">
                    {TEETH_UPPER.map(tooth => (
                      <div key={tooth} className="flex flex-col items-center gap-0.5">
                        <span className="text-[8px] text-slate-400 font-bold">{tooth}</span>
                        <select
                          className={`w-10 h-10 rounded-lg text-[7px] font-black text-center cursor-pointer border-2 transition-all outline-none ${odontograma[tooth] ? TOOTH_STATUS_COLORS[odontograma[tooth]] + ' border-current' : 'bg-white border-slate-200 text-slate-400'}`}
                          value={odontograma[tooth] || ''}
                          onChange={e => setOdontograma(prev => ({ ...prev, [tooth]: e.target.value }))}
                          title={`Diente ${tooth}`}
                        >
                          {TOOTH_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt || '—'}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Inferior */}
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 mt-2">Inferior (Derecha → Izquierda)</p>
                  <div className="flex flex-wrap gap-1">
                    {TEETH_LOWER.map(tooth => (
                      <div key={tooth} className="flex flex-col items-center gap-0.5">
                        <select
                          className={`w-10 h-10 rounded-lg text-[7px] font-black text-center cursor-pointer border-2 transition-all outline-none ${odontograma[tooth] ? TOOTH_STATUS_COLORS[odontograma[tooth]] + ' border-current' : 'bg-white border-slate-200 text-slate-400'}`}
                          value={odontograma[tooth] || ''}
                          onChange={e => setOdontograma(prev => ({ ...prev, [tooth]: e.target.value }))}
                          title={`Diente ${tooth}`}
                        >
                          {TOOTH_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt || '—'}</option>)}
                        </select>
                        <span className="text-[8px] text-slate-400 font-bold">{tooth}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Leyenda */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {TOOTH_STATUS_OPTIONS.filter(Boolean).map(opt => (
                    <span key={opt} className={`text-[9px] font-black px-2 py-1 rounded-lg ${TOOTH_STATUS_COLORS[opt]}`}>{opt}</span>
                  ))}
                </div>
              </SectionAccordion>

              {/* 7. Diagnóstico y Plan */}
              <SectionAccordion id="diagnostico" title="Diagnóstico y Plan de Tratamiento" icon={<Briefcase size={16}/>}>
                <div>
                  <label className={labelCls}>Diagnóstico</label>
                  <textarea rows={3} className={textareaCls} value={diagnosticoDetalle} onChange={e => setDiagnosticoDetalle(e.target.value)} placeholder="Diagnóstico presuntivo y definitivo..." />
                </div>
                <div>
                  <label className={labelCls}>Plan de Tratamiento</label>
                  <textarea rows={4} className={textareaCls} value={planTratamientoDetalle} onChange={e => setPlanTratamientoDetalle(e.target.value)} placeholder="Procedimientos a realizar en orden de prioridad..." />
                </div>
                <div>
                  <label className={labelCls}>Pronóstico</label>
                  <select className={inputCls} value={pronóstico} onChange={e => setPronóstico(e.target.value)}>
                    <option value="">Seleccionar pronóstico</option>
                    <option value="Bueno">Bueno</option>
                    <option value="Regular">Regular</option>
                    <option value="Reservado">Reservado</option>
                    <option value="Malo">Malo</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Observaciones Generales</label>
                  <textarea rows={2} className={textareaCls} value={observacionesGenerales} onChange={e => setObservacionesGenerales(e.target.value)} placeholder="Notas adicionales relevantes..." />
                </div>
              </SectionAccordion>

              {/* 8. Consentimiento */}
              <SectionAccordion id="consentimiento" title="Consentimiento Informado" icon={<ShieldCheck size={16}/>}>
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    El/la paciente <strong>{selectedCustomer.name}</strong>, identificado/a con {selectedCustomer.documentType} N° <strong>{selectedCustomer.documentNumber}</strong>, declara haber sido informado/a sobre su diagnóstico, opciones de tratamiento, riesgos y beneficios de los procedimientos odontológicos a realizar, y autoriza al profesional tratante a ejecutar el plan de tratamiento propuesto.
                  </p>
                  <button
                    type="button"
                    onClick={() => setConsentimientoInformado(!consentimientoInformado)}
                    className={`mt-4 flex items-center gap-3 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider border-2 transition-all w-full justify-center ${consentimientoInformado ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-200'}`}
                  >
                    {consentimientoInformado ? <CheckSquare size={16}/> : <Square size={16}/>}
                    {consentimientoInformado ? 'Consentimiento Firmado ✓' : 'Marcar como Firmado'}
                  </button>
                </div>
              </SectionAccordion>

            </div>

            {/* Footer con botón guardar */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
              <button
                type="button"
                onClick={handleSaveClinicalHistory}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-cyan-100 uppercase tracking-[0.2em] text-xs active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <Save size={18}/> Guardar Historia Clínica
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};