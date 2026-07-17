import React, { useState, useMemo } from 'react';
import { Task, Drawing, Modeler } from '../types';
import { isWeekend, getHolidayName, formatDateKey, parseDate } from '../utils/colombiaCalendar';
import { Calendar as CalendarIcon, Info } from 'lucide-react';

interface TimelineViewProps {
  tasks: Task[];
  drawings: Drawing[];
  modelers: Modeler[];
  isDarkMode?: boolean;
  onUpdateActivity: (id: string, type: 'task' | 'drawing', field: string, value: any) => void;
  onReorder?: (modelerId: string | null, items: { id: string, type: 'task' | 'drawing' }[]) => void;
  onUpdateBlockDates?: (blockActivities: { id: string; type: 'task' | 'drawing' }[], newDate: string, draggedId: string, newModelerId: string) => void;
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
  manualStart: string | null;
  isParallel: boolean;
  parallelWithId: string | null;
};

export default function TimelineView({ tasks, drawings, modelers, isDarkMode = false, onUpdateActivity, onUpdateBlockDates }: TimelineViewProps) {
  const [colorMode, setColorMode] = useState<'activity' | 'category'>('activity');
  const [draggedItem, setDraggedItem] = useState<{ id: string, type: 'task' | 'drawing' } | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ colId: string, dateStr: string } | null>(null);

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
      manualStart: t.manualStart || null,
      isParallel: !!t.isParallel,
      parallelWithId: t.parallelWithTaskId || null
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
      manualStart: d.manualStart || null,
      isParallel: !!d.isParallel,
      parallelWithId: d.parallelWithDrawingId || null
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

  // 2. Generate Calendar Grid Dates (Y-Axis)
  const calendarGridDays = useMemo(() => {
    const allDates = allActivities.map(a => a.scheduledStart).filter(Boolean) as string[];
    let startDate: Date;
    let endDate: Date;

    if (allDates.length > 0) {
      const minDateStr = allDates.reduce((min, cur) => cur < min ? cur : min);
      const maxDateStr = allDates.reduce((max, cur) => cur > max ? cur : max);
      startDate = parseDate(minDateStr);
      endDate = parseDate(maxDateStr);
    } else {
      startDate = new Date();
      endDate = new Date();
    }

    startDate.setDate(startDate.getDate() - 2); // 2 days padding
    endDate.setDate(endDate.getDate() + 7); // 7 days padding

    const days: Date[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (!isWeekend(d) && !getHolidayName(d)) {
        days.push(new Date(d));
      }
    }
    return days;
  }, [allActivities]);

  // Block Identification Logic
  const getBlockMembers = (startId: string) => {
    const parentOf: Record<string, string> = {};
    const childrenOf: Record<string, string[]> = {};

    allActivities.forEach(act => {
      if (act.isParallel && act.parallelWithId) {
        parentOf[act.id] = act.parallelWithId;
        if (!childrenOf[act.parallelWithId]) childrenOf[act.parallelWithId] = [];
        childrenOf[act.parallelWithId].push(act.id);
      }
    });

    let rootId = startId;
    while (parentOf[rootId]) {
      rootId = parentOf[rootId];
    }

    const block = new Set<string>();
    const queue = [rootId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      block.add(current);
      if (childrenOf[current]) {
        queue.push(...childrenOf[current]);
      }
    }
    return Array.from(block);
  };

  // Drag & Drop
  const handleDragStart = (e: React.DragEvent, activityId: string, activityType: string) => {
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      setDraggedItem({ id: activityId, type: activityType as 'task' | 'drawing' });
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverCell(null);
  };

  const handleDropToCell = (e: React.DragEvent, colId: string, dateStr: string) => {
    e.preventDefault();
    if (!draggedItem || !onUpdateBlockDates) {
      handleDragEnd();
      return;
    }

    const blockMembers = getBlockMembers(draggedItem.id);
    const blockActivities = allActivities.filter(a => blockMembers.includes(a.id)).map(a => ({ id: a.id, type: a.type }));

    onUpdateBlockDates(blockActivities, dateStr, draggedItem.id, colId);
    handleDragEnd();
  };

  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const renderCard = (act: UnifiedActivity) => {
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
    const parentCode = act.parallelWithId ? allActivities.find(a => a.id === act.parallelWithId)?.code : null;

    return (
      <div 
        key={act.id}
        draggable
        onDragStart={(e) => handleDragStart(e, act.id, act.type)}
        onDragEnd={handleDragEnd}
        className={`p-2.5 rounded-lg border shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all bg-white dark:bg-[#20242a] mb-2 last:mb-0 ${borderColor} ${isDraggingThis ? 'opacity-40 scale-95 border-dashed z-50' : 'opacity-100 scale-100 z-10'}`}
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

        {/* Botón Paralelo e Indicador (Dropdown) */}
        <div className="flex items-center gap-1 mt-2">
           <select
             value={act.isParallel ? (act.parallelWithId || 'yes') : 'no'}
             onClick={e => e.stopPropagation()}
             onChange={(e) => {
               const val = e.target.value;
               if (val === 'no') {
                 onUpdateActivity(act.id, act.type, 'isParallel', false);
                 if (act.type === 'task') onUpdateActivity(act.id, act.type, 'parallelWithTaskId', null);
                 else onUpdateActivity(act.id, act.type, 'parallelWithDrawingId', null);
               } else {
                 onUpdateActivity(act.id, act.type, 'isParallel', true);
                 if (val !== 'yes') {
                   if (act.type === 'task') onUpdateActivity(act.id, act.type, 'parallelWithTaskId', val);
                   else onUpdateActivity(act.id, act.type, 'parallelWithDrawingId', val);
                 }
               }
             }}
             className={`pl-1.5 pr-5 py-0.5 rounded text-[10px] font-bold transition shadow-sm border appearance-none cursor-pointer focus:outline-none ${
               act.isParallel 
                 ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600' 
                 : (isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-300 border-slate-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200')
             }`}
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='${act.isParallel ? '%23ffffff' : '%2394a3b8'}'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: 'right 2px center', backgroundSize: '12px' }}
             title="Seleccionar paralelismo"
           >
             <option value="no">No</option>
             {act.isParallel && !act.parallelWithId && <option value="yes">Sí</option>}
             <optgroup label="Paralela con:">
                {allActivities
                  .filter(a => a.assigneeId === act.assigneeId && a.id !== act.id && a.type === act.type)
                  .map(a => (
                     <option key={a.id} value={a.id}>[{a.code}] {a.name.substring(0, 15)}...</option>
                  ))
                }
             </optgroup>
           </select>
        </div>
        
        <div className={`flex justify-between items-end mt-2 pt-2 border-t ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
          <div className="flex items-center gap-1">
             <span className="text-[9px] text-slate-400 uppercase font-bold">Inicio</span>
             {act.manualStart && <span className="text-[8px]" title="Fecha manual (candado)">🔒</span>}
          </div>
          <span className={`text-[10px] font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
             {act.durationDays} d
          </span>
        </div>
      </div>
    );
  };

  const unscheduled = allActivities.filter(a => !a.scheduledStart);

  return (
    <div className={`flex flex-col h-full border rounded-2xl shadow-xl overflow-hidden ${isDarkMode ? 'bg-[#0F1115] border-white/10' : 'bg-white border-slate-200'}`}>
      {/* Header */}
      <div className={`p-4 border-b flex flex-col sm:flex-row justify-between items-center gap-4 ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'}`}>
        <div>
          <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Cuadrícula de Programación (Planner)</h2>
          <p className="text-xs text-slate-500">Arrastra actividades a la intersección de Día x Persona. Las tareas paralelas se mueven en bloque.</p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Color por:</span>
          <div className={`flex rounded-lg p-1 border ${isDarkMode ? 'bg-[#16191D] border-white/10' : 'bg-slate-200/50 border-slate-300'}`}>
            <button onClick={() => setColorMode('activity')} className={`px-3 py-1 rounded-md transition-colors ${colorMode === 'activity' ? (isDarkMode ? 'bg-white/10 text-white shadow' : 'bg-white text-slate-800 shadow-sm') : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}>Actividad</button>
            <button onClick={() => setColorMode('category')} className={`px-3 py-1 rounded-md transition-colors ${colorMode === 'category' ? (isDarkMode ? 'bg-white/10 text-white shadow' : 'bg-white text-slate-800 shadow-sm') : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}>Categoría</button>
          </div>
        </div>
      </div>

      {/* Inbox (Unscheduled) */}
      <div className={`p-3 border-b overflow-x-auto whitespace-nowrap flex gap-3 min-h-[90px] items-center ${isDarkMode ? 'bg-[#16191D] border-white/10' : 'bg-slate-100 border-slate-200'}`}>
        <div className="flex-shrink-0 flex items-center gap-2 mr-2">
          <div className={`p-1.5 rounded-md ${isDarkMode ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-600'}`}><Info size={14} /></div>
          <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Bandeja<br/>(Sin Programar)</span>
        </div>
        {unscheduled.length === 0 && <span className={`text-xs italic ml-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Todas las actividades están programadas.</span>}
        {unscheduled.map(act => (
           <div key={act.id} className="inline-block w-56 whitespace-normal align-top">
             {renderCard(act)}
           </div>
        ))}
      </div>

      {/* Grid Matrix */}
      <div className="flex-1 overflow-auto bg-slate-50/30 dark:bg-[#0A0A0C]">
        <div className="min-w-max">
          {/* Grid Header (Sticky) */}
          <div className="flex sticky top-0 z-20 border-b shadow-sm">
            {/* Corner Cell */}
            <div className={`w-32 flex-shrink-0 p-3 border-r font-bold text-xs uppercase tracking-wider flex items-center justify-center ${isDarkMode ? 'bg-[#16191D] border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
              Fecha / Día
            </div>
            {/* Modeler Columns */}
            {columns.map(col => (
              <div key={col.id} className={`w-72 flex-shrink-0 p-3 border-r font-bold text-sm flex items-center gap-2 ${isDarkMode ? 'bg-[#16191D] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
                <span className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: col.color }} />
                <span className="truncate">{col.name}</span>
              </div>
            ))}
          </div>

          {/* Grid Body */}
          <div className="flex flex-col">
            {calendarGridDays.map(day => {
              const dateStr = formatDateKey(day);

              return (
                <div key={dateStr} className={`flex border-b transition-colors hover:bg-slate-100/50 dark:hover:bg-white/[0.02] ${isDarkMode ? 'bg-transparent' : 'bg-white'} ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                  {/* Y-Axis Label */}
                  <div className={`w-32 flex-shrink-0 p-3 border-r flex flex-col items-center justify-center text-center ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                    <span className={`text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {day.getDate()} {monthNames[day.getMonth()]}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider text-slate-400`}>
                      {dayNames[day.getDay()]}
                    </span>
                  </div>

                  {/* Modeler Cells */}
                  {columns.map(col => {
                    const isDragOver = dragOverCell?.colId === col.id && dragOverCell?.dateStr === dateStr;
                    const cellActivities = allActivities.filter(a => a.scheduledStart === dateStr && a.assigneeId === col.id);

                    return (
                      <div 
                        key={col.id}
                        onDragOver={(e) => { e.preventDefault(); setDragOverCell({ colId: col.id, dateStr }); }}
                        onDrop={(e) => handleDropToCell(e, col.id, dateStr)}
                        onDragLeave={() => setDragOverCell(null)}
                        className={`w-72 flex-shrink-0 p-2 border-r min-h-[80px] transition-all relative ${
                          isDarkMode ? 'border-white/5' : 'border-slate-100'
                        } ${isDragOver ? (isDarkMode ? 'bg-sky-900/30 ring-2 ring-inset ring-sky-500' : 'bg-sky-50 ring-2 ring-inset ring-sky-400') : ''}`}
                      >
                         {isDragOver && (
                           <div className="absolute inset-0 flex items-center justify-center opacity-50 z-0 pointer-events-none">
                              <span className="text-sky-500 font-bold text-xs uppercase tracking-widest bg-white/80 dark:bg-black/80 px-2 py-1 rounded">Soltar Aquí</span>
                           </div>
                         )}
                         <div className="relative z-10 flex flex-col gap-2">
                           {cellActivities.map(act => renderCard(act))}
                         </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
