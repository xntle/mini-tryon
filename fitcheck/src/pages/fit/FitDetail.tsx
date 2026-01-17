import { useMemo, useState, useEffect } from "react";
import { useParams } from "react-router";
import { Star, Trash2, Share2, X } from "lucide-react";
import { useProduct, ProductLink, useNavigateWithTransition, Touchable } from "@shopify/shop-minis-react";

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
  const [shareModalOpen, setShareModalOpen] = useState(false);

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
          <Touchable
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-full bg-zinc-100 text-zinc-900 text-sm"
          >
            Go back
          </Touchable>
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

  function shareLook() {
    if (item) {
      setShareModalOpen(true);
    }
  }

  function copyToClipboard() {
    if (!item) return;
    const input = document.createElement('input');
    input.value = item.url;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    try {
      document.execCommand('copy');
      alert('Link copied!');
    } catch {
      alert(`Copy this link: ${item.url}`);
    }
    document.body.removeChild(input);
  }

  return (
    <div className="relative min-h-dvh bg-black text-white">
      {/* eslint-disable-next-line shop-minis/prefer-sdk-components */}
      <img
        src={item.url}
        alt="Try-on"
        className="fixed inset-0 h-full w-full object-cover bg-black"
        style={{ zIndex: 0 }}
      />

      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-20 w-[min(96vw,680px)]">
        <div className="mx-auto flex items-center gap-2 rounded-full bg-black/30 backdrop-blur-xl ring-1 ring-white/10 px-2 py-1">
          <Touchable
            onClick={() => navigate(-1)}
            className="px-3 py-1.5 rounded-full hover:bg-white/10"
            aria-label="Back"
          >
            ←
          </Touchable>
          <div className="ml-1 text-sm opacity-90 truncate">
            {item.product ?? "Fit Detail"}
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Touchable
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
            </Touchable>
            <Touchable
              onClick={deleteLook}
              className="px-3 py-1.5 rounded-full hover:bg-white/10 text-red-300"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Touchable>
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

      {/* Share Modal */}
      {shareModalOpen && item && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-6"
          onClick={() => setShareModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/90 backdrop-blur-md text-zinc-100 shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Share this look</h3>
              <Touchable
                onClick={() => setShareModalOpen(false)}
                className="p-2 -m-2 rounded-full hover:bg-zinc-800/70"
              >
                <X className="h-5 w-5" />
              </Touchable>
            </div>

            <div className="space-y-3">
              {/* Twitter */}
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(item.url)}&text=Check out my outfit!`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-[#1DA1F2] grid place-items-center text-white font-bold">𝕏</div>
                <span>Share on Twitter/X</span>
              </a>

              {/* Facebook */}
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(item.url)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-[#1877F2] grid place-items-center text-white font-bold">f</div>
                <span>Share on Facebook</span>
              </a>

              {/* WhatsApp */}
              <a
                href={`https://wa.me/?text=Check out my outfit! ${encodeURIComponent(item.url)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-[#25D366] grid place-items-center text-white font-bold">W</div>
                <span>Share on WhatsApp</span>
              </a>

              {/* Copy Link */}
              <Touchable
                onClick={copyToClipboard}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-zinc-700 grid place-items-center">
                  <Share2 className="h-5 w-5" />
                </div>
                <span>Copy Link</span>
              </Touchable>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
