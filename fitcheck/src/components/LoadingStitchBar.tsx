// LoadingStitchBarMini.tsx
export default function LoadingStitchBar({ label = "Stitching your look…" }) {
  return (
    <div className="fixed left-1/2 top-4 z-30 -translate-x-1/2">
      <div className="mx-auto w-[min(520px,92vw)] rounded-full bg-zinc-900/70 backdrop-blur border border-zinc-800 px-3 py-2">
        <div className="text-[11px] text-zinc-300 mb-1">{label}</div>
        <div className="relative h-2 overflow-hidden rounded-full bg-zinc-800">
          <span className="absolute inset-y-0 w-1/3 animate-[stitch_1.2s_linear_infinite] bg-gradient-to-r from-fuchsia-400/0 via-fuchsia-400 to-fuchsia-400/0" />
          <span className="absolute -top-3 animate-[needle_1.2s_linear_infinite]">
            🪡
          </span>
        </div>
      </div>
      <style>{`
        @keyframes stitch { 0%{left:-35%} 100%{left:100%} }
        @keyframes needle { 0%{left:-6%} 100%{left:101%} }
      `}</style>
    </div>
  );
}
