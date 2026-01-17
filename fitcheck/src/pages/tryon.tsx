import { useEffect, useState } from "react";
import NavBar from "../components/Navbar";

export default function TryOn() {
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
        {/* Background video */}
        <video
          className="absolute inset-0 h-full w-full object-cover -z-10"
          src="https://res.cloudinary.com/dfh2gpp3y/video/upload/output_xhfvqf.mp4"
          autoPlay
          muted
          loop
          playsInline
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />

        <div
          className={`absolute bottom-30 right-6 left-6 text-white z-10
              transition-transform duration-300 ease-out
              ${sheetOpen ? "-translate-y-50" : ""}`}
        >
          <h1 className="text-4xl font-extrabold tracking-tight drop-shadow">
            FitCheck
          </h1>
          <p className="mt-2 text-white/85 ">
            AI-powered style picks for every special moment.
          </p>
        </div>

        {/* Lower nav bar stays */}
        <NavBar />
      </div>
    </div>
  );
}
