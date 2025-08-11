import { useEffect, useState, useMemo } from 'react';
import { 
  useProductSearch, 
  useRecommendedProducts,
  useSavedProducts
} from '@shopify/shop-minis-react';
import { useNavigate } from 'react-router-dom';
import PreferencesCarousel from '../components/PreferencesCarousel';
import { buildQueries, UserPreferences } from '../lib/preferencesToQueries';

export default function SavedCarouselTest() {
  const navigate = useNavigate();
  useSavedProducts();
  
  // Get user preferences first
  const userPreferences: UserPreferences = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('userPreferences') || '{}');
    } catch {
      return {
        occasion: ['Date Night'],
        vibe: ['Elegant & Classy'],
        colorSeason: ['True Winter'],
        budget: ['$100-250']
      };
    }
  }, []);
  
  // Build up to 3 sub-queries from full preferences (taxonomized)
  const subQueries = useMemo(() => buildQueries(userPreferences), [userPreferences]);
  
  // Run up to 3 searches at the top level (hooks must be static)
  const s1 = useProductSearch({ query: subQueries[0] || '', first: 6 });
  const s2 = useProductSearch({ query: subQueries[1] || '', first: 6 });
  const s3 = useProductSearch({ query: subQueries[2] || '', first: 6 });
  
  // Fallback to recommended products if search fails
  const recommendedProducts = useRecommendedProducts();
  
  const [isSearching, setIsSearching] = useState(true);
  const [searchComplete, setSearchComplete] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Merge and finalize the results from s1/s2/s3, with fallback and a single item
  const finalProducts = useMemo(() => {
    const byId = new Map<string, any>();
    const add = (arr?: any[] | null) => (arr || []).forEach(p => { if (p?.id && !byId.has(p.id)) byId.set(p.id, p); });
    add(s1.products); add(s2.products); add(s3.products);
    let merged = Array.from(byId.values());
    if (merged.length === 0) merged = (recommendedProducts?.products || []);
    merged = merged.map((p: any) => ({ ...p, images: p?.images || (p?.featuredImage ? [p.featuredImage] : []) }));
    merged = merged.slice(0, 1);
    if (merged.length === 0) {
      const colorInPref = (userPreferences.color?.[0] || '').toLowerCase().includes('red') ? 'red' : 'green';
      const fallbackImage = colorInPref === 'red'
        ? 'https://images.pexels.com/photos/298977/pexels-photo-298977.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop'
        : 'https://images.pexels.com/photos/1394888/pexels-photo-1394888.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop';
      return [{ id: `fallback-${colorInPref}`, title: `Demo ${colorInPref} dress`, images: [{ url: fallbackImage }] }];
    }
    return merged;
  }, [s1.products, s2.products, s3.products, recommendedProducts?.products, userPreferences]);

  useEffect(() => {
    const loading = (s1.loading || s2.loading || s3.loading) && finalProducts.length === 0;
    setIsSearching(loading);
    setSearchResults(finalProducts);
    setSearchComplete(!loading);
  }, [s1.loading, s2.loading, s3.loading, finalProducts]);

  // Remove illegal hook usage: rely on top-level searches and merged results

  console.log('🎨 Rendering SavedCarouselTest: isSearching=', isSearching, 'searchComplete=', searchComplete);

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
        <h1 className="text-2xl font-semibold">Saved Carousel Test</h1>
      </div>

      {isSearching ? (
        /* Search Loading */
        <div className="text-center py-12">
          <div className="mb-6">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
          <h2 className="text-xl font-semibold mb-4">Searching Shopify SDK...</h2>
          <p className="text-gray-600 mb-4">Finding products based on your preferences:</p>
          
          {/* Show selected preferences */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {userPreferences.occasion?.[0] && (
              <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">
                {userPreferences.occasion[0]}
              </span>
            )}
            {userPreferences.vibe?.[0] && (
              <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm">
                {userPreferences.vibe[0]}
              </span>
            )}
            {userPreferences.budget?.[0] && (
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                {userPreferences.budget[0]}
              </span>
            )}
          </div>

          <div className="bg-white rounded-lg p-4 shadow-md max-w-md mx-auto">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">🔍 Searching...</span> Products matching your style preferences
            </p>
          </div>
        </div>
      ) : searchComplete ? (
        /* Carousel Display */
        <div>
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-green-600 mb-2">✅ Search Complete!</h2>
            <p className="text-gray-600">Found products based on your preferences. Now saved to your collection!</p>
          </div>

          {/* Preferences Carousel */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Your Curated Collection</h3>
            <PreferencesCarousel
              selectedPreferences={{
                occasion: userPreferences.occasion ?? [],
                vibe: userPreferences.vibe ?? [],
                colorSeason: userPreferences.colorSeason ?? [],
                budget: userPreferences.budget ?? [],
              }}
              products={searchResults}
              onProductSelect={(productId) => {
                console.log('Selected product:', productId);
              }}
            />
          </div>

          {/* Action Buttons */}
          <div className="mt-8 space-y-4">
            <button
              onClick={() => navigate('/saved')}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              View All Saved Products
            </button>
            <button
              onClick={() => navigate('/tryon/loading')}
              className="w-full bg-gray-800 text-white py-3 rounded-lg font-medium hover:bg-gray-900 transition-colors"
            >
              Try-On These Items
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
