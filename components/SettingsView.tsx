import React, { useState, useRef, useEffect } from 'react';
import { Save, Percent, Store, Gift, Users, ShieldCheck, Grid3X3, Wallet, MapPin, Edit2, Archive, Trash2, Plus, X, Phone, Lock, Unlock, Mail, Shield, CheckCircle, Fingerprint, Printer, Tag, ChevronDown, ChevronUp, Star, DollarSign, Info, Power, Key, RotateCcw, Clock, ImageIcon, Upload, ShieldAlert, Check, Smartphone, Building2, Scale, Monitor, Zap, LayoutGrid, UserPlus } from 'lucide-react';
import { LoyaltyConfig, User as UserType, Role, CashRegister, Branch, Category, Permission, RoleDefinition, RegisterType, ImpoconsumoConfig, TaxApplicability, UserRole } from '../types';
import { useNotification } from './NotificationContext';
import { AccountingAccount } from '../types_accounting';
import { Settings } from 'lucide-react';

interface SettingsViewProps {
  loyaltyConfig: LoyaltyConfig;
  onUpdateLoyalty: (config: LoyaltyConfig) => void;
  users: UserType[];
  onAddUser: (user: UserType) => void;
  onUpdateUser: (user: UserType) => void;
  registers: CashRegister[];
  onAddRegister: (register: CashRegister) => void;
  onUpdateRegister: (register: CashRegister) => void;
  onDeleteRegister: (id: string) => void;
  taxRate: number;
  onUpdateTax: (rate: number) => void;
  impoconsumoConfig: ImpoconsumoConfig;
  onUpdateImpoconsumo: (config: ImpoconsumoConfig) => void;
  puc: AccountingAccount[];
  branches: Branch[];
  currentBranchId: string;
  currentCompanyId: string;
  onAddBranch: (branch: Branch) => void;
  onUpdateBranch: (branch: Branch) => void;
  onChangeBranch: (id: string) => void;
  userRole: Role;
  categories: Category[];
  onAddCategory: (category: Category) => void;
  onUpdateCategory: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
  roleDefinitions: RoleDefinition[];
  onUpdateRoleDefinitions: (defs: RoleDefinition[]) => void;
  userPermissions: Permission[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  loyaltyConfig, onUpdateLoyalty,
  users, onAddUser, onUpdateUser,
  registers, onAddRegister, onUpdateRegister, onDeleteRegister,
  taxRate, onUpdateTax,
  impoconsumoConfig, onUpdateImpoconsumo,
  puc,
  branches, currentBranchId, currentCompanyId, onAddBranch, onUpdateBranch, onChangeBranch,
  categories, onAddCategory, onUpdateCategory, onDeleteCategory,
  roleDefinitions, onUpdateRoleDefinitions, userPermissions
}) => {
  const { notify, confirm } = useNotification();
  const [activeTab, setActiveTab] = useState<'loyalty' | 'team' | 'registers' | 'tax' | 'branches' | 'catalog' | 'roles'>('branches');
  const [tempTaxRate, setTempTaxRate] = useState(taxRate * 100);
  const [ivaEnabled, setIvaEnabled] = useState(true); 
  const branchFileInputRef = useRef<HTMLInputElement>(null);

  const [impocEnabled, setImpocEnabled] = useState(impoconsumoConfig.enabled);
  const [impocRate, setImpocRate] = useState(impoconsumoConfig.rate * 100);
  const [impocApplies, setImpocApplies] = useState<TaxApplicability>(impoconsumoConfig.appliesTo);
  const [impocPucId, setImpocPucId] = useState(impoconsumoConfig.pucAccountId || '');

  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editingRegister, setEditingRegister] = useState<CashRegister | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [editingRoleDef, setEditingRoleDef] = useState<RoleDefinition | null>(null);

  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

  const [bName, setBName] = useState('');
  const [bAddress, setBAddress] = useState('');
  const [bPhone, setBPhone] = useState('');
  const [bEmail, setBEmail] = useState('');
  const [bRuc, setBRuc] = useState('');
  const [bNit, setBNit] = useState('');
  const [bHours, setBHours] = useState('');
  const [bLogo, setBLogo] = useState('');

  const [loyaltyEnabled, setLoyaltyEnabled] = useState(loyaltyConfig.enabled);
  const [loyaltyBase, setLoyaltyBase] = useState(loyaltyConfig.accumulationBaseAmount.toString());
  const [loyaltyPointsPer, setLoyaltyPointsPer] = useState(loyaltyConfig.pointsPerCurrency.toString());
  const [loyaltyCurrencyPer, setLoyaltyCurrencyPer] = useState(loyaltyConfig.currencyPerPoint.toString());
  const [loyaltyMin, setLoyaltyMin] = useState(loyaltyConfig.minRedemptionPoints.toString());

  useEffect(() => {
    setTempTaxRate(taxRate * 100);
  }, [taxRate]);

  useEffect(() => {
    setImpocEnabled(impoconsumoConfig.enabled);
    setImpocRate(impoconsumoConfig.rate * 100);
    setImpocApplies(impoconsumoConfig.appliesTo);
    setImpocPucId(impoconsumoConfig.pucAccountId || '');
  }, [impoconsumoConfig]);

  useEffect(() => {
    setLoyaltyEnabled(loyaltyConfig.enabled);
    setLoyaltyBase(loyaltyConfig.accumulationBaseAmount.toString());
    setLoyaltyPointsPer(loyaltyConfig.pointsPerCurrency.toString());
    setLoyaltyCurrencyPer(loyaltyConfig.currencyPerPoint.toString());
    setLoyaltyMin(loyaltyConfig.minRedemptionPoints.toString());
  }, [loyaltyConfig]);

  const tabs = [
      { id: 'branches', label: 'Sucursales', icon: <Store size={18}/> },
      { id: 'tax', label: 'Impuestos', icon: <Percent size={18}/> },
      { id: 'registers', label: 'Cajas', icon: <Wallet size={18}/> },
      { id: 'catalog', label: 'Categorías', icon: <Tag size={18}/> },
      { id: 'team', label: 'Personal', icon: <Users size={18}/> },
      { id: 'roles', label: 'Seguridad', icon: <ShieldCheck size={18}/> },
      { id: 'loyalty', label: 'Fidelidad', icon: <Gift size={18}/> },
  ];

  const handleBranchImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setBLogo(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const openBranchModal = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      setBName(branch.name);
      setBAddress(branch.address);
      setBPhone(branch.phone || '');
      setBEmail(branch.email || '');
      setBRuc(branch.ruc || '');
      setBNit(branch.nit || '');
      setBHours(branch.businessHours || '');
      setBLogo(branch.logoUrl || '');
    } else {
      setEditingBranch(null);
      setBName('');
      setBAddress('');
      setBPhone('');
      setBEmail('');
      setBRuc('');
      setBNit('');
      setBHours('');
      setBLogo('');
    }
    setIsBranchModalOpen(true);
  };

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Branch = { 
      id: editingBranch?.id || null, 
      company: {
            connect: {
                id: currentCompanyId
            }
      },
      name: bName.toUpperCase(), 
      address: bAddress, 
      phone: bPhone, 
      email: bEmail,
      ruc: bRuc,
      nit: bNit,
      businessHours: bHours, 
      logoUrl: bLogo, 
      isActive: true 
    };
    if (editingBranch) onUpdateBranch(data); else onAddBranch(data);
    setIsBranchModalOpen(false);
    notify("Sucursal guardada", "success");
  };

  const openRegisterModal = (reg?: CashRegister) => {
    setEditingRegister(reg || null);
    setIsRegisterModalOpen(true);
  };

  const handleSaveRegister = (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as any;
      const data: CashRegister = { 
        id: editingRegister?.id || null, 
        branch: {
            connect: {
                id: currentBranchId
            }
        }, 
        name: form.rname.value.toUpperCase(), 
        isOpen: editingRegister?.isOpen || false, 
        isActive: true, 
        printType: form.rprintType.value, 
        qzPrinterName: form.rprinterName?.value || '', 
        ticketFooter: form.rfooter?.value || '¡Gracias por su compra!', 
        autoPrint: form.rautoPrint.checked 
      };
      if (editingRegister) onUpdateRegister(data); else onAddRegister(data);
      setIsRegisterModalOpen(false);
      notify("Caja guardada", "success");
  };

  const handleDeleteReg = async (reg: CashRegister) => {
      if (reg.isOpen) {
          notify("No se puede eliminar una caja abierta", "error");
          return;
      }
      if (await confirm({ title: 'Eliminar Terminal', message: `¿Está seguro de eliminar "${reg.name}"? Esta acción es irreversible.`, type: 'danger' })) {
          onDeleteRegister(reg.id);
          notify("Caja eliminada", "info");
      }
  };

  const openCategoryModal = (cat?: Category) => {
    setEditingCategory(cat || null);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as any;
    
    const data: Category = { 
        id: editingCategory?.id || `cat-${Date.now()}`, 
        name: form.cname.value.toUpperCase(), 
        companyId: currentCompanyId, 
        isActive: true 
    };

    if (editingCategory) onUpdateCategory(data); else onAddCategory(data);
    
    setIsCategoryModalOpen(false);
    notify("Categoría guardada", "success");
  };

  const handleDeleteCategory = async (cat: Category) => {
      if (await confirm({ 
          title: 'Desactivar Categoría', 
          message: `¿Estás seguro de desactivar "${cat.name}"? Ya no aparecerá en el servicio.`, 
          type: 'warning' 
      })) {
          onDeleteCategory(cat.id);
          notify("Categoría desactivada", "info");
      }
  };

  const openUserModal = (user?: UserType) => {
    setEditingUser(user || null);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as any;
    // `u-${Date.now()}`
    const data: UserType = { 
        id: editingUser?.id || null, 
        name: form.uname.value.toUpperCase(), 
        email: form.uemail.value, pin: form.upin.value, 
        role: form.urole.value,
        isActive: true,
        branch: {
            connect: {
                id: currentBranchId
            }
        },
        company: {
            connect: {
                id: currentCompanyId
            }
        }
    };
    if (editingUser) onUpdateUser(data); else onAddUser(data);
    setIsUserModalOpen(false);
    notify("Usuario guardado", "success");
  };

  // --- LÓGICA DE ROLES/PERFILES ---
  const openRoleModal = (def?: RoleDefinition) => {
      setEditingRoleDef(def || null);
      setIsRoleModalOpen(true);
  };

  // Aca estoy revisando
  const handleSaveRole = (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as any;
      const roleName = form.rolename.value.toUpperCase();
      
      if (editingRoleDef) {
          const newDefs = roleDefinitions.map(rd => rd.role === editingRoleDef.role ? { ...rd, name: roleName } : rd);
          onUpdateRoleDefinitions(newDefs);
          notify("Perfil actualizado", "success");
      } else {
          console.log(roleName.trim().toUpperCase().replace(/\s+/g, '_'));
          const newDef: RoleDefinition = {
              role: roleName.trim().toUpperCase().replace(/\s+/g, '_'),
              name: roleName,
              permissions: []
          };
          onUpdateRoleDefinitions([...roleDefinitions, newDef]);
          notify("Nuevo perfil creado", "success");
      }
      setIsRoleModalOpen(false);
  };

  const handleTogglePermission = (role: UserRole, perm: Permission) => {
    const newDefs = roleDefinitions.map(rd => rd.role === role ? { ...rd, permissions: rd.permissions.includes(perm) ? rd.permissions.filter(p => p !== perm) : [...rd.permissions, perm] } : rd);
    onUpdateRoleDefinitions(newDefs);
  };

  const toggleRoleExpansion = (role: string) => {
      const next = new Set(expandedRoles);
      if (next.has(role)) next.delete(role); else next.add(role);
      setExpandedRoles(next);
  };

  const saveLoyalty = () => {
    onUpdateLoyalty({ 
        ...loyaltyConfig, 
        enabled: loyaltyEnabled, 
        accumulationBaseAmount: parseFloat(loyaltyBase || '0'), 
        pointsPerCurrency: parseFloat(loyaltyPointsPer || '0'), 
        currencyPerPoint: parseFloat(loyaltyCurrencyPer || '0'), 
        minRedemptionPoints: parseFloat(loyaltyMin || '0'), 
        birthdayDiscountPercentage: loyaltyConfig.birthdayDiscountPercentage || 0 
    });
  };

  const saveImpoconsumo = () => {
      onUpdateImpoconsumo({
          enabled: impocEnabled,
          rate: impocRate / 100,
          appliesTo: impocApplies,
          pucAccountId: impocPucId
      });
      notify("Configuración de Impoconsumo guardada", "success");
  };

  return (
    <div className="p-4 md:p-8 h-full bg-slate-50 overflow-y-auto pb-24 md:pb-8">
      <div className="mb-8">
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
            <Settings  className="text-brand-600" size={32} />
            Administración Sistema
          </h2>
          <p className="text-slate-500 font-medium text-xs tracking-widest mt-1">Configuración técnica, fiscal y operativa</p>
      </div>

      <div className="flex p-1.5 bg-slate-200/50 rounded-2xl mb-8 overflow-x-auto no-scrollbar shadow-inner w-full">
        {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 px-5 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
            </button>
        ))}
      </div>

      <div className="animate-in fade-in duration-300">
          {activeTab === 'branches' && (
              <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-800 tracking-tighter">Gestión de Sedes</h3>
                    <button onClick={() => openBranchModal()} className="bg-brand-600 text-white px-6 py-2.5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-brand-700 transition-all active:scale-95">
                    <Plus size={16}/> Nueva Sucursal</button>
                  </div>

                  {branches.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                                  <div className="bg-slate-100 w-32 h-32 rounded-full flex items-center justify-center mb-6">
                                    <Store size={48} className="text-slate-300" />
                                  </div>
                                  <h3 className="text-2xl font-black">
                                    Sin sucursales
                                  </h3>
                                  <p className="text-slate-500 mt-3 max-w-xs">
                                    No existen sucursales registradas
                                  </p>
                                  <button onClick={() => openBranchModal()}
                                    className="mt-8 bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] flex items-center gap-2"
                                  >
                                    <Plus size={18} />
                                    Crear primera sucursal
                                  </button>
                                </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {branches.map(b => (
                                <div key={b.id} className={`bg-white p-6 rounded-3xl shadow-sm border transition-all relative overflow-hidden group ${b.id === currentBranchId ? 'border-brand-500 ring-2 ring-brand-50 shadow-xl' : 'border-slate-100 hover:border-brand-200'}`}>
                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg overflow-hidden border-2 ${b.id === currentBranchId ? 'border-brand-100' : 'border-slate-100'}`}>
                                            <img src={b.logoUrl || `${import.meta.env.VITE_URL_BASE}/assets/img/default.png`} className="w-full h-full object-cover" alt="Logo"/>
                                        </div>
                                        <div>
                                        <h3 className="font-black text-slate-800 uppercase text-sm leading-tight">{b.name}</h3>
                                        <div className="flex items-center gap-1 mt-1 text-slate-400">
                                            <MapPin size={12} />
                                            <span className="text-[10px] font-bold uppercase truncate max-w-[150px]">{b.address}</span>
                                        </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => openBranchModal(b)} className="text-slate-400 hover:text-brand-600 p-2 transition-colors bg-slate-50 rounded-xl"><Edit2 size={18}/></button>
                                    </div>
                                    </div>
                                    <div className="space-y-2 mt-4 text-[11px] font-medium text-slate-600">
                                        {b.nit && <div className="flex items-center gap-3"><Fingerprint size={14} className="text-brand-500" /><span>NIT: {b.nit}</span></div>}
                                        <div className="flex items-center gap-3"><Phone size={14} className="text-brand-500" /><span>{b.phone || 'Sin teléfono'}</span></div>
                                        <div className="flex items-center gap-3"><Mail size={14} className="text-brand-500" /><span>{b.email || 'Sin correo'}</span></div>
                                        <div className="flex items-center gap-3"><Clock size={14} className="text-slate-300" /><span className="truncate">{b.businessHours || 'Horario no definido'}</span></div>
                                    </div>
                                    <button onClick={() => onChangeBranch(b.id)} className={`mt-6 w-full py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${b.id === currentBranchId ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                                    {b.id === currentBranchId ? 'Sucursal Seleccionada' : 'Seleccionar Sucursal'}
                                    </button>
                                    <div className={`absolute -right-8 -bottom-8 w-24 h-24 rounded-full opacity-5 pointer-events-none group-hover:scale-150 transition-transform ${b.id === currentBranchId ? 'bg-brand-600' : 'bg-slate-600'}`}></div>
                                </div>
                            ))}
                        </div>
                    )}
              </div>
          )}

          {activeTab === 'tax' && (
              <div className="mx-auto space-y-8 animate-in fade-in">
                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden relative group">
                      <div className="flex items-center gap-4 mb-8 bg-slate-50/50 p-4 -mx-8 -mt-8 border-b border-slate-50">
                          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm"><Percent size={28}/></div>
                          <div><h3 className="text-xl font-black text-slate-800 tracking-tighter">Impuesto a las Ventas (IVA)</h3><p className="text-slate-400 text-[10px] font-bold tracking-widest">Configuración global de gravamen comercial.</p></div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
                          <div className="flex-1 w-full">
                              <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Tarifa IVA (%)</label>
                              <div className="flex items-center gap-4">
                                  <input type="range" min="0" max="30" className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-600" value={tempTaxRate} onChange={e => setTempTaxRate(parseInt(e.target.value))} />
                                  <span className="text-2xl font-black text-slate-800 w-16">{tempTaxRate}%</span>
                              </div>
                          </div>
                          <button onClick={() => { onUpdateTax(tempTaxRate/100); notify("IVA actualizado", "success"); }} className="w-full sm:w-auto bg-slate-900 text-white px-10 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-brand-600 transition-all">Aplicar Cambios</button>
                      </div>
                      <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-blue-600 rounded-full opacity-5 pointer-events-none group-hover:scale-150 transition-transform"></div>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
                      <div className="flex justify-between items-center mb-8 bg-slate-50/50 p-4 -mx-8 -mt-8 border-b border-slate-50">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-sm"><Scale size={28}/></div>
                          <div><h3 className="text-xl font-black text-slate-800 tracking-tighter">Impuesto Nacional al Consumo</h3><p className="text-slate-400 text-[10px] font-bold tracking-widest">Configuración técnica para hostelería.</p></div>
                        </div>
                        <button onClick={() => setImpocEnabled(!impocEnabled)} className={`w-14 h-7 rounded-full relative transition-all ${impocEnabled ? 'bg-brand-600' : 'bg-slate-300'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${impocEnabled ? 'left-8' : 'left-1'}`}></div></button>
                      </div>
                      
                      <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 transition-all ${impocEnabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                          <div className="space-y-6">
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Tarifa Impoconsumo (%)</label><input type="number" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-lg focus:ring-2 focus:ring-brand-500 outline-none" value={impocRate} onChange={e => setImpocRate(parseFloat(e.target.value))} /></div>
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Aplicabilidad</label><select className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-xs uppercase" value={impocApplies} onChange={e => setImpocApplies(e.target.value as any)}><option value="PREPARED">Solo Servicios Preparados</option><option value="DIRECT">Solo Venta Directa</option><option value="BOTH">Todos los Productos</option></select></div>
                          </div>
                          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Cuenta Contable Destino</label><select className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-xs" value={impocPucId} onChange={e => setImpocPucId(e.target.value)}><option value="">Seleccione Cuenta PUC...</option>{puc.map(acc => <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>)}</select></div>
                      </div>
                      <div className="mt-8 flex justify-end relative z-10"><button onClick={saveImpoconsumo} disabled={!impocEnabled} className="bg-slate-900 text-white px-10 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-brand-600 transition-all disabled:opacity-30">Guardar Impoconsumo</button></div>
                      <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-orange-600 rounded-full opacity-5 pointer-events-none group-hover:scale-150 transition-transform"></div>
                  </div>
              </div>
          )}

          {activeTab === 'registers' && (
              <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-800 tracking-tighter">Terminales de Venta</h3>
                    <button onClick={() => openRegisterModal()} className="bg-brand-600 text-white px-6 py-2.5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl active:scale-95 hover:bg-brand-700 transition-all">
                        <Plus size={16}/> Nueva Caja
                    </button>
                  </div>

                  {registers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                                  <div className="bg-slate-100 w-32 h-32 rounded-full flex items-center justify-center mb-6">
                                    <Store size={48} className="text-slate-300" />
                                  </div>
                                  <h3 className="text-2xl font-black">
                                    Sin terminales de ventas
                                  </h3>
                                  <p className="text-slate-500 mt-3 max-w-xs">
                                    No existen terminales de ventas registradas
                                  </p>
                                  <button onClick={() => openRegisterModal()} className="mt-8 bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
                                    <Plus size={18} />
                                    Crear primera terminal de venta
                                  </button>
                                </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {registers.filter(r => r.isActive && r.branchId === currentBranchId).map(reg => (
                                <div key={reg.id} className={`bg-white p-6 rounded-3xl shadow-sm border transition-all relative overflow-hidden group ${reg.isOpen ? 'border-emerald-500 ring-2 ring-emerald-50 shadow-xl' : 'border-slate-100 hover:border-brand-200'}`}>
                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm border-2 ${reg.isOpen ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                        <Wallet size={28}/>
                                        </div>
                                        <div>
                                        <h3 className="font-black text-slate-800 uppercase text-sm leading-tight truncate max-w-[150px]">{reg.name}</h3>
                                        <div className="flex items-center gap-1 mt-1 text-slate-400">
                                            <Monitor size={12} />
                                            <span className="text-[10px] font-bold uppercase">{reg.type}</span>
                                        </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => openRegisterModal(reg)} className="text-slate-400 hover:text-brand-600 p-2 transition-colors bg-slate-50 rounded-xl"><Edit2 size={18}/></button>
                                        {/*<button onClick={() => handleDeleteReg(reg)} className="text-slate-400 hover:text-red-500 p-2 transition-colors bg-slate-50 rounded-xl"><Trash2 size={18}/></button>*/}
                                    </div>
                                    </div>
                                    <div className="space-y-2 mt-4 text-[11px] font-medium text-slate-600">
                                        <div className="flex items-center gap-3"><Printer size={14} className="text-brand-500" /><span>Modo: {reg.printType}</span></div>
                                        <div className="flex items-center gap-3"><CheckCircle size={14} className={reg.isOpen ? 'text-emerald-500' : 'text-slate-300'} /><span>{reg.isOpen ? 'Turno Activo' : 'Caja Cerrada'}</span></div>
                                        {reg.autoPrint && <div className="flex items-center gap-3 text-emerald-600 font-black"><Zap size={14}/><span>Auto-Print ON</span></div>}
                                    </div>
                                    <button className={`mt-6 w-full py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${reg.isOpen ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                        {reg.isOpen ? 'Turno Activo' : 'Caja Inactiva'}
                                    </button>
                                    <div className={`absolute -right-8 -bottom-8 w-24 h-24 rounded-full opacity-5 pointer-events-none group-hover:scale-150 transition-transform ${reg.isOpen ? 'bg-emerald-600' : 'bg-slate-600'}`}></div>
                                </div>
                            ))}
                        </div>
                    )}
              </div>
          )}

          {activeTab === 'catalog' && (
              <div className="space-y-6">
                   <div className="flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-800 tracking-tighter">Categorías Servicio</h3>
                    <button onClick={() => openCategoryModal()} className="bg-brand-600 text-white px-6 py-2.5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-brand-700 transition-all active:scale-95">
                        <Plus size={16}/> Nueva Categoría</button>
                    </div>

                    {categories.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                                  <div className="bg-slate-100 w-32 h-32 rounded-full flex items-center justify-center mb-6">
                                    <Store size={48} className="text-slate-300" />
                                  </div>
                                  <h3 className="text-2xl font-black">
                                    Sin categorias
                                  </h3>
                                  <p className="text-slate-500 mt-3 max-w-xs">
                                    No existen categorias registradas
                                  </p>
                                  <button onClick={() => openCategoryModal()} className="mt-8 bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
                                    <Plus size={18} />
                                    Crear primera categoria
                                  </button>
                                </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {categories.map(cat => (
                                <div key={cat.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm transition-all relative overflow-hidden group hover:border-brand-200 hover:shadow-xl">
                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center border-2 border-slate-100 group-hover:bg-brand-50 group-hover:text-brand-600 group-hover:border-brand-100 transition-all shadow-sm">
                                                <LayoutGrid size={28}/>
                                            </div>
                                            <div>
                                                <h3 className="font-black text-slate-800 uppercase text-sm leading-tight">{cat.name}</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Categoría de Servicio</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => openCategoryModal(cat)} className="p-2 text-slate-400 hover:text-brand-600 transition-colors bg-slate-50 rounded-xl"><Edit2 size={18}/></button>
                                            {/*<button  onClick={() => handleDeleteCategory(cat)} className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-slate-50 rounded-xl"><Trash2 size={18}/></button>*/}
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <div className={`w-2 h-2 rounded-full ${cat.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                        {cat.isActive ? 'Estado Activo' : 'Estado Inactivo'}
                                    </div>
                                    <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-brand-600 rounded-full opacity-5 pointer-events-none group-hover:scale-150 transition-transform"></div>
                                </div>
                            ))}
                        </div>
                    )}
              </div>
          )}

          {activeTab === 'team' && (
              <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-800 tracking-tighter">Equipo de Trabajo</h3>
                    <button onClick={() => openUserModal()} className="bg-brand-600 text-white px-6 py-2.5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-brand-700 transition-all active:scale-95">
                        <Plus size={16}/> Nuevo personal
                    </button>
                  </div>

                  {users.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                                  <div className="bg-slate-100 w-32 h-32 rounded-full flex items-center justify-center mb-6">
                                    <Store size={48} className="text-slate-300" />
                                  </div>
                                  <h3 className="text-2xl font-black">
                                    Sin personal en el equipo
                                  </h3>
                                  <p className="text-slate-500 mt-3 max-w-xs">
                                    No existen personal registrado
                                  </p>
                                  <button onClick={() => openUserModal()} className="mt-8 bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
                                    <Plus size={18} />
                                    Crear primera personal
                                  </button>
                                </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {users.map(u => (
                                <div key={u.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm transition-all relative overflow-hidden group hover:border-brand-200 hover:shadow-xl">
                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-2xl text-slate-400 group-hover:bg-brand-600 group-hover:text-white transition-all shadow-sm border-2 border-slate-100 group-hover:border-brand-50">{u.name.charAt(0)}</div>
                                            <div>
                                                <h4 className="font-black text-slate-800 uppercase text-sm leading-tight">{u.name}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                    {roleDefinitions.find(rd => rd.role === u.role)?.name || u.role.replace('_', ' ')}
                                                </p>
                                            </div>
                                        </div>
                                        <button onClick={() => openUserModal(u)} className="p-2 text-slate-400 hover:text-brand-600 transition-all bg-slate-50 rounded-xl"><Edit2 size={18}/></button>
                                    </div>
                                    <div className="space-y-2 mt-4 text-[11px] font-medium text-slate-600">
                                        <div className="flex items-center gap-3"><Mail size={14} className="text-brand-500" /><span className="truncate max-w-[150px]">{u.email}</span></div>
                                        <div className="flex items-center gap-3"><Key size={14} className="text-brand-500" /><span>PIN Acceso: ****</span></div>
                                        <div className="flex items-center gap-3"><Store size={14} className="text-slate-300" /><span>{u.branchId ? branches.find(b => b.id === u.branchId)?.name : 'Acceso Global'}</span></div>
                                    </div>
                                    <button onClick={() => openUserModal(u)} className="mt-6 w-full py-4 rounded-2xl bg-slate-50 text-slate-500 hover:bg-slate-100 text-[9px] font-black uppercase tracking-widest transition-all">Ver Perfil Completo</button>
                                    <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-brand-600 rounded-full opacity-5 pointer-events-none group-hover:scale-150 transition-transform"></div>
                                </div>
                            ))}
                        </div>
                    )}
              </div>
          )}

          {activeTab === 'roles' && (
              <div className="space-y-6">
                   <div className="bg-brand-50 p-8 rounded-3xl border border-brand-100 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden group">
                        <div className="flex items-center gap-6 relative z-10">
                            <div className="w-16 h-16 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg"><ShieldAlert size={36} /></div>
                            <div>
                                <h3 className="text-2xl font-black text-brand-800 tracking-tighter leading-none">Matriz de Permisos</h3>
                                <p className="text-xs font-bold text-brand-600 tracking-widest mt-2">Configure el acceso granular por rol laboral para máxima seguridad.</p>
                            </div>
                        </div>
                        {/*<button onClick={() => openRoleModal()} className="relative z-10 bg-slate-900 text-white px-8 py-3.5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-xl hover:bg-brand-600 transition-all active:scale-95">
                            <UserPlus size={18} /> Nuevo Perfil
                        </button>*/}
                        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-brand-600 rounded-full opacity-5 pointer-events-none group-hover:scale-110 transition-transform"></div>
                   </div>

                   <div className="space-y-4">
                       {roleDefinitions.map(def => (
                           <div key={def.role} className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm transition-all hover:border-brand-200">
                               <div className={`w-full px-8 py-6 flex justify-between items-center transition-all ${expandedRoles.has(def.role) ? 'bg-slate-50 border-b border-slate-100' : 'hover:bg-slate-50'}`}>
                                   <button onClick={() => toggleRoleExpansion(def.role)} className="flex items-center gap-5 flex-1 text-left">
                                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm ${expandedRoles.has(def.role) ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}><ShieldCheck size={24}/></div>
                                       <div>
                                           <h4 className="font-black text-slate-800 uppercase text-sm tracking-tight">{def.name}</h4>
                                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{def.permissions.length} PERMISOS ASIGNADOS</p>
                                       </div>
                                   </button>
                                   <div className="flex items-center gap-2">
                                       {/*<button onClick={() => openRoleModal(def)} className="p-2 text-slate-300 hover:text-brand-600 transition-colors bg-white rounded-xl shadow-sm border border-slate-100"><Edit2 size={16}/></button>*/}
                                       {/*<button onClick={() => handleDeleteRole(def.role)} className="p-2 text-slate-300 hover:text-red-600 transition-colors bg-white rounded-xl shadow-sm border border-slate-100"><Trash2 size={16}/></button>*/}
                                       <button onClick={() => toggleRoleExpansion(def.role)} className="ml-2 p-2 text-slate-300 hover:text-slate-800 transition-all">
                                           {expandedRoles.has(def.role) ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}
                                       </button>
                                   </div>
                               </div>
                               {expandedRoles.has(def.role) && (
                                   <div className="p-8 bg-white grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
                                       {Object.values(Permission).map(perm => (
                                           <label key={perm} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:border-brand-300 transition-all hover:bg-white">
                                               <input type="checkbox" className="w-5 h-5 rounded-md border-slate-300 text-brand-600 focus:ring-brand-500" checked={def.permissions.includes(perm)} onChange={() => handleTogglePermission(def.role, perm)} />
                                               <span className="text-[10px] font-black uppercase text-slate-600 leading-tight">{perm.split('.').join(' ')}</span>
                                           </label>
                                       ))}
                                   </div>
                               )}
                           </div>
                       ))}
                   </div>
              </div>
          )}

          {activeTab === 'loyalty' && (
              <div className="mx-auto space-y-6 animate-in fade-in">
                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
                      <div className="flex justify-between items-center mb-8 bg-slate-50/50 p-4 -mx-8 -mt-8 border-b border-slate-50">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center shadow-sm border-2 border-brand-100">
                            <Gift size={28}/>
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tighter">Programa de Puntos</h3>
                            <p className="text-slate-400 text-[10px] font-bold tracking-widest mt-1">Configura cómo tus clientes ganan recompensas.</p>
                          </div>
                        </div>
                        <button onClick={() => setLoyaltyEnabled(!loyaltyEnabled)} className={`w-14 h-7 rounded-full relative transition-all ${loyaltyEnabled ? 'bg-brand-600' : 'bg-slate-300'}`}>
                          <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${loyaltyEnabled ? 'left-8' : 'left-1'}`}></div>
                        </button>
                      </div>

                      <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 transition-all ${loyaltyEnabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                          <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Base Mínima de Acumulación ($)</label>
                                <input type="number" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-lg focus:ring-2 focus:ring-brand-500 outline-none" value={loyaltyBase} onChange={e => setLoyaltyBase(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Puntos ganados por cada $1.000</label>
                                <input type="number" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-lg focus:ring-2 focus:ring-brand-500 outline-none" value={loyaltyPointsPer} onChange={e => setLoyaltyPointsPer(e.target.value)} />
                            </div>
                          </div>
                          <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Valor en $ de cada punto redimido</label>
                                <input type="number" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-lg focus:ring-2 focus:ring-brand-500 outline-none" value={loyaltyCurrencyPer} onChange={e => setLoyaltyCurrencyPer(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Mínimo de puntos para redimir</label>
                                <input type="number" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-lg focus:ring-2 focus:ring-brand-500 outline-none" value={loyaltyMin} onChange={e => setLoyaltyMin(e.target.value)} />
                            </div>
                          </div>
                      </div>

                      <div className="mt-10 pt-8 border-t border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4 relative z-10">
                          <div className="flex items-center gap-3 bg-brand-50/50 p-4 rounded-2xl border border-brand-100">
                            <Info size={20} className="text-brand-600" />
                            <p className="text-[10px] text-brand-800 font-bold uppercase leading-relaxed">
                              Ejemplo: Consumo de $10.000 generará {(parseFloat(loyaltyPointsPer) * (10000/1000)).toFixed(0)} puntos,<br/>equivale a ${((parseFloat(loyaltyPointsPer) * (10000/1000)) * parseFloat(loyaltyCurrencyPer)).toLocaleString()} en descuentos.
                            </p>
                          </div>
                          <button onClick={saveLoyalty} className="w-full sm:w-auto bg-slate-900 text-white font-black py-5 px-10 rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-brand-600 transition-all flex items-center gap-3 active:scale-95">
                            <Save size={20}/> Guardar Programa
                          </button>
                      </div>
                      <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-brand-600 rounded-full opacity-5 pointer-events-none group-hover:scale-150 transition-transform"></div>
                  </div>
              </div>
          )}
      </div>

      {isBranchModalOpen && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="bg-brand-600 p-2 rounded-xl text-white shadow-lg"><Store size={20}/></div>
                    <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">{editingBranch ? 'Ficha de Sucursal' : 'Alta de Nueva Sede'}</h3>
                  </div>
                  <button onClick={() => setIsBranchModalOpen(false)} className="bg-white p-2 rounded-xl shadow-sm text-slate-400 hover:text-slate-700 transition-all"><X size={20}/></button>
                </div>
                <form onSubmit={handleSaveBranch} className="p-8 space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nombre de la Sede</label>
                                <input required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black uppercase text-xs focus:ring-2 focus:ring-brand-500 outline-none" value={bName} onChange={e => setBName(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Dirección Física</label>
                                <input required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-xs" value={bAddress} onChange={e => setBAddress(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Teléfono</label>
                                    <input className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-xs" value={bPhone} onChange={e => setBPhone(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">NIT / RUC</label>
                                    <input className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-xs" value={bNit} onChange={e => setBNit(e.target.value)} />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="relative group">
                                <div className="h-40 w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:border-brand-300 transition-all" onClick={() => branchFileInputRef.current?.click()}>
                                    {bLogo ? <img src={bLogo} className="w-full h-full object-cover" alt="Logo preview" /> : <><ImageIcon size={40} className="text-slate-200 mb-2" /><span className="text-[10px] font-black text-slate-400">Logo Sucursal</span></>}
                                    <input type="file" ref={branchFileInputRef} className="hidden" accept="image/*" onChange={handleBranchImageUpload} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Horarios de Atención</label>
                                <input placeholder="Ej: L-V 8:00 - 22:00" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-xs" value={bHours} onChange={e => setBHours(e.target.value)} />
                            </div>
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-slate-900 text-white font-black py-6 rounded-[2.5rem] uppercase tracking-widest text-[10px] shadow-xl active:scale-95 transition-all">Guardar Sucursal</button>
                </form>
            </div>
          </div>
      )}

      {isRegisterModalOpen && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="bg-brand-600 p-2 rounded-xl text-white shadow-lg"><Wallet size={20}/></div>
                    <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">{editingRegister ? 'Ajustar Terminal' : 'Nueva Caja'}</h3>
                  </div>
                  <button onClick={() => setIsRegisterModalOpen(false)} className="bg-white p-2 rounded-xl shadow-sm text-slate-400 hover:text-slate-700 transition-all"><X size={20}/></button>
                </div>
                <form onSubmit={handleSaveRegister} className="p-8 space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nombre de la Caja</label>
                    <input name="rname" placeholder="CAJA 1, BARRA, ETC" required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black uppercase text-xs focus:ring-2 focus:ring-brand-500 outline-none" defaultValue={editingRegister?.name} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Tipo</label>
                        <select name="rtype" required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black uppercase text-[10px] focus:ring-2 focus:ring-brand-500 outline-none" defaultValue={editingRegister?.type || 'CAJA'}>
                            {Object.values(RegisterType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Impresión</label>
                        <select name="rprintType" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black uppercase text-[10px] focus:ring-2 focus:ring-brand-500 outline-none" defaultValue={editingRegister?.printType || 'PDF'}>
                            <option value="PDF">VIRTUAL (PDF)</option>
                            <option value="QZIO">IMPRESORA TÉRMICA (QZ.IO)</option>
                        </select>
                      </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nombre Impresora (QZ.io)</label>
                        <input name="rprinterName" placeholder="EJ: EPSON-TM-T20" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-xs focus:ring-2 focus:ring-brand-500 outline-none" defaultValue={editingRegister?.qzPrinterName} />
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl">
                        <input type="checkbox" id="rautoPrint" name="rautoPrint" defaultChecked={editingRegister?.autoPrint} className="w-6 h-6 rounded-md border-slate-300 text-brand-600 focus:ring-brand-500" />
                        <label htmlFor="rautoPrint" className="text-[11px] font-black uppercase text-emerald-700">Auto-Print al Cobrar</label>
                      </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Pie de Página del Ticket</label>
                    <textarea name="rfooter" rows={2} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-xs focus:ring-2 focus:ring-brand-500 outline-none" defaultValue={editingRegister?.ticketFooter || '¡Gracias por su visita!'}></textarea>
                  </div>
                  <button type="submit" className="w-full bg-slate-900 text-white font-black py-6 rounded-[2.5rem] uppercase tracking-widest text-[10px] shadow-xl active:scale-95 transition-all">Guardar Terminal</button>
                </form>
            </div>
          </div>
      )}

      {isCategoryModalOpen && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-brand-600 p-2 rounded-xl text-white shadow-lg"><LayoutGrid size={20}/></div>
                        <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">{editingCategory ? 'Ajustar Categoría' : 'Nueva Categoría'}</h3>
                    </div>
                    <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 bg-white rounded-xl shadow-sm text-slate-400"><X size={20}/></button>
                </div>
                <form onSubmit={handleSaveCategory} className="p-8 space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nombre de la Categoría</label>
                        <input name="cname" required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black uppercase text-xs focus:ring-2 focus:ring-brand-500 outline-none" defaultValue={editingCategory?.name} />
                    </div>
                    <button type="submit" className="w-full bg-slate-900 text-white font-black py-6 rounded-[2.5rem] shadow-xl uppercase tracking-widest text-[10px] active:scale-95 transition-all">Guardar Categoría</button>
                </form>
            </div>
          </div>
      )}

      {isUserModalOpen && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-brand-600 p-2 rounded-xl text-white shadow-lg"><Users size={20}/></div>
                        <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">{editingUser ? 'Ficha de Personal' : 'Nuevo Integrante'}</h3>
                    </div>
                    <button onClick={() => setIsUserModalOpen(false)} className="p-2 bg-white rounded-xl shadow-sm text-slate-400"><X size={20}/></button>
                </div>
                <form onSubmit={handleSaveUser} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nombre Completo</label>
                            <input name="uname" required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black uppercase text-xs focus:ring-2 focus:ring-brand-500 outline-none" defaultValue={editingUser?.name} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Correo Corporativo</label>
                            <input name="uemail" type="email" required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-xs focus:ring-2 focus:ring-brand-500 outline-none" defaultValue={editingUser?.email} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">PIN de Acceso</label>
                                <input name="upin" required maxLength={4} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-center text-lg focus:ring-2 focus:ring-brand-500 outline-none" defaultValue={editingUser?.pin} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Perfil / Rol de Seguridad</label>
                                <select name="urole" required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black uppercase text-[10px] focus:ring-2 focus:ring-brand-500 outline-none" defaultValue={editingUser?.role}>
                                    {roleDefinitions.map(rd => <option key={rd.role} value={rd.role}>{rd.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Asignar a Sucursal</label>
                            <select name="ubranch" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black uppercase text-[10px] focus:ring-2 focus:ring-brand-500 outline-none" defaultValue={editingUser?.branchId || ''}>
                                <option value="">ACCESO GLOBAL (TODAS)</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-slate-900 text-white font-black py-6 rounded-[2.5rem] shadow-xl uppercase tracking-widest text-[10px] active:scale-95 transition-all">Guardar Datos</button>
                </form>
            </div>
          </div>
      )}

      {/* MODAL PARA AGREGAR/EDITAR ROLES (PERFILES) */}
      {isRoleModalOpen && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[1100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-900 p-2 rounded-xl text-white shadow-lg"><Shield size={20}/></div>
                        <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">{editingRoleDef ? 'Editar Perfil' : 'Nuevo Perfil'}</h3>
                    </div>
                    <button onClick={() => setIsRoleModalOpen(false)} className="p-2 bg-white rounded-xl shadow-sm text-slate-400"><X size={20}/></button>
                </div>
                <form onSubmit={handleSaveRole} className="p-8 space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nombre del Perfil</label>
                        <input name="rolename" required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black uppercase text-xs focus:ring-2 focus:ring-brand-500 outline-none" defaultValue={editingRoleDef?.name} placeholder="EJ: SUPERVISOR NOCTURNO" />
                    </div>
                    <button type="submit" className="w-full bg-brand-600 text-white font-black py-6 rounded-[2.5rem] shadow-xl uppercase tracking-widest text-[10px] active:scale-95 transition-all">
                        {editingRoleDef ? 'Actualizar Perfil' : 'Crear Perfil de Seguridad'}
                    </button>
                </form>
            </div>
          </div>
      )}
    </div>
  );
};