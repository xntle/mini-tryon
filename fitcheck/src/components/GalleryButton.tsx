import { useRef } from "react";
export default function PhotoGalleryButton() {
  const fileRef = useRef<HTMLInputElement | null>(null);

  function openGallery() {
    fileRef.current?.click(); // programmatically open the file input
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // e.g. preview image
    const reader = new FileReader();
    reader.onload = () => {
      console.log("Selected image:", reader.result);
      // you can store this in state for display
    };
    reader.readAsDataURL(file);

    e.target.value = ""; // reset so same file can be chosen again
  }

  return (
    <div>
      <button
        onClick={openGallery}
        className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium"
      >
        Open Photo Gallery
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
