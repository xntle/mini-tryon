import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ColorGreen() {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      // Persist a minimal preference payload with only color: green
      localStorage.setItem(
        'userPreferences',
        JSON.stringify({ color: ['green'] })
      );
    } catch (_) {}
    // Navigate straight to the carousel test page
    const t = setTimeout(() => navigate('/saved-carousel-test'), 300);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <div className="mx-auto mb-4 w-10 h-10 rounded-full" style={{ background: '#22c55e' }} />
        <h1 className="text-xl font-semibold">Setting color to green…</h1>
        <p className="text-gray-600 mt-2">Redirecting to your curated picks.</p>
      </div>
    </div>
  );
}


