# SplitGreen

Split the bill, fair & square — scan or type a receipt, split it fairly between people, and share a link to the result.

Built with **React** + **Vite** + **Tailwind CSS**, deployed on **Cloudflare Workers**. Receipts are read by Gemini through a server-side key (with on-device [Tesseract.js](https://tesseract.js.org/) OCR as a fallback), and share links are shortened through a server-side proxy.

## Project layout

```
index.html              Vite entry HTML
worker.js               Cloudflare Worker: /api/scan (Gemini) + /api/share (link shortener), serves dist/
wrangler.json           Cloudflare config (serves the built dist/ as static assets)
src/
  main.jsx              React entry
  App.jsx               Provider + step router
  index.css             Tailwind directives + base resets
  constants.js          Supported currencies
  store/
    SplitProvider.jsx   All app state, math, scanning, sharing — exposed via the useSplit() hook
  lib/
    format.js           ids, rounding, escaping, base64, localStorage, money formatting
    image.js            image downscaling + Otsu preprocessing for OCR
    receipt.js          parse OCR text into items + charges (on-device path)
    svg.js              build the shareable summary image
  components/
    Header.jsx          gradient header with dark-mode toggle
    Field.jsx           labelled currency input row
    CameraModal.jsx     live camera capture overlay
    steps/              StartStep, ReviewStep, PeopleStep, AssignStep, ResultsStep
```

## Develop

```bash
npm install
npm run dev          # Vite dev server (frontend only)
```

The `/api/*` endpoints live in the Cloudflare Worker, which Vite doesn't run. In dev, Vite
proxies `/api` to a local `wrangler dev` on port 8787 (see `vite.config.js`). If that isn't
running, API calls simply fail and the app falls back to on-device OCR — exactly as in production.

To run the full stack locally (frontend + Worker API):

```bash
npm run worker       # builds dist/, then `wrangler dev` serving the Worker + built assets
```

## Build & deploy

```bash
npm run build        # outputs to dist/
npm run deploy       # builds, then `wrangler deploy`
```

### Worker configuration

Set these as Worker secrets/vars (e.g. `npx wrangler secret put GEMINI_API_KEY`):

| Name               | Purpose                                                        |
| ------------------ | ------------------------------------------------------------- |
| `GEMINI_API_KEY`   | Enables cloud receipt scanning via Gemini. Optional.          |
| `GEMINI_MODEL`     | Override the Gemini model (default `gemini-2.5-flash`).        |
| `SHRTNR_API_KEY`   | Enables short share links via the shrtnr proxy. Optional.     |
| `SHRTNR_API_BASE`  | Shortener API base (default `https://oddb.it/_/api`).          |
| `SHRTNR_SHORT_BASE`| Short link origin (default: this app's own origin).           |

Short links are served **on this app's own domain**: `/api/share` registers the link with
shrtnr and returns `<this-origin>/s/<slug>`, and the Worker resolves `/s/<slug>` by looking the
slug up via the shrtnr API (`GET /slugs/{slug}`) and 302-redirecting to the target. The Worker
only ever redirects to its own origin, so it can't be used as an open redirector. Set
`SHRTNR_SHORT_BASE` only if you want links on a different host than the app.

Everything degrades gracefully: with no `GEMINI_API_KEY`, scanning runs on-device; with no
`SHRTNR_API_KEY`, share links fall back to a full self-contained URL.
