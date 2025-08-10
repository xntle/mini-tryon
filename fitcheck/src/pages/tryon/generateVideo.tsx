// import { useEffect, useMemo, useRef, useState } from "react";
// import { useLocation, Link, Navigate } from "react-router-dom";

// type State = { photo?: string };

// const FAL_ENDPOINT = process.env.FAL_AI_KEY || "/api/fal-i2v";

// export default function VideoFromImage() {
//   const { state } = useLocation() as { state?: State };
//   const photo = state?.photo;

//   // must have a photo to proceed
//   if (!photo) return <Navigate to="/home" replace />;

//   const [prompt, setPrompt] = useState(
//     "Lookbook vibe: slow camera orbit, subtle natural motion, focus on outfit."
//   );
//   const [aspect, setAspect] = useState<"auto" | "16:9" | "9:16" | "1:1">(
//     "auto"
//   );
//   const [resolution, setResolution] = useState<"480p" | "580p" | "720p">(
//     "720p"
//   );

//   const [phase, setPhase] = useState<
//     "idle" | "requesting" | "probing" | "ready" | "error"
//   >("idle");
//   const [loading, setLoading] = useState(false);
//   const [elapsed, setElapsed] = useState(0);
//   const [probeAttempts, setProbeAttempts] = useState(0);
//   const [error, setError] = useState<string | null>(null);
//   const [videoUrl, setVideoUrl] = useState<string | null>(null);

//   // small timer for UX
//   useEffect(() => {
//     if (!loading) return;
//     const t0 = performance.now();
//     const id = setInterval(
//       () => setElapsed(Math.round((performance.now() - t0) / 1000)),
//       250
//     );
//     return () => clearInterval(id);
//   }, [loading]);

//   // HEAD probe to make sure the CDN URL is live
//   async function probeUrl(url: string, maxTries = 6) {
//     setPhase("probing");
//     for (let i = 1; i <= maxTries; i++) {
//       setProbeAttempts(i);
//       try {
//         const head = await fetch(url, { method: "HEAD", cache: "no-cache" });
//         if (head.ok) return true;
//       } catch {}
//       await new Promise((r) => setTimeout(r, 400 * i)); // backoff
//     }
//     return false;
//   }

//   async function generate() {
//     try {
//       setLoading(true);
//       setPhase("requesting");
//       setError(null);
//       setVideoUrl(null);
//       setElapsed(0);
//       setProbeAttempts(0);

//       const res = await fetch(FAL_ENDPOINT, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           image_url: photo, // data: URI from your flow
//           prompt,
//           resolution,
//           aspect_ratio: aspect,
//         }),
//       });
//       const json = await res.json();
//       if (!res.ok || !json.videoUrl)
//         throw new Error(json.error || "No video URL returned");

//       const ok = await probeUrl(json.videoUrl);
//       if (!ok) throw new Error("Video not ready yet. Please try again.");

//       setVideoUrl(json.videoUrl);
//       setPhase("ready");
//     } catch (e: any) {
//       setError(e.message || "Failed to create video");
//       setPhase("error");
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <div className="min-h-dvh pb-20 pt-6 px-4 max-w-xl mx-auto">
//       <div className="flex items-center justify-between mb-4">
//         <h1 className="text-xl font-semibold">Image → Video</h1>
//         <Link to="/home" className="text-sm underline text-gray-600">
//           Back
//         </Link>
//       </div>

//       {/* Input image preview */}
//       <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm mb-4">
//         <img src={photo} alt="Input" className="w-full object-cover" />
//       </div>

//       {/* Controls */}
//       <div className="grid grid-cols-1 gap-3 mb-4">
//         <label className="block">
//           <span className="text-sm text-gray-700">Prompt</span>
//           <textarea
//             className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
//             rows={3}
//             value={prompt}
//             onChange={(e) => setPrompt(e.target.value)}
//             placeholder="Describe the motion / camera movement…"
//           />
//         </label>

//         <div className="grid grid-cols-2 gap-3">
//           <label className="block">
//             <span className="text-sm text-gray-700">Aspect ratio</span>
//             <select
//               className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
//               value={aspect}
//               onChange={(e) =>
//                 setAspect(e.target.value as "auto" | "16:9" | "9:16" | "1:1")
//               }
//             >
//               <option value="auto">auto</option>
//               <option value="16:9">16:9</option>
//               <option value="9:16">9:16</option>
//               <option value="1:1">1:1</option>
//             </select>
//           </label>

//           <label className="block">
//             <span className="text-sm text-gray-700">Resolution</span>
//             <select
//               className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
//               value={resolution}
//               onChange={(e) =>
//                 setResolution(e.target.value as "480p" | "580p" | "720p")
//               }
//             >
//               <option value="720p">720p</option>
//               <option value="580p">580p</option>
//               <option value="480p">480p</option>
//             </select>
//           </label>
//         </div>
//       </div>

//       {/* Generate button + status */}
//       <div className="mb-4">
//         <button
//           type="button"
//           onClick={generate}
//           disabled={loading}
//           className="px-4 py-2 rounded-lg bg-black text-white font-medium disabled:opacity-50"
//         >
//           {phase === "requesting"
//             ? "Generating…"
//             : phase === "probing"
//             ? "Preparing video…"
//             : "Generate Video"}
//         </button>
//         <div className="mt-2 text-xs text-gray-500">
//           {loading && (
//             <>
//               <span className="mr-2">
//                 {phase === "requesting" && "Contacting model…"}
//                 {phase === "probing" && `Finalizing (${probeAttempts} checks)…`}
//               </span>
//               <span>{elapsed}s elapsed</span>
//             </>
//           )}
//         </div>
//         {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
//       </div>

//       {/* Output */}
//       {videoUrl && (
//         <div className="rounded-xl overflow-hidden border border-gray-200">
//           <video
//             src={videoUrl}
//             controls
//             playsInline
//             loop
//             className="w-full h-auto"
//             onLoadedData={() => console.log("Video loaded")}
//             onError={() =>
//               console.warn("Video URL returned but failed to load in player")
//             }
//           />
//           <div className="p-3 flex items-center justify-between">
//             <a
//               href={videoUrl}
//               download
//               className="text-sm underline text-gray-700"
//             >
//               Download MP4
//             </a>
//             <button
//               className="text-sm px-3 py-1.5 rounded-lg border border-gray-300"
//               onClick={() => {
//                 navigator.clipboard?.writeText(videoUrl);
//               }}
//             >
//               Copy link
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
