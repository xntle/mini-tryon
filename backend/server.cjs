require("dotenv/config");
const express = require("express");
const cors = require("cors");
const { fal } = require("@fal-ai/client");

if (!process.env.FAL_AI_KEY) throw new Error("Missing FAL_AI_KEY");
fal.config({ credentials: });

const app = express();
app.use(cors()); // remove if you use a dev proxy
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

async function runTryOn({ model_image, garment_image }) {
  console.log("Starting try-on with:");
  console.log("- Model image:", model_image.substring(0, 50) + "...");
  console.log("- Garment image:", garment_image.substring(0, 50) + "...");
  
  const sub = await fal.subscribe("fal-ai/fashn/tryon/v1.6", {
    input: { model_image, garment_image },
    logs: true, // Enable logs to help with debugging
    onQueueUpdate: (update) => {
      console.log(`Status: ${update.status}`);
      if (update.logs && update.logs.length > 0) {
        update.logs.forEach(log => console.log(`Log: ${log.message}`));
      }
    }
  });

  console.log("Request submitted with ID:", sub.requestId);
  
  const final = await fal.queue.result("fal-ai/fashn/tryon/v1.6", {
    requestId: sub.requestId,
  });

  console.log("Processing complete!");
  
  return {
    ...final.data,
    requestId: sub.requestId
  };
}

app.post("/api/tryon", async (req, res) => {
  try {
    console.log("Received try-on request");
    console.log("Request body keys:", Object.keys(req.body));
    
    // Extract modelImageUrl and garmentImageUrl from the request
    const { modelImageUrl, garmentImageUrl } = req.body;
    
    // Validate the inputs
    if (!modelImageUrl) {
      console.warn("No model image URL provided");
    }
    
    if (!garmentImageUrl) {
      console.warn("No garment image URL provided");
    }
    
    // Run the try-on with the provided URLs or fall back to examples
    const data = await runTryOn({
      model_image: modelImageUrl || 
        "https://storage.googleapis.com/falserverless/example_inputs/model.png",
      garment_image: garmentImageUrl || 
        "https://storage.googleapis.com/falserverless/example_inputs/garment.webp",
    });
    
    // Send the result to the frontend
    res.json({
      success: true,
      ...data
    });
  } catch (e) {
    console.error("Error processing try-on:", e);
    res.status(500).json({ 
      success: false,
      error: String(e?.message || e) 
    });
  }
});

// Add an example endpoint to test with known working images
app.get("/api/tryon/example", async (req, res) => {
  try {
    console.log("Running try-on example");
    
    const data = await runTryOn({
      model_image: "https://storage.googleapis.com/falserverless/example_inputs/model.png",
      garment_image: "https://storage.googleapis.com/falserverless/example_inputs/garment.webp",
    });
    
    res.json({
      success: true,
      ...data
    });
  } catch (e) {
    console.error("Error in example:", e);
    res.status(500).json({ 
      success: false,
      error: String(e?.message || e) 
    });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));