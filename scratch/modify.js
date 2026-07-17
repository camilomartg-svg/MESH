const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Update calculateSchedule import usage in useEffect
code = code.replace(
  /const scheduled = calculateSchedule\(tasks, modelers, settings\.startDate\);\s*const scheduledDrawings = calculateDrawingsSchedule\(drawings \|\| \[\], modelers, settings\.startDate\);/,
  "const { scheduledTasks: scheduled, scheduledDrawings } = calculateUnifiedSchedule(tasks, drawings || [], modelers, settings.startDate);"
);

// 2. Add checkScheduleCollision function above handleUpdateTaskField
const collisionFunc = \
  const checkScheduleCollision = (assigneeId: string, newStart: string, durationDays: number, ignoreId: string): boolean => {
    const { end: newEnd } = addWorkingDays(newStart, durationDays);
    const checkOverlap = (start1: string, end1: string, start2: string, end2: string) => {
      return start1 <= end2 && end1 >= start2;
    };
    
    // Check tasks
    const hasTaskCollision = tasks.some(t => 
      t.id !== ignoreId && 
      (t.assigneeId === assigneeId || (!t.assigneeId && !assigneeId)) && 
      t.scheduledStart && t.scheduledEnd && 
      checkOverlap(newStart, newEnd, t.scheduledStart, t.scheduledEnd)
    );
    
    // Check drawings
    const hasDrawingCollision = (drawings || []).some(d => 
      d.id !== ignoreId && 
      (d.assigneeId === assigneeId || (!d.assigneeId && !assigneeId)) && 
      d.scheduledStart && d.scheduledEnd && 
      checkOverlap(newStart, newEnd, d.scheduledStart, d.scheduledEnd)
    );

    return hasTaskCollision || hasDrawingCollision;
  };
\;

code = code.replace(
  /const handleUpdateTaskField = \(id: string, field: keyof Task, value: any\) => \{/,
  collisionFunc + "\n  const handleUpdateTaskField = (id: string, field: keyof Task, value: any) => {"
);

// 3. Inject warning into handleUpdateTaskField
code = code.replace(
  /const updated = tasks\.map\(t => \{/,
  \if (field === 'manualStart' && value) {
      const task = tasks.find(t => t.id === id);
      if (task && checkScheduleCollision(task.assigneeId || '', value, Number(task.durationDays) || 0, id)) {
        const confirm = window.confirm('La fecha seleccionada se cruza con otra actividad ya programada para esta persona. ¿Deseas reasignarla de todos modos? Esto empujará y reajustará el cronograma restante.');
        if (!confirm) return;
      }
    }
    const updated = tasks.map(t => {\
);

// 4. Inject warning into handleUpdateDrawingField
code = code.replace(
  /const handleUpdateDrawingField = \(id: string, field: keyof Drawing, value: any\) => \{/,
  \const handleUpdateDrawingField = (id: string, field: keyof Drawing, value: any) => {
    if (field === 'manualStart' && value) {
      const drawing = drawings.find(d => d.id === id);
      if (drawing && checkScheduleCollision(drawing.assigneeId || '', value, Number(drawing.durationDays !== undefined ? drawing.durationDays : 3) || 0, id)) {
        const confirm = window.confirm('La fecha seleccionada se cruza con otra actividad ya programada para esta persona. ¿Deseas reasignarla de todos modos? Esto empujará y reajustará el cronograma restante.');
        if (!confirm) return;
      }
    }\
);

fs.writeFileSync('src/App.tsx', code);
