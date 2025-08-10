// src/pages/yourfit.tsx
import { useMemo } from "react";
import { useLocation, Link, Navigate } from "react-router-dom";
import { useSavedProducts, ProductCard } from "@shopify/shop-minis-react";

type LocationState = { productIds?: string[] };

export default function YourFit() {
  const location = useLocation();
  const { products: saved } = useSavedProducts();

  const productIds =
    (location.state as LocationState | undefined)?.productIds ?? [];
  const idSet = useMemo(() => new Set(productIds), [productIds]);

  // If user got here without selecting anything, bounce them back
  if (!productIds.length) return <Navigate to="/select" replace />;

  const selected = (saved ?? []).filter((p) => idSet.has(p.id));

  if (!selected.length) {
    // Handles edge case: selection not in saved anymore
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Your fit</h1>
        <Link to="/select" className="text-sm underline text-gray-600">
          change selection
        </Link>
      </div>

      <p className="text-gray-600 text-sm mb-4">
        {selected.length} item{selected.length > 1 ? "s" : ""} selected
      </p>

      <div className="grid grid-cols-2 gap-4">
        {selected.map((p) => (
          <div
            key={p.id}
            className="rounded-xl border border-gray-200 overflow-hidden"
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>

      {/* Sticky footer: continue to actual try-on experience */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <div className="flex-1 text-sm text-gray-600">
            Ready to preview your look?
          </div>
          <Link
            to="/tryon/result" // or a dedicated /tryon/canvas route
            state={{ productIds }}
            className="px-4 py-2 rounded-lg bg-black text-white font-medium"
          >
            Start Try‑On
          </Link>
        </div>
      </div>
    </div>
  );
}
