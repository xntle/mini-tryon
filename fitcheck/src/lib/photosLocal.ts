export type SavedEntry = { url: string; ts: number };

// knobs
const BYTE_BUDGET = 4_500_000; // keep under ~5MB origin cap
const MAX_ITEM_BYTES = 2_500_000; // any single photo (post-compress)
const TTL_DAYS = 60; // optional TTL

// base64 length * 3/4
export function approxBytesOfDataUrl(dataUrl: string) {
  const i = dataUrl.indexOf(",");
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

// downscale + jpeg encode
export function compressDataUrl(
  dataUrl: string,
  maxW = 1200,
  maxH = 1800,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      const r = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width * r);
      const h = Math.round(img.height * r);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// ---- NEW: eviction + guards ----
function storageUsable() {
  try {
    const k = "__probe__" + Math.random();
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

function estimateItemsBytes(items: SavedEntry[]) {
  let total = 2;
  for (const it of items) total += 64 + approxBytesOfDataUrl(it.url);
  return total;
}

function dropOld(items: SavedEntry[]) {
  const cutoff = Date.now() - TTL_DAYS * 24 * 60 * 60 * 1000;
  return items.filter((it) => it.ts >= cutoff).sort((a, b) => b.ts - a.ts);
}

function trimToBudget(items: SavedEntry[], budget = BYTE_BUDGET) {
  const arr = dropOld([...items]); // newest first
  while (arr.length && estimateItemsBytes(arr) > budget) arr.pop(); // evict oldest
  return arr;
}

// ---- unchanged API (with safe internals) ----
export function list(key: string): SavedEntry[] {
  try {
    const raw = storageUsable() ? localStorage.getItem(key) : null;
    const arr: SavedEntry[] = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// IMPORTANT: evict BEFORE writing to avoid QuotaExceededError
export function saveAll(key: string, items: SavedEntry[]) {
  if (!storageUsable()) throw new Error("localStorage unavailable");
  const trimmed = trimToBudget(items, BYTE_BUDGET);
  localStorage.setItem(key, JSON.stringify(trimmed));
}

export function addUrl(key: string, url: string) {
  const items = list(key);
  if (items.some((x) => x.url === url)) return { duplicate: true, items };
  const next = trimToBudget([{ url, ts: Date.now() }, ...items], BYTE_BUDGET);
  saveAll(key, next);
  return {
    duplicate: false,
    items: next,
    evicted: items.length !== next.length,
  };
}

/** add a dataURL; precompress if huge, evict before save, step down if needed */
export async function addDataUrl(key: string, dataUrl: string) {
  let items = list(key);
  if (items.some((x) => x.url === dataUrl)) {
    return { duplicate: true, url: dataUrl, items };
  }

  // precompress big inputs
  if (approxBytesOfDataUrl(dataUrl) > 2_000_000) {
    dataUrl = await compressDataUrl(dataUrl);
  }

  // single-item hard cap
  if (approxBytesOfDataUrl(dataUrl) > MAX_ITEM_BYTES) {
    // try step-down ladder
    const steps = [
      { w: 1000, h: 1500, q: 0.75 },
      { w: 800, h: 1200, q: 0.7 },
      { w: 600, h: 900, q: 0.65 },
      { w: 480, h: 720, q: 0.6 },
    ];
    for (const s of steps) {
      const compact = await compressDataUrl(dataUrl, s.w, s.h, s.q);
      if (approxBytesOfDataUrl(compact) <= MAX_ITEM_BYTES) {
        dataUrl = compact;
        break;
      }
    }
    if (approxBytesOfDataUrl(dataUrl) > MAX_ITEM_BYTES) {
      throw new Error("Single image too large for local storage budget");
    }
  }

  // evict to fit total budget, then write
  const next = trimToBudget(
    [{ url: dataUrl, ts: Date.now() }, ...items],
    BYTE_BUDGET
  );
  saveAll(key, next);
  return {
    duplicate: false,
    url: dataUrl,
    items: next,
    compressed: true,
    evicted: items.length !== next.length,
  };
}
