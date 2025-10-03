import React, { useRef, useState } from "react";
import {
  Plus,
  Camera as CameraIcon,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from 'react-router';

export type PhotoGalleryButtonProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelected?: (file: File, dataUrl: string) => void;
};

const STORE_KEY = "fullBodyPhotos";
const CURRENT_KEY = "fullBodyCurrentUrl";

function getSavedFullBodyUrl(): string | null {
  try {
    const cur = localStorage.getItem(CURRENT_KEY);
    if (cur) return cur;
    const raw = localStorage.getItem(STORE_KEY);
    const arr: Array<{ url: string; ts: number }> = raw ? JSON.parse(raw) : [];
    return arr[0]?.url ?? null; // newest-first if you unshift
  } catch {
    return null;
  }
}

/* ---------- helpers copied from BackstageFullBodyLocal ---------- */

type SavedItem = { id: string; url: string; ts: number };

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

function loadAll(): SavedItem[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const arr: any[] = raw ? JSON.parse(raw) : [];
    // migrate old entries without id
    const withIds: SavedItem[] = arr.map((x) =>
      "id" in x
        ? x
        : { id: crypto.randomUUID(), url: x.url, ts: x.ts ?? Date.now() }
    );
    if (withIds.length !== arr.length || arr.some((x) => !("id" in x))) {
      localStorage.setItem(STORE_KEY, JSON.stringify(withIds));
    }
    return withIds;
  } catch {
    return [];
  }
}

function saveAll(next: SavedItem[], nextCurrent?: string | null) {
  localStorage.setItem(STORE_KEY, JSON.stringify(next));
  if (nextCurrent) {
    localStorage.setItem(CURRENT_KEY, nextCurrent);
  } else {
    localStorage.removeItem(CURRENT_KEY);
  }
}

/** Adds dataUrl to STORE_KEY (with dedupe + optional compression),
 * sets CURRENT_KEY to the added url, and returns the final (maybe-compressed) url. */
async function addDataUrlAndSetCurrent(dataUrl: string): Promise<string> {
  let items = loadAll();

  // dedupe
  if (items.some((x) => x.url === dataUrl)) {
    saveAll(items, dataUrl);
    return dataUrl;
  }

  // compress if > ~2MB
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
    return rec.url;
  } catch {
    // progressive smaller attempts
    const steps = [
      { w: 1000, h: 1500, q: 0.75 },
      { w: 800, h: 1200, q: 0.7 },
      { w: 600, h: 900, q: 0.65 },
    ];
    for (const s of steps) {
      const compact = await compressDataUrl(rec.url, s.w, s.h, s.q);
      const smaller: SavedItem = { ...rec, url: compact };
      try {
        const next = [smaller, ...items];
        saveAll(next, smaller.url);
        return smaller.url;
      } catch {}
    }
    throw new Error("Storage is full or blocked");
  }
}

/* ---------------------------------------------------------------- */

export default function PhotoGalleryButton({
  open,
  onOpenChange,
  onSelected,
}: PhotoGalleryButtonProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const show = isControlled ? (open as boolean) : internalOpen;
  const setShow = (v: boolean) =>
    isControlled ? onOpenChange?.(v) : setInternalOpen(v);

  const emit = (v: boolean) =>
    window.dispatchEvent(new CustomEvent("fc:sheet", { detail: v }));
  const applyOpen = (v: boolean) => {
    setShow(v);
    emit(v);
  };

  const libRef = useRef<HTMLInputElement | null>(null);
  const camRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  function handleFabClick() {
    const saved = getSavedFullBodyUrl();
    if (saved) {
      navigate("/preferences", { state: { photo: saved } });
      return;
    }
    // If you prefer the /you redirect when none saved, swap next line:
    // navigate("/you"); return;
    applyOpen(true);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        let dataUrl = String(reader.result);
        // persist using the same logic as Backstage
        const finalUrl = await addDataUrlAndSetCurrent(dataUrl);
        // allow external listeners too
        if (onSelected) onSelected(file, finalUrl);
        // continue to preferences with the saved (maybe-compressed) URL
        navigate("/preferences", { state: { photo: finalUrl } });
      } catch (err) {
        console.error("[PhotoGalleryButton] save error:", err);
        // fallback: still navigate with raw dataUrl if available
        if (reader.result) {
          navigate("/preferences", { state: { photo: String(reader.result) } });
        }
      } finally {
        applyOpen(false);
      }
    };
    reader.onerror = () => {
      console.error("[PhotoGalleryButton] read error");
      applyOpen(false);
    };
    reader.readAsDataURL(file);
  }

  return (
    <>
      <AnimatePresence initial={false} mode="popLayout">
        {!show ? (
          <motion.button
            key="fab"
            layoutId="fab"
            onClick={handleFabClick}
            aria-label="Open image picker"
            className="inline-grid place-items-center h-14 w-14 rounded-full bg-black/10 backdrop-blur-md backdrop-saturate-150 text-white shadow-xl active:scale-95"
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
          >
            <Plus className="h-6 w-6" />
          </motion.button>
        ) : (
          <motion.div
            key="sheetWrap"
            className="fixed inset-0 z-50 pointer-events-none"
          >
            <motion.div
              layoutId="fab"
              initial={false}
              className="
                pointer-events-auto absolute bottom-2 left-1/2 -translate-x-1/2
                w-[92vw] max-w-[520px] rounded-3xl
                bg-black/10 backdrop-blur-md backdrop-saturate-150
                border border-white/30 shadow-2xl text-white
              "
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <motion.div
                initial={{ opacity: 0, padding: 0 }}
                animate={{ opacity: 1, padding: 24 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Snap a pic</h3>
                  <button
                    onClick={() => applyOpen(false)}
                    aria-label="Close"
                    className="p-2 -m-2 rounded-full hover:bg-black/15"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex flex-col gap-5">
                  <button
                    type="button"
                    onClick={() => camRef.current?.click()}
                    className="
                      w-full flex items-center gap-4 rounded-2xl
                      bg-black/10 hover:bg-black/15
                      border border-white/20
                      px-4 py-4 transition-colors
                    "
                  >
                    <div className="h-10 w-10 grid place-items-center rounded-full bg-black/15">
                      <CameraIcon className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Camera</div>
                      <div className="text-white/70 text-sm">
                        Take a photo to search
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => libRef.current?.click()}
                    className="
                      w-full flex items-center gap-4 rounded-2xl
                      bg-black/10 hover:bg-black/15
                      border border-white/20
                      px-4 py-4 transition-colors
                    "
                  >
                    <div className="h-10 w-10 grid place-items-center rounded-full bg-black/15">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Photo Library</div>
                      <div className="text-white/70 text-sm">
                        Choose from your photos
                      </div>
                    </div>
                  </button>
                </div>
              </motion.div>
            </motion.div>

            {/* Hidden inputs */}
            <input
              ref={camRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={libRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
