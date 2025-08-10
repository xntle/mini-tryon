import React, { useRef, useState } from "react";
import { Plus, Camera as CameraIcon, Image as ImageIcon, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Same spacing/formatting; now supports a morph animation from + circle to the sheet
export type PhotoGalleryButtonProps = {
  open?: boolean; // controlled
  onOpenChange?: (open: boolean) => void; // controlled
  onSelected?: (file: File, dataUrl: string) => void;
};

export default function PhotoGalleryButton({
  open,
  onOpenChange,
  onSelected,
}: PhotoGalleryButtonProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const show = isControlled ? (open as boolean) : internalOpen;
  const setShow = (v: boolean) => (isControlled ? onOpenChange?.(v) : setInternalOpen(v));

  // Let TryOn listen and nudge UI when sheet opens/closes
  const emit = (v: boolean) =>
    window.dispatchEvent(new CustomEvent("fc:sheet", { detail: v }));
  const applyOpen = (v: boolean) => {
    setShow(v);
    emit(v);
  };

  const libRef = useRef<HTMLInputElement | null>(null);
  const camRef = useRef<HTMLInputElement | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      onSelected?.(file, dataUrl);
    };
    reader.readAsDataURL(file);

    e.target.value = ""; // reset
    applyOpen(false);     // close + notify
  }

  return (
    <>
      {/* Morph host: when closed we render the round +; when open we render the sheet. */}
      <AnimatePresence initial={false} mode="popLayout">
        {!show ? (
          <motion.button
            key="fab"
            layoutId="fab"
            onClick={() => applyOpen(true)}
            aria-label="Open image search"
            className="inline-grid place-items-center h-14 w-14 rounded-full bg-violet-600 text-white shadow-xl active:scale-95"
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
          >
            <Plus className="h-6 w-6" />
          </motion.button>
        ) : (
          <motion.div key="sheetWrap" className="fixed inset-0 z-50 pointer-events-none">
            {/* The element below shares the same layoutId as the FAB, so it morphs */}
            <motion.div
              layoutId="fab"
              initial={false}
              className="pointer-events-auto absolute bottom-2 left-1/2 -translate-x-1/2 w-[92vw] max-w-[520px] rounded-3xl bg-black text-white shadow-2xl"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* We animate padding/opacity of inner content so it fades in as the box expands */}
              <motion.div
                initial={{ opacity: 0, padding: 0 }}
                animate={{ opacity: 1, padding: 24 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Image Search</h3>
                  <button
                    onClick={() => applyOpen(false)}
                    aria-label="Close"
                    className="p-2 -m-2 rounded-full hover:bg-white/10"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex flex-col gap-5">
                  {/* Camera option */}
                  <button
                    onClick={() => camRef.current?.click()}
                    className="w-full flex items-center gap-4 rounded-2xl bg-neutral-700 px-4 py-4"
                  >
                    <div className="h-10 w-10 grid place-items-center rounded-full bg-neutral-800">
                      <CameraIcon className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Camera</div>
                      <div className="text-neutral-300 text-sm">Take a photo to search</div>
                    </div>
                  </button>

                  {/* Photo Library option */}
                  <button
                    onClick={() => libRef.current?.click()}
                    className="w-full flex items-center gap-4 rounded-2xl bg-neutral-700 px-4 py-4"
                  >
                    <div className="h-10 w-10 grid place-items-center rounded-full bg-neutral-800">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Photo Library</div>
                      <div className="text-neutral-300 text-sm">Choose from your photos</div>
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
