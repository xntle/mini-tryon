import { useState, useRef, useEffect } from "react";
import {
  useSavedProducts,
  ProductCard,
  useProductSearch,
} from "@shopify/shop-minis-react";
import { useNavigate, useLocation } from "react-router-dom";
// ⛔️ removed: import { apiUrl } from "../../lib/api";

type ShopLocationState = {
  photo?: string;
  tryOnUrl?: string;
};

type LookMeta = {
  productId?: string;
  product?: string;
  merchant?: string;
  price?: number;
  productImage?: string;
  productUrl?: string;
};

/* ---------------------------
   HARDCODED API BASE
---------------------------- */
const API_BASE = "https://mini-tryon-production.up.railway.app"; // <-- your Railway URL
const api = (path: string) =>
  `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

/* ---------------------------
   DEBUG helpers + log bridge
---------------------------- */
const DEBUG =
  (typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("debug")) ||
  // @ts-ignore
  !!(typeof import.meta !== "undefined" && import.meta?.env?.DEV);

const LOG_EVENT = "shop:log";

type LogItem = { ts: number; msg: string };

function preview(val?: string | null, n = 120) {
  if (!val) return val as any;
  if (typeof val === "string" && val.startsWith("data:image/")) {
    return `data:image/... len=${val.length}`;
  }
  const s = String(val);
  return s.length > n ? s.slice(0, n) + "..." : s;
}

function fmtVal(v: any): string {
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function emitLog(...args: any[]) {
  try {
    const msg = args.map(fmtVal).join(" ");
    const detail: LogItem = { ts: Date.now(), msg };
    window.dispatchEvent(new CustomEvent(LOG_EVENT as any, { detail }));
  } catch {}
}

function dlog(...args: any[]) {
  if (DEBUG) console.log("[Shop]", ...args);
  emitLog("[Shop]", ...args);
}

function dgroup(label: string, fn: () => void) {
  if (DEBUG) console.group(label);
  emitLog(`\n▼ ${label}`);
  try {
    fn();
  } finally {
    if (DEBUG) console.groupEnd();
    emitLog(`▲ end: ${label}\n`);
  }
}

/* ---------------------------
           Component
---------------------------- */
export default function Shop() {
  const { products } = useSavedProducts();
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: ShopLocationState };

  const [lastMeta, setLastMeta] = useState<LookMeta | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bgUrl, setBgUrl] = useState<string | null>(
    state?.tryOnUrl ?? state?.photo ?? null
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [inFlightId, setInFlightId] = useState<string | null>(null);
  const [trayDown, setTrayDown] = useState(false);

  // Debug console UI state + sink
  const [debugOpen, setDebugOpen] = useState<boolean>(DEBUG);
  const [logs, setLogs] = useState<LogItem[]>([]);
  useEffect(() => {
    const onLog = (e: Event) => {
      const ev = e as CustomEvent<LogItem>;
      setLogs((prev) => {
        const next = [...prev, ev.detail];
        return next.length > 200 ? next.slice(next.length - 200) : next;
      });
    };
    window.addEventListener(LOG_EVENT, onLog as any);
    return () => window.removeEventListener(LOG_EVENT, onLog as any);
  }, []);

  // Startup debug
  useEffect(() => {
    dgroup("BOOT", () => {
      dlog("API_BASE =", API_BASE);
      dlog("state.photo =", preview(state?.photo));
      dlog("state.tryOnUrl =", preview(state?.tryOnUrl));
    });
  }, []);

  // ---- SEARCH (recommended items for the carousel) ----
  const {
    products: recommended = [],
    loading: searchLoading,
    hasNextPage,
    fetchMore,
  } = useProductSearch({
    query: "dress",
    first: 20,
  });

  useEffect(() => {
    dgroup("SEARCH", () => {
      dlog("loading =", searchLoading);
      dlog("recommended.count =", recommended?.length || 0);
      dlog("hasNextPage =", !!hasNextPage);
    });
  }, [searchLoading, recommended?.length, hasNextPage]);

  // ---- model helpers (unchanged) ----
  function getSavedModelUrl(): string | null {
    try {
      const cur = localStorage.getItem("fullBodyCurrentUrl");
      if (cur) return cur;
      const raw = localStorage.getItem("fullBodyPhotos");
      const arr = raw ? JSON.parse(raw) : [];
      const url = Array.isArray(arr) && arr[0]?.url ? arr[0].url : null;
      dlog("getSavedModelUrl() ->", preview(url));
      return url;
    } catch (e) {
      dlog("getSavedModelUrl() error:", e);
      return null;
    }
  }
  const isHttpUrl = (s?: string | null) => !!s && /^https?:\/\//i.test(s);
  async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const [meta, b64] = dataUrl.split(",");
    const mime = /data:(.*?);base64/.exec(meta)?.[1] || "image/jpeg";
    return new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], {
      type: mime,
    });
  }
  function fetchWithTimeout(
    input: RequestInfo | URL,
    init: RequestInit = {},
    ms = 15000
  ) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), ms);
    return fetch(input, { ...init, signal: ctrl.signal }).finally(() =>
      clearTimeout(id)
    );
  }
  async function ensureHttpsViaUpload(urlOrDataUrl: string): Promise<string> {
    dgroup("UPLOAD ensureHttpsViaUpload()", () => {
      dlog("input =", preview(urlOrDataUrl));
    });

    if (isHttpUrl(urlOrDataUrl)) {
      dlog("already https, skip upload");
      return urlOrDataUrl;
    }
    if (!urlOrDataUrl?.startsWith("data:image/")) {
      throw new Error(
        "Unsupported model image scheme (need HTTPS or data:image/*)"
      );
    }

    console.time("[Shop] fal-upload");
    const blob = await dataUrlToBlob(urlOrDataUrl);
    const fd = new FormData();

    fd.append("file", blob, `model-${Date.now()}.jpg`);

    const uploadTo = api("/api/fal-upload");
    dlog("POST", uploadTo);

    try {
      const up = await fetchWithTimeout(
        uploadTo,
        { method: "POST", body: fd },
        15000
      );
      dlog("fal-upload response arrived, status =", up.status);
      const j = await up.json().catch(() => ({}));
      dlog("fal-upload json =", j);
      console.timeEnd("[Shop] fal-upload");

      if (!up.ok) throw new Error(j?.error || `Upload failed (${up.status})`);
      if (!j?.url) throw new Error("Upload returned no url");

      return j.url as string;
    } catch (e: any) {
      dlog("fal-upload error =", e?.name, e?.message);
      throw e;
    }
  }

  // ---- product helpers ----
  function extractGarmentUrl(p: any): string | null {
    const u =
      p?.featuredImage?.url ||
      p?.images?.[0]?.src ||
      p?.images?.[0]?.url ||
      p?.image?.src ||
      p?.media?.[0]?.preview?.image?.url ||
      null;
    dlog("extractGarmentUrl(product.id=", p?.id, ") ->", u);
    return u;
  }
  function getLightMeta(p: any): LookMeta {
    const price =
      Number(p?.variants?.[0]?.price) ||
      Number(p?.price) ||
      Number(p?.presentmentPrices?.[0]?.price?.amount) ||
      undefined;
    const meta: LookMeta = {
      productId: p?.id,
      product: p?.title ?? p?.name ?? undefined,
      merchant: p?.vendor ?? p?.brand ?? undefined,
      price,
      productImage: extractGarmentUrl(p) ?? undefined,
      productUrl:
        p?.onlineStoreUrl || (p?.handle ? `/products/${p.handle}` : undefined),
    };
    dlog("getLightMeta ->", meta);
    return meta;
  }

  // tolerant URL plucker
  function pluckFirstUrl(input: any, depth = 0): string | null {
    if (depth > 6 || input == null) return null;
    if (typeof input === "string") {
      const s = input.trim();
      return /^(https?:)?\/\//i.test(s) || s.startsWith("data:image/")
        ? s
        : null;
    }
    if (Array.isArray(input)) {
      for (const v of input) {
        const u = pluckFirstUrl(v, depth + 1);
        if (u) return u;
      }
      return null;
    }
    if (typeof input === "object") {
      const priority = [
        "url",
        "image_url",
        "image",
        "output",
        "result",
        "data",
        "images",
        "items",
        "file",
        "files",
      ];
      for (const k of priority) {
        if (k in input) {
          const u = pluckFirstUrl((input as any)[k], depth + 1);
          if (u) return u;
        }
      }
      for (const v of Object.values(input)) {
        const u = pluckFirstUrl(v, depth + 1);
        if (u) return u;
      }
    }
    return null;
  }

  async function runTryOnWithProduct(garment_image: string) {
    setLoading(true);
    setErr(null);
    dgroup("TRYON: begin", () => {
      dlog("garment_image =", garment_image);
    });
    try {
      const savedModel = getSavedModelUrl();
      if (!savedModel) {
        dlog("NO SAVED MODEL → redirect to /preferences");
        setErr("Add a full body photo first.");
        navigate("/preferences");
        return;
      }

      dlog("normalizing model_image…");
      const model_image = await ensureHttpsViaUpload(savedModel);
      dlog("model_image (final) =", model_image);

      const endpoint = api("/api/tryon"); // <-- hardcoded base
      const payload = { model_image, garment_image };
      dlog("POST", endpoint, "body =", {
        model_image: preview(model_image),
        garment_image: preview(garment_image),
      });

      console.time("[Shop] /api/tryon");
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const contentType = res.headers.get("content-type") || "";
      dlog("tryon status =", res.status, "content-type =", contentType);

      let data: any = null;
      let textBody: string | null = null;
      if (contentType.includes("application/json")) {
        try {
          data = await res.json();
        } catch {
          textBody = await res.text();
        }
      } else {
        textBody = await res.text();
      }
      console.timeEnd("[Shop] /api/tryon");
      dlog("tryon response json =", data ?? "(none)");
      if (textBody) dlog("tryon response text =", preview(textBody, 200));

      if (!res.ok) {
        const serverMsg =
          (data && (data.error || data.message)) ||
          (textBody && textBody.slice(0, 200));
        throw new Error(serverMsg || `Request failed (${res.status})`);
      }

      let outUrl: string | null = null;
      if (data) outUrl = pluckFirstUrl(data);
      if (!outUrl && textBody) {
        const direct = textBody.trim();
        if (/^(https?:)?\/\//i.test(direct) || direct.startsWith("data:image/"))
          outUrl = direct;
        else {
          const m = textBody.match(/https?:\/\/\S+/);
          if (m) outUrl = m[0];
        }
      }

      dlog("derived outUrl =", outUrl);
      if (!outUrl) throw new Error("No URL found in response");
      setBgUrl(outUrl);
    } catch (e: any) {
      console.error("[TRYON] error (full):", e);
      setErr(
        "Sorry, this item isn’t compatible right now. Try a different one."
      );
    } finally {
      setLoading(false);
    }
  }

  async function onSelect(p: any) {
    if (inFlightId === p.id) return;
    dlog("onSelect product.id =", p?.id);

    const isSelecting = !selected[p.id];
    setSelected({ [p.id]: isSelecting });

    if (isSelecting) {
      document.body.classList.add("darkmode");
      const garment = extractGarmentUrl(p);
      if (!garment) {
        setErr("Couldn't find this product's image.");
        dlog("No garment image for product.id =", p?.id);
        return;
      }
      setInFlightId(p.id);
      setLastMeta(getLightMeta(p));
      await runTryOnWithProduct(garment);
      setInFlightId(null);
    } else {
      document.body.classList.remove("darkmode");
      setBgUrl(state?.tryOnUrl ?? state?.photo ?? null);
      setLastMeta(null);
    }
  }

  function saveCurrentPhoto() {
    if (!bgUrl) return;
    dlog("saveCurrentPhoto", { url: bgUrl, meta: lastMeta });
    navigate("/saved", {
      state: { photo: bgUrl, meta: lastMeta ?? undefined },
    });
  }

  if (!products?.length && !recommended?.length && !searchLoading) {
    dlog("Empty state: no saved products and no recommended results");
    return (
      <div className="min-h-dvh flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold mb-2">No saved items yet</h1>
          <p className="text-gray-600">
            Save products you like, then come back to try them on.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-6 px-4 max-w-xl mx-auto">
      {bgUrl && (
        <div className="fixed inset-0 z-0">
          <img
            src={bgUrl}
            alt="Your selected look"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {loading && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30 rounded-full bg-black/70 text-white px-4 py-2 text-sm">
          Generating try-on…
        </div>
      )}
      {err && (
        <div className="fixed top-4 right-4 z-30 rounded-md bg-red-600 text-white px-3 py-2 text-sm shadow">
          {err}
        </div>
      )}

      {bgUrl && !loading && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={saveCurrentPhoto}
            className="rounded-full bg-black text-white px-5 py-3 text-sm shadow hover:bg-gray-800"
          >
            Save this look
          </button>
          <p>{bgUrl}</p>
        </div>
      )}

      <div
        className={`fixed inset-x-0 bottom-0 z-30 transition-transform duration-300 mb-18 ${
          trayDown ? "translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="p-4">
          {!trayDown && (
            <div className="flex items-center justify-center mb-2">
              <button
                type="button"
                onClick={() => {
                  dlog("Tray: hide");
                  setTrayDown(true);
                }}
                className="rounded-full bg-black/70 text-white px-3 py-1.5 text-sm shadow hover:bg-black/80"
              >
                Hide
              </button>
            </div>
          )}

          <div className="relative">
            <div
              ref={trackRef}
              className="flex gap-4 overflow-x-auto px-2 pb-2 scroll-smooth snap-x snap-mandatory"
              style={{ scrollbarWidth: "none" } as React.CSSProperties}
              onScroll={(e) =>
                dlog(
                  "carousel scrollLeft =",
                  (e.target as HTMLDivElement).scrollLeft
                )
              }
            >
              {recommended?.map((p: any) => {
                const isSelected = !!selected[p.id];
                return (
                  <div
                    key={p.id}
                    className={`relative snap-center shrink-0 rounded-2xl p-2 overflow-hidden transition-colors ${
                      isSelected
                        ? "border-4 border-purple-500 bg-white"
                        : "bg-white border border-gray-200"
                    }`}
                    style={{ width: 200, minWidth: 200 }}
                  >
                    <ProductCard product={p} />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(p);
                      }}
                      className="absolute top-2 right-2 z-20 rounded-full bg-black text-white px-3 py-1 text-xs shadow hover:bg-gray-800"
                      aria-pressed={isSelected}
                    >
                      {isSelected ? "Selected" : "Try on"}
                    </button>
                  </div>
                );
              })}
              {hasNextPage && fetchMore && (
                <button
                  onClick={() => {
                    dlog("fetchMore()");
                    fetchMore();
                  }}
                  className="shrink-0 px-3 py-2 rounded-full border text-sm bg-white"
                >
                  Load more
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {trayDown && (
        <div className="fixed inset-x-0 bottom-0 z-30 mb-20 flex justify-center pb-4">
          <button
            type="button"
            onClick={() => {
              dlog("Tray: show");
              setTrayDown(false);
            }}
            className="rounded-full bg-black/70 text-white px-4 py-2 text-sm shadow hover:bg-black/80"
          >
            Show recommendations
          </button>
        </div>
      )}

      {/* Floating Debug Console */}
      {debugOpen ? (
        <div className="fixed bottom-3 right-3 z-50 w-[min(92vw,520px)] max-h-[48vh] bg-zinc-900/90 text-zinc-100 border border-zinc-700 rounded-xl backdrop-blur-md shadow-2xl flex flex-col">
          <div className="px-3 py-2 border-b border-zinc-700 flex items-center gap-2">
            <span className="text-xs font-semibold">Debug</span>
            <span className="text-[10px] text-zinc-400">API: {API_BASE}</span>
            <span className="ml-auto" />
            <button
              className="text-[11px] px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
              onClick={() => setLogs([])}
            >
              Clear
            </button>
            <button
              className="text-[11px] px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
              onClick={() => {
                const txt = logs
                  .map(
                    (l) => `[${new Date(l.ts).toLocaleTimeString()}] ${l.msg}`
                  )
                  .join("\n");
                navigator.clipboard.writeText(txt).catch(() => {});
              }}
            >
              Copy
            </button>
            <button
              className="text-[13px] px-2 py-1 rounded hover:bg-zinc-800"
              onClick={() => setDebugOpen(false)}
              aria-label="Close debug"
              title="Close"
            >
              ×
            </button>
          </div>
          <div className="p-2 text-[11px] overflow-auto leading-snug whitespace-pre-wrap font-mono">
            {logs.length === 0 ? (
              <div className="text-zinc-400">No logs yet…</div>
            ) : (
              logs.map((l, i) => (
                <div key={i}>
                  <span className="text-zinc-500">
                    [{new Date(l.ts).toLocaleTimeString()}]
                  </span>{" "}
                  {l.msg}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <button
          className="fixed bottom-3 right-3 z-50 h-9 w-9 rounded-full bg-black/70 text-white grid place-items-center shadow-lg"
          onClick={() => setDebugOpen(true)}
          title="Open debug"
        >
          🐞
        </button>
      )}
    </div>
  );
}
