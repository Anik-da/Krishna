import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  deleteDoc, 
  writeBatch,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp 
} from "firebase/firestore";
import { firebaseConfig } from './firebaseConfig';

let app = null;
let db = null;
let isInitialized = false;

export const initFirebase = () => {
  if (isInitialized && db) return { app, db, initialized: true };

  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    db = getFirestore(app);
    isInitialized = true;
    console.log("[Firebase Cloud Firestore] Connected to project: krishna-kripa-attendance");
    return { app, db, initialized: true };
  } catch (error) {
    console.warn("[Firebase Init Notice]:", error.message);
    return { initialized: false, error: error.message };
  }
};

export const getFirestoreDb = () => {
  if (!db) {
    initFirebase();
  }
  return db;
};

// Purge confirmed fake demonstration records from Cloud Firestore while preserving all genuine data
export const firestorePurgeFakeData = async () => {
  try {
    const firestore = getFirestoreDb();
    if (!firestore) return;

    const FAKE_STUDENT_IDS = [
      "BGK-2026-0001", "BGK-2026-0002", "BGK-2026-0003", "BGK-2026-0004",
      "BGK-2026-0005", "BGK-2026-0006", "BGK-2026-0007", "BGK-2026-0008"
    ];
    const FAKE_SESSION_DATES = [
      "2026-09-12", "2026-09-13", "2026-09-19", "2026-09-20", "2026-09-26",
      "2026-09-27", "2026-10-03", "2026-10-04", "2026-10-10", "2026-10-11"
    ];
    const FAKE_SESSION_IDS = FAKE_SESSION_DATES.map(d => `SES-${d}`);

    const batch = writeBatch(firestore);
    let count = 0;

    // Delete fake students
    for (const sid of FAKE_STUDENT_IDS) {
      batch.delete(doc(firestore, 'students', sid));
      count++;
    }

    // Delete fake sessions
    for (const sesId of FAKE_SESSION_IDS) {
      batch.delete(doc(firestore, 'sessions', sesId));
      count++;
    }

    if (count > 0) {
      await batch.commit();
      console.log("[Firebase Cloud Firestore] Cleaned fake demonstration records. Preserved genuine registrations.");
    }
  } catch (e) {
    console.warn("[Firebase Purge Notice]:", e.message);
  }
};

// Firestore CRUD Helpers with resilient timeout for mobile connections
export const firestoreGetAll = async (colName, timeoutMs = 2500) => {
  try {
    const firestore = getFirestoreDb();
    if (!firestore) return [];
    const colRef = collection(firestore, colName);
    
    const fetchPromise = getDocs(colRef).then(snap => snap.docs.map(d => ({ id: d.id, ...d.data() })));
    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve([]), timeoutMs));
    
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (e) {
    console.warn(`Firestore read ${colName} notice:`, e.message);
    return [];
  }
};

export const firestoreSetDoc = async (colName, id, data) => {
  try {
    const firestore = getFirestoreDb();
    if (!firestore) return false;
    const docRef = doc(firestore, colName, id);
    // Sanitize data for Firestore (remove undefined, strip mongoose _id)
    const cleanData = JSON.parse(JSON.stringify(data, (key, value) => {
      if (key === '_id') return undefined;
      return value;
    }));
    await setDoc(docRef, { ...cleanData, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  } catch (e) {
    console.warn(`Firestore write ${colName}/${id} notice:`, e.message);
    return false;
  }
};

export const firestoreGetDoc = async (colName, id, timeoutMs = 3000) => {
  try {
    const firestore = getFirestoreDb();
    if (!firestore) return null;
    const docRef = doc(firestore, colName, id);
    const fetchPromise = getDoc(docRef).then(snap => snap.exists() ? { id: snap.id, ...snap.data() } : null);
    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), timeoutMs));
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (e) {
    return null;
  }
};

export const subscribeToDoc = (colName, id, callback) => {
  try {
    const firestore = getFirestoreDb();
    if (!firestore) return () => {};
    const docRef = doc(firestore, colName, id);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() });
      }
    }, (err) => {
      console.warn(`[Firestore Real-time] Listener notice on ${colName}/${id}:`, err.message);
    });
    return unsubscribe;
  } catch (e) {
    console.warn(`[Firestore Real-time] Subscribe error on ${colName}/${id}:`, e.message);
    return () => {};
  }
};

export const firestoreSavePublishedConfig = async (config) => {
  if (!config) return false;
  return await firestoreSetDoc('websiteconfigs', 'published', {
    branding: config.branding || {},
    styling: config.styling || {},
    sectionsVisibility: config.sectionsVisibility || {},
    configType: 'published',
    lastUpdatedBy: 'ANIK',
    version: Date.now()
  });
};

export const firestoreGetPublishedConfig = async (timeoutMs = 3000) => {
  return await firestoreGetDoc('websiteconfigs', 'published', timeoutMs);
};

export const firestoreSaveCurrentPlan = async (plan) => {
  if (!plan) return false;
  return await firestoreSetDoc('plans', 'current', plan);
};

export const firestoreGetCurrentPlan = async (timeoutMs = 3000) => {
  return await firestoreGetDoc('plans', 'current', timeoutMs);
};

export const firestoreDeleteDoc = async (colName, id) => {
  try {
    const firestore = getFirestoreDb();
    if (!firestore) return false;
    const docRef = doc(firestore, colName, id);
    await deleteDoc(docRef);
    return true;
  } catch (e) {
    console.warn(`Firestore delete ${colName}/${id} notice:`, e.message);
    return false;
  }
};


