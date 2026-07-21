import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const modelingConfig: any = {
  'M001': { name: 'Columna Exenta / Pilote', days: 2, parallelWith: null },
  'M002': { name: 'Columnas Estructurales', days: 2, parallelWith: 'M001' },
  'M003': { name: 'Cubiertas', days: 2, parallelWith: null },
  'M004': { name: 'Escaleras y puntos fijos', days: 2, parallelWith: null },
  'M005': { name: 'Losa de Cimentación', days: 2, parallelWith: 'M002' },
  'M006': { name: 'Montantes y Paneles', days: 12, parallelWith: 'M012' },
  'M007': { name: 'Muros Cortina', days: 12, parallelWith: 'M012' },
  'M008': { name: 'Muros de Contención', days: 2, parallelWith: 'M013' },
  'M009': { name: 'Muros de cubierta', days: 2, parallelWith: 'M013' },
  'M010': { name: 'Muros de Drywall', days: 12, parallelWith: 'M012' },
  'M011': { name: 'Muros de Fachada Claros', days: 12, parallelWith: 'M012' },
  'M012': { name: 'Muros Divisorios Aptos', days: 12, parallelWith: null },
  'M013': { name: 'Muros zonas comunes', days: 2, parallelWith: null, manualStart: '2026-07-21' },
  'M014': { name: 'Pérgolas', days: 2, parallelWith: 'M003' },
  'M015': { name: 'Pisos', days: 2, parallelWith: null },
  'M016': { name: 'Rampa de Acceso PMR', days: 2, parallelWith: 'M015' },
  'M017': { name: 'Vigas de Entrepi./Borde', days: 2, parallelWith: 'M001' }
};

async function applyConfig() {
  const docRef = doc(db, 'projects', 'main_project');
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    console.error("Document does not exist");
    process.exit(1);
  }

  const data = snap.data();
  const tasks = data.tasks;

  // First pass: Update names and durations
  tasks.forEach((t: any) => {
    const code = t.code;
    const config = modelingConfig[code];
    if (config) {
      t.name = config.name;
      t.durationDays = config.days;
      t.isParallel = false;
      t.parallelWithTaskId = null;
      if (config.manualStart) {
        t.manualStart = config.manualStart;
      }
    }
  });

  // Second pass: Apply parallels
  tasks.forEach((t: any) => {
    const code = t.code;
    const config = modelingConfig[code];
    if (config && config.parallelWith) {
      const targetTask = tasks.find((x: any) => x.code === config.parallelWith);
      if (targetTask) {
        t.isParallel = true;
        t.parallelWithTaskId = targetTask.id;
      }
    }
  });

  data.tasks = tasks;

  await setDoc(docRef, data);
  console.log("Modeling config applied successfully");
  process.exit(0);
}

applyConfig();
