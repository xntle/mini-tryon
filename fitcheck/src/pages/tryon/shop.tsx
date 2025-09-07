import { useState, useRef, useMemo } from "react";
import { useSavedProducts, useProductSearch, useRecommendedProducts, ProductCard } from "@shopify/shop-minis-react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiUrl } from "../../lib/api";

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
  const { products: savedProducts } = useSavedProducts(); // user's saved products
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: ShopLocationState };

  // Get user preferences for search
  const userPreferences = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('userPreferences') || '{}');
    } catch {
      return {
        Gender: ['Women'],
        Occasion: ['Wedding/Engagement'],
        Vibe: ['Elegant & Classy'],
        'Color Season': ['True Winter'],
        Budget: ['$100-250']
      };
    }
  }, []);

  // Build search queries from preferences
  const searchQueries = useMemo(() => {
    const gender = (userPreferences.Gender?.[0] || 'Women').toLowerCase();
    const occasion = (userPreferences.Occasion?.[0] || 'Wedding/Engagement').toLowerCase();
    const vibe = (userPreferences.Vibe?.[0] || 'Elegant & Classy').toLowerCase();
    
    console.log('🎯 Building search queries for:', { gender, occasion, vibe });
    
    // Generate MORE DIVERSE search queries
    const queries = [];
    
    // Query 1: Basic gender-based items
    if (gender === 'women') {
      queries.push('dress');
      queries.push('blouse');
      queries.push('skirt');
    } else if (gender === 'men') {
      queries.push('shirt');
      queries.push('pants');
      queries.push('jacket');
    } else {
      queries.push('tshirt');
      queries.push('hoodie');
      queries.push('jeans');
    }
    
    // Query 2: Occasion-specific
    if (occasion.includes('wedding')) {
      queries.push('wedding dress');
      queries.push('bridal gown');
      queries.push('evening dress');
    } else if (occasion.includes('vacation')) {
      queries.push('vacation dress');
      queries.push('travel outfit');
      queries.push('casual wear');
    } else if (occasion.includes('date')) {
      queries.push('date night dress');
      queries.push('romantic outfit');
      queries.push('elegant dress');
    } else if (occasion.includes('concert')) {
      queries.push('concert outfit');
      queries.push('party dress');
      queries.push('music festival');
    } else if (occasion.includes('formal')) {
      queries.push('formal dress');
      queries.push('business suit');
      queries.push('cocktail dress');
    }
    
    // Query 3: Vibe-specific
    if (vibe.includes('elegant')) {
      queries.push('elegant dress');
      queries.push('satin dress');
      queries.push('silk blouse');
    } else if (vibe.includes('soft')) {
      queries.push('soft dress');
      queries.push('gentle colors');
      queries.push('pastel dress');
    } else if (vibe.includes('bold')) {
      queries.push('bold dress');
      queries.push('bright colors');
      queries.push('vibrant outfit');
    } else if (vibe.includes('minimal')) {
      queries.push('minimal dress');
      queries.push('simple outfit');
      queries.push('clean design');
    } else if (vibe.includes('chic')) {
      queries.push('chic dress');
      queries.push('stylish outfit');
      queries.push('fashionable dress');
    }
    
    // Query 4: Color-based (if available)
    const colorSeason = (userPreferences['Color Season']?.[0] || '').toLowerCase();
    if (colorSeason.includes('winter')) {
      queries.push('black dress');
      queries.push('navy blue');
    } else if (colorSeason.includes('spring')) {
      queries.push('pink dress');
      queries.push('coral dress');
    } else if (colorSeason.includes('summer')) {
      queries.push('blue dress');
      queries.push('lavender dress');
    } else if (colorSeason.includes('autumn')) {
      queries.push('brown dress');
      queries.push('orange dress');
    }
    
    // Query 5: Budget-based
    const budget = (userPreferences.Budget?.[0] || '').toLowerCase();
    if (budget.includes('50')) {
      queries.push('affordable dress');
      queries.push('budget friendly');
    } else if (budget.includes('250')) {
      queries.push('mid range dress');
      queries.push('quality dress');
    } else if (budget.includes('500')) {
      queries.push('luxury dress');
      queries.push('premium dress');
    }
    
    // Query 6: General fallback
    queries.push('clothing');
    
    const finalQueries = [...new Set(queries)].slice(0, 6);
    console.log('🔍 Final search queries:', finalQueries);
    
    return finalQueries;
  }, [userPreferences]);

  // Run multiple searches for variety - add timestamp to force refresh
  const searchTimestamp = useMemo(() => Date.now(), [userPreferences]);
  const s1 = useProductSearch({ query: searchQueries[0] || '', first: 6 });
  const s2 = useProductSearch({ query: searchQueries[1] || '', first: 6 });
  const s3 = useProductSearch({ query: searchQueries[2] || '', first: 6 });
  const s4 = useProductSearch({ query: searchQueries[3] || '', first: 6 });
  const s5 = useProductSearch({ query: searchQueries[4] || '', first: 6 });
  const s6 = useProductSearch({ query: searchQueries[5] || '', first: 6 });

  // Fallback to recommended products
  const recommendedProducts = useRecommendedProducts();

  // Merge all search results with saved products
  const products = useMemo(() => {
    const byId = new Map<string, any>();
    const add = (arr?: any[] | null) => (arr || []).forEach(p => { 
      if (p?.id && !byId.has(p.id)) byId.set(p.id, p); 
    });
    
    // Debug: Log each search result
    console.log('🔍 Search Results:');
    console.log('S1 (', searchQueries[0], '):', s1.products?.length || 0, 'products');
    console.log('S2 (', searchQueries[1], '):', s2.products?.length || 0, 'products');
    console.log('S3 (', searchQueries[2], '):', s3.products?.length || 0, 'products');
    console.log('S4 (', searchQueries[3], '):', s4.products?.length || 0, 'products');
    console.log('S5 (', searchQueries[4], '):', s5.products?.length || 0, 'products');
    console.log('S6 (', searchQueries[5], '):', s6.products?.length || 0, 'products');
    
    // Add all search results first
    add(s1.products); add(s2.products); add(s3.products); 
    add(s4.products); add(s5.products); add(s6.products);
    
    let merged = Array.from(byId.values());
    
    // If no search results, try recommended products
    if (merged.length === 0) {
      console.log('🔍 No search results found, trying recommended products...');
      merged = (recommendedProducts?.products || []);
    }
    
    // Add saved products as fallback
    if (merged.length === 0) {
      console.log('🔍 No recommended products found, using saved products...');
      merged = savedProducts || [];
    } else {
      // Add saved products to the mix
      add(savedProducts);
      merged = Array.from(byId.values());
    }
    
    console.log('✅ Final merged products:', merged.length);
    console.log('📦 Product names:', merged.map(p => p?.title || p?.name || 'Unknown').slice(0, 5));
    return merged;
  }, [s1.products, s2.products, s3.products, s4.products, s5.products, s6.products, recommendedProducts?.products, savedProducts, searchQueries]);

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

  if (!products?.length) {
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

      {/* Tray handle */}
      <button
        type="button"
        onClick={() => setTrayDown((v) => !v)}
        aria-label={
          trayDown ? "Show product carousel" : "Hide product carousel"
        }
        className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 rounded-full bg-black/70 text-white px-3 py-2 shadow hover:bg-black/80"
      >
        {trayDown ? "▲" : "▼"}
      </button>

      {/* Carousel */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-20 p-4 transition-transform duration-300 ${
          trayDown ? "translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="relative">
          <div
            ref={trackRef}
            className="flex gap-4 overflow-x-auto px-2 pb-2 scroll-smooth snap-x snap-mandatory"
            style={{ scrollbarWidth: "none" }}
          >
            {products.map((p) => {
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
          </div>
        </div>
      </div>
    </div>
  );
}
