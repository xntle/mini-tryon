import PhotoGalleryButton from "../components/GalleryButton";
export function Welcome() {
  return (
    <div className="pt-12 px-4 pb-6 justify-center">
      <div className="mx-auto mb-6 inline-flex items-center justify-center rounded-2xl bg-black text-white px-4 py-2">
        <span className="text-lg font-semibold tracking-tight">fit check</span>
      </div>
      <h1 className="text-3xl font-bold mb-2">check out your fit</h1>
      <p className="text-gray-600 mb-6">
        start checking by <span className="font-medium">uploading a photo</span>{" "}
        or <span className="font-medium">taking one</span>.
      </p>
      <PhotoGalleryButton />
      <a href="/home">Home</a>
    </div>
  );
}
