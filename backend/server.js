// server.js
require("dotenv/config");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { fal } = require("@fal-ai/client");

// --- File polyfill for Node < 22
let FileCtor = global.File;
try {
  if (!FileCtor) FileCtor = require("undici").File;
} catch (_) {}
const File = FileCtor;

if (!process.env.FAL_AI_KEY) throw new Error("Missing FAL_AI_KEY");
fal.config({ credentials: process.env.FAL_AI_KEY });

const app = express();

/* ---------------------------
   CORS (reflect origin in dev or allowlist via env)
   FRONTEND_ORIGIN can be comma-separated origins
---------------------------- */
const allowedOrigins = [
  /^http:\/\/localhost:\d+$/, // Shop Mini runtime (required)
  "https://mini-tryon-production.up.railway.app",
  "https://cdn.fashn.ai", // your API itself (optional)
  // add any other internal callers if needed
];

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // allow server-to-server & curl without Origin
      const ok = allowedOrigins.some((o) =>
        typeof o === "string" ? o === origin : o.test(origin)
      );
      return ok ? cb(null, true) : cb(new Error("Not allowed by CORS"));
    },
    methods: ["POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Origin"],
  })
);

app.use(express.json({ limit: "16mb" })); // bump a little for data URLs
app.use(express.urlencoded({ extended: true, limit: "16mb" }));

/* ---------------------------
   Multer (memory storage)
---------------------------- */
const upload = multer({ limits: { fileSize: 25 * 1024 * 1024 } });

/* ---------------------------
   Helpers
---------------------------- */
// pluck an image URL from any shape
function pluckFirstUrl(input, depth = 0) {
  if (depth > 6 || input == null) return null;
  if (typeof input === "string") {
    const s = input.trim();
    return /^(https?:)?\/\//i.test(s) || s.startsWith("data:image/") ? s : null;
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

const isHttpUrl = (s) => typeof s === "string" && /^https?:\/\//i.test(s);
const isDataUrl = (s) => typeof s === "string" && s.startsWith("data:image/");

function fileFromDataUrl(name, dataUrl) {
  const [meta, b64] = (dataUrl || "").split(",");
  const m = /data:(.*?);base64/.exec(meta || "");
  const mime = (m && m[1]) || "image/jpeg";
  const buf = Buffer.from(b64 || "", "base64");
  return new File([buf], name, { type: mime });
}

async function ensureRemoteUrl(input, tag) {
  if (!input) return null;
  if (isHttpUrl(input)) return input;
  if (isDataUrl(input)) {
    const file = fileFromDataUrl(`${tag || "upload"}-${Date.now()}.jpg`, input);
    const url = await fal.storage.upload(file); // public HTTPS
    return url;
  }
  return null; // unsupported shapes
}

/* ---------------------------
   Routes
---------------------------- */

// Healthcheck (optional)
app.get("/api/healthz", (_req, res) => res.json({ ok: true }));

// 1) Upload to FAL storage → public HTTPS URL
app.post("/api/fal-upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "file is required" });
    const { originalname, mimetype, buffer } = req.file;
    const type = mimetype || "image/jpeg";
    const name = originalname || `upload-${Date.now()}.jpg`;
    const file = new File([buffer], name, { type });
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
    let { model_image, garment_image } = req.body || {};

    // defaults if nothing passed
    if (!model_image)
      model_image =
        "https://storage.googleapis.com/falserverless/example_inputs/model.png";
    if (!garment_image)
      garment_image =
        "https://storage.googleapis.com/falserverless/example_inputs/garment.webp";

    // Normalize any data:image/... to HTTPS by uploading
    const modelUrl = await ensureRemoteUrl(model_image, "model");
    const garmentUrl = await ensureRemoteUrl(garment_image, "garment");

    const input = {
      model_image: modelUrl || (isHttpUrl(model_image) ? model_image : null),
      garment_image:
        garmentUrl || (isHttpUrl(garment_image) ? garment_image : null),
    };

    if (!input.model_image || !input.garment_image) {
      return res
        .status(400)
        .json({ error: "Invalid images: need HTTPS or data:image/*" });
    }

    const sub = await fal.subscribe("fal-ai/fashn/tryon/v1.6", {
      input,
      logs: false,
    });

    const requestId = sub.requestId || sub.request_id; // guard both casings
    if (!requestId) {
      return res
        .status(502)
        .json({ error: "Upstream did not return requestId" });
    }

    const final = await fal.queue.result("fal-ai/fashn/tryon/v1.6", {
      requestId,
    });

    const url = pluckFirstUrl(final?.data) || pluckFirstUrl(final) || null;
    if (!url) {
      console.warn(
        "[TRYON] Could not find image URL in:",
        JSON.stringify(final)?.slice(0, 800)
      );
      return res.status(502).json({ error: "Upstream returned no image URL" });
    }
    return res.json({ url });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e?.message || e) });
  }
});

/* ---------------------------
   Boot
---------------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API listening on ${PORT}`));
