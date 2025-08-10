// src/pages/TryonResult.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, Link, Navigate } from "react-router-dom";
import { useSavedProducts, ProductCard } from "@shopify/shop-minis-react";

type State = { photo?: string; productIds?: string[] };
// inside TryonResult.tsx

function MakeVideoButton({
  imageUrl,
  defaultPrompt = "",
}: {
  imageUrl: string;
  defaultPrompt?: string;
}) {
  const [phase, setPhase] = useState<
    "idle" | "requesting" | "probing" | "ready" | "error"
  >("idle");
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [probeAttempts, setProbeAttempts] = useState(0);
  const prompt =
    defaultPrompt ||
    "Slow dolly-in on the subject, subtle head turn and natural breathing.";

  // simple timer
  useEffect(() => {
    if (!loading) return;
    const t0 = performance.now();
    const id = setInterval(
      () => setElapsed(Math.round((performance.now() - t0) / 1000)),
      250
    );
    return () => clearInterval(id);
  }, [loading]);

  // HEAD probe with exponential backoff to ensure the URL is actually live
  async function probeUrl(url: string, maxTries = 6) {
    setPhase("probing");
    for (let i = 1; i <= maxTries; i++) {
      setProbeAttempts(i);
      try {
        const head = await fetch(url, { method: "HEAD", cache: "no-cache" });
        if (head.ok) return true;
      } catch {}
      // backoff: 400ms, 800ms, 1200ms, ...
      await new Promise((r) => setTimeout(r, 400 * i));
    }
    return false;
  }

  async function run() {
    try {
      setLoading(true);
      setError(null);
      setVideoUrl(null);
      setElapsed(0);
      setProbeAttempts(0);
      setPhase("requesting");

      // 1) ask your proxy to generate the video
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
        throw new Error(json.error || "No video URL returned");

      // 2) probe the URL until it’s really there
      const ok = await probeUrl(json.videoUrl);
      if (!ok)
        throw new Error("Video not ready yet (CDN warm‑up failed). Try again.");

      // 3) show it
      setVideoUrl(json.videoUrl);
      setPhase("ready");
    } catch (e: any) {
      setError(e.message || "Failed to create video");
      setPhase("error");
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
        {phase === "requesting"
          ? "Generating…"
          : phase === "probing"
          ? "Preparing video…"
          : "Make Video"}
      </button>

      {/* Tiny status readout */}
      <div className="mt-2 text-xs text-gray-500">
        {loading && (
          <>
            <span className="inline-block mr-2">
              {phase === "requesting" && "Contacting model…"}
              {phase === "probing" && `Finalizing (${probeAttempts} checks)…`}
            </span>
            <span>{elapsed}s elapsed</span>
          </>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {videoUrl && (
        <div className="mt-4 rounded-xl overflow-hidden border border-gray-200">
          <video
            src={videoUrl}
            controls
            playsInline
            loop
            className="w-full h-auto"
            onLoadedData={() => {
              // definitive signal that the browser can decode/play it
              console.log("Video loaded");
            }}
            onError={(e) => {
              console.warn("Video failed to load", e);
              setError("Video URL returned but failed to load in the player.");
              setPhase("error");
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function TryonResult() {
  const { state } = useLocation() as { state?: State };
  const userPhoto = state?.photo ?? null;
  const productIds = state?.productIds ?? [];

  // Guards
  if (!productIds.length) return <Navigate to="/select" replace />;
  if (!userPhoto) {
    // We can still show products, but try‑on needs a model image
    // Send them back to pick a photo
    return <Navigate to="/home" replace />;
  }

  const { products: saved } = useSavedProducts();
  const selectedProducts = useMemo(
    () => (saved ?? []).filter((p) => productIds.includes(p.id)),
    [saved, productIds]
  );

  const [loading, setLoading] = useState(true);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  // Try to extract a garment image from the first selected product
  const garmentImageUrl: string | null = useMemo(() => {
    const p: any = selectedProducts[0];
    if (!p) return null;
    return (
      p?.featuredImage?.url ||
      p?.images?.[0]?.originalSrc ||
      p?.images?.[0]?.url ||
      p?.image?.src ||
      null
    );
  }, [selectedProducts]);

  useEffect(() => {
    cancelled.current = false;

    async function processImages() {
      try {
        setLoading(true);
        setError(null);
        setResultImage(null);

        if (!selectedProducts.length) {
          setError("No products found.");
          setLoading(false);
          return;
        }
        if (!garmentImageUrl) {
          setError("Could not find a product image for try‑on.");
          setLoading(false);
          return;
        }

        // 1) Start job
        const runRes = await fetch("https://api.fashn.ai/v1/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.REACT_APP_FASHN_API_KEY}`,
          },
          body: JSON.stringify({
            model_name: "tryon-v1.6",
            inputs: {
              model_image: userPhoto, // <-- your selected/captured photo
              garment_image: garmentImageUrl, // <-- first selected product image
            },
          }),
        });
        if (!runRes.ok) throw new Error(`Run request failed: ${runRes.status}`);
        const { id } = await runRes.json();

        // 2) Poll
        // simple polling with cancel guard
        // eslint-disable-next-line no-constant-condition
        while (true) {
          if (cancelled.current) return;

          const statusRes = await fetch(
            `https://api.fashn.ai/v1/status/${id}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.REACT_APP_FASHN_API_KEY}`,
              },
            }
          );
          if (!statusRes.ok)
            throw new Error(`Status check failed: ${statusRes.status}`);

          const statusData = await statusRes.json();
          const status: string = statusData.status;

          if (status === "completed") {
            const out = statusData.output?.[0];
            setResultImage(typeof out === "string" ? out : null);
            setLoading(false);
            return;
          }
          if (status === "failed") {
            setError("Try‑on generation failed.");
            setLoading(false);
            return;
          }

          await new Promise((r) => setTimeout(r, 1500));
        }
      } catch (e) {
        console.error("Try-on error:", e);
        setError("Failed to process images. Please try again.");
        setLoading(false);
      }
    }

    processImages();

    return () => {
      cancelled.current = true;
    };
  }, [userPhoto, garmentImageUrl, selectedProducts]);

  return (
    <div className="min-h-dvh pb-16 pt-6 px-4 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Your Try‑On Result</h1>
        <Link to="/tryon/yourfit" className="text-sm underline text-gray-600">
          Back to selection
        </Link>
      </div>

      {/* Show the inputs up front */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl overflow-hidden border border-gray-200">
          <img
            src={userPhoto}
            alt="Your photo"
            className="w-full h-full object-cover"
          />
          <div className="px-3 py-2 text-xs text-gray-600">Your photo</div>
        </div>
        <div className="rounded-xl overflow-hidden border border-gray-200">
          {garmentImageUrl ? (
            <img
              src={garmentImageUrl}
              alt="Garment"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="h-40 grid place-items-center text-sm text-gray-500">
              No product image found
            </div>
          )}
          <div className="px-3 py-2 text-xs text-gray-600">
            Selected garment
          </div>
        </div>
      </div>

      {/* Display selected products (full cards) */}
      <div className="mb-6">
        <h2 className="text-lg font-medium mb-3">Selected Items</h2>
        <div className="grid grid-cols-2 gap-4">
          {selectedProducts.map((product) => (
            <div
              key={product.id}
              className="rounded-xl border border-gray-200 overflow-hidden"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>

      {/* Result / states */}
      <div className="flex flex-col items-center justify-center">
        {loading ? (
          <div className="py-12 flex flex-col items-center">
            <div className="mb-4 w-12 h-12 border-4 border-t-black border-gray-200 rounded-full animate-spin"></div>
            <p className="text-gray-600">Creating your look...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Link
              to="/tryon/yourfit"
              className="px-4 py-2 rounded-lg bg-black text-white font-medium"
            >
              Try Again
            </Link>
          </div>
        ) : (
          <div className="w-full">
            {resultImage && (
              <div className="rounded-xl overflow-hidden mb-6 border border-gray-200">
                <img
                  src={resultImage}
                  alt="Virtual try‑on result"
                  className="w-full h-auto"
                />
              </div>
            )}

            {userPhoto && (
              <MakeVideoButton
                imageUrl={userPhoto}
                defaultPrompt="A gentle camera orbit around the person, subtle natural motion, fashion lookbook vibe."
              />
            )}

            <div className="flex justify-center gap-4 mt-6">
              <Link
                to="/tryon/yourfit"
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium"
              >
                Try Different Items
              </Link>
              <button
                className="px-4 py-2 rounded-lg bg-black text-white font-medium"
                onClick={() => {
                  // TODO: Share flow
                  alert("Share functionality would go here");
                }}
              >
                Share Look
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
