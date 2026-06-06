// Parse raw OCR text from the on-device (Tesseract) path into items + charges.

export const normalizeNum = (raw, currency) => {
  let s = String(raw).replace(/[^\d.,]/g, "");
  if (!s || !/\d/.test(s)) return null;
  const noDecimals = currency === "Rp" || currency === "¥";
  if (noDecimals) {
    const x = parseInt(s.replace(/[.,]/g, ""), 10);
    return isNaN(x) ? null : x;
  }
  const seps = s.match(/[.,]/g) || [];
  if (seps.length === 0) {
    const x = parseFloat(s);
    return isNaN(x) ? null : x;
  }
  if (seps.length === 1) {
    const idx = s.search(/[.,]/),
      after = s.length - idx - 1;
    if (after === 3) {
      const x = parseFloat(s.replace(/[.,]/g, ""));
      return isNaN(x) ? null : x;
    }
    const x = parseFloat(s.replace(",", "."));
    return isNaN(x) ? null : x;
  }
  const cleaned = s.replace(/[.,](?=.*[.,])/g, "").replace(",", ".");
  const x = parseFloat(cleaned);
  return isNaN(x) ? null : x;
};

export const parseReceipt = (text, currency) => {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const out = { items: [], tax: "", service: "", tip: "", discount: "" };
  const priceRe = /(\d[\d.,]*)\s*$/;
  for (const line of lines) {
    const m = line.match(priceRe);
    if (!m) continue;
    const value = normalizeNum(m[1], currency);
    if (value == null || value === 0) continue;
    let label = line.slice(0, m.index).trim();
    let qty = "";
    const qm = label.match(/^(\d{1,3})\s*[xX×*]\s+/) || label.match(/\s[xX×]\s*(\d{1,3})$/);
    if (qm) {
      const q = parseInt(qm[1], 10);
      if (q > 1) qty = String(q);
      label = label.replace(qm[0], " ").trim();
    }
    label = label
      .replace(/\s*(rp|idr|usd|\$|€|£|¥)\s*$/i, "")
      .replace(/[.\-:_=x ]+$/i, "")
      .trim();
    const low = line.toLowerCase();
    if (
      /(sub ?total|grand ?total|^total|amount due|balance|cash|change|tunai|kembali|qris|visa|master|debit|credit|\bcard\b|npwp|invoice|no\.)/.test(
        low
      )
    )
      continue;
    if (/(ppn|pb ?1|pajak|\btax\b|\bvat\b)/.test(low)) {
      out.tax = value;
      continue;
    }
    if (/(service|svc|servis|layanan)/.test(low)) {
      out.service = value;
      continue;
    }
    if (/(disc|diskon|potongan)/.test(low)) {
      out.discount = value;
      continue;
    }
    if (/(\btip\b|gratuity)/.test(low)) {
      out.tip = value;
      continue;
    }
    if (label && label.length >= 2 && /[a-zA-Z]/.test(label)) out.items.push({ name: label, qty, price: value });
  }
  return out;
};
