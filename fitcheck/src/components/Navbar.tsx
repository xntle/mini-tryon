import { Link, useLocation } from "react-router-dom";
import { Camera, Star, Flame, Home, Plus } from "lucide-react";
import PhotoGalleryButton from "../components/GalleryButton";


export default function NavBar() {
  const { pathname } = useLocation();
  

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center bg-transparent rounded-full px-6 py-2">
      <div className="flex items-center justify-between gap-12 px-6 h-16">
        {/* Left: Trending */}
        <Link
          to="/home"
          className={`flex flex-col items-center text-xs ${
            pathname === "/home" ? "text-blue-600" : "text-gray-500"
          }`}
        >
          <Home className="h-5 w-5 mb-1" />
        </Link>

        {/* Middle: + (opens gallery) */}
        <PhotoGalleryButton />

        {/* Right: Saved */}
        <Link
          to="/saved"
          className={`flex flex-col items-center text-xs ${
            pathname === "/saved" ? "text-blue-600" : "text-gray-500"
          }`}
        >
          <Star className="h-5 w-5 mb-1" />
        </Link>
      </div>
    </nav>
  );
}
