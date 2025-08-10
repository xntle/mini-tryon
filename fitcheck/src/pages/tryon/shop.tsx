import { useState, useRef } from "react";
import { useSavedProducts, ProductCard } from "@shopify/shop-minis-react";
import { useNavigate, useLocation } from "react-router-dom";

type ShopLocationState = {
  photo?: string;
  tryOnUrl?: string;
};

export default function Shop() {
  const { products } = useSavedProducts();
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: ShopLocationState };

  const trackRef = useRef<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bgUrl, setBgUrl] = useState<string | null>(
    state?.tryOnUrl ?? state?.photo ?? null
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [inFlightId, setInFlightId] = useState<string | null>(null);

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

  // very tolerant url extractor
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
      const res = await fetch("http://localhost:3000/api/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ garment_image }),
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

      if (window.location.protocol === "https:" && /^http:\/\//i.test(outUrl)) {
        console.warn(
          "[TRYON] mixed content: https page vs http image — may be blocked by the browser"
        );
      }

      setBgUrl(outUrl); // <-- fixed (no .url)
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
      await runTryOnWithProduct(garment);
      setInFlightId(null);
    } else {
      document.body.classList.remove("darkmode");
      setBgUrl(state?.tryOnUrl ?? state?.photo ?? null); // revert on unselect
    }
  }

  // ----- Save helpers -----
  function appendSaved(url: string) {
    try {
      const raw = localStorage.getItem("savedPhotos");
      const arr = raw ? JSON.parse(raw) : [];
      const already =
        Array.isArray(arr) && arr.some((x) => (x?.url ?? x) === url);
      const next = already ? arr : [{ url, ts: Date.now() }, ...arr];
      localStorage.setItem("savedPhotos", JSON.stringify(next));
    } catch {
      localStorage.setItem(
        "savedPhotos",
        JSON.stringify([{ url, ts: Date.now() }])
      );
    }
  }

  function saveCurrentPhoto() {
    if (!bgUrl) return;
    appendSaved(bgUrl);
    navigate("/saved", { state: { photo: bgUrl } });
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
            onLoad={() => console.log("[IMG] loaded:", bgUrl)}
            onError={() => console.error("[IMG] onError for:", bgUrl)}
          />
        </div>
      )}

      {loading && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 rounded-full bg-black/70 text-white px-4 py-2 text-sm">
          Generating try-on…
        </div>
      )}
      {err && (
        <div className="fixed top-4 right-4 z-20 rounded-md bg-red-600 text-white px-3 py-2 text-sm shadow">
          {err}
        </div>
      )}

      {/* Save button */}
      {bgUrl && !loading && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-20">
          <button
            type="button"
            onClick={saveCurrentPhoto}
            className="rounded-full bg-black text-white px-5 py-3 text-sm shadow hover:bg-gray-800"
          >
            Save this look
          </button>
        </div>
      )}

      {/* Product carousel */}
      <div className="fixed bottom-0 left-0 right-0 bg-transparent p-4 mb-18">
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
                  data-card
                  className={`relative snap-center shrink-0 rounded-2xl p-2 overflow-hidden transition-colors ${
                    isSelected
                      ? "border-4 border-purple-500 bg-white"
                      : "bg-white border border-gray-200"
                  }`}
                  style={{ width: 200, minWidth: 200 }}
                >
                  {/* Make ProductCard clickable (no full overlay) */}
                  <div>
                    <ProductCard product={p} />
                  </div>

                  {/* Tiny Try-on toggle that doesn't block the card */}
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

      {/* Quick link to gallery */}
      <button
        onClick={() => navigate("/saved")}
        className="fixed top-4 right-4 z-20 px-3 py-2 rounded-full bg-black/70 text-white text-xs hover:bg-black/80"
      >
        Saved
      </button>
    </div>
  );
}
