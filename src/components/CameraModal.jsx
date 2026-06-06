import { useSplit } from "../store/SplitProvider.jsx";

export default function CameraModal() {
  const { camOpen, videoRef, closeCamera, capturePhoto, torchOn, torchSupported, toggleTorch } = useSplit();
  if (!camOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <video ref={videoRef} autoPlay playsInline muted className="flex-1 w-full object-cover"></video>
      {torchSupported && (
        <button
          onClick={toggleTorch}
          aria-pressed={torchOn}
          aria-label={torchOn ? "Turn flash off" : "Turn flash on"}
          className={`absolute top-4 left-4 rounded-full px-3 py-1 text-xl active:scale-95 ${
            torchOn ? "bg-yellow-400 text-black" : "bg-black bg-opacity-50 text-white"
          }`}
        >
          {torchOn ? "⚡" : "🔦"}
        </button>
      )}
      <button
        onClick={closeCamera}
        className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full px-3 py-1 text-xl active:scale-95"
      >
        ✕
      </button>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white text-xs font-semibold px-3 py-1 rounded-full">
        🧾 Fit the whole receipt in frame
      </div>
      <div className="absolute bottom-0 inset-x-0 pb-10 pt-8 flex flex-col items-center bg-gradient-to-t from-black to-transparent">
        <button
          onClick={capturePhoto}
          className="w-20 h-20 rounded-full bg-white border-4 border-green-400 active:scale-95 flex items-center justify-center shadow-lg text-3xl"
        >
          📷
        </button>
      </div>
    </div>
  );
}
