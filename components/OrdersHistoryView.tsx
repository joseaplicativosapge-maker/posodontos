
import React, { useMemo, useState } from 'react';
import { Order, OrderStatus, OrderType } from '../types';
import { Clock, Search, Filter, ArrowRight, Calendar, CalendarRange } from 'lucide-react';

interface OrdersHistoryViewProps {
  orders: Order[];
}

export const OrdersHistoryView: React.FC<OrdersHistoryViewProps> = ({ orders }) => {
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const filteredAndSortedOrders = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return orders
      .filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= start && orderDate <= end;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, startDate, endDate]);

  const getDuration = (start: Date, end?: Date) => {
    if (!end) return '-';
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    return `${diffMins} min`;
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.COMPLETED: return 'bg-green-100 text-green-800';
      case OrderStatus.READY: return 'bg-emerald-100 text-emerald-800';
      case OrderStatus.PREPARING: return 'bg-yellow-100 text-yellow-800';
      case OrderStatus.PENDING: return 'bg-slate-100 text-slate-800';
      case OrderStatus.CANCELLED: return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val) + " COP";
  };

  return (
    <div className="p-4 md:p-8 h-full bg-slate-50 overflow-y-auto pb-24 md:pb-8 animate-in fade-in duration-500">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Historial de Producción</h2>
          <p className="text-slate-500 font-medium">Monitorea tiempos de cocina y estado de pedidos realizados.</p>
        </div>

        <div className="bg-white p-2 rounded-[1.5rem] shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-2 items-center w-full md:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-50 px-4 py-2 rounded-xl">
            <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-50 px-4 py-2 rounded-xl">
                <Calendar size={16} className="text-brand-600" />
                <span className="text-[10px] font-black uppercase text-slate-400">Desde:</span>
                <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
                className="border-none bg-transparent text-sm font-bold focus:ring-0 outline-none w-full sm:w-auto text-slate-700" 
                />
            </div>
          </div>
          <div className="hidden sm:block text-slate-300 px-1">
            <ArrowRight size={14} />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-50 px-4 py-2 rounded-xl">
            <CalendarRange size={16} className="text-brand-600" />
            <span className="text-[10px] font-black uppercase text-slate-400">Hasta:</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              className="border-none bg-transparent text-sm font-bold focus:ring-0 outline-none w-full sm:w-auto text-slate-700" 
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Referencia / Silla</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Tipo</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Horarios</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] text-center">T. Producción</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Estado</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] text-right">Total Neto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAndSortedOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center opacity-30 grayscale">
                      <Clock size={48} className="mb-4" />
                      <p className="font-black uppercase text-sm tracking-widest">No hay pedidos en este rango</p>
                      <p className="text-xs font-bold mt-1 text-slate-500 uppercase">Intenta ajustar los filtros de fecha arriba</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedOrders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      {order.tableId 
                        ? (
                          <div className="flex flex-col">
                            <span className="font-black text-slate-800 text-sm uppercase">Silla {order.tableId.replace(/\D/g, '')}</span>
                            <span className="text-[10px] font-bold text-brand-600">ID #{order.id.slice(0,5)}</span>
                          </div>
                        ) 
                        : (
                          <div className="flex flex-col">
                            <span className="font-black text-slate-800 text-sm uppercase">Pedido Directo</span>
                            <span className="text-[10px] font-bold text-slate-400">ID #{order.id.slice(0,6)}</span>
                          </div>
                        )
                      }
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${
                        order.type === 'DELIVERY' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {order.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-[10px] font-bold">
                        <span className="text-slate-500 flex items-center gap-1.5 uppercase">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                          Inició: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {order.readyAt && (
                          <span className="text-emerald-600 flex items-center gap-1.5 uppercase">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                            Listo: {new Date(order.readyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {order.readyAt ? (
                        <div className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-200">
                          <Clock size={12} className="mr-2 text-brand-500" />
                          <span className="font-black text-xs tabular-nums">{getDuration(order.createdAt, order.readyAt)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-[10px] font-black italic">--:--</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${getStatusColor(order.status)} shadow-sm`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-black text-sm text-slate-900 tabular-nums">{formatCOP(order.total)}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Saldo Cobrado</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
