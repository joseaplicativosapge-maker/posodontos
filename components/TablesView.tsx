import React, { useState, useMemo } from 'react';
import { Table, TableStatus } from '../types';
import { useBranch } from './BranchContext';
import { Users, CheckCircle, Clock, Lock, Plus, Save, X, Edit2, Ban, ShieldAlert, Power, Unlock, Armchair, Grid3X3, Link, Unlink, Check, Info } from 'lucide-react';
import { useNotification } from './NotificationContext';
import { dataService } from '../services/data.service';

interface TablesViewProps {
  tables: Table[];
  currentBranchId: string;
  onSelectTable: (table: Table, seatNumber?: number) => void;
  onAddTable: (table: Table) => void;
  onUpdateTable: (table: Table) => void;
  isRegisterOpen: boolean;
  onOpenRegisterRequest?: () => void;
}

export const TablesView: React.FC<TablesViewProps> = ({ tables, currentBranchId, onSelectTable, onAddTable, onUpdateTable, isRegisterOpen, onOpenRegisterRequest }) => {
  const { notify, confirm } = useNotification();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChairModalOpen, setIsChairModalOpen] = useState(false);
  const [selectedBar, setSelectedBar] = useState<Table | null>(null);
  const { refreshBranchData } = useBranch();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTableName, setNewTableName] = useState('');
  const [newTableSeats, setNewTableSeats] = useState(4);
  const [newIsBar, setNewIsBar] = useState(false);

  const [isMergeMode, setIsMergeMode] = useState(false);
  const [mergeSelection, setMergeSelection] = useState<string[]>([]);

  const activeTables = useMemo(() => 
    tables.filter(t => t.branchId === currentBranchId), 
    [tables, currentBranchId]
  );

  const isEmpty = activeTables.length === 0;

  const handleOpenModal = (table?: Table) => {
      if (table) { setEditingId(table.id); setNewTableName(table.name); setNewTableSeats(table.seats); setNewIsBar(table.isBar || false); }
      else { setEditingId(null); setNewTableName(''); setNewTableSeats(4); setNewIsBar(false); }
      setIsModalOpen(true);
  };

  const handleSaveTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
        const updatedTable = tables.find(t => t.id === editingId);
        if (updatedTable) onUpdateTable({ ...updatedTable, name: newTableName, seats: newTableSeats, isBar: newIsBar });
    } else {
        const newTable: Table = { 
            branchId: currentBranchId, 
            name: newTableName.toUpperCase(), 
            seats: newTableSeats, 
            status: TableStatus.AVAILABLE, 
            isBar: newIsBar, 
            occupiedSeats: [] 
        };
        onAddTable(newTable);
    }
    setIsModalOpen(false);
  };

  const toggleTableStatus = (table: Table) => {
    if (table.status === TableStatus.OCCUPIED || table.status === TableStatus.PENDING_PAYMENT) { notify("No se puede inhabilitar con pedidos activos", "error"); return; }
    onUpdateTable({ ...table, status: table.status === TableStatus.DEACTIVATED ? TableStatus.AVAILABLE : TableStatus.DEACTIVATED });
    notify("Estado de silla actualizado", "info");
  };

  const handleTableClick = (table: Table) => {
    if (isMergeMode) {
        if (table.status !== TableStatus.AVAILABLE || table.parentId) {
            notify("Solo puede unir sillas libres e independientes", "warning");
            return;
        }
        if (mergeSelection.includes(table.id)) {
            setMergeSelection(mergeSelection.filter(id => id !== table.id));
        } else {
            setMergeSelection([...mergeSelection, table.id]);
        }
        return;
    }

    if (table.status === TableStatus.DEACTIVATED) { notify("Esta silla se encuentra reservada", "warning"); return; }
    
    if (table.parentId) {
        const parent = tables.find(t => t.id === table.parentId);
        if (parent) onSelectTable(parent);
        return;
    }

    if (table.isBar) { setSelectedBar(table); setIsChairModalOpen(true); } else { onSelectTable(table); }
  };

  const handleConfirmMerge = async () => {
      if (mergeSelection.length < 2) {
          notify("Seleccione al menos 2 sillas para unir", "warning");
          return;
      }
      
      const parentId = mergeSelection[0];
      const childrenIds = mergeSelection.slice(1);
      
      const parentTable = tables.find(t => t.id === parentId);
      if (!parentTable) return;

      if (await confirm({
          title: 'Confirmar Unión de Sillas',
          message: `¿Desea unir estas ${mergeSelection.length} sillas? Se comportarán como una sola unidad para grupos grandes.`,
          type: 'info'
      })) {
          try {
              await dataService.mergeTables(parentId, childrenIds);
              setMergeSelection([]);
              setIsMergeMode(false);
              notify("Sillas unidas correctamente", "success");
              refreshBranchData();
          } catch (e) {
              notify("Error al sincronizar unión de sillas", "error");
          }
      }
  };

  const handleSplitTable = async (table: Table) => {
      if (!table.mergedWith || table.mergedWith.length === 0) return;
      
      if (table.status !== TableStatus.AVAILABLE) {
          notify("No se pueden separar sillas con comandas activas", "error");
          return;
      }

      if (await confirm({
          title: 'Separar Sillas',
          message: `¿Desea separar la agrupación de ${table.name}? Cada silla volverá a ser independiente.`,
          type: 'warning'
      })) {
          try {
              await dataService.splitTables(table.id);
              notify("Sillas separadas", "info");
              refreshBranchData();
          } catch (e) {
              notify("Error al separar sillas", "error");
          }
      }
  };

  if (!isRegisterOpen) {
    return (
        <div className="flex flex-col items-center justify-center h-full bg-slate-100 text-slate-500 w-full p-4">
            <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl text-center max-w-lg mx-auto border border-slate-200">
                <div className="bg-red-50 w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-10 text-red-600 ring-8 ring-red-50/50"><Lock size={56} strokeWidth={2.5} /></div>
                <h2 className="text-4xl font-black text-slate-800 mb-4 tracking-tighter">Salón Bloqueado</h2>
                <p className="max-w-xs mx-auto text-slate-500 font-bold text-lg leading-tight mb-12">Abra una caja para gestionar sillas y comandas.</p>
                <button onClick={onOpenRegisterRequest} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black py-6 rounded-[2.5rem] flex justify-center items-center uppercase tracking-widest text-sm shadow-2xl transition-all active:scale-95 gap-3"><Unlock size={24} /> Desbloquear Terminal</button>
            </div>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-slate-50 pb-24 md:pb-8 relative">
      <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-6">
        <div>
            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Plano Operativo</h2>
            <p className="text-slate-500 font-medium uppercase text-xs tracking-widest mt-1">Control visual del área de servicio.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
            {isMergeMode ? (
                <>
                    <button onClick={() => { setIsMergeMode(false); setMergeSelection([]); }} className="bg-white border border-slate-200 text-slate-500 px-6 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">Cancelar</button>
                    <button onClick={handleConfirmMerge} className="bg-emerald-600 text-white px-8 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-2 animate-pulse"><Check size={18}/> Confirmar Unión ({mergeSelection.length})</button>
                </>
            ) : (
                <>
                {/*
                    {!isEmpty && 
                        <button onClick={() => setIsMergeMode(true)} className="bg-white border border-slate-200 text-slate-700 px-6 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
                            <Link size={16}/> Unir Sillas
                        </button>
                    }
                */}
                    <button onClick={() => handleOpenModal()} className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center shadow-xl hover:bg-brand-600 transition-all active:scale-95"><Plus size={20} className="mr-2" /> Agregar Ubicación</button>
                </>
            )}
        </div>
      </div>

      {isMergeMode && (
          <div className="mb-6 bg-brand-50 p-4 rounded-2xl border border-brand-100 flex items-center gap-4 animate-in slide-in-from-top-2">
              <div className="bg-brand-600 p-2 rounded-xl text-white"><Info size={20}/></div>
              <p className="text-xs font-bold text-brand-900 uppercase tracking-wide">Modo de Unión Activo: Seleccione las sillas que desea agrupar para un solo servicio.</p>
          </div>
      )}

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="p-12 text-center max-w-md">
            <div className="bg-slate-100 w-32 h-32 rounded-full flex items-center justify-center mb-6 mx-auto">
                <Grid3X3 size={40} className="text-slate-300" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tighter">
              Sin Ubicaciones
            </h3>
            <p className="text-slate-500 font-medium text-sm mb-8 max-w-xs mx-auto">
              No existen sillas o lava cabezas configuradas en este salón
            </p>
            <button 
              onClick={() => handleOpenModal()} 
              className="w-full bg-slate-900 hover:bg-brand-600 text-white font-black py-5 rounded-[2rem] uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Crear Primera Ubicación
            </button>
          </div>
        </div>
      )}

      {!isEmpty && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {activeTables.map(table => {
            const isDeactivated = table.status === TableStatus.DEACTIVATED;
            const isSelectedForMerge = mergeSelection.includes(table.id);
            const hasChildren = table.mergedWith && table.mergedWith.length > 0;
            const isChild = !!table.parentId;

            let displaySeats = table.seats;
            if (hasChildren) {
                const children = activeTables.filter(t => table.mergedWith?.includes(t.id));
                displaySeats += children.reduce((sum, c) => sum + c.seats, 0);
            }

            return (
              <div key={table.id} className="relative group">
                  <button 
                    onClick={() => handleTableClick(table)} 
                    className={`h-48 w-full rounded-[2.5rem] p-6 flex flex-col justify-between shadow-sm transition-all transform 
                    ${!isDeactivated ? 'hover:scale-[1.02] cursor-pointer hover:shadow-xl' : 'opacity-60 grayscale'} 
                    ${isSelectedForMerge ? 'border-brand-500 ring-4 ring-brand-100 bg-brand-50' : 'bg-white border-2 border-slate-50'}
                    ${hasChildren ? 'ring-2 ring-emerald-500/20 border-emerald-100 shadow-md' : ''}
                    ${isChild ? 'border-dashed border-slate-300 opacity-80' : ''}
                    text-slate-800`}
                  >
                      <div className="flex justify-between items-start">
                          <div className="flex flex-col text-left">
                              <span className="font-black text-xl tracking-tighter uppercase flex items-center gap-2">
                                  {table.name}
                                  {hasChildren && <Link size={14} className="text-emerald-500" />}
                                  {isChild && <div className="w-2 h-2 rounded-full bg-slate-300"></div>}
                              </span>
                              <span className="text-[10px] font-black opacity-40 uppercase">
                                  {displaySeats} {table.isBar ? 'Sillas' : 'Pers.'}
                                  {hasChildren && <span className="ml-1 text-emerald-600">(TOTAL)</span>}
                              </span>
                          </div>
                          {isSelectedForMerge && <div className="bg-brand-600 text-white p-1 rounded-full"><Check size={12}/></div>}
                      </div>

                      <div className="flex items-center justify-center flex-1">
                          {isChild ? (
                              <div className="text-slate-300 flex flex-col items-center">
                                  <Link size={24} />
                                  <span className="text-[8px] font-black uppercase mt-1">Vinculada</span>
                              </div>
                          ) : table.isBar ? <Armchair size={28} className="text-slate-100" /> : <Users size={28} className="text-slate-100" />}
                      </div>

                      <div className="w-full text-center">
                          <span className={`inline-block px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] ${isDeactivated ? 'bg-slate-400' : table.status === TableStatus.OCCUPIED ? 'bg-red-500' : 'bg-emerald-500'} text-white shadow-sm`}>
                              {isDeactivated ? 'Inactiva' : table.status === TableStatus.OCCUPIED ? 'Ocupada' : 'Libre'}
                          </span>
                      </div>
                  </button>

                  <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      {hasChildren && table.status === TableStatus.AVAILABLE && (
                          <button onClick={(e) => { e.stopPropagation(); handleSplitTable(table); }} className="bg-red-50 text-red-600 p-2.5 rounded-2xl shadow-lg border border-red-100 hover:bg-red-100" title="Separar Sillas">
                              <Unlink size={14}/>
                          </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); toggleTableStatus(table); }} className={`p-2.5 rounded-2xl shadow-lg transition-all ${isDeactivated ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'}`}>
                          <Power size={14}/>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleOpenModal(table); }} className="bg-white text-slate-400 p-2.5 rounded-2xl shadow-lg hover:text-brand-600">
                          <Edit2 size={14} />
                      </button>
                  </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[1000] p-4">
            <div className="bg-white rounded-[3rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-brand-600 p-2 rounded-xl text-white shadow-lg"><Grid3X3 size={20}/></div>
                        <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">{editingId ? 'Configurar' : 'Alta Silla'}</h3>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800 p-2 bg-white rounded-xl shadow-sm"><X size={20} /></button>
                </div>
                <form onSubmit={handleSaveTable} className="p-8 space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Nombre Ubicación</label>
                        <input required className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black uppercase text-xs" value={newTableName} onChange={e => setNewTableName(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Nro Asientos / Sillas</label>
                        <input required type="number" className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black" value={newTableSeats} onChange={e => setNewTableSeats(Number(e.target.value))} />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                        <span className="text-[10px] font-black text-slate-500 uppercase">Es una silla especial?</span>
                        <button type="button" onClick={() => setNewIsBar(!newIsBar)} className={`w-12 h-6 rounded-full relative transition-all ${newIsBar ? 'bg-brand-600' : 'bg-slate-300'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${newIsBar ? 'left-7' : 'left-1'}`}></div>
                        </button>
                    </div>
                    <button type="submit" className="w-full bg-slate-900 text-white font-black py-6 rounded-[2.5rem] uppercase tracking-widest text-[10px] shadow-xl active:scale-95 transition-all">Guardar Ubicación</button>
                </form>
            </div>
        </div>
      )}

      {isChairModalOpen && selectedBar && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[1100] p-4">
              <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                  <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                      <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">{selectedBar.name} - Sillas</h3>
                      <button onClick={() => setIsChairModalOpen(false)} className="text-slate-400 hover:text-slate-800 p-2 bg-white rounded-xl shadow-sm"><X size={24} /></button>
                  </div>
                  <div className="p-10 grid grid-cols-4 sm:grid-cols-5 gap-4 max-h-[60vh] overflow-y-auto">
                      {Array.from({ length: selectedBar.seats }).map((_, idx) => {
                          const seatNum = idx + 1;
                          const isOccupied = selectedBar.occupiedSeats?.includes(seatNum);
                          return (
                              <button key={seatNum} onClick={() => { onSelectTable(selectedBar, seatNum); setIsChairModalOpen(false); }} className={`flex flex-col items-center justify-center p-4 rounded-[1.5rem] border-2 transition-all ${isOccupied ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' : 'bg-white border-slate-100 text-slate-400 hover:border-brand-600 hover:text-brand-600'}`}>
                                  <Armchair size={24} />
                                  <span className="text-[9px] font-black mt-2">SILLA {seatNum}</span>
                              </button>
                          );
                      })}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};