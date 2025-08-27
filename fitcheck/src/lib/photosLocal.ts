export type SavedEntry = { url: string; ts: number };

// rough size estimate: base64 length * 3/4
export function approxBytesOfDataUrl(dataUrl: string) {
  const i = dataUrl.indexOf(",");
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

// downscale + jpeg encode to reduce size
export function compressDataUrl(
  dataUrl: string,
  maxW = 1200,
  maxH = 1800,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
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

export function list(key: string): SavedEntry[] {
  try {
    const raw = localStorage.getItem(key);
    const arr: SavedEntry[] = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveAll(key: string, items: SavedEntry[]) {
  localStorage.setItem(key, JSON.stringify(items));
}

export function addUrl(key: string, url: string) {
  const items = list(key);
  const dup = items.some((x) => x.url === url);
  if (dup) return { duplicate: true, items };
  const next = [{ url, ts: Date.now() }, ...items];
  saveAll(key, next);
  return { duplicate: false, items: next };
}

/** add a dataURL; compress on quota error (and precompress if huge) */
export async function addDataUrl(key: string, dataUrl: string) {
  let items = list(key);
  if (items.some((x) => x.url === dataUrl)) {
    return { duplicate: true, url: dataUrl, items };
  }
  // precompress if very large
  if (approxBytesOfDataUrl(dataUrl) > 2_000_000) {
    dataUrl = await compressDataUrl(dataUrl);
  }
  try {
    const next = [{ url: dataUrl, ts: Date.now() }, ...items];
    saveAll(key, next);
    return { duplicate: false, url: dataUrl, items: next, compressed: false };
  } catch {
    const tries = [
      { w: 1000, h: 1500, q: 0.75 },
      { w: 800, h: 1200, q: 0.7 },
      { w: 600, h: 900, q: 0.65 },
    ];
    for (const t of tries) {
      const compact = await compressDataUrl(dataUrl, t.w, t.h, t.q);
      try {
        const next = [{ url: compact, ts: Date.now() }, ...items];
        saveAll(key, next);
        return {
          duplicate: false,
          url: compact,
          items: next,
          compressed: true,
        };
      } catch {}
    }
    throw new Error("Storage is full");
  }
}
