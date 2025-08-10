require("dotenv/config");
const express = require("express");
const cors = require("cors");
const { fal } = require("@fal-ai/client");

if (!process.env.FAL_AI_KEY) throw new Error("Missing FAL_AI_KEY");
fal.config({ credentials: process.env.FAL_AI_KEY });

const app = express();
app.use(cors()); // remove if you use a dev proxy
app.use(express.json());

async function runTryOn({ model_image, garment_image }) {
  const sub = await fal.subscribe("fal-ai/fashn/tryon/v1.6", {
    input: { model_image, garment_image },
    logs: false, // keep API simple; you can add streaming later
  });

  const final = await fal.queue.result("fal-ai/fashn/tryon/v1.6", {
    requestId: sub.requestId,
  });

  return final.data; // <-- this is what the frontend needs
}

app.post("/api/tryon", async (req, res) => {
  try {
    const data = await runTryOn({
      model_image:
        req.body?.model_image ??
        "https://storage.googleapis.com/falserverless/example_inputs/model.png",
      garment_image:
        req.body?.garment_image ??
        "https://storage.googleapis.com/falserverless/example_inputs/garment.webp",
    });
    res.json(data); // <-- send to frontend
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.listen(3000, () => console.log("API on http://localhost:3000"));