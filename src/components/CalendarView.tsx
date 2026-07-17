import React, { useState, useMemo } from 'react';
import { Task, Drawing, Modeler } from '../types';
import {
  parseDate,
  formatDateKey,
  isWeekend,
  getHolidayName,
  COLOMBIAN_HOLIDAYS,
} from '../utils/colombiaCalendar';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info, Filter, X } from 'lucide-react';

interface CalendarViewProps {
  tasks: Task[];
  drawings?: Drawing[];
  modelers: Modeler[];
  isDarkMode?: boolean;
  onUpdateActivity?: (id: string, type: 'task' | 'drawing', field: string, value: any) => void;
}

export default function CalendarView({ tasks, drawings = [], modelers, isDarkMode = false, onUpdateActivity }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 6, 14)); // Start at July 2026

  // Filters
  const [filterModeler, setFilterModeler] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL'); // 'ALL' | 'TASK' | 'DRAWING'
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // Edit Panel State
  const [editingActivity, setEditingActivity] = useState<{ id: string, type: 'task' | 'drawing' } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); 
  const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays: (Date | null)[] = [];
  for (let i = 0; i < adjustedStartDay; i++) calendarDays.push(null);
  for (let d = 1; d <= totalDaysInMonth; d++) calendarDays.push(new Date(year, month, d));

  const holidaysInMonth: { dateStr: string; name: string }[] = [];
  if (COLOMBIAN_HOLIDAYS[year]) {
    Object.entries(COLOMBIAN_HOLIDAYS[year]).forEach(([dateStr, name]) => {
      const holidayDate = parseDate(dateStr);
      if (holidayDate.getMonth() === month) holidaysInMonth.push({ dateStr, name });
    });
  }

  const getModelerColor = (id: string | null) => {
    const modeler = modelers.find(m => m.id === id);
    return modeler ? modeler.color : '#94a3b8'; // Slate-400
  };

  const getModelerName = (id: string | null) => {
    const modeler = modelers.find(m => m.id === id);
    return modeler ? modeler.name.split(' ')[0] : 'S/A';
  };

  // Combine Tasks and Drawings
  const allActivities = useMemo(() => {
    const t = tasks.filter(x => Number(x.durationDays) > 0 || x.manualStart || x.isParallel).map(x => ({
      id: x.id, type: 'task' as const, name: x.name, code: x.code,
      assigneeId: x.assigneeId, durationDays: Number(x.durationDays) || 0,
      category: x.category, scheduledStart: x.scheduledStart, scheduledEnd: x.scheduledEnd,
      manualStart: x.manualStart
    }));
    const d = drawings.filter(x => (x.durationDays !== undefined && Number(x.durationDays) > 0) || x.manualStart || x.isParallel).map(x => ({
      id: x.id, type: 'drawing' as const, name: x.name, code: x.code,
      assigneeId: x.assigneeId, durationDays: Number(x.durationDays) || 0,
      category: x.series, scheduledStart: x.scheduledStart, scheduledEnd: x.scheduledEnd,
      manualStart: x.manualStart
    }));
    return [...t, ...d];
  }, [tasks, drawings]);

  const uniqueCategories = useMemo(() => Array.from(new Set(allActivities.map(a => a.category))), [allActivities]);

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string, type: string) => {
    e.dataTransfer.setData('activityId', id);
    e.dataTransfer.setData('activityType', type);
  };

  const handleDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('activityId');
    const type = e.dataTransfer.getData('activityType') as 'task' | 'drawing';
    if (id && onUpdateActivity) {
      onUpdateActivity(id, type, 'manualStart', dateStr);
    }
  };

  // Encontrar la actividad en edición
  const editingActivityData = useMemo(() => {
    if (!editingActivity) return null;
    return allActivities.find(a => a.id === editingActivity.id && a.type === editingActivity.type);
  }, [editingActivity, allActivities]);

  return (
    <div className={`transition-colors duration-200 border p-6 rounded-2xl shadow-xl relative ${
      isDarkMode ? 'bg-[#0F1115] border-white/10 shadow-black/50' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      {/* Header & Navigation */}
      <div className={`flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border-b pb-5 mb-6 ${
        isDarkMode ? 'border-white/10' : 'border-slate-100'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border ${isDarkMode ? 'bg-white/5 text-slate-300 border-white/5' : 'bg-slate-100 text-slate-800 border-slate-200'}`}>
            <CalendarIcon size={22} />
          </div>
          <div>
            <h2 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              Calendario Unificado
              <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 border rounded font-bold uppercase tracking-wider ${
                isDarkMode ? 'bg-white/5 text-slate-300 border-white/10' : 'bg-slate-100 text-slate-800 border-slate-200'
              }`}>
                🇨🇴 Colombiano
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Arrastra actividades a nuevos días para forzar su fecha de inicio.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Filters */}
          <div className="flex items-center gap-2 text-xs">
            <Filter size={14} className={isDarkMode ? 'text-slate-400' : 'text-slate-500'} />
            <select
              value={filterModeler}
              onChange={e => setFilterModeler(e.target.value)}
              className={`border rounded-lg px-2 py-1.5 focus:outline-none ${isDarkMode ? 'bg-[#16191D] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
            >
              <option value="ALL">Todos los Modeladores</option>
              {modelers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className={`border rounded-lg px-2 py-1.5 focus:outline-none ${isDarkMode ? 'bg-[#16191D] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
            >
              <option value="ALL">Tareas y Planos</option>
              <option value="TASK">Solo Modelado</option>
              <option value="DRAWING">Solo Planimetría</option>
            </select>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className={`border rounded-lg px-2 py-1.5 focus:outline-none max-w-[150px] truncate ${isDarkMode ? 'bg-[#16191D] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
            >
              <option value="ALL">Todas las Categorías</option>
              {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handlePrevMonth} className={`p-2 border rounded-lg transition ${isDarkMode ? 'border-white/10 bg-white/5 hover:bg-white/10 text-white' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-850 shadow-sm'}`}>
              <ChevronLeft size={18} />
            </button>
            <span className={`text-sm font-bold min-w-32 text-center border px-3 py-1.5 rounded-lg uppercase tracking-wider ${isDarkMode ? 'bg-[#16191D] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-850'}`}>
              {monthNames[month]} {year}
            </span>
            <button onClick={handleNextMonth} className={`p-2 border rounded-lg transition ${isDarkMode ? 'border-white/10 bg-white/5 hover:bg-white/10 text-white' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-850 shadow-sm'}`}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <div className={`xl:col-span-3 border rounded-2xl p-4 shadow-sm transition-colors ${
          isDarkMode ? 'bg-[#0A0A0C] border-white/10' : 'bg-[#FAFAFA] border-slate-200'
        }`}>
          {/* Weekdays header */}
          <div className={`grid grid-cols-7 gap-1 text-center font-bold text-xs uppercase tracking-wider mb-2 pb-2 border-b ${
            isDarkMode ? 'text-slate-500 border-white/10' : 'text-slate-400 border-slate-200'
          }`}>
            <div>Lun</div><div>Mar</div><div>Mie</div><div>Jue</div><div>Vie</div>
            <div className="text-rose-500/80">Sab</div><div className="text-rose-500/80">Dom</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className={`aspect-square rounded-lg border ${isDarkMode ? 'bg-white/[0.01] border-white/5' : 'bg-slate-100/50 border-slate-100'}`} />;
              }

              const dateStr = formatDateKey(day);
              const holidayName = getHolidayName(day);
              const isWknd = isWeekend(day);

              // Filter tasks for this day
              const dayActivities = allActivities.filter((a) => {
                if (isWknd || holidayName) return false;
                if (!a.scheduledStart || !a.scheduledEnd) return false;
                if (dateStr < a.scheduledStart || dateStr > a.scheduledEnd) return false;
                
                // Apply UI filters
                if (filterModeler !== 'ALL' && a.assigneeId !== filterModeler) return false;
                if (filterType !== 'ALL' && a.type.toUpperCase() !== filterType) return false;
                if (filterCategory !== 'ALL' && a.category !== filterCategory) return false;
                return true;
              });

              return (
                <div
                  key={dateStr}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => handleDrop(e, dateStr)}
                  className={`min-h-[120px] p-1.5 border rounded-xl flex flex-col transition-colors ${
                    isWknd
                      ? (isDarkMode ? 'bg-white/[0.02] border-white/5 text-slate-600' : 'bg-slate-50/50 border-slate-100 text-slate-400')
                      : holidayName
                      ? (isDarkMode ? 'bg-rose-950/15 border-rose-500/20 text-rose-300' : 'bg-rose-50/50 border-rose-200 text-rose-700')
                      : (isDarkMode ? 'bg-[#0F1115] border-white/10 text-slate-300 hover:border-white/25' : 'bg-white border-slate-200/80 text-slate-800 hover:border-slate-300 shadow-sm')
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                        day.getDate() === new Date().getDate() && day.getMonth() === new Date().getMonth() && day.getFullYear() === new Date().getFullYear()
                          ? (isDarkMode ? 'bg-white text-black shadow-lg font-extrabold' : 'bg-slate-950 text-white font-extrabold shadow-sm')
                          : holidayName
                          ? (isDarkMode ? 'bg-rose-950 text-rose-400 text-[10px] border border-rose-500/20' : 'bg-rose-100 text-rose-700 text-[10px] border border-rose-200')
                          : (isDarkMode ? 'text-white' : 'text-slate-700')
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {holidayName && <span className={`text-[8px] border font-bold px-1.5 py-0.5 rounded leading-tight max-w-[70%] truncate text-right ${isDarkMode ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-100 text-rose-700 border-rose-200'}`} title={holidayName}>🇨🇴 Festivo</span>}
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1">
                    {dayActivities.map((a) => (
                      <div
                        key={a.id}
                        draggable
                        onDragStart={e => handleDragStart(e, a.id, a.type)}
                        onClick={() => setEditingActivity({ id: a.id, type: a.type })}
                        className="text-[9px] font-medium py-0.5 px-1.5 rounded text-white leading-normal shadow-sm transition hover:brightness-110 cursor-pointer border border-white/20 hover:border-white relative group"
                        style={{ backgroundColor: getModelerColor(a.assigneeId) }}
                        title={`${a.name} (${getModelerName(a.assigneeId)})`}
                      >
                        <div className="flex justify-between items-center gap-1">
                           <span className="truncate mr-1 font-semibold flex-1">{a.name}</span>
                           {a.manualStart && (
                              <span className="text-[7px] bg-amber-500/80 px-0.5 rounded" title="Inicio manual forzado">🔒</span>
                           )}
                           <span className="text-[7px] bg-white/20 px-1 py-0.1 rounded font-bold text-white flex-shrink-0">
                             {getModelerName(a.assigneeId)}
                           </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {holidayName && <div className={`text-[8px] font-medium truncate mt-0.5 italic leading-none ${isDarkMode ? 'text-rose-400/80' : 'text-rose-600/80'}`}>{holidayName}</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Side Panel: Month Summary & Colombian Holidays */}
        <div className="xl:col-span-1 space-y-6">
          <div className={`border rounded-2xl p-5 shadow-sm transition-colors ${isDarkMode ? 'bg-[#16191D] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              🇨🇴 Festivos de este mes
            </h3>
            {holidaysInMonth.length > 0 ? (
              <ul className="space-y-2.5">
                {holidaysInMonth.map((hol) => {
                  const displayDay = parseDate(hol.dateStr).getDate();
                  return (
                    <li key={hol.dateStr} className="flex gap-2.5 text-xs text-slate-400">
                      <span className={`border px-2 py-0.5 rounded font-bold h-fit ${isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-100 text-rose-700 border-rose-200'}`}>Día {displayDay}</span>
                      <div className="flex-1">
                        <p className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{hol.name}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className={`flex items-center gap-2 text-xs p-3 rounded-xl border ${isDarkMode ? 'text-slate-500 bg-white/[0.02] border-white/5' : 'text-slate-400 bg-slate-50 border-slate-200'}`}>
                <Info size={14} /><span>No hay festivos este mes.</span>
              </div>
            )}
          </div>

          {/* Modelers Filter Panel */}
          <div className={`border rounded-2xl p-5 shadow-sm space-y-4 transition-colors ${isDarkMode ? 'bg-[#16191D] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Modeladores (Click para filtrar)</h3>
            <div className="space-y-2">
              <button
                onClick={() => setFilterModeler('ALL')}
                className={`w-full flex items-center justify-between text-xs p-2 rounded-xl border transition ${
                  filterModeler === 'ALL' 
                    ? (isDarkMode ? 'bg-white/10 border-white/20' : 'bg-slate-100 border-slate-300 shadow-inner')
                    : (isDarkMode ? 'bg-[#0F1115] border-white/5 hover:border-white/20' : 'bg-slate-50 border-slate-200 hover:border-slate-300')
                }`}
              >
                 <span className={`font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Todos</span>
              </button>
              {modelers.map((m) => (
                <button 
                  key={m.id} 
                  onClick={() => setFilterModeler(m.id)}
                  className={`w-full flex items-center justify-between text-xs p-2 rounded-xl border transition ${
                     filterModeler === m.id 
                       ? (isDarkMode ? 'bg-white/10 border-white/20 shadow-lg' : 'bg-slate-100 border-slate-400 shadow-inner')
                       : (isDarkMode ? 'bg-[#0F1115] border-white/5 hover:border-white/20' : 'bg-slate-50 border-slate-200 hover:border-slate-300')
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-sm flex-shrink-0" style={{ backgroundColor: m.color }} />
                    <span className={`font-semibold truncate max-w-44 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{m.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Edit Floating Modal */}
      {editingActivityData && onUpdateActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
           <div className={`w-[350px] p-6 rounded-2xl shadow-2xl relative ${
             isDarkMode ? 'bg-[#16191D] border border-white/10 text-white' : 'bg-white border border-slate-200 text-slate-800'
           }`}>
              <button 
                onClick={() => setEditingActivity(null)} 
                className="absolute top-4 right-4 p-1 rounded-md opacity-50 hover:opacity-100 hover:bg-slate-500/10 transition"
              >
                 <X size={16} />
              </button>
              <h3 className="font-bold mb-1 pr-6 leading-tight">{editingActivityData.name}</h3>
              <p className={`text-xs mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {editingActivityData.type === 'task' ? 'Tarea de Modelado' : 'Planimetría'} • [{editingActivityData.code}]
              </p>
              
              <div className="space-y-4">
                 <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                       Días de Duración
                    </label>
                    <input 
                      type="number" 
                      min="1" 
                      value={editingActivityData.durationDays}
                      onChange={(e) => onUpdateActivity(editingActivityData.id, editingActivityData.type, 'durationDays', Number(e.target.value) || 1)}
                      className={`w-full p-2 border rounded-lg focus:outline-none focus:border-amber-500 ${
                         isDarkMode ? 'bg-[#0F1115] border-white/10' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                 </div>
                 
                 <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                       Fecha de Inicio Manual
                    </label>
                    <div className="flex gap-2">
                       <input 
                         type="date" 
                         value={editingActivityData.manualStart || editingActivityData.scheduledStart || ''}
                         onChange={(e) => onUpdateActivity(editingActivityData.id, editingActivityData.type, 'manualStart', e.target.value || null)}
                         className={`flex-1 p-2 border rounded-lg focus:outline-none focus:border-amber-500 ${
                            isDarkMode ? 'bg-[#0F1115] border-white/10' : 'bg-slate-50 border-slate-200'
                         }`}
                       />
                       {editingActivityData.manualStart && (
                          <button 
                             onClick={() => onUpdateActivity(editingActivityData.id, editingActivityData.type, 'manualStart', null)}
                             className="px-3 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 font-bold text-xs transition"
                          >
                             Quitar
                          </button>
                       )}
                    </div>
                 </div>
              </div>

              <div className="mt-6 flex justify-end">
                 <button 
                    onClick={() => setEditingActivity(null)}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md transition-all active:scale-95"
                 >
                    Listo
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
