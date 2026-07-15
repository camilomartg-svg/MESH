import { Task, Modeler } from '../types';

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

export const COLOMBIAN_HOLIDAYS: { [year: number]: { [dateStr: string]: string } } = {
  2025: {
    '2025-01-01': 'Año Nuevo',
    '2025-01-13': 'Día de los Reyes Magos',
    '2025-03-24': 'Día de San José',
    '2025-04-17': 'Jueves Santo',
    '2025-04-18': 'Viernes Santo',
    '2025-05-01': 'Día del Trabajo',
    '2025-06-02': 'Día de la Ascensión del Señor',
    '2025-06-23': 'Corpus Christi',
    '2025-06-30': 'El Sagrado Corazón de Jesús',
    '2025-06-30-sp': 'San Pedro y San Pablo', // shared Monday
    '2025-07-20': 'Día de la Independencia',
    '2025-08-07': 'Batalla de Boyacá',
    '2025-08-18': 'La Asunción de la Virgen',
    '2025-10-13': 'Día de la Raza',
    '2025-11-03': 'Todos los Santos',
    '2025-11-17': 'Independencia de Cartagena',
    '2025-12-08': 'Día de la Inmaculada Concepción',
    '2025-12-25': 'Navidad',
  },
  2026: {
    '2026-01-01': 'Año Nuevo',
    '2026-01-12': 'Día de los Reyes Magos',
    '2026-03-23': 'Día de San José',
    '2026-04-02': 'Jueves Santo',
    '2026-04-03': 'Viernes Santo',
    '2026-05-01': 'Día del Trabajo',
    '2026-05-18': 'Día de la Ascensión del Señor',
    '2026-06-08': 'Corpus Christi',
    '2026-06-15': 'El Sagrado Corazón de Jesús',
    '2026-06-29': 'San Pedro y San Pablo',
    '2026-07-20': 'Día de la Independencia',
    '2026-08-07': 'Batalla de Boyacá',
    '2026-08-17': 'La Asunción de la Virgen',
    '2026-10-12': 'Día de la Raza',
    '2026-11-02': 'Todos los Santos',
    '2026-11-16': 'Independencia de Cartagena',
    '2026-12-08': 'Día de la Inmaculada Concepción',
    '2026-12-25': 'Navidad',
  },
  2027: {
    '2027-01-01': 'Año Nuevo',
    '2027-01-11': 'Día de los Reyes Magos',
    '2027-03-22': 'Día de San José',
    '2027-03-25': 'Jueves Santo',
    '2027-03-26': 'Viernes Santo',
    '2027-05-01': 'Día del Trabajo',
    '2027-05-10': 'Día de la Ascensión del Señor',
    '2027-05-31': 'Corpus Christi',
    '2027-06-07': 'El Sagrado Corazón de Jesús',
    '2027-06-28': 'San Pedro y San Pablo',
    '2027-07-20': 'Día de la Independencia',
    '2027-08-07': 'Batalla de Boyacá',
    '2027-08-16': 'La Asunción de la Virgen',
    '2027-10-18': 'Día de la Raza',
    '2027-11-01': 'Todos los Santos',
    '2027-11-15': 'Independencia de Cartagena',
    '2027-12-08': 'Día de la Inmaculada Concepción',
    '2027-12-25': 'Navidad',
  },
};

// Converts Date to YYYY-MM-DD local format
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

export function getHolidayName(date: Date): string | null {
  const year = date.getFullYear();
  const dateKey = formatDateKey(date);
  if (COLOMBIAN_HOLIDAYS[year] && COLOMBIAN_HOLIDAYS[year][dateKey]) {
    return COLOMBIAN_HOLIDAYS[year][dateKey];
  }
  // San Pedro y San Pablo custom handle for 2025
  if (year === 2025 && dateKey === '2025-06-30') {
    return 'Día del Sagrado Corazón / San Pedro y San Pablo';
  }
  return null;
}

export function isNonWorkingDay(date: Date): boolean {
  return isWeekend(date) || getHolidayName(date) !== null;
}

// Calculates the number of working days between two dates (inclusive)
// excluding weekends and holidays.
export function getWorkingDaysCount(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 0;
  if (startDateStr > endDateStr) return 0;

  let currentDate = parseDate(startDateStr);
  const endDate = parseDate(endDateStr);

  // Slide start date to first working day if needed
  while (isNonWorkingDay(currentDate) && currentDate < endDate) {
    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (currentDate > endDate || (currentDate.getTime() === endDate.getTime() && isNonWorkingDay(currentDate))) {
    return 0;
  }

  let count = 1;
  while (formatDateKey(currentDate) < formatDateKey(endDate)) {
    currentDate.setDate(currentDate.getDate() + 1);
    if (!isNonWorkingDay(currentDate)) {
      count++;
    }
  }
  return count;
}

// Add N working days to a start date, skipping weekends and holidays.
// If duration is 1, end date is the start date itself (if it's a working day).
// If duration is 0, end date is the start date itself.
export function addWorkingDays(startDateStr: string, durationDays: number): { start: string; end: string } {
  if (durationDays <= 0) {
    return { start: startDateStr, end: startDateStr };
  }

  let currentDate = parseDate(startDateStr);

  // If the initial start date is a holiday/weekend, slide it forward to the first working day
  while (isNonWorkingDay(currentDate)) {
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const actualStartStr = formatDateKey(currentDate);

  // We need to count durationDays working days starting from this day as the 1st working day.
  // So we increment (durationDays - 1) times, skipping weekends/holidays.
  let workingDaysRemaining = durationDays - 1;
  while (workingDaysRemaining > 0) {
    currentDate.setDate(currentDate.getDate() + 1);
    if (!isNonWorkingDay(currentDate)) {
      workingDaysRemaining--;
    }
  }

  return {
    start: actualStartStr,
    end: formatDateKey(currentDate),
  };
}

// Get the next working day after a given date
export function getNextWorkingDay(dateStr: string): string {
  const currentDate = parseDate(dateStr);
  currentDate.setDate(currentDate.getDate() + 1);
  while (isNonWorkingDay(currentDate)) {
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return formatDateKey(currentDate);
}

// Schedule all tasks based on priorities and active modelers.
// "solo se puede hacer una tarea a la vez" -> each active modeler acts as a sequential pipeline.
export function calculateSchedule(
  tasks: Task[],
  modelers: Modeler[],
  projectStartDate: string
): Task[] {
  const activeModelers = modelers.filter(m => m.active);
  if (activeModelers.length === 0) {
    // If no modelers are active, we can't schedule, or default schedule them on a single virtual modeler
    return tasks.map(t => ({
      ...t,
      scheduledStart: null,
      scheduledEnd: null,
      isDelayed: false,
    }));
  }

  // Sort tasks by priority ascending (1 goes first, then 2, etc.)
  // Stable sort by priority
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.name.localeCompare(b.name);
  });

  // Track next available date string for each modeler
  const modelerAvailableDate: { [modelerId: string]: string } = {};
  activeModelers.forEach(m => {
    modelerAvailableDate[m.id] = projectStartDate;
  });

  // Track tasks scheduled
  const scheduledTasksMap: { [id: string]: Task } = {};

  sortedTasks.forEach(task => {
    // Determine assignee
    let assigneeId = task.assigneeId;

    // If assignee is specified but not active or not exists, reset assignee or use first active
    if (!assigneeId || !activeModelers.some(m => m.id === assigneeId)) {
      // Auto-assign to the modeler who becomes available earliest
      let earliestModelerId = activeModelers[0].id;
      let earliestDate = parseDate(modelerAvailableDate[earliestModelerId]);

      for (let i = 1; i < activeModelers.length; i++) {
        const mId = activeModelers[i].id;
        const mDate = parseDate(modelerAvailableDate[mId]);
        if (mDate < earliestDate) {
          earliestDate = mDate;
          earliestModelerId = mId;
        }
      }
      assigneeId = earliestModelerId;
    }

    // Now schedule the task for this assignee
    if (task.durationDays <= 0) {
      scheduledTasksMap[task.id] = {
        ...task,
        assigneeId,
        scheduledStart: null,
        scheduledEnd: null,
        isDelayed: false,
      };
      return;
    }

    const currentModelerDate = modelerAvailableDate[assigneeId];
    
    // The start date is the current modeler's available date.
    // If that date is a non-working day, addWorkingDays will automatically slide it to the next working day.
    const { start, end } = addWorkingDays(currentModelerDate, task.durationDays);

    // Modeler's next available date becomes the working day AFTER the end date (only if NOT scheduled in parallel)
    if (!task.isParallel) {
      const nextAvail = getNextWorkingDay(end);
      modelerAvailableDate[assigneeId] = nextAvail;
    }

    // Check if delayed
    // A task is delayed if:
    // 1. Its scheduledEnd date is past the targetDeliveryDate (fecha de entrega)
    // 2. OR its status is 'Pendiente' and scheduledEnd is in the past compared to the today's date (local time)
    const todayStr = formatDateKey(new Date());
    let isDelayed = false;

    if (task.status !== 'Modelado') {
      if (task.targetDeliveryDate && end > task.targetDeliveryDate) {
        isDelayed = true;
      } else if (end < todayStr) {
        isDelayed = true;
      }
    }

    scheduledTasksMap[task.id] = {
      ...task,
      assigneeId,
      scheduledStart: start,
      scheduledEnd: end,
      isDelayed,
    };
  });

  // Return tasks in their original order, but with scheduling info updated
  return tasks.map(t => scheduledTasksMap[t.id] || t);
}
