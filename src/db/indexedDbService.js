
const DB_NAME = 'KrishnaKripaAttendanceDB';
const DB_VERSION = 2;

let dbPromise = null;

export const openDB = () => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('students')) {
        const studentStore = db.createObjectStore('students', { keyPath: 'id' });
        studentStore.createIndex('status', 'status', { unique: false });
        studentStore.createIndex('school', 'school', { unique: false });
        studentStore.createIndex('grade', 'grade', { unique: false });
      }

      if (!db.objectStoreNames.contains('sessions')) {
        const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
        sessionStore.createIndex('date', 'date', { unique: false });
        sessionStore.createIndex('status', 'status', { unique: false });
        sessionStore.createIndex('dayOfWeek', 'dayOfWeek', { unique: false });
      }

      if (!db.objectStoreNames.contains('attendance')) {
        const attStore = db.createObjectStore('attendance', { keyPath: 'id' });
        attStore.createIndex('sessionId', 'sessionId', { unique: false });
        attStore.createIndex('studentId', 'studentId', { unique: false });
        attStore.createIndex('date', 'date', { unique: false });
      }

      if (!db.objectStoreNames.contains('adminActivity')) {
        const actStore = db.createObjectStore('adminActivity', { keyPath: 'id' });
        actStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains('janmashtamiSeasons')) {
        const seasonStore = db.createObjectStore('janmashtamiSeasons', { keyPath: 'id' });
        seasonStore.createIndex('year', 'year', { unique: true });
        seasonStore.createIndex('status', 'status', { unique: false });
      }

      if (!db.objectStoreNames.contains('janmashtamiAdjustments')) {
        const adjStore = db.createObjectStore('janmashtamiAdjustments', { keyPath: 'id' });
        adjStore.createIndex('seasonId', 'seasonId', { unique: false });
        adjStore.createIndex('studentId', 'studentId', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      console.error("IndexedDB open error:", event.target.error);
      reject(event.target.error);
    };
  });

  return dbPromise;
};

// Purge confirmed fake demonstration records while preserving all genuine user registrations
export const idbPurgeFakeData = async () => {
  const db = await openDB();
  const FAKE_STUDENT_IDS = [
    "BGK-2026-0001", "BGK-2026-0002", "BGK-2026-0003", "BGK-2026-0004",
    "BGK-2026-0005", "BGK-2026-0006", "BGK-2026-0007", "BGK-2026-0008"
  ];
  const FAKE_SESSION_DATES = [
    "2026-09-12", "2026-09-13", "2026-09-19", "2026-09-20", "2026-09-26",
    "2026-09-27", "2026-10-03", "2026-10-04", "2026-10-10", "2026-10-11"
  ];
  const FAKE_SESSION_IDS = FAKE_SESSION_DATES.map(d => `SES-${d}`);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['students', 'sessions', 'attendance', 'adminActivity'], 'readwrite');
    
    // 1. Purge fake students
    const studentStore = tx.objectStore('students');
    FAKE_STUDENT_IDS.forEach(id => studentStore.delete(id));

    // 2. Purge fake sessions
    const sessionStore = tx.objectStore('sessions');
    FAKE_SESSION_IDS.forEach(id => sessionStore.delete(id));
    FAKE_SESSION_DATES.forEach(d => sessionStore.delete(d));

    // 3. Purge fake attendance
    const attStore = tx.objectStore('attendance');
    const attReq = attStore.getAll();
    attReq.onsuccess = () => {
      const records = attReq.result || [];
      records.forEach(r => {
        if (
          FAKE_STUDENT_IDS.includes(r.studentId) ||
          FAKE_SESSION_IDS.includes(r.sessionId) ||
          FAKE_SESSION_DATES.includes(r.date) ||
          FAKE_SESSION_DATES.includes(r.sessionDate)
        ) {
          attStore.delete(r.id);
        }
      });
    };

    // 4. Purge fake seed activity
    const actStore = tx.objectStore('adminActivity');
    const actReq = actStore.getAll();
    actReq.onsuccess = () => {
      const activities = actReq.result || [];
      activities.forEach(act => {
        if (
          act.id?.startsWith('ACT-INIT') || 
          act.action === 'SYSTEM_SEED' ||
          act.description?.includes('Aarav Sharma')
        ) {
          actStore.delete(act.id);
        }
      });
    };

    tx.oncomplete = () => {
      console.log('[IndexedDB] Cleaned fake demonstration records. Preserved genuine registrations.');
      resolve(true);
    };
    tx.onerror = () => reject(tx.error);
  });
};

export const idbGetAll = async (storeName) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
};

export const idbGet = async (storeName, key) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export const idbPut = async (storeName, value) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export const idbBulkPut = async (storeName, items) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    items.forEach(item => store.put(item));
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

export const idbDelete = async (storeName, key) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
};

export const idbClear = async (storeName) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
};

export const idbGetNextStudentSequence = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('meta', 'readwrite');
    const store = tx.objectStore('meta');
    const req = store.get('lastSequence');

    req.onsuccess = () => {
      let current = (req.result && req.result.value !== undefined) ? req.result.value : 0;
      const next = current + 1;
      store.put({ key: 'lastSequence', value: next });
      tx.oncomplete = () => resolve(next);
      tx.onerror = () => reject(tx.error);
    };

    req.onerror = () => reject(req.error);
  });
};

export const idbResetDatabase = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const writeTx = db.transaction(['students', 'sessions', 'attendance', 'adminActivity', 'meta'], 'readwrite');
    
    writeTx.objectStore('students').clear();
    writeTx.objectStore('sessions').clear();
    writeTx.objectStore('attendance').clear();
    writeTx.objectStore('adminActivity').clear();
    writeTx.objectStore('meta').clear();

    writeTx.objectStore('meta').put({ key: 'lastSequence', value: 0 });

    writeTx.oncomplete = () => {
      console.log('[IndexedDB] Database cleared. Clean empty state ready for authentic entries.');
      resolve(true);
    };
    writeTx.onerror = () => reject(writeTx.error);
  });
};
