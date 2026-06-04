// functions/api/scan.js — runs on Cloudflare's servers; your key never reaches the browser

const GEMINI_PROMPT = 'You are reading a receipt photo. Return ONLY JSON (no markdown) matching exactly: {"items":[{"name":string,"price":number}],"tax":number,"service":number,"tip":number,"discount":number}. Numbers are in the receipt currency with no symbols or thousands separators (e.g. 25000, not "Rp25.000"). service = service charge/fee. discount = total discount amount. Use 0 when a value is absent. Include every ordered line item; do NOT include subtotal, total, tax, or service rows as items.';

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

// Health check — lets the app know scanning is available
export async function onRequestGet({ env }) {
  return json({ ok: true, configured: !!env.GEMINI_API_KEY });
}

export async function onRequestPost({ request, env }) {
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