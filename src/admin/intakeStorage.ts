/**
 * Meme Capsule — Client-Side Binary Intake Storage (IndexedDB)
 * 
 * Securely caches binary image blobs locally so that active upload batches
 * can automatically resume across browser restarts, tab closures, network loss,
 * and page reloads without forcing the admin to re-select files.
 */

const DB_NAME = "meme_capsule_intake_db";
const DB_VERSION = 1;
const STORE_NAME = "intake_blobs";

export interface IntakeBlobRecord {
  clientItemId: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  contentHash: string;
  byteSize: number;
  batchId?: string;
  timestamp: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

const getDB = (): Promise<IDBDatabase> => {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not supported in this environment."));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "clientItemId" });
          store.createIndex("by_batch", "batchId", { unique: false });
          store.createIndex("by_hash", "contentHash", { unique: false });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };

      request.onerror = (event) => {
        dbPromise = null;
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  return dbPromise;
};

export const saveIntakeBlob = async (record: IntakeBlobRecord): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const saveIntakeBlobs = async (records: IntakeBlobRecord[]): Promise<void> => {
  if (records.length === 0) return;
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const record of records) {
      store.put(record);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getIntakeRecord = async (clientItemId: string): Promise<IntakeBlobRecord | null> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(clientItemId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
};

export const getIntakeBlob = async (clientItemId: string): Promise<Blob | null> => {
  const record = await getIntakeRecord(clientItemId);
  return record?.blob || null;
};

export const removeIntakeBlob = async (clientItemId: string): Promise<void> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(clientItemId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Non-blocking
  }
};

export const removeIntakeBlobs = async (clientItemIds: string[]): Promise<void> => {
  if (clientItemIds.length === 0) return;
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      for (const id of clientItemIds) {
        store.delete(id);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Non-blocking
  }
};

export const clearAllIntakeBlobs = async (): Promise<void> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Non-blocking
  }
};

