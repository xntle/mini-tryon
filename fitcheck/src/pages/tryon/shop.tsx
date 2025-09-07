import { useState, useRef } from "react";
import {
  useSavedProducts,
  ProductCard,
  useProductSearch,
} from "@shopify/shop-minis-react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiUrl } from "../../lib/api";
import { ChevronDown, ChevronUp } from "lucide-react";

type ShopLocationState = {
  photo?: string;
  tryOnUrl?: string;
};

type LookMeta = {
  productId?: string; // <-- only persist the ID for useProduct()
  product?: string;
  merchant?: string;
  price?: number;
  productImage?: string; // optional fallback for grids
  productUrl?: string; // optional
};

export default function Shop() {
  const { products } = useSavedProducts(); // user's saved products (left as-is)
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

  // ---- SEARCH (recommended items for the carousel) ----
  // Replace "dress" with your seeded query if you wire Preferences -> SearchPlan.
  const {
    products: recommended = [],
    loading: searchLoading,
    hasNextPage,
    fetchMore,
  } = useProductSearch({
    query: "dress",
    first: 20,
  });

  // ---- model helpers (unchanged) ----
  function getSavedModelUrl(): string | null {
    try {
      const cur = localStorage.getItem("fullBodyCurrentUrl");
      if (cur) return cur;
      const raw = localStorage.getItem("fullBodyPhotos");
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) && arr[0]?.url ? arr[0].url : null;
    } catch {
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
    if (isHttpUrl(urlOrDataUrl)) return urlOrDataUrl;
    if (!urlOrDataUrl?.startsWith("data:image/")) {
      throw new Error(
        "Unsupported model image scheme (need HTTPS or data:image/*)"
      );
    }
    const blob = await dataUrlToBlob(urlOrDataUrl);
    const fd = new FormData();
    fd.append(
      "file",
      new File([blob], `model-${Date.now()}.jpg`, { type: blob.type })
    );
    const up = await fetch(apiUrl("/api/fal-upload"), {
      method: "POST",
      body: fd,
    });
    const j = await up.json();
    if (!up.ok) throw new Error(j?.error || "Upload failed");
    return j.url as string;
  }

  // ---- product helpers ----
  function extractGarmentUrl(p: any): string | null {
    return (
      p?.featuredImage?.url ||
      p?.images?.[0]?.src ||
      p?.images?.[0]?.url ||
      p?.image?.src ||
      p?.media?.[0]?.preview?.image?.url ||
      null
    );
  }
  function getLightMeta(p: any): LookMeta {
    const price =
      Number(p?.variants?.[0]?.price) ||
      Number(p?.price) ||
      Number(p?.presentmentPrices?.[0]?.price?.amount) ||
      undefined;
    return {
      productId: p?.id, // <-- GID, e.g. "gid://shopify/Product/123"
      product: p?.title ?? p?.name ?? undefined,
      merchant: p?.vendor ?? p?.brand ?? undefined,
      price,
      productImage: extractGarmentUrl(p) ?? undefined,
      productUrl:
        p?.onlineStoreUrl || (p?.handle ? `/products/${p.handle}` : undefined),
    };
  }

  // tolerant URL plucker
  function pluckFirstUrl(input: any, depth = 0): string | null {
    if (depth > 6 || input == null) return null;
    if (typeof input === "string") {
      const s = input.trim();
      if (/^(https?:)?\/\//i.test(s) || s.startsWith("data:image/")) return s;
      return null;
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
    try {
      const savedModel = getSavedModelUrl();
      if (!savedModel) {
        setErr("Add a full body photo first.");
        navigate("/preferences");
        return;
      }
      const model_image = await ensureHttpsViaUpload(savedModel);

      const res = await fetch(apiUrl("/api/tryon"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_image, garment_image }),
      });

      const contentType = res.headers.get("content-type") || "";
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
        if (
          /^(https?:)?\/\//i.test(direct) ||
          direct.startsWith("data:image/")
        ) {
          outUrl = direct;
        } else {
          const m = textBody.match(/https?:\/\/\S+/);
          if (m) outUrl = m[0];
        }
      }

      if (!outUrl) throw new Error("No URL found in response");
      setBgUrl(outUrl);
    } catch (e: any) {
      console.error("[TRYON] error:", e);
      setErr(e.message || "Try-on failed");
    } finally {
      setLoading(false);
    }
  }

  async function onSelect(p: any) {
    if (inFlightId === p.id) return;

    const isSelecting = !selected[p.id];
    setSelected({ [p.id]: isSelecting });

    if (isSelecting) {
      document.body.classList.add("darkmode");
      const garment = extractGarmentUrl(p);
      if (!garment) return setErr("Couldn't find this product's image.");
      setInFlightId(p.id);
      setLastMeta(getLightMeta(p)); // <-- store only light meta incl productId
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
    navigate("/saved", {
      state: { photo: bgUrl, meta: lastMeta ?? undefined }, // meta contains productId
    });
  }

  // Keep the same empty-state screen, but only show it if there are no saved products AND no recommended results.
  if (!products?.length && !recommended?.length && !searchLoading) {
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
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30">
          <button
            type="button"
            onClick={saveCurrentPhoto}
            className="rounded-full bg-black text-white px-5 py-3 text-sm shadow hover:bg-gray-800"
          >
            Save this look
          </button>
        </div>
      )}

      {/* Tray (handle + carousel live together) */}
      <div
        className={`fixed inset-x-0 bottom-0 z-30 transition-transform duration-300 ${
          trayDown ? "translate-y-full" : "translate-y-0"
        }`}
      >
        {/* Handle that moves with the tray */}
        <button
          type="button"
          onClick={() => setTrayDown((v) => !v)}
          aria-label={
            trayDown ? "Show product carousel" : "Hide product carousel"
          }
          className="absolute -top-10 left-1/2 -translate-x-1/2 rounded-full bg-black/70 text-white px-3 py-2 shadow hover:bg-black/80"
        >
          {/* When tray is DOWN/hidden, show Up chevron to bring it back up */}
          {trayDown ? <ChevronUp /> : <ChevronDown />}
        </button>

        {/* Carousel */}
        <div className="p-4">
          <div className="relative">
            <div
              ref={trackRef}
              className="flex gap-4 overflow-x-auto px-2 pb-2 scroll-smooth snap-x snap-mandatory"
              style={{ scrollbarWidth: "none" } as React.CSSProperties}
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
                  onClick={() => fetchMore()}
                  className="shrink-0 px-3 py-2 rounded-full border text-sm bg-white"
                >
                  Load more
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
