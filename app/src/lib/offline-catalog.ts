import type { CatalogDocument } from "@/lib/services/catalog-api";

const DATABASE = "zen-offline";
const STORE = "snapshots";
const CATALOG_KEY = "catalog";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCatalogSnapshot(document: CatalogDocument) {
  if (typeof indexedDB === "undefined") return;
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(document, CATALOG_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export async function readCatalogSnapshot(): Promise<CatalogDocument | null> {
  if (typeof indexedDB === "undefined") return null;
  const database = await openDatabase();
  const value = await new Promise<CatalogDocument | undefined>((resolve, reject) => {
    const request = database.transaction(STORE, "readonly").objectStore(STORE).get(CATALOG_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return value ?? null;
}

export async function clearLocalAppCache() {
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("zen-")).map((key) => caches.delete(key)));
  }
  if (typeof indexedDB !== "undefined") {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(DATABASE);
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    });
  }
}

export async function getLocalStorageEstimate() {
  if (!navigator.storage?.estimate) return null;
  const estimate = await navigator.storage.estimate();
  return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 };
}
