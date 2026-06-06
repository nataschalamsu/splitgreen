import { useSplit } from "../../store/SplitProvider.jsx";
import Header from "../Header.jsx";

export default function ResultsStep() {
  const {
    t,
    readOnly,
    currency,
    results,
    settleUp,
    grandTotal,
    money,
    num,
    tax,
    service,
    discount,
    tip,
    people,
    paid,
    updPaid,
    markPayer,
    totalPaid,
    makeShare,
    sharing,
    copied,
    link,
    saveToDevice,
    saved,
    makeImage,
    genning,
    imgError,
    imgUrl,
    editCopy,
    reset,
    setStep,
  } = useSplit();

  const tx = settleUp();

  return (
    <>
      <Header back={readOnly ? null : () => setStep("assign")} />
      <div className="px-4 -mt-3 pb-24">
        {readOnly && (
          <div className={`${t.chip} text-sm font-semibold rounded-2xl p-3 mb-4 text-center`}>
            👀 Shared split (view only)
          </div>
        )}

        <div className={`${t.card} rounded-3xl shadow-md p-5`}>
          <h2 className={`text-lg font-extrabold mb-3 ${t.head}`}>💰 Who owes what</h2>
          <div className="space-y-3">
            {results().map((r) => (
              <div key={r.id} className={`${t.soft} rounded-2xl p-4`}>
                <div className="flex justify-between items-baseline gap-2">
                  <span className={`font-extrabold text-lg ${t.head} min-w-0 truncate`}>{r.name}</span>
                  <span className={`font-extrabold text-lg ${t.accent} shrink-0`}>{money(r.total)}</span>
                </div>
                <div className={`text-xs ${t.sub} mt-1 space-y-0.5`}>
                  {r.lineItems.length ? (
                    r.lineItems.map((li) => (
                      <div key={li.id} className="flex justify-between gap-2">
                        <span className="min-w-0 truncate">
                          {li.name}
                          {li.ways > 1 ? ` (split ${li.ways})` : ""}
                        </span>
                        <span className="shrink-0">{money(li.share)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between">
                      <span>No items assigned</span>
                      <span>{money(0)}</span>
                    </div>
                  )}
                </div>
                {(num(tax) > 0 || num(service) > 0 || num(discount) > 0 || num(tip) > 0) && (
                  <div className={`text-xs ${t.sub} mt-1 pt-1 border-t ${t.border} space-y-0.5`}>
                    {num(tax) > 0 && (
                      <div className="flex justify-between">
                        <span>Tax share</span>
                        <span>{money(r.taxShare)}</span>
                      </div>
                    )}
                    {num(service) > 0 && (
                      <div className="flex justify-between">
                        <span>Service share</span>
                        <span>{money(r.svcShare)}</span>
                      </div>
                    )}
                    {num(discount) > 0 && (
                      <div className="flex justify-between">
                        <span>Discount</span>
                        <span>−{money(r.discShare)}</span>
                      </div>
                    )}
                    {num(tip) > 0 && (
                      <div className="flex justify-between">
                        <span>Tip share</span>
                        <span>{money(r.tipShare)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className={`flex justify-between font-extrabold mt-4 pt-3 border-t ${t.border} ${t.head}`}>
            <span>Total</span>
            <span>{money(grandTotal)}</span>
          </div>
        </div>

        <div className={`${t.card} rounded-3xl shadow-md p-5 mt-4`}>
          <h2 className={`text-lg font-extrabold mb-1 ${t.head}`}>🤝 Settle up</h2>
          {!readOnly && (
            <>
              <p className={`text-xs ${t.sub} mb-3`}>
                Enter how much each person already paid (e.g. whoever covered the bill).
              </p>
              <div className="space-y-2">
                {people.map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className={`flex-1 min-w-0 truncate font-semibold text-sm ${t.head}`}>{p.name}</span>
                    <button
                      onClick={() => markPayer(p.id)}
                      className={`text-xs font-bold ${t.chipBtn} rounded-lg px-2 py-1 active:scale-95 shrink-0`}
                    >
                      Paid it all
                    </button>
                    <div className={`flex items-center ${t.soft} rounded-xl px-2 shrink-0`}>
                      <span className={`${t.accent} font-bold text-xs`}>{currency}</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={paid[p.id] || ""}
                        onChange={(e) => updPaid(p.id, e.target.value)}
                        placeholder="0"
                        className={`w-16 text-right font-bold py-2 bg-transparent outline-none ${t.inputText}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {totalPaid > 0 && Math.abs(totalPaid - grandTotal) > 0.01 && (
                <p className={`${t.warn} text-xs rounded-xl p-2 mt-2`}>
                  Paid so far: {money(totalPaid)} of {money(grandTotal)}.
                </p>
              )}
            </>
          )}
          <div className="mt-3 space-y-2">
            {tx.length ? (
              tx.map((tr, i) => (
                <div key={i} className={`flex items-center justify-between gap-2 ${t.soft} rounded-xl p-3`}>
                  <span className={`text-sm ${t.head} min-w-0`}>
                    <span className="font-bold">{tr.from}</span> pays <span className="font-bold">{tr.to}</span>
                  </span>
                  <span className={`font-extrabold ${t.accent} shrink-0`}>{money(tr.amt)}</span>
                </div>
              ))
            ) : (
              <p className={`${t.sub} text-sm`}>
                {readOnly ? "Nothing to settle 🎉" : "Add who paid above to see who owes whom."}
              </p>
            )}
          </div>
        </div>

        {!readOnly && (
          <>
            <button
              onClick={makeShare}
              disabled={sharing}
              className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl shadow-md active:scale-[0.98] disabled:opacity-70"
            >
              🔗 {sharing ? "Creating link…" : copied ? "Link copied!" : "Share via link"}
            </button>
            {link && (
              <div className={`mt-2 ${t.card} rounded-2xl shadow-sm p-3`}>
                <p className={`text-xs ${t.sub} break-all`}>{link}</p>
                <p className={`text-xs ${t.sub} mt-2`}>Anyone who opens this link sees this exact split.</p>
              </div>
            )}
            <button
              onClick={saveToDevice}
              className={`w-full mt-3 ${t.secBtn} font-bold py-4 rounded-2xl shadow-sm border-2 active:scale-[0.98]`}
            >
              💾 {saved ? "Saved to device!" : "Save to this device"}
            </button>
          </>
        )}

        <button
          onClick={makeImage}
          disabled={genning}
          className={`w-full mt-3 ${t.secBtn} font-bold py-4 rounded-2xl shadow-sm border-2 active:scale-[0.98] disabled:opacity-70`}
        >
          {genning ? "Generating…" : "⬇️ Download as image"}
        </button>
        {imgError && <p className={`${t.accent} text-sm mt-2 text-center`}>{imgError}</p>}
        {imgUrl && (
          <div className={`mt-3 ${t.card} rounded-2xl shadow-sm p-4 text-center`}>
            <img src={imgUrl} alt="Split summary" className={`w-full rounded-xl border ${t.borderSoft}`} />
            <a
              href={imgUrl}
              download="splitgreen.png"
              className="inline-block mt-3 bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2 rounded-xl active:scale-95"
            >
              ⬇️ Save image
            </a>
            <p className={`text-xs ${t.sub} mt-2`}>On mobile, long-press the image to save it to your photos.</p>
          </div>
        )}

        {readOnly && (
          <button
            onClick={editCopy}
            className={`w-full mt-3 ${t.secBtn} font-bold py-4 rounded-2xl shadow-sm border-2 active:scale-[0.98]`}
          >
            ✏️ Edit a copy
          </button>
        )}
        <button onClick={reset} className={`w-full mt-4 ${t.accent} font-bold py-3`}>
          ↺ Start a new split
        </button>
      </div>
    </>
  );
}
