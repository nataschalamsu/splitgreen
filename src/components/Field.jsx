import { useSplit } from "../store/SplitProvider.jsx";

// A labelled currency input row (Tax / Service / Discount). Defined at module level
// so its <input> keeps focus across re-renders.
export default function Field({ label, value, set, emoji }) {
  const { currency, t } = useSplit();
  return (
    <div className={`flex items-center justify-between gap-2 ${t.card} rounded-2xl px-4 py-3 shadow-sm`}>
      <span className={`text-sm font-semibold ${t.label} min-w-0 truncate`}>
        {emoji} {label}
      </span>
      <div className="flex items-center gap-1 shrink-0">
        <span className={`${t.accent} font-bold`}>{currency}</span>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => set(e.target.value)}
          placeholder="0"
          className={`w-20 text-right font-bold ${t.inputText} ${t.soft} rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-green-300`}
        />
      </div>
    </div>
  );
}
