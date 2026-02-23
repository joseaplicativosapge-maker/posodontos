import React, { useState, useRef } from 'react';
import { InventoryItem, Product, Supplier, MovementType, InventoryMovement, ProductType, PurchaseOrder, PurchaseOrderStatus, PurchaseOrderItem, PaymentMethod, Category, ProductionArea, PromotionType } from '../types';
import { Package, Plus, X, Search, ShoppingCart, Truck, History, ArrowDownLeft, ArrowUpRight, AlertTriangle, Save, Trash2, Layers, DollarSign, Filter, Archive, RotateCcw, Tag, Edit2, ShoppingBag, Info, ChevronRight, Printer, FileText, CheckCircle, ImageIcon, Percent } from 'lucide-react';
import { useNotification } from './NotificationContext';

interface LocalPOItem {
  linkedId: string;
  name: string;
  quantity: number;
  cost: number;
  unit: string;
  type: 'insumo' | 'producto';
}

interface WarehouseViewProps {
  inventory: InventoryItem[];
  currentBranchId: string;
  products: Product[];
  suppliers: Supplier[];
  movements: InventoryMovement[];
  purchaseOrders: PurchaseOrder[];
  categories: Category[];
  onAddInventory: (item: InventoryItem) => InventoryItem;
  onUpdateInventory: (item: InventoryItem) => InventoryItem;
  onAddProduct: (product: Product) => Product;
  onUpdateProduct: (product: Product) => Product;
  onAddPurchaseOrder: (po: PurchaseOrder) => void;
  onUpdatePurchaseOrder: (po: PurchaseOrder) => void;
  onProcessPurchase: (items: any[], total: number, supplierId: string) => void;
}

export const WarehouseView: React.FC<WarehouseViewProps> = ({
  inventory, currentBranchId, products, suppliers, movements, purchaseOrders, categories,
  onAddInventory, onUpdateInventory, onAddProduct, onUpdateProduct,
  onAddPurchaseOrder, onUpdatePurchaseOrder, onProcessPurchase
}) => {
  const { notify, confirm } = useNotification();
  const [activeTab, setActiveTab] = useState<'stock' | 'direct_sale' | 'purchases' | 'kardex'>('stock');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  const [itemName, setItemName] = useState('');
  const [itemUnit, setItemUnit] = useState('und');
  const [itemStock, setItemStock] = useState('0');
  const [itemMinStock, setItemMinStock] = useState('5');
  const [itemCost, setItemCost] = useState('0');
  const [itemSupplier, setItemSupplier] = useState('');
  
  const [isDirectSale, setIsDirectSale] = useState(false);
  const [salePrice, setSalePrice] = useState('0');
  const [saleCategory, setSaleCategory] = useState('');
  const [saleImageUrl, setSaleImageUrl] = useState('');
  const [salePromotionType, setSalePromotionType] = useState<PromotionType>(PromotionType.NONE);
  const [salePromotionValue, setSalePromotionValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatCOP = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSaleImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const openModal = (item?: InventoryItem) => {
    if (item) {
        setEditingItem(item);
        setItemName(item.name);
        setItemUnit(item.unit);
        setItemStock(item.stock.toString());
        setItemMinStock(item.minStock.toString());
        setItemCost(item.cost.toString());
        setItemSupplier(item.supplierId || '');
        
        const linkedProduct = products.find(p => p.ingredients.some(ing => ing.inventoryItemId === item.id && p.productType === ProductType.DIRECT_SALE));
        if (linkedProduct && linkedProduct.productType === ProductType.DIRECT_SALE) {
            setIsDirectSale(true);
            setSalePrice(linkedProduct.price.toString());
            setSaleCategory(linkedProduct.category);
            setSaleImageUrl(linkedProduct.imageUrl || '');
            setSalePromotionType(linkedProduct.promotionType || PromotionType.NONE);
            setSalePromotionValue(linkedProduct.promotionValue?.toString() || '');
        } else {
            setIsDirectSale(false);
            setSalePrice('0');
            setSaleCategory(categories[0]?.name || '');
            setSaleImageUrl('');
            setSalePromotionType(PromotionType.NONE);
            setSalePromotionValue('');
        }
    } else {
        setEditingItem(null);
        setItemName('');
        setItemUnit('und');
        setItemStock('0');
        setItemMinStock('5');
        setItemCost('0');
        setItemSupplier('');
        setIsDirectSale(activeTab === 'direct_sale');
        setSalePrice('0');
        setSaleCategory(categories[0]?.name || '');
        setSaleImageUrl('');
        setSalePromotionType(PromotionType.NONE);
        setSalePromotionValue('');
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName) return;

    const inventoryId = editingItem?.id || `inv-${Date.now()}`;
    const productId = editingItem?.productId || `p-ds-${Date.now()}`;

    const inventoryData: InventoryItem = {
      id: inventoryId,
      branchId: currentBranchId,
      name: itemName.toUpperCase(),
      unit: itemUnit,
      stock: parseFloat(itemStock),
      minStock: parseFloat(itemMinStock),
      maxStock: parseFloat(itemMinStock) * 10,
      cost: parseFloat(itemCost),
      supplierId: itemSupplier,
      productId: isDirectSale ? productId : undefined,
      isActive: true
    };

    if (editingItem) onUpdateInventory(inventoryData);
    else onAddInventory(inventoryData);

    if (isDirectSale) {
        const productData: Product = {
            id: productId,
            companyId: 'c1',
            name: itemName.toUpperCase(),
            price: parseFloat(salePrice),
            cost: parseFloat(itemCost),
            category: saleCategory,
            productionArea: ProductionArea.BAR,
            productType: ProductType.DIRECT_SALE,
            ingredients: [{ inventoryItemId: inventoryId, quantity: 1 }],
            requiresPreparation: false,
            stock: parseFloat(itemStock),
            minStock: parseFloat(itemMinStock),
            isActive: true,
            imageUrl: saleImageUrl || 'https://images.unsplash.com/photo-1544145945-f904253db0ad?w=500&auto=format&fit=crop&q=60',
            promotionType: salePromotionType,
            promotionValue: salePromotionType !== PromotionType.NONE ? parseFloat(salePromotionValue) : undefined
        };
        
        const existingProduct = products.find(p => p.id === productId);
        if (existingProduct) onUpdateProduct(productData);
        else onAddProduct(productData);
    }

    setIsModalOpen(false);
    notify("Inventario actualizado", "success");
  };

  const filteredItems = inventory.filter(item => {
    const searchMatch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const linkedProduct = products.find(p => p.ingredients.some(ing => ing.inventoryItemId === item.id && p.productType === ProductType.DIRECT_SALE));
    if (activeTab === 'direct_sale') return searchMatch && linkedProduct !== undefined;
    if (activeTab === 'stock') return searchMatch && linkedProduct === undefined;
    return searchMatch;
  });

  const filteredMovements = movements.filter(m => 
    m.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 h-full bg-slate-50 overflow-y-auto pb-24 md:pb-8">
      <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-6">
        <div><h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3"><Layers size={32} className="text-brand-600" /> Almacén Central</h2></div>
        <button onClick={() => openModal()} className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-2 hover:bg-brand-600 transition-all"><Plus size={18}/> Nuevo Artículo</button>
      </div>

      <div className="flex p-1 bg-slate-200/50 rounded-2xl mb-8 w-fit shadow-inner overflow-x-auto no-scrollbar">
        {[{ id: 'stock', label: 'Materiales', icon: <Layers size={16}/> }, { id: 'direct_sale', label: 'Venta Directa', icon: <ShoppingBag size={16}/> }, { id: 'purchases', label: 'Órdenes', icon: <ShoppingCart size={16}/> }, { id: 'kardex', label: 'Kardex', icon: <History size={16}/> }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}>{tab.icon} {tab.label}</button>
        ))}
      </div>

      <div className="mb-6 relative"><Search className="absolute left-5 top-4 text-slate-400" size={20} /><input type="text" placeholder={`Buscar en ${activeTab === 'stock' ? 'Materiales' : activeTab === 'direct_sale' ? 'Venta Directa' : activeTab === 'purchases' ? 'Órdenes' : 'Kardex'}...`} className="w-full pl-14 pr-6 py-4 border-none bg-white rounded-3xl shadow-sm focus:ring-2 focus:ring-brand-500 font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>

      {(activeTab === 'stock' || activeTab === 'direct_sale') && (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
             <table className="w-full text-left">
                <thead className="bg-slate-50 border-b"><tr><th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Artículo</th><th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Stock</th><th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Acción</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                    {filteredItems.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/50 group"><td className="px-8 py-5"><p className="font-black text-slate-800 uppercase text-xs">{item.name}</p></td><td className="px-8 py-5"><span className={`text-sm font-black ${item.stock <= item.minStock ? 'text-red-500' : 'text-slate-700'}`}>{item.stock}</span><span className="text-[10px] font-bold text-slate-400 uppercase ml-1">{item.unit}</span></td><td className="px-8 py-5 text-right"><button onClick={() => openModal(item)} className="p-2 text-slate-300 hover:text-brand-600 transition-all"><Edit2 size={16}/></button></td></tr>
                    ))}
                </tbody>
             </table>
          </div>
      )}

      {activeTab === 'kardex' && (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
               <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Movimientos de Inventario</h4>
               </div>
               <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Fecha</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Ítem</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Tipo</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Cant.</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Saldo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredMovements.map(mov => (
                            <tr key={mov.id} className="hover:bg-slate-50/50">
                                <td className="px-8 py-4 font-mono text-[10px] text-slate-400">{new Date(mov.date).toLocaleString()}</td>
                                <td className="px-8 py-4">
                                    <p className="font-black text-slate-800 uppercase text-xs">{mov.itemName}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase">{mov.reason}</p>
                                </td>
                                <td className="px-8 py-4">
                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${mov.type === MovementType.IN ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                        {mov.type}
                                    </span>
                                </td>
                                <td className="px-8 py-4 text-center">
                                    {/* Fix: InventoryMovement uses quantityIn and quantityOut instead of generic quantity */}
                                    <span className={`text-sm font-black ${mov.type === MovementType.IN ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {mov.type === MovementType.IN ? '+' : '-'}{mov.type === MovementType.IN ? mov.quantityIn : mov.quantityOut}
                                    </span>
                                </td>
                                <td className="px-8 py-4 text-right">
                                    <p className="text-xs font-black text-slate-900">{mov.newStock}</p>
                                    <p className="text-[9px] text-slate-300 font-bold">Anterior: {mov.previousStock}</p>
                                </td>
                            </tr>
                        ))}
                        {filteredMovements.length === 0 && (
                            <tr><td colSpan={5} className="py-20 text-center text-slate-300 font-black text-xs">Sin movimientos registrados</td></tr>
                        )}
                    </tbody>
               </table>
          </div>
      )}

      {activeTab === 'purchases' && (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
               <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Historial de Órdenes de Compra</h4>
               </div>
               <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">ID / Fecha</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Proveedor</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Estado</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {purchaseOrders.filter(po => po.id.toLowerCase().includes(searchTerm.toLowerCase())).map(po => (
                            <tr key={po.id} className="hover:bg-slate-50/50">
                                <td className="px-8 py-4">
                                    <p className="font-black text-slate-800 text-xs">#{po.id.slice(-6).toUpperCase()}</p>
                                    <p className="text-[10px] text-slate-400">{new Date(po.createdAt).toLocaleDateString()}</p>
                                </td>
                                <td className="px-8 py-4 font-bold text-slate-700 uppercase text-xs">
                                    {suppliers.find(s => s.id === po.supplierId)?.name || 'Desconocido'}
                                </td>
                                <td className="px-8 py-4">
                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${po.status === PurchaseOrderStatus.RECEIVED ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                        {po.status}
                                    </span>
                                </td>
                                <td className="px-8 py-4 text-right font-black text-slate-900">{formatCOP(po.total)}</td>
                            </tr>
                        ))}
                        {purchaseOrders.length === 0 && (
                            <tr><td colSpan={4} className="py-20 text-center text-slate-300 font-black uppercase text-xs">No hay órdenes de compra registradas</td></tr>
                        )}
                    </tbody>
               </table>
          </div>
      )}

      {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[500] p-4">
              <div className="bg-white rounded-[3rem] w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-300">
                  <div className="p-8 border-b bg-slate-50 flex justify-between items-center"><div className="flex items-center gap-4"><div className="bg-brand-600 p-3 rounded-2xl text-white shadow-lg"><Package size={24}/></div><h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">{editingItem ? 'Editar Ficha' : 'Nuevo Ingreso'}</h3></div><button onClick={() => setIsModalOpen(false)} className="bg-white p-3 rounded-2xl text-slate-400 hover:text-slate-800 transition-all"><X size={24}/></button></div>
                  <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                          <div className="space-y-6">
                              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nombre del Artículo</label><input required type="text" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-brand-500 outline-none" value={itemName} onChange={e => setItemName(e.target.value)} /></div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Unidad</label><select className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-xs uppercase" value={itemUnit} onChange={e => setItemUnit(e.target.value)}><option value="und">UNIDAD</option><option value="kg">KILOGRAMO</option><option value="lt">LITRO</option></select></div>
                                  <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Stock Mínimo</label><input required type="number" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-red-600" value={itemMinStock} onChange={e => setItemMinStock(e.target.value)} /></div>
                              </div>
                          </div>
                          <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col">
                              <div className="flex justify-between items-center mb-6"><h4 className="font-black text-[10px] uppercase text-slate-500 tracking-[0.2em] flex items-center gap-2"><ShoppingBag size={14}/> Configuración Venta Directa</h4><button type="button" onClick={() => setIsDirectSale(!isDirectSale)} className={`w-12 h-6 rounded-full relative transition-all ${isDirectSale ? 'bg-brand-600' : 'bg-slate-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isDirectSale ? 'left-7' : 'left-1'}`}></div></button></div>
                              <div className={`space-y-6 ${isDirectSale ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                                  <div className="relative group">
                                      <div className="h-32 w-full bg-white border-2 border-dashed border-slate-200 rounded-3xl overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:border-brand-300 transition-all" onClick={() => fileInputRef.current?.click()}>
                                          {saleImageUrl ? <img src={saleImageUrl} className="w-full h-full object-cover" /> : <><ImageIcon size={32} className="text-slate-200 mb-2" /><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Foto Producto</span></>}
                                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                      </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div><label className="block text-[10px] font-black text-brand-600 uppercase mb-2 tracking-widest">Precio POS ($)</label><input type="number" className="w-full bg-white border-2 border-brand-100 rounded-2xl p-4 font-black text-brand-800 text-xl" value={salePrice} onChange={e => setSalePrice(e.target.value)} /></div>
                                      <div>
                                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Tipo Promo</label>
                                          <select className="w-full bg-white border-none rounded-2xl p-4 font-bold text-xs uppercase" value={salePromotionType} onChange={e => setSalePromotionType(e.target.value as PromotionType)}>
                                              <option value={PromotionType.NONE}>Ninguna</option>
                                              <option value={PromotionType.PERCENTAGE}>% Dcto</option>
                                              <option value={PromotionType.FIXED_PRICE}>Precio Fijo</option>
                                          </select>
                                      </div>
                                  </div>
                                  {salePromotionType !== PromotionType.NONE && (
                                      <div>
                                          <label className="block text-[10px] font-black text-brand-600 uppercase mb-2 tracking-widest flex items-center gap-1">
                                              <Percent size={12}/> {salePromotionType === PromotionType.PERCENTAGE ? 'Valor Descuento %' : 'Precio Especial de Promo $'}
                                          </label>
                                          <input type="number" className="w-full bg-white border-2 border-brand-100 rounded-2xl p-4 font-black text-brand-700" value={salePromotionValue} onChange={e => setSalePromotionValue(e.target.value)} />
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>
                      <button type="submit" className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] shadow-2xl uppercase tracking-widest text-xs transition-all hover:bg-brand-600 active:scale-95">Guardar en Base de Datos</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};