import { useState } from "react";
import { useSplit } from "../../store/SplitProvider.jsx";
import { CURRENCIES } from "../../constants.js";
import Header from "../Header.jsx";
import Field from "../Field.jsx";

export default function ReviewStep() {
  const {
    t,
    items,
    currency,
    setCurrency,
    updItem,
    delItem,
    addItem,
    addNamedItem,
    tax,
    setTax,
    service,
    setService,
    discount,
    setDiscount,
    tip,
    setTip,
    tipPct,
    subtotal,
    grandTotal,
    num,
    money,
    setStep,
  } = useSplit();

  const [exName, setExName] = useState("");
  const [exAmt, setExAmt] = useState("");
  const addExtra = () => {
    const name = exName.trim();
    const amt = exAmt.trim();
    if (!name && !amt) return;
    addNamedItem(name, amt);
    setExName("");
    setExAmt("");
  };

  return (
    <>
      <Header back={() => setStep("start")} />
      <div className="px-4 -mt-3 pb-24">
        <div className={`${t.card} rounded-3xl shadow-md p-5`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-lg font-extrabold ${t.head}`}>🛒 Items</h2>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={`${t.soft} ${t.accent} rounded-lg px-2 py-1 font-bold outline-none`}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-2">
                <input
                  value={it.name}
                  onChange={(e) => updItem(it.id, "name", e.target.value)}
                  placeholder="Item name"
                  className={`flex-1 min-w-0 ${t.soft} ${t.inputText} rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-green-300`}
                />
                <input
                  type="number"
                  inputMode="numeric"
                  value={it.qty || ""}
                  onChange={(e) => updItem(it.id, "qty", e.target.value)}
                  placeholder="1"
                  title="Quantity"
                  className={`w-11 text-center ${t.soft} ${t.inputText} rounded-xl px-1 py-2 outline-none focus:ring-2 focus:ring-green-300 shrink-0`}
                />
                <div className={`flex items-center ${t.soft} rounded-xl px-2 shrink-0`}>
                  <span className={`${t.accent} font-bold text-xs`}>{currency}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={it.price}
                    onChange={(e) => updItem(it.id, "price", e.target.value)}
                    placeholder="0"
                    className={`w-16 text-right font-bold py-2 bg-transparent outline-none ${t.inputText}`}
                  />
                </div>
                <button
                  onClick={() => delItem(it.id)}
                  className="text-green-400 hover:text-red-500 active:scale-90 shrink-0 text-lg"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
          <button onClick={addItem} className={`mt-3 ${t.accent} font-bold`}>
            + Add item
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <Field label="Tax" value={tax} set={setTax} emoji="🏛️" />
          <Field label="Service" value={service} set={setService} emoji="🛎️" />
          <Field label="Discount" value={discount} set={setDiscount} emoji="🎉" />
          <div className={`${t.card} rounded-2xl px-4 py-3 shadow-sm`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-sm font-semibold ${t.label} min-w-0 truncate`}>💚 Tip</span>
              <div className="flex items-center gap-1 shrink-0">
                <span className={`${t.accent} font-bold`}>{currency}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={tip}
                  onChange={(e) => setTip(e.target.value)}
                  placeholder="0"
                  className={`w-20 text-right font-bold ${t.inputText} ${t.soft} rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-green-300`}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              {[15, 18, 20, 25].map((p) => (
                <button
                  key={p}
                  onClick={() => tipPct(p)}
                  className={`flex-1 text-xs font-bold ${t.chipBtn} rounded-lg py-1 active:scale-95`}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={`mt-4 ${t.card} rounded-2xl px-4 py-3 shadow-sm`}>
          <p className={`text-sm font-semibold ${t.label}`}>➕ Add extra</p>
          <p className={`text-xs ${t.sub} mt-1 mb-2`}>
            Anything the scan missed — a fee, a deposit, an item the receipt doesn't list. It's added as an item you can
            assign to people.
          </p>
          <div className="flex items-center gap-2">
            <input
              value={exName}
              onChange={(e) => setExName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addExtra()}
              placeholder="Name"
              className={`flex-1 min-w-0 ${t.soft} ${t.inputText} rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-green-300`}
            />
            <div className={`flex items-center ${t.soft} rounded-xl px-2 shrink-0`}>
              <span className={`${t.accent} font-bold text-xs`}>{currency}</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={exAmt}
                onChange={(e) => setExAmt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addExtra()}
                placeholder="0"
                className={`w-16 text-right font-bold py-2 bg-transparent outline-none ${t.inputText}`}
              />
            </div>
            <button
              onClick={addExtra}
              className="bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl px-3 py-2 active:scale-95 shrink-0"
            >
              Add
            </button>
          </div>
        </div>

        <div className={`mt-4 ${t.totals} rounded-2xl p-4 text-sm font-semibold`}>
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          {num(tax) > 0 && (
            <div className="flex justify-between mt-1">
              <span>Tax</span>
              <span>{money(num(tax))}</span>
            </div>
          )}
          {num(service) > 0 && (
            <div className="flex justify-between mt-1">
              <span>Service</span>
              <span>{money(num(service))}</span>
            </div>
          )}
          {num(discount) > 0 && (
            <div className="flex justify-between mt-1">
              <span>Discount</span>
              <span>−{money(num(discount))}</span>
            </div>
          )}
          {num(tip) > 0 && (
            <div className="flex justify-between mt-1">
              <span>Tip</span>
              <span>{money(num(tip))}</span>
            </div>
          )}
          <div className={`flex justify-between mt-1 font-extrabold text-base border-t ${t.border} pt-1`}>
            <span>Grand total</span>
            <span>{money(grandTotal)}</span>
          </div>
        </div>

        <button
          onClick={() => setStep("people")}
          className="w-full mt-5 bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl shadow-md active:scale-[0.98]"
        >
          👥 Who's splitting?
        </button>
      </div>
    </>
  );
}
