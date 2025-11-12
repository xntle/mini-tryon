import Saved from "./pages/saved";
import Preferences from "./pages/preferences";
import NavBar from "./components/Navbar";
import Shop from "./pages/tryon/shop";
import TryOn from "./pages/tryon";
import Loading from "./pages/loading";
import FullBodyGallery from "./pages/you/page";
import { ToastHost } from "./lib/toast";
import FitDetail from "./pages/fit/FitDetail";

import {
  MemoryRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router";
import { MinisRouter } from "@shopify/shop-minis-react";

function AppRoutes() {
  const { pathname } = useLocation();
  const hide = ["/yourfit", "/preferences", "/loading", "/tryon-new-user"];
  return (
    <>
      <MinisRouter>
        <Routes>
          <Route path="/" element={<TryOn />} />
          <Route path="/home" element={<Shop />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/tryon" element={<TryOn />} />
          <Route path="/you" element={<FullBodyGallery />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/preferences" element={<Preferences />} />
          <Route path="/fit/:id" element={<FitDetail />} />
          <Route path="/loading" element={<Loading />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {!hide.some((p) => pathname.startsWith(p)) && <NavBar />}
        <ToastHost />
      </MinisRouter>
    </>
  );
}

export function App() {
  return (
    <MemoryRouter initialEntries={["/"]}>
      <AppRoutes />
    </MemoryRouter>
  );
}
