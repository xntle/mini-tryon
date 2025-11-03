// src/pages/Preferences.tsx
import { ChevronLeft } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { BUCKETS, buildSearchPlan, BucketKey } from "../lib/searchPlan";

/* --- tiny helpers to keep localStorage safe --- */
const BYTE_BUDGET_PER_ITEM = 2_000_000; // ~2 MB max per item (post-compress)

function storageUsable() {
  try {
    const k = "__probe__" + Math.random();
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

function approxBytesOfDataUrl(dataUrl: string) {
  const i = dataUrl.indexOf(",");
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

// downscale + jpeg encode to reduce size (async)
async function compressDataUrl(
  dataUrl: string,
  maxW = 800,
  maxH = 1200,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      const r = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width * r);
      const h = Math.round(img.height * r);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function savePhotoSafely(rawDataUrl: string) {
  if (!storageUsable()) throw new Error("localStorage unavailable");

  // Precompress if big
  let dataUrl = rawDataUrl;
  if (approxBytesOfDataUrl(dataUrl) > BYTE_BUDGET_PER_ITEM) {
    dataUrl = await compressDataUrl(dataUrl);
  }

  // Step down if still large
  const steps = [
    { w: 700, h: 1050, q: 0.7 },
    { w: 600, h: 900, q: 0.65 },
    { w: 480, h: 720, q: 0.6 },
  ];
  for (const s of steps) {
    if (approxBytesOfDataUrl(dataUrl) <= BYTE_BUDGET_PER_ITEM) break;
    dataUrl = await compressDataUrl(dataUrl, s.w, s.h, s.q);
  }

  // If it still doesn't fit your per-item budget, skip persisting to avoid crashes
  if (approxBytesOfDataUrl(dataUrl) > BYTE_BUDGET_PER_ITEM) {
    throw new Error("Selected photo is too large to store locally");
  }

  // Write (small) thumbnail only
  localStorage.setItem("selectedPhoto", dataUrl);
  return dataUrl;
}

/* --- your component --- */

interface PreferenceSection {
  title: string;
  options: string[];
  multiSelect: boolean;
}

const preferenceSections: PreferenceSection[] = [
  { title: "Gender", options: ["Women", "Men", "Unisex"], multiSelect: false },
  {
    title: "Occasion",
    options: [
      "Wedding/Engagement",
      "Date Night",
      "Formal Dinner",
      "Concert",
      "Vacation",
      "Business Meeting",
      "Graduation",
      "Birthday",
      "Casual Outing",
      "Party",
    ],
    multiSelect: false,
  },
  {
    title: "Vibe",
    options: [
      "Elegant & Classy",
      "Soft",
      "Bold",
      "Minimal",
      "Chic",
      "Trendy",
      "Vintage",
      "Bohemian",
      "Active",
    ],
    multiSelect: false,
  },
  {
    title: "Color Season",
    options: [
      "True Winter",
      "True Spring",
      "True Summer",
      "Soft Summer",
      "Bright Spring",
      "True Autumn",
      "Light Spring",
      "Dark Winter",
      "Don't know",
    ],
    multiSelect: false,
  },
  {
    title: "Categories to browse",
    options: Object.keys(BUCKETS),
    multiSelect: true,
  },
];

export default function Preferences() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: { photo?: string } };
  const [photo, setPhoto] = useState<string | null>(state?.photo ?? null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // SAFER: compress & store only if small enough; otherwise skip storing and keep in memory
  useEffect(() => {
    (async () => {
      try {
        if (!state?.photo) {
          // load small cached version if any
          const saved = storageUsable()
            ? localStorage.getItem("selectedPhoto")
            : null;
          if (saved) setPhoto(saved);
          return;
        }
        // Try to persist a compressed thumbnail; if too big, keep it only in state
        const small = await savePhotoSafely(state.photo);
        setPhoto(small);

        // 🔗 sync with the same keys the other screens use
        const rec = { id: crypto.randomUUID(), url: small, ts: Date.now() };
        const KEY = "fullBodyPhotos",
          CUR = "fullBodyCurrentUrl";
        const arr = JSON.parse(localStorage.getItem(KEY) || "[]").filter(
          (x: any) => x?.url !== small
        );
        arr.unshift(rec);
        localStorage.setItem(KEY, JSON.stringify(arr));
        localStorage.setItem(CUR, small);

        // tiny handoff too (avoids history size limits)
        sessionStorage.setItem("shop:incomingPhoto", small);
        setPhotoError(null);
      } catch (e: any) {
        console.warn("[Preferences] photo persist skipped:", e?.message || e);
        setPhoto(state?.photo ?? null); // keep in memory so UX continues
        setPhotoError(
          "We couldn't save your photo locally (it may be too large). It will still be used for this session."
        );
      }
    })();
  }, [state?.photo]);

  const [selections, setSelections] = useState<Record<string, string[]>>({
    Gender: ["Women"],
    Occasion: ["Wedding/Engagement"],
    Vibe: [],
    "Color Season": [],
    "Categories to browse": ["Dresses", "Tops"],
  });

  const handleBadgeClick = (
    section: string,
    option: string,
    multi: boolean
  ) => {
    setSelections((prev) => {
      const current = prev[section] || [];
      if (multi) {
        return current.includes(option)
          ? { ...prev, [section]: current.filter((i) => i !== option) }
          : { ...prev, [section]: [...current, option] };
      }
      return { ...prev, [section]: [option] };
    });
  };

  const isSelected = (section: string, option: string) =>
    (selections[section] || []).includes(option);

  const searchPlan = useMemo(() => {
    const occasion = selections["Occasion"]?.[0];
    const vibe = selections["Vibe"]?.[0];
    const colorSeason = selections["Color Season"]?.[0];
    const budget = selections["Budget"]?.[0];
    const categories = (selections["Categories to browse"] ||
      []) as BucketKey[];
    return buildSearchPlan({ occasion, vibe, colorSeason, budget, categories });
  }, [selections]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="flex items-center mb-8">
        <button
          onClick={() => navigate(-1)}
          className="mr-4 p-2 hover:bg-gray-200 rounded-full transition-colors"
        >
          <ChevronLeft />
        </button>
        <h1 className="text-2xl font-semibold">Preferences</h1>
        <div className="ml-auto text-sm text-gray-500">
          {photo ? "Photo added" : "Add a full body photo to continue"}
        </div>
      </div>

      {photoError && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {photoError}
        </div>
      )}

      {/* Sections */}
      <div className="space-y-8">
        {preferenceSections.map((section) => (
          <div key={section.title}>
            <h2 className="text-lg font-medium mb-4">{section.title}</h2>
            <div className="flex flex-wrap gap-3">
              {section.options.map((option) => (
                <button
                  key={option}
                  onClick={() =>
                    handleBadgeClick(section.title, option, section.multiSelect)
                  }
                  className="transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <div
                    className={`px-4 py-3 rounded-full text-sm font-medium ${
                      isSelected(section.title, option)
                        ? "bg-black text-white shadow-md"
                        : "bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300"
                    } min-h-[44px] flex items-center justify-center`}
                  >
                    {option}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Plan preview */}
        <div className="mt-4">
          <div className="text-sm text-gray-600 mb-2">We’ll start with:</div>
          <div className="flex flex-wrap gap-2">
            {searchPlan.seeds.slice(0, 6).map((s) => (
              <span
                key={s.query}
                className="px-3 py-1 rounded-full text-xs bg-white border"
              >
                {s.query}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="mt-12 mb-8">
        <button
          onClick={() => {
            try {
              if (!storageUsable()) throw new Error("localStorage unavailable");
              // preferences are tiny — safe to store
              localStorage.setItem(
                "userPreferences",
                JSON.stringify(selections)
              );
            } catch (e) {
              console.warn("Saving preferences failed:", e);
            }
            navigate("/loading", { state: { photo } });
          }}
          className="w-full bg-black text-white py-4 rounded-lg font-medium text-lg hover:bg-gray-800 disabled:opacity-50"
          disabled={!photo}
        >
          Save and Next
        </button>
      </div>
    </div>
  );
}
