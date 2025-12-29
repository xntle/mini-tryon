// BackstageFullBodyLocal.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Camera as CameraIcon,
  Image as ImageIcon,
  X,
  Check,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  InfoIcon,
} from "lucide-react";
import { useNavigateWithTransition } from "@shopify/shop-minis-react";

type SavedItem = { id: string; url: string; ts: number };

const STORE_KEY = "fullBodyPhotos";
const CURRENT_KEY = "fullBodyCurrentUrl";

// ---------- CONFIG ----------
const BYTE_BUDGET = 4_500_000; // ~4.5MB total budget in localStorage
const MAX_ITEM_BYTES = 1_500_000; // max bytes per image after compress
const TTL_DAYS = 60; // evict older than N days
const COMPRESS = {
  maxW: 1280,
  maxH: 1920,
  maxMP: 3.2,
  byteCeil: MAX_ITEM_BYTES,
};

// ---------- SMALL UTILS ----------
const storageUsable = () => {
  try {
    const k = "__probe__" + Math.random();
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
};
const approxBytesOfDataUrl = (u: string) => {
  const i = u.indexOf(",");
  const b64 = i >= 0 ? u.slice(i + 1) : u;
  return Math.floor((b64.length * 3) / 4);
};
const estimateItemsBytes = (items: SavedItem[]) =>
  2 + items.reduce((n, it) => n + 64 + approxBytesOfDataUrl(it.url), 0);
const dropOld = (items: SavedItem[]) => {
  const cutoff = Date.now() - TTL_DAYS * 864e5;
  return items.filter((i) => i.ts >= cutoff).sort((a, b) => b.ts - a.ts);
};
const trimToBudget = (items: SavedItem[], budget = BYTE_BUDGET) => {
  const arr = dropOld([...items]);
  while (arr.length && estimateItemsBytes(arr) > budget) arr.pop();
  return arr;
};

// ---------- RENDER-SAFE URL (data: → blob:) ----------
function useDisplayUrl(src: string | null) {
  const [display, setDisplay] = useState<string | null>(null);
  useEffect(() => {
    let revoke: string | null = null;
    (async () => {
      if (!src) return setDisplay(null);
      if (!src.startsWith("data:")) return setDisplay(src);
      try {
        const blob = await (await fetch(src)).blob();
        const b = URL.createObjectURL(blob);
        revoke = b;
        setDisplay(b);
      } catch {
        setDisplay(src);
      }
    })();
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [src]);
  return display;
}
const Thumb = ({ url }: { url: string }) => {
  const src = useDisplayUrl(url);
  return (
    <img src={src ?? url} alt="Saved" className="h-full w-full object-cover" />
  );
};

// ---------- ROBUST COMPRESSOR ----------
async function compressAnyToDataUrl(
  input: File | string,
  {
    maxW,
    maxH,
    maxMP,
    byteCeil,
  }: { maxW: number; maxH: number; maxMP: number; byteCeil: number }
): Promise<string> {
  const toBlob = async (): Promise<Blob> => {
    if (typeof input !== "string") return input;
    return await (await fetch(input)).blob();
  };
  const blob = await toBlob();
  const mime = (blob.type || "image/jpeg").toLowerCase();

  // decode with EXIF orientation if available
  let src: ImageBitmap | HTMLImageElement;
  try {
    // @ts-ignore
    src = await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode().catch(
      () =>
        new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = rej;
        })
    );
    src = img;
  }
  const sw = (src as any).width,
    sh = (src as any).height;

  // target size with megapixel guard
  const mp = (sw * sh) / 1e6;
  const scaleMP = Math.min(1, Math.sqrt(maxMP / Math.max(mp, maxMP)));
  const r = Math.min(maxW / sw, maxH / sh, 1) * scaleMP;
  const tw = Math.max(1, Math.round(sw * r));
  const th = Math.max(1, Math.round(sh * r));

  // simple progressive downscale (2 passes max)
  const step = (w: number, h: number, inCanvas?: HTMLCanvasElement) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    // fill behind alpha formats when exporting JPEG (avoid dark halos)
    if (/png|webp|avif/i.test(mime)) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
    }
    const srcEl = inCanvas ?? (src as any);
    const sw2 = inCanvas ? inCanvas.width : sw;
    const sh2 = inCanvas ? inCanvas.height : sh;
    ctx.drawImage(srcEl, 0, 0, sw2, sh2, 0, 0, w, h);
    return c;
  };
  const mid =
    sw > tw * 2 && sh > th * 2
      ? step(Math.round(sw / 2), Math.round(sh / 2))
      : null;
  const canvas = step(tw, th, mid ?? undefined);

  // try a small quality ladder, then tiny shrink if needed
  for (const q of [0.82, 0.74, 0.68]) {
    const out = canvas.toDataURL("image/jpeg", q);
    if (approxBytesOfDataUrl(out) <= byteCeil) return out;
  }
  const c2 = step(
    Math.max(320, Math.round(tw * 0.88)),
    Math.max(320, Math.round(th * 0.88)),
    canvas
  );
  for (const q of [0.7, 0.64, 0.6]) {
    const out = c2.toDataURL("image/jpeg", q);
    if (approxBytesOfDataUrl(out) <= byteCeil) return out;
  }
  return c2.toDataURL("image/jpeg", 0.6);
}

// ---------- UI ----------
type Notice = { type: "progress" | "success" | "info" | "error"; msg: string };

export default function BackstageFullBodyLocal() {
  const navigate = useNavigateWithTransition();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const camRef = useRef<HTMLInputElement | null>(null);
  const libRef = useRef<HTMLInputElement | null>(null);

  const [infoOpen, setInfoOpen] = useState(false);
  const [infoStep, setInfoStep] = useState<0 | 1>(0);

  const [notice, setNotice] = useState<Notice | null>(null);
  const [justAddedUrl, setJustAddedUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // load/save with budget/eviction
  const loadAll = () => {
    try {
      const raw = storageUsable() ? localStorage.getItem(STORE_KEY) : null;
      const arr: any[] = raw ? JSON.parse(raw) : [];
      const withIds: SavedItem[] = arr.map((x) =>
        "id" in x
          ? x
          : { id: crypto.randomUUID(), url: x.url, ts: x.ts ?? Date.now() }
      );
      const trimmed = trimToBudget(withIds);
      setItems(trimmed);

      if (
        withIds.length !== arr.length ||
        estimateItemsBytes(withIds) !== estimateItemsBytes(trimmed)
      ) {
        if (storageUsable())
          localStorage.setItem(STORE_KEY, JSON.stringify(trimmed));
      }

      const cur = storageUsable() ? localStorage.getItem(CURRENT_KEY) : null;
      const chosen =
        (cur && trimmed.some((x) => x.url === cur) ? cur : null) ??
        trimmed[0]?.url ??
        null;
      setCurrentUrl(chosen);
      if (storageUsable()) {
        if (chosen) localStorage.setItem(CURRENT_KEY, chosen);
        else localStorage.removeItem(CURRENT_KEY);
      }
    } catch {
      setItems([]);
      setCurrentUrl(null);
    }
  };

  const saveAll = (next: SavedItem[], nextCurrent?: string | null) => {
    if (!storageUsable()) throw new Error("localStorage unavailable");
    const trimmed = trimToBudget(next);
    // Save only the photo links (URLs) in localStorage
    const links = trimmed.map((item) => ({ id: item.id, url: item.url, ts: item.ts }));
    localStorage.setItem(STORE_KEY, JSON.stringify(links));
    setItems(trimmed);

    const desired = nextCurrent !== undefined ? nextCurrent : currentUrl;
    const chosen =
      (desired && trimmed.some((x) => x.url === desired) ? desired : null) ??
      trimmed[0]?.url ??
      null;
    if (chosen) {
      localStorage.setItem(CURRENT_KEY, chosen);
      setCurrentUrl(chosen);
    } else {
      localStorage.removeItem(CURRENT_KEY);
      setCurrentUrl(null);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const showNotice = (n: Notice, ttl = 1400) => {
    setNotice(n);
    if (n.type !== "progress") window.setTimeout(() => setNotice(null), ttl);
  };
  useEffect(() => {
    if (notice?.type === "progress") {
      const t = window.setTimeout(() => setNotice(null), 4000);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [notice]);

  // add/delete/select
  async function addDataUrl(dataUrl: string) {
    setSaving(true);
    showNotice({ type: "progress", msg: "Saving…" });
    try {
      if (items.some((x) => x.url === dataUrl)) {
        saveAll(items, dataUrl);
        setJustAddedUrl(dataUrl);
        setTimeout(() => setJustAddedUrl(null), 1200);
        showNotice({ type: "info", msg: "Already saved" });
        setAddOpen(false);
        return;
      }

      // ensure under per-item cap
      const safe =
        approxBytesOfDataUrl(dataUrl) > MAX_ITEM_BYTES
          ? await compressAnyToDataUrl(dataUrl, COMPRESS)
          : dataUrl;

      const rec: SavedItem = {
        id: crypto.randomUUID(),
        url: safe,
        ts: Date.now(),
      };
      const next = trimToBudget([rec, ...items]); // evict oldest to fit
      saveAll(next, rec.url);

      setJustAddedUrl(rec.url);
      setTimeout(() => setJustAddedUrl(null), 1200);
      showNotice({ type: "success", msg: "Saved" });
      setAddOpen(false);
    } catch (err: any) {
      console.error("[Save photo] error:", err);
      showNotice({
        type: "error",
        msg: err?.message || "Failed to save photo",
      });
    } finally {
      setSaving(false);
    }
  }

  const railRef = useRef<HTMLDivElement | null>(null);
  const scrollRail = (dx: number) =>
    railRef.current?.scrollBy({ left: dx, behavior: "smooth" });

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const compressed = await compressAnyToDataUrl(file, COMPRESS);
      await addDataUrl(compressed);
    } catch {
      showNotice({ type: "error", msg: "Failed to process photo" });
    }
  }

  function removeCurrent() {
    if (!currentUrl) return;
    const next = items.filter((x) => x.url !== currentUrl);
    const fallback = next[0]?.url ?? null;
    saveAll(next, fallback);
    showNotice({ type: "info", msg: "Removed" });
  }

  const countLabel = useMemo(
    () => (items.length === 1 ? "1 photo" : `${items.length} photos`),
    [items.length]
  );
  const first = items[0] ?? null;
  const rest = items.slice(1);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setInfoOpen(false);
    if (infoOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [infoOpen]);

  const displayUrl = useDisplayUrl(currentUrl);

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      {/* Toast */}
      {notice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div
            className={
              "rounded-full px-4 py-2 text-sm backdrop-blur-md border shadow " +
              (notice.type === "success"
                ? "bg-emerald-500/90 text-white border-emerald-400/50"
                : notice.type === "error"
                ? "bg-red-500/90 text-white border-red-400/50"
                : "bg-zinc-900/90 text-zinc-100 border-zinc-700")
            }
          >
            <span className="inline-flex items-center gap-2">
              {notice.type === "success" && <Check className="h-4 w-4" />}
              {notice.type === "error" && <AlertTriangle className="h-4 w-4" />}
              {notice.msg}
            </span>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b border-zinc-900/60 bg-gradient-to-b from-zinc-950 to-zinc-950/0">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            className="px-3 py-1 rounded-full text-sm bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft />
          </button>
          <div className="font-semibold tracking-wide text-zinc-200">You</div>
          <button
            onClick={() => {
              setInfoStep(0);
              setInfoOpen(true);
            }}
            className="p-2 rounded-full bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-200"
            aria-label="How to take a good full body photo"
          >
            <InfoIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main viewer */}
      <div className="max-w-xl mx-auto px-4">
        <div className="relative rounded-xl overflow-hidden bg-zinc-950 border border-zinc-900 shadow-inner">
          <div className="w-full h-[46vh] grid place-items-center bg-black">
            {displayUrl ? (
              <img
                src={displayUrl}
                alt="Current full body"
                className="max-h-[46vh] w-full object-contain"
              />
            ) : (
              <div className="text-zinc-400">
                Add a photo and press "+" at the bottom to start!
              </div>
            )}
          </div>

          {currentUrl && (
            <>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                <span className="px-4 py-2 rounded-full bg-fuchsia-600/90 text-white text-sm shadow border border-fuchsia-400/50">
                  Current
                </span>
              </div>
              <button
                onClick={removeCurrent}
                aria-label="Delete current"
                className="absolute bottom-3 right-3 h-12 w-12 rounded-full grid place-items-center bg-zinc-900/80 text-zinc-100 border border-zinc-700 shadow hover:bg-zinc-900"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Choose section */}
      <div className="max-w-xl mx-auto px-4 pt-6 pb-28">
        <h3 className="text-center text-base font-medium mb-4 text-zinc-300">
          {countLabel}
        </h3>

        <div className="relative">
          <div className="pointer-events-none absolute left-0 top-0 h-full w-8 bg-gradient-to-r from-zinc-950 to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-zinc-950 to-transparent" />

          <button
            type="button"
            onClick={() => scrollRail(-200)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden sm:inline-flex rounded-full bg-zinc-900/70 hover:bg-zinc-800/80 border border-zinc-700 p-2 shadow"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5 text-zinc-200" />
          </button>
          <button
            type="button"
            onClick={() => scrollRail(200)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden sm:inline-flex rounded-full bg-zinc-900/70 hover:bg-zinc-800/80 border border-zinc-700 p-2 shadow"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5 text-zinc-200" />
          </button>

          <div
            ref={railRef}
            className="flex gap-3 overflow-x-auto px-3 py-2 scroll-smooth snap-x snap-mandatory"
            style={{ scrollbarWidth: "none" } as React.CSSProperties}
          >
            <style>{`div::-webkit-scrollbar { display: none; height: 0; width: 0; }`}</style>

            {/* Add tile */}
            <button
              onClick={() => setAddOpen(true)}
              disabled={saving}
              className={`relative shrink-0 snap-center aspect-[3/5] w-24 sm:w-28 rounded-lg border-2 grid place-items-center transition-colors ${
                saving
                  ? "border-zinc-700 bg-zinc-800/60 cursor-wait"
                  : "border-dashed border-zinc-700 bg-zinc-900/70 hover:bg-zinc-900"
              }`}
              aria-expanded={addOpen}
              aria-label="Add full body photo"
            >
              <div className="flex flex-col items-center gap-1 text-zinc-300">
                <div className="h-10 w-10 rounded-full border-2 border-dashed grid place-items-center border-zinc-700">
                  <Plus className="h-5 w-5" />
                </div>
                <span className="text-xs">{saving ? "Saving…" : "Add"}</span>
              </div>
            </button>

            {/* First */}
            {first ? (
              <button
                onClick={() => saveAll(items, first.url)}
                className={`relative shrink-0 snap-center aspect-[3/5] w-24 sm:w-28 rounded-lg border-2 overflow-hidden bg-zinc-900 ${
                  currentUrl === first.url
                    ? "border-fuchsia-500"
                    : "border-dashed border-zinc-700"
                } ${
                  justAddedUrl === first.url ? "ring-4 ring-fuchsia-400/60" : ""
                }`}
                title={new Date(first.ts).toLocaleString()}
                key={first.id}
                aria-selected={currentUrl === first.url}
              >
                <Thumb url={first.url} />
              </button>
            ) : (
              <div className="relative shrink-0 snap-center aspect-[3/5] w-24 sm:w-28 rounded-lg border-2 border-transparent" />
            )}

            {/* Rest */}
            {rest.map((it) => (
              <button
                key={it.id}
                onClick={() => saveAll(items, it.url)}
                className={`relative shrink-0 snap-center aspect-[3/5] w-24 sm:w-28 rounded-lg border-2 overflow-hidden bg-zinc-900 ${
                  currentUrl === it.url
                    ? "border-fuchsia-500"
                    : "border-dashed border-zinc-700"
                } ${
                  justAddedUrl === it.url ? "ring-4 ring-fuchsia-400/60" : ""
                }`}
                title={new Date(it.ts).toLocaleString()}
                aria-selected={currentUrl === it.url}
              >
                <Thumb url={it.url} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Add chooser */}
      {addOpen && (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-6"
          onClick={() => !saving && setAddOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-xs pointer-events-auto rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-md text-zinc-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="font-medium">Add photo</div>
              <button
                onClick={() => setAddOpen(false)}
                disabled={saving}
                className="p-2 -m-2 rounded-full hover:bg-zinc-800/70 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-4 pb-4 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => camRef.current?.click()}
                disabled={saving}
                className="w-full flex items-center gap-3 rounded-xl bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 px-4 py-3 transition-colors disabled:opacity-60"
              >
                <div className="h-9 w-9 grid place-items-center rounded-full bg-zinc-800/80">
                  <CameraIcon className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Camera</div>
                  <div className="text-zinc-400 text-xs">
                    Take a full body photo
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => libRef.current?.click()}
                disabled={saving}
                className="w-full flex items-center gap-3 rounded-xl bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 px-4 py-3 transition-colors disabled:opacity-60"
              >
                <div className="h-9 w-9 grid place-items-center rounded-full bg-zinc-800/80">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Photo Library</div>
                  <div className="text-zinc-400 text-xs">
                    Choose from your gallery
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info popup */}
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
                  {infoStep === 0
                    ? "How to take a great full-body photo"
                    : "Why we ask for it"}
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
            <div className="px-4 py-4 text-sm leading-relaxed space-y-3">
              {infoStep === 0 ? (
                <>
                  <ul className="list-disc pl-5 space-y-2 text-zinc-300">
                    <li>
                      Stand ~2–3 m from the camera; include your whole body.
                    </li>
                    <li>Good light in front of you; avoid heavy backlight.</li>
                    <li>
                      Neutral pose, arms relaxed at sides, facing forward.
                    </li>
                    <li>Wear fitted clothes (no coat/oversized hoodie).</li>
                    <li>
                      Background: plain wall if possible; keep frame tidy.
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
                      Why this?
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-zinc-300">
                    A clear full-body photo helps our virtual try-on place
                    garments accurately on your silhouette.
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-zinc-300">
                    <li>Better alignment = more realistic previews.</li>
                    <li>Fewer failed renders.</li>
                    <li>Stored only on your device unless you upload.</li>
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
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onPickFile}
      />
      <input
        ref={libRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPickFile}
      />
    </div>
  );
}
