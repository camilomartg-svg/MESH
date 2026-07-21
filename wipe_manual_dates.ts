import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanManualDates() {
  const docRef = doc(db, 'projects', 'main_project');
  const snap = await getDoc(docRef);
  
  if (!snap.exists()) {
    process.exit(1);
  }

  const data = snap.data();
  
  data.tasks.forEach((t: any) => {
    t.manualStart = null;
    t.targetDeliveryDate = null;
    t.scheduledStart = null;
    t.scheduledEnd = null;
  });

  data.drawings.forEach((d: any) => {
    d.manualStart = null;
    d.targetDeliveryDate = null;
    d.scheduledStart = null;
    d.scheduledEnd = null;
  });

  await setDoc(docRef, data);
  console.log("Wiped manual dates so UI can auto-calculate parallels");
  process.exit(0);
}

cleanManualDates();
