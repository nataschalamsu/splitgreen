// Small pure helpers: ids, rounding, escaping, base64, localStorage, money/number.

let idc = 1;
export const uid = () => `id${idc++}_${Math.random().toString(36).slice(2, 6)}`;

export const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const num = (v) => Number(v) || 0;

export const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const b64enc = (str) => {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (e) {
    return "";
  }
};

export const b64dec = (str) => {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch (e) {
    return "";
  }
};

export const lsGet = (k, d) => {
  try {
    const v = localStorage.getItem(k);
    return v == null ? d : JSON.parse(v);
  } catch (e) {
    return d;
  }
};

export const lsSet = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {}
};

// Currency-aware formatter. Rp/¥ have no decimals; Rp uses "." as a thousands separator.
export const formatMoney = (currency, n) => {
  if (currency === "Rp") {
    const v = Math.round(Number(n) || 0);
    const s = Math.abs(v)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${v < 0 ? "-" : ""}Rp${s}`;
  }
  return `${currency}${(Number(n) || 0).toFixed(2)}`;
};
