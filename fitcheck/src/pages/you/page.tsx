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
  FileQuestion,
  InfoIcon,
} from "lucide-react";
import { useNavigate } from "react-router";

type SavedItem = { id: string; url: string; ts: number };

const STORE_KEY = "fullBodyPhotos";
const CURRENT_KEY = "fullBodyCurrentUrl";

type Notice = { type: "progress" | "success" | "info" | "error"; msg: string };

export default function BackstageFullBodyLocal() {
  const navigate = useNavigate();

  const [items, setItems] = useState<SavedItem[]>([]);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  // chooser + inputs
  const [addOpen, setAddOpen] = useState(false);
  const camRef = useRef<HTMLInputElement | null>(null);
  const libRef = useRef<HTMLInputElement | null>(null);

  // toast + highlight
  const [notice, setNotice] = useState<Notice | null>(null);
  const [justAddedUrl, setJustAddedUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ---- storage helpers ----
  function loadAll() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const arr: any[] = raw ? JSON.parse(raw) : [];
      // migrate old entries without id -> give them ids
      const withIds: SavedItem[] = arr.map((x) =>
        "id" in x
          ? x
          : { id: crypto.randomUUID(), url: x.url, ts: x.ts ?? Date.now() }
      );
      setItems(withIds);
      if (withIds.length !== arr.length || arr.some((x) => !("id" in x))) {
        localStorage.setItem(STORE_KEY, JSON.stringify(withIds));
      }
      const cur = localStorage.getItem(CURRENT_KEY);
      setCurrentUrl(cur ?? withIds[0]?.url ?? null);
    } catch {
      setItems([]);
      setCurrentUrl(null);
    }
  }

  function saveAll(next: SavedItem[], nextCurrent?: string | null) {
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
    setItems(next);
    const cur = nextCurrent !== undefined ? nextCurrent : currentUrl;
    if (cur) {
      localStorage.setItem(CURRENT_KEY, cur);
      setCurrentUrl(cur);
    } else {
      localStorage.removeItem(CURRENT_KEY);
      setCurrentUrl(null);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // ---- feedback helpers ----
  function showNotice(n: Notice, ttl = 1400) {
    setNotice(n);
    if (n.type !== "progress") {
      window.setTimeout(() => setNotice(null), ttl);
    }
  }
  useEffect(() => {
    if (notice?.type === "progress") {
      const t = setTimeout(() => setNotice(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notice]);

  // ---- size/compress helpers ----
  function approxBytesOfDataUrl(dataUrl: string) {
    const i = dataUrl.indexOf(",");
    const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
    return Math.floor((b64.length * 3) / 4);
  }

  function compressDataUrl(
    dataUrl: string,
    maxW = 1200,
    maxH = 1800,
    quality = 0.82
  ): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const r = Math.min(maxW / width, maxH / height, 1);
        const w = Math.round(width * r);
        const h = Math.round(height * r);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0, w, h);
        const out = canvas.toDataURL("image/jpeg", quality);
        resolve(out);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  // ---- add/delete/select ----
  async function addDataUrl(dataUrl: string) {
    setSaving(true);
    showNotice({ type: "progress", msg: "Saving…" });

    try {
      // dedupe
      if (items.some((x) => x.url === dataUrl)) {
        saveAll(items, dataUrl);
        setJustAddedUrl(dataUrl);
        setTimeout(() => setJustAddedUrl(null), 1200);
        showNotice({ type: "info", msg: "Already saved" });
        setAddOpen(false);
        return;
      }

      if (approxBytesOfDataUrl(dataUrl) > 2_000_000) {
        dataUrl = await compressDataUrl(dataUrl, 1200, 1800, 0.82);
      }

      const rec: SavedItem = {
        id: crypto.randomUUID(),
        url: dataUrl,
        ts: Date.now(),
      };

      try {
        const next = [rec, ...items];
        saveAll(next, rec.url);
      } catch {
        const steps = [
          { w: 1000, h: 1500, q: 0.75 },
          { w: 800, h: 1200, q: 0.7 },
          { w: 600, h: 900, q: 0.65 },
        ];
        let saved = false;
        for (const s of steps) {
          const compact = await compressDataUrl(rec.url, s.w, s.h, s.q);
          const smaller: SavedItem = { ...rec, url: compact };
          try {
            const next = [smaller, ...items];
            saveAll(next, smaller.url);
            dataUrl = compact;
            saved = true;
            break;
          } catch {}
        }
        if (!saved) throw new Error("Storage is full or blocked");
      }

      setJustAddedUrl(dataUrl);
      setTimeout(() => setJustAddedUrl(null), 1200);
      showNotice({
        type: "success",
        msg:
          approxBytesOfDataUrl(dataUrl) > 2_000_000
            ? "Saved (compressed)"
            : "Saved to device",
      });
      setAddOpen(false);
    } catch (err) {
      console.error("[Save photo] error:", err);
      showNotice({ type: "error", msg: "Failed to save photo" });
    } finally {
      setSaving(false);
    }
  }

  const railRef = useRef<HTMLDivElement | null>(null);
  function scrollRail(dx: number) {
    railRef.current?.scrollBy({ left: dx, behavior: "smooth" });
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        await addDataUrl(String(reader.result));
      };
      reader.onerror = () =>
        showNotice({ type: "error", msg: "Failed to read photo" });
      reader.readAsDataURL(file);
    } catch {
      showNotice({ type: "error", msg: "Failed to save photo" });
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

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      {/* Top toast */}
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

          <div className=" overflow-hidden ring-1 ring-zinc-700">
            <InfoIcon />
          </div>
        </div>
      </div>

      {/* Main viewer */}
      <div className="max-w-xl mx-auto px-4">
        <div className="relative rounded-xl overflow-hidden bg-zinc-950 border border-zinc-900 shadow-inner">
          <div className="w-full h-[46vh] grid place-items-center bg-black">
            {currentUrl ? (
              <img
                src={currentUrl}
                alt="Current full body"
                className="max-h-[46vh] w-full object-contain"
              />
            ) : (
              <div className="text-zinc-400">No photo yet</div>
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
          Choose one
        </h3>

        {/* Thumbnails carousel: [Add] [first] [rest...] */}
        <div className="relative">
          {/* edge fades */}
          <div className="pointer-events-none absolute left-0 top-0 h-full w-8 bg-gradient-to-r from-zinc-950 to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-zinc-950 to-transparent" />

          {/* left chevron */}
          <button
            type="button"
            onClick={() => scrollRail(-200)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden sm:inline-flex rounded-full bg-zinc-900/70 hover:bg-zinc-800/80 border border-zinc-700 p-2 shadow"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5 text-zinc-200" />
          </button>

          {/* right chevron */}
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
            {/* Hide WebKit scrollbar */}
            <style>{`div::-webkit-scrollbar { display: none; height: 0; width: 0; }`}</style>

            {/* Add tile (small) */}
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

            {/* First photo slot (small) */}
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
                <img
                  src={first.url}
                  alt="Saved"
                  className="h-full w-full object-cover"
                />
              </button>
            ) : (
              <div className="relative shrink-0 snap-center aspect-[3/5] w-24 sm:w-28 rounded-lg border-2 border-transparent" />
            )}

            {/* Rest of photos */}
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
                <img
                  src={it.url}
                  alt="Saved"
                  className="h-full w-full object-cover"
                />
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
