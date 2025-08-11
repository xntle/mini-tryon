import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PreferencesGreen() {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      localStorage.setItem(
        'userPreferences',
        JSON.stringify({ color: ['green'] })
      );
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-full mb-4" style={{ background: '#22c55e' }} />
      <h1 className="text-2xl font-semibold">Preferences 2 — Color: Green</h1>
      <p className="text-gray-600 mt-2 mb-6">Saved a minimal preference (only color).</p>
      <button
        onClick={() => navigate('/saved-carousel-test')}
        className="px-4 py-3 rounded-lg bg-black text-white font-medium"
      >
        Continue to Carousel
      </button>
    </div>
  );
}


