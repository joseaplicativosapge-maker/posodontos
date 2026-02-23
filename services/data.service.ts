
import api from './api';
import * as MOCKS from '../constants';

const safeCall = async (promise: Promise<any>, fallback: any) => {
  try {
    const res = await promise;
    return res;
  } catch (err: any) {
    if (err.isNetworkError) return { data: fallback };
    throw err;
  }
};

const safeWrite = async (promise: Promise<any>, localAction?: () => void) => {
  try {
    return await promise;
  } catch (err: any) {
    if (err.isNetworkError && localAction) {
      localAction();
      return { data: { success: true } };
    }
    throw err;
  }
};

export const dataService = {

  // Dashboard 
  getDashboardStats: (branchId: string) => 
    safeCall(api.get(`/dashboard/stats?branchId=${branchId}`), { todaySales: 0, orderCount: 0, topProducts: [] }
  ),
  // Sucursales y Ajustes
  getBranches: (companyId: string) => safeCall(api.get(`/branches?companyId=${companyId}`), MOCKS.MOCK_BRANCHES),
  saveBranch: (data: any) => {
    const isNew = data.id == null;
    if (isNew) {
      data.id = `b-${Date.now()}`;
    }
    return safeWrite(isNew ? api.post('/branches', data) : api.put(`/branches/${data.id}`, data));
  },
  getBranchById: (branchId: string) => {
    return api.get(`/branches/${branchId}`);
  },
  getSettings: (companyId: string) => safeCall(api.get(`/company/settings?companyId=${companyId}`), MOCKS.MOCK_COMPANY),
  updateSettings: (data: any) => safeWrite(api.put('/company/settings', data)),

  // Productos y Categorías
  getProducts: (companyId: string) => safeCall(api.get(`/products?companyId=${companyId}`), MOCKS.MOCK_PRODUCTS),
  getCategories: (companyId: string) => safeCall(api.get(`/categories?companyId=${companyId}`), MOCKS.MOCK_CATEGORIES),
  saveCategory: (data: any) => {
    const isNew = data.id.startsWith('cat-') && data.id.length > 15; 
    return safeWrite(isNew ? api.post('/categories', data) : api.put(`/categories/${data.id}`, data));
  },
  deleteCategory: (id: string) => api.delete(`/categories/${id}`),
  saveProduct: (data: any) => {
    const { isNew, ...payload } = data;
    return safeWrite(isNew ? api.post('/products', payload) : api.put(`/products/${payload.id}`, payload));
  },
  
  // Inventario
  getInventory: (branchId: string) => safeCall(api.get(`/inventory?branchId=${branchId}`), MOCKS.MOCK_INVENTORY),
  saveInventoryItem: (data: any, isUpdate: boolean = false) => {
    if (!isUpdate) {
      return safeWrite(api.post('/inventory', data));
    }
    return safeWrite(api.put(`/inventory/${data.id}`, data));
  },
  getKardex: (branchId: string) => safeCall(api.get(`/inventory/kardex?branchId=${branchId}`), MOCKS.MOCK_MOVEMENTS),
  
  // Cajas y Sesiones
  getRegisters: (branchId: string) => safeCall(api.get(`/registers?branchId=${branchId}`), MOCKS.MOCK_REGISTERS),
  saveRegister: (data: any) => {
    const isNew = data.id == null;
    if (isNew) {
      data.id = `ref-${Date.now()}`;
    }
    return safeWrite(isNew ? api.post('/registers', data) : api.put(`/registers/${data.id}`, data));
  },
  deleteRegister: (id: string) => api.delete(`/registers/${id}`),
  openRegister: (registerId: string, userId: string, userName: string, amount: number) => 
    api.post(`/registers/${registerId}/open`, { userId, userName, amount }),
  closeRegister: (registerId: string, amount: number) => 
    api.post(`/registers/${registerId}/close`, { amount }),

  // Ventas y POS
  getOrders: (branchId: string) => safeCall(api.get(`/pos/orders?branchId=${branchId}`), MOCKS.MOCK_ORDERS),
  getOrdersCompleted: (branchId: string) => safeCall(api.get(`/pos/orders/completed?branchId=${branchId}`), MOCKS.MOCK_ORDERS),

  createOrder: (data: any) => api.post('/pos/order', data),
  processSale: (data: any) => api.post('/pos/sale', data),
  patchOrder: (id: string, data: any) => api.patch(`/pos/order/${id}`, data),
  updateOrderStatus: (id: string, status: string) => api.patch(`/pos/order/${id}/status`, { status }),
  updateKDSItemReady: (cartId: string) => api.patch(`/kds/item/${cartId}/ready`),

  getDianReport: (branchId: string, startDate: string, endDate: string) => 
    safeCall(api.get(`/reports/fiscal/dian-status?branchId=${branchId}&startDate=${startDate}&endDate=${endDate}`), { orders: [], totals: { iva: 0, impoconsumo: 0, sent: 0, pending: 0, totalVentas: 0 } }),

  // Sillas
  getTables: (branchId: string) => safeCall(api.get(`/tables?branchId=${branchId}`), MOCKS.MOCK_TABLES),
  saveTable: (data: any) => {
    const isCreate = !data.id;
    return safeWrite(
      isCreate
        ? api.post('/tables', data)
        : api.put(`/tables/${data.id}`, data)
    );
  },
  mergeTables: (parentId: string, childrenIds: string[]) => safeWrite(api.post('/tables/merge', { parentId, childrenIds })),
  splitTables: (parentId: string) => safeWrite(api.post('/tables/split', { parentId })),

  // Contabilidad
  getPUC: (companyId: string) => safeCall(api.get(`/accounting/puc?companyId=${companyId}`), MOCKS.MOCK_PUC),
  getVouchers: (branchId: string) => safeCall(api.get(`/accounting/vouchers?branchId=${branchId}`), MOCKS.MOCK_VOUCHERS),

  // Gastos y Compras
  getExpenses: (branchId: string) => safeCall(api.get(`/expenses?branchId=${branchId}`), MOCKS.MOCK_EXPENSES),
  saveExpense: (data: any) => {
    return safeWrite(data.id ? api.put(`/expenses/${data.id}`, data) : api.post('/expenses', data));
  },
  executeExpense: (id: string) => api.patch(`/expenses/${id}/execute`),
  getPurchaseOrders: (branchId: string) => safeCall(api.get(`/purchases?branchId=${branchId}`), []),
  savePurchaseOrder: (data: any) => {
    return safeWrite(data.id ? api.put(`/purchases/${data.id}`, data) : api.post('/purchases', data));
  },
  receivePurchaseOrder: (id: string) => api.post(`/purchases/${id}/receive`),

  // Clientes y Proveedores
  getCustomers: (companyId: string) => safeCall(api.get(`/customers?companyId=${companyId}`), MOCKS.MOCK_CUSTOMERS),
  saveCustomer: (data: any) => {
    return safeWrite(data.id.startsWith('c-') ? api.post('/customers', data) : api.put(`/customers/${data.id}`, data));
  },
  getSuppliers: (companyId: string) => safeCall(api.get(`/suppliers?companyId=${companyId}`), MOCKS.MOCK_SUPPLIERS),
  saveSupplier: (data: any) => {
    const isNew = data.id == null;
    if (isNew) {
      data.id = `s-${Date.now()}`;
    }
    return safeWrite(isNew ? api.post('/suppliers', data) : api.put(`/suppliers/${data.id}`, data));
  },

  // Usuarios y Roles (Aca falta que cargue usuarios por roles y compania)
  getUsers: (companyId: string) => safeCall(api.get(`/users?companyId=${companyId}`), MOCKS.MOCK_USERS),
  getRoles: () => safeCall(api.get('/roles'), MOCKS.INITIAL_ROLE_DEFINITIONS),
  saveRole: (data: any) => {
    return safeWrite(api.put(`/roles`, data));
  },
  saveUser: (data: any) => {
    const isNew = data.id == null;
    if (isNew) {
      data.id = `u-${Date.now()}`;
    }
    return safeWrite(isNew ? api.post('/users', data) : api.put(`/users/${data.id}`, data));
  },
  // Reservations
  getReservations: (branchId: string) => safeCall(api.get(`/reservations?branchId=${branchId}`), []),
  saveReservation: (data: any) => {
    const isNew = !data.id || (data.id.startsWith('res-') && data.id.length > 15);
    return safeWrite(isNew ? api.post('/reservations', data) : api.put(`/reservations/${data.id}`, data));
  },
  updateReservationStatus: (id: string, status: string) => safeWrite(api.patch(`/reservations/${id}/status`, { status })),
};