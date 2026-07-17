import React, { useState, useMemo } from 'react';
import { Task, Drawing, Modeler } from '../types';
import { isWeekend, getHolidayName, COLOMBIAN_HOLIDAYS, formatDateKey } from '../utils/colombiaCalendar';
import { ChevronLeft, ChevronRight, Link as LinkIcon, Unlink } from 'lucide-react';

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
  manualStart: string | null;
  isParallel: boolean;
};

// --- Mini Referencia de Calendario ---
function MiniCalendarRef({ isDarkMode }: { isDarkMode: boolean }) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 6, 1)); // Julio 2026

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); 
  const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays: (Date | null)[] = [];
  for (let i = 0; i < adjustedStartDay; i++) calendarDays.push(null);
  for (let d = 1; d <= totalDaysInMonth; d++) calendarDays.push(new Date(year, month, d));

  return (
    <div className={`w-64 flex-shrink-0 border-r flex flex-col ${isDarkMode ? 'border-white/10 bg-[#0F1115]' : 'border-slate-200 bg-white'}`}>
      <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'border-white/10' : 'border-slate-100'}`}>
        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className={`p-1.5 rounded transition ${isDarkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100 text-slate-800'}`}><ChevronLeft size={16} /></button>
        <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
          {monthNames[month]} {year}
        </span>
        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className={`p-1.5 rounded transition ${isDarkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100 text-slate-800'}`}><ChevronRight size={16} /></button>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        <div className={`grid grid-cols-7 gap-1 text-center font-bold text-[10px] mb-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          <div>L</div><div>M</div><div>X</div><div>J</div><div>V</div>
          <div className="text-rose-400">S</div><div className="text-rose-400">D</div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="aspect-square" />;
            const isWknd = isWeekend(day);
            const hol = getHolidayName(day);
            const isNonWorking = isWknd || hol;
            return (
              <div 
                key={idx} 
                title={hol || ''}
                className={`aspect-square flex items-center justify-center rounded text-[10px] font-bold ${
                  isNonWorking 
                    ? (isDarkMode ? 'bg-rose-500/10 text-rose-400/50' : 'bg-rose-50 text-rose-300')
                    : (isDarkMode ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-700')
                }`}
              >
                {day.getDate()}
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 space-y-3">
           <h4 className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Días no laborables</h4>
           <div className="space-y-2">
             {calendarDays.filter(d => d && getHolidayName(d)).map((d, i) => (
               <div key={i} className="flex gap-2 text-[10px]">
                 <span className={`px-1.5 py-0.5 rounded font-bold whitespace-nowrap h-fit ${isDarkMode ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-600'}`}>{d!.getDate()} {monthNames[month].substring(0,3)}</span>
                 <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>{getHolidayName(d!)}</span>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}

export default function TimelineView({ tasks, drawings, modelers, isDarkMode = false, onUpdateActivity, onReorder }: TimelineViewProps) {
  const [colorMode, setColorMode] = useState<'activity' | 'category'>('activity');
  
  // Drag and Drop State
  const [draggedItem, setDraggedItem] = useState<{ id: string, type: 'task' | 'drawing', sourceCol: string } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ colId: string, index: number } | null>(null);

  const activeModelers = modelers.filter(m => m.active);
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
      activationTimestamp: t.activationTimestamp || 0,
      manualStart: t.manualStart || null,
      isParallel: !!t.isParallel
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
      activationTimestamp: d.activationTimestamp || 0,
      manualStart: d.manualStart || null,
      isParallel: !!d.isParallel
    }));

    return [...t, ...d];
  }, [tasks, drawings]);

  const categoryColors = useMemo(() => {
    const uniqueCats = Array.from(new Set(allActivities.map(a => a.categoryOrSeries)));
    const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#2dd4bf', '#38bdf8', '#818cf8', '#a78bfa', '#e879f9', '#f472b6'];
    const map: Record<string, string> = {};
    uniqueCats.forEach((c, i) => { map[c] = colors[i % colors.length]; });
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

    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => {
        // Orden ESTRICTO por prioridad para que el drag & drop no rebote
        return (a.activationTimestamp || 0) - (b.activationTimestamp || 0);
      });
    });

    return grouped;
  }, [allActivities, columns]);

  // --- Drag & Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, activityId: string, activityType: string, sourceModelerId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('activityId', activityId);
    e.dataTransfer.setData('activityType', activityType);
    
    setTimeout(() => {
      setDraggedItem({ id: activityId, type: activityType as any, sourceCol: sourceModelerId });
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverTarget(null);
  };

  const handleDragOverCard = (e: React.DragEvent, colId: string, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const isBottomHalf = (e.clientY - rect.top) > (rect.height / 2);
    
    setDragOverTarget({ colId, index: isBottomHalf ? index + 1 : index });
  };

  const handleDragOverColumn = (e: React.DragEvent, colId: string, length: number) => {
    e.preventDefault();
    if (dragOverTarget?.colId !== colId || dragOverTarget?.index !== length) {
      setDragOverTarget({ colId, index: length });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem || !dragOverTarget) {
      handleDragEnd();
      return;
    }

    const { id: activityId, type: activityType, sourceCol: sourceModelerId } = draggedItem;
    const { colId: targetModelerId, index: dropIndex } = dragOverTarget;

    const sourceList = activitiesByModeler[sourceModelerId] || [];
    const targetList = [...(activitiesByModeler[targetModelerId] || [])];
    
    const itemIndex = sourceList.findIndex(a => a.id === activityId);
    if (itemIndex === -1) {
       handleDragEnd();
       return;
    }

    // --- IDENTIFICAR EL BLOQUE (Leader + Paralelas) ---
    let startIndex = itemIndex;
    // Buscar hacia atrás al líder del bloque (el primero que no sea paralelo)
    while (startIndex > 0 && sourceList[startIndex].isParallel) {
       startIndex--;
    }
    
    let endIndex = itemIndex;
    // Buscar hacia adelante todas las paralelas que le siguen
    while (endIndex + 1 < sourceList.length && sourceList[endIndex + 1].isParallel) {
       endIndex++;
    }

    // Extraer el bloque
    let blockToMove: UnifiedActivity[];
    
    if (sourceModelerId === targetModelerId) {
      // Movimiento en la misma columna
      // Validar si realmente cambia de lugar
      if (dropIndex >= startIndex && dropIndex <= endIndex + 1) {
         handleDragEnd();
         return; // Se soltó dentro del mismo bloque, no hacer nada
      }
      
      blockToMove = targetList.splice(startIndex, endIndex - startIndex + 1);
      
      // Ajustar el índice de inserción
      let insertIndex = dropIndex;
      if (dropIndex > endIndex) {
         insertIndex = dropIndex - blockToMove.length;
      }
      targetList.splice(insertIndex, 0, ...blockToMove);
      
    } else {
      // Movimiento a otra columna
      blockToMove = sourceList.slice(startIndex, endIndex + 1);
      
      // Actualizar assigneeId de todo el bloque
      blockToMove.forEach(act => {
         onUpdateActivity(act.id, act.type, 'assigneeId', targetModelerId === 'unassigned' ? null : targetModelerId);
      });
      
      targetList.splice(dropIndex, 0, ...blockToMove);
    }

    // Guardar nuevo orden
    if (targetModelerId !== 'unassigned') {
      const newOrder = targetList.map(a => ({ id: a.id, type: a.type }));
      onReorder(targetModelerId, newOrder);
    }
    
    handleDragEnd();
  };

  return (
    <div className={`flex flex-col h-full border rounded-2xl shadow-xl overflow-hidden ${isDarkMode ? 'bg-[#0F1115] border-white/10' : 'bg-white border-slate-200'}`}>
      <div className={`p-4 border-b flex flex-col sm:flex-row justify-between items-center gap-4 ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'}`}>
        <div>
          <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Línea de Tiempo (Swimlanes)</h2>
          <p className="text-xs text-slate-500">Arrastra y suelta las actividades para cambiar responsables o reordenar prioridades.</p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Color por:</span>
          <div className={`flex rounded-lg p-1 border ${isDarkMode ? 'bg-[#16191D] border-white/10' : 'bg-slate-200/50 border-slate-300'}`}>
            <button
              onClick={() => setColorMode('activity')}
              className={`px-3 py-1 rounded-md transition-colors ${colorMode === 'activity' ? (isDarkMode ? 'bg-white/10 text-white shadow' : 'bg-white text-slate-800 shadow-sm') : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}
            >
              Actividad
            </button>
            <button
              onClick={() => setColorMode('category')}
              className={`px-3 py-1 rounded-md transition-colors ${colorMode === 'category' ? (isDarkMode ? 'bg-white/10 text-white shadow' : 'bg-white text-slate-800 shadow-sm') : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}
            >
              Categoría
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: MINI CALENDAR REFERENCE */}
        <MiniCalendarRef isDarkMode={isDarkMode} />

        {/* RIGHT PANEL: SWIMLANES */}
        <div className={`flex-1 overflow-x-auto overflow-y-hidden p-4 ${isDarkMode ? 'bg-[#0A0A0C]' : 'bg-slate-50/50'}`}>
          <div className="flex h-full gap-4 min-w-max items-start">
            {columns.map(col => (
              <div key={col.id} className={`w-80 flex flex-col max-h-full rounded-xl border shadow-sm ${isDarkMode ? 'bg-[#16191D] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className={`p-3 border-b flex items-center justify-between ${isDarkMode ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'}`}>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: col.color }} />
                    <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{col.name}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                    {activitiesByModeler[col.id]?.length || 0}
                  </span>
                </div>

                <div 
                  className="flex-1 overflow-y-auto p-3 relative"
                  onDragOver={(e) => handleDragOverColumn(e, col.id, activitiesByModeler[col.id]?.length || 0)}
                  onDrop={handleDrop}
                >
                  {activitiesByModeler[col.id]?.map((act, index) => {
                    const isTask = act.type === 'task';
                    let borderColor = isDarkMode ? 'border-white/10' : 'border-slate-200';
                    let badgeColor = '';

                    if (colorMode === 'activity') {
                       if (isTask) {
                          borderColor = isDarkMode ? 'border-sky-500/30' : 'border-sky-300';
                          badgeColor = isDarkMode ? 'bg-sky-500/20 text-sky-400' : 'bg-sky-100 text-sky-700';
                       } else {
                          borderColor = isDarkMode ? 'border-emerald-500/30' : 'border-emerald-300';
                          badgeColor = isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700';
                       }
                    } else {
                       borderColor = `border-[${categoryColors[act.categoryOrSeries]}]`; 
                       badgeColor = `text-white`;
                    }

                    const isDraggingThis = draggedItem?.id === act.id;
                    
                    // Identificar si pertenece a un bloque paralelo
                    const isBlockLeader = !act.isParallel && (activitiesByModeler[col.id][index + 1]?.isParallel);
                    const isBlockFollower = act.isParallel;
                    const isEndOfBlock = isBlockFollower && (!activitiesByModeler[col.id][index + 1]?.isParallel);

                    return (
                      <React.Fragment key={act.id}>
                        {dragOverTarget?.colId === col.id && dragOverTarget.index === index && !isDraggingThis && (
                          <div className="h-1.5 bg-sky-500 rounded-full w-full my-1.5 shadow-sm transition-all relative z-10" />
                        )}
                        
                        <div 
                          draggable
                          onDragStart={(e) => handleDragStart(e, act.id, act.type, col.id)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOverCard(e, col.id, index)}
                          onDrop={handleDrop}
                          className={`p-3 rounded-lg border shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all relative bg-white dark:bg-[#20242a] ${borderColor} ${isDraggingThis ? 'opacity-40 scale-95 border-dashed z-50' : 'opacity-100 scale-100 z-10'}
                            ${isBlockFollower ? 'mt-0 rounded-t-none border-t-0' : 'mt-2'}
                            ${isBlockLeader ? 'rounded-b-none border-b-0 pb-4' : ''}
                          `}
                          style={colorMode === 'category' ? { borderLeftColor: categoryColors[act.categoryOrSeries], borderLeftWidth: '4px' } : { borderLeftWidth: '4px' }}
                        >
                          {/* Botón de Paralelo */}
                          <div className="absolute right-2 top-2 z-20">
                             <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateActivity(act.id, act.type, 'isParallel', !act.isParallel);
                                }}
                                className={`text-[9px] flex items-center gap-1 px-1.5 py-0.5 rounded transition font-bold border ${
                                  act.isParallel 
                                    ? (isDarkMode ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/30' : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100') 
                                    : (isDarkMode ? 'bg-white/5 text-slate-500 border-white/5 hover:text-slate-300' : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600')
                                }`}
                                title={act.isParallel ? 'Se ejecuta simultáneamente con la anterior. Clic para separar.' : 'Clic para anclar a la actividad anterior y ejecutar en paralelo.'}
                             >
                                {act.isParallel ? <LinkIcon size={10} /> : <Unlink size={10} />}
                                {act.isParallel ? 'Paralela' : 'Secuencial'}
                             </button>
                          </div>

                          <div className="flex justify-between items-start mb-1 pr-20">
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
                          
                          <h4 className={`text-xs font-bold leading-tight mb-2 pr-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            {act.name}
                          </h4>
                          
                          <div className={`flex justify-between items-end mt-2 pt-2 border-t ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                            <div className="flex flex-col">
                               <div className="flex items-center gap-1">
                                 <span className="text-[9px] text-slate-400 uppercase font-bold">Inicio</span>
                                 {act.manualStart && <span className="text-[8px]" title="Fecha manual (candado)">🔒</span>}
                               </div>
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
                          
                          {/* Visual connection line if part of a block */}
                          {isBlockLeader && (
                             <div className={`absolute bottom-0 left-6 w-0.5 h-4 translate-y-full z-0 ${isDarkMode ? 'bg-indigo-500/50' : 'bg-indigo-300'}`} />
                          )}
                          {(isBlockFollower && !isEndOfBlock) && (
                             <div className={`absolute bottom-0 left-6 w-0.5 h-4 translate-y-full z-0 ${isDarkMode ? 'bg-indigo-500/50' : 'bg-indigo-300'}`} />
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })}
                  
                  {dragOverTarget?.colId === col.id && dragOverTarget.index === activitiesByModeler[col.id]?.length && (
                    <div className="h-1.5 bg-sky-500 rounded-full w-full mt-2 shadow-sm transition-all relative z-10" />
                  )}

                  {(!activitiesByModeler[col.id] || activitiesByModeler[col.id].length === 0) && !dragOverTarget && (
                    <div className={`h-24 border-2 border-dashed rounded-xl flex items-center justify-center text-xs font-bold mt-2 ${isDarkMode ? 'border-white/10 text-slate-600' : 'border-slate-300 text-slate-400'}`}>
                      Arrastra aquí
                    </div>
                  )}
                  <div className="h-20 w-full bg-transparent" onDragOver={(e) => handleDragOverColumn(e, col.id, activitiesByModeler[col.id]?.length || 0)} onDrop={handleDrop} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
