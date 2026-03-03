import React, { useState, useRef, useMemo } from 'react';
import { InventoryItem, Product, ProductionArea, Supplier, Category, ProductType, InventoryMovement, MovementType, PromotionType, InventoryUnit, InventoryUnitLabels } from '../types';
import { Package, Plus, X, Edit2, Search, ImageIcon, Tag, DollarSign, Info, History, Calculator, ShoppingBag, Boxes, Download, Printer, BoxSelect, AlertTriangle, AlertCircle, Percent, Calendar } from 'lucide-react';
import { useNotification } from './NotificationContext';

interface InventoryViewProps {
  products: Product[];
  inventory: InventoryItem[];
  suppliers: Supplier[];
  categories: Category[];
  movements: InventoryMovement[];
  onAddProduct: (product: Product) => Product;
  onUpdateProduct: (product: Product) => Product;
  onAddInventory: (item: InventoryItem) => InventoryItem;
  onUpdateInventory: (item: InventoryItem) => InventoryItem;
  initialTab?: 'inventory' | 'direct_sale' | 'movements';
}

export const InventoryView: React.FC<InventoryViewProps> = ({ 
    products, inventory, suppliers, categories, movements,
    onAddProduct, onUpdateProduct, onAddInventory, onUpdateInventory,
    initialTab = 'inventory'
}) => {

  const { notify } = useNotification();
  const todayStr = new Date().toISOString().split('T')[0];
  
  const [viewMode, setViewMode] = useState<'inventory' | 'direct_sale' | 'movements'>(initialTab as any);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [kardexItemFilter, setKardexItemFilter] = useState('');
  const [kardexStartDate, setKardexStartDate] = useState(todayStr);
  const [kardexEndDate, setKardexEndDate] = useState(todayStr);

  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [editingInventory, setEditingInventory] = useState<InventoryItem | null>(null);

  const [invName, setInvName] = useState('');
  const [invUnit, setInvUnit] = useState('KG');
  const [invUsageUnit, setInvUsageUnit] = useState('');
  const [invConversionFactor, setInvConversionFactor] = useState('1');
  const [invStock, setInvStock] = useState('0');
  const [invMin, setInvMin] = useState('5');
  const [invCost, setInvCost] = useState('0');
  const [invSupplierId, setInvSupplierId] = useState('');
  
  const [isDirectSale, setIsDirectSale] = useState(false);
  const [salePrice, setSalePrice] = useState('0');
  const [saleCategory, setSaleCategory] = useState('');
  const [saleImageUrl, setSaleImageUrl] = useState('');
  const [salePromotionType, setSalePromotionType] = useState<PromotionType>(PromotionType.NONE);
  const [salePromotionValue, setSalePromotionValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatCOP = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
  
  const openInventoryModal = (item?: InventoryItem) => {
    if (item) {
      setEditingInventory(item);
      setInvName(item.name);
      setInvUnit(item.unit);
      setInvUsageUnit(item.usageUnit || '');
      setInvConversionFactor(item.conversionFactor?.toString() || '1');
      setInvStock(item.stock.toString());
      setInvMin(item.minStock.toString());
      setInvCost(item.cost.toString());
      setInvSupplierId(item.supplierId || '');
      
      const linkedProduct = products.find(p => p.type === ProductType.DIRECT_SALE && (p.ingredients[0]?.inventoryItemId === item.id || p.id === item.productId));      
      if (linkedProduct) {
        setIsDirectSale(true);
        setSalePrice(linkedProduct.price.toString());
        setSaleCategory(linkedProduct.category);
        setSaleImageUrl(linkedProduct.imageUrl || '');
        setSalePromotionType(linkedProduct.promotionType || PromotionType.NONE);
        setSalePromotionValue(linkedProduct.promotionValue?.toString() || '');
      } else {
        setIsDirectSale(false);
        setSalePrice('0');
        setSaleCategory(categories.length > 0 ? categories[0].id : '');
        setSaleImageUrl('');
        setSalePromotionType(PromotionType.NONE);
        setSalePromotionValue('');
      }
    } else {
      setEditingInventory(null);
      setInvName('');
      setInvUnit('KG');
      setInvUsageUnit('');
      setInvConversionFactor('1');
      setInvStock('0');
      setInvMin('5');
      setInvCost('0');
      setInvSupplierId('');
      setIsDirectSale(viewMode === 'direct_sale');
      if (viewMode === 'direct_sale') setInvUnit('und');
      setSalePrice('0');
      setSaleCategory(categories.length > 0 ? categories[0].id : '');
      setSaleImageUrl('');
      setSalePromotionType(PromotionType.NONE);
      setSalePromotionValue('');
    }
    setIsInventoryModalOpen(true);
  };

  const handleInventorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const inventoryId = editingInventory?.id || `i-${Date.now()}`;
    const generatedProductId = editingInventory?.productId || (isDirectSale ? `p-${Date.now()}` : undefined);
    
    const finalUnit = isDirectSale ? 'UND' : invUnit;
    const finalStock = parseFloat(invStock);
    const finalCost = parseFloat(invCost);

    const inventoryData: InventoryItem = {
        id: inventoryId,
        branchId: editingInventory?.branchId,
        name: invName.toUpperCase(),
        unit: finalUnit,
        usageUnit: isDirectSale ? finalUnit : (invUsageUnit || finalUnit),
        conversionFactor: isDirectSale ? 1 : (parseFloat(invConversionFactor) || 1),
        stock: finalStock,
        minStock: parseFloat(invMin),
        maxStock: parseFloat(invMin) * 10,
        cost: finalCost,
        supplierId: invSupplierId,
        productId: isDirectSale ? generatedProductId : undefined,
        isActive: true
    };

    try {
        let savedInventory: InventoryItem;
        
        // PRIMERO: Guardar inventario
        if (editingInventory) {
        savedInventory = await onUpdateInventory(inventoryData);
        } else {
        savedInventory = await onAddInventory(inventoryData);
        }

        // SEGUNDO: Si es venta directa, guardar producto
        if (isDirectSale && generatedProductId) {

        const raw = localStorage.getItem("gastro_data");

        const companyId = raw
            ? JSON.parse(raw)?.user?.companyId
        : null;

        const productData: Product = {
            id: generatedProductId,
            companyId: companyId,
            name: invName.toUpperCase(),
            price: parseFloat(salePrice),
            cost: finalCost,
            category: saleCategory,
            productionArea: ProductionArea.BAR,
            type: ProductType.DIRECT_SALE,
            ingredients: [{ inventoryItemId: inventoryId, quantity: 1 }],
            requiresPreparation: false,
            stock: finalStock,
            minStock: parseFloat(invMin),
            isActive: true,
            imageUrl: saleImageUrl || `${import.meta.env.VITE_URL_BASE}/assets/img/default.png`,
            promotionType: salePromotionType,
            promotionValue: salePromotionType !== PromotionType.NONE ? parseFloat(salePromotionValue) : undefined
        };

        const existing = products.find(p => 
            p.id === generatedProductId || 
            (p.type === ProductType.DIRECT_SALE && p.ingredients[0]?.inventoryItemId === inventoryId)
        );

        let savedProduct: Product;
        if (existing) {
            savedProduct = await onUpdateProduct({ ...productData, id: existing.id });
        } else {
            savedProduct = await onAddProduct(productData);
        }

        // TERCERO: Actualizar inventario con productId si es necesario
        // Solo si el productId cambió o es nuevo
        const finalProductId = savedProduct?.data?.id || savedProduct?.id || generatedProductId;
        if (savedInventory.productId !== finalProductId) {
            const inventoryWithProductId = {
            ...(savedInventory.data || savedInventory),
            productId: finalProductId
            };
            await onUpdateInventory(inventoryWithProductId);
        }
        }

        // ✅ Esperar un ciclo de renderizado antes de cerrar
        await new Promise(resolve => setTimeout(resolve, 100));

        // Cerrar modal y notificar
        setIsInventoryModalOpen(false);
        notify("✅ Operación completada exitosamente", "success");
        
        // Limpiar formulario
        setEditingInventory(null);
        setInvName('');
        setInvStock('0');
        setInvCost('0');
        setSalePrice('0');
        
    } catch (error: any) {
        console.error("Error al guardar:", error);
        notify("❌ Error al guardar: " + (error.message || "Verifique la conexión"), "error");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSaleImageUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const filteredInventory = inventory.filter(item => {
    const isDirect = products.some(p =>
        p.type === ProductType.DIRECT_SALE &&
        (
            p.ingredients?.some(i => i.inventoryItemId === item.id) ||
            p.id === item.productId
        )
    );
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (viewMode === 'direct_sale') return isDirect && matchesSearch;
    if (viewMode === 'inventory') return !isDirect && matchesSearch;
    return matchesSearch;
  });

  const filteredMovements = useMemo(() => {
      const start = new Date(kardexStartDate);
      start.setHours(0,0,0,0);
      const end = new Date(kardexEndDate);
      end.setHours(23,59,59,999);

      return movements.filter(m => {
         const mDate = new Date(m.date);
         const matchesItem = !kardexItemFilter || m.itemId === kardexItemFilter;

         const mDay = mDate.toISOString().split('T')[0];
         const matchesDate = mDay >= kardexStartDate && mDay <= kardexEndDate;

         const matchesSearch =
            !searchTerm ||
              m.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
              m.reference.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesItem && matchesDate && matchesSearch;
      });
  }, [movements, kardexItemFilter, kardexStartDate, kardexEndDate, searchTerm]);

  const kardexTotals = useMemo(() => {
    return filteredMovements.reduce((acc, m) => {
        const val = m.totalValue || 0;
        return {
            entries: acc.entries + (m.quantityIn || 0),
            exits: acc.exits + (m.quantityOut || 0),
            entriesVal: acc.entriesVal + (m.type === 'ENTRADA' ? val : 0),
            exitsVal: acc.exitsVal + (m.type === 'SALIDA' ? val : 0),
            net: acc.net + (m.type === 'ENTRADA' ? val : -val)
        };
    }, { entries: 0, exits: 0, entriesVal: 0, exitsVal: 0, net: 0 });
  }, [filteredMovements]);

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-slate-50 pb-24">
      <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-6">
        <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
                <Boxes className="text-brand-600" size={32} /> Kardex & Almacén
            </h2>
            <p className="text-slate-500 font-medium text-xs tracking-widest mt-1">Existencias reales y trazabilidad técnica.</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
            <button onClick={() => window.print()} className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
                <Printer size={16} /> PDF
            </button>
        </div>
      </div>

      <div className="flex p-1.5 bg-slate-200/50 rounded-2xl mb-8 w-full shadow-inner overflow-x-auto no-scrollbar print:hidden">
  
            <button
                onClick={() => setViewMode('inventory')}
                className={`flex-1 px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap
                ${viewMode === 'inventory'
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Package size={16} />
                Materiales Almacén
            </button>

            <button
                onClick={() => setViewMode('direct_sale')}
                className={`flex-1 px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap
                ${viewMode === 'direct_sale'
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'}`}
            >
                <ShoppingBag size={16} />
                Productos de Venta Directa
            </button>

            <button
                onClick={() => setViewMode('movements')}
                className={`flex-1 px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap
                ${viewMode === 'movements'
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'}`}
            >
                <History size={16} />
                Kardex Maestro
            </button>

            </div>

      {viewMode === 'movements' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 animate-in fade-in slide-in-from-top-2">
               <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rango de Fechas</p>
                   <div className="flex items-center gap-2 mt-2">
                       <input type="date" className="bg-slate-50 border-none rounded-xl p-2 text-[10px] font-black uppercase w-full" value={kardexStartDate} onChange={e => setKardexStartDate(e.target.value)} />
                       <span className="text-slate-300">-</span>
                       <input type="date" className="bg-slate-50 border-none rounded-xl p-2 text-[10px] font-black uppercase w-full" value={kardexEndDate} onChange={e => setKardexEndDate(e.target.value)} />
                   </div>
               </div>
               <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
                   <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Valor Entradas</p>
                   <h3 className="text-xl font-black text-slate-800">{formatCOP(kardexTotals.entriesVal)}</h3>
                   <p className="text-[9px] text-slate-400 font-bold">+{kardexTotals.entries.toLocaleString()} UNID.</p>
               </div>
               <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
                   <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Valor Salidas</p>
                   <h3 className="text-xl font-black text-slate-800">{formatCOP(kardexTotals.exitsVal)}</h3>
                   <p className="text-[9px] text-slate-400 font-bold">-{kardexTotals.exits.toLocaleString()} UNID.</p>
               </div>
               <div className="bg-slate-900 p-5 rounded-3xl shadow-xl flex flex-col justify-center text-white">
                   <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-1">Flujo Neto Valorizado</p>
                   <h3 className={`text-xl font-black ${kardexTotals.net >= 0 ? 'text-white' : 'text-red-400'}`}>{formatCOP(kardexTotals.net)}</h3>
               </div>
          </div>
      )}

        {((viewMode !== 'movements' && filteredInventory.length !== 0) || viewMode === 'movements') && ( 
            <div className="mb-8 flex items-center gap-4 relative group print:hidden">
                    
                    {/* Input + icono */}
                    <div className="relative flex-1">
                        <Search className="absolute left-5 top-4 text-slate-400" size={20} />
                        <input
                        type="text"
                        placeholder={`Buscar en ${
                            viewMode === 'movements'
                            ? 'kardex'
                            : viewMode === 'inventory'
                            ? 'materiales'
                            : 'productos venta directa'
                        }...`}
                        className="w-full pl-14 pr-6 py-4 border-none bg-white rounded-3xl shadow-sm focus:ring-2 focus:ring-brand-500 font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Botón */}
                    {viewMode !== 'movements' && (
                        <button
                        onClick={() => openInventoryModal()}
                        className="bg-slate-900 text-white px-8 py-3.5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-brand-600 transition-all flex items-center gap-2 active:scale-95 whitespace-nowrap"
                        >
                        <Plus size={18} />
                        Agregar
                        </button>
                    )}

            </div>
        )}


      {viewMode !== 'movements' && filteredInventory.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <div className="bg-slate-100 w-32 h-32 rounded-full flex items-center justify-center mb-6">
                    {viewMode === 'movements' ? 'Kardex' : viewMode === 'inventory' ? <Package  size={48} className="text-slate-300" /> : <ShoppingBag  size={48} className="text-slate-300" />}
                    
                </div>
                <h3 className="text-2xl font-black">
                    Sin {viewMode === 'movements' ? 'Kardex' : viewMode === 'inventory' ? 'materiales' : 'servicios ventas directas'}
                </h3>
                <p className="text-slate-500 mt-3 max-w-xs">
                    No existen {viewMode === 'movements' ? 'Kardex' : viewMode === 'inventory' ? 'materiales' : 'productos de venta directa'}
                </p>
                <button onClick={() => openInventoryModal()}
                    className="mt-8 bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] flex items-center gap-2"
                >
                    <Plus size={18} />
                    Crear {viewMode === 'movements' ? 'Kardex' : viewMode === 'inventory' ? 'Materiales' : 'primer producto de venta directa'}
                </button>
                </div>
      )}

      {viewMode !== 'movements' ? (
          <div className="animate-in fade-in duration-500">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredInventory.map(item => {
                      const linkedProduct = products.find(p => p.type === ProductType.DIRECT_SALE && (p.ingredients[0]?.inventoryItemId === item.id || (item.productId && p.id === item.productId)));
                      const isLow = item.stock <= item.minStock;
                      const hasPromo = linkedProduct && linkedProduct.promotionType !== PromotionType.NONE;
                      
                      // ✅ FIX: Buscar el nombre de la categoría
                      const categoryName = linkedProduct 
                        ? (categories.find(c => c.id === linkedProduct.category)?.name || 'MATERIA PRIMA')
                        : 'MATERIA PRIMA';
                      
                      return (
                        <div key={item.id} className={`bg-white rounded-[2.5rem] shadow-sm border overflow-hidden hover:shadow-xl transition-all group flex flex-col ${hasPromo ? 'border-emerald-200' : 'border-slate-100 hover:border-brand-200'}`}>
                            <div className="h-44 overflow-hidden relative bg-slate-50 flex items-center justify-center">
                                {linkedProduct?.imageUrl ? (
                                    <img src={linkedProduct.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-200 group-hover:text-brand-200 transition-colors">
                                        <Package size={64} />
                                    </div>
                                )}
                                
                                <div className="absolute top-4 left-4 bg-slate-900/80 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                                    {categoryName}
                                </div>
                                
                                {isLow && (
                                    <div className="absolute top-4 right-4 bg-red-600 text-white p-2 rounded-xl shadow-lg animate-bounce z-10">
                                        <AlertCircle size={16}/>
                                    </div>
                                )}

                                {hasPromo && (
                                    <div className="absolute top-4 right-4 bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5 animate-pulse z-20">
                                        <Tag size={12}/> {linkedProduct?.promotionType === PromotionType.PERCENTAGE ? `${linkedProduct.promotionValue}% OFF` : 'OFERTA'}
                                    </div>
                                )}
                            </div>
                            
                            <div className="p-6 flex-1 flex flex-col">
                                <h4 className="font-black text-slate-800 uppercase tracking-tight mb-2 text-sm leading-tight line-clamp-2">{item.name}</h4>
                                
                                {hasPromo && (
                                    <div className="mb-3 p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                                         <p className="text-[10px] font-black text-emerald-700 uppercase leading-none">
                                            {linkedProduct?.promotionType === PromotionType.PERCENTAGE 
                                                ? `DESCUENTO DEL ${linkedProduct.promotionValue}%` 
                                                : `PRECIO ESPECIAL: ${formatCOP(linkedProduct?.promotionValue || 0)}`}
                                         </p>
                                    </div>
                                )}

                                <div className="flex gap-2 items-center flex-wrap mb-4">
                                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${linkedProduct ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                        {linkedProduct ? 'VTA DIRECTA' : 'MATERIAL'}
                                    </span>
                                    <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[8px] font-black uppercase">
                                        {item.unit.toUpperCase()}
                                    </span>
                                </div>
                                
                                <div className="mt-auto space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Disponible</p>
                                            <p className={`text-lg font-black ${isLow ? 'text-red-600' : 'text-slate-800'}`}>
                                                {item.stock} <span className="text-[10px] text-slate-400 uppercase">{item.unit}</span>
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                {linkedProduct ? 'Precio POS' : 'Costo Prom.'}
                                            </p>
                                            {hasPromo && linkedProduct.promotionType === PromotionType.FIXED_PRICE ? (
                                                <>
                                                    <p className="text-[10px] text-slate-400 line-through font-bold leading-none mb-1">{formatCOP(linkedProduct.price)}</p>
                                                    <p className="text-sm font-black text-emerald-600">{formatCOP(linkedProduct.promotionValue || 0)}</p>
                                                </>
                                            ) : (
                                                <p className="text-sm font-black text-brand-600">
                                                    {formatCOP(linkedProduct ? linkedProduct.price : item.cost)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <button onClick={() => openInventoryModal(item)} className="w-full py-3 bg-slate-50 text-slate-400 font-black uppercase text-[9px] tracking-widest rounded-2xl hover:bg-brand-50 hover:text-brand-600 transition-all print:hidden">
                                        Ajustar Ficha
                                    </button>
                                </div>
                            </div>
                        </div>
                      );
                  })}
              </div>
          </div>
      ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
               <div className="bg-white  border border-slate-100 shadow-sm overflow-hidden overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-[9px] min-w-[1200px] border-collapse">
                        <thead className="bg-slate-900 text-white font-black uppercase tracking-widest">
                            <tr>
                                <th className="px-4 py-5 sticky left-0 bg-slate-900 z-10 border-r border-slate-800">Fecha</th>
                                <th className="px-4 py-5">Ítem de Almacén</th>
                                <th className="px-4 py-5">Documento Ref.</th>
                                <th className="px-4 py-5 text-right border-l border-slate-800">S. Inicial</th>
                                <th className="px-4 py-5 text-right text-emerald-400">Entradas (+)</th>
                                <th className="px-4 py-5 text-right text-red-400">Salidas (-)</th>
                                <th className="px-4 py-5 text-right bg-slate-800">S. Final</th>
                                <th className="px-4 py-5 text-right border-l border-slate-800">Valor Unit.</th>
                                <th className="px-4 py-5 text-right">Total Mov.</th>
                                <th className="px-4 py-5 text-right bg-slate-800">Valor Saldo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredMovements.length > 0 ? (
                                <>
                                    {filteredMovements.map(m => (
                                        <tr key={m.id} className="hover:bg-slate-50 transition-colors font-medium">
                                            <td className="px-4 py-4 font-mono text-slate-400 whitespace-nowrap sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-100">{new Date(m.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                                            <td className="px-4 py-4">
                                                <p className="font-black text-slate-800 uppercase text-[10px]">{m.itemName}</p>
                                                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">{m.reason}</p>
                                            </td>
                                            <td className="px-4 py-4 font-black text-brand-600">#{m.reference.split('-')[1] || m.reference}</td>
                                            <td className="px-4 py-4 text-right font-mono text-slate-500 border-l border-slate-100">{m.previousStock}</td>
                                            <td className="px-4 py-4 text-right font-black text-emerald-600 bg-emerald-50/10">{m.quantityIn > 0 ? `+${m.quantityIn}` : '-'}</td>
                                            <td className="px-4 py-4 text-right font-black text-red-600 bg-red-50/10">{m.quantityOut > 0 ? `-${m.quantityOut}` : '-'}</td>
                                            <td className="px-4 py-4 text-right bg-slate-50 font-black text-slate-900 text-xs">{m.newStock}</td>
                                            <td className="px-4 py-4 text-right font-mono text-slate-500 border-l border-slate-100">{formatCOP(m.unitCost)}</td>
                                            <td className="px-4 py-4 text-right font-black text-slate-700">{formatCOP(m.totalValue)}</td>
                                            <td className="px-4 py-4 text-right bg-slate-50 font-black text-slate-900">{formatCOP(m.balanceValue)}</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-slate-900 text-white font-black uppercase text-[10px] sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                                        <td colSpan={3} className="px-4 py-6 text-right border-r border-slate-800">Totales Reporte</td>
                                        <td className="px-4 py-6 border-r border-slate-800"></td>
                                        <td className="px-4 py-6 text-right text-emerald-400">+{kardexTotals.entries.toLocaleString()}</td>
                                        <td className="px-4 py-6 text-right text-red-400">-{kardexTotals.exits.toLocaleString()}</td>
                                        <td className="px-4 py-6"></td>
                                        <td className="px-4 py-6"></td>
                                        <td className="px-4 py-6 text-right text-brand-500">{formatCOP(kardexTotals.net)}</td>
                                        <td className="px-4 py-6"></td>
                                    </tr>
                                </>
                            ) : (
                                <tr>
                                    <td colSpan={10} className="py-32 text-center text-slate-300">
                                        <History size={64} className="opacity-10 mx-auto mb-4" />
                                        <p className="font-black tracking-widest text-xs">Sin historial de movimientos registrado</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
               </div>
               <div className="flex items-center gap-3 bg-brand-50 p-4 rounded-2xl border border-brand-100">
                   <Info size={20} className="text-brand-600 shrink-0" />
                   <p className="text-[10px] text-brand-800 font-bold leading-relaxed">
                       El Kardex Maestro registra entradas por compra/ajuste y salidas por venta POS o consumo de recetas. 
                       La valoración utiliza el método de Costo Promedio Ponderado. Los totales reflejan solo los datos filtrados por fecha.
                   </p>
               </div>
          </div>
      )}

      {isInventoryModalOpen && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[500] p-4">
              <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[92vh]">
                  <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                      <div className="flex items-center gap-3">
                          <div className="bg-brand-600 p-2 rounded-xl text-white shadow-lg"><Package size={20}/></div>
                          <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">{editingInventory ? 'Editar Registro Técnico' : 'Alta de Nuevo Material'}</h3>
                      </div>
                      <button onClick={() => setIsInventoryModalOpen(false)} className="bg-white p-2 rounded-xl shadow-sm text-slate-400 hover:text-slate-700 transition-all"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleInventorySubmit} className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                          <div className="space-y-6">
                              <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nombre Comercial</label><input required type="text" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-brand-500 outline-none uppercase" value={invName} onChange={e => setInvName(e.target.value)} /></div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Unidad Almacén</label>
                                    <select className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-xs uppercase disabled:opacity-60" value={isDirectSale ? InventoryUnit.UND : invUnit} disabled={isDirectSale} onChange={e => setInvUnit(e.target.value)}>
                                        {Object.values(InventoryUnit).map(u => (
                                            <option key={u} value={u}>{InventoryUnitLabels[u]}</option>
                                        ))}
                                    </select>
                                  </div>
                                  <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Stock Actual Físico</label><input required type="number" step="0.01" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black" value={invStock} onChange={e => setInvStock(e.target.value)} /></div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Costo Ponderado</label><input required type="number" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black" value={invCost} onChange={e => setInvCost(e.target.value)} /></div>
                                  <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Alerta Mínimo</label><input required type="number" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-red-600" value={invMin} onChange={e => setInvMin(e.target.value)} /></div>
                              </div>
                          </div>
                          <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col">
                              <div className="flex justify-between items-center mb-6"><h4 className="font-black text-[10px] uppercase text-slate-500 tracking-[0.2em]">Configurar Venta POS</h4><button type="button" onClick={() => setIsDirectSale(!isDirectSale)} className={`w-12 h-6 rounded-full relative transition-all ${isDirectSale ? 'bg-brand-600' : 'bg-slate-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isDirectSale ? 'left-7' : 'left-1'}`}></div></button></div>
                              <div className={`space-y-6 ${isDirectSale ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                                  <div className="relative group"><div className="h-32 w-full bg-white border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:border-brand-300 transition-all" onClick={() => fileInputRef.current?.click()}>{saleImageUrl ? <img src={saleImageUrl} className="w-full h-full object-cover" /> : <><ImageIcon size={32} className="text-slate-200 mb-2" /><span className="text-[10px] font-black text-slate-400 uppercase">Foto Producto</span></>}<input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} /></div></div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <input type="number" placeholder="Precio POS" className="w-full bg-white border border-brand-100 rounded-xl p-4 font-black text-brand-800" value={salePrice} onChange={e => setSalePrice(e.target.value)} />
                                    <select className="w-full bg-white border border-slate-100 rounded-xl p-4 font-bold text-xs uppercase" value={saleCategory} onChange={e => setSaleCategory(e.target.value)}>
                                      {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-4">
                                    <h4 className="text-[9px] font-black text-brand-600 uppercase tracking-widest flex items-center gap-2"><Tag size={12}/> Promoción de Ítem</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <select className="w-full bg-slate-50 border-none rounded-xl p-3 text-[10px] font-bold uppercase" value={salePromotionType} 
                                            onChange={e => setSalePromotionType(e.target.value as PromotionType)}>
                                            <option value={PromotionType.NONE}>Sin Promo</option>
                                            <option value={PromotionType.PERCENTAGE}>% Descuento</option>
                                            <option value={PromotionType.FIXED_PRICE}>Precio Fijo</option>
                                        </select>
                                        {salePromotionType !== PromotionType.NONE && (
                                            <div className="relative">
                                                <div className="absolute left-3 top-2.5 text-brand-600">
                                                    {salePromotionType === PromotionType.PERCENTAGE ? <Percent size={14}/> : <DollarSign size={14}/>}
                                                </div>
                                                <input 
                                                    type="number" 
                                                    placeholder="Valor" 
                                                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-black" 
                                                    value={salePromotionValue} 
                                                    onChange={e => setSalePromotionValue(e.target.value)} 
                                                />
                                            </div>
                                        )}
                                    </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                      <button type="submit" className="w-full bg-slate-900 text-white font-black py-6 rounded-[2rem] shadow-xl uppercase tracking-widest text-xs active:scale-95 transition-all">Guardar Cambios Maestros</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};