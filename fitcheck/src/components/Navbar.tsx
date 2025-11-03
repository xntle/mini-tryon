import { NavLink, useLocation } from "react-router";
import { GalleryHorizontalEnd, SquareUserRound } from "lucide-react";
import PhotoGalleryButton from "../components/GalleryButton";

export default function NavBar() {
  const { pathname } = useLocation();
  const isActive = (p: string) =>
    pathname === p || pathname.startsWith(p + "/");

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center bg-transparent rounded-full px-6 py-2">
      <div className="flex items-center justify-between gap-12 px-6 h-16">
        <NavLink
          to="/saved"
          aria-label="Saved"
          className={`flex flex-col items-center text-xs ${
            isActive("/saved") ? "text-purple-500" : "text-white"
          }`}
        >
          <GalleryHorizontalEnd className="h-5 w-5 mb-1" />
        </NavLink>

        <PhotoGalleryButton />

        <NavLink
          to="/you"
          aria-label="You"
          className={`flex flex-col items-center text-xs ${
            isActive("/you") ? "text-purple-500" : "text-white"
          }`}
        >
          <SquareUserRound className="h-5 w-5 mb-1" />
        </NavLink>
      </div>
    </nav>
  );
}
