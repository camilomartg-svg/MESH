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
 * Uploads a local file to Firebase Storage and returns the public download URL.
 */
export const uploadFileToFirebaseStorage = async (
  file: File
): Promise<{ id: string; name: string; url: string; type: 'firebase' }> => {
  try {
    // Create a unique file name to avoid overwrites
    const uniqueFileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const storageRef = ref(storage, `uploads/${uniqueFileName}`);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get the public URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    return {
      id: uniqueFileName,
      name: file.name,
      url: downloadURL,
      type: 'firebase'
    };
  } catch (error: any) {
    console.error('Error al subir archivo a Firebase Storage:', error);
    throw new Error('No se pudo subir el archivo: ' + (error.message || String(error)));
  }
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
