import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { Welcome } from "./pages/welcome";
import Saved from "./pages/saved";
import Home from "./pages/home";
import Preferences from "./pages/preferences";
import TryOnNew from "./pages/tryon-new-user";
import NavBar from "./components/Navbar";
import Shop from "./pages/tryon/shop";
import YourFit from "./pages/tryon/yourfit";
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
      {/* <nav className="p-4 bg-gray-100">
        <Link to="/" className="mr-4">
          Welcome
        </Link>
        <Link to="/home" className="mr-4">
          Home
        </Link>
        <Link to="/tryon" className="mr-4">
          Try On
        </Link>
        <Link to="/saved" className="mr-4">
          Saved
        </Link>
        <Link to="/preferences" className="mr-4">
          Preferences
        </Link>
        <Link to="/tryon/result" className="mr-4">
          falai
        </Link>
      </nav> */}

      <Routes>
        <Route path="/loading" element={<Loading />} />
        <Route path="/" element={<TryOn />} />
        <Route path="/home" element={<Shop />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/yourfit" element={<YourFit />} />
        <Route path="/tryon" element={<TryOn />} />

        <Route path="/you" element={<FullBodyGallery />} />
        {/* <Route path="/tryon/result" element={<TryonResult />} /> */}
        <Route path="/shop" element={<Shop />} />
        <Route path="/tryon-new-user" element={<TryOnNew />} />
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
