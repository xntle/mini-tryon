export default function LoadingStitchBar({
  label: _label = "Generating your look…",
}: {
  label?: string;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        opacity: 0.2,
        padding: "3px",
        background:
          "linear-gradient(90deg, #7c3aed, #2563eb, #06b6d4, #10b981, #ec4899, #7c3aed)",
        backgroundSize: "300% 100%",
        animation: "rainbowBorder 3s linear infinite",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "transparent",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          paddingTop: "52px",
        }}
      >
        <p
          style={{
            color: "white",
            fontSize: "13px",
            fontWeight: 400,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            margin: 0,
            opacity: 0.75,
            textShadow: "0 1px 6px rgba(0,0,0,0.6)",
          }}
        >
          Stitching your look
        </p>
      </div>
      <style>{`
        @keyframes rainbowBorder {
          0%   { background-position: 0%   50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>
    </div>
  );
}
