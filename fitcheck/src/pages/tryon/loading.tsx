import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PreferencesCarousel from '../../components/PreferencesCarousel';

interface LoadingState {
  photo?: string;
  productIds?: string[];
  preferences?: {
    occasion: string[];
    vibe: string[];
    colorSeason: string[];
    budget: string[];
  };
}

export default function TryOnLoading() {
  const { state } = useLocation() as { state?: LoadingState };
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedProducts, setSelectedProducts] = useState<string[]>(state?.productIds || []);

  const steps = [
    { name: "Analyzing your photo", duration: 2000 },
    { name: "Processing body measurements", duration: 3000 },
    { name: "Matching clothing dimensions", duration: 2500 },
    { name: "Generating realistic fit", duration: 3500 },
    { name: "Adding final touches", duration: 2000 }
  ];

  const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);

  useEffect(() => {
    if (!state?.photo) {
      navigate('/tryon');
      return;
    }

    let timeElapsed = 0;
    const interval = setInterval(() => {
      timeElapsed += 100;
      const newProgress = (timeElapsed / totalDuration) * 100;
      setProgress(Math.min(newProgress, 100));

      // Update current step
      let cumulativeDuration = 0;
      for (let i = 0; i < steps.length; i++) {
        cumulativeDuration += steps[i].duration;
        if (timeElapsed <= cumulativeDuration) {
          setCurrentStep(i);
          break;
        }
      }

      // Navigate to results when complete
      if (timeElapsed >= totalDuration) {
        clearInterval(interval);
        setTimeout(() => {
          navigate('/tryon/result', { 
            state: { 
              ...state, 
              productIds: selectedProducts.length > 0 ? selectedProducts : state?.productIds 
            } 
          });
        }, 500);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [state, navigate, selectedProducts, totalDuration]);

  const handleProductSelect = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Default preferences if not provided
  const preferences = state?.preferences || {
    occasion: ['Date Night'],
    vibe: ['Elegant & Classy'],
    colorSeason: ['True Winter'],
    budget: ['$100-250']
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="px-4 py-8 max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mb-4 mx-auto">
              <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Creating Your Perfect Fit
          </h1>
          <p className="text-gray-600">
            Our AI is working its magic...
          </p>
        </div>

        {/* Progress Section */}
        <div className="bg-white rounded-2xl p-6 mb-8 shadow-lg">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                {steps[currentStep]?.name || 'Processing...'}
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(progress)}%
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-600 to-pink-600 h-full rounded-full transition-all duration-300 relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-0 bottom-0 w-4 bg-white bg-opacity-30 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Step Indicators */}
          <div className="flex justify-between mt-4">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index <= currentStep 
                    ? 'bg-purple-600 scale-110' 
                    : 'bg-gray-300'
                }`} />
                <span className="text-xs text-gray-500 mt-1 text-center max-w-12">
                  Step {index + 1}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Curated Products Carousel */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <PreferencesCarousel 
            selectedPreferences={preferences}
            onProductSelect={handleProductSelect}
          />
          
          {/* Selected Products Counter */}
          {selectedProducts.length > 0 && (
            <div className="mt-6 text-center">
              <div className="inline-flex items-center bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zM8 6V6a2 2 0 114 0v1H8V6z" clipRule="evenodd" />
                </svg>
                {selectedProducts.length} item{selectedProducts.length !== 1 ? 's' : ''} added to try-on
              </div>
            </div>
          )}
        </div>

        {/* Fun Facts */}
        <div className="mt-6 text-center">
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Did you know?</span> Our AI analyzes over 200 body measurements to ensure the perfect fit!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
