import React from 'react';
import { LayoutDashboard, LogOut, Store, Grid3X3, MonitorPlay, BarChart3, 
  Scissors, ChevronDown, BookOpen, Calculator, Boxes, QrCode, Users, Settings, X } from 'lucide-react';
import { Branch, Role, Permission, UserRole } from '../types';

interface SidebarProps {
  currentView: string;
  onChangeView: (view: string) => void;
  onLogout: () => void;
  userRole: UserRole;
  userPermissions: Permission[];
  branches: Branch[];
  currentBranchId: string;
  onBranchChange: (branchId: string) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
    currentView, onChangeView, onLogout, userRole, userPermissions,
    branches, currentBranchId, onBranchChange,
    isMobileOpen, onCloseMobile
}) => {
  const allItems = [
    { id: 'dashboard', label: 'Tablero', icon: <LayoutDashboard size={20} />, permission: Permission.REPORTS_VIEW },
    { id: 'tables', label: 'Sillas', icon: <Grid3X3 size={20} />, permission: Permission.TABLES_MANAGE },
    { id: 'pos', label: 'Caja POS', icon: <Store size={20} />, permission: Permission.SALES_CREATE },
    { id: 'kds', label: 'Servicios KDS', icon: <MonitorPlay size={20} />, permission: Permission.KDS_VIEW },
    { id: 'products', label: 'Servicios', icon: <Scissors size={20} />, permission: Permission.PRODUCTS_VIEW },
    { id: 'menu_qr', label: 'Carta Digital', icon: <QrCode size={20} />, permission: Permission.PRODUCTS_VIEW },
    { id: 'warehouse', label: 'Inventario', icon: <Boxes size={20} />, permission: Permission.INVENTARIO_VER },
    { id: 'operational_mgmt', label: 'Gastos y Costos', icon: <Calculator size={20} />, permission: Permission.OPERATIVE_VIEW },
    { id: 'accounting', label: 'Contabilidad', icon: <BookOpen size={20} />, permission: Permission.CONTABILIDAD_PUC_VER },
    { id: 'reports', label: 'Reportes', icon: <BarChart3 size={20} />, permission: Permission.REPORTS_VIEW },
    { id: 'customers', label: 'Clientes', icon: <Users size={20} />, permission: Permission.CUSTOMERS_VIEW },
    { id: 'settings', label: 'Ajustes', icon: <Settings size={20} />, permission: Permission.SETTINGS_VIEW },
  ];

  const menuItems = allItems.filter(item => {
      if (!item.permission) return true;
      if (userRole === Role.SUPER_ADMIN) return true;
      return userPermissions.includes(item.permission);
  });

  const handleViewChange = (viewId: string) => {
    onChangeView(viewId);
    if (onCloseMobile) onCloseMobile();
  };

  const formatRole = (role: string | UserRole) => {
    const roleStr = typeof role === 'string' ? role : String(role);
    switch(roleStr) {
      case 'COMPANY_ADMIN': return 'ADMINISTRADOR';
      case 'ACCOUNTING_ADMIN': return 'CONTADOR GENERAL';
      case 'BRANCH_ADMIN': return 'GERENTE';
      case 'CASHIER': return 'CAJERO';
      case 'CHEF': return 'CHEF COCINA';
      case 'SUPER_ADMIN': return 'ADMINISTRADOR MAESTRO';
      default: return roleStr.replace('_', ' ');
    }
  };

  // Validar que branches sea un array válido
  const validBranches = Array.isArray(branches) ? branches : [];

  return (
    <>
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] md:hidden" 
          onClick={onCloseMobile}
        />
      )}

      <div className={`
        fixed md:static inset-y-0 left-0 z-[101] w-72 bg-slate-900 text-white h-screen flex flex-col shadow-2xl transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="bg-brand-600 p-2 rounded-lg shadow-lg shadow-brand-900/50">
               <Scissors size={24} className="text-white" />
             </div>
             <h1 className="text-xl font-bold tracking-tight text-white">APGE BarberOS</h1>
          </div>
          <button onClick={onCloseMobile} className="md:hidden text-slate-400 p-1">
            <X size={24} />
          </button>
        </div>
        
        <div className="px-6 py-4 border-b border-slate-800">
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest pl-1 border-l-2 border-brand-600">
            {formatRole(userRole)}
          </p>
          <div className="mt-5 space-y-3">
                <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5 block flex items-center gap-1">
                      <Store size={10} /> Sucursal
                    </label>
                    <div className="relative">
                        <select value={currentBranchId} onChange={(e) => onBranchChange(e.target.value)} className="w-full bg-slate-800 text-white text-xs font-medium border border-slate-700 rounded-lg py-2.5 pl-3 pr-8 outline-none focus:border-brand-500 appearance-none cursor-pointer">
                            {validBranches.length > 0 ? (
                              validBranches.map(b => (
                                <option key={b.id} value={b.id}>
                                  {b.name || 'Sin nombre'}
                                </option>
                              ))
                            ) : (
                              <option value="">No hay sucursales</option>
                            )}
                        </select>
                        <ChevronDown size={14} className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" />
                    </div>
                </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button 
              key={item.id} 
              onClick={() => handleViewChange(item.id)} 
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                currentView === item.id 
                  ? 'bg-brand-600 text-white shadow-lg font-medium' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span className="text-sm font-semibold">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={onLogout} 
            className="w-full flex items-center justify-center space-x-2 p-3 rounded-xl bg-slate-800 hover:bg-red-600 text-slate-300 transition-all font-bold text-xs uppercase tracking-widest"
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </>
  );
};