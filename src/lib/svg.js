import { esc, num } from "./format.js";

// Build the shareable "who owes what" summary as an SVG string.
// `money` is the currency-aware formatter; `res`/`tx` come from the store's
// results()/settleUp(). Charges are passed raw so we can show only the present ones.
export const buildSvg = ({ res, tx, money, grandTotal, tax, service, tip, discount }) => {
  const W = 600,
    pad = 30,
    headerH = 96,
    rowH = 50;
  let y = headerH + 40;
  const parts = [];
  res.forEach((r) => {
    const lis =
      r.lineItems && r.lineItems.length
        ? r.lineItems.map((li) => ({ label: li.name + (li.ways > 1 ? ` (split ${li.ways})` : ""), amt: li.share }))
        : [{ label: "No items assigned", amt: 0 }];
    const rows = lis.slice();
    if (num(tax) > 0) rows.push({ label: "Tax share", amt: r.taxShare });
    if (num(service) > 0) rows.push({ label: "Service share", amt: r.svcShare });
    if (num(discount) > 0) rows.push({ label: "Discount", amt: -r.discShare });
    if (num(tip) > 0) rows.push({ label: "Tip share", amt: r.tipShare });
    const blockH = 46 + rows.length * 24;
    parts.push(`<rect x="${pad}" y="${y - 26}" width="${W - 2 * pad}" height="${blockH}" rx="14" fill="#f0fdf4"/>`);
    parts.push(
      `<text x="${pad + 20}" y="${y}" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#14532d">${esc(r.name)}</text>`
    );
    parts.push(
      `<text x="${W - pad - 20}" y="${y}" font-family="Arial, sans-serif" font-size="20" font-weight="800" fill="#16a34a" text-anchor="end">${esc(money(r.total))}</text>`
    );
    y += 32;
    rows.forEach((row) => {
      parts.push(
        `<text x="${pad + 28}" y="${y}" font-family="Arial, sans-serif" font-size="15" fill="#4b5563">${esc(row.label)}</text>`
      );
      parts.push(
        `<text x="${W - pad - 20}" y="${y}" font-family="Arial, sans-serif" font-size="15" fill="#4b5563" text-anchor="end">${esc((row.amt < 0 ? "−" : "") + money(Math.abs(row.amt)))}</text>`
      );
      y += 24;
    });
    y += 22;
  });
  y += 6;
  parts.push(`<line x1="${pad}" y1="${y - 26}" x2="${W - pad}" y2="${y - 26}" stroke="#bbf7d0" stroke-width="2"/>`);
  parts.push(
    `<text x="${pad + 20}" y="${y}" font-family="Arial, sans-serif" font-size="20" font-weight="800" fill="#14532d">Total</text>`
  );
  parts.push(
    `<text x="${W - pad - 20}" y="${y}" font-family="Arial, sans-serif" font-size="20" font-weight="800" fill="#14532d" text-anchor="end">${esc(money(grandTotal))}</text>`
  );
  y += rowH;
  if (tx.length) {
    parts.push(
      `<text x="${pad + 20}" y="${y}" font-family="Arial, sans-serif" font-size="18" font-weight="800" fill="#15803d">Settle up</text>`
    );
    y += 34;
    tx.forEach((t) => {
      parts.push(
        `<text x="${pad + 20}" y="${y}" font-family="Arial, sans-serif" font-size="17" font-weight="600" fill="#166534">${esc(t.from)}  -&gt;  ${esc(t.to)}</text>`
      );
      parts.push(
        `<text x="${W - pad - 20}" y="${y}" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#16a34a" text-anchor="end">${esc(money(t.amt))}</text>`
      );
      y += 30;
    });
  }
  const H = y + 24;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#ffffff"/><rect width="${W}" height="${headerH}" fill="#22c55e"/><text x="${pad}" y="58" font-family="Arial, sans-serif" font-size="30" font-weight="800" fill="#ffffff">SplitGreen</text><text x="${pad}" y="82" font-family="Arial, sans-serif" font-size="15" fill="#dcfce7">Who owes what</text>${parts.join("")}</svg>`;
  return { svg, W, H };
};
