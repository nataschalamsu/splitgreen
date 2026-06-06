import { useSplit } from "../../store/SplitProvider.jsx";
import Header from "../Header.jsx";

export default function PeopleStep() {
  const { t, people, newPerson, setNewPerson, addPerson, delPerson, setStep } = useSplit();

  return (
    <>
      <Header back={() => setStep("review")} />
      <div className="px-4 -mt-3 pb-24">
        <div className={`${t.card} rounded-3xl shadow-md p-5`}>
          <h2 className={`text-lg font-extrabold mb-3 ${t.head}`}>👥 Add people</h2>
          <div className="flex gap-2">
            <input
              value={newPerson}
              onChange={(e) => setNewPerson(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPerson()}
              placeholder="Name"
              className={`flex-1 min-w-0 ${t.soft} ${t.inputText} rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-green-300`}
            />
            <button
              onClick={addPerson}
              className="bg-green-500 hover:bg-green-600 text-white font-bold px-4 rounded-xl active:scale-95 text-xl shrink-0"
            >
              +
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {people.map((p) => (
              <span
                key={p.id}
                className={`flex items-center gap-1 ${t.chip} font-semibold rounded-full pl-3 pr-2 py-1 max-w-full`}
              >
                <span className="truncate">{p.name}</span>
                <button onClick={() => delPerson(p.id)} className="hover:text-red-500 px-1 shrink-0">
                  ✕
                </button>
              </span>
            ))}
            {!people.length && <p className={`${t.sub} text-sm`}>Add at least one person 🙂</p>}
          </div>
        </div>
        <button
          onClick={() => setStep("assign")}
          disabled={!people.length}
          className="w-full mt-5 bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl shadow-md active:scale-[0.98] disabled:opacity-50"
        >
          Assign items →
        </button>
      </div>
    </>
  );
}
