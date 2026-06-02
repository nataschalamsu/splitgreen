// _worker.js — Cloudflare Pages (advanced mode)
// Handles /api/scan on the server (your key stays hidden) and serves
// index.html (and everything else) as normal static files.

const SCAN_PROMPT = 'Extract the receipt data from this image. Respond with ONLY raw JSON, no markdown, no backticks, no preamble. Use this schema exactly: {"items":[{"name":"string","price":number}],"tax":number,"service":number,"tip":number,"discount":number}. All values are positive numbers. service is the service charge / service fee. discount is the total discount amount. If a value is missing use 0. Only include real line items in items, not the subtotal/total/tax/service lines.';

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

async function handleScan(request, env) {
  if (!env.ANTHROPIC_API_KEY) return json({ error: "not_configured" }, 500);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "bad_request" }, 400); }
  const { image, mediaType } = body || {};
  if (!image) return json({ error: "no_image" }, 400);

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: image } },
          { type: "text", text: SCAN_PROMPT },
        ],
      }],
    }),
  });

  if (!resp.ok) return json({ error: "scan_failed" }, resp.status);

  const data = await resp.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
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
      if (request.method === "GET") return json({ ok: true, configured: !!env.ANTHROPIC_API_KEY });
      return json({ error: "method_not_allowed" }, 405);
    }
    // Everything else: serve the static files (index.html, etc.)
    return env.ASSETS.fetch(request);
  },
};
