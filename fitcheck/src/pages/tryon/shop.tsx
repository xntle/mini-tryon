import { useState, useRef, useMemo, useEffect } from "react";
import {
  useSavedProducts,
  useProductSearch,
  useRecommendedProducts,
  ProductCard,
} from "@shopify/shop-minis-react";
import { useNavigate, useLocation } from "react-router";
import { apiUrl } from "../../lib/api";
import { addLook } from "../../lib/tryOnStorage";
import LoadingStitchBar from "../../components/LoadingStitchBar";

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

const API_BASE = import.meta.env.VITE_API_BASE;

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
  const { products: savedProducts } = useSavedProducts();
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: ShopLocationState };

  // Get user preferences for search
  const userPreferences = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("userPreferences") || "{}");
    } catch {
      return {
        Gender: ["Women"],
        Occasion: ["Wedding/Engagement"],
        Vibe: ["Elegant & Classy"],
        "Color Season": ["True Winter"],
        Budget: ["$100-250"],
      };
    }
  }, []);

  // Build search queries from preferences
  const searchQueries = useMemo(() => {
    const gender = (userPreferences.Gender?.[0] || "Women").toLowerCase();
    const occasion = (
      userPreferences.Occasion?.[0] || "Wedding/Engagement"
    ).toLowerCase();
    const vibe = (
      userPreferences.Vibe?.[0] || "Elegant & Classy"
    ).toLowerCase();

    console.log("🎯 Building search queries for:", { gender, occasion, vibe });

    // Generate HIGHLY SPECIFIC search queries
    const queries: string[] = [];

    if (gender === "women") {
      // Women's specific searches
      if (occasion.includes("wedding")) {
        queries.push("wedding dress");
        queries.push("bridal gown");
        queries.push("bridesmaid dress");
        queries.push("evening gown");
        queries.push("cocktail dress");
        queries.push("formal dress");
      } else if (occasion.includes("vacation")) {
        queries.push("vacation dress");
        queries.push("beach dress");
        queries.push("travel dress");
        queries.push("casual dress");
        queries.push("summer dress");
        queries.push("maxi dress");
      } else if (occasion.includes("date")) {
        queries.push("date night dress");
        queries.push("romantic dress");
        queries.push("elegant dress");
        queries.push("little black dress");
        queries.push("cocktail dress");
        queries.push("evening dress");
      } else if (occasion.includes("concert")) {
        queries.push("concert outfit");
        queries.push("party dress");
        queries.push("festival dress");
        queries.push("music event dress");
        queries.push("night out dress");
        queries.push("club dress");
      } else if (occasion.includes("formal") || occasion.includes("business")) {
        queries.push("formal dress");
        queries.push("business dress");
        queries.push("professional dress");
        queries.push("office dress");
        queries.push("corporate dress");
        queries.push("work dress");
      } else if (occasion.includes("graduation")) {
        queries.push("graduation dress");
        queries.push("formal dress");
        queries.push("elegant dress");
        queries.push("ceremony dress");
        queries.push("special occasion dress");
        queries.push("celebration dress");
      } else if (occasion.includes("birthday")) {
        queries.push("birthday dress");
        queries.push("party dress");
        queries.push("celebration dress");
        queries.push("special dress");
        queries.push("festive dress");
        queries.push("fun dress");
      } else if (occasion.includes("casual")) {
        queries.push("casual dress");
        queries.push("everyday dress");
        queries.push("comfortable dress");
        queries.push("relaxed dress");
        queries.push("simple dress");
        queries.push("basic dress");
      } else if (occasion.includes("party")) {
        queries.push("party dress");
        queries.push("festival dress");
        queries.push("celebration dress");
        queries.push("fun dress");
        queries.push("dance dress");
        queries.push("night out dress");
      } else {
        // General women's clothing
        queries.push("women dress");
        queries.push("women blouse");
        queries.push("women skirt");
        queries.push("women top");
        queries.push("women shirt");
        queries.push("women pants");
      }
    } else if (gender === "men") {
      // Men's specific searches
      if (occasion.includes("wedding")) {
        queries.push("wedding suit");
        queries.push("tuxedo");
        queries.push("formal suit");
        queries.push("dinner jacket");
        queries.push("wedding attire");
        queries.push("formal wear");
      } else if (occasion.includes("vacation")) {
        queries.push("vacation shirt");
        queries.push("travel shirt");
        queries.push("casual shirt");
        queries.push("beach shirt");
        queries.push("summer shirt");
        queries.push("vacation outfit");
      } else if (occasion.includes("date")) {
        queries.push("date night shirt");
        queries.push("romantic shirt");
        queries.push("elegant shirt");
        queries.push("dress shirt");
        queries.push("formal shirt");
        queries.push("evening shirt");
      } else if (occasion.includes("concert")) {
        queries.push("concert shirt");
        queries.push("band t-shirt");
        queries.push("music shirt");
        queries.push("festival shirt");
        queries.push("night out shirt");
        queries.push("party shirt");
      } else if (occasion.includes("formal") || occasion.includes("business")) {
        queries.push("business suit");
        queries.push("formal suit");
        queries.push("professional suit");
        queries.push("office suit");
        queries.push("corporate suit");
        queries.push("work suit");
      } else if (occasion.includes("graduation")) {
        queries.push("graduation suit");
        queries.push("formal suit");
        queries.push("ceremony suit");
        queries.push("special occasion suit");
        queries.push("celebration suit");
        queries.push("dress suit");
      } else if (occasion.includes("birthday")) {
        queries.push("birthday shirt");
        queries.push("party shirt");
        queries.push("celebration shirt");
        queries.push("special shirt");
        queries.push("festive shirt");
        queries.push("fun shirt");
      } else if (occasion.includes("casual")) {
        queries.push("casual shirt");
        queries.push("everyday shirt");
        queries.push("comfortable shirt");
        queries.push("relaxed shirt");
        queries.push("simple shirt");
        queries.push("basic shirt");
      } else if (occasion.includes("party")) {
        queries.push("party shirt");
        queries.push("festival shirt");
        queries.push("celebration shirt");
        queries.push("fun shirt");
        queries.push("dance shirt");
        queries.push("night out shirt");
      } else {
        // General men's clothing
        queries.push("men shirt");
        queries.push("men pants");
        queries.push("men jacket");
        queries.push("men t-shirt");
        queries.push("men jeans");
        queries.push("men hoodie");
      }
    } else {
      // Unisex searches
      queries.push("unisex t-shirt");
      queries.push("unisex hoodie");
      queries.push("unisex jeans");
      queries.push("unisex jacket");
      queries.push("unisex shirt");
      queries.push("unisex pants");
    }

    const finalQueries = [...new Set(queries)].slice(0, 6);
    console.log("🔍 Final search queries:", finalQueries);

    return finalQueries;
  }, [userPreferences]);

  // Run multiple searches for variety - add timestamp to force refresh
  const s1 = useProductSearch({ query: searchQueries[0] || "", first: 6 });
  const s2 = useProductSearch({ query: searchQueries[1] || "", first: 6 });
  const s3 = useProductSearch({ query: searchQueries[2] || "", first: 6 });
  const s4 = useProductSearch({ query: searchQueries[3] || "", first: 6 });
  const s5 = useProductSearch({ query: searchQueries[4] || "", first: 6 });
  const s6 = useProductSearch({ query: searchQueries[5] || "", first: 6 });

  // Fallback to recommended products
  const recommendedProducts = useRecommendedProducts();

  // Merge all search results with saved products
  const products = useMemo(() => {
    const byId = new Map<string, any>();
    const add = (arr?: any[] | null) =>
      (arr || []).forEach((p) => {
        if (p?.id && !byId.has(p.id)) byId.set(p.id, p);
      });

    // Debug: Log each search result
    console.log("🔍 Search Results:");
    console.log(
      "S1 (",
      searchQueries[0],
      "):",
      s1.products?.length || 0,
      "products"
    );
    console.log(
      "S2 (",
      searchQueries[1],
      "):",
      s2.products?.length || 0,
      "products"
    );
    console.log(
      "S3 (",
      searchQueries[2],
      "):",
      s3.products?.length || 0,
      "products"
    );
    console.log(
      "S4 (",
      searchQueries[3],
      "):",
      s4.products?.length || 0,
      "products"
    );
    console.log(
      "S5 (",
      searchQueries[4],
      "):",
      s5.products?.length || 0,
      "products"
    );
    console.log(
      "S6 (",
      searchQueries[5],
      "):",
      s6.products?.length || 0,
      "products"
    );

    // Add all search results first
    add(s1.products);
    add(s2.products);
    add(s3.products);
    add(s4.products);
    add(s5.products);
    add(s6.products);

    let merged = Array.from(byId.values());

    // If no search results, try recommended products
    if (merged.length === 0) {
      console.log("🔍 No search results found, trying recommended products...");
      merged = recommendedProducts?.products || [];
    }

    // Add saved products as fallback
    if (merged.length === 0) {
      console.log("🔍 No recommended products found, using saved products...");
      merged = savedProducts || [];
    } else {
      // Add saved products to the mix
      add(savedProducts);
      merged = Array.from(byId.values());
    }

    console.log("✅ Final merged products:", merged.length);
    console.log(
      "📦 Product names:",
      merged.map((p) => p?.title || p?.name || "Unknown").slice(0, 5)
    );
    return merged;
  }, [
    s1.products,
    s2.products,
    s3.products,
    s4.products,
    s5.products,
    s6.products,
    recommendedProducts?.products,
    searchQueries,
  ]);

  // ---- derive loading + pagination from preference searches ----
  const searchLoading = !!(
    s1?.loading ||
    s2?.loading ||
    s3?.loading ||
    s4?.loading ||
    s5?.loading ||
    s6?.loading
  );
  const hasAnyNextPage = !!(
    s1?.hasNextPage ||
    s2?.hasNextPage ||
    s3?.hasNextPage ||
    s4?.hasNextPage ||
    s5?.hasNextPage ||
    s6?.hasNextPage
  );
  const fetchMoreAll = () => {
    dlog("fetchMore(all preference-based searches)");
    [s1, s2, s3, s4, s5, s6].forEach((s) => s?.hasNextPage && s?.fetchMore?.());
  };

  useEffect(() => {
    dgroup("SEARCH (preference-based)", () => {
      dlog("loading =", searchLoading);
      dlog("products.count =", products?.length || 0);
      dlog("hasAnyNextPage =", !!hasAnyNextPage);
    });
  }, [searchLoading, products?.length, hasAnyNextPage]);

  const [lastMeta, setLastMeta] = useState<LookMeta | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  // move this helper above state hooks

  // seed bg with state OR saved photo
  const [bgUrl, setBgUrl] = useState<string | null>(
    () => state?.tryOnUrl ?? state?.photo ?? getSavedModelUrl()
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [inFlightId, setInFlightId] = useState<string | null>(null);
  const [trayDown, setTrayDown] = useState(false);

  // Debug console UI state + sink

  // Startup debug
  useEffect(() => {
    dgroup("BOOT", () => {
      dlog("API_BASE =", API_BASE);
      dlog("state.photo =", preview(state?.photo));
      dlog("state.tryOnUrl =", preview(state?.tryOnUrl));
    });
  }, []);

  // ---- model helpers (unchanged) ----
  function useDisplayUrl(src: string | null) {
    const [out, setOut] = useState<string | null>(null);
    useEffect(() => {
      let revoke: string | null = null;
      (async () => {
        if (!src) return setOut(null);
        if (!/^data:/i.test(src)) return setOut(src);
        try {
          const blob = await (await fetch(src)).blob();
          const url = URL.createObjectURL(blob);
          revoke = url;
          setOut(url);
        } catch {
          setOut(src);
        }
      })();
      return () => {
        if (revoke) URL.revokeObjectURL(revoke);
      };
    }, [src]);
    return out;
  }

  function getSavedModelUrl(): string | null {
    try {
      const ss = sessionStorage.getItem("shop:incomingPhoto");
      if (ss) {
        sessionStorage.removeItem("shop:incomingPhoto");
        return ss;
      }
      return (
        localStorage.getItem("fullBodyCurrentUrl") ??
        JSON.parse(localStorage.getItem("fullBodyPhotos") || "[]")[0]?.url ??
        localStorage.getItem("selectedPhoto") ??
        null
      );
    } catch {
      return null;
    }
  }

  // always render the display-safe URL
  const displayBgUrl = useDisplayUrl(bgUrl);

  // 2) make display-safe (data: → blob:) like your other file
  async function toDisplayUrl(src: string) {
    if (!src?.startsWith("data:")) return src;
    const blob = await (await fetch(src)).blob();
    return URL.createObjectURL(blob);
  }

  // 3) seed bg once on mount
  useEffect(() => {
    (async () => {
      if (!bgUrl) {
        const u = getSavedModelUrl();
        if (u) setBgUrl(await toDisplayUrl(u));
      }
    })();
  }, []);

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

    const uploadTo = apiUrl("/api/fal-upload");
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
  useEffect(() => {
    if (!bgUrl && products?.length > 0) {
      const first = products[0];
      const firstImg = extractGarmentUrl(first);
      if (firstImg) {
        setBgUrl(firstImg);
        setLastMeta(getLightMeta(first)); // optional: seed meta
      }
    }
  }, [products, bgUrl]);
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
        // navigate("/preferences");
        return;
      }

      dlog("normalizing model_image…");
      const model_image = await ensureHttpsViaUpload(savedModel);
      dlog("model_image (final) =", model_image);

      const endpoint = apiUrl("/api/tryon"); // <-- hardcoded base
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
    addLook(bgUrl, lastMeta ?? undefined);
    navigate("/saved", {
      state: { photo: bgUrl, meta: lastMeta ?? undefined },
    });
  }

  // Empty state should depend on preference-based products + combined loading
  if (!products?.length && !searchLoading) {
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
      {displayBgUrl && (
        <div className="fixed inset-0 z-0">
          <img
            src={displayBgUrl}
            alt="Your selected look"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      {loading && <LoadingStitchBar label="Stitching your look together…" />}
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
        </div>
      )}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-40 sm:h-48
                bg-gradient-to-t from-black/80 via-black/40 to-transparent
                pb-[env(safe-area-inset-bottom)]"
      />

      <div
        className={`fixed inset-x-0 bottom-0 z-0 transition-transform duration-300 mb-18 ${
          trayDown ? "translate-y-[120%]" : "translate-y-0"
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
              {products?.map((p: any) => {
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
              {hasAnyNextPage && (
                <button
                  onClick={fetchMoreAll}
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
            className="rounded-full bg-black/70 text-white px-4 py-2  text-sm shadow hover:bg-black/80"
          >
            Show recommendations
          </button>
        </div>
      )}
    </div>
  );
}
