// TryOnButton.tsx
import { useState } from "react";

export function TryOnButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("http://localhost:3000/api/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // or pass your own URLs from user input
          // model_image, garment_image
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Request failed");
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  // Helper to display common shapes
  const images: string[] =
    (Array.isArray(result?.images) && result.images) ||
    (result?.image ? [result.image] : []);

  return (
    <div>
      <button onClick={run} disabled={loading}>
        {loading ? "Generating…" : "Try On"}
      </button>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {images.length > 0 ? (
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          {images.map((src: string, i: number) => (
            <img
              key={i}
              src={src}
              alt={`try-on ${i}`}
              style={{ width: "100%", borderRadius: 12 }}
            />
          ))}
        </div>
      ) : (
        result && <pre>{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}
