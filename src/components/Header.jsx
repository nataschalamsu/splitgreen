import { useSplit } from "../store/SplitProvider.jsx";

export default function Header({ back }) {
  const { dark, setDark } = useSplit();
  return (
    <div className="bg-gradient-to-br from-green-400 to-green-600 text-white px-4 pt-6 pb-7 rounded-b-3xl shadow-lg">
      <div className="flex items-center gap-1">
        {back && (
          <button
            onClick={back}
            className="mr-1 -ml-1 px-2 py-1 rounded-full hover:bg-green-500 active:scale-95 text-xl leading-none"
          >
            ←
          </button>
        )}
        <span className="text-2xl">🧾</span>
        <span className="text-xl font-extrabold tracking-tight">SplitGreen</span>
        <button
          onClick={() => setDark((d) => !d)}
          className="ml-auto text-lg p-2 rounded-full hover:bg-green-500 active:scale-95"
          aria-label="Toggle dark mode"
        >
          {dark ? "☀️" : "🌙"}
        </button>
      </div>
    </div>
  );
}
