import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router";
import Saved from "./pages/saved";
import Preferences from "./pages/preferences";
import NavBar from "./components/Navbar";
import Shop from "./pages/tryon/shop";
import TryOn from "./pages/tryon";
// import TryonResult  from "./pages/tryon/result";
import Loading from "./pages/loading";
import FullBodyGallery from "./pages/you/page";
import { ToastHost } from "./lib/toast";
import FitDetail from "./pages/fit/FitDetail";
function AppRoutes() {
  const location = useLocation();
  const hideNavOn = ["/yourfit", "/preferences", "loading", "/tryon-new-user"];

  return (
    <>
      <Routes>
        <Route path="/loading" element={<Loading />} />
        <Route path="/" element={<TryOn />} />
        <Route path="/home" element={<Shop />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/tryon" element={<TryOn />} />
        <Route path="/you" element={<FullBodyGallery />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/preferences" element={<Preferences />} />
        <Route path="/fit/:id" element={<FitDetail />} />
      </Routes>

      {!hideNavOn.includes(location.pathname) && <NavBar />}
      <ToastHost />
    </>
  );
}

export function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
