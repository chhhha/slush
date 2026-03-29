"use client";

const DEVICE_ID_KEY = "slush_device_id";
const INDEXED_DB_NAME = "slush_id_store";
const INDEXED_DB_STORE = "ids";

// ─── UUID 생성 ───

function generateUUID(): string {
  const c = window.crypto;
  if (typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  const bytes = new Uint8Array(16);
  c.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ─── 개별 저장소 읽기/쓰기 ─���─

function readLocalStorage(): string | null {
  try {
    return localStorage.getItem(DEVICE_ID_KEY);
  } catch {
    return null;
  }
}

function writeLocalStorage(id: string): void {
  try {
    localStorage.setItem(DEVICE_ID_KEY, id);
  } catch { /* 무시 */ }
}

function readSessionStorage(): string | null {
  try {
    return sessionStorage.getItem(DEVICE_ID_KEY);
  } catch {
    return null;
  }
}

function writeSessionStorage(id: string): void {
  try {
    sessionStorage.setItem(DEVICE_ID_KEY, id);
  } catch { /* 무시 */ }
}

function readCookie(): string | null {
  try {
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${DEVICE_ID_KEY}=([^;]*)`)
    );
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function writeCookie(id: string): void {
  try {
    // 1년 유효
    const maxAge = 365 * 24 * 60 * 60;
    document.cookie = `${DEVICE_ID_KEY}=${id}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch { /* 무시 */ }
}

function readIndexedDB(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(INDEXED_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(INDEXED_DB_STORE)) {
          db.createObjectStore(INDEXED_DB_STORE);
        }
      };
      req.onsuccess = () => {
        try {
          const db = req.result;
          const tx = db.transaction(INDEXED_DB_STORE, "readonly");
          const store = tx.objectStore(INDEXED_DB_STORE);
          const get = store.get(DEVICE_ID_KEY);
          get.onsuccess = () => resolve((get.result as string) ?? null);
          get.onerror = () => resolve(null);
          tx.oncomplete = () => db.close();
        } catch {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function writeIndexedDB(id: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(INDEXED_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(INDEXED_DB_STORE)) {
          db.createObjectStore(INDEXED_DB_STORE);
        }
      };
      req.onsuccess = () => {
        try {
          const db = req.result;
          const tx = db.transaction(INDEXED_DB_STORE, "readwrite");
          const store = tx.objectStore(INDEXED_DB_STORE);
          store.put(id, DEVICE_ID_KEY);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            resolve();
          };
        } catch {
          resolve();
        }
      };
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

// ��── 다중 저장소 Respawning ───

/**
 * 4개 저장소(localStorage, sessionStorage, cookie, IndexedDB)에서
 * ID를 복구하고, 없으면 새로 생성. 모든 저장소에 동기화.
 */
async function getOrCreateDeviceId(): Promise<string> {
  // 동기 저장소에서 먼저 확인
  const fromLS = readLocalStorage();
  const fromSS = readSessionStorage();
  const fromCookie = readCookie();
  const fromIDB = await readIndexedDB();

  // 하나라도 있으면 사용
  const existing = fromLS ?? fromSS ?? fromCookie ?? fromIDB;
  const id = existing ?? generateUUID();

  // 모든 저장소에 동기화 (없는 곳에 복원)
  if (fromLS !== id) writeLocalStorage(id);
  if (fromSS !== id) writeSessionStorage(id);
  if (fromCookie !== id) writeCookie(id);
  if (fromIDB !== id) await writeIndexedDB(id);

  return id;
}

// ─── Browser Fingerprint ───

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(10, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("slush fingerprint", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("slush fingerprint", 4, 17);
    return canvas.toDataURL();
  } catch {
    return "";
  }
}

async function generateFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    String(navigator.hardwareConcurrency ?? ""),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    getCanvasFingerprint(),
  ];
  return sha256(components.join("|||"));
}

// ─���─ Public API ───

/**
 * 하위 호환용: 기존 getDeviceId() 동기 함수.
 * 다중 저장소에서 동기적으로 읽되, 비동기 복원은 별도 수행.
 */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  const existing =
    readLocalStorage() ?? readSessionStorage() ?? readCookie();
  if (existing) return existing;
  const id = generateUUID();
  writeLocalStorage(id);
  writeSessionStorage(id);
  writeCookie(id);
  return id;
}

/**
 * 모든 식별자를 수집하여 반환.
 * - deviceId: 다중 저장소에서 복구/생성된 UUID
 * - fingerprint: 브라우저 특성 기반 SHA-256 해시
 */
export async function collectIdentifiers(): Promise<{
  deviceId: string;
  fingerprint: string;
}> {
  const [deviceId, fingerprint] = await Promise.all([
    getOrCreateDeviceId(),
    generateFingerprint(),
  ]);
  return { deviceId, fingerprint };
}
