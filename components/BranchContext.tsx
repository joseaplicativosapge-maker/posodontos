import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { dataService } from '../services/data.service';
import { 
  Branch, Product, InventoryItem, Order, Table, User,
  CashRegister, Expense, Category, Supplier, PurchaseOrder, InventoryMovement, DashboardStats
} from '../types';
import { AccountingAccount, AccountingVoucher } from '../types_accounting';
import { useNotification } from './NotificationContext';

interface BranchContextType {
  currentBranchId: string;
  currentCompanyId: string;
  branches: Branch[];
  inventory: InventoryItem[];
  orders: Order[];
  ordersCompleted: Order[];
  tables: Table[];
  registers: CashRegister[];
  expenses: Expense[];
  stats: DashboardStats | null;
  vouchers: AccountingVoucher[];
  puc: AccountingAccount[];
  categories: Category[];
  products: Product[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  movements: InventoryMovement[];
  setBranchId: (id: string) => void;
  refreshBranchData: () => Promise<void>;
  isLoadingBranch: boolean;
  initializeContext: () => Promise<void>;
  initializePublicContext?: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { notify } = useNotification();
  const [currentBranchId, setCurrentBranchId] = useState<string>('');
  const [currentCompanyId, setCurrentCompanyId] = useState<string>('');

  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoadingBranch, setIsLoadingBranch] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false); // NUEVO

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersCompleted, setOrdersCompleted] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vouchers, setVouchers] = useState<AccountingVoucher[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  
  const [puc, setPuc] = useState<AccountingAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  
  const loadGlobalData = async (companyId: string) => {
    try {
      const [bRes, catRes, pRes, ppRes, sRes] = await Promise.all([
        dataService.getBranches(companyId),
        dataService.getCategories(companyId),
        dataService.getPUC(companyId),
        dataService.getProducts(companyId),
        dataService.getSuppliers(companyId)
      ]);

      setBranches(bRes.data || []);
      setCategories(catRes.data || []);
      setPuc(pRes.data || []);
      setProducts(ppRes.data || []);
      setSuppliers(sRes.data || []);
      
      if (bRes.data && bRes.data.length > 0 && !currentBranchId) {
        setCurrentBranchId(bRes.data[0].id);
      }

    } catch (e) {
      console.error("Error cargando datos globales");
    }

  };

  const initializePublicContext = useCallback(async (companyId: string, branchId: string): Promise<void> => {
    try {

        const branchesRes = await dataService.getBranches(companyId);
        const loadedBranches = branchesRes.data || [];
        setBranches(loadedBranches);
        
        const productsRes = await dataService.getProducts(companyId);
        setProducts(productsRes.data || []);
        
    } catch (error) {
        console.error("Error cargando contexto público:", error);
    }
}, []);

  // NUEVO: Inicialización manual

  const refreshBranchData = useCallback(async () => {
    if (!currentBranchId) return;
    
    setIsLoadingBranch(true);
    try {
      const [bRes, inv, exp, t, reg, ord, vch, po, mov, statRes, ordCom, cRes, pRes, ppRes] = await Promise.all([
        dataService.getBranches(currentCompanyId),
        dataService.getInventory(currentBranchId),
        dataService.getExpenses(currentBranchId),
        dataService.getTables(currentBranchId),
        dataService.getRegisters(currentBranchId),
        dataService.getOrders(currentBranchId),
        dataService.getVouchers(currentBranchId),
        dataService.getPurchaseOrders(currentBranchId),
        dataService.getKardex(currentBranchId),
        dataService.getDashboardStats(currentBranchId),
        dataService.getOrdersCompleted(currentBranchId),
        dataService.getCategories(currentCompanyId),
        dataService.getProducts(currentCompanyId),
        dataService.getSuppliers(currentCompanyId)
      ]);

      setBranches(bRes.data || []);
      setInventory(inv.data || []);
      setExpenses(exp.data || []);
      setTables(t.data || []);
      setRegisters(reg.data || []);
      setOrders(ord.data || []);
      setVouchers(vch.data || []);
      setPurchaseOrders(po.data || []);
      setMovements(mov.data || []);
      setStats(statRes.data || []);
      setOrdersCompleted(ordCom.data || []);
      setCategories(cRes.data || []);
      setProducts(pRes.data || []);
      setSuppliers(ppRes.data || []);

      const mappedMovements = (mov.data || []).map((m: any) => ({
        ...m,
        itemId: m.inventoryItemId,
        itemName: m.item?.name || 'Material Eliminado',
        date: m.createdAt || m.date,
        quantityIn: m.type === 'ENTRADA' ? m.quantity : 0,
        quantityOut: m.type === 'SALIDA' ? m.quantity : 0,
        unitCost: m.item?.cost || 0,
        totalValue: m.quantity * (m.item?.cost || 0),
        balanceValue: m.newStock * (m.item?.cost || 0)
      }));
      setMovements(mappedMovements);
      
    } catch (err) {
      notify("Error sincronizando sucursal", "error");
    } finally {
      setIsLoadingBranch(false);
    }
  }, [currentBranchId, notify]);

  //
  const initializeContext = useCallback(async (user: { companyId: string; branchId?: string }): Promise<Branch[]> => {
    if (isInitialized) return branches;

    setIsLoadingBranch(true);
    setIsInitialized(true);

    try {
      const branchesRes = await dataService.getBranches(user.companyId);
      const loadedBranches = branchesRes.data || [];
      setBranches(loadedBranches);

      setCurrentCompanyId(user.companyId);
      await loadGlobalData(user.companyId);

      if (user.branchId) {
        setCurrentBranchId(user.branchId);
        await refreshBranchData();
      } else if (loadedBranches.length > 0) {
        setCurrentBranchId(loadedBranches[0].id);
        await refreshBranchData();
      }

      if ((user.branchId || loadedBranches[0]?.id)) {
        await refreshBranchData();
      }

      return loadedBranches;
      
    } catch (error) {
      console.error("Error inicializando contexto:", error);
      return [];
    } finally {
      setIsLoadingBranch(false);
    }
  }, [isInitialized, branches, refreshBranchData]);

  // MODIFICADO: Solo carga si está inicializado
  useEffect(() => {
    if (currentBranchId && isInitialized) {
      refreshBranchData();
    }
  }, [currentBranchId, isInitialized, refreshBranchData]);

  const setBranchId = (id: string) => {
    if (id !== currentBranchId) {
      const branchName = branches.find(b => b.id === id)?.name || 'Sucursal';
      setCurrentBranchId(id);
    }
  };

   const setCompanyId = (id: string) => {
    if (id !== currentCompanyId) {
      setCurrentCompanyId(id);
    }
  };

  return (
    <BranchContext.Provider value={{
      currentBranchId,
      currentCompanyId,
      branches,
      inventory,
      orders,
      ordersCompleted,
      tables,
      registers,
      expenses,
      vouchers,
      puc,
      categories,
      products,
      suppliers,
      purchaseOrders,
      movements,
      stats,
      setBranchId,
      setCompanyId,
      refreshBranchData,
      isLoadingBranch,
      initializeContext,
      initializePublicContext
    }}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (!context) throw new Error('useBranch debe usarse dentro de BranchProvider');
  return context;
};