import React, { useEffect, useState } from "react";

export type ToastKind = "progress" | "success" | "info" | "error";
export type ToastMsg = { type: ToastKind; msg: string };

export function toast(n: ToastMsg) {
  window.dispatchEvent(new CustomEvent("fc:toast", { detail: n }));
}

export function ToastHost() {
  const [note, setNote] = useState<ToastMsg | null>(null);

  useEffect(() => {
    const on = (e: Event) => {
      const ev = e as CustomEvent<ToastMsg>;
      setNote(ev.detail);
      if (ev.detail.type !== "progress") {
        const t = setTimeout(() => setNote(null), 1400);
        return () => clearTimeout(t);
      }
    };
    window.addEventListener("fc:toast", on as any);
    return () => window.removeEventListener("fc:toast", on as any);
  }, []);

  if (!note) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999]">
      <div
        className={
          "rounded-full px-4 py-2 text-sm shadow " +
          (note.type === "success"
            ? "bg-green-600 text-white"
            : note.type === "error"
            ? "bg-red-600 text-white"
            : note.type === "info"
            ? "bg-black/80 text-white"
            : "bg-black/70 text-white")
        }
      >
        {note.msg}
      </div>
    </div>
  );
}
