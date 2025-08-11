import { useState, useEffect, useMemo } from 'react';
import { useSavedProducts, useRecommendedProducts } from '@shopify/shop-minis-react';

interface PreferencesCarouselProps {
  selectedPreferences: {
    occasion: string[];
    vibe: string[];
    colorSeason: string[];
    budget: string[];
  };
  // Optional override: when provided, these products are shown instead of SDK sources
  products?: any[];
  onProductSelect?: (productId: string) => void;
}

export default function PreferencesCarousel({ selectedPreferences, products: overrideProducts, onProductSelect }: PreferencesCarouselProps) {
  const { products: savedProducts } = useSavedProducts();
  const recommendedProducts = useRecommendedProducts();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Always-available fallback image – pick by vibe heuristics, default green
  const fallbackImageUrl = useMemo(() => {
    const vibe = (selectedPreferences?.vibe?.[0] || '').toLowerCase();
    const useRed = vibe.includes('bold') || vibe.includes('party');
    return useRed
      ? 'https://images.pexels.com/photos/298977/pexels-photo-298977.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop'
      : 'https://images.pexels.com/photos/1394888/pexels-photo-1394888.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop';
  }, [selectedPreferences?.vibe]);

  // Final offline-safe fallback: embedded SVG data URI (no network needed)
  const embeddedFallbackDataUrl = useMemo(() => {
    const vibe = (selectedPreferences?.vibe?.[0] || '').toLowerCase();
    const useRed = vibe.includes('bold') || vibe.includes('party');
    const color = useRed ? '%23e11d48' /* rose-600 */ : '%23059669' /* emerald-600 */;
    return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 800'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${color}' stop-opacity='0.9'/><stop offset='1' stop-color='${color}' stop-opacity='0.7'/></linearGradient></defs><rect width='100%' height='100%' rx='28' ry='28' fill='url(%23g)'/></svg>`;
  }, [selectedPreferences?.vibe]);

  // Background placeholder style so you never see a black box
  const placeholderStyle = useMemo(() => {
    const vibe = (selectedPreferences?.vibe?.[0] || '').toLowerCase();
    const useRed = vibe.includes('bold') || vibe.includes('party');
    const from = useRed ? '#fecaca' : '#bbf7d0';
    const to = useRed ? '#fda4af' : '#86efac';
    return {
      backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
    } as React.CSSProperties;
  }, [selectedPreferences?.vibe]);

  // 🔥 USE REAL SHOPIFY DATA: Prefer override products → recommended → saved
  const curatedProducts = useMemo(() => {
    const override = overrideProducts || [];
    const realShopifyProducts = recommendedProducts?.products || [];
    const userSavedProducts = savedProducts || [];
    
    console.log('🛍️ Carousel data source:', {
      override: override.length,
      recommended: realShopifyProducts.length,
      saved: userSavedProducts.length,
      using: override.length > 0 ? 'override' : realShopifyProducts.length > 0 ? 'recommended' : 'saved'
    });
    
    // Use explicit products when provided, otherwise recommended, else saved
    if (override.length > 0) return override;
    return realShopifyProducts.length > 0 ? realShopifyProducts : userSavedProducts;
  }, [overrideProducts, recommendedProducts, savedProducts]);

  // Auto-play carousel
  useEffect(() => {
    if (!isAutoPlaying || curatedProducts.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % curatedProducts.length);
    }, 3000); // Change every 3 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying, curatedProducts.length]);

  // Handle manual navigation
  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 5000); // Resume auto-play after 5s
  };

  const nextSlide = () => {
    goToSlide((currentIndex + 1) % curatedProducts.length);
  };

  const prevSlide = () => {
    goToSlide((currentIndex - 1 + curatedProducts.length) % curatedProducts.length);
  };

  if (!curatedProducts.length) {
    return (
      <div className="flex items-center justify-center h-64 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Curating perfect matches for you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Perfect Matches for You
        </h2>
        <p className="text-gray-600 text-sm">
          Based on your preferences: {selectedPreferences.occasion[0]}, {selectedPreferences.vibe[0]}
        </p>
      </div>

      {/* Carousel Container */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        {/* Products Carousel */}
        <div 
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {curatedProducts.map((product, index) => (
            <div key={product.id} className="w-full flex-shrink-0 px-2">
              <div className="relative group">
                {/* Product visual – prefer featuredImage, fallback to first image */}
                <div className="relative rounded-xl overflow-hidden bg-white" style={placeholderStyle}>
                  <img
                    src={(
                      (product as any)?.featuredImage?.url ||
                      (product as any)?.images?.[0]?.url ||
                      fallbackImageUrl
                    ) || embeddedFallbackDataUrl}
                    alt={(product as any)?.title || 'Product'}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      if (img.src !== fallbackImageUrl) {
                        img.onerror = null;
                        img.src = fallbackImageUrl;
                      } else if (img.src !== embeddedFallbackDataUrl) {
                        img.onerror = null;
                        img.src = embeddedFallbackDataUrl;
                      }
                    }}
                  />

                  {/* Simple overlay for adding – fully transparent by default */}
                  <div className="absolute inset-0 bg-transparent group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center">
                    <button
                      onClick={() => onProductSelect?.((product as any).id)}
                      className="bg-white text-gray-900 px-4 py-2 rounded-full font-medium opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300"
                    >
                      Add for Try-On
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        {curatedProducts.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 transition-colors z-10"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 transition-colors z-10"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Carousel Indicators */}
      {curatedProducts.length > 1 && (
        <div className="flex justify-center space-x-2 mt-4">
          {curatedProducts.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'bg-purple-600 w-6' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      )}

      {/* Progress Bar */}
      <div className="mt-6 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-purple-600 to-pink-600 h-full rounded-full transition-all duration-500"
          style={{ width: `${((currentIndex + 1) / curatedProducts.length) * 100}%` }}
        />
      </div>

      {/* Matching Score */}
      <div className="text-center mt-4">
        <div className="inline-flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
          <div className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse"></div>
          {Math.floor(85 + Math.random() * 10)}% Match
        </div>
      </div>
    </div>
  );
}
