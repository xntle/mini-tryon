import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ExternalLink, Star, Trash2, Share2 } from "lucide-react";
import { useProduct, ProductLink } from "@shopify/shop-minis-react";

type SavedItem = {
  lookId?: string;
  url: string;
  productId?: string; // <-- we resolve this with useProduct()
  product?: string;
  merchant?: string;
  price?: number;
  favorite?: boolean;
  ts?: number;
  productImage?: string;
  productUrl?: string;
};

function loadAll(): SavedItem[] {
  try {
    const raw = localStorage.getItem("savedPhotos");
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function saveAll(items: SavedItem[]) {
  localStorage.setItem("savedPhotos", JSON.stringify(items));
}

export default function FitDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const items = useMemo(loadAll, []);
  const item =
    items.find((x) => (x.lookId ? x.lookId === id : x.url === id)) ||
    items.find((x) => encodeURIComponent(x.lookId ?? x.url) === id);

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

  // 🔑 Resolve the product from its ID (GID) with the official hook
  const { product, loading, error } = useProduct({ id: item.productId ?? "" }); // expects 'gid://shopify/Product/123'
  // Docs: useProduct fetches a single product by ID; it returns {product, loading, error, refetch}. :contentReference[oaicite:0]{index=0}
  // ProductLink expects the full product object. :contentReference[oaicite:1]{index=1}

  function toggleStar() {
    const next = items.map((x) =>
      (x.lookId ?? x.url) === (item.lookId ?? item.url)
        ? { ...x, favorite: !x.favorite }
        : x
    );
    saveAll(next);
    navigate(0);
  }
  function deleteLook() {
    const next = items.filter(
      (x) => (x.lookId ?? x.url) !== (item.lookId ?? item.url)
    );
    saveAll(next);
    navigate("/saved");
  }
  async function shareLook() {
    try {
      if (navigator.share)
        await navigator.share({
          title: item.product ?? "My fit",
          url: item.url,
        });
      else {
        await navigator.clipboard.writeText(item.url);
        alert("Link copied to clipboard!");
      }
    } catch {}
  }

  return (
    <div className="relative min-h-dvh bg-black text-white">
      {/* Fullscreen try-on */}
      <img
        src={item.url}
        alt="Try-on"
        className="fixed inset-0 h-full w-full object-cover bg-black"
        style={{ zIndex: 0 }}
      />

      <div
        className="pointer-events-none fixed inset-0 bg-gradient-to-t from-black/40 via-black/10 to-black/40"
        style={{ zIndex: 1 }}
      />

      {/* Top controls (glass) */}
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

      {/* Bottom product info (glass) */}
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
