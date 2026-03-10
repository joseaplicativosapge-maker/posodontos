import React, { useState, useRef, useMemo } from 'react';
import { Product, ProductionArea, Category, ProductType, RecipeItem, ComboItem, Branch, PromotionType, InventoryItem } from '../types';
import { ChefHat, Plus, X, Save, Edit2, Search, ImageIcon, Tag, LayoutGrid, Info, Layers, QrCode, Trash2, Percent, Calculator, DollarSign, ArrowRight, ShieldCheck, BookOpen, Download, Printer, Utensils, Boxes, BoxSelect } from 'lucide-react';
import { useNotification } from './NotificationContext';
import { AccountingAccount } from '../types_accounting';
import { QrMenuView } from './QrMenuView';

interface ProductsViewProps {
  products: Product[];
  inventory: InventoryItem[];
  categories: Category[];
  puc?: AccountingAccount[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  currentBranch?: Branch;
  taxRate: number;
  impoconsumoRate: number;
}

// ✅ RecipeItem extendido con unidad de receta
interface RecipeItemExtended extends RecipeItem {
  recipeUnit?: string;
}

// ✅ Factor de conversión: de unidad de receta → unidad base del inventario
const getConversionFactor = (recipeUnit: string, inventoryUnit: string): number => {
  const from = recipeUnit?.toLowerCase();
  const to = inventoryUnit?.toLowerCase();
  if (from === to) return 1;
  if (from === 'gr' && to === 'kg') return 0.001;
  if (from === 'kg' && to === 'gr') return 1000;
  if (from === 'ml' && to === 'lt') return 0.001;
  if (from === 'lt' && to === 'ml') return 1000;
  if (from === 'g'  && to === 'kg') return 0.001;
  if (from === 'kg' && to === 'g')  return 1000;
  if (from === 'mg' && to === 'kg') return 0.000001;
  if (from === 'mg' && to === 'gr') return 0.001;
  if (from === 'ml' && to === 'l')  return 0.001;
  if (from === 'l'  && to === 'ml') return 1000;
  return 1;
};

// ✅ Unidades compatibles según la unidad base del inventario
const getCompatibleUnits = (inventoryUnit: string): string[] => {
  const u = inventoryUnit?.toLowerCase();
  if (u === 'kg') return ['kg', 'gr', 'g', 'mg'];
  if (u === 'gr') return ['gr', 'kg', 'mg'];
  if (u === 'g')  return ['g', 'kg', 'mg'];
  if (u === 'lt') return ['lt', 'ml'];
  if (u === 'l')  return ['l', 'ml'];
  if (u === 'ml') return ['ml', 'lt', 'l'];
  return [inventoryUnit || 'und'];
};

export const ProductsView: React.FC<ProductsViewProps> = ({ 
    products, inventory, categories, puc = [], onAddProduct, onUpdateProduct, currentBranch, taxRate, impoconsumoRate
}) => {
  const { notify } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodArea, setProdArea] = useState<ProductionArea>(ProductionArea.KITCHEN);
  const [prodType, setProdType] = useState<ProductType>(ProductType.PREPARED);
  const [prodIngredients, setProdIngredients] = useState<RecipeItemExtended[]>([]);
  const [prodComboItems, setProdComboItems] = useState<ComboItem[]>([]);
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodPromotionType, setProdPromotionType] = useState<PromotionType>(PromotionType.NONE);
  const [prodPromotionValue, setProdPromotionValue] = useState('');
  const [prodTaxType, setProdTaxType]     = useState<'NONE' | 'IVA' | 'IMPOCONSUMO'>('NONE');
  const [prodPucIncome, setProdPucIncome] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatCOP = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  // ✅ Costo con conversión de unidades aplicada
  const calculatedCost = useMemo(() => {
    if (prodType === ProductType.PREPARED) {
      return prodIngredients.reduce((s, ing) => {
        const inv = inventory.find(i => i.id === ing.inventoryItemId);
        if (!inv) return s;
        const factor = getConversionFactor(ing.recipeUnit || inv.unit, inv.unit);
        return s + (ing.quantity * factor * inv.cost);
      }, 0);
    } else if (prodType === ProductType.COMBO) {
      return prodComboItems.reduce((s, ci) => {
        const sub = products.find(p => p.id === ci.productId);
        if (!sub) return s;
        return s + (sub.cost * ci.quantity);
      }, 0);
    }
    return 0;
  }, [prodType, prodIngredients, prodComboItems, inventory, products]);

  const openModal = (p?: Product) => {
    if (p) {
      setEditingProduct(p);
      setProdName(p.name);
      setProdPrice(p.price.toString());
      setProdCategory(typeof p.category === 'object' ? p.category?.id : p.category);
      setProdArea(p.productionArea);
      
      const resolvedType = (p.type || p.productType) as ProductType;
      setProdType(resolvedType);
      
      // ✅ Al editar, rellenar recipeUnit desde inventario si no existe (compatibilidad datos viejos)
      const ingredientsWithUnit = (p.ingredients || []).map((ing: any) => {
        if (ing.recipeUnit) return ing;
        const inv = inventory.find(i => i.id === ing.inventoryItemId);
        return { ...ing, recipeUnit: inv?.unit || '' };
      });
      setProdIngredients(ingredientsWithUnit);

      setProdComboItems(p.comboItems || []);
      setProdImageUrl(p.imageUrl || '');
      setProdPromotionType(p.promotionType || PromotionType.NONE);
      setProdPromotionValue(p.promotionValue?.toString() || '');
      setProdTaxType(p.taxType || 'NONE');
      setProdPucIncome(p.pucIncomeAccountId || '');
    } else {
      setEditingProduct(null);
      setProdName('');
      setProdPrice('');
      setProdCategory(categories[0]?.id || '');
      setProdArea(ProductionArea.KITCHEN);
      setProdType(ProductType.PREPARED);
      setProdIngredients([]);
      setProdComboItems([]);
      setProdImageUrl('');
      setProdPromotionType(PromotionType.NONE);
      setProdPromotionValue('');
      setProdTaxType('NONE');
      setProdPucIncome('');
    }
    setIsModalOpen(true);
  };

  // ✅ VALIDACIÓN MEJORADA
  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (prodType === ProductType.PREPARED) {
      const validIngredients = prodIngredients.filter(ing => ing.inventoryItemId !== '' && ing.quantity > 0);
      if (validIngredients.length === 0) {
        notify("El servicio debe tener al menos un insumo con cantidad válida", "warning"); return;
      }
      const hasIncomplete = prodIngredients.some(ing => ing.inventoryItemId === '' || ing.quantity <= 0);
      if (hasIncomplete) {
        notify("Todos los insumos deben tener insumo y cantidad seleccionados", "warning"); return;
      }
    }

    if (prodType === ProductType.COMBO) {
      const validComboItems = prodComboItems.filter(ci => ci.productId !== '' && ci.quantity > 0);
      if (validComboItems.length === 0) {
        notify("El combo debe incluir al menos un tratamiento válido", "warning"); return;
      }
      const hasIncomplete = prodComboItems.some(ci => ci.productId === '' || ci.quantity <= 0);
      if (hasIncomplete) {
        notify("Todos los tratamientos del combo deben estar seleccionados con cantidad válida", "warning"); return;
      }
    }

    const raw = localStorage.getItem("gastro_data");
    const companyId = raw ? JSON.parse(raw)?.user?.companyId : null;

    const data: Product = {
      id: editingProduct?.id || null,
      companyId: companyId,
      name: prodName.toUpperCase(),
      price: parseFloat(prodPrice),
      cost: calculatedCost,
      category: prodCategory,
      productionArea: prodArea,
      productType: prodType,
      ingredients: prodType === ProductType.PREPARED ? prodIngredients : [],
      comboItems: prodType === ProductType.COMBO ? prodComboItems : [],
      isCombo: prodType === ProductType.COMBO,
      requiresPreparation: prodType === ProductType.PREPARED,
      isActive: true,
      imageUrl: prodImageUrl || null,
      promotionType: prodPromotionType,
      promotionValue: prodPromotionType !== PromotionType.NONE ? parseFloat(prodPromotionValue) : undefined,
      taxType: prodTaxType,
      pucIncomeAccountId: prodPucIncome
    };
    if (editingProduct) onUpdateProduct(data);
    else onAddProduct(data);
    setIsModalOpen(false);
    notify("Catálogo actualizado", "success");
  };

  const addIngredient = () =>
    setProdIngredients([...prodIngredients, { inventoryItemId: '', quantity: 0, recipeUnit: '' }]);
  const removeIngredient = (i: number) => setProdIngredients(prodIngredients.filter((_, idx) => idx !== i));
  const updateIngredient = (i: number, field: string, val: any) => {
    const n = [...prodIngredients];
    n[i] = { ...n[i], [field]: val };
    // Al cambiar el insumo, auto-asignar la unidad base como unidad de receta por defecto
    if (field === 'inventoryItemId') {
      const inv = inventory.find(inv => inv.id === val);
      n[i].recipeUnit = inv?.unit || '';
    }
    setProdIngredients(n);
  };

  const addComboItem = () => setProdComboItems([...prodComboItems, { productId: '', quantity: 1 }]);
  const removeComboItem = (i: number) => setProdComboItems(prodComboItems.filter((_, idx) => idx !== i));
  const updateComboItem = (i: number, field: string, val: any) => {
      const n = [...prodComboItems]; n[i] = { ...n[i], [field]: val }; setProdComboItems(n);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProdImageUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleExportCSV = () => {
    const activeProducts = products.filter(p => p.productType !== ProductType.DIRECT_SALE && p.isActive);
    const headers = ["Plato", "Categoria", "Tipo", "Precio", "Costo", "Promo"];
    const rows = activeProducts.map(p => [p.name, p.category, p.productType, p.price, p.cost, p.promotionType]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Menu_${Date.now()}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const displayProducts = products.filter(p => p.type !== ProductType.DIRECT_SALE && 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) && p.isActive);
  
  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-slate-50 pb-24">
      <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-6">
        <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
                <ChefHat className="text-brand-600" size={32} />
                Cartas y Menús
            </h2>
            <p className="text-slate-500 font-medium text-xs tracking-widest mt-1">Gestión avanzada de platos y combos.</p>
        </div>
        <div className="flex gap-2 print:hidden">
            <button onClick={handleExportCSV} className="bg-white border border-emerald-200 text-emerald-600 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-sm hover:bg-emerald-50 transition-all flex items-center gap-2"><Download size={16}/> Descargar Excel</button>
            <button onClick={() => window.print()} className="bg-white border border-slate-200 text-slate-700 px-6 py-3.5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest flex items-center shadow-sm hover:bg-slate-50 transition-all active:scale-95 gap-2"><Printer size={16}/> PDF</button>
            <button onClick={() => setIsQrModalOpen(true)} className="bg-white border border-slate-200 text-slate-700 px-6 py-3.5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest flex items-center shadow-sm hover:bg-slate-50 transition-all active:scale-95 gap-2"><QrCode size={16} /> QR</button>
            <button onClick={() => openModal()} className="bg-slate-900 text-white px-8 py-3.5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest flex items-center shadow-xl hover:bg-brand-600 transition-all active:scale-95"><Plus size={16} /> Agregar</button>
        </div>
      </div>

      <div className="mb-8 relative group print:hidden">
          <Search className="absolute left-5 top-4 text-slate-400" size={20} />
          <input type="text" placeholder="Buscar plato o combo..." className="w-full pl-14 pr-6 py-4 border-none bg-white rounded-3xl shadow-sm focus:ring-2 focus:ring-brand-500 font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {displayProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <div className="bg-slate-100 w-32 h-32 rounded-full flex items-center justify-center mb-6">
            <ChefHat size={48} className="text-slate-300" />
          </div>
          <h3 className="text-2xl font-black">Sin tratamientos</h3>
          <p className="text-slate-500 mt-3 max-w-xs">No existen tratamientos registrados</p>
          <button onClick={() => openModal()} className="mt-8 bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
            <Plus size={18} />
            Crear primer producto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayProducts.map(p => {
            const hasPromo = p.promotionType !== PromotionType.NONE;
            return (
              <div key={p.id} className={`bg-white rounded-[2.5rem] shadow-sm border overflow-hidden hover:shadow-xl transition-all group flex flex-col ${hasPromo ? 'border-emerald-200' : 'border-slate-100 hover:border-brand-200'}`}>
                <div className="h-44 overflow-hidden relative">
                    <img src={p.imageUrl || `${import.meta.env.VITE_URL_BASE}/assets/img/default.png`} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute top-4 left-4 bg-slate-900/80 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest backdrop-blur-md">{p.category?.name}</div>
                    {hasPromo && (
                        <div className="absolute top-4 right-4 bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5 animate-pulse">
                            <Tag size={12}/> {p.promotionType === PromotionType.PERCENTAGE ? `${p.promotionValue}% OFF` : 'OFERTA'}
                        </div>
                    )}
                    {p.isCombo && !hasPromo && <div className="absolute top-4 right-4 bg-purple-600 text-white p-1.5 rounded-xl shadow-lg"><BoxSelect size={16}/></div>}
                </div>
                <div className="p-6 flex-1 flex flex-col">
                    <h4 className="font-black text-slate-800 uppercase tracking-tight mb-2 text-sm leading-tight">{p.name}</h4>
                    {hasPromo && (
                        <div className="mb-3 p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                             <p className="text-[10px] font-black text-emerald-700 uppercase leading-none">
                                {p.type === PromotionType.PERCENTAGE 
                                    ? `DESCUENTO DEL ${p.promotionValue}%` 
                                    : `PRECIO ESPECIAL: ${formatCOP(p.promotionValue || 0)}`}
                             </p>
                        </div>
                    )}
                    <div className="flex gap-2 items-center flex-wrap mb-4">
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${p.type === ProductType.COMBO ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}>{p.type}</span>
                        {p.requiresPreparation && <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[8px] font-black uppercase">INSUMO</span>}
                    </div>
                    <div className="mt-auto flex justify-between items-end">
                        <div>
                            {hasPromo && p.type === PromotionType.FIXED_PRICE ? (
                                <>
                                    <p className="text-[10px] text-slate-400 line-through font-bold leading-none mb-1">{formatCOP(p.price)}</p>
                                    <p className="text-sm font-black text-emerald-600">{formatCOP(p.promotionValue || 0)}</p>
                                </>
                            ) : (
                                <p className="text-sm font-black text-brand-600">{formatCOP(p.price)}</p>
                            )}
                        </div>
                        <button onClick={() => openModal(p)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-brand-600 rounded-xl transition-all print:hidden">
                            <Edit2 size={16}/>
                        </button>
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[250] p-4">
              <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[92vh]">
                  <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                      <div className="flex items-center gap-3">
                          <div className="bg-brand-600 p-2 rounded-xl text-white shadow-lg"><ChefHat size={20}/></div>
                          <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">{editingProduct ? 'Editar Producto' : 'Alta Nuevo Plato'}</h3>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="bg-white p-2 rounded-xl shadow-sm text-slate-400 hover:text-slate-700 transition-all"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleProductSubmit} className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                          <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nombre Comercial del Plato</label>
                                    <input required type="text" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-brand-500 outline-none uppercase text-xs" value={prodName} onChange={e => setProdName(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Categoría del Menú</label>
                                        <select className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-[10px] uppercase" value={prodCategory} onChange={(e) => setProdCategory(e.target.value)}>
                                            <option value="" disabled>Seleccione categoría</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Precio al Público ($)</label>
                                        <input required type="number" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-sm" value={prodPrice} onChange={e => setProdPrice(e.target.value)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Estación de Despacho</label>
                                        <select className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-[10px] uppercase" value={prodArea} onChange={e => setProdArea(e.target.value as any)}>
                                            {Object.values(ProductionArea).map(a => <option key={a} value={a}>{a}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Configuración Técnica</label>
                                        <select className="w-full bg-slate-900 text-white border-none rounded-2xl p-4 font-black text-[10px] uppercase" value={prodType} onChange={e => setProdType(e.target.value as ProductType)}>
                                            <option value={ProductType.PREPARED}>Insumos necesarios</option>
                                            <option value={ProductType.COMBO}>Combo (Multi-Producto)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* ✅ SECCIÓN DE INSUMOS / COMBO CON CONVERSIÓN */}
                                <div className="bg-slate-100 p-6 rounded-[2rem] border border-slate-200">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                            {prodType === ProductType.PREPARED
                                              ? <><Utensils size={14} className="text-brand-600"/> Definición de Insumo</>
                                              : <><BoxSelect size={14} className="text-purple-600"/> Componentes del Combo</>}
                                        </h4>
                                        <button type="button" onClick={prodType === ProductType.PREPARED ? addIngredient : addComboItem} className="bg-white p-2 rounded-xl text-brand-600 shadow-sm border border-slate-200 hover:bg-brand-50 transition-all"><Plus size={16}/></button>
                                    </div>
                                    <div className="space-y-3">
                                        {prodType === ProductType.PREPARED ? (
                                          prodIngredients.length === 0 ? (
                                            <p className="text-center text-[10px] text-slate-400 font-bold uppercase py-4">
                                              Agregue al menos un insumo a la insumo
                                            </p>
                                          ) : (
                                            prodIngredients.map((ing, idx) => {
                                              const inv = inventory.find(i => i.id === ing.inventoryItemId);
                                              const compatibleUnits = inv ? getCompatibleUnits(inv.unit) : [];
                                              const isInvalid = ing.inventoryItemId === '' || ing.quantity <= 0;
                                              const factor = inv ? getConversionFactor(ing.recipeUnit || inv.unit, inv.unit) : 1;
                                              const costLine = inv && ing.quantity > 0 ? ing.quantity * factor * inv.cost : 0;
                                              const isConverting = inv && ing.recipeUnit && ing.recipeUnit.toLowerCase() !== inv.unit.toLowerCase();

                                              return (
                                                <div key={idx} className={`rounded-2xl p-3 transition-all border ${isInvalid ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'}`}>

                                                  {/* Fila 1: selector de insumo + botón eliminar */}
                                                  <div className="flex gap-2 items-center mb-2">
                                                    <select
                                                      className="flex-1 bg-slate-50 rounded-xl p-2.5 text-[10px] font-bold uppercase border-none outline-none"
                                                      value={ing.inventoryItemId}
                                                      onChange={e => updateIngredient(idx, 'inventoryItemId', e.target.value)}
                                                    >
                                                      <option value="">Seleccione Insumo...</option>
                                                      {inventory.map(inv => <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>)}
                                                    </select>
                                                    <button type="button" onClick={() => removeIngredient(idx)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={15}/></button>
                                                  </div>

                                                  {/* Fila 2: cantidad + selector unidad + costo parcial */}
                                                  {ing.inventoryItemId && (
                                                    <div className="flex gap-2 items-center">
                                                      <input
                                                        type="number"
                                                        step="0.001"
                                                        min="0.001"
                                                        placeholder="Cant."
                                                        className="w-24 bg-slate-50 rounded-xl p-2.5 text-center font-black text-xs border-none outline-none"
                                                        value={ing.quantity || ''}
                                                        onChange={e => updateIngredient(idx, 'quantity', parseFloat(e.target.value))}
                                                      />

                                                      {/* ✅ Selector de unidad de receta */}
                                                      <select
                                                        className="bg-brand-600 text-white rounded-xl px-3 py-2.5 text-[10px] font-black uppercase border-none outline-none cursor-pointer"
                                                        value={ing.recipeUnit || inv?.unit || ''}
                                                        onChange={e => updateIngredient(idx, 'recipeUnit', e.target.value)}
                                                      >
                                                        {compatibleUnits.map(u => (
                                                          <option key={u} value={u}>{u.toUpperCase()}</option>
                                                        ))}
                                                      </select>

                                                      {/* Costo parcial en tiempo real */}
                                                      {ing.quantity > 0 && inv && (
                                                        <div className="ml-auto text-right">
                                                          <p className="text-[8px] text-slate-400 font-bold uppercase leading-none mb-0.5">costo</p>
                                                          <p className="text-[11px] font-black text-emerald-600 leading-none">{formatCOP(costLine)}</p>
                                                        </div>
                                                      )}
                                                    </div>
                                                  )}

                                                  {/* ✅ Indicador visual de conversión activa */}
                                                  {isConverting && ing.quantity > 0 && (
                                                    <div className="mt-2 bg-brand-50 border border-brand-100 rounded-xl px-3 py-1.5 flex items-center gap-2">
                                                      <span className="text-[9px] font-black text-brand-600 uppercase">
                                                        {ing.quantity} {ing.recipeUnit?.toUpperCase()} =
                                                      </span>
                                                      <span className="text-[9px] font-black text-slate-700 uppercase">
                                                        {(ing.quantity * factor).toFixed(4)} {inv?.unit.toUpperCase()} en inventario
                                                      </span>
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })
                                          )
                                        ) : (
                                          prodComboItems.length === 0 ? (
                                            <p className="text-center text-[10px] text-slate-400 font-bold uppercase py-4">
                                              Agregue al menos un producto al combo
                                            </p>
                                          ) : (
                                            prodComboItems.map((ci, idx) => {
                                              const isInvalid = ci.productId === '' || ci.quantity <= 0;
                                              return (
                                                <div key={idx} className={`flex gap-2 items-center animate-in slide-in-from-left-2 rounded-xl p-1 transition-all ${isInvalid ? 'bg-red-50 border border-red-200' : ''}`}>
                                                    <select
                                                      className="flex-1 bg-white rounded-xl p-3 text-[10px] font-bold uppercase border-none outline-none"
                                                      value={ci.productId}
                                                      onChange={e => updateComboItem(idx, 'productId', e.target.value)}
                                                    >
                                                      <option value="">Producto...</option>
                                                      {products.filter(p => p.id !== editingProduct?.id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                    </select>
                                                    <input
                                                      type="number"
                                                      min="1"
                                                      className="w-16 bg-white rounded-xl p-3 text-center font-black text-xs border-none outline-none"
                                                      value={ci.quantity}
                                                      onChange={e => updateComboItem(idx, 'quantity', parseInt(e.target.value))}
                                                    />
                                                    <button type="button" onClick={() => removeComboItem(idx)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                                </div>
                                              );
                                            })
                                          )
                                        )}
                                    </div>
                                </div>
                          </div>
                          
                          <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col">
                              <div className="flex justify-between items-center mb-6">
                                <h4 className="font-black text-[10px] uppercase text-slate-500 tracking-[0.2em] flex items-center gap-2"><ImageIcon size={14}/> Marketing & Visualización</h4>
                              </div>
                              <div className="space-y-6">
                                  <div className="relative group">
                                      <div className="h-40 w-full bg-white border-2 border-dashed border-slate-200 rounded-3xl overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:border-brand-300 transition-all" onClick={() => fileInputRef.current?.click()}>
                                          {prodImageUrl ? <img src={prodImageUrl} className="w-full h-full object-cover" /> : <><ImageIcon size={40} className="text-slate-200 mb-2" /><span className="text-[10px] font-black text-slate-400 uppercase">Fotografía del Plato</span></>}
                                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                      </div>
                                  </div>

                                  <div className="bg-white border border-slate-100 rounded-[2rem] p-5 space-y-4">
                                      <h4 className="text-[9px] font-black text-brand-600 uppercase tracking-widest flex items-center gap-2"><Tag size={14}/> Gestión de Ofertas</h4>
                                      <div className="grid grid-cols-2 gap-4">
                                          <select className="w-full bg-slate-50 border-none rounded-xl p-3 text-[10px] font-bold" value={prodPromotionType} onChange={e => setProdPromotionType(e.target.value as PromotionType)}>
                                              <option value={PromotionType.NONE}>Sin Oferta</option>
                                              <option value={PromotionType.PERCENTAGE}>% Descuento</option>
                                              <option value={PromotionType.FIXED_PRICE}>Precio Neto</option>
                                          </select>
                                          {prodPromotionType !== PromotionType.NONE && (
                                              <div className="relative">
                                                  <input type="number" className="w-full pl-8 pr-3 py-3 bg-slate-50 border-none rounded-xl text-xs font-black" value={prodPromotionValue} onChange={e => setProdPromotionValue(e.target.value)} placeholder="Valor" />
                                                  <div className="absolute left-3 top-3 text-brand-600">
                                                      {prodPromotionType === PromotionType.PERCENTAGE ? <Percent size={12}/> : <DollarSign size={12}/>}
                                                  </div>
                                              </div>
                                          )}
                                      </div>
                                  </div>

                                  <div className="bg-brand-900 p-6 rounded-[2rem] text-white space-y-4 shadow-xl relative overflow-hidden">
                                      <h4 className="text-[10px] font-black text-brand-400 uppercase tracking-widest flex items-center gap-2"><Calculator size={14}/> Análisis de Utilidad</h4>
                                      <div className="space-y-1">
                                          <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-400 uppercase">Costo Base Insumos</span><span className="text-md font-black text-emerald-400">{formatCOP(calculatedCost)}</span></div>
                                          <div className="flex justify-between items-center pt-2 border-t border-white/5"><span className="text-[10px] font-bold text-slate-400 uppercase">Margen Bruto</span><span className="text-xl font-black">{formatCOP(Math.max(0, parseFloat(prodPrice || '0') - calculatedCost))}</span></div>
                                      </div>
                                      <DollarSign className="absolute -right-6 -bottom-6 text-white/5" size={100} />
                                  </div>

                                  <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 space-y-4">
                                      <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2"><ShieldCheck size={14}/> Mapeo Contable & Fiscal</h4>
                                      <div className="grid grid-cols-2 gap-3">
                                          <select className="w-full bg-white border-none rounded-xl p-3 text-[10px] font-black uppercase" value={prodTaxType} onChange={e => setProdTaxType(e.target.value as any)}>
                                            <option value="NONE">Sin impuesto (0%)</option>
                                            <option value="IVA">IVA ({taxRate * 100}%)</option>
                                            <option value="IMPOCONSUMO">IMPOC ({impoconsumoRate * 100}%)</option>
                                          </select>
                                          <select className="w-full bg-white border-none rounded-xl p-3 text-[10px] font-bold uppercase" value={prodPucIncome} onChange={e => setProdPucIncome(e.target.value)}>
                                            <option value="">Ingresos (4)...</option>
                                            {puc.filter(a => a.code.startsWith('4')).map(a => <option key={a.id} value={a.id}>{a.code}</option>)}
                                          </select>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                      <button type="submit" className="w-full bg-slate-900 text-white font-black py-6 rounded-[2rem] shadow-xl uppercase tracking-widest text-xs active:scale-95 transition-all">
                        Sincronizar con Catálogo Maestro
                      </button>
                  </form>
              </div>
          </div>
      )}
      
      {isQrModalOpen && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[300] p-4">
              <div className="bg-white rounded-[3rem] w-full max-w-6xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 h-[85vh] flex flex-col">
                  <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
                       <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">Menú Digital QR</h3>
                       <button onClick={() => setIsQrModalOpen(false)} className="bg-white p-2 rounded-xl text-slate-400"><X size={24}/></button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                      <QrMenuView products={products} currentBranch={currentBranch} />
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};