import { useState, useRef } from "react";
import { useSavedProducts, ProductCard } from "@shopify/shop-minis-react";
import { useNavigate, useLocation } from "react-router";
import { Button } from "@shopify/shop-minis-react";

type ShopLocationState = {
  photo?: string; // fallback bg if you want it
  tryOnUrl?: string; // optional prior try-on from Home
};

export default function Home() {
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

  // pull a best-guess product image URL
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

  async function runTryOnWithProduct(garment_image: string) {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("mini-tryon-production.up.railway.app/api/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 👇 only send garment_image; server should default the model_image
        body: JSON.stringify({ garment_image }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Request failed");

      const url =
        typeof data === "string"
          ? data
          : data?.url ??
            data?.image ??
            (Array.isArray(data?.images) ? data.images[0] : null);

      if (!url) throw new Error("No URL found in response");
      setBgUrl(url);
    } catch (e: any) {
      setErr(e.message || "Try-on failed");
    } finally {
      setLoading(false);
    }
  }

  async function onSelect(p: any) {
    setSelected((prev) => {
      const already = !!prev[p.id];
      const next = { [p.id]: !already }; // single-select
      return next;
    });

    const isSelecting = !selected[p.id];
    if (isSelecting) {
      document.body.classList.add("darkmode");
      const garment = extractGarmentUrl(p);
      if (!garment) {
        setErr("Couldn't find this product's image.");
        return;
      }
      await runTryOnWithProduct(garment);
    } else {
      document.body.classList.remove("darkmode");
      // optional: revert to original
      setBgUrl(state?.tryOnUrl ?? state?.photo ?? null);
    }
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

      {/* status bubbles */}
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

      {/* Sticky footer carousel */}
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
                  <button
                    type="button"
                    onClick={() => onSelect(p)}
                    className="absolute inset-0 z-10"
                    aria-pressed={isSelected}
                    aria-label={`Select ${p.title}`}
                  />
                  <div className="pointer-events-none">
                    <ProductCard product={p} />
                  </div>
                  <div className="absolute top-2 right-2 z-20"></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
