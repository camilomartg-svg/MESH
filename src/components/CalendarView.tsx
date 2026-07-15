import { useState } from 'react';
import { Task, Modeler } from '../types';
import {
  parseDate,
  formatDateKey,
  isWeekend,
  getHolidayName,
  COLOMBIAN_HOLIDAYS,
} from '../utils/colombiaCalendar';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from 'lucide-react';

interface CalendarViewProps {
  tasks: Task[];
  modelers: Modeler[];
}

export default function CalendarView({ tasks, modelers }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 6, 14)); // Start at July 2026

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  // Calculate days to display
  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday, 1 is Monday...
  // Convert standard JS getDay (0=Sun) to Spanish starting Monday (0=Mon, 1=Tue... 6=Sun)
  // Standard getDay: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays: (Date | null)[] = [];
  // Fill leading empty cells
  for (let i = 0; i < adjustedStartDay; i++) {
    calendarDays.push(null);
  }
  // Fill real month days
  for (let d = 1; d <= totalDaysInMonth; d++) {
    calendarDays.push(new Date(year, month, d));
  }

  // Find holidays in the current displayed month
  const holidaysInMonth: { dateStr: string; name: string }[] = [];
  if (COLOMBIAN_HOLIDAYS[year]) {
    Object.entries(COLOMBIAN_HOLIDAYS[year]).forEach(([dateStr, name]) => {
      const holidayDate = parseDate(dateStr);
      if (holidayDate.getMonth() === month) {
        holidaysInMonth.push({ dateStr, name });
      }
    });
  }

  // Find modeler's color mapping
  const getModelerColor = (id: string | null) => {
    const modeler = modelers.find(m => m.id === id);
    return modeler ? modeler.color : '#64748b'; // Slate-500
  };

  const getModelerName = (id: string | null) => {
    const modeler = modelers.find(m => m.id === id);
    return modeler ? modeler.name.split(' ')[0] : 'S/A';
  };

  return (
    <div className="bg-[#0F1115] rounded-2xl border border-white/10 p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl">
            <CalendarIcon size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Calendario de Modelado Revit
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-bold uppercase tracking-wider">
                🇨🇴 Calendario Colombiano
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Visualiza las fechas de entrega automáticas considerando fines de semana y festivos oficiales.
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={handlePrevMonth}
            className="p-2 border border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-lg transition"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-bold text-white min-w-32 text-center bg-[#16191D] border border-white/10 px-3 py-1.5 rounded-lg uppercase tracking-wider">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 border border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-lg transition"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-3 bg-[#0A0A0C] border border-white/10 rounded-2xl p-4 shadow-sm">
          {/* Weekdays header */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-500 uppercase tracking-wider mb-2 pb-2 border-b border-white/10">
            <div>Lun</div>
            <div>Mar</div>
            <div>Mie</div>
            <div>Jue</div>
            <div>Vie</div>
            <div className="text-rose-400/80">Sab</div>
            <div className="text-rose-400/80">Dom</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="aspect-square bg-white/[0.02] rounded-lg border border-white/5"
                  />
                );
              }

              const dateStr = formatDateKey(day);
              const holidayName = getHolidayName(day);
              const isWknd = isWeekend(day);

              // Find all tasks scheduled for this day
              const dayTasks = tasks.filter((t) => {
                if (!t.scheduledStart || !t.scheduledEnd) return false;
                return dateStr >= t.scheduledStart && dateStr <= t.scheduledEnd;
              });

              return (
                <div
                  key={dateStr}
                  className={`min-h-24 p-1.5 border rounded-xl flex flex-col justify-between transition ${
                    isWknd
                      ? 'bg-white/[0.02] border-white/5 text-slate-600'
                      : holidayName
                      ? 'bg-rose-950/15 border-rose-500/20 text-rose-300'
                      : 'bg-[#0F1115] border-white/10 text-slate-300 hover:border-white/25'
                  }`}
                >
                  {/* Top: Day Number and Holiday status */}
                  <div className="flex items-start justify-between">
                    <span
                      className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                        day.getDate() === new Date().getDate() &&
                        day.getMonth() === new Date().getMonth() &&
                        day.getFullYear() === new Date().getFullYear()
                          ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25 font-extrabold'
                          : holidayName
                          ? 'bg-rose-950 text-rose-400 text-[10px] border border-rose-500/20'
                          : 'text-white'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {holidayName && (
                      <span className="text-[8px] bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold px-1.5 py-0.5 rounded leading-tight max-w-[70%] truncate text-right" title={holidayName}>
                        🇨🇴 Festivo
                      </span>
                    )}
                  </div>

                  {/* Tasks scheduled on this day */}
                  <div className="mt-1 space-y-1 overflow-hidden">
                    {dayTasks.map((t) => (
                      <div
                        key={t.id}
                        className="text-[9px] font-medium py-0.5 px-1.5 rounded text-white truncate leading-normal shadow-sm transition hover:brightness-110 flex items-center justify-between"
                        style={{ backgroundColor: getModelerColor(t.assigneeId) }}
                        title={`${t.name} (${getModelerName(t.assigneeId)}) - Prioridad ${t.priority}`}
                      >
                        <span className="truncate mr-1 font-semibold">{t.name}</span>
                        <span className="text-[7px] bg-white/20 px-1 py-0.1 rounded font-bold">
                          {getModelerName(t.assigneeId)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Bottom details if holiday */}
                  {holidayName && (
                    <div className="text-[8px] text-rose-400/80 font-medium truncate mt-0.5 italic leading-none">
                      {holidayName}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Side Panel: Month Summary & Colombian Holidays */}
        <div className="space-y-6">
          {/* Holidays list in this month */}
          <div className="bg-[#16191D] border border-white/10 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-3">
              🇨🇴 Festivos de este mes
            </h3>
            {holidaysInMonth.length > 0 ? (
              <ul className="space-y-2.5">
                {holidaysInMonth.map((hol) => {
                  const d = parseDate(hol.dateStr);
                  const displayDay = d.getDate();
                  return (
                    <li key={hol.dateStr} className="flex gap-2.5 text-xs text-slate-400">
                      <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded font-bold h-fit">
                        Día {displayDay}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-200">{hol.name}</p>
                        <p className="text-[10px] text-slate-500">No laboral en Colombia</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                <Info size={14} />
                <span>No hay festivos registrados este mes en Colombia.</span>
              </div>
            )}
          </div>

          {/* Color Indicators Legend */}
          <div className="bg-[#16191D] border border-white/10 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Modeladores Activos</h3>
            <div className="space-y-2">
              {modelers.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-xs p-2 rounded-xl bg-[#0F1115] border border-white/5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full border border-white/10 shadow-sm flex-shrink-0" style={{ backgroundColor: m.color }} />
                    <span className="font-semibold text-slate-300 truncate max-w-44">{m.name}</span>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${m.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-slate-500 border border-white/10'}`}>
                    {m.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-slate-500 border-t border-white/5 pt-3">
              * El calendario asume que solo se puede ejecutar una tarea a la vez por modelador. Las tareas se calendarizan de forma continua según su prioridad.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
