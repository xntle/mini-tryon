import { Link, useLocation } from "react-router-dom";
import { Camera, Star, Flame } from "lucide-react";

export default function NavBar() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
      <div className="flex items-center justify-between px-6 h-16">
        {/* Left: Trending */}
        <Link
          to="/trending"
          className={`flex flex-col items-center text-xs ${
            pathname === "/trending" ? "text-blue-600" : "text-gray-500"
          }`}
        >
          <Flame className="h-5 w-5 mb-1" />
          Trending
        </Link>

        {/* Middle: Try-On */}
        <Link
          to="/tryon"
          className="relative flex items-center justify-center -mt-6 bg-black text-white rounded-full w-14 h-14 shadow-md border-4 border-white"
        >
          <Camera className="h-6 w-6" />
        </Link>

        {/* Right: Saved */}
        <Link
          to="/saved"
          className={`flex flex-col items-center text-xs ${
            pathname === "/saved" ? "text-blue-600" : "text-gray-500"
          }`}
        >
          <Star className="h-5 w-5 mb-1" />
          Saved
        </Link>
      </div>
    </nav>
  );
}
