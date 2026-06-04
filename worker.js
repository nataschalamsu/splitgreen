// worker.js — runs on Cloudflare. Handles /api/scan with Gemini (key hidden),
// and serves index.html (and everything else) as static files.

const GEMINI_PROMPT = `You are extracting the line items from a receipt photo, often an Indonesian restaurant or cafe receipt (thermal printed, sometimes slightly crumpled or angled). Return ONLY JSON, no markdown and no backticks, in exactly this shape:
{"items":[{"name":string,"price":number}],"tax":number,"service":number,"tip":number,"discount":number}

Rules:
- Each item's "price" MUST be the LINE TOTAL for that row (quantity times unit price) — the rightmost amount printed on that item's line. Do NOT use the per-unit price shown after an "@" symbol.
- If an item's quantity is greater than 1, include it in the name, for example "Soto Ayam (4x)".
- Drop free modifier or note lines that cost 0 (for example "Less Sugar @0"). Do not list them as items.
- All numbers must be plain values in the receipt's currency with NO currency symbols and NO thousands separators. Indonesian receipts use "." as a thousands separator, so "88.000" means 88000 and "9.000" means 9000.
- tax: the tax line. It may be labelled PB1, PB 1, PPN, Pajak, Tax, or VAT.
- service: a service charge or fee. It may be labelled Service, Service Charge, Svc, or Layanan.
- discount: the total discount as a positive number. It may be labelled Discount, Disc, Diskon, or Potongan.
- tip: gratuity, if any.
- Use 0 for any of tax, service, tip, or discount that is not present.
- NEVER list these as items: subtotal, total, grand total, the item-count line (like "4 item" or "14 items"), payment lines (QRIS, BCA, cash, change, card), the date, cashier, server, table, info, or any transaction or order ID.`;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

async function handleScan(request, env) {
  if (!env.GEMINI_API_KEY) return json({ error: "not_configured" }, 500);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "bad_request" }, 400); }
  const { image, mimeType } = body || {};
  if (!image) return json({ error: "no_image" }, 400);

  const model = env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [
        { inline_data: { mime_type: mimeType || "image/jpeg", data: image } },
        { text: GEMINI_PROMPT },
      ] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0 },
    }),
  });

  if (!r.ok) return json({ error: "scan_failed" }, r.status);

  const d = await r.json();
  const parts = (((d.candidates || [])[0] || {}).content || {}).parts || [];
  const text = parts.map((p) => p.text || "").join("").trim();
  try {
    return json(JSON.parse(text.replace(/```json|```/g, "").trim()));
  } catch (e) {
    return json({ error: "parse_failed" }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/scan") {
      if (request.method === "POST") return handleScan(request, env);
      if (request.method === "GET") return json({ ok: true, configured: !!env.GEMINI_API_KEY });
      return json({ error: "method_not_allowed" }, 405);
    }
    return env.ASSETS.fetch(request);
  },
};