import React, { useEffect, useState } from "react";
import NavBar from "../components/Navbar";

// inside TryonResult.tsx

function MakeVideoButton({
  imageUrl,
  defaultPrompt = "",
}: {
  imageUrl: string;
  defaultPrompt?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prompt =
    defaultPrompt ||
    "Slow dolly-in on the subject, subtle head turn and natural breathing.";

  async function run() {
    try {
      setLoading(true);
      setError(null);
      setVideoUrl(null);

      const res = await fetch("/api/fal-i2v", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrl, // can be data: URI
          prompt,
          resolution: "720p",
          aspect_ratio: "auto",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.videoUrl)
        throw new Error(json.error || "No video URL");
      setVideoUrl(json.videoUrl);
    } catch (e: any) {
      setError(e.message || "Failed to create video");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        className="px-4 py-2 rounded-lg bg-black text-white font-medium disabled:opacity-50"
        onClick={run}
        disabled={loading}
      >
        {loading ? "Generating…" : "Make Video"}
      </button>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {videoUrl && (
        <div className="mt-4 rounded-xl overflow-hidden border border-gray-200">
          <video
            src={videoUrl}
            controls
            playsInline
            loop
            className="w-full h-auto"
          />
        </div>
      )}
    </div>
  );
}

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
        {/* Background image */}
        <img
          src="https://images.unsplash.com/photo-1516826957135-700dedea698c?q=80&w=1600&auto=format&fit=crop"
          alt="Outfit"
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />

        <div
          className={`absolute bottom-40 right-6 left-6 text-white z-10
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
