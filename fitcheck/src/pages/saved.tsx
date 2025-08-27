import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Trash2, Share2, Star, ChevronLeft, InfoIcon } from "lucide-react";

type SavedItem = {
  lookId?: string; // unique for this saved look
  url: string; // try-on image
  productId?: string; // <-- for useProduct()
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
const save = (items: SavedItem[]) =>
  localStorage.setItem("savedPhotos", JSON.stringify(items));

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
  const navigate = useNavigate();
  const { state } = useLocation() as {
    state?: { photo?: string; meta?: Partial<SavedItem> };
  };
  const [items, setItems] = useState<SavedItem[]>([]);
  const [tab, setTab] = useState<"all" | "starred">("all");

  useEffect(() => {
    const existing = ensureLookIds(
      parseSaved(localStorage.getItem("savedPhotos"))
    );
    let merged = existing;

    if (state?.photo && !existing.some((i) => i.url === state.photo)) {
      const incoming: SavedItem = {
        lookId: crypto.randomUUID(),
        url: state.photo,
        ts: Date.now(),
        favorite: !!state?.meta?.favorite,
        productId: state?.meta?.productId, // <-- saved here
        product: state?.meta?.product,
        merchant: state?.meta?.merchant,
        price: state?.meta?.price,
        productImage: state?.meta?.productImage,
        productUrl: state?.meta?.productUrl,
      };
      merged = [incoming, ...existing];
      save(merged);
    }
    setItems(merged);
  }, [state?.photo]);

  const allCount = items.length;
  const starredCount = useMemo(
    () => items.filter((x) => x.favorite).length,
    [items]
  );
  const visibleItems = tab === "all" ? items : items.filter((x) => x.favorite);
  const titleCount = useMemo(
    () =>
      visibleItems.length === 1 ? "1 item" : `${visibleItems.length} items`,
    [visibleItems.length]
  );

  function deleteByUrl(url: string) {
    const next = items.filter((x) => x.url !== url);
    setItems(next);
    save(next);
  }
  function toggleFavoriteByUrl(url: string) {
    const next = items.map((x) =>
      x.url === url ? { ...x, favorite: !x.favorite } : x
    );
    setItems(next);
    save(next);
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
      {/* top bar + tabs (same as before)… */}
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

            <div className=" overflow-hidden ring-1 ring-zinc-700">
              <InfoIcon />
            </div>
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
                    {" "}
                    <Trash2 size={16} />{" "}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      shareItem(it.url);
                    }}
                    className="p-2 rounded-full bg-zinc-900/80 border border-zinc-700"
                  >
                    {" "}
                    <Share2 size={16} />{" "}
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
    </div>
  );
}
