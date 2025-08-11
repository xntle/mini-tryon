import { useState, useMemo } from "react";
import { useSavedProducts, ProductCard } from "@shopify/shop-minis-react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Shop() {
  const { products } = useSavedProducts();
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: { photo?: string } };
  const photo = state?.photo;

  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const count = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  );

  function toggle(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  function selectAll() {
    if (!products?.length) return;
    const next: Record<string, boolean> = {};
    products.forEach((p) => (next[p.id] = true));
    setSelected(next);
  }

  function clearAll() {
    setSelected({});
  }

  function proceed() {
    const productIds = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);

    navigate("/yourfit", { state: { productIds, photo } });
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Select items to try on</h1>
        <div className="flex gap-3 text-sm">
          <button onClick={selectAll} className="underline">
            Select all
          </button>
          <button onClick={clearAll} className="underline text-gray-600">
            Clear
          </button>
        </div>
      </div>

      {/* Show uploaded photo if exists */}
      {photo && (
        <div className="mb-6">
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <img
              src={photo}
              alt="Your selected look"
              className="w-full object-cover"
            />
          </div>
          <p className="text-sm text-gray-500 mt-2 text-center">
            This is the photo we'll use for your try-on.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {products.map((p) => {
          const isSelected = !!selected[p.id];
          return (
            <div
              key={p.id}
              className={`relative rounded-xl border overflow-hidden ${
                isSelected ? "ring-2 ring-blue-600" : "border-gray-200"
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(p.id)}
                className="absolute inset-0 z-10"
                aria-pressed={isSelected}
                aria-label={`Select ${p.title}`}
              />
              <div className="pointer-events-none">
                <ProductCard product={p} />
              </div>
              <div className="absolute top-2 right-2 z-20">
                <span
                  className={`h-6 w-6 inline-flex items-center justify-center rounded-full border bg-white ${
                    isSelected ? "border-blue-600" : "border-gray-300"
                  }`}
                >
                  {isSelected ? (
                    <svg viewBox="0 0 20 20" className="h-4 w-4 fill-blue-600">
                      <path d="M7.6 14.2 3.9 10.5l1.4-1.4 2.3 2.3 6.1-6.1 1.4 1.4z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" className="h-4 w-4 fill-gray-300">
                      <circle cx="10" cy="10" r="7" />
                    </svg>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <div className="flex-1 text-sm text-gray-600">
            {count === 0 ? "Select items to continue" : `${count} selected`}
          </div>
          <button
            className="px-4 py-2 rounded-lg bg-black text-white font-medium disabled:opacity-50 z-10"
            onClick={proceed}
            disabled={count === 0}
          >
            Try on {count > 0 ? `(${count})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
