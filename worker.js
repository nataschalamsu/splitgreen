// worker.js — runs on Cloudflare. Handles /api/scan (Gemini, key hidden),
// /api/share (shrtnr proxy) and /s/<slug> short-link redirects, and serves the
// built dist/ (index.html and assets) as static files.

const GEMINI_PROMPT = `You are extracting the line items from a receipt photo, often an Indonesian restaurant or cafe receipt (thermal printed, sometimes slightly crumpled or angled). Return ONLY JSON, no markdown and no backticks, in exactly this shape:
{"items":[{"name":string,"qty":number,"price":number}],"tax":number,"service":number,"tip":number,"discount":number}

Rules:
- "name" is the item name ONLY — do NOT include the quantity or any price in it.
- "qty" is the quantity ordered for that row, as a plain integer. Use 1 when no quantity is printed.
- Each item's "price" MUST be the LINE TOTAL for that row (quantity times unit price) — the rightmost amount printed on that item's line. Do NOT use the per-unit price shown after an "@" symbol.
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

// ---- Short share links (shrtnr proxy; API key stays server-side) ----
async function handleShare(request, env) {
  if (!env.SHRTNR_API_KEY) return json({ error: "not_configured" }, 500);
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "bad_request" }, 400); }
  const target = body && body.url;
  if (typeof target !== "string" || !target) return json({ error: "no_url" }, 400);

  // Only shorten links that point back to this app (anti-abuse: not an open shortener).
  let u;
  try { u = new URL(target); } catch (e) { return json({ error: "bad_url" }, 400); }
  if (u.origin !== new URL(request.url).origin) return json({ error: "bad_origin" }, 400);
  if (target.length > 2048) return json({ error: "too_long" }, 413);

  const apiBase = (env.SHRTNR_API_BASE || "https://oddb.it/_/api").replace(/\/$/, "");
  // Short links live on THIS app's own domain (served by handleSlug below), so the
  // default short base is the request origin. SHRTNR_SHORT_BASE can override it
  // (e.g. a dedicated custom domain) if you ever want links somewhere else.
  const shortBase = (env.SHRTNR_SHORT_BASE || u.origin).replace(/\/$/, "");

  let r;
  try {
    r = await fetch(apiBase + "/links", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + env.SHRTNR_API_KEY },
      body: JSON.stringify({ url: target }),
    });
  } catch (e) { return json({ error: "upstream_unreachable" }, 502); }

  if (!r.ok) return json({ error: "shorten_failed" }, r.status);
  let d; try { d = await r.json(); } catch (e) { return json({ error: "bad_upstream" }, 502); }
  const slugs = (d && d.slugs) || [];
  const primary = slugs.find((s) => s.is_primary && !s.disabled_at) || slugs.find((s) => !s.disabled_at) || slugs[0];
  if (!primary || !primary.slug) return json({ error: "no_slug" }, 502);
  return json({ url: shortBase + "/s/" + primary.slug });
}

// ---- Resolve a short link on our own domain (/s/<slug>) ----
// Looks the slug up via the shrtnr API and redirects to its target. We only ever
// redirect back to this app's own origin (the same anti-abuse rule handleShare
// enforces when creating links), so this can't be turned into an open redirect.
async function handleSlug(request, env) {
  const reqUrl = new URL(request.url);
  const home = reqUrl.origin + "/";
  const slug = decodeURIComponent(reqUrl.pathname.slice("/s/".length));
  if (!slug || !/^[a-zA-Z0-9_-]+$/.test(slug)) return new Response("Not found", { status: 404 });
  if (!env.SHRTNR_API_KEY) return Response.redirect(home, 302);

  const apiBase = (env.SHRTNR_API_BASE || "https://oddb.it/_/api").replace(/\/$/, "");
  let r;
  try {
    r = await fetch(apiBase + "/slugs/" + encodeURIComponent(slug), {
      headers: { authorization: "Bearer " + env.SHRTNR_API_KEY },
    });
  } catch (e) { return Response.redirect(home, 302); }
  if (!r.ok) return new Response("Link not found", { status: 404 });

  let d; try { d = await r.json(); } catch (e) { return new Response("Link not found", { status: 404 }); }
  const now = Math.floor(Date.now() / 1000);
  if (d.expires_at && d.expires_at < now) return new Response("Link expired", { status: 410 });
  const matched = (d.slugs || []).find((s) => s.slug === slug);
  if (matched && matched.disabled_at) return new Response("Link disabled", { status: 410 });

  let dest;
  try { dest = new URL(d.url); } catch (e) { return new Response("Link not found", { status: 404 }); }
  if (dest.origin !== reqUrl.origin) return new Response("Link not found", { status: 404 });
  return Response.redirect(dest.toString(), 302);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/scan") {
      if (request.method === "POST") return handleScan(request, env);
      if (request.method === "GET") return json({ ok: true, configured: !!env.GEMINI_API_KEY });
      return json({ error: "method_not_allowed" }, 405);
    }
    if (url.pathname === "/api/share") return handleShare(request, env);
    if (url.pathname.startsWith("/s/") && request.method === "GET") return handleSlug(request, env);
    return env.ASSETS.fetch(request);
  },
};