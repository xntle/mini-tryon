import React from "react";
import { X, ShoppingCart, Home, Plus, Sparkles } from "lucide-react";
import NavBar from "../components/Navbar";


export default function TryOn() {
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

<div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-4 text-white/80 text-xs">
  <span>9:41</span>
  <div className="flex gap-1.5">
    <span className="inline-block h-2 w-2 rounded-full bg-white/80" />
    <span className="inline-block h-2 w-2 rounded-full bg-white/80" />
    <span className="inline-block h-2 w-6 rounded-md bg-white/80" />
  </div>
</div>

 {/* Bottom center group: home, dot, plus, avatar */}
 <div className="absolute bottom-40 left-1/2 -translate-x-1/2 flex items-center gap-4 z-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur text-white">
            <Home className="h-5 w-5" />
          </div>
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
          <button
            className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-xl hover:bg-violet-500 active:scale-95 transition"
            aria-label="Add"
          >
            <Plus className="h-6 w-6" />
          </button>
          <img
            src="https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=200&auto=format&fit=crop"
            alt="avatar"
            className="h-10 w-10 rounded-full ring-2 ring-yellow-400 object-cover"
          />
        </div>

<div className="absolute bottom-55 right-6 left-6 text-white z-10">
  <h1 className="text-4xl font-extrabold tracking-tight drop-shadow">FitCheck</h1>
  <p className="mt-2 text-white/85 leading-snug">
    AI‑powered style picks for every special moment.
  </p>
</div>


  <div className="mt-3 flex justify-center">
    <div className="h-1 w-24 rounded-full bg-white/40" />
  </div>
</div>
</div>
);
}
