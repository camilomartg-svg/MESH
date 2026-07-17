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
export function calculateSchedule(
  tasks: Task[],
  modelers: Modeler[],
  projectStartDate: string
): Task[] {
  const activeModelers = modelers.filter(m => m.active);
  if (activeModelers.length === 0) {
    return tasks.map(t => ({
      ...t,
      scheduledStart: t.manualStart || null,
      scheduledEnd: t.manualStart ? addWorkingDays(t.manualStart, t.durationDays).end : null,
      isDelayed: false,
    }));
  }

  // 1. Sort tasks chronologically by when they were activated, falling back to alphabetical
  const sortedTasks = [...tasks].sort((a, b) => {
    const isActiveA = a.durationDays > 0 || a.manualStart || a.isParallel;
    const isActiveB = b.durationDays > 0 || b.manualStart || b.isParallel;
    const timeA = a.activationTimestamp || (isActiveA ? 1 : 0);
    const timeB = b.activationTimestamp || (isActiveB ? 1 : 0);
    if (timeA > 0 && timeB > 0) {
      if (timeA !== timeB) return timeA - timeB;
      return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
    }
    if (timeA > 0) return -1;
    if (timeB > 0) return 1;
    return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
  });

  // 2. Pre-assign tasks to active modelers
  const taskAssignees: { [taskId: string]: string } = {};
  sortedTasks.forEach(task => {
    let assigneeId = task.assigneeId;
    if (!assigneeId || !activeModelers.some(m => m.id === assigneeId)) {
      // Auto-assign to first active modeler for stability
      assigneeId = activeModelers[0].id;
    }
    taskAssignees[task.id] = assigneeId;
  });

  // Group tasks by assignee for sequential logic
  const modelerTasks: { [modelerId: string]: Task[] } = {};
  activeModelers.forEach(m => {
    modelerTasks[m.id] = sortedTasks.filter(t => taskAssignees[t.id] === m.id);
  });

  // Keep track of resolved start/end dates
  const resolvedSchedules: { [id: string]: { start: string; end: string } } = {};
  const resolving = new Set<string>(); // prevent infinite loops

  function resolveTaskSchedule(taskId: string): { start: string; end: string } | null {
    if (resolvedSchedules[taskId]) {
      return resolvedSchedules[taskId];
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;

    if (resolving.has(taskId)) {
      // Circular reference fallback
      const { start, end } = addWorkingDays(projectStartDate, task.durationDays);
      return { start, end };
    }

    resolving.add(taskId);

    let startStr = '';

    // Case A: Manual Start Date override
    if (task.manualStart) {
      startStr = task.manualStart;
    }
    // Case B: Parallel linked to another specific activity
    else if (task.isParallel && task.parallelWithTaskId) {
      const parent = tasks.find(p => p.id === task.parallelWithTaskId);
      if (parent && parent.id !== task.id) {
        const parentSched = resolveTaskSchedule(parent.id);
        if (parentSched) {
          resolvedSchedules[taskId] = parentSched;
          resolving.delete(taskId);
          return parentSched;
        }
      }
      startStr = projectStartDate;
    }
    // Case C: Standard sequential task
    else {
      // Process sequential queue of this modeler
      const mId = taskAssignees[task.id];
      const mTasks = modelerTasks[mId] || [];
      const myIndex = mTasks.findIndex(t => t.id === task.id);
      
      let currentModelerDate = projectStartDate;

      for (let i = 0; i < myIndex; i++) {
        const prevTask = mTasks[i];
        // Skip linked parallel tasks since they don't consume sequential line time
        if (prevTask.isParallel && prevTask.parallelWithTaskId) {
          continue;
        }
        
        // Resolve schedule of the preceding task
        const prevSched = resolveTaskSchedule(prevTask.id);
        if (prevSched) {
          const nextAvail = getNextWorkingDay(prevSched.end);
          if (nextAvail > currentModelerDate) {
            currentModelerDate = nextAvail;
          }
        }
      }

      startStr = currentModelerDate;
    }

    // Slide to first working day if starting on holiday or weekend
    const { start, end } = addWorkingDays(startStr, task.durationDays);
    const result = { start, end };
    resolvedSchedules[taskId] = result;
    resolving.delete(taskId);
    return result;
  }

  // Calculate schedules for all tasks in order
  sortedTasks.forEach(task => {
    resolveTaskSchedule(task.id);
  });

  // Map resolved schedules back, maintaining original order in the state but calculated alphabetically
  return tasks.map(task => {
    let inheritedDuration = task.durationDays;
    
    // Determine actual inherited duration by traversing parallel parent chain
    if (task.isParallel && task.parallelWithTaskId) {
      let currentParentId = task.parallelWithTaskId;
      let safeCounter = 0;
      while (currentParentId && safeCounter < tasks.length) {
        const parent = tasks.find(p => p.id === currentParentId);
        if (!parent) break;
        if (!parent.isParallel || !parent.parallelWithTaskId) {
           inheritedDuration = parent.durationDays;
           break;
        }
        currentParentId = parent.parallelWithTaskId;
        safeCounter++;
      }
    }

    if (inheritedDuration <= 0) {
      return {
        ...task,
        durationDays: inheritedDuration,
        scheduledStart: null,
        scheduledEnd: null,
        isDelayed: false,
      };
    }

    const sched = resolveTaskSchedule(task.id);
    const start = sched ? sched.start : null;
    const end = sched ? sched.end : null;
    const assigneeId = taskAssignees[task.id] || task.assigneeId;

    const todayStr = formatDateKey(new Date());
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
      durationDays: inheritedDuration,
      assigneeId,
      scheduledStart: start,
      scheduledEnd: end,
      isDelayed,
    };
  });
}

export function calculateDrawingsSchedule(
  drawings: Drawing[],
  modelers: Modeler[],
  projectStartDate: string
): Drawing[] {
  const activeModelers = modelers.filter(m => m.active);
  if (activeModelers.length === 0) {
    return drawings.map(d => ({
      ...d,
      scheduledStart: d.manualStart || null,
      scheduledEnd: d.manualStart ? addWorkingDays(d.manualStart, d.durationDays || 3).end : null,
    }));
  }

  // 1. Sort drawings chronologically by when they were activated, falling back to alphabetical
  const sortedDrawings = [...drawings].sort((a, b) => {
    const isActiveA = (a.durationDays !== undefined && a.durationDays > 0) || a.manualStart || a.isParallel;
    const isActiveB = (b.durationDays !== undefined && b.durationDays > 0) || b.manualStart || b.isParallel;
    const timeA = a.activationTimestamp || (isActiveA ? 1 : 0);
    const timeB = b.activationTimestamp || (isActiveB ? 1 : 0);
    if (timeA > 0 && timeB > 0) {
      if (timeA !== timeB) return timeA - timeB;
      return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
    }
    if (timeA > 0) return -1;
    if (timeB > 0) return 1;
    return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
  });

  // 2. Pre-assign drawings to active modelers
  const drawingAssignees: { [drawingId: string]: string } = {};
  sortedDrawings.forEach(d => {
    let assigneeId = d.assigneeId;
    if (!assigneeId || !activeModelers.some(m => m.id === assigneeId)) {
      assigneeId = activeModelers[0].id;
    }
    drawingAssignees[d.id] = assigneeId;
  });

  // Group drawings by assignee
  const modelerDrawings: { [modelerId: string]: Drawing[] } = {};
  activeModelers.forEach(m => {
    modelerDrawings[m.id] = sortedDrawings.filter(d => drawingAssignees[d.id] === m.id);
  });

  const resolvedSchedules: { [id: string]: { start: string; end: string } } = {};
  const resolving = new Set<string>();

  function resolveDrawingSchedule(drawingId: string): { start: string; end: string } | null {
    if (resolvedSchedules[drawingId]) {
      return resolvedSchedules[drawingId];
    }

    const d = drawings.find(x => x.id === drawingId);
    if (!d) return null;

    const duration = d.durationDays !== undefined ? d.durationDays : 3;

    if (resolving.has(drawingId)) {
      const { start, end } = addWorkingDays(projectStartDate, duration);
      return { start, end };
    }

    resolving.add(drawingId);

    let startStr = '';

    if (d.manualStart) {
      startStr = d.manualStart;
    } else if (d.isParallel && d.parallelWithDrawingId) {
      const parent = drawings.find(p => p.id === d.parallelWithDrawingId);
      if (parent && parent.id !== d.id) {
        const parentSched = resolveDrawingSchedule(parent.id);
        if (parentSched) {
          resolvedSchedules[drawingId] = parentSched;
          resolving.delete(drawingId);
          return parentSched;
        }
      }
      startStr = projectStartDate;
    } else {
      const mId = drawingAssignees[d.id];
      const mDrawings = modelerDrawings[mId] || [];
      const myIndex = mDrawings.findIndex(x => x.id === d.id);

      let currentModelerDate = projectStartDate;

      for (let i = 0; i < myIndex; i++) {
        const prevDraw = mDrawings[i];
        if (prevDraw.isParallel && prevDraw.parallelWithDrawingId) {
          continue;
        }

        const prevSched = resolveDrawingSchedule(prevDraw.id);
        if (prevSched) {
          const nextAvail = getNextWorkingDay(prevSched.end);
          if (nextAvail > currentModelerDate) {
            currentModelerDate = nextAvail;
          }
        }
      }

      startStr = currentModelerDate;
    }

    const { start, end } = addWorkingDays(startStr, duration);
    const result = { start, end };
    resolvedSchedules[drawingId] = result;
    resolving.delete(drawingId);
    return result;
  }

  sortedDrawings.forEach(d => {
    resolveDrawingSchedule(d.id);
  });

  return drawings.map(d => {
    let inheritedDuration = d.durationDays !== undefined ? d.durationDays : 3;
    
    // Determine actual inherited duration by traversing parallel parent chain
    if (d.isParallel && d.parallelWithDrawingId) {
      let currentParentId = d.parallelWithDrawingId;
      let safeCounter = 0;
      while (currentParentId && safeCounter < drawings.length) {
        const parent = drawings.find(p => p.id === currentParentId);
        if (!parent) break;
        if (!parent.isParallel || !parent.parallelWithDrawingId) {
           inheritedDuration = parent.durationDays !== undefined ? parent.durationDays : 3;
           break;
        }
        currentParentId = parent.parallelWithDrawingId;
        safeCounter++;
      }
    }

    if (inheritedDuration <= 0) {
      return {
        ...d,
        durationDays: inheritedDuration,
        scheduledStart: null,
        scheduledEnd: null,
        deliveryDate: null,
      };
    }

    const sched = resolveDrawingSchedule(d.id);
    const start = sched ? sched.start : null;
    const end = sched ? sched.end : null;
    const assigneeId = drawingAssignees[d.id] || d.assigneeId;

    return {
      ...d,
      durationDays: inheritedDuration,
      assigneeId,
      scheduledStart: start,
      scheduledEnd: end,
      deliveryDate: end, // Keep deliveryDate synchronized with scheduledEnd
    };
  });
}
