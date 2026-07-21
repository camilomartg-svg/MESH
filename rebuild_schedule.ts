import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { DEFAULT_PROJECT_DATA, getInitialTaskIdForDrawing } from './src/utils/defaultData.js'; // Use the ts file via tsx
import { addWorkingDays, getWorkingDaysCount } from './src/utils/colombiaCalendar.js';
import fs from 'fs';
import path from 'path';

// read firebase-applet-config.json
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function rebuildAndPush() {
  const modelers = [
    {
      id: 'modeler-1',
      name: 'Camilo M',
      color: '#0284c7',
      active: true,
    }
  ];

  const tasks = JSON.parse(JSON.stringify(DEFAULT_PROJECT_DATA.tasks));
  const drawings = JSON.parse(JSON.stringify(DEFAULT_PROJECT_DATA.drawings));

  // 1. Assign everything to Camilo M and reset dates
  tasks.forEach((t: any) => {
    t.assigneeId = 'modeler-1';
    t.manualStart = null;
    t.targetDeliveryDate = null;
    t.scheduledStart = null;
    t.scheduledEnd = null;
  });

  drawings.forEach((d: any) => {
    d.assigneeId = 'modeler-1';
    d.manualStart = null;
    d.targetDeliveryDate = null;
    d.scheduledStart = null;
    d.scheduledEnd = null;
    // ensure taskId is set
    if (!d.taskId) {
        d.taskId = getInitialTaskIdForDrawing(d.code);
    }
  });

  // Apply parallels from screenshots
  // P022-P026, P052 are parallel with P021
  const p021Id = drawings.find((d: any) => d.code === 'P021')?.id;
  ['P022', 'P023', 'P024', 'P025', 'P026', 'P052'].forEach(code => {
    const d = drawings.find((x: any) => x.code === code);
    if (d && p021Id) {
      d.isParallel = true;
      d.parallelWithDrawingId = p021Id;
    }
  });

  // P020 parallel with P053
  const p053Id = drawings.find((d: any) => d.code === 'P053')?.id;
  const p020 = drawings.find((d: any) => d.code === 'P020');
  if (p020 && p053Id) {
    p020.isParallel = true;
    p020.parallelWithDrawingId = p053Id;
  }

  // P018 parallel with P020
  const p020Id = p020?.id;
  const p018 = drawings.find((d: any) => d.code === 'P018');
  if (p018 && p020Id) {
    p018.isParallel = true;
    p018.parallelWithDrawingId = p020Id;
  }

  // Now, we need to order the items.
  // The user wants to INTERLEAVE Modeling and Planimetry.
  // Priority: Cortes por Fachada (CF1-CF11 which are P028-P038, P029, P030)
  
  const cortesFachadaCodes = [
    'P028','P031','P032','P033','P034','P035','P036','P037','P038','P029','P030'
  ];

  // Separate tasks into modeling and planimetry
  let modelingPool = [...tasks];
  let planimetryPool = [...drawings];

  let scheduleQueue: { type: 'task'|'drawing', item: any }[] = [];

  // 1. We must schedule the modeling tasks required for Cortes Fachada first, 
  // so that Cortes Fachada can start.
  // What modeling tasks are required? Envolvente arquitectonica?
  const envolventeTasks = modelingPool.filter(t => t.category === 'ENVOLVENTE ARQUITECTÓNICA');
  const estructuraTasks = modelingPool.filter(t => t.category === 'ELEMENTOS ESTRUCTURALES');
  
  // Let's add all Estructura and Envolvente tasks first.
  estructuraTasks.forEach(t => scheduleQueue.push({ type: 'task', item: t }));
  envolventeTasks.forEach(t => scheduleQueue.push({ type: 'task', item: t }));
  modelingPool = modelingPool.filter(t => t.category !== 'ELEMENTOS ESTRUCTURALES' && t.category !== 'ENVOLVENTE ARQUITECTÓNICA');

  // Then add Cortes Fachada planimetry
  const cortesFachada = planimetryPool.filter(d => cortesFachadaCodes.includes(d.code));
  cortesFachada.forEach(d => scheduleQueue.push({ type: 'drawing', item: d }));
  planimetryPool = planimetryPool.filter(d => !cortesFachadaCodes.includes(d.code));

  // 2. Interleave the rest. We take 1 modeling task, then 3 planimetry tasks, etc.
  while(modelingPool.length > 0 || planimetryPool.length > 0) {
    if (modelingPool.length > 0) {
        scheduleQueue.push({ type: 'task', item: modelingPool.shift() });
    }
    for(let i=0; i<3; i++) {
        if (planimetryPool.length > 0) {
            scheduleQueue.push({ type: 'drawing', item: planimetryPool.shift() });
        }
    }
  }

  // 3. Assign consecutive dates starting from 2026-07-13
  let currentDate = '2026-07-13';
  
  // We keep track of task start/end dates so drawings with parallel settings can inherit
  const endDates: Record<string, string> = {};
  const startDates: Record<string, string> = {};

  for (const q of scheduleQueue) {
    const it = q.item;
    
    let actualStart = currentDate;

    if (it.isParallel && it.parallelWithDrawingId) {
        actualStart = startDates[it.parallelWithDrawingId] || currentDate;
        it.manualStart = actualStart;
        const { end } = addWorkingDays(actualStart, it.durationDays || 0);
        endDates[it.id] = end;
        startDates[it.id] = actualStart;
        continue;
    }

    if (it.isParallel && it.parallelWithTaskId) {
        actualStart = startDates[it.parallelWithTaskId] || currentDate;
        it.manualStart = actualStart;
        const { end } = addWorkingDays(actualStart, it.durationDays || 0);
        endDates[it.id] = end;
        startDates[it.id] = actualStart;
        continue;
    }

    // Schedule sequentially
    it.manualStart = currentDate;
    const { end } = addWorkingDays(currentDate, it.durationDays || 0);
    
    startDates[it.id] = currentDate;
    endDates[it.id] = end;

    // The next item starts the day AFTER this item ends
    const { end: nextStart } = addWorkingDays(end, 1);
    currentDate = nextStart;
  }

  // Merge back
  const finalTasks = scheduleQueue.filter(q => q.type === 'task').map(q => q.item);
  const finalDrawings = scheduleQueue.filter(q => q.type === 'drawing').map(q => q.item);

  const cleanData = JSON.parse(JSON.stringify({
    ...DEFAULT_PROJECT_DATA,
    tasks: finalTasks,
    drawings: finalDrawings,
    modelers: modelers
  }));

  try {
    const docRef = doc(db, 'projects', 'main_project');
    await setDoc(docRef, {
      ...cleanData,
      updatedAt: new Date().toISOString()
    });
    console.log('Successfully rebuilt and pushed schedule to Firebase!');
    process.exit(0);
  } catch (error) {
    console.error('Error pushing data:', error);
    process.exit(1);
  }
}

rebuildAndPush();
