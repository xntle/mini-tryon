import React, { useRef, useState } from "react";
import {
  Plus,
  Camera as CameraIcon,
  Image as ImageIcon,
  X,
} from "lucide-react";

export type PhotoGalleryButtonProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelected?: (file: File, dataUrl: string) => void;
};

export default function PhotoGalleryButton({
  open,
  onOpenChange,
  onSelected,
}: PhotoGalleryButtonProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const show = isControlled ? !!open : internalOpen;
  const setShow = (v: boolean) =>
    isControlled ? onOpenChange?.(v) : setInternalOpen(v);

  // Tell TryOn to slide text up/down
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

    e.target.value = "";
    applyOpen(false);
  }

  return (
    <>
      {/* + button */}
      <button
        onClick={() => applyOpen(true)}
        aria-label="Open image search"
        className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-black text-white shadow-xl active:scale-95 transition"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Bottom sheet */}
      {show && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="pointer-events-auto absolute bottom-2 left-1/2 -translate-x-1/2 w-[92vw] max-w-[520px] rounded-3xl bg-black text-white px-6 pt-6 pb-8 shadow-2xl">
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
              {/* Camera */}
              <button
                onClick={() => camRef.current?.click()}
                className="w-full flex items-center gap-4 rounded-2xl bg-neutral-700 px-4 py-4"
              >
                <div className="h-10 w-10 grid place-items-center rounded-full bg-neutral-800">
                  <CameraIcon className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Camera</div>
                  <div className="text-neutral-300 text-sm">
                    Take a photo to search
                  </div>
                </div>
              </button>

              {/* Photo Library */}
              <button
                onClick={() => libRef.current?.click()}
                className="w-full flex items-center gap-4 rounded-2xl bg-neutral-700 px-4 py-4"
              >
                <div className="h-10 w-10 grid place-items-center rounded-full bg-neutral-800">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Photo Library</div>
                  <div className="text-neutral-300 text-sm">
                    Choose from your photos
                  </div>
                </div>
              </button>
            </div>
          </div>

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
        </div>
      )}
    </>
  );
}
