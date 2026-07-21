import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function generateId() {
  return 'task-' + crypto.randomBytes(4).toString('hex');
}

const userTasks = [
  { name: 'Columna Exenta / Pilote', category: 'ELEMENTOS ESTRUCTURALES', days: 2, parallelWithName: null },
  { name: 'Columnas Estructurales', category: 'ELEMENTOS ESTRUCTURALES', days: 2, parallelWithName: 'Columna Exenta / Pilote' },
  { name: 'Cubiertas', category: 'ENVOLVENTE ARQUITECTÓNICA', days: 2, parallelWithName: null },
  { name: 'Escaleras y puntos fijos', category: 'CIRCULACIÓN Y SEGURIDAD', days: 2, parallelWithName: null },
  { name: 'Losa de Cimentación', category: 'ELEMENTOS ESTRUCTURALES', days: 2, parallelWithName: 'Columnas Estructurales' },
  { name: 'Montantes y Paneles', category: 'ENVOLVENTE ARQUITECTÓNICA', days: 12, parallelWithName: 'Muros Divisorios Aptos' },
  { name: 'Muros Cortina', category: 'ENVOLVENTE ARQUITECTÓNICA', days: 12, parallelWithName: 'Muros Divisorios Aptos' },
  { name: 'Muros de Contención', category: 'ELEMENTOS ESTRUCTURALES', days: 2, parallelWithName: 'Muros zonas comunes' },
  { name: 'Muros de cubierta', category: 'ENVOLVENTE ARQUITECTÓNICA', days: 2, parallelWithName: 'Muros zonas comunes' },
  { name: 'Muros de Drywall', category: 'DIVISIONES INTERIORES', days: 12, parallelWithName: 'Muros Divisorios Aptos' },
  { name: 'Muros de Fachada Claros', category: 'ENVOLVENTE ARQUITECTÓNICA', days: 12, parallelWithName: 'Muros Divisorios Aptos' },
  { name: 'Muros Divisorios Aptos', category: 'DIVISIONES INTERIORES', days: 12, parallelWithName: null },
  { name: 'Muros zonas comunes', category: 'DIVISIONES INTERIORES', days: 2, parallelWithName: null },
  { name: 'Pérgolas', category: 'REMATES Y EXTERIORES', days: 2, parallelWithName: 'Cubiertas' },
  { name: 'Pisos', category: 'DIVISIONES INTERIORES', days: 2, parallelWithName: null },
  { name: 'Rampa de Acceso PMR', category: 'CIRCULACIÓN Y SEGURIDAD', days: 2, parallelWithName: 'Pisos' },
  { name: 'Vigas de Entrepi./Borde', category: 'ELEMENTOS ESTRUCTURALES', days: 2, parallelWithName: 'Columna Exenta / Pilote' }
];

async function rebuild() {
  const docRef = doc(db, 'projects', 'main_project');
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    process.exit(1);
  }

  const data = snap.data();

  // Create new task objects
  const newTasks = userTasks.map((t, idx) => {
    return {
      id: generateId(),
      name: t.name,
      description: t.name,
      category: t.category,
      assigneeId: 'modeler-1',
      status: 'Pendiente',
      durationDays: t.days,
      priority: idx + 1, // Will be used for default sorting/interleaving
      isParallel: false,
      parallelWithTaskId: null,
      manualStart: null,
      targetDeliveryDate: null,
      scheduledStart: null,
      scheduledEnd: null,
      isDelayed: false,
      code: 'M000' // Frontend will fix this
    };
  });

  // Link parallels
  userTasks.forEach((ut, idx) => {
    if (ut.parallelWithName) {
      const targetTask = newTasks.find(nt => nt.name === ut.parallelWithName);
      if (targetTask) {
        newTasks[idx].isParallel = true;
        newTasks[idx].parallelWithTaskId = targetTask.id;
      }
    }
  });

  data.tasks = newTasks;

  await setDoc(docRef, data);
  console.log("Successfully replaced tasks from scratch with correct names and parallels");
  process.exit(0);
}

rebuild();
