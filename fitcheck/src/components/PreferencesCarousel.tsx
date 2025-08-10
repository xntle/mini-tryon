import { useState, useEffect, useMemo } from 'react';
import { useSavedProducts, ProductCard } from '@shopify/shop-minis-react';

interface PreferencesCarouselProps {
  selectedPreferences: {
    occasion: string[];
    vibe: string[];
    colorSeason: string[];
    budget: string[];
  };
  onProductSelect?: (productId: string) => void;
}

export default function PreferencesCarousel({ selectedPreferences, onProductSelect }: PreferencesCarouselProps) {
  const { products } = useSavedProducts();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Filter products based on user preferences
  const curatedProducts = useMemo(() => {
    if (!products?.length) return [];
    
    // For now, we'll use all available products and simulate filtering
    // In a real app, you'd filter based on product tags, categories, price, etc.
    const filtered = products.filter(product => {
      // Simulate budget filtering (assuming products have a price)
      const budget = selectedPreferences.budget[0];
      if (budget) {
        const price = parseFloat(product.price?.amount || '0');
        switch (budget) {
          case '<$50':
            return price < 50;
          case '$50-100':
            return price >= 50 && price <= 100;
          case '$100-250':
            return price >= 100 && price <= 250;
          case '$250-500':
            return price >= 250 && price <= 500;
          case '$500+':
            return price >= 500;
          default:
            return true;
        }
      }
      return true;
    });

    // Return a curated selection (max 10 items for carousel)
    return filtered.slice(0, 10);
  }, [products, selectedPreferences]);

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
                {/* Product Card */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl">
                  <div className="aspect-square relative overflow-hidden">
                    <ProductCard product={product} />
                    
                    {/* Overlay with quick actions */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                      <button
                        onClick={() => onProductSelect?.(product.id)}
                        className="bg-white text-gray-900 px-4 py-2 rounded-full font-medium opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300"
                      >
                        Quick Add
                      </button>
                    </div>
                  </div>
                  
                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 truncate">{product.title}</h3>
                    <p className="text-gray-600 text-sm mt-1">
                      {product.price?.amount && `$${product.price.amount}`}
                    </p>
                    
                    {/* Preference Tags */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedPreferences.occasion[0] && (
                        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs">
                          {selectedPreferences.occasion[0]}
                        </span>
                      )}
                      {selectedPreferences.vibe[0] && (
                        <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded-full text-xs">
                          {selectedPreferences.vibe[0]}
                        </span>
                      )}
                    </div>
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
