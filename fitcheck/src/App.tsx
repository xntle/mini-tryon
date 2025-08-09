import { usePopularProducts, ProductCard } from "@shopify/shop-minis-react";

import PhotoGalleryButton from "./components/GalleryButton";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { Welcome } from "./pages/welcome";
import Saved from "./pages/saved";
import TryOn from "./pages/tryon";
import Home from "./pages/home";

export function App() {
  return (
    <Router>
      <nav className="p-4 bg-gray-100">
        <Link to="/" className="mr-4">
          Welcome
        </Link>
        <Link to="/home">Home</Link>
        <Link to="/tryon">Try On</Link>
        <Link to="/saved">Saved</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/home" element={<Home />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/tryon" element={<TryOn />} />
      </Routes>
    </Router>
  );
}

// export function App() {
//   const { products } = usePopularProducts();

//   return (
//     <div className="pt-12 px-4 pb-6 justify-center">
//       <div className="mx-auto mb-6 inline-flex items-center justify-center rounded-2xl bg-black text-white px-4 py-2">
//         <span className="text-lg font-semibold tracking-tight">fit check</span>
//       </div>
//       <h1 className="text-3xl font-bold mb-2">check out your fit</h1>
//       <p className="text-gray-600 mb-6">
//         start checking by <span className="font-medium">uploading a photo</span>{" "}
//         or <span className="font-medium">taking one</span>.
//       </p>
//       <PhotoGalleryButton />

//       {/* <p className="text-xs text-blue-600 mb-4 text-center bg-blue-50 py-2 px-4 rounded border border-blue-200">
//         🛠️ Edit <b>src/App.tsx</b> to change this screen and come back to see
//         your edits!
//       </p>
//       <p className="text-base text-gray-600 mb-6 text-center">
//         These are the popular products today
//       </p>
//       <div className="grid grid-cols-2 gap-4">
//         {products?.map((product) => (
//           <ProductCard key={product.id} product={product} />
//         ))}
//       </div> */}
//     </div>
//   );
// }
