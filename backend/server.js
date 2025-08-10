// server.js
require("dotenv/config");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { fal } = require("@fal-ai/client");
// const { File } = require("undici"); // Node < 22

if (!process.env.FAL_AI_KEY) throw new Error("Missing FAL_AI_KEY");
fal.config({ credentials: process.env.FAL_AI_KEY });

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

const upload = multer({ limits: { fileSize: 25 * 1024 * 1024 } });

// ---- helper to pluck an image URL from any shape
function pluckFirstUrl(input, depth = 0) {
  if (depth > 6 || input == null) return null;
  if (typeof input === "string") {
    const s = input.trim();
    if (/^(https?:)?\/\//i.test(s) || s.startsWith("data:image/")) return s;
    return null;
  }
  if (Array.isArray(input)) {
    for (const v of input) {
      const u = pluckFirstUrl(v, depth + 1);
      if (u) return u;
    }
    return null;
  }
  if (typeof input === "object") {
    const priority = [
      "url",
      "image_url",
      "image",
      "output",
      "result",
      "data",
      "images",
      "items",
      "file",
      "files",
    ];
    for (const k of priority) {
      if (k in input) {
        const u = pluckFirstUrl(input[k], depth + 1);
        if (u) return u;
      }
    }
    for (const v of Object.values(input)) {
      const u = pluckFirstUrl(v, depth + 1);
      if (u) return u;
    }
  }
  return null;
}

// 1) Upload to FAL storage → public HTTPS URL
app.post("/api/fal-upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "file is required" });
    const { originalname, mimetype, buffer } = req.file;
    const file = new File([buffer], originalname || `upload-${Date.now()}`, {
      type: mimetype || "application/octet-stream",
    });
    const url = await fal.storage.upload(file);
    return res.json({ url });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e?.message || e) });
  }
});

// 2) Try-on: accept model_image & garment_image; return { url }
app.post("/api/tryon", async (req, res) => {
  try {
    const {
      model_image = "https://storage.googleapis.com/falserverless/example_inputs/model.png",
      garment_image = "https://storage.googleapis.com/falserverless/example_inputs/garment.webp",
    } = req.body || {};

    const sub = await fal.subscribe("fal-ai/fashn/tryon/v1.6", {
      input: { model_image, garment_image },
      logs: false,
    });

    const final = await fal.queue.result("fal-ai/fashn/tryon/v1.6", {
      requestId: sub.requestId,
    });

    // Normalize any shape to { url }
    const url = pluckFirstUrl(final?.data) || pluckFirstUrl(final) || null;

    if (!url) {
      console.warn(
        "[TRYON] Could not find image URL in:",
        JSON.stringify(final)?.slice(0, 800)
      );
      return res.status(502).json({ error: "Upstream returned no image URL" });
    }

    return res.json({ url }); // <--- consistent shape!
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e?.message || e) });
  }
});

app.listen(3000, () => console.log("API on http://localhost:3000"));
