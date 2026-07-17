import { Task, Modeler, Drawing } from '../types';

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

// Schedule all tasks based on alphabetical order, manual overrides, and parallel links.
// Each active modeler acts as a sequential pipeline of work unless a task is marked parallel.

export function calculateUnifiedSchedule(
  tasks: Task[],
  drawings: Drawing[],
  modelers: Modeler[],
  projectStartDate: string
): { scheduledTasks: Task[], scheduledDrawings: Drawing[] } {
  const activeModelers = modelers.filter(m => m.active);
  if (activeModelers.length === 0) {
    return {
      scheduledTasks: tasks.map(t => ({
        ...t,
        scheduledStart: t.manualStart || null,
        scheduledEnd: t.manualStart ? addWorkingDays(t.manualStart, t.durationDays).end : null,
        isDelayed: false,
      })),
      scheduledDrawings: drawings.map(d => ({
        ...d,
        scheduledStart: d.manualStart || null,
        scheduledEnd: d.manualStart ? addWorkingDays(d.manualStart, d.durationDays || 3).end : null,
      }))
    };
  }

  type UnifiedItem = {
    type: 'task' | 'drawing';
    id: string;
    assigneeId: string;
    durationDays: number;
    manualStart: string | null;
    isParallel: boolean;
    parallelWithId: string | null;
    activationTimestamp: number;
    name: string;
  };

  const unifiedList: UnifiedItem[] = [];

  // 1. Prepare Tasks
  tasks.forEach(t => {
    let assigneeId = t.assigneeId;
    if (!assigneeId || !activeModelers.some(m => m.id === assigneeId)) {
      assigneeId = activeModelers[0].id;
    }
    
    let inheritedDuration = Number(t.durationDays) || 0;
    if (t.isParallel && t.parallelWithTaskId) {
      let currentParentId: string | null = t.parallelWithTaskId;
      let safeCounter = 0;
      while (currentParentId && safeCounter < tasks.length) {
        const parent = tasks.find(p => p.id === currentParentId);
        if (!parent) break;
        if (!parent.isParallel || !parent.parallelWithTaskId) {
           inheritedDuration = Number(parent.durationDays) || 0;
           break;
        }
        currentParentId = parent.parallelWithTaskId;
        safeCounter++;
      }
    }

    const isActive = inheritedDuration > 0 || t.manualStart || t.isParallel;
    
    unifiedList.push({
      type: 'task',
      id: t.id,
      assigneeId,
      durationDays: inheritedDuration,
      manualStart: t.manualStart || null,
      isParallel: t.isParallel || false,
      parallelWithId: t.parallelWithTaskId || null,
      activationTimestamp: t.activationTimestamp || (isActive ? 1 : 0),
      name: t.name
    });
  });

  // 2. Prepare Drawings
  drawings.forEach(d => {
    let assigneeId = d.assigneeId;
    if (!assigneeId || !activeModelers.some(m => m.id === assigneeId)) {
      assigneeId = activeModelers[0].id;
    }
    
    let inheritedDuration = d.durationDays !== undefined ? Number(d.durationDays) : 3;
    if (d.isParallel && d.parallelWithDrawingId) {
      let currentParentId: string | null = d.parallelWithDrawingId;
      let safeCounter = 0;
      while (currentParentId && safeCounter < drawings.length) {
        const parent = drawings.find(p => p.id === currentParentId);
        if (!parent) break;
        if (!parent.isParallel || !parent.parallelWithDrawingId) {
           inheritedDuration = parent.durationDays !== undefined ? Number(parent.durationDays) : 3;
           break;
        }
        currentParentId = parent.parallelWithDrawingId;
        safeCounter++;
      }
    }

    const isActive = inheritedDuration > 0 || d.manualStart || d.isParallel;
    
    unifiedList.push({
      type: 'drawing',
      id: d.id,
      assigneeId,
      durationDays: inheritedDuration,
      manualStart: d.manualStart || null,
      isParallel: d.isParallel || false,
      parallelWithId: d.parallelWithDrawingId || null,
      activationTimestamp: d.activationTimestamp || (isActive ? 1 : 0),
      name: d.name
    });
  });

  const busyPeriods: { [modelerId: string]: Array<{ start: string, end: string, id: string }> } = {};
  const resolvedSchedules: { [id: string]: { start: string; end: string } } = {};
  
  // 3. Process Manual Items FIRST
  const manualItems = unifiedList.filter(item => item.manualStart && item.durationDays > 0);
  manualItems.sort((a, b) => b.activationTimestamp - a.activationTimestamp); // High priority manual items get the slot first

  manualItems.forEach(item => {
    let candidateStart = item.manualStart!;
    const periods = busyPeriods[item.assigneeId] || [];
    
    while (true) {
      while (isWeekend(parseDate(candidateStart)) || getHolidayName(parseDate(candidateStart))) {
        candidateStart = getNextWorkingDay(candidateStart);
      }

      const { start, end } = addWorkingDays(candidateStart, item.durationDays);
      let hasOverlap = false;
      let overlapEnd = '';

      for (const p of periods) {
        if (start <= p.end && end >= p.start) {
          if (item.isParallel && item.parallelWithId === p.id) {
            // Permitted overlap
          } else {
            hasOverlap = true;
            if (p.end > overlapEnd) overlapEnd = p.end;
          }
        }
      }

      if (!hasOverlap) {
        resolvedSchedules[item.id] = { start, end };
        if (!item.isParallel) {
          periods.push({ start, end, id: item.id });
          busyPeriods[item.assigneeId] = periods;
        }
        break;
      }

      candidateStart = getNextWorkingDay(overlapEnd);
    }
  });

  // 4. Process Sequential Items
  const sequentialItems = unifiedList.filter(item => !item.manualStart && item.activationTimestamp > 0 && item.durationDays > 0);
  sequentialItems.sort((a, b) => {
    if (a.activationTimestamp !== b.activationTimestamp) return a.activationTimestamp - b.activationTimestamp;
    return a.id.localeCompare(b.id, 'en', { numeric: true });
  });

  const resolving = new Set<string>();

  function resolveSequential(item: UnifiedItem): { start: string, end: string } | null {
    if (resolvedSchedules[item.id]) return resolvedSchedules[item.id];
    if (resolving.has(item.id)) return null;
    resolving.add(item.id);

    if (item.isParallel && item.parallelWithId) {
      const parent = unifiedList.find(p => p.id === item.parallelWithId && p.type === item.type);
      if (parent) {
        const parentSched = resolvedSchedules[parent.id] || resolveSequential(parent);
        if (parentSched) {
          resolvedSchedules[item.id] = parentSched;
          resolving.delete(item.id);
          return parentSched;
        }
      }
    } else {
      let candidateStart = projectStartDate;
      const periods = busyPeriods[item.assigneeId] || [];
      
      while (true) {
        const { start, end } = addWorkingDays(candidateStart, item.durationDays);
        
        let hasOverlap = false;
        let overlapEnd = '';
        for (const p of periods) {
          if (start <= p.end && end >= p.start) {
            hasOverlap = true;
            if (p.end > overlapEnd) overlapEnd = p.end;
          }
        }

        if (!hasOverlap) {
          resolvedSchedules[item.id] = { start, end };
          periods.push({ start, end, id: item.id });
          busyPeriods[item.assigneeId] = periods;
          resolving.delete(item.id);
          return { start, end };
        }

        candidateStart = getNextWorkingDay(overlapEnd);
      }
    }
    
    resolving.delete(item.id);
    return null;
  }

  sequentialItems.forEach(item => {
    resolveSequential(item);
  });

  // 5. Map back
  const todayStr = formatDateKey(new Date());

  const scheduledTasks = tasks.map(task => {
    const item = unifiedList.find(u => u.type === 'task' && u.id === task.id);
    if (!item || item.durationDays <= 0) {
      return {
        ...task,
        durationDays: item ? item.durationDays : Number(task.durationDays) || 0,
        scheduledStart: null,
        scheduledEnd: null,
        isDelayed: false
      };
    }

    const sched = resolvedSchedules[task.id];
    const start = sched ? sched.start : null;
    const end = sched ? sched.end : null;
    
    let isDelayed = false;
    const isFinished = task.status === 'Modelado' || task.status === 'Realizado' || task.status === 'N/A';
    if (!isFinished) {
      if (task.targetDeliveryDate && end && end > task.targetDeliveryDate) {
        isDelayed = true;
      } else if (end && end < todayStr) {
        isDelayed = true;
      }
    }

    return {
      ...task,
      durationDays: item.durationDays,
      assigneeId: item.assigneeId,
      scheduledStart: start,
      scheduledEnd: end,
      isDelayed
    };
  });

  const scheduledDrawings = drawings.map(d => {
    const item = unifiedList.find(u => u.type === 'drawing' && u.id === d.id);
    if (!item || item.durationDays <= 0) {
      return {
        ...d,
        durationDays: item ? item.durationDays : (d.durationDays !== undefined ? Number(d.durationDays) : 3),
        scheduledStart: null,
        scheduledEnd: null,
        deliveryDate: null
      };
    }

    const sched = resolvedSchedules[d.id];
    const start = sched ? sched.start : null;
    const end = sched ? sched.end : null;

    return {
      ...d,
      durationDays: item.durationDays,
      assigneeId: item.assigneeId,
      scheduledStart: start,
      scheduledEnd: end,
      deliveryDate: end
    };
  });

  return { scheduledTasks, scheduledDrawings };
}
