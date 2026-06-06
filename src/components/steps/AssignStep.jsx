import { useSplit } from "../../store/SplitProvider.jsx";
import Header from "../Header.jsx";

export default function AssignStep() {
  const { t, items, people, money, num, toggleAssign, unassigned, setImgUrl, setLink, setStep } = useSplit();

  return (
    <>
      <Header back={() => setStep("people")} />
      <div className="px-4 -mt-3 pb-24">
        <p className={`text-sm ${t.sub} mb-3 text-center`}>Tap names to assign each item. Tap several to split it. 🍽️</p>
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id} className={`${t.card} rounded-2xl shadow-sm p-4`}>
              <div className={`flex justify-between gap-2 font-bold ${t.head}`}>
                <span className="min-w-0 truncate">{it.name || "Item"}</span>
                <span className="shrink-0">{money(it.price)}</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {people.map((p) => {
                  const on = it.assignedTo.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleAssign(it.id, p.id)}
                      className={`text-sm font-semibold rounded-full px-3 py-1 active:scale-95 border-2 ${
                        on ? "bg-green-500 text-white border-green-500" : t.pillOff
                      }`}
                    >
                      {on && "✓ "}
                      {p.name}
                    </button>
                  );
                })}
              </div>
              {it.assignedTo.length > 1 && (
                <p className={`text-xs ${t.accent} mt-2`}>
                  Split {it.assignedTo.length} ways → {money(num(it.price) / it.assignedTo.length)} each
                </p>
              )}
            </div>
          ))}
        </div>
        {unassigned > 0.005 && (
          <p className={`${t.warn} text-sm rounded-xl p-3 mt-4`}>
            ⚠️ {money(unassigned)} of items aren't assigned to anyone yet.
          </p>
        )}
        <button
          onClick={() => {
            setImgUrl("");
            setLink("");
            setStep("results");
          }}
          className="w-full mt-5 bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl shadow-md active:scale-[0.98]"
        >
          See the split 🎉
        </button>
      </div>
    </>
  );
}
