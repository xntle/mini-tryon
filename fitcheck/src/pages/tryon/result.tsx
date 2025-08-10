import React, { useEffect, useState } from "react";
import { useLocation, Link, Navigate } from "react-router-dom";
import { useSavedProducts, ProductCard } from "@shopify/shop-minis-react";
import { fal } from "@fal-ai/client";

type LocationState = { productIds?: string[] };

export default function TryonResult() {
  const location = useLocation();
  const { products: saved } = useSavedProducts();
  const [loading, setLoading] = useState(true);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const productIds =
    (location.state as LocationState | undefined)?.productIds ?? [];

  // If user got here without selecting anything, bounce them back
  if (!productIds.length) return <Navigate to="/select" replace />;

  // Filter selected products
  const selectedProducts = (saved ?? []).filter((p) =>
    productIds.includes(p.id)
  );

  useEffect(() => {
    async function processImages() {
      try {
        setLoading(true);

        if (!selectedProducts.length) {
          setError("No products found");
          setLoading(false);
          return;
        }

        // Extract garment image URL (first product's main image)
        const garmentImageUrl =
          "https://plus.unsplash.com/premium_photo-1673758905770-a62f4309c43c?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

        const modelImageUrl =
          "https://storage.googleapis.com/falserverless/example_inputs/model.png";

        // Step 1: Run the try-on model
        const runRes = await fetch("https://api.fashn.ai/v1/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.REACT_APP_FASHN_API_KEY}`,
          },
          body: JSON.stringify({
            model_name: "tryon-v1.6",
            inputs: {
              model_image: modelImageUrl,
              garment_image: garmentImageUrl,
            },
          }),
        });

        if (!runRes.ok) {
          throw new Error(`Run request failed: ${runRes.status}`);
        }

        const { id } = await runRes.json();

        // Step 2: Poll for the result
        let status = "";
        while (status !== "completed") {
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
          status = statusData.status;

          if (status === "completed") {
            setResultImage(statusData.output[0]); // result image URL
            setLoading(false);
            break;
          } else if (status === "failed") {
            setError("Try-on generation failed.");
            setLoading(false);
            break;
          }

          // Wait before polling again
          await new Promise((r) => setTimeout(r, 2000));
        }
      } catch (err) {
        console.error("Error processing images:", err);
        setError("Failed to process images. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    processImages();
  }, [productIds, saved]);

  return (
    <div className="min-h-dvh pb-16 pt-6 px-4 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Your Try-On Result</h1>
        <Link to="/tryon/yourfit" className="text-sm underline text-gray-600">
          Back to selection
        </Link>
      </div>

      {/* Display selected products */}
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
              <div className="rounded-xl overflow-hidden mb-6">
                <img
                  src={resultImage}
                  alt="Virtual try-on result"
                  className="w-full h-auto"
                />
              </div>
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
