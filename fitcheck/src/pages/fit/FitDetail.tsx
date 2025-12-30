import { useMemo, useState, useEffect } from "react";
import { useParams } from "react-router";
import { Star, Trash2, Share2 } from "lucide-react";
import { useProduct, ProductLink, useNavigateWithTransition } from "@shopify/shop-minis-react";

const FITS_KEY = "fitVaultLooks";

type SavedItem = {
  lookId?: string;
  url: string;
  productId?: string;
  product?: string;
  merchant?: string;
  price?: number;
  favorite?: boolean;
  ts?: number;
  productImage?: string;
  productUrl?: string;
};

function ensureIds(arr: SavedItem[]) {
  return arr.map((x) => (x.lookId ? x : { ...x, lookId: crypto.randomUUID() }));
}
function loadAll(): SavedItem[] {
  try {
    const fresh = JSON.parse(localStorage.getItem(FITS_KEY) || "[]");
    const legacy = JSON.parse(localStorage.getItem("savedPhotos") || "[]");
    const merged = [...fresh];
    for (const it of Array.isArray(legacy) ? legacy : []) {
      if (!merged.some((x) => (x.lookId ?? x.url) === (it.lookId ?? it.url)))
        merged.push(it);
    }
    const withIds = ensureIds(merged);
    localStorage.setItem(FITS_KEY, JSON.stringify(withIds));
    return withIds;
  } catch {
    return [];
  }
}
function saveAll(items: SavedItem[]) {
  localStorage.setItem(FITS_KEY, JSON.stringify(items));
}

export default function FitDetail() {
  const navigate = useNavigateWithTransition();
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<SavedItem[]>(() => loadAll());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === FITS_KEY) setItems(loadAll());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const item = useMemo<SavedItem | null>(() => {
    const found =
      items.find((x) => (x.lookId ? x.lookId === id : x.url === id)) ??
      items.find((x) => encodeURIComponent(x.lookId ?? x.url) === id);
    return found ?? null;
  }, [items, id]);

  if (!item) {
    return (
      <div className="min-h-dvh bg-black text-zinc-100 grid place-items-center">
        <div className="text-center">
          <div className="text-lg mb-2">Look not found</div>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-full bg-zinc-100 text-zinc-900 text-sm"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const { product, loading, error } = useProduct({ id: item.productId ?? "" });

  function persist(next: SavedItem[]) {
    saveAll(next);
    setItems(next);
  }

  function toggleStar() {
    if (item) {
      const key = item.lookId ?? item.url;
      const next = items.map((x) =>
        (x.lookId ?? x.url) === key ? { ...x, favorite: !x.favorite } : x
      );
      persist(next); // no navigate(0)
    }
  }

  function deleteLook() {
    if (item) {
      const key = item.lookId ?? item.url;
      const next = items.filter((x) => (x.lookId ?? x.url) !== key);
      persist(next);
      navigate("/saved");
    }
  }

  async function shareLook() {
    if (item) {
      try {
        // Shop Minis doesn't support navigator.share/clipboard
        // TODO: Implement Shop Minis SDK share functionality
        alert(`Share this look: ${item.url}`);
      } catch {}
    }
  }

  return (
    <div className="relative min-h-dvh bg-black text-white">
      <img
        src={item.url}
        alt="Try-on"
        className="fixed inset-0 h-full w-full object-cover bg-black"
        style={{ zIndex: 0 }}
      />

      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-20 w-[min(96vw,680px)]">
        <div className="mx-auto flex items-center gap-2 rounded-full bg-black/30 backdrop-blur-xl ring-1 ring-white/10 px-2 py-1">
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-1.5 rounded-full hover:bg-white/10"
            aria-label="Back"
          >
            ←
          </button>
          <div className="ml-1 text-sm opacity-90 truncate">
            {item.product ?? "Fit Detail"}
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={shareLook}
              className="px-3 py-1.5 rounded-full hover:bg-white/10"
              aria-label="Share"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              onClick={toggleStar}
              className="px-3 py-1.5 rounded-full hover:bg-white/10"
              aria-label={item.favorite ? "Unstar" : "Star"}
            >
              <Star
                className={
                  item.favorite
                    ? "h-4 w-4 text-amber-400 fill-amber-400"
                    : "h-4 w-4"
                }
              />
            </button>
            <button
              onClick={deleteLook}
              className="px-3 py-1.5 rounded-full hover:bg-white/10 text-red-300"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-20 w-full">
        <div className="rounded-2xl bg-black/35 backdrop-blur-xl ring-1 ring-white/10 p-3">
          {item.productId ? (
            loading ? (
              <div className="text-sm text-white/80">Loading product…</div>
            ) : error ? (
              <div className="text-sm text-red-300">
                Failed to load product.
              </div>
            ) : product ? (
              <div className="rounded-xl overflow-hidden">
                <ProductLink product={product} />
              </div>
            ) : (
              <div className="text-sm text-white/80">Product not found.</div>
            )
          ) : (
            <>error</>
          )}
          {item.ts && (
            <div className="mt-3 flex item-center justify-center text-[11px] text-white/60">
              Saved {new Date(item.ts).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
