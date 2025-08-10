import React, { useEffect, useState } from "react";
import NavBar from "../components/Navbar";


export default function TryOn() {
  const [sheetOpen, setSheetOpen] = useState(false);

useEffect(() => {
  const handler = (e: Event) => {
    const ce = e as CustomEvent<boolean>;
    setSheetOpen(Boolean(ce.detail));
  };
  window.addEventListener("fc:sheet", handler as EventListener);
  return () => window.removeEventListener("fc:sheet", handler as EventListener);
}, []);

  return (
    <div className="min-h-screen w-full grid place-items-center">
    {/* Phone frame (375x812 like iPhone 14 logical points) */}
    <div className="h-fill w-fill overflow-hidden rounded-[40px] shadow-2xl ">
      {/* Background image */}
      <img
        src="https://images.unsplash.com/photo-1516826957135-700dedea698c?q=80&w=1600&auto=format&fit=crop"
        alt="Outfit"
        className="absolute inset-0 h-full w-full object-cover"
      />

<div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />

{/* Avatar (centered) */}
<div
  className={`absolute bottom-40 left-1/2 -translate-x-1/2 z-10
              transition-transform duration-300 ease-out
              ${sheetOpen ? "-translate-y-[200px]" : ""}`}
>
  <img
    src="https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=200&auto=format&fit=crop"
    alt="avatar"
    className="h-14 w-14 rounded-full ring-2 ring-yellow-400 object-cover"
  />
</div>

<div
  className={`absolute bottom-55 right-6 left-6 text-white z-10
              transition-transform duration-300 ease-out
              ${sheetOpen ? "-translate-y-50" : ""}`}
>
  <h1 className="text-4xl font-extrabold tracking-tight drop-shadow">FitCheck</h1>
  <p className="mt-2 text-white/85 leading-snug">
    AI-powered style picks for every special moment.
  </p>
</div>


  {/* Lower nav bar stays */}
  <NavBar />
  </div>
</div>
);
}
