export type FitItem = {
  lookId: string;
  url: string;
  ts: number;
  favorite?: boolean;
  productId?: string;
  product?: string;
  merchant?: string;
  price?: number;
  productImage?: string;
  productUrl?: string;
};

export const FITS_KEY = "fitVaultLooks"; // different key from photo store

function parse(raw: string | null): FitItem[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x: any) => x && x.url) : [];
  } catch {
    return [];
  }
}

export function loadLooks(): FitItem[] {
  const items = parse(localStorage.getItem(FITS_KEY));
  // ensure lookIds
  return items.map((x) => ({ ...x, lookId: x.lookId || crypto.randomUUID() }));
}

export function saveLooks(items: FitItem[]) {
  localStorage.setItem(FITS_KEY, JSON.stringify(items));
}

export function addLook(url: string, meta: Partial<FitItem> = {}): FitItem {
  const items = loadLooks();
  const existing = items.find((x) => x.url === url);
  if (existing) {
    // merge light meta forward (don't overwrite favorite)
    Object.assign(existing, { ...meta, favorite: existing.favorite });
    saveLooks(items);
    return existing;
  }
  const rec: FitItem = {
    lookId: crypto.randomUUID(),
    url,
    ts: Date.now(),
    favorite: !!meta.favorite,
    productId: meta.productId,
    product: meta.product,
    merchant: meta.merchant,
    price: meta.price,
    productImage: meta.productImage,
    productUrl: meta.productUrl,
  };
  const next = [rec, ...items];
  saveLooks(next);
  return rec;
}

export function removeLook(idOrUrl: string) {
  const items = loadLooks().filter(
    (x) => x.lookId !== idOrUrl && x.url !== idOrUrl
  );
  saveLooks(items);
}

export function toggleFavorite(idOrUrl: string) {
  const items = loadLooks().map((x) =>
    x.lookId === idOrUrl || x.url === idOrUrl
      ? { ...x, favorite: !x.favorite }
      : x
  );
  saveLooks(items);
}
