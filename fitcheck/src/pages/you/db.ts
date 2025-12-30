// db.ts
export type PhotoRecord = { id: string; createdAt: number; blob: Blob };

const DB_NAME = "fitcheck-db";
const DB_VERSION = 2; // bumped to add index
const STORE = "photos";
const META = "meta";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: "id" });
        os.createIndex("createdAt_idx", "createdAt");
      } else {
        const tx = req.transaction as IDBTransaction;
        const os = tx.objectStore(STORE);
        if (!os.indexNames.contains("createdAt_idx")) {
          os.createIndex("createdAt_idx", "createdAt");
        }
      }
      if (!db.objectStoreNames.contains(META)) {
        db.createObjectStore(META);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(
  mode: IDBTransactionMode,
  fn: (db: IDBDatabase) => Promise<T>
) {
  const db = await openDB();
  if (mode) {
    console.log("mode");
  }
  try {
    return await fn(db);
  } finally {
    db.close();
  }
}

async function evictOldest(
  db: IDBDatabase,
  bytesNeeded: number,
  maxDeletes = 10
) {
  return new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE, "readwrite");
    const idx = t.objectStore(STORE).index("createdAt_idx");
    let deleted = 0,
      freed = 0;

    const cursorReq = idx.openCursor();
    cursorReq.onsuccess = (e: any) => {
      const cursor: IDBCursorWithValue | null = e.target.result;
      if (!cursor) return; // finished; t.oncomplete will fire
      if (deleted >= maxDeletes || freed >= bytesNeeded) return; // stop early; t.oncomplete still fires
      const rec = cursor.value as PhotoRecord;
      const size = rec.blob?.size || 0;
      cursor.delete();
      deleted += 1;
      freed += size;
      cursor.continue();
    };
    cursorReq.onerror = () => reject(cursorReq.error);
    t.oncomplete = () => {
      console.log("[IDB] evicted", deleted, "item(s); freed≈", freed, "bytes");
      resolve();
    };
    t.onerror = () => reject(t.error);
  });
}

export async function addPhotoBlob(
  blob: Blob,
  createdAt?: number,
  id?: string
) {
  const rec: PhotoRecord = {
    id: id ?? crypto.randomUUID(),
    createdAt: createdAt ?? Date.now(),
    blob,
  };

  return tx("readwrite", async (db) => {
    const putOnce = () =>
      new Promise<void>((res, rej) => {
        const t = db.transaction(STORE, "readwrite");
        t.objectStore(STORE).put(rec);
        t.oncomplete = () => res();
        t.onerror = () => rej(t.error);
      });

    try {
      await putOnce();
      return rec.id;
    } catch (e: any) {
      console.warn(
        "[IDB] put failed; evicting & retrying:",
        e?.name || e?.message || e
      );
      await evictOldest(db, blob.size || 1_000_000, 10);
      await putOnce();
      return rec.id;
    }
  });
}

export async function deletePhoto(id: string) {
  return tx("readwrite", async (db) => {
    await new Promise<void>((res, rej) => {
      const t = db.transaction(STORE, "readwrite");
      t.objectStore(STORE).delete(id);
      t.oncomplete = () => res();
      t.onerror = () => rej(t.error);
    });
  });
}

export async function listPhotos(): Promise<PhotoRecord[]> {
  return tx("readonly", async (db) => {
    return await new Promise<PhotoRecord[]>((res, rej) => {
      const t = db.transaction(STORE, "readonly");
      const store = t.objectStore(STORE);
      const r = (store as any).getAll ? (store as any).getAll() : null;
      if (r) {
        r.onsuccess = () => res(r.result as PhotoRecord[]);
        r.onerror = () => rej(r.error);
      } else {
        const out: PhotoRecord[] = [];
        const req = store.openCursor();
        req.onsuccess = (e: any) => {
          const cur = e.target.result;
          if (cur) {
            out.push(cur.value);
            cur.continue();
          } else res(out);
        };
        req.onerror = () => rej(req.error);
      }
    });
  });
}

export async function setCurrentId(id: string | null) {
  return tx("readwrite", async (db) => {
    await new Promise<void>((res, rej) => {
      const t = db.transaction(META, "readwrite");
      const os = t.objectStore(META);
      if (id) os.put(id, "currentId");
      else os.delete("currentId");
      t.oncomplete = () => res();
      t.onerror = () => rej(t.error);
    });
  });
}

export async function getCurrentId(): Promise<string | null> {
  return tx("readonly", async (db) => {
    return await new Promise<string | null>((res, rej) => {
      const t = db.transaction(META, "readonly");
      const r = t.objectStore(META).get("currentId");
      r.onsuccess = () => res((r.result as string) ?? null);
      r.onerror = () => rej(r.error);
    });
  });
}

export async function requestPersistence(): Promise<boolean> {
  try {
    // Check if storage API is available (not supported in older iOS Safari)
    if (!('storage' in navigator)) return false;
    // eslint-disable-next-line compat/compat
    const persisted = await navigator.storage?.persisted?.();
    if (persisted) return true;
    // eslint-disable-next-line compat/compat
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
