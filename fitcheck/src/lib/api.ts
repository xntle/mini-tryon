// src/lib/api.ts
const RAW_BASE = (import.meta.env.VITE_API_BASE || "")
  .trim()
  .replace(/\/+$/, "");

function normalizeBase(b: string) {
  if (!b) return "";
  return /^https?:\/\//i.test(b) ? b : `https://${b}`; // add https if missing
}

export function apiUrl(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = normalizeBase(RAW_BASE);
  return base ? `${base}${p}` : p; // dev: returns /api/..., prod: https://host/api/...
}
