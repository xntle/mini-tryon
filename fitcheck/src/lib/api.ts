// src/lib/api.ts

/**
 * Backend API base URL
 * NOTE: Shop Minis don't support .env files - hardcode your backend URL here
 * Reference: https://shopify.dev/docs/api/shop-minis/custom-backend
 */
const API_BASE_URL = "https://mini-tryon-production.up.railway.app";

export function apiUrl(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${p}`;
}
