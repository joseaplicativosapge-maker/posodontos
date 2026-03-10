import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { POSView } from './components/POSView';
import { InventoryView } from './components/InventoryView';
import { TablesView } from './components/TablesView';
import { CustomersView } from './components/CustomersView';
import { SettingsView } from './components/SettingsView';
import { KDSView } from './components/KDSView';
import { ReportsView } from './components/ReportsView';
import { LoginView } from './components/LoginView';
import { AccountingView } from './components/AccountingView';
import { OperationalManagementView } from './components/OperationalManagementView';
import { ProductsView } from './components/ProductsView';
import { PublicReservation } from './components/PublicReservation';
import { QrMenuView } from './components/QrMenuView';
import { PublicMenu } from './components/PublicMenu';
import { useNotification } from './components/NotificationContext';
import { authService } from './services/auth.service';
import { dataService } from './services/data.service';
import { useBranch } from './components/BranchContext';
import { Menu, User, Bell, Store, LayoutGrid, MonitorPlay, Grid3X3 } from 'lucide-react';

import { 
  Order, Product, InventoryItem, Customer, Expense, Table, 
  CashRegister, RegisterSession, Category, RoleDefinition, 
  LoyaltyConfig, OrderStatus, PaymentMethod, ItemStatus,
  User as UserType, TableStatus, OrderType, Supplier,
  MovementType, PurchaseOrder, Permission, Role, ProductionArea,
  ExpensePeriodicity,
  ImpoconsumoConfig,
  PurchaseOrderItem,
  PatientTreatment
} from './types';
import { AccountingAccount, AccountingVoucher, AccountingEntry } from './types_accounting';
import { TreatmentView } from './components/TreatmentView';

const DEFAULT_LOYALTY: LoyaltyConfig = {
  enabled: false,
  accumulationBaseAmount: 0,
  pointsPerCurrency: 0,
  currencyPerPoint: 0,
  minRedemptionPoints: 0,
  birthdayDiscountPercentage: 0
};

const DEFAULT_IMPOCONSUMO: ImpoconsumoConfig = {
  enabled: false,
  rate: 0.08,
  appliesTo: 'BOTH'
};

const App: React.FC = () => {
  const { notify } = useNotification();
  const branchContext = useBranch();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  
  const [treatments, setTreatments] = useState<PatientTreatment[]>([]);

  const [roleDefinitions, setRoleDefinitions] = useState<RoleDefinition[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [settings, setSettings] = useState<any>(null);
  
  const [currentView, setCurrentView] = useState('dashboard');

  const [selectedTable, setSelectedTable] = useState<Table | undefined>(undefined);
  const [selectedSeat, setSelectedSeat] = useState<number | undefined>(undefined);

  const urlSegments = window.location.pathname.split('/');
  
  const menuIdx = urlSegments.indexOf('menu');
  const isPublicMenuRoute = menuIdx !== -1;
  const publicMenuBranchId = isPublicMenuRoute ? urlSegments[menuIdx + 1] : null;

  const resIdx = urlSegments.indexOf('reserva');
  const isPublicReservationRoute = resIdx !== -1;
  const publicReservationBranchId = isPublicReservationRoute ? urlSegments[resIdx + 1] : null;

  useEffect(() => {
    const initApp = async () => {
      // Si es ruta pública, solo marcar como cargado
      if (isPublicMenuRoute || isPublicReservationRoute) {
        try {
          // Cargar contexto público SIN auth
          const branchId = publicMenuBranchId || publicReservationBranchId;
          if (branchId) {
            // Obtener información de la sucursal por ID
            const branchInfo = await dataService.getBranchById(branchId);
            
            if (branchInfo && branchInfo.data) {
              const companyId = branchInfo.data.data.companyId;
              // Cargar contexto público
              await branchContext.initializePublicContext(companyId, branchId);
            }
          }
        } catch (e) {
          console.error("Error cargando contexto público");
        }

        setLoading(false);
        return;
      }

      // Verificar autenticación
      const token = localStorage.getItem('odontos_token');
      if (token) {
        try {
          const authData = await authService.verify();
          if (authData.valid) {
            setCurrentUser(authData.user);
            // Inicializar contexto solo si hay usuario autenticado
            await branchContext.initializeContext(authData.user);
            if (authData.user.branchId) branchContext.setBranchId(authData.user.branchId);
            // Cargar settings con companyId del usuario
            await loadSettings(authData.user.companyId);
          }
        } catch (e) {
          authService.logout();
        }
      }
      setLoading(false);
    };
    initApp();
  }, [isPublicMenuRoute, isPublicReservationRoute]);

  // Cargar datos solo cuando se necesiten
  const loadCustomersData = async (companyId?: string) => {
    try {
      const res = await dataService.getCustomers(companyId);
      setCustomers(res.data || []);
    } catch (error) {
      console.error("Error cargando clientes");
    }
  };

  const loadUsersAndRoles = async (companyId?: string) => {
    try {
      const [rolesRes, usersRes] = await Promise.all([
        dataService.getRoles(),
        dataService.getUsers(companyId)
      ]);
      setRoleDefinitions(rolesRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error) {
      console.error("Error cargando usuarios y roles");
    }
  };

  const loadSettings = async (companyId?: string) => {
    try {
      const res = await dataService.getSettings(companyId);
      setSettings(res.data);
    } catch (error) {
      console.error("Error cargando configuración");
    }
  };

  // Cargar solo lo necesario cuando el usuario hace login
  const handleLogin = async (user: UserType) => {
      setCurrentUser(user);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      if (user.branchId) {
          branchContext.setBranchId(user.branchId);
      } else {
          const currentBranches = branchContext.branches;
          if (currentBranches && currentBranches.length > 0) {
              branchContext.setBranchId(currentBranches[0].id);
          }
      }
      
      if (user.companyId) {
          branchContext.setCompanyId(user.companyId);
      }
      
      await branchContext.initializeContext(user);
      await loadSettings(user.companyId);
  };

  // Cargar datos cuando se cambia a cada vista
  useEffect(() => {
    if (!currentUser) return;
    const loadDataForView = async () => {
      switch (currentView) {
        case 'pos':
        case 'customers':
          await loadCustomersData(currentUser.companyId);
          await loadSettings(currentUser.companyId);
          break;
        case 'settings':
          await loadUsersAndRoles(currentUser.companyId);
          await loadSettings(currentUser.companyId);
          break;
        case 'operational_mgmt':
        case 'treatments':
          await loadCustomersData(currentUser.companyId);
          break;
        case 'reports':
          await loadSettings(currentUser.companyId);
          break;
      }
    };

    loadDataForView();
  }, [currentView, currentUser]);

  const handleUpdateOrderItems = async (orderId: string, area: ProductionArea | 'ALL') => {
    try {
      const order = branchContext.orders.find(o => o.id === orderId);
      if (!order) return;
      
      const itemsToUpdate = order.items.filter(it => 
        (area === 'ALL' || it.product.productionArea === area) && 
        it.status !== ItemStatus.READY
      );
      
      if (itemsToUpdate.length === 0) {
        notify("Ya están despachados todos los ítems de esta área", "info");
        return;
      }
      
      await Promise.all(itemsToUpdate.map(async (item: any) => {
          if (item.id) {
              return dataService.updateKDSItemReady(item.id);
          }
      }));
      
      notify(`Ticket de ${area === 'ALL' ? 'Orden' : area} despachado`, "success");
      await branchContext.refreshBranchData();
      
    } catch (error) {
      console.error("Error despachando KDS:", error);
      notify("Error al comunicar con la API de KDS. Intente de nuevo.", "error");
      await branchContext.refreshBranchData();
    }
  };

  const loadTreatmentsData = async (branchId?: string) => {
    try {
      const res = await dataService.getTreatments(branchId);
      setTreatments(res.data || []);
    } catch (error) {
      console.error("Error cargando tratamientos");
    }
  };

  const handleAddTreatment = async (t: PatientTreatment) => {
    await dataService.saveTreatment({ ...t, isNew: true, companyId: branchContext.currentCompanyId });
    await loadTreatmentsData(branchContext.currentBranchId);
  };

  const handleUpdateTreatment = async (t: PatientTreatment) => {
    await dataService.saveTreatment(t);
    await loadTreatmentsData(branchContext.currentBranchId);
  };

  const handleDeleteTreatment = async (id: string) => {
    await dataService.deleteTreatment(id);
    await loadTreatmentsData(branchContext.currentBranchId);
  };

  // --- LOGICA DE BLOQUEO DE CAJA ---
  const isRegisterOpen = useMemo(() => {
    return branchContext.registers.some(r => r.isOpen);
  }, [branchContext.registers]);

  const activeSessionForUser = useMemo(() => {
    const openRegister = branchContext.registers.find(r => r.isOpen && r.currentUserId === currentUser?.id);
    if (!openRegister) return null;
    return {
      registerId: openRegister.id,
      userId: currentUser?.id || '',
      userName: currentUser?.name || '',
      openingAmount: openRegister.sessions?.[0]?.openingAmount ?? 0,
      totalSales: openRegister.sessions?.[0]?.totalSales ?? 0,
      startTime: new Date()
    } as RegisterSession;
  }, [branchContext.registers, branchContext.orders, currentUser]);

  const handleOpenRegister = async (registerId: string, amount: number) => {
    if (!currentUser) return;
    try {
      await dataService.openRegister(registerId, currentUser.id, currentUser.name, amount);
      notify("Turno iniciado correctamente", "success");
      await branchContext.refreshBranchData();
    } catch (e: any) {
      notify(e.response?.data?.error || "Error al abrir caja", "error");
    }
  };

  const handleCloseRegister = async (amount: number) => {
    if (!activeSessionForUser) return;
    try {
      await dataService.closeRegister(activeSessionForUser.registerId, amount);
      notify("Turno cerrado y arqueo registrado", "success");
      await branchContext.refreshBranchData();
    } catch (e: any) {
      notify(e.response?.data?.error || "Error al cerrar caja", "error");
    }
  };

  const activePermissions = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === Role.SUPER_ADMIN) {
      return Object.values(Permission);
    }
    return roleDefinitions.find(r => r.role === currentUser.role)?.permissions || [];
  }, [currentUser, roleDefinitions]);

  const handleSendOrder = async (items: any[], type: OrderType, customer?: Customer, existingOrderId?: string, toKDS?: boolean, seatNumber?: number, subtotal?: number, tax?: number, impoconsumo?: number, deliveryAddress?: string) => {
    try {
      await dataService.createOrder({
        id: existingOrderId,
        branchId: branchContext.currentBranchId,
        tableId: selectedTable?.id,
        seatNumber: seatNumber || selectedSeat,
        type,
        customerId: customer?.id,
        items: items.map(i => ({ productId: i.product.id, quantity: i.quantity, price: i.price })),
        status: OrderStatus.PENDING,
        subtotal: subtotal || 0,
        tax: tax || 0,
        impoconsumoAmount: impoconsumo || 0,
        total: (subtotal || 0) + (tax || 0) + (impoconsumo || 0),
        deliveryAddress
      });
      notify("Comanda enviada", "success");
      branchContext.refreshBranchData();
    } catch (e) { notify("Error al enviar comanda", "error"); }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  const printOrderTicket = useCallback((saleData: any) => {
    const branch = branchContext.branches.find(b => b.id === branchContext.currentBranchId);
    const register = branchContext.registers.find(r => r.isOpen && r.currentUserId === currentUser?.id);
    const companyName = settings?.name || 'OdontOS SaaS';
    
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) {
      notify("El navegador bloqueó la ventana de impresión", "warning");
      return;
    }

    const itemsHtml = saleData.items.map((it: any) => {
      const product = branchContext.products.find(p => p.id === it.productId);
      return `
        <tr>
          <td style="padding: 2px 0;">${it.quantity} x ${product?.name || 'PRODUCTO'}</td>
          <td align="right" style="padding: 2px 0;">${formatCurrency(it.price * it.quantity)}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket POS - ${branch?.name}</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              font-size: 11px; 
              width: 72mm; 
              padding: 4mm; 
              margin: 0;
              color: #000;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .header { margin-bottom: 3mm; }
            .logo { max-width: 40mm; height: auto; margin-bottom: 2mm; display: block; margin-left: auto; margin-right: auto; }
            .company-name { font-size: 14px; font-weight: bold; text-transform: uppercase; margin-bottom: 1mm; }
            .branch-name { font-size: 12px; font-weight: bold; margin-bottom: 1mm; }
            .divider { border-top: 1px dashed #000; margin: 2mm 0; }
            table { width: 100%; border-collapse: collapse; }
            .total-row { font-size: 13px; font-weight: bold; }
            .footer { margin-top: 4mm; font-size: 9px; line-height: 1.2; }
          </style>
        </head>
        <body>
          <div class="header center">
            ${branch?.logoUrl ? `<img src="${branch.logoUrl}" class="logo" alt="Logo"/>` : ''}
            <div class="company-name">${companyName}</div>
            <div class="branch-name">Sede: ${branch?.name || 'Principal'}</div>
            <div>${branch?.address || ''}</div>
            <div>NIT: ${branch?.nit || settings?.taxId || ''}</div>
            <div>TEL: ${branch?.phone || ''}</div>
          </div>
          
          <div class="divider"></div>
          <div class="bold">FACTURA POS: #${saleData.orderId?.slice(-6).toUpperCase() || 'VENTA-DIR'}</div>
          <div>FECHA: ${new Date().toLocaleString()}</div>
          <div>ATENDIDO POR: ${currentUser?.name || 'SISTEMA'}</div>
          <div class="divider"></div>

          <table>
            <thead>
              <tr>
                <th align="left">DESCRIPCIÓN</th>
                <th align="right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="divider"></div>
          <table style="width: 100%;">
            <tr><td>SUBTOTAL</td><td align="right">${formatCurrency(saleData.subtotal)}</td></tr>
            <tr><td>IVA (19%)</td><td align="right">${formatCurrency(saleData.tax)}</td></tr>
            ${saleData.impoconsumoAmount > 0 ? `<tr><td>IMPOCONSUMO (8%)</td><td align="right">${formatCurrency(saleData.impoconsumoAmount)}</td></tr>` : ''}
            <tr class="total-row"><td>TOTAL A PAGAR</td><td align="right">${formatCurrency(saleData.total)}</td></tr>
          </table>

          <div class="divider"></div>
          <div>MÉTODO DE PAGO: ${saleData.paymentMethod}</div>
          <div>EFECTIVO RECIBIDO: ${formatCurrency(saleData.receivedAmount || saleData.total)}</div>
          <div>CAMBIO: ${formatCurrency(saleData.changeAmount || 0)}</div>

          <div class="footer center">
            <p>${register?.ticketFooter || '¡MUCHAS GRACIAS POR SU PREFERENCIA!'}</p>
            <p>SISTEMA POS APGE ODONTOS v2.5<br/>Cloud Powered Infrastructure</p>
          </div>
          
          <script>
            window.onload = function() { 
              window.print(); 
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [branchContext, currentUser, settings, notify]);

  const handleProcessPayment = async (items: any[], total: number, type: any, method: any, customer?: any, redeemedPoints?: number, existingOrderId?: string, receivedAmount?: number, changeAmount?: number, seatNumber?: number, subtotal?: number, tax?: number, impoconsumo?: number, deliveryAddress?: string, tableId?: string) => {
    try {

      console.log("🚀 Items recibidos en pago:", items);
      const saleData = {
        orderId: existingOrderId,
        branchId: branchContext.currentBranchId,
        items: items.map(i => ({ productId: i.product.id, quantity: i.quantity, price: i.product.price })),
        paymentMethod: method,
        status: method ? OrderStatus.COMPLETED : OrderStatus.PENDING,
        subtotal: subtotal || (total / 1.19),
        tax: tax || (total - (total / 1.19)),
        impoconsumoAmount: impoconsumo || 0,
        total,
        redeemedPoints,
        receivedAmount,
        changeAmount,
        deliveryAddress,
        tableId,
        isSentToDIAN: true
      };

      await dataService.processSale(saleData);
      printOrderTicket(saleData);

      branchContext.refreshBranchData();
    } catch (error: any) { notify("Error: " + error.message, "error"); }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (isPublicReservationRoute && publicReservationBranchId) {
    const targetBranch = branchContext.branches.find(
      b => String(b.id) === String(publicReservationBranchId)
    );

    if (targetBranch) {
      return <PublicReservation branch={targetBranch} />;
    }

    if (branchContext.branches.length > 0) {
      return (
        <div className="h-screen flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-xs">
          Sucursal no encontrada
        </div>
      );
    }
  }
  
  if (isPublicMenuRoute && publicMenuBranchId) {
    const targetBranch = branchContext.branches.find(b => b.id === publicMenuBranchId);
    if (publicMenuBranchId) {
        return <PublicMenu products={branchContext.products} branch={targetBranch}/>;
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {currentUser && (
        <Sidebar 
          currentView={currentView} 
          onChangeView={setCurrentView} 
          onLogout={() => { authService.logout(); setCurrentUser(null); }} 
          userRole={currentUser.role as Role} 
          userPermissions={activePermissions} 
          branches={branchContext.branches} 
          currentBranchId={branchContext.currentBranchId} 
          onBranchChange={branchContext.setBranchId} 
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="flex flex-col flex-1 min-w-0">
      
      <main className="flex-1 h-full overflow-hidden relative">
        {branchContext.isLoadingBranch && (
          <div className="absolute top-0 left-0 w-full h-1 bg-brand-500/20 z-[100]">
            <div className="h-full bg-brand-600 animate-[loading_1.5s_infinite_linear] w-1/3"></div>
          </div>
        )}
        
        {!currentUser ? (
          <LoginView onLogin={handleLogin} />
        ) : (
          <>
            {currentView === 'dashboard' && (
              <Dashboard 
                products={branchContext.products} 
                inventory={branchContext.inventory} 
                orders={branchContext.orders} 
                ordersCompleted={branchContext.ordersCompleted}
                expenses={branchContext.expenses} 
                activeSession={activeSessionForUser} 
                registers={branchContext.registers} 
                onOpenRegister={handleOpenRegister} 
                onCloseRegister={handleCloseRegister} 
                currentUser={currentUser} 
                stats={branchContext.stats}
              />
            )}
            {currentView === 'pos' && (
              <POSView 
                isRegisterOpen={isRegisterOpen} 
                treatments={branchContext.treatments}
                products={branchContext.products} 
                inventory={branchContext.inventory}
                categories={branchContext.categories ?? []} 
                onProcessPayment={handleProcessPayment} 
                onSendOrder={handleSendOrder} 
                onCancelOrder={() => {}} 
                customers={customers} 
                selectedTable={selectedTable} 
                selectedSeat={selectedSeat} 
                onSelectTable={(t, s) => { setSelectedTable(t); setSelectedSeat(s); }} 
                tables={branchContext.tables} 
                orders={branchContext.orders} 
                taxRate={settings?.taxRate || 0.19} 
                impoconsumoConfig={settings?.impoconsumo || DEFAULT_IMPOCONSUMO} 
                userRole={currentUser.role as Role} 
                loyaltyConfig={settings?.loyalty || DEFAULT_LOYALTY} 
                onAddCustomer={loadCustomersData} 
                onUpdateCustomer={loadCustomersData} 
                onChangeTable={() => {}} 
                onViewTables={() => setCurrentView('tables')} 
                onOpenRegisterRequest={() => setCurrentView('dashboard')}
                posConfig={{} as any} 
                currentBranch={branchContext.branches.find(b => b.id === branchContext.currentBranchId)} 
                onPatchOrder={(id, up) => dataService.patchOrder(id, up).then(() => branchContext.refreshBranchData())} 
              />
            )}
            {currentView === 'tables' && (
              <TablesView 
                currentBranchId={branchContext.currentBranchId}
                tables={branchContext.tables} 
                onSelectTable={(t, s) => { setSelectedTable(t); setSelectedSeat(s); setCurrentView('pos'); }} 
                onAddTable={async (table) => {
                  await dataService.saveTable(table);
                  notify("Silla agregada correctamente a la sucursal", "success");
                  branchContext.refreshBranchData();
                }} 
                onUpdateTable={async (table) => {
                  await dataService.saveTable(table);
                  notify("Silla actualizada exitosamente", "success");
                  branchContext.refreshBranchData();
                }} 
                isRegisterOpen={isRegisterOpen} 
                onOpenRegisterRequest={() => setCurrentView('dashboard')}
              />
            )}
             {currentView === 'kds' && <KDSView orders={branchContext.orders} onUpdateOrderStatus={(id, s) => dataService.updateOrderStatus(id, s).then(() => branchContext.refreshBranchData())} onUpdateOrderItems={handleUpdateOrderItems} userRole={currentUser.role as Role} />}
             {currentView === 'warehouse' && (
              <InventoryView 
                movements={branchContext.movements} 
                currentBranchId={branchContext.currentBranchId}
                currentCompanyId={branchContext.currentCompanyId}
                products={branchContext.products} 
                inventory={branchContext.inventory} 
                suppliers={branchContext.suppliers} 
                categories={branchContext.categories ?? []} 
                onAddInventory={async (item) => {
                  try {
                    const res = await dataService.saveInventoryItem({ ...item, branchId: branchContext.currentBranchId }, false);
                    await branchContext.refreshBranchData();
                    return res.data || item;
                  } catch (e: any) {
                    notify("Fallo al guardar material en API", "error");
                  }
                }} 
                onUpdateInventory={async (item) => {
                  try {
                    const res = await dataService.saveInventoryItem(item, true);
                    await branchContext.refreshBranchData();
                    return res.data || item;
                  } catch (e: any) {
                    notify("Fallo al actualizar material en API", "error");
                  }
                }} 
                onAddProduct={async (p) => { 
                    const res = await dataService.saveProduct({...p, isNew: true});
                    await branchContext.refreshBranchData();
                    return res.data || p;
                }} 
                onUpdateProduct={async (p) => {  
                   const res = await dataService.saveProduct(p); 
                   await branchContext.refreshBranchData();
                   return res.data || p;
                }} 
              />
            )}
            {currentView === 'accounting' && <AccountingView puc={branchContext.puc} mappings={[]} onAddAccount={async () => {}} onUpdateAccount={async () => {}} onAddMapping={() => {}} onUpdateMapping={() => {}} taxRate={0.19} userPermissions={Object.values(Permission)} />}
            {currentView === 'customers' && (
              <CustomersView 
                customers={customers} 
                currentBranchId={branchContext.currentBranchId}
                currentCompanyId={branchContext.currentCompanyId}
                onAddCustomer={async (c) => {
                  await dataService.saveCustomer(c);
                  await loadCustomersData(branchContext.currentCompanyId);
                }} 
                onUpdateCustomer={async (c) => {
                  await dataService.saveCustomer(c);
                  await loadCustomersData(branchContext.currentCompanyId);
                }} 
              />
            )}
            {currentView === 'reports' && <ReportsView registers={branchContext.registers} orders={branchContext.orders} expenses={branchContext.expenses} inventory={branchContext.inventory} products={branchContext.products} puc={branchContext.puc} vouchers={branchContext.vouchers} userPermissions={Object.values(Permission)} customers={customers} suppliers={branchContext.suppliers} branches={branchContext.branches} currentBranchId={branchContext.currentBranchId} purchaseOrders={branchContext.purchaseOrders} onUpdateOrder={(order: Order) => dataService.patchOrder(order.id, order).then(() => branchContext.refreshBranchData())} />}
            {currentView === 'settings' && (
              <SettingsView 
                currentBranchId={branchContext.currentBranchId} 
                currentCompanyId={branchContext.currentCompanyId}
                branches={branchContext.branches} 
                onAddBranch={async (b) => {
                    await dataService.saveBranch(b);
                    await branchContext.refreshBranchData();
                    if (currentUser) await loadSettings(currentUser.companyId);
                }} 
                onUpdateBranch={async (b) => {
                    await dataService.saveBranch(b);
                    await branchContext.refreshBranchData();
                    if (currentUser) await loadSettings(currentUser.companyId);
                }} 
                onChangeBranch={branchContext.setBranchId} 
                puc={branchContext.puc} 
                impoconsumoConfig={settings?.impoconsumo || DEFAULT_IMPOCONSUMO} 
                onUpdateImpoconsumo={async (config) => {
                    try {
                        await dataService.updateSettings({ impoconsumo: config });
                        if (currentUser) await loadSettings(currentUser.companyId);
                        notify("Impoconsumo actualizado correctamente", "success");
                    } catch (e) {
                        notify("Fallo al actualizar Impoconsumo", "error");
                    }
                }}
                taxRate={settings?.taxRate || 0.19} 
                onUpdateTax={async (rate) => {
                    try {
                        await dataService.updateSettings({ taxRate: rate });
                        if (currentUser) await loadSettings(currentUser.companyId);
                        notify("Tasa de IVA global guardada", "success");
                    } catch (e) {
                        notify("Fallo al actualizar tasa IVA", "error");
                    }
                }} 
                registers={branchContext.registers} 
                onAddRegister={async (reg) => {
                    await dataService.saveRegister(reg);
                    branchContext.refreshBranchData();
                }} 
                onUpdateRegister={async (reg) => {
                    await dataService.saveRegister(reg);
                    branchContext.refreshBranchData();
                }} 
                onDeleteRegister={async (id) => {
                    await dataService.deleteRegister(id);
                    branchContext.refreshBranchData();
                }} 
                categories={branchContext.categories} 
                onAddCategory={async (cat) => {
                    await dataService.saveCategory(cat);
                    branchContext.refreshBranchData();
                }} 
                onUpdateCategory={async (cat) => {
                    await dataService.saveCategory(cat);
                    branchContext.refreshBranchData();
                }} 
                onDeleteCategory={async (id) => {
                    await dataService.deleteCategory(id);
                    branchContext.refreshBranchData();
                }} 
                users={users} 
                onAddUser={async (u) => {
                    await dataService.saveUser(u);
                    branchContext.refreshBranchData();
                    await loadUsersAndRoles(currentUser.companyId);
                }} 
                onUpdateUser={async (u) => {
                    await dataService.saveUser(u);
                    branchContext.refreshBranchData();
                    await loadUsersAndRoles(currentUser.companyId);
                }}  
                roleDefinitions={roleDefinitions} 
                onUpdateRoleDefinitions={async (u) => {
                    try {
                        await dataService.saveRole(u);
                        await loadUsersAndRoles(currentUser.companyId);
                    } catch (error: any) {
                        notify("Error al sincronizar perfiles de seguridad", "error");
                    }
                }}
                userRole={currentUser.role as Role} 
                loyaltyConfig={settings?.loyalty || DEFAULT_LOYALTY} 
                onUpdateLoyalty={async (config) => {
                    try {
                        await dataService.updateSettings({ loyalty: config });
                        if (currentUser) await loadSettings(currentUser.companyId);
                        notify("Actualización en fidelización exitosa.", "success");
                    } catch (e) {
                        notify("Error crítico al sincronizar fidelidad", "error");
                    }
                }}
                userPermissions={Object.values(Permission)} 
              />
            )}
            {currentView === 'products' && (
              <ProductsView 
                products={branchContext.products} 
                inventory={branchContext.inventory} 
                categories={branchContext.categories ?? []} 
                puc={branchContext.puc} 
                onAddProduct={async (p) => {
                   await dataService.saveProduct({ ...p, isNew: true });
                   notify("Producto creado exitosamente", "success");
                   branchContext.refreshBranchData();
                }} 
                onUpdateProduct={async (p) => {
                   await dataService.saveProduct(p);
                   notify("Producto actualizado exitosamente", "success");
                   branchContext.refreshBranchData();
                }} 
                currentBranch={branchContext.branches.find(b => b.id === branchContext.currentBranchId)} 
                taxRate={0.19} 
                impoconsumoRate={0.08} 
              />
            )}
            {currentView === 'treatments' && (
              <>
                <TreatmentView
                  customers={customers}
                  products={branchContext.products ?? []}
                  treatments={branchContext.treatments}
                  onAddTreatment={handleAddTreatment}
                  onUpdateTreatment={handleUpdateTreatment}
                  onDeleteTreatment={handleDeleteTreatment}
                  currentBranchId={branchContext.currentBranchId}
                />
              </>
            )}
            {currentView === 'menu_qr' && <QrMenuView products={branchContext.products} currentBranch={branchContext.branches.find(b => b.id === branchContext.currentBranchId)} />}
            {currentView === 'operational_mgmt' && 
              <OperationalManagementView 
                currentBranchId={branchContext.currentBranchId}
                currentCompanyId={branchContext.currentCompanyId}
                suppliers={branchContext.suppliers} 
                expenses={branchContext.expenses} 
                puc={branchContext.puc} 
                inventory={branchContext.inventory} 
                purchaseOrders={branchContext.purchaseOrders} 
                taxRate={settings?.taxRate || 0.19} 
                impoconsumoConfig={settings?.impoconsumo || DEFAULT_IMPOCONSUMO} 
                onAddExpense={(e) => dataService.saveExpense(e).then(() => branchContext.refreshBranchData())} 
                onUpdateExpense={(e) => dataService.saveExpense(e).then(() => branchContext.refreshBranchData())} 
                onAddPurchaseOrder={(po) => dataService.savePurchaseOrder(po).then(() => branchContext.refreshBranchData())} 
                onUpdatePurchaseOrder={(po) => dataService.savePurchaseOrder(po).then(() => branchContext.refreshBranchData())} 
                onProcessPurchase={async (i, t, s, tx, oId) => { if(oId) await dataService.receivePurchaseOrder(oId); branchContext.refreshBranchData(); }} 
                onAddSupplier={(s) => dataService.saveSupplier(s).then(() => branchContext.refreshBranchData())} 
                onUpdateSupplier={(s) => dataService.saveSupplier(s).then(() => branchContext.refreshBranchData())} 
                onEjecutarAsiento={(id) => dataService.executeExpense(id).then(() => branchContext.refreshBranchData())} 
                userPermissions={activePermissions} 
            />}
          </>
        )}
      </main>

      {/* Mobil aqui: Barra de Navegación Inferior */}
        {currentUser && (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/90 backdrop-blur-xl border-t border-slate-200 flex items-center justify-around px-2 z-[60] shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
            <button 
              onClick={() => setCurrentView('dashboard')} 
              className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${currentView === 'dashboard' ? 'text-brand-600 scale-110' : 'text-slate-400'}`}
            >
              <LayoutGrid size={22} className={currentView === 'dashboard' ? 'fill-brand-100' : ''} />
              <span className="text-[9px] font-black uppercase tracking-widest">Inicio</span>
            </button>
            <button 
              onClick={() => setCurrentView('tables')} 
              className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${currentView === 'tables' ? 'text-brand-600 scale-110' : 'text-slate-400'}`}
            >
              <Grid3X3 size={22} />
              <span className="text-[9px] font-black uppercase tracking-widest">Sillas</span>
            </button>
            <button 
              onClick={() => setCurrentView('pos')} 
              className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${currentView === 'pos' ? 'text-brand-600 scale-110' : 'text-slate-400'}`}
            >
              <Store size={26} />
              <span className="text-[9px] font-black uppercase tracking-widest">POS</span>
            </button>
            <button 
              onClick={() => setCurrentView('kds')} 
              className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${currentView === 'kds' ? 'text-brand-600 scale-110' : 'text-slate-400'}`}
            >
              <MonitorPlay size={22} />
              <span className="text-[9px] font-black uppercase tracking-widest">KDS</span>
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all text-slate-400`}
            >
              <Menu size={22} />
              <span className="text-[9px] font-black uppercase tracking-widest">Más</span>
            </button>
          </nav>
        )}

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        /* Mobil aqui: Estilos personalizados para inputs en movil */
        input, select, textarea {
          font-size: 16px !important; /* Evita zoom automático en iOS al enfocar */
        }
      `}</style>
      </div>
    </div>
  );

};

export default App;