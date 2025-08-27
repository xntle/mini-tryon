import React, { useRef, useState } from "react";
import {
  Plus,
  Camera as CameraIcon,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

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
      // jump straight to preferences using the saved full-body photo
      navigate("/preferences", { state: { photo: saved } });
      return;
    }
    applyOpen(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      if (onSelected) onSelected(file, dataUrl);
      navigate("/preferences", { state: { photo: dataUrl } });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
    applyOpen(false);
  }

  return (
    <>
      <AnimatePresence initial={false} mode="popLayout">
        {!show ? (
          <motion.button
            key="fab"
            layoutId="fab"
            onClick={handleFabClick}
            aria-label="Open image search"
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
