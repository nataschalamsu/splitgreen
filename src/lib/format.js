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

// ---- Share payload codec ----
// Share links carry the whole split in the URL. JSON+base64 gets long fast and
// the link shortener caps stored URLs at 2048 chars, so we gzip the payload to
// keep far bigger bills shareable. Compressed values are marked with a leading
// "~"; anything else is treated as a legacy plain-base64 link.
const hasCompression =
  typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";

const bytesToB64url = (bytes) => {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const b64urlToBytes = (s) => {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const gzip = async (str) => {
  const cs = new CompressionStream("gzip");
  const w = cs.writable.getWriter();
  w.write(new TextEncoder().encode(str));
  w.close();
  return new Uint8Array(await new Response(cs.readable).arrayBuffer());
};

const gunzip = async (bytes) => {
  const ds = new DecompressionStream("gzip");
  const w = ds.writable.getWriter();
  w.write(bytes);
  w.close();
  return new TextDecoder().decode(await new Response(ds.readable).arrayBuffer());
};

export const encodeShare = async (obj) => {
  const json = JSON.stringify(obj);
  const plain = b64enc(json);
  if (hasCompression) {
    try {
      const compact = "~" + bytesToB64url(await gzip(json));
      // Only prefer the compressed form when it's actually shorter.
      if (compact.length < (plain.length || Infinity)) return compact;
    } catch (e) {}
  }
  return plain;
};

export const decodeShare = async (str) => {
  if (!str) return null;
  try {
    if (str[0] === "~") {
      if (typeof DecompressionStream === "undefined") return null;
      return JSON.parse(await gunzip(b64urlToBytes(str.slice(1))));
    }
    const json = b64dec(str);
    return json ? JSON.parse(json) : null;
  } catch (e) {
    return null;
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
