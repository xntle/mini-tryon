// fullBodyStorage.ts
// Shared localStorage-backed photo store used by both You page and the Gallery button
// Mirrors BackstageFullBodyLocal behavior (budget, TTL, compression) so anything added via
// the Gallery button shows up as the first/current item on the You page.

export type SavedItem = { id: string; url: string; ts: number };

export const STORE_KEY = "fullBodyPhotos";
export const CURRENT_KEY = "fullBodyCurrentUrl";

// ---------- CONFIG (keep in sync with You page) ----------
const BYTE_BUDGET = 4_500_000; // ~4.5MB total budget in localStorage
const MAX_ITEM_BYTES = 1_500_000; // max bytes per image after compress
const TTL_DAYS = 60; // evict older than N days
export const COMPRESS = {
  maxW: 1280,
  maxH: 1920,
  maxMP: 3.2,
  byteCeil: MAX_ITEM_BYTES,
};

// ---------- SMALL UTILS ----------
const storageUsable = () => {
  try {
    const k = "__probe__" + Math.random();
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
};
const approxBytesOfDataUrl = (u: string) => {
  const i = u.indexOf(",");
  const b64 = i >= 0 ? u.slice(i + 1) : u;
  return Math.floor((b64.length * 3) / 4);
};
const estimateItemsBytes = (items: SavedItem[]) =>
  2 + items.reduce((n, it) => n + 64 + approxBytesOfDataUrl(it.url), 0);
const dropOld = (items: SavedItem[]) => {
  const cutoff = Date.now() - TTL_DAYS * 864e5;
  return items.filter((i) => i.ts >= cutoff).sort((a, b) => b.ts - a.ts);
};
const trimToBudget = (items: SavedItem[], budget = BYTE_BUDGET) => {
  const arr = dropOld([...items]);
  while (arr.length && estimateItemsBytes(arr) > budget) arr.pop();
  return arr;
};

// ---------- ROBUST COMPRESSOR (same as You page) ----------
export async function compressAnyToDataUrl(
  input: File | string,
  {
    maxW,
    maxH,
    maxMP,
    byteCeil,
  }: { maxW: number; maxH: number; maxMP: number; byteCeil: number }
): Promise<string> {
  const toBlob = async (): Promise<Blob> => {
    if (typeof input !== "string") return input;
    return await (await fetch(input)).blob();
  };
  const blob = await toBlob();
  const mime = (blob.type || "image/jpeg").toLowerCase();

  let src: ImageBitmap | HTMLImageElement;
  try {
    // @ts-ignore
    src = await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode().catch(
      () =>
        new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = rej;
        })
    );
    src = img;
  }
  const sw = (src as any).width,
    sh = (src as any).height;

  const mp = (sw * sh) / 1e6;
  const scaleMP = Math.min(1, Math.sqrt(maxMP / Math.max(mp, maxMP)));
  const r = Math.min(maxW / sw, maxH / sh, 1) * scaleMP;
  const tw = Math.max(1, Math.round(sw * r));
  const th = Math.max(1, Math.round(sh * r));

  const step = (w: number, h: number, inCanvas?: HTMLCanvasElement) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    if (/png|webp|avif/i.test(mime)) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
    }
    const srcEl = inCanvas ?? (src as any);
    const sw2 = inCanvas ? inCanvas.width : sw;
    const sh2 = inCanvas ? inCanvas.height : sh;
    ctx.drawImage(srcEl, 0, 0, sw2, sh2, 0, 0, w, h);
    return c;
  };
  const mid =
    sw > tw * 2 && sh > th * 2
      ? step(Math.round(sw / 2), Math.round(sh / 2))
      : null;
  const canvas = step(tw, th, mid ?? undefined);

  for (const q of [0.82, 0.74, 0.68]) {
    const out = canvas.toDataURL("image/jpeg", q);
    if (approxBytesOfDataUrl(out) <= byteCeil) return out;
  }
  const c2 = step(
    Math.max(320, Math.round(tw * 0.88)),
    Math.max(320, Math.round(th * 0.88)),
    canvas
  );
  for (const q of [0.7, 0.64, 0.6]) {
    const out = c2.toDataURL("image/jpeg", q);
    if (approxBytesOfDataUrl(out) <= byteCeil) return out;
  }
  return c2.toDataURL("image/jpeg", 0.6);
}

// ---------- Store API ----------
export function loadAll(): SavedItem[] {
  try {
    const raw = storageUsable() ? localStorage.getItem(STORE_KEY) : null;
    const arr: any[] = raw ? JSON.parse(raw) : [];
    const withIds: SavedItem[] = arr.map((x) =>
      "id" in x
        ? x
        : { id: crypto.randomUUID(), url: x.url, ts: x.ts ?? Date.now() }
    );
    return trimToBudget(withIds);
  } catch {
    return [];
  }
}

export function saveAll(next: SavedItem[], nextCurrent?: string | null) {
  if (!storageUsable()) throw new Error("localStorage unavailable");
  const trimmed = trimToBudget(next);
  const links = trimmed.map((item) => ({
    id: item.id,
    url: item.url,
    ts: item.ts,
  }));
  localStorage.setItem(STORE_KEY, JSON.stringify(links));

  const cur = nextCurrent !== undefined ? nextCurrent : getCurrent();
  const chosen =
    (cur && trimmed.some((x) => x.url === cur) ? cur : null) ??
    trimmed[0]?.url ??
    null;
  if (chosen) localStorage.setItem(CURRENT_KEY, chosen);
  else localStorage.removeItem(CURRENT_KEY);
}

export function getCurrent(): string | null {
  try {
    const cur = localStorage.getItem(CURRENT_KEY);
    return cur ?? null;
  } catch {
    return null;
  }
}

export function getCurrentOrFirst(): string | null {
  const cur = getCurrent();
  if (cur) return cur;
  const items = loadAll();
  return items[0]?.url ?? null;
}

/** Add an image (File or dataURL) with You-page compression/budget + set as current.
 * Returns the final stored dataURL (maybe compressed). */
export async function addWithBudgetAndSetCurrent(
  input: File | string
): Promise<string> {
  const existing = loadAll();
  let dataUrl: string;
  if (typeof input === "string") {
    dataUrl = input;
  } else {
    dataUrl = await compressAnyToDataUrl(input, COMPRESS);
  }

  // de-dupe by URL match
  if (existing.some((x) => x.url === dataUrl)) {
    saveAll(existing, dataUrl);
    return dataUrl;
  }

  // ensure per-item cap
  if (approxBytesOfDataUrl(dataUrl) > COMPRESS.byteCeil) {
    dataUrl = await compressAnyToDataUrl(dataUrl, COMPRESS);
  }

  const rec: SavedItem = {
    id: crypto.randomUUID(),
    url: dataUrl,
    ts: Date.now(),
  };
  const next = trimToBudget([rec, ...existing]);
  saveAll(next, rec.url);
  return rec.url;
}
