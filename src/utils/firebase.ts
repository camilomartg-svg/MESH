import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

/**
 * Uploads a local file to Google Drive via Google Apps Script (bypassing Auth)
 */
export const uploadFileToDrive = async (
  file: File
): Promise<{ id: string; name: string; url: string; type: 'gdrive' }> => {
  const GAS_URL = "https://script.google.com/macros/s/AKfycbypEjIIdRELgMgQpbFY4EJxfLJ-InSreA2KpVZyCDnD2eTLUZJNETXAS8zF4N27Et3JNg/exec";

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];

        const response = await fetch(GAS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({
            file: base64Data,
            name: file.name,
            mimeType: file.type || 'application/octet-stream'
          })
        });
        
        const data = await response.json();
        if (data.status === 'success') {
          resolve({
            id: 'gdrive_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: file.name,
            url: data.url,
            type: 'gdrive'
          });
        } else {
          reject(new Error(data.message || 'Error desconocido al subir'));
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
};

/**
 * Saves project data to Firebase Firestore
 */
export const saveProjectDataToFirebase = async (data: any): Promise<boolean> => {
  try {
    // Save to Firestore under a fixed document for the current project
    const docRef = doc(db, 'projects', 'main_project');
    await setDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
    console.log('Sincronizado con Firebase Firestore con éxito.');
    return true;
  } catch (error) {
    console.warn('Firestore sync failed (might be permissions or unprovisioned):', error);
    return false;
  }
};

/**
 * Loads project data from Firebase Firestore
 */
export const loadProjectDataFromFirebase = async (): Promise<any | null> => {
  try {
    const docRef = doc(db, 'projects', 'main_project');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (error) {
    console.warn('Could not load from Firestore:', error);
  }
  return null;
};
