import { useState } from 'react';
import { Badge, useSavedProducts } from '@shopify/shop-minis-react';
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
  const { saveProduct } = useSavedProducts();
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
          onClick={async () => {
            // Save preferences to localStorage
            localStorage.setItem('userPreferences', JSON.stringify({
              occasion: selections["Occasion"] || [],
              vibe: selections["Vibe"] || [],
              colorSeason: selections["Color Season"] || [],
              budget: selections["Budget"] || []
            }));

            // Auto-save test products based on preferences for testing
            const testProducts = [
              {
                id: 'test-elegant-dress',
                title: 'Elegant Black Evening Dress',
                price: { amount: '180.00', currencyCode: 'USD' },
                images: [{ url: 'https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop' }],
                vendor: 'Test Store'
              },
              {
                id: 'test-chic-outfit',
                title: 'Chic Date Night Dress',
                price: { amount: '120.00', currencyCode: 'USD' },
                images: [{ url: 'https://images.pexels.com/photos/994234/pexels-photo-994234.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop' }],
                vendor: 'Test Store'
              },
              {
                id: 'test-bohemian-dress',
                title: 'Vintage Bohemian Dress',
                price: { amount: '95.00', currencyCode: 'USD' },
                images: [{ url: 'https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop' }],
                vendor: 'Test Store'
              }
            ];

            // Save each test product
            for (const product of testProducts) {
              try {
                await saveProduct(product);
              } catch (error) {
                console.log('Product save error:', error);
              }
            }

            console.log('Saved preferences');
            navigate('/saved-carousel-test');
          }}
          className="w-full bg-black text-white py-4 rounded-lg font-medium text-lg hover:bg-gray-800 transition-colors"
        >
          Save and Next
        </button>
      </div>
    </div>
  );
}
