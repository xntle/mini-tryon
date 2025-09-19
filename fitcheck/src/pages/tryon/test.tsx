import { useState, useRef, useEffect } from "react";
import {
  useSavedProducts,
  ProductCard,
  useProductSearch,
} from "@shopify/shop-minis-react";
import { useNavigate, useLocation } from "react-router";
import { apiUrl } from "../../lib/api";

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

// ---- DEBUG helpers ----
const DEBUG =
  (typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("debug")) ||
  // @ts-ignore
  !!(typeof import.meta !== "undefined" && import.meta?.env?.DEV);

function preview(val?: string | null, n = 120) {
  if (!val) return val as any;
  if (val.startsWith("data:image/")) return `data:image/... len=${val.length}`;
  return val.length > n ? val.slice(0, n) + "..." : val;
}
function dlog(...args: any[]) {
  if (DEBUG) console.log("[Shop]", ...args);
}
function dgroup(label: string, fn: () => void) {
  if (!DEBUG) return fn();
  console.group(label);
  try {
    fn();
  } finally {
    console.groupEnd();
  }
}

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
  const [showResultCard, setShowResultCard] = useState(false); // NEW: toggle URL card

  // Startup debug
  useEffect(() => {
    // @ts-ignore
    const base = import.meta?.env?.VITE_API_BASE;
    dgroup("BOOT", () => {
      dlog("VITE_API_BASE =", base || "(empty; using Vite proxy in dev)");
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

  // ---- model helpers ----
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
  async function ensureHttpsViaUpload(urlOrDataUrl: string): Promise<string> {
    dgroup("UPLOAD ensureHttpsViaUpload()", () => {
      dlog("input =", preview(urlOrDataUrl));
    });
    if (isHttpUrl(urlOrDataUrl)) {
      dlog("already https, skip upload");
      return urlOrDataUrl;
    }
    if (!urlOrDataUrl?.startsWith("data:image/")) {
      dlog("unsupported scheme; throwing");
      throw new Error(
        "Unsupported model image scheme (need HTTPS or data:image/*)"
      );
    }
    console.time("[Shop] fal-upload");
    const blob = await dataUrlToBlob(urlOrDataUrl);
    const fd = new FormData();
    fd.append(
      "file",
      new File([blob], `model-${Date.now()}.jpg`, { type: blob.type })
    );
    const uploadTo = apiUrl("/api/fal-upload");
    dlog("POST", uploadTo);
    const up = await fetch(uploadTo, { method: "POST", body: fd });
    const j = await up.json();
    console.timeEnd("[Shop] fal-upload");
    dlog("fal-upload status =", up.status, "json =", j);
    if (!up.ok) throw new Error(j?.error || "Upload failed");
    return j.url as string;
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

  // Helpers for the URL card
  function openInNewTab() {
    if (!bgUrl) return;
    window.open(bgUrl, "_blank", "noopener,noreferrer");
  }
  async function copyResultUrl() {
    if (!bgUrl) return;
    try {
      await navigator.clipboard.writeText(bgUrl);
      dlog("Copied result URL to clipboard");
    } catch (e) {
      dlog("Copy failed:", e);
    }
  }
  function downloadResult() {
    if (!bgUrl) return;
    const a = document.createElement("a");
    a.href = bgUrl;
    a.download = "tryon.jpg";
    document.body.appendChild(a);
    a.click();
    a.remove();
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

      const endpoint = apiUrl("/api/tryon");
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
      setShowResultCard(true); // show URL card after success
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
      setShowResultCard(false);
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
            onLoad={() => dlog("[IMG] loaded", preview(bgUrl))}
            onError={() => dlog("[IMG] error", preview(bgUrl))}
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
        <>
          {/* Save button (unchanged) */}
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30">
            <button
              type="button"
              onClick={saveCurrentPhoto}
              className="rounded-full bg-black text-white px-5 py-3 text-sm shadow hover:bg-gray-800"
            >
              Save this look
            </button>
          </div>

          {/* NEW: Result URL card (clickable + copy + open + download) */}
          {showResultCard && (
            <div className="fixed top-20 right-4 z-30 max-w-[80vw]">
              <div className="rounded-xl bg-white/95 backdrop-blur border border-gray-200 shadow-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Result URL</div>
                <a
                  href={bgUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-700 underline break-all"
                >
                  {bgUrl}
                </a>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={copyResultUrl}
                    className="px-3 py-1.5 rounded-full border text-xs"
                  >
                    Copy
                  </button>
                  <button
                    onClick={openInNewTab}
                    className="px-3 py-1.5 rounded-full border text-xs"
                  >
                    Open
                  </button>
                  <button
                    onClick={downloadResult}
                    className="px-3 py-1.5 rounded-full border text-xs"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => setShowResultCard(false)}
                    className="px-3 py-1.5 rounded-full border text-xs"
                  >
                    Hide
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tray (Hide button lives inside. When hidden, show a bottom "Show" button) */}
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

          {/* Carousel */}
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
    </div>
  );
}
