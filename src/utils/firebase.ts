import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();
// Request Google Drive file management permission
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // Try to get token from storage fallback if available (safely in-memory)
        const storedToken = sessionStorage.getItem('gdrive_access_token');
        if (storedToken) {
          cachedAccessToken = storedToken;
          if (onAuthSuccess) onAuthSuccess(user, storedToken);
        } else if (!isSigningIn) {
          cachedAccessToken = null;
          if (onAuthFailure) onAuthFailure();
        }
      }
    } else {
      cachedAccessToken = null;
      sessionStorage.removeItem('gdrive_access_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google using popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No se pudo obtener el token de acceso de Google Auth.');
    }

    cachedAccessToken = credential.accessToken;
    // Store in sessionStorage to survive tab refreshes while keeping in-memory security
    sessionStorage.setItem('gdrive_access_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Error al iniciar sesión con Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Logout from Google Drive connection
export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  sessionStorage.removeItem('gdrive_access_token');
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  return sessionStorage.getItem('gdrive_access_token');
};

/**
 * Uploads a local file to Google Drive and makes it accessible for anyone with the link
 * so it can be previewed inside the app.
 */
export const uploadFileToGoogleDrive = async (
  file: File,
  accessToken: string
): Promise<{ id: string; name: string; url: string; type: 'gdrive' }> => {
  const metadata = {
    name: file.name,
    mimeType: file.type,
    description: 'Subido desde Bitácora de Diseño e Incidencias'
  };

  const boundary = 'foo_bar_baz_uploader_boundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  // Read file data as array buffer
  const fileData = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

  const encoder = new TextEncoder();
  const part1 = encoder.encode(
    `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n${delimiter}Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`
  );
  const part2 = new Uint8Array(fileData);
  const part3 = encoder.encode(closeDelim);

  const multipartBody = new Blob([part1, part2, part3], { 
    type: `multipart/related; boundary=${boundary}` 
  });

  // 1. Upload the file to Google Drive
  const uploadResponse = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: multipartBody,
    }
  );

  if (!uploadResponse.ok) {
    const errText = await uploadResponse.text();
    throw new Error(`Google Drive Upload Failed: ${uploadResponse.statusText} - ${errText}`);
  }

  const uploadResult = await uploadResponse.json();
  const fileId = uploadResult.id;
  const webViewLink = uploadResult.webViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`;

  // 2. Try to make the file accessible to anyone with the link so team members can view previews.
  // We run this in a try-catch so if the user's workspace lacks permissions, the upload still succeeds.
  try {
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone',
        }),
      }
    );
    console.log(`Permissions set to anyoneWithLink for file: ${fileId}`);
  } catch (permissionError) {
    console.warn('Could not set public permissions on file, keeping as-is:', permissionError);
  }

  return {
    id: fileId,
    name: file.name,
    url: webViewLink,
    type: 'gdrive'
  };
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
    console.warn('Could not load from Firestore (using server fallback):', error);
  }
  return null;
};
