import * as React from "react";
import { Router, Routes, Route, Navigate, useLocation } from "react-router";
import { createBrowserHistory, BrowserHistory, Update } from "history";

import Saved from "./pages/saved";
import Preferences from "./pages/preferences";
import NavBar from "./components/Navbar";
import Shop from "./pages/tryon/shop";
import TryOn from "./pages/tryon";
import Loading from "./pages/loading";
import FullBodyGallery from "./pages/you/page";
import { ToastHost } from "./lib/toast";
import FitDetail from "./pages/fit/FitDetail";

// Minimal HistoryRouter (since BrowserRouter lives in react-router-dom)
function HistoryRouter({
  history,
  children,
}: {
  history: BrowserHistory;
  children: React.ReactNode;
}) {
  const [state, setState] = React.useState({
    action: history.action,
    location: history.location,
  });
  React.useLayoutEffect(
    () =>
      history.listen((update: Update) => {
        setState({ action: update.action, location: update.location });
      }),
    [history]
  );

  return (
    <Router navigator={history} location={state.location}>
      {children}
    </Router>
  );
}

function AppRoutes() {
  const { pathname } = useLocation();
  const hide = ["/yourfit", "/preferences", "/loading", "/tryon-new-user"];

  return (
    <>
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
    </>
  );
}

const history = createBrowserHistory();
export function App() {
  return (
    <HistoryRouter history={history}>
      <AppRoutes />
    </HistoryRouter>
  );
}
