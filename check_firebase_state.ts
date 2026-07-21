import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const snap = await getDoc(doc(db, 'projects', 'main_project'));
  if (snap.exists()) {
    const data = snap.data();
    console.log(JSON.stringify(data.tasks.slice(0, 5), null, 2));
  }
  process.exit(0);
}
check();
