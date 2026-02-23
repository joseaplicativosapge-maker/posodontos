
import React, { useState, useMemo } from 'react';
import { InventoryItem, Product, Order, OrderStatus } from '../types';
import { Package, ShoppingBag, AlertTriangle, CalendarPlus2, ArrowUp, Download, Search, Info, FileText } from 'lucide-react';

interface InventoryReportProps {
  inventory: InventoryItem[];
  products: Product[];
  orders: Order[];
}

export const InventoryReport: React.FC<InventoryReportProps> = ({ inventory, products, orders }) => {
  const [activeSubTab, setActiveSubTab] = useState<'insumos' | 'preparados' | 'directa'>('insumos');
  const [searchTerm, setSearchTerm] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
  };

  const insumosReport = useMemo(() => {
    return inventory.map(item => {
      const usedIn = products.filter(p => p.ingredients?.some(i => i.inventoryItemId === item.id));
      return {
        ...item,
        usedInCount: usedIn.length,
        usedInNames: usedIn.map(p => p.name).join(', '),
        isLow: item.stock <= item.minStock
      };
    }).filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [inventory, products, searchTerm]);

  const preparadosReport = useMemo(() => {
    return products
      .filter(p => p.requiresPreparation && !p.isCombo)
      .map(product => {
        let minCanMake = Infinity;
        let limitingIngredient = "Ninguno";

        if (!product.ingredients || product.ingredients.length === 0) {
          minCanMake = 0;
        } else {
          product.ingredients.forEach(ing => {
            const invItem = inventory.find(i => i.id === ing.inventoryItemId);
            if (invItem) {
              const possible = Math.floor(invItem.stock / ing.quantity);
              if (possible < minCanMake) {
                minCanMake = possible;
                limitingIngredient = invItem.name;
              }
            } else {
              minCanMake = 0;
              limitingIngredient = "Material Faltante";
            }
          });
        }

        const canMake = minCanMake === Infinity ? 0 : minCanMake;

        return {
          id: product.id,
          name: product.name,
          category: product.category,
          canMake,
          limitingIngredient,
          isCritical: canMake <= 5
        };
      }).filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, inventory, searchTerm]);

  const directaReport = useMemo(() => {
    const salesCount: Record<string, number> = {};
    orders.filter(o => o.status === OrderStatus.COMPLETED).forEach(order => {
      order.items.forEach(item => {
        salesCount[item.product.id] = (salesCount[item.product.id] || 0) + item.quantity;
      });
    });

    return products
      .filter(p => (!p.requiresPreparation && !p.isCombo) || p.productType === 'VENTA_DIRECTA')
      .map(product => {
        const stock = product.stock ?? 0;
        return {
          id: product.id,
          name: product.name,
          category: product.category,
          stock,
          sales: salesCount[product.id] || 0,
          isLow: stock <= 5,
          isOut: stock <= 0
        };
      }).filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, orders, searchTerm]);

  const exportToCSV = () => {
    let data = [];
    let filename = "";
    if (activeSubTab === 'insumos') {
      filename = "reporte_materiales.csv";
      data = insumosReport.map(i => ({ Nombre: i.name, Stock: i.stock, Unidad: i.unit, "Costo Prom": i.cost }));
    } else if (activeSubTab === 'preparados') {
      filename = "reporte_servicios_materiales.csv";
      data = preparadosReport.map(p => ({ Plato: p.name, "Puede Preparar": p.canMake, "Material Limitante": p.limitingIngredient }));
    } else {
      filename = "reporte_venta_directa.csv";
      data = directaReport.map(d => ({ Producto: d.name, Stock: d.stock, Ventas: d.sales }));
    }
    if (data.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [Object.keys(data[0]).join(","), ...data.map(row => Object.values(row).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit print:hidden">
        <button onClick={() => { setActiveSubTab('insumos'); setSearchTerm(''); }} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeSubTab === 'insumos' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}><Package size={14} /> Insumos</button>
        <button onClick={() => { setActiveSubTab('preparados'); setSearchTerm(''); }} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeSubTab === 'preparados' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}><CalendarPlus2 size={14} /> Servicios (Materiales)</button>
        <button onClick={() => { setActiveSubTab('directa'); setSearchTerm(''); }} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeSubTab === 'directa' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}><ShoppingBag size={14} /> Venta Directa</button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 border border-slate-100 print:hidden">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input type="text" placeholder="Buscar en este reporte..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-500 font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <button onClick={exportToCSV} className="flex-1 md:flex-none flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all justify-center"><Download size={16} /> Excel (CSV)</button>
            <button onClick={() => window.print()} className="flex-1 md:flex-none flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all justify-center"><FileText size={16} /> Exportar PDF</button>
        </div>
      </div>

      <div className="bg-white border border-slate-100 overflow-hidden shadow-sm">
        {activeSubTab === 'insumos' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Material</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Stock Actual</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Mínimo</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Estado</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Valorización</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {insumosReport.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest"
                  >
                    No hay materiales para mostrar
                  </td>
                </tr>
              ) : (
                insumosReport.map(item => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 text-sm uppercase">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase">
                        {item.internalCode || 'S-SKU'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-sm font-black ${
                          item.isLow ? 'text-red-600' : 'text-slate-700'
                        }`}
                      >
                        {item.stock} {item.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-400">
                      {item.minStock}
                    </td>
                    <td className="px-6 py-4">
                      {item.isLow ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-[10px] font-black uppercase">
                          <AlertTriangle size={12} /> Stock Bajo
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase">
                          Óptimo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-700 text-xs">
                      {formatCurrency(item.stock * item.cost)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {activeSubTab === 'preparados' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Servicios</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Disp. Teórica</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Material Limitante</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {preparadosReport.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-slate-400 text-xs font-black uppercase tracking-widest"
                  >
                    No hay platos o servicios para mostrar
                  </td>
                </tr>
              ) : (
                preparadosReport.map(item => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 text-sm uppercase">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">
                        {item.category}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`text-lg font-black ${
                          item.isCritical ? 'text-orange-600' : 'text-brand-600'
                        }`}
                      >
                        {item.canMake}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 ml-1 uppercase">
                        Platos
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Package size={14} className="text-slate-300" />
                        <span className="text-xs font-bold">
                          {item.limitingIngredient}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {item.canMake <= 0 ? (
                        <span className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-[10px] font-black uppercase">
                          Agotado
                        </span>
                      ) : item.isCritical ? (
                        <span className="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-600 text-[10px] font-black uppercase">
                          Por Agotarse
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase">
                          Disponible
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {activeSubTab === 'directa' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Producto</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Stock Disponible</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Ventas (Hoy)</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {directaReport.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-slate-400 text-xs font-black uppercase tracking-widest"
                  >
                    No hay productos para mostrar
                  </td>
                </tr>
              ) : (
                directaReport.map(item => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 text-sm uppercase">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">
                        {item.category}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`text-lg font-black ${
                          item.isOut
                            ? 'text-red-600'
                            : item.isLow
                            ? 'text-orange-600'
                            : 'text-slate-700'
                        }`}
                      >
                        {item.stock}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 ml-1 uppercase">
                        Unid.
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-emerald-600">
                        <ArrowUp size={14} />
                        <span className="text-sm font-black">{item.sales}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {item.isOut ? (
                        <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-600 text-[10px] font-black uppercase tracking-widest">
                          Agotado
                        </span>
                      ) : item.isLow ? (
                        <span className="px-2.5 py-1 rounded-lg bg-orange-100 text-orange-600 text-[10px] font-black uppercase tracking-widest">
                          Crítico
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest">
                          En Stock
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center gap-3 bg-brand-50 p-4 rounded-2xl border border-brand-100 print:hidden">
        <Info size={20} className="text-brand-600 shrink-0" />
        <p className="text-xs text-brand-800 font-medium italic">
          * Los reportes de disponibilidad técnica calculan cuánto puedes vender basándose en el stock físico actual de tus materiales en almacén.
        </p>
      </div>
    </div>
  );
};
