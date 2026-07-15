import React, { useState, useRef, useEffect } from 'react';
import { Task, Modeler, Drawing } from '../types';
import {
  parseDate,
  formatDateKey,
  isWeekend,
  getHolidayName,
} from '../utils/colombiaCalendar';
import { ChevronLeft, ChevronRight, Calendar, Info, ShieldAlert, Check, X, Lock, Unlock } from 'lucide-react';

interface DrawingDatePickerProps {
  currentDate: string | null;
  onChange: (date: string | null) => void;
  modelerId: string | null;
  modelers: Modeler[];
  tasks: Task[];
  drawings: Drawing[];
  drawingId: string;
  projectStartDate: string;
  isDarkMode?: boolean;
}

export default function DrawingDatePicker({
  currentDate,
  onChange,
  modelerId,
  modelers,
  tasks,
  drawings,
  drawingId,
  projectStartDate,
  isDarkMode = false,
}: DrawingDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Start calendar view at selected date, or project start date, or today
  const initialDate = currentDate 
    ? parseDate(currentDate) 
    : (projectStartDate ? parseDate(projectStartDate) : new Date());
     
  const [viewDate, setViewDate] = useState<Date>(initialDate);
  const [allowOverlap, setAllowOverlap] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const activeModeler = modelers.find(m => m.id === modelerId);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Calendar logic (Starts on Monday)
  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon...
  const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (Date | null)[] = [];
  for (let i = 0; i < adjustedStartDay; i++) {
    days.push(null);
  }
  for (let d = 1; d <= totalDaysInMonth; d++) {
    days.push(new Date(year, month, d));
  }

  // Get commitment for a date
  const getCommitment = (dateStr: string) => {
    if (!modelerId) return null;

    // 1. Check checklist tasks
    const matchedTask = tasks.find(t => 
      t.assigneeId === modelerId &&
      t.scheduledStart &&
      t.scheduledEnd &&
      dateStr >= t.scheduledStart &&
      dateStr <= t.scheduledEnd
    );
    if (matchedTask) {
      return { type: 'Entregable', name: matchedTask.name };
    }

    // 2. Check other drawings
    const matchedDrawing = drawings.find(d => {
      if (d.id === drawingId) return false;
      const otherModelerId = d.taskId 
        ? tasks.find(t => t.id === d.taskId)?.assigneeId 
        : d.assigneeId;
      return otherModelerId === modelerId && d.deliveryDate === dateStr;
    });
    if (matchedDrawing) {
      return { type: 'Plano', name: matchedDrawing.name };
    }

    return null;
  };

  const formattedSelectedDate = currentDate || '';

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer w-[120px] ${
          currentDate
            ? isDarkMode
              ? 'bg-[#16191D] border-amber-500/30 text-white hover:border-amber-500/50'
              : 'bg-white border-amber-500/40 text-slate-800 hover:border-amber-500/60 shadow-sm'
            : isDarkMode
              ? 'bg-[#16191D]/40 border-white/5 text-slate-500 hover:border-white/10'
              : 'bg-slate-50 border-slate-200 text-slate-450 hover:bg-slate-100 hover:text-slate-700 shadow-sm'
        }`}
      >
        <span className="truncate">
          {currentDate ? currentDate.split('-').reverse().join('/') : 'Sin fecha'}
        </span>
        <Calendar size={13} className={currentDate ? "text-amber-500 shrink-0" : "text-slate-500 shrink-0"} />
      </button>

      {/* Popover Calendar */}
      {isOpen && (
        <div className={`absolute right-0 mt-2 z-50 w-72 border rounded-2xl p-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.3)] animate-in fade-in slide-in-from-top-1 duration-150 ${
          isDarkMode
            ? 'bg-[#13161A] border-white/15 shadow-black/80 text-white'
            : 'bg-white border-slate-200 shadow-slate-200/50 text-slate-800'
        }`}>
          
          {/* Header navigation */}
          <div className={`flex items-center justify-between border-b pb-2.5 mb-2.5 ${
            isDarkMode ? 'border-white/5' : 'border-slate-100'
          }`}>
            <button
              type="button"
              onClick={handlePrevMonth}
              className={`p-1 rounded-lg transition ${
                isDarkMode 
                  ? 'hover:bg-white/5 text-slate-400 hover:text-white' 
                  : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
              }`}
            >
              <ChevronLeft size={16} />
            </button>
            <span className={`text-xs font-bold uppercase tracking-wider ${
              isDarkMode ? 'text-white' : 'text-slate-800'
            }`}>
              {monthNames[month]} {year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className={`p-1 rounded-lg transition ${
                isDarkMode 
                  ? 'hover:bg-white/5 text-slate-400 hover:text-white' 
                  : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
              }`}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Modeler banner */}
          <div className={`mb-2 px-2 py-1.5 border rounded-lg text-[10px] flex items-center gap-1.5 justify-between ${
            isDarkMode 
              ? 'bg-[#16191D] border-white/5 text-slate-400' 
              : 'bg-slate-50 border-slate-200 text-slate-650'
          }`}>
            <span className="flex items-center gap-1">
              <span 
                className="w-2.5 h-2.5 rounded-full inline-block shrink-0 border border-black/10" 
                style={{ backgroundColor: activeModeler?.color || '#555' }}
              />
              <span className={`font-semibold truncate max-w-[130px] ${
                isDarkMode ? 'text-slate-200' : 'text-slate-750'
              }`}>
                {activeModeler ? activeModeler.name.replace(/^(Ing\.|Arq\.|Tec\.)\s*/, '') : 'Sin modelador'}
              </span>
            </span>
            <span className={`text-[9px] italic ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Disponibilidad</span>
          </div>

          {/* Weekdays header */}
          <div className={`grid grid-cols-7 gap-0.5 text-center font-bold text-[9px] uppercase tracking-wider mb-1.5 ${
            isDarkMode ? 'text-slate-500' : 'text-slate-400'
          }`}>
            <div>Lu</div>
            <div>Ma</div>
            <div>Mi</div>
            <div>Ju</div>
            <div>Vi</div>
            <div className={isDarkMode ? 'text-rose-400/80' : 'text-rose-500/85'}>Sa</div>
            <div className={isDarkMode ? 'text-rose-400/80' : 'text-rose-500/85'}>Do</div>
          </div>

          {/* Grid of days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="w-8 h-8" />;
              }

              const dateStr = formatDateKey(day);
              const isWknd = isWeekend(day);
              const holidayName = getHolidayName(day);
              const commitment = getCommitment(dateStr);
              const isSelected = dateStr === formattedSelectedDate;

              // Determine classes and block status
              let classes = "w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all relative ";
              let isBlocked = false;
              let tooltipText = "";

              if (isSelected) {
                classes += "bg-amber-500 text-black shadow-lg shadow-amber-500/20 ";
              } else if (isWknd || holidayName) {
                isBlocked = true;
                classes += isDarkMode 
                  ? "bg-rose-500/5 text-rose-400 border border-rose-500/10 cursor-not-allowed " 
                  : "bg-rose-500/5 text-rose-600 border border-rose-500/10 cursor-not-allowed ";
                tooltipText = holidayName || "Fin de semana";
              } else if (commitment) {
                tooltipText = `Comprometido: ${commitment.name} (${commitment.type})`;
                if (!allowOverlap) {
                  isBlocked = true;
                  classes += isDarkMode 
                    ? "bg-amber-500/10 text-amber-500/75 border border-amber-500/20 cursor-not-allowed " 
                    : "bg-amber-500/10 text-amber-600 border border-amber-500/20 cursor-not-allowed ";
                } else {
                  classes += isDarkMode 
                    ? "bg-amber-500/20 text-amber-300 border border-dashed border-amber-500/40 hover:bg-amber-500/30 cursor-pointer " 
                    : "bg-amber-500/15 text-amber-700 border border-dashed border-amber-500/35 hover:bg-amber-500/25 cursor-pointer ";
                }
              } else {
                classes += isDarkMode 
                  ? "text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer " 
                  : "text-slate-750 hover:bg-slate-100 hover:text-slate-900 cursor-pointer ";
              }

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={isBlocked}
                  onClick={() => {
                    onChange(dateStr);
                    setIsOpen(false);
                  }}
                  className={classes}
                  title={tooltipText || undefined}
                >
                  <span>{day.getDate()}</span>
                  {commitment && (
                    <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-amber-500" />
                  )}
                  {holidayName && (
                    <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-rose-500" />
                  )}
                  {commitment && !allowOverlap && (
                    <span className="absolute top-0.5 right-0.5 text-amber-500/50">
                      <Lock size={6} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer controls */}
          <div className={`border-t mt-3 pt-2.5 space-y-2 text-[10px] ${
            isDarkMode ? 'border-white/5' : 'border-slate-100'
          }`}>
            {/* Legend indicators */}
            <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] ${
              isDarkMode ? 'text-slate-500' : 'text-slate-400'
            }`}>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Festivos/Wknd
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Comprometido
              </span>
            </div>

            {/* Overlap Toggle */}
            {modelerId && (
              <label className={`flex items-center justify-between p-1.5 border rounded-lg cursor-pointer select-none transition ${
                isDarkMode 
                  ? 'bg-[#16191D] border-white/5 hover:bg-[#1A1E24]' 
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}>
                <span className={`flex items-center gap-1 font-medium ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-650'
                }`}>
                  {allowOverlap ? <Unlock size={11} className="text-amber-500" /> : <Lock size={11} className="text-slate-500" />}
                  Permitir sobrelapamiento
                </span>
                <input
                  type="checkbox"
                  checked={allowOverlap}
                  onChange={(e) => setAllowOverlap(e.target.checked)}
                  className={`rounded text-amber-500 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer ${
                    isDarkMode ? 'border-white/10 bg-[#0F1115]' : 'border-slate-300 bg-white'
                  }`}
                />
              </label>
            )}

            {/* Actions (Clear & Cancel) */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
                className={`font-bold flex items-center gap-1 px-1.5 py-1 rounded-md transition ${
                  isDarkMode 
                    ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/5' 
                    : 'text-rose-600 hover:text-rose-700 hover:bg-rose-50'
                }`}
              >
                <X size={10} /> Quitar Fecha
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={`font-bold px-2 py-1 rounded-md transition ${
                  isDarkMode 
                    ? 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10' 
                    : 'text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                Cerrar
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
