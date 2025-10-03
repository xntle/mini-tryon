import { RouterProvider, createBrowserRouter } from "react-router";
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

const router = createBrowserRouter([
  {
    path: "/",
    element: <TryOn />,
  },
  {
    path: "/home",
    element: <Shop />,
  },
  {
    path: "/saved",
    element: <Saved />,
  },
  {
    path: "/tryon",
    element: <TryOn />,
  },
  {
    path: "/you",
    element: <FullBodyGallery />,
  },
  {
    path: "/shop",
    element: <Shop />,
  },
  {
    path: "/preferences",
    element: <Preferences />,
  },
  {
    path: "/fit/:id",
    element: <FitDetail />,
  },
]);

export function App() {
  return (
    <>
      <RouterProvider router={router} />
      <NavBar />
      <ToastHost />
    </>
  );
}
