import { ChevronLeft } from "lucide-react";
import React, { useRef, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface PreferenceSection {
  title: string;
  options: string[];
  multiSelect: boolean;
}

const preferenceSections: PreferenceSection[] = [
  {
    title: "Gender",
    options: ["Women", "Men", "Unisex"],
    multiSelect: false,
  },
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
    title: "Budget",
    options: ["<$50", "$50-100", "$100-250", "$250-500", "$500+"],
    multiSelect: false,
  },
];

export default function Preferences() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: { photo?: string } };
  const [photo, setPhoto] = useState<string | null>(state?.photo ?? null);

  // persist across refreshes (optional)
  useEffect(() => {
    if (state?.photo) localStorage.setItem("selectedPhoto", state.photo);
    if (!state?.photo) {
      const saved = localStorage.getItem("selectedPhoto");
      if (saved) setPhoto(saved);
    }
  }, [state?.photo]);

  const [selections, setSelections] = useState<Record<string, string[]>>({
    Gender: ["Women"],
    Occasion: ["Wedding/Engagement"],
    Vibe: [],
    "Color Season": [],
    Budget: [],
  });

  const handleBadgeClick = (
    section: string,
    option: string,
    multiSelect: boolean
  ) => {
    setSelections((prev) => {
      const current = prev[section] || [];
      if (multiSelect) {
        return current.includes(option)
          ? { ...prev, [section]: current.filter((i) => i !== option) }
          : { ...prev, [section]: [...current, option] };
      } else {
        return { ...prev, [section]: [option] };
      }
    });
  };

  const isBadgeSelected = (section: string, option: string) =>
    (selections[section] || []).includes(option);

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
      </div>

      {/* Preference Sections */}
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
                    className={`px-4 py-3 rounded-full text-sm font-medium transition-all duration-200 ${
                      isBadgeSelected(section.title, option)
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
      </div>

      {/* Save Button */}
      <div className="mt-12 mb-8">
        <button
          onClick={() => {
            console.log("Saving preferences:", selections);
            // Save preferences to localStorage for search functionality
            localStorage.setItem('userPreferences', JSON.stringify(selections));
            // forward photo to /shop so it can be used as bg
            navigate("/loading", { state: { photo } });
          }}
          className="w-full bg-black text-white py-4 rounded-lg font-medium text-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          disabled={!photo} // require a photo before continuing (optional)
        >
          Save and Next
        </button>
      </div>
    </div>
  );
}
