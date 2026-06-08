// Image helpers: downscale to base64 for the cloud scanner, raw base64 fallback,
// and Otsu-thresholded preprocessing for the on-device Tesseract path.

// Convert an Apple HEIC/HEIF image into a JPEG blob the browser can actually
// decode. iPhones shoot HEIC by default and Chrome/Firefox can't render it, so
// without this their uploads fail. heic2any (libheif/wasm) is lazy-loaded the
// first time it's needed, keeping its weight out of the initial bundle.
export const convertHeic = async (image) => {
  if (typeof image === "string") return null; // camera captures are already JPEG data URLs
  const { default: heic2any } = await import("heic2any");
  const out = await heic2any({ blob: image, toType: "image/jpeg", quality: 0.92 });
  return Array.isArray(out) ? out[0] : out;
};

export const prepImage = (image) =>
  new Promise((resolve) => {
    const img = new Image();
    let objUrl = null;
    img.onload = () => {
      let w = img.naturalWidth || img.width,
        h = img.naturalHeight || img.height;
      if (!w || !h) {
        if (objUrl) URL.revokeObjectURL(objUrl);
        resolve(null);
        return;
      }
      const MAX = 1600,
        scale = Math.min(1, MAX / Math.max(w, h));
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      if (objUrl) URL.revokeObjectURL(objUrl);
      try {
        resolve({ b64: c.toDataURL("image/jpeg", 0.9).split(",")[1], mimeType: "image/jpeg" });
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => {
      if (objUrl) URL.revokeObjectURL(objUrl);
      resolve(null);
    };
    if (typeof image === "string") img.src = image;
    else {
      try {
        objUrl = URL.createObjectURL(image);
        img.src = objUrl;
      } catch (e) {
        resolve(null);
      }
    }
  });

export const toB64 = (image) =>
  new Promise((resolve, reject) => {
    if (typeof image === "string") {
      const mt = (image.match(/^data:([^;]+)/) || [])[1] || "image/jpeg";
      resolve({ b64: image.slice(image.indexOf(",") + 1), mimeType: mt });
    } else {
      const r = new FileReader();
      r.onload = () => resolve({ b64: String(r.result).split(",")[1], mimeType: image.type || "image/jpeg" });
      r.onerror = () => reject(new Error("read"));
      r.readAsDataURL(image);
    }
  });

// Tesseract pre-processing (fallback path): upscale into a readable range and binarise.
export const preprocess = (image) =>
  new Promise((resolve) => {
    const img = new Image();
    let objUrl = null;
    img.onload = () => {
      let w = img.naturalWidth || img.width,
        h = img.naturalHeight || img.height;
      if (!w || !h) {
        if (objUrl) URL.revokeObjectURL(objUrl);
        resolve(image);
        return;
      }
      const maxSide = Math.max(w, h),
        MIN = 1500,
        MAX = 2400;
      let scale = 1;
      if (maxSide < MIN) scale = MIN / maxSide;
      else if (maxSide > MAX) scale = MAX / maxSide;
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      if (objUrl) URL.revokeObjectURL(objUrl);
      let id;
      try {
        id = ctx.getImageData(0, 0, w, h);
      } catch (e) {
        resolve(canvas.toDataURL("image/png"));
        return;
      }
      const px = id.data,
        n = w * h;
      const gray = new Uint8ClampedArray(n),
        hist = new Array(256).fill(0);
      for (let i = 0, j = 0; i < px.length; i += 4, j++) {
        const g = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) | 0;
        gray[j] = g;
        hist[g]++;
      }
      let sum = 0;
      for (let i = 0; i < 256; i++) sum += i * hist[i];
      let sumB = 0,
        wB = 0,
        maxVar = 0,
        thr = 128;
      for (let i = 0; i < 256; i++) {
        wB += hist[i];
        if (!wB) continue;
        const wF = n - wB;
        if (!wF) break;
        sumB += i * hist[i];
        const mB = sumB / wB,
          mF = (sum - sumB) / wF;
        const between = wB * wF * (mB - mF) * (mB - mF);
        if (between > maxVar) {
          maxVar = between;
          thr = i;
        }
      }
      for (let i = 0, j = 0; i < px.length; i += 4, j++) {
        const v = gray[j] > thr ? 255 : 0;
        px[i] = px[i + 1] = px[i + 2] = v;
        px[i + 3] = 255;
      }
      ctx.putImageData(id, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      if (objUrl) URL.revokeObjectURL(objUrl);
      resolve(image);
    };
    if (typeof image === "string") img.src = image;
    else {
      try {
        objUrl = URL.createObjectURL(image);
        img.src = objUrl;
      } catch (e) {
        resolve(image);
      }
    }
  });
