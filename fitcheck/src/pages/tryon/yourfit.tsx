import { useMemo } from "react";
import { useLocation, Link, Navigate } from "react-router";
import { useSavedProducts, ProductCard } from "@shopify/shop-minis-react";

type State = {
  photo?: string;
  productIds?: string[];
};

export default function YourFit() {
  const { state } = useLocation() as { state?: State };
  const photo = state?.photo;
  const productIds = state?.productIds ?? [];

  // If they landed here without a photo, send them back.
  if (!photo) return <Navigate to="/home" replace />;

  const { products: saved } = useSavedProducts();
  const idSet = useMemo(() => new Set(productIds), [productIds]);
  const selected = (saved ?? []).filter((p) => idSet.has(p.id));

  if (productIds.length > 0 && selected.length === 0) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold mb-2">
            We couldn’t find those items
          </h1>
          <p className="text-gray-600 mb-4">
            They may have been removed from Saved. Pick again to continue.
          </p>
          <Link
            to="/select"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-black text-white"
          >
            Choose items
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-6 px-4 max-w-xl mx-auto">
      {/* Photo preview */}
      <h1 className="text-xl font-semibold mb-3">Your fit</h1>
      <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm mb-6">
        <img src={photo} alt="your photo" className="w-full object-cover" />
      </div>

      {/* Selection header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Selected items</h2>
        <Link to="/select" className="text-sm underline text-gray-600">
          {productIds.length ? "change selection" : "add items"}
        </Link>
      </div>

      {/* Selection summary */}
      <p className="text-gray-600 text-sm mb-4">
        {productIds.length === 0
          ? "No items selected yet."
          : `${selected.length} item${selected.length > 1 ? "s" : ""} selected`}
      </p>

      {/* Selected products grid (only if any) */}
      {selected.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          {selected.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-gray-200 overflow-hidden"
            >
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      )}

      {/* Sticky footer: proceed to try-on */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <div className="flex-1 text-sm text-gray-600">
            {selected.length > 0
              ? "Ready to preview your look?"
              : "Add items to try on, or continue to set up your look."}
          </div>
          <Link
            to="/tryon/result" // adjust to your actual try-on route
            state={{ productIds, photo }} // pass both along
            className="px-4 py-2 rounded-lg bg-black text-white font-medium"
          >
            Start Try‑On
          </Link>
        </div>
      </div>
    </div>
  );
}
