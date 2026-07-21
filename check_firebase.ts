import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listDocs() {
  try {
    const collRef = collection(db, 'projects');
    const snapshot = await getDocs(collRef);
    snapshot.forEach(doc => {
      console.log('Doc:', doc.id, 'Size:', JSON.stringify(doc.data()).length);
    });
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
listDocs();
