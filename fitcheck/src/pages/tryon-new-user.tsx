import React, { useEffect, useState } from "react";
import PhotoGalleryButton from "../components/GalleryButton";

export default function TryOnNew() {
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<boolean>;
      setSheetOpen(Boolean(ce.detail));
    };
    window.addEventListener("fc:sheet", handler as EventListener);
    return () =>
      window.removeEventListener("fc:sheet", handler as EventListener);
  }, []);

  return (
    <div className="min-h-screen w-full grid place-items-center">
      <div className="h-fill w-fill overflow-hidden rounded-[40px] shadow-2xl ">
        {/* Background image */}
        <img
          src="https://images.unsplash.com/photo-1516826957135-700dedea698c?q=80&w=1600&auto=format&fit=crop"
          alt="Outfiit"
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />

        <div
          className={`absolute bottom-30 right-6 left-6 text-white z-10
              transition-transform duration-300 ease-out
              ${sheetOpen ? "-translate-y-50" : ""}`}
        >
          <h1 className="text-4xl font-extrabold tracking-tight drop-shadow">
            FitCheck
          </h1>
          <p className="mt-2 text-white/85 ">
            Start by adding a full body photo!
          </p>
        </div>

        {/* Lower nav bar stays */}
        <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center bg-transparent rounded-full px-6 py-2">
          <div className="flex items-center justify-between gap-12 px-6 h-16">
            <PhotoGalleryButton />
          </div>
        </nav>
      </div>
    </div>
  );
}
