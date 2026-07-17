import React, { useState, useMemo } from 'react';
import { Task, Drawing, Modeler } from '../types';
import { formatDateKey } from '../utils/colombiaCalendar';

interface TimelineViewProps {
  tasks: Task[];
  drawings: Drawing[];
  modelers: Modeler[];
  isDarkMode?: boolean;
  onUpdateActivity: (id: string, type: 'task' | 'drawing', field: string, value: any) => void;
  onReorder: (modelerId: string | null, items: { id: string, type: 'task' | 'drawing' }[]) => void;
}

type UnifiedActivity = {
  id: string;
  type: 'task' | 'drawing';
  name: string;
  code: string;
  assigneeId: string | null;
  durationDays: number;
  categoryOrSeries: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  activationTimestamp: number;
};

export default function TimelineView({ tasks, drawings, modelers, isDarkMode = false, onUpdateActivity, onReorder }: TimelineViewProps) {
  const [colorMode, setColorMode] = useState<'activity' | 'category'>('activity');

  const activeModelers = modelers.filter(m => m.active);
  // Agregamos una columna para los no asignados o si no hay activos
  const columns = [...activeModelers, { id: 'unassigned', name: 'Sin Asignar', color: '#94a3b8', active: true }];

  // 1. Unify Tasks and Drawings
  const allActivities: UnifiedActivity[] = useMemo(() => {
    const t = tasks.filter(x => Number(x.durationDays) > 0 || x.manualStart || x.isParallel).map(t => ({
      id: t.id,
      type: 'task' as const,
      name: t.name,
      code: t.code,
      assigneeId: t.assigneeId || 'unassigned',
      durationDays: Number(t.durationDays) || 0,
      categoryOrSeries: t.category,
      scheduledStart: t.scheduledStart,
      scheduledEnd: t.scheduledEnd,
      activationTimestamp: t.activationTimestamp || 0
    }));

    const d = drawings.filter(x => (x.durationDays !== undefined && Number(x.durationDays) > 0) || x.manualStart || x.isParallel).map(d => ({
      id: d.id,
      type: 'drawing' as const,
      name: d.name,
      code: d.code,
      assigneeId: d.assigneeId || 'unassigned',
      durationDays: d.durationDays !== undefined ? Number(d.durationDays) : 3,
      categoryOrSeries: d.series,
      scheduledStart: d.scheduledStart,
      scheduledEnd: d.scheduledEnd,
      activationTimestamp: d.activationTimestamp || 0
    }));

    return [...t, ...d];
  }, [tasks, drawings]);

  // Generar colores únicos para categorías si es necesario
  const categoryColors = useMemo(() => {
    const uniqueCats = Array.from(new Set(allActivities.map(a => a.categoryOrSeries)));
    const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#2dd4bf', '#38bdf8', '#818cf8', '#a78bfa', '#e879f9', '#f472b6'];
    const map: Record<string, string> = {};
    uniqueCats.forEach((c, i) => {
      map[c] = colors[i % colors.length];
    });
    return map;
  }, [allActivities]);

  // 2. Agrupar por modelador y ordenar
  const activitiesByModeler = useMemo(() => {
    const grouped: Record<string, UnifiedActivity[]> = {};
    columns.forEach(c => grouped[c.id] = []);
    
    allActivities.forEach(act => {
      if (grouped[act.assigneeId!]) {
        grouped[act.assigneeId!].push(act);
      } else {
        grouped['unassigned'].push(act);
      }
    });

    // Ordenar cronológicamente
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => {
        if (a.scheduledStart && b.scheduledStart) return a.scheduledStart.localeCompare(b.scheduledStart);
        if (a.scheduledStart) return -1;
        if (b.scheduledStart) return 1;
        return a.activationTimestamp - b.activationTimestamp;
      });
    });

    return grouped;
  }, [allActivities, columns]);

  // Funciones de Drag & Drop
  const handleDragStart = (e: React.DragEvent, activityId: string, activityType: string, sourceModelerId: string) => {
    e.dataTransfer.setData('activityId', activityId);
    e.dataTransfer.setData('activityType', activityType);
    e.dataTransfer.setData('sourceModelerId', sourceModelerId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necesario para permitir soltar
  };

  const handleDrop = (e: React.DragEvent, targetModelerId: string, dropIndex: number) => {
    e.preventDefault();
    const activityId = e.dataTransfer.getData('activityId');
    const activityType = e.dataTransfer.getData('activityType') as 'task' | 'drawing';
    const sourceModelerId = e.dataTransfer.getData('sourceModelerId');

    if (!activityId) return;

    // Obtener la lista actual de la columna destino
    const targetList = [...(activitiesByModeler[targetModelerId] || [])];
    
    // Si viene de otra columna, primero cambiamos el assigneeId
    if (sourceModelerId !== targetModelerId) {
       onUpdateActivity(activityId, activityType, 'assigneeId', targetModelerId === 'unassigned' ? null : targetModelerId);
       // Lo insertamos temporalmente para recalcular el orden
       const itemToMove = activitiesByModeler[sourceModelerId].find(a => a.id === activityId);
       if (itemToMove) {
          targetList.splice(dropIndex, 0, itemToMove);
       }
    } else {
       // Reordenar en la misma columna
       const currentIndex = targetList.findIndex(a => a.id === activityId);
       if (currentIndex === dropIndex) return; // No cambió de lugar
       
       const [removed] = targetList.splice(currentIndex, 1);
       // Ajustar el índice destino si el elemento se movió de arriba hacia abajo
       const insertIndex = dropIndex > currentIndex ? dropIndex - 1 : dropIndex;
       targetList.splice(insertIndex, 0, removed);
    }

    // Generar la nueva lista de IDs ordenados
    const newOrder = targetList.map(a => ({ id: a.id, type: a.type }));
    
    // Solo llamar a onReorder si el targetModeler no es unassigned, 
    // porque unassigned no tiene prioridad de calendario
    if (targetModelerId !== 'unassigned') {
      onReorder(targetModelerId, newOrder);
    }
  };

  return (
    <div className={`flex flex-col h-full border rounded-2xl shadow-xl overflow-hidden ${
      isDarkMode ? 'bg-[#0F1115] border-white/10' : 'bg-white border-slate-200'
    }`}>
      {/* Header / Controles */}
      <div className={`p-4 border-b flex flex-col sm:flex-row justify-between items-center gap-4 ${
        isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'
      }`}>
        <div>
          <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
            Línea de Tiempo (Swimlanes)
          </h2>
          <p className="text-xs text-slate-500">
            Arrastra y suelta las actividades para cambiar responsables o reordenar prioridades.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Color por:</span>
          <div className={`flex rounded-lg p-1 border ${isDarkMode ? 'bg-[#16191D] border-white/10' : 'bg-slate-200/50 border-slate-300'}`}>
            <button
              onClick={() => setColorMode('activity')}
              className={`px-3 py-1 rounded-md transition-colors ${
                colorMode === 'activity' 
                  ? (isDarkMode ? 'bg-white/10 text-white shadow' : 'bg-white text-slate-800 shadow-sm') 
                  : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')
              }`}
            >
              Actividad
            </button>
            <button
              onClick={() => setColorMode('category')}
              className={`px-3 py-1 rounded-md transition-colors ${
                colorMode === 'category' 
                  ? (isDarkMode ? 'bg-white/10 text-white shadow' : 'bg-white text-slate-800 shadow-sm') 
                  : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')
              }`}
            >
              Categoría
            </button>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="flex h-full gap-4 min-w-max items-start">
          {columns.map(col => (
            <div 
              key={col.id} 
              className={`w-72 flex flex-col max-h-full rounded-xl border ${
                isDarkMode ? 'bg-[#16191D] border-white/5' : 'bg-slate-50 border-slate-200'
              }`}
            >
              {/* Column Header */}
              <div className={`p-3 border-b flex items-center justify-between ${
                isDarkMode ? 'border-white/5' : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{col.name}</span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-200 text-slate-600'
                }`}>
                  {activitiesByModeler[col.id]?.length || 0}
                </span>
              </div>

              {/* DropZone for Empty Column or Top */}
              <div 
                className="flex-1 overflow-y-auto p-2 space-y-2 relative"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id, activitiesByModeler[col.id]?.length || 0)}
              >
                {activitiesByModeler[col.id]?.map((act, index) => {
                  const isTask = act.type === 'task';
                  let bgColor = isDarkMode ? 'bg-slate-800' : 'bg-white';
                  let borderColor = isDarkMode ? 'border-white/10' : 'border-slate-200';
                  let badgeColor = '';
                  let textColor = isDarkMode ? 'text-slate-300' : 'text-slate-700';

                  if (colorMode === 'activity') {
                     if (isTask) {
                        borderColor = isDarkMode ? 'border-sky-500/30' : 'border-sky-300';
                        badgeColor = isDarkMode ? 'bg-sky-500/20 text-sky-400' : 'bg-sky-100 text-sky-700';
                     } else {
                        borderColor = isDarkMode ? 'border-emerald-500/30' : 'border-emerald-300';
                        badgeColor = isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700';
                     }
                  } else {
                     const catColor = categoryColors[act.categoryOrSeries];
                     borderColor = `border-[${catColor}]`; // We'll use inline style for border
                     badgeColor = `text-white`;
                  }

                  return (
                    <div 
                      key={act.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, act.id, act.type, col.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => {
                        e.stopPropagation(); // Prevenir el drop del contenedor padre
                        handleDrop(e, col.id, index);
                      }}
                      className={`p-3 rounded-lg border shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow relative bg-white dark:bg-[#20242a] ${borderColor}`}
                      style={colorMode === 'category' ? { borderLeftColor: categoryColors[act.categoryOrSeries], borderLeftWidth: '4px' } : { borderLeftWidth: '4px' }}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-[10px] font-bold tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          [{act.code}]
                        </span>
                        {colorMode === 'activity' ? (
                           <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded ${badgeColor}`}>
                              {isTask ? 'Modelado' : 'Planimetría'}
                           </span>
                        ) : (
                           <span className="text-[8px] uppercase font-bold px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: categoryColors[act.categoryOrSeries] }}>
                              {act.categoryOrSeries.substring(0, 15)}
                           </span>
                        )}
                      </div>
                      <h4 className={`text-xs font-bold leading-tight mb-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        {act.name}
                      </h4>
                      <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                        <div className="flex flex-col">
                           <span className="text-[9px] text-slate-400 uppercase font-bold">Inicio</span>
                           <span className={`text-[10px] font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                              {act.scheduledStart ? act.scheduledStart.split('-').reverse().join('/') : 'Sin Programar'}
                           </span>
                        </div>
                        <div className="flex flex-col items-end">
                           <span className="text-[9px] text-slate-400 uppercase font-bold">Duración</span>
                           <span className={`text-[10px] font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                              {act.durationDays} d
                           </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {(!activitiesByModeler[col.id] || activitiesByModeler[col.id].length === 0) && (
                  <div className={`h-24 border-2 border-dashed rounded-xl flex items-center justify-center text-xs font-bold ${
                    isDarkMode ? 'border-white/10 text-slate-600' : 'border-slate-300 text-slate-400'
                  }`}>
                    Arrastra aquí
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
