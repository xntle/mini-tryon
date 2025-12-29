import { useLocation } from "react-router";
import { useNavigateWithTransition } from "@shopify/shop-minis-react";
import { useEffect, useMemo, useState } from "react";
import { Trash2, Share2, Star, ChevronLeft, InfoIcon, X } from "lucide-react";

const FITS_KEY = "fitVaultLooks";

function loadLooks(): SavedItem[] {
  const fresh = parseSaved(localStorage.getItem(FITS_KEY));
  const legacy = parseSaved(localStorage.getItem("savedPhotos"));
  const merged = [...fresh];
  for (const it of legacy)
    if (!merged.some((x) => x.url === it.url)) merged.push(it);
  const withIds = ensureLookIds(merged);
  localStorage.setItem(FITS_KEY, JSON.stringify(withIds));
  return withIds;
}
function saveLooks(items: SavedItem[]) {
  localStorage.setItem(FITS_KEY, JSON.stringify(items));
}

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

function parseSaved(raw: string | null): SavedItem[] {
  if (!raw) return [];
  try {
    const json = JSON.parse(raw);
    return Array.isArray(json) ? json.filter((x) => x?.url) : [];
  } catch {
    return [];
  }
}
const save = (items: SavedItem[]) => {
  const links = items.map((item) => ({
    lookId: item.lookId,
    url: item.url,
    ts: item.ts,
  }));
  localStorage.setItem("savedPhotos", JSON.stringify(links));
};

function ensureLookIds(items: SavedItem[]) {
  let touched = false;
  const out = items.map((x) =>
    x.lookId ? x : { ...x, lookId: crypto.randomUUID() }
  );
  if (out.length && out.some((x, i) => items[i]?.lookId !== x.lookId)) {
    touched = true;
  }
  if (touched) save(out);
  return out;
}

export default function Saved() {
  const navigate = useNavigateWithTransition();
  const { state } = useLocation() as {
    state?: { photo?: string; meta?: Partial<SavedItem> };
  };
  const [items, setItems] = useState<SavedItem[]>([]);
  const [tab, setTab] = useState<"all" | "starred">("all");
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoStep, setInfoStep] = useState<0 | 1>(0);

  useEffect(() => {
    let existing = loadLooks();
    if (state?.photo && !existing.some((i) => i.url === state.photo)) {
      const incoming: SavedItem = {
        lookId: crypto.randomUUID(),
        url: state.photo,
        ts: Date.now(),
        favorite: !!state?.meta?.favorite,
        productId: state?.meta?.productId,
        product: state?.meta?.product,
        merchant: state?.meta?.merchant,
        price: state?.meta?.price,
        productImage: state?.meta?.productImage,
        productUrl: state?.meta?.productUrl,
      };
      existing = [incoming, ...existing];
      saveLooks(existing); // <-- use new key
    }
    setItems(existing);
  }, [state?.photo]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setInfoOpen(false);
    }
    if (infoOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [infoOpen]);

  const allCount = items.length;
  const starredCount = useMemo(
    () => items.filter((x) => x.favorite).length,
    [items]
  );
  const visibleItems = tab === "all" ? items : items.filter((x) => x.favorite);

  function deleteByUrl(url: string) {
    const next = items.filter((x) => x.url !== url);
    setItems(next);
    saveLooks(next);
  }
  function toggleFavoriteByUrl(url: string) {
    const next = items.map((x) =>
      x.url === url ? { ...x, favorite: !x.favorite } : x
    );
    setItems(next);
    saveLooks(next);
  }

  async function shareItem(url: string) {
    try {
      if (navigator.share)
        await navigator.share({
          title: "Check out my outfit",
          text: "Here's a look I saved!",
          url,
        });
      else {
        await navigator.clipboard.writeText(url);
        alert("Link copied to clipboard!");
      }
    } catch {}
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* top bar + tabs */}
      <div className="sticky top-0 z-20 bg-zinc-950/90 backdrop-blur border-b border-zinc-800">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              className="px-3 py-1 rounded-full text-sm bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft />
            </button>
            <div className="font-semibold tracking-wide text-white">
              Fit Vault
            </div>

            {/* Info button */}
            <button
              onClick={() => {
                setInfoStep(0);
                setInfoOpen(true);
              }}
              className="p-2 rounded-full bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-200"
              aria-label="How Fit Vault works"
            >
              <InfoIcon />
            </button>
          </div>
          <div className="mt-3 flex items-center justify-center">
            <div className="inline-flex rounded-full bg-zinc-900 p-1 border border-zinc-800">
              <button
                onClick={() => setTab("all")}
                className={
                  "px-3 py-1.5 rounded-full text-sm " +
                  (tab === "all"
                    ? "bg-zinc-800"
                    : "text-zinc-400 hover:text-zinc-200")
                }
              >
                All<span className="ml-1 text-zinc-500">({allCount})</span>
              </button>
              <button
                onClick={() => setTab("starred")}
                className={
                  "px-3 py-1.5 rounded-full text-sm " +
                  (tab === "starred"
                    ? "bg-zinc-800"
                    : "text-zinc-400 hover:text-zinc-200")
                }
              >
                Starred
                <span className="ml-1 text-zinc-500">({starredCount})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* grid */}
      <div className="max-w-md mx-auto px-4 pt-4 pb-20">
        {visibleItems.length === 0 ? (
          <div className="text-center text-zinc-400 mt-20">
            {tab === "all" ? "No fit saved yet." : "No starred fit yet."}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {visibleItems.map((it) => (
              <div
                key={it.lookId ?? it.url}
                className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 cursor-pointer"
                onClick={() =>
                  navigate(`/fit/${encodeURIComponent(it.lookId ?? it.url)}`)
                }
                title={it.product ?? "Open fit"}
              >
                <img
                  src={it.url}
                  alt={it.product ?? "Saved Look"}
                  className="w-full aspect-[3/5] object-cover"
                  loading="lazy"
                />

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavoriteByUrl(it.url);
                  }}
                  className="absolute top-2 right-2 p-2 rounded-full bg-zinc-900/80 border border-zinc-700 hover:bg-zinc-800/90"
                  aria-label={it.favorite ? "Unstar" : "Star"}
                >
                  <Star
                    size={16}
                    className={
                      it.favorite
                        ? "text-amber-400 fill-amber-400"
                        : "text-zinc-300"
                    }
                  />
                </button>
                <div className="absolute bottom-2 left-2 right-2 flex justify-between">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteByUrl(it.url);
                    }}
                    className="p-2 rounded-full bg-zinc-900/80 border border-zinc-700"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      shareItem(it.url);
                    }}
                    className="p-2 rounded-full bg-zinc-900/80 border border-zinc-700"
                  >
                    <Share2 size={16} />
                  </button>
                </div>
                {(it.product || it.merchant) && (
                  <div className="absolute top-2 left-2 px-2 py-1 max-w-[15vh] truncate rounded-full text-xs bg-zinc-900/80 border border-zinc-700">
                    {it.product ?? it.merchant}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info popup (two-step with Back page) */}
      {infoOpen && (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-6"
          onClick={() => setInfoOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm pointer-events-auto rounded-2xl border border-zinc-800 bg-zinc-900/90 backdrop-blur-md text-zinc-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                {infoStep === 1 ? (
                  <button
                    onClick={() => setInfoStep(0)}
                    className="p-2 -m-2 rounded-full hover:bg-zinc-800/70"
                    aria-label="Back"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                ) : (
                  <span className="p-2 -m-2 opacity-0">
                    <ChevronLeft className="h-5 w-5" />
                  </span>
                )}
                <div className="font-medium">
                  {infoStep === 0 ? "How Fit Vault works" : "Tips & privacy"}
                </div>
              </div>
              <button
                onClick={() => setInfoOpen(false)}
                className="p-2 -m-2 rounded-full hover:bg-zinc-800/70"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            {infoStep === 0 ? (
              <div className="px-4 py-4 text-sm leading-relaxed space-y-3">
                <ul className="list-disc pl-5 space-y-2 text-zinc-300">
                  <li>Tap a card to open that fit’s detail page.</li>
                  <li>
                    Use <span className="font-medium">★ Star</span> to pin looks
                    to the <span className="font-medium">Starred</span> tab.
                  </li>
                  <li>
                    <span className="font-medium">Share</span> copies the link
                    (or uses native share if available).
                  </li>
                  <li>
                    <span className="font-medium">Delete</span> removes the fit
                    from this device.
                  </li>
                  <li>
                    If you see a pill label, that’s the product or merchant tied
                    to the look.
                  </li>
                </ul>
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setInfoOpen(false)}
                    className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
                  >
                    Got it
                  </button>
                  <button
                    onClick={() => setInfoStep(1)}
                    className="px-3 py-2 rounded-lg bg-fuchsia-600 text-white hover:bg-fuchsia-500 border border-fuchsia-400/60"
                  >
                    Tips & privacy
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-4 text-sm leading-relaxed space-y-3">
                <p className="text-zinc-300">
                  Saved fits are stored in your browser under{" "}
                  <code className="px-1 rounded bg-zinc-800 border border-zinc-700">
                    localStorage
                  </code>{" "}
                  as <code>savedPhotos</code>. We keep the images/links here so
                  they stay on your device unless you clear them.
                </p>
                <ul className="list-disc pl-5 space-y-2 text-zinc-300">
                  <li>Clearing browser data will remove your saved fits.</li>
                  <li>
                    If a saved fit uses a link, the image may live on that
                    remote server; we only store the URL.
                  </li>
                  <li>
                    To tidy up, delete duplicates and star your favorites for
                    quick access.
                  </li>
                </ul>
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setInfoStep(0)}
                    className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setInfoOpen(false)}
                    className="px-3 py-2 rounded-lg bg-fuchsia-600 text-white hover:bg-fuchsia-500 border border-fuchsia-400/60"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
