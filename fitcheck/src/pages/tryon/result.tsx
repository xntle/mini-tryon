import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSavedProducts, useProductMedia } from "@shopify/shop-minis-react";
import { fal } from "@fal-ai/client";

fal.config({ credentials:  });

export default function TryOnResult() {
  const location = useLocation();
  const { products: savedProducts } = useSavedProducts();

  const [photo, setPhoto] = useState<string | null>(null);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [garmentImage, setGarmentImage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // Get state passed from yourfit page
    const state = location.state as { photo?: string; productIds?: string[] } | undefined;
    
    if (state?.photo) {
      setPhoto(state.photo);
      console.log("Received photo:", state.photo.substring(0, 30) + "...");
    } else {
      console.log("No photo received in state");
    }
    
    if (state?.productIds && state.productIds.length > 0) {
      setProductIds(state.productIds);
      console.log("Received product IDs:", state.productIds);

      // Set the first product as selected by default
      setSelectedProductId(state.productIds[0]);
    } else {
      console.log("No product IDs received in state");
    }
  }, [location]);

  // Get product media for the selected product
  const { media, loading: mediaLoading } = useProductMedia({
    id: selectedProductId || "",
    first: 5,
    skip: !selectedProductId
  });

  // When media loads, set the garment image
  useEffect(() => {
    if (!mediaLoading && media && media.length > 0) {
      // Get the first image from the product media
      const firstImage = media[0]?.image?.url;
      if (firstImage) {
        setGarmentImage(firstImage);
        console.log("Found garment image:", firstImage);
      } else {
        console.log("No image found in product media");
        setError("Couldn't find an image for the selected product");
      }
    }
  }, [media, mediaLoading]);

  // Get the selected product details
  const selectedProduct = savedProducts?.find(p => p.id === selectedProductId);

  // Function to upload model image to FAL storage
  const uploadModelImage = async (dataUrl: string) => {
    try {
      setUploadingImage(true);

      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // Upload to FAL storage
      const uploadedUrl = await fal.storage.upload(blob);
      
      return uploadedUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to upload image: ${message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  async function run() {
    if (!photo) {
      setError("No model photo available");
      return;
    }
    
    if (!garmentImage) {
      setError("No garment image available");
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      let modelImageUrl = photo;

      // Upload the model image to FAL if it's a data URL
      if (photo.startsWith('data:')) {
        console.log("Uploading model image to FAL storage...");
        modelImageUrl = await uploadModelImage(photo);
        console.log("Model image uploaded successfully:", modelImageUrl);
      }

      console.log("Making API request with URLs:");
      console.log("- Model image URL:", modelImageUrl);
      console.log("- Garment image URL:", garmentImage);

      // Send request to your backend with the URLs (not the data URLs)
      const r = await fetch("http://localhost:3000/api/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Use the modelImageUrl (which is now a FAL storage URL) instead of photo
          modelImageUrl: modelImageUrl,
          garmentImageUrl: garmentImage,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Request failed");
      console.log("API response:", data);
      setResult(data);
    } catch (e: any) {
      console.error("Error in try-on process:", e);
      setError(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  // Helper to display common shapes
  const images: string[] = (() => {
    if (!result) return [];
    
    // Log the result structure to debug
    console.log("Parsing result structure:", result);
    
    // Case 1: If result.images is an array of objects with url property
    if (Array.isArray(result.images)) {
      console.log("Found images array with length:", result.images.length);
      return result.images.map((img: any) => {
        if (typeof img === 'string') return img;
        return img.url || '';
      }).filter(Boolean);
    }
    
    // Case 2: If the result has a nested data structure (common with FAL responses)
    if (result.data && Array.isArray(result.data.images)) {
      console.log("Found images in result.data with length:", result.data.images.length);
      return result.data.images.map((img: any) => {
        if (typeof img === 'string') return img;
        return img.url || '';
      }).filter(Boolean);
    }
    
    // Case 3: If there's a single image property
    if (result.image) {
      console.log("Found single image property");
      return [result.image];
    }
    
    // Case 4: Check for image URLs in other common locations
    if (result.url) return [result.url];
    
    console.warn("Could not find images in the result structure");
    return [];
  })();

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
