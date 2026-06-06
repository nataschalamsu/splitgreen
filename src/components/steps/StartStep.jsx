import { useSplit } from "../../store/SplitProvider.jsx";
import Header from "../Header.jsx";

export default function StartStep() {
  const {
    t,
    fileRef,
    onFile,
    openCamera,
    startManual,
    scanning,
    scanStatus,
    scanProgress,
    scanError,
    scanNotice,
    camError,
    serverScan,
    history,
    loadFromDevice,
    delFromDevice,
  } = useSplit();

  return (
    <>
      <Header />
      <div className="px-4 -mt-3 pb-24">
        <div className={`${t.card} rounded-3xl shadow-md p-6 text-center`}>
          <div className="text-4xl">🧾💸</div>
          <h1 className={`text-2xl font-extrabold mt-3 ${t.head}`}>Split the bill, fair &amp; square</h1>
          <p className={`${t.sub} text-sm mt-2`}>Scan or type the bill, split it fairly, share a link.</p>
        </div>

        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
        <button
          onClick={openCamera}
          disabled={scanning}
          className="w-full mt-5 bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl shadow-md active:scale-[0.98] disabled:opacity-70"
        >
          {scanning ? `${scanStatus}${scanProgress ? " " + scanProgress + "%" : ""}` : "📷 Scan with camera"}
        </button>
        <button
          onClick={() => fileRef.current && fileRef.current.click()}
          disabled={scanning}
          className={`w-full mt-3 ${t.secBtn} font-bold py-4 rounded-2xl shadow-sm border-2 active:scale-[0.98] disabled:opacity-70`}
        >
          🖼️ Upload a photo
        </button>
        <button
          onClick={startManual}
          disabled={scanning}
          className={`w-full mt-3 ${t.secBtn} font-bold py-4 rounded-2xl shadow-sm border-2 active:scale-[0.98] disabled:opacity-70`}
        >
          ✏️ Enter manually
        </button>

        {scanError && <p className={`${t.err} text-sm mt-3 rounded-xl p-3`}>{scanError}</p>}
        {scanNotice && <p className={`${t.warn} text-sm mt-3 rounded-xl p-3`}>{scanNotice}</p>}
        {camError && <p className={`${t.warn} text-sm mt-3 rounded-xl p-3`}>{camError}</p>}
        <p className={`text-xs ${t.sub} text-center mt-3`}>
          {serverScan
            ? "✨ Scanning powered by Gemini — no setup needed."
            : "On-device scanning. Add a clear, flat, well-lit photo for best results."}
        </p>

        {history.length > 0 && (
          <div className={`mt-6 ${t.card} rounded-2xl shadow-sm p-4`}>
            <p className={`text-sm font-semibold ${t.label} mb-2`}>💾 Saved on this device</p>
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className={`flex items-center gap-2 ${t.soft} rounded-xl p-3`}>
                  <button onClick={() => loadFromDevice(h)} className="flex-1 min-w-0 text-left">
                    <div className={`font-bold ${t.head} truncate`}>{h.label}</div>
                    <div className={`text-xs ${t.sub}`}>
                      {h.count} {h.count === 1 ? "person" : "people"}
                    </div>
                  </button>
                  <button
                    onClick={() => delFromDevice(h.id)}
                    className="text-green-400 hover:text-red-500 px-2 active:scale-90 shrink-0"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className={`text-xs ${t.sub} text-center mt-6`}>
          Tip: open a SplitGreen link from a friend and it loads their split here automatically.
        </p>
      </div>
    </>
  );
}
