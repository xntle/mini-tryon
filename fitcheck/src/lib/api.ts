// src/lib/api.ts
export const API_BASE = "mini-tryon-production.up.railway.app";
// In dev, leave VITE_API_BASE empty and use a Vite proxy.
// In prod, set VITE_API_BASE to your Railway URL, e.g. https://fitcheck-api.up.railway.app

export const apiUrl = (path: string) => `${API_BASE}${path}`;
