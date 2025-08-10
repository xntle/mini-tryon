import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Trash2, Share2 } from "lucide-react";

type SavedItem = {
  url: string;
  merchant?: string;
  product?: string;
  price?: number;
  rating?: number;
  reviews?: number;
  favorite?: boolean;
  ts?: number;
};

function parseSaved(raw: string | null): SavedItem[] {
  if (!raw) return [];
  try {
    const json = JSON.parse(raw);
    if (Array.isArray(json)) {
      if (json.length && typeof json[0] === "string") {
        return json.map((url: string) => ({ url, ts: Date.now() }));
      }
      if (json.length && typeof json[0] === "object") {
        return json.filter((x) => x?.url);
      }
    }
  } catch {}
  return [];
}
const save = (items: SavedItem[]) =>
  localStorage.setItem("savedPhotos", JSON.stringify(items));

export default function Saved() {
  const navigate = useNavigate();
  const { state } = useLocation() as {
    state?: { photo?: string; meta?: Partial<SavedItem> };
  };
  const [items, setItems] = useState<SavedItem[]>([]);

  useEffect(() => {
    const existing = parseSaved(localStorage.getItem("savedPhotos"));
    let merged = existing;

    if (state?.photo && !existing.some((i) => i.url === state.photo)) {
      const incoming: SavedItem = {
        url: state.photo,
        ts: Date.now(),
        ...state.meta,
      };
      merged = [incoming, ...existing];
      save(merged);
    }
    setItems(merged);
  }, [state?.photo]);

  const has = items.length > 0;
  const titleCount = useMemo(
    () => (items.length === 1 ? "1 item" : `${items.length} items`),
    [items.length]
  );

  function deleteItem(idx: number) {
    const next = items.filter((_, i) => i !== idx);
    setItems(next);
    save(next);
  }

  async function shareItem(url: string) {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Check out my outfit",
          text: "Here's a look I saved!",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Link copied to clipboard!");
      }
    } catch (e) {
      console.error("Share failed:", e);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* top bar */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
            aria-label="Back"
          >
            ←
          </button>

          <h1 className="text-2xl font-semibold">Fit Vault</h1>
          <div className="ml-auto text-sm text-gray-500">{titleCount}</div>
        </div>
      </div>

      {/* grid */}
      <div className="max-w-md mx-auto px-4 pt-4 pb-16">
        {!has ? (
          <div className="text-center text-gray-500 mt-20">
            No photos saved yet.
            <div className="mt-4">
              <button
                onClick={() => navigate("/shop")}
                className="px-4 py-2 rounded-full bg-black text-white text-sm"
              >
                Go to Shop
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {items.map((it, idx) => (
              <div
                key={it.url + idx}
                className="relative rounded-2xl overflow-hidden"
              >
                {/* image */}
                <img
                  src={it.url}
                  alt={it.product ?? "Saved Look"}
                  className="w-full aspect-square object-cover rounded-2xl"
                />

                {/* overlay buttons */}
                <div className="absolute bottom-2 left-2 right-2 flex justify-between">
                  <button
                    onClick={() => deleteItem(idx)}
                    className="p-2 rounded-full bg-black/70 text-white hover:bg-black/90 transition"
                    aria-label="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => shareItem(it.url)}
                    className="p-2 rounded-full bg-black/70 text-white hover:bg-black/90 transition"
                    aria-label="Share"
                  >
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
