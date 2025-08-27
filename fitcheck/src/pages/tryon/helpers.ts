// helpers.ts
export function getSavedModelUrl(): string | null {
  try {
    const cur = localStorage.getItem("fullBodyCurrentUrl");
    if (cur) return cur;
    const raw = localStorage.getItem("fullBodyPhotos");
    const arr = raw ? JSON.parse(raw) : [];
    return arr?.[0]?.url ?? null;
  } catch {
    return null;
  }
}

export function isHttpUrl(s?: string | null) {
  return !!s && /^https?:\/\//i.test(s);
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const [meta, b64] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(meta)?.[1] || "image/jpeg";
  return new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], {
    type: mime,
  });
}

export async function uploadToFal(urlOrDataUrl: string): Promise<string> {
  if (isHttpUrl(urlOrDataUrl)) return urlOrDataUrl; // already public
  if (!urlOrDataUrl?.startsWith("data:image/")) {
    throw new Error("Unsupported image scheme. Provide HTTPS or data:image/*");
  }
  const blob = await dataUrlToBlob(urlOrDataUrl);
  const fd = new FormData();
  fd.append(
    "file",
    new File([blob], `model-${Date.now()}.jpg`, { type: blob.type })
  );
  const r = await fetch("/api/fal-upload", {
    method: "POST",
    body: fd,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error || "Upload failed");
  return j.url as string; // public HTTPS
}
