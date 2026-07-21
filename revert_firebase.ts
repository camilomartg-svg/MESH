import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { DEFAULT_PROJECT_DATA } from './src/utils/defaultData';
import fs from 'fs';
import path from 'path';

// read firebase-applet-config.json
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function pushData() {
  try {
    const docRef = doc(db, 'projects', 'main_project');
    const cleanData = JSON.parse(JSON.stringify(DEFAULT_PROJECT_DATA));
    await setDoc(docRef, {
      ...cleanData,
      updatedAt: new Date().toISOString()
    });
    console.log('Successfully reverted DEFAULT_PROJECT_DATA to Firebase Firestore!');
    process.exit(0);
  } catch (error) {
    console.error('Error pushing data:', error);
    process.exit(1);
  }
}

pushData();
