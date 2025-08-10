import { useState } from 'react';
import { Badge } from '@shopify/shop-minis-react';
import { useNavigate } from 'react-router-dom';

interface PreferenceSection {
  title: string;
  options: string[];
  multiSelect: boolean;
}

const preferenceSections: PreferenceSection[] = [
  {
    title: "Occasion",
    options: ["Concert", "Vacation", "Date Night", "Formal Dinner", "Graduation", "Birthday", "Wedding/Engagement"],
    multiSelect: false
  },
  {
    title: "Vibe",
    options: ["Elegant & Classy", "Soft", "Bold", "Minimal", "Chic", "Trendy", "Vintage", "Bohemian", "Active"],
    multiSelect: false
  },
  {
    title: "Color Season",
    options: ["True Winter", "True Spring", "True Summer", "Soft Summer", "Bright Spring", "True Autumn", "Light Spring", "Dark Winter", "Don't know"],
    multiSelect: false
  },
  {
    title: "Budget",
    options: ["<$50", "$50-100", "$100-250", "$250-500", "$500+"],
    multiSelect: false
  }
];

export default function Preferences() {
  const navigate = useNavigate();
  const [selections, setSelections] = useState<Record<string, string[]>>({
    "Occasion": ["Wedding/Engagement"],
    "Vibe": [],
    "Color Season": [],
    "Budget": []
  });

  const handleBadgeClick = (section: string, option: string, multiSelect: boolean) => {
    setSelections(prev => {
      const current = prev[section] || [];
      
      if (multiSelect) {
        // Multi-select: toggle the option
        if (current.includes(option)) {
          return { ...prev, [section]: current.filter(item => item !== option) };
        } else {
          return { ...prev, [section]: [...current, option] };
        }
      } else {
        // Single select: replace with new selection
        return { ...prev, [section]: [option] };
      }
    });
  };

  const isBadgeSelected = (section: string, option: string): boolean => {
    return (selections[section] || []).includes(option);
  };

  const getBadgeVariant = (section: string, option: string): "default" | "outline" => {
    return isBadgeSelected(section, option) ? "default" : "outline";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="flex items-center mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="mr-4 p-2 hover:bg-gray-200 rounded-full transition-colors"
        >
          <span className="text-2xl">←</span>
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
                  onClick={() => handleBadgeClick(section.title, option, section.multiSelect)}
                  className="transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <div className={`
                    px-4 py-3 rounded-full text-sm font-medium transition-all duration-200
                    ${isBadgeSelected(section.title, option) 
                      ? 'bg-black text-white shadow-md' 
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300'
                    }
                    min-h-[44px] flex items-center justify-center
                  `}>
                    {option}
                    {isBadgeSelected(section.title, option) && section.title === "Occasion" && option === "Wedding/Engagement" && (
                      <span className="ml-2 opacity-75">×</span>
                    )}
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
            // Save preferences to localStorage for use in try-on flow
            localStorage.setItem('userPreferences', JSON.stringify({
              occasion: selections["Occasion"] || [],
              vibe: selections["Vibe"] || [],
              colorSeason: selections["Color Season"] || [],
              budget: selections["Budget"] || []
            }));
            console.log('Saving preferences:', selections);
            navigate('/home');
          }}
          className="w-full bg-black text-white py-4 rounded-lg font-medium text-lg hover:bg-gray-800 transition-colors"
        >
          Save and Next
        </button>
      </div>
    </div>
  );
}
