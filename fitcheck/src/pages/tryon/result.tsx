// TryOnButton.tsx
import { useState } from "react";
import { getSavedModelUrl, uploadToFal, isHttpUrl } from "./helpers"; // adjust path

type Props = {
  garmentUrl?: string; // product image URL
  modelUrlOverride?: string; // optional override (skips localStorage)
};

export function TryOnButton({ garmentUrl, modelUrlOverride }: Props) {
  const [loading, setLoading] = useState(false);
  const [img, setImg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setErr(null);
    setImg(null);

    try {
      // 1) get model (override > saved)
      let model = modelUrlOverride ?? getSavedModelUrl();
      if (!model)
        throw new Error("No model photo found. Add a full body photo first.");

      // 2) ensure HTTPS (upload if dataURL)
      const modelHttps = await uploadToFal(model);

      // 3) call try-on (garment can be https url or undefined to use server default)
      const r = await fetch("/api/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_image: modelHttps,
          garment_image:
            garmentUrl && isHttpUrl(garmentUrl) ? garmentUrl : garmentUrl, // if you pass one
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Try-on failed");

      const out =
        data?.url ||
        data?.image ||
        (Array.isArray(data?.images) && data.images[0]);
      if (!out) throw new Error("No image URL returned");
      setImg(out);
      // optional: console.log("used inputs", data.used);
    } catch (e: any) {
      setErr(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={run} disabled={loading}>
        {loading ? "Generating…" : "Try On"}
      </button>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
      {img && (
        <img
          src={img}
          alt="try-on result"
          style={{
            width: "100%",
            maxWidth: 480,
            borderRadius: 12,
            marginTop: 12,
          }}
        />
      )}
    </div>
  );
}
