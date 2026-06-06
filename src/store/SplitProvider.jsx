import { createContext, useContext, useState, useRef, useEffect } from "react";
import { uid, r2, num, encodeShare, decodeShare, lsGet, lsSet, formatMoney } from "../lib/format.js";
import { prepImage, toB64, preprocess } from "../lib/image.js";
import { parseReceipt } from "../lib/receipt.js";
import { buildSvg } from "../lib/svg.js";

const SplitContext = createContext(null);

// One hook for the whole app. Every screen reads shared state and actions from here,
// which keeps the step components small and avoids deep prop drilling.
export const useSplit = () => {
  const ctx = useContext(SplitContext);
  if (!ctx) throw new Error("useSplit must be used within <SplitProvider>");
  return ctx;
};

export function SplitProvider({ children }) {
  const [step, setStep] = useState("start");
  const [items, setItems] = useState([]);
  const [people, setPeople] = useState([]);
  const [tax, setTax] = useState("");
  const [service, setService] = useState("");
  const [tip, setTip] = useState("");
  const [discount, setDiscount] = useState("");
  const [currency, setCurrency] = useState("Rp");
  const [paid, setPaid] = useState({});

  const [dark, setDark] = useState(() => {
    const saved = lsGet("sg_dark", null);
    if (saved !== null) return saved;
    try {
      return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    } catch (e) {
      return false;
    }
  });
  useEffect(() => {
    lsSet("sg_dark", dark);
  }, [dark]);

  const [history, setHistory] = useState(() => lsGet("sg_history", []));
  useEffect(() => {
    lsSet("sg_history", history);
  }, [history]);

  // Detect the server scan function (Gemini, hidden key)
  const [serverScan, setServerScan] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/api/scan")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (live && d && d.ok && d.configured) setServerScan(true);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [scanProgress, setScanProgress] = useState(0);
  const [scanError, setScanError] = useState("");
  const [scanNotice, setScanNotice] = useState("");
  const [camOpen, setCamOpen] = useState(false);
  const [camError, setCamError] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  const [newPerson, setNewPerson] = useState("");
  const [readOnly, setReadOnly] = useState(false);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [saved, setSaved] = useState(false);

  const [imgUrl, setImgUrl] = useState("");
  const [genning, setGenning] = useState(false);
  const [imgError, setImgError] = useState("");

  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const money = (n) => formatMoney(currency, n);
  const subtotal = items.reduce((s, i) => s + num(i.price), 0);
  const grandTotal = subtotal + num(tax) + num(service) + num(tip) - num(discount);
  const totalPaid = people.reduce((s, p) => s + num(paid[p.id]), 0);

  const applyData = (d) => {
    setPeople(d.people || []);
    setItems(d.items || []);
    setTax(d.tax || "");
    setService(d.service || "");
    setTip(d.tip || "");
    setDiscount(d.discount || "");
    setCurrency(d.currency || "Rp");
    setPaid(d.paid || {});
  };

  useEffect(() => {
    const q = (window.location.search || "").match(/[?&]s=([^&]+)/);
    const h = (window.location.hash || "").match(/[#&]s=([^&]+)/);
    const enc = (q && q[1]) || (h && h[1]);
    if (!enc) return;
    let live = true;
    (async () => {
      const data = await decodeShare(decodeURIComponent(enc));
      if (live && data) {
        applyData(data);
        setReadOnly(true);
        setStep("results");
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  // ---------- Scanning ----------
  const applyScan = (parsed) => {
    const scanned = (parsed.items || []).map((it) => ({
      id: uid(),
      name: it.name || "Item",
      qty: num(it.qty) > 1 ? String(num(it.qty)) : "",
      price: String(num(it.price)),
      assignedTo: [],
    }));
    setItems(scanned.length ? scanned : [{ id: uid(), name: "", qty: "", price: "", assignedTo: [] }]);
    setTax(parsed.tax ? String(parsed.tax) : "");
    setService(parsed.service ? String(parsed.service) : "");
    setTip(parsed.tip ? String(parsed.tip) : "");
    setDiscount(parsed.discount ? String(parsed.discount) : "");
    setPeople([]);
    setPaid({});
    setReadOnly(false);
    setLink("");
    setImgUrl("");
    try {
      window.history.replaceState(null, "", window.location.pathname);
    } catch (e) {}
    setStep("review");
  };

  // Server (Gemini, hidden key). Returns parsed data, null if unavailable, or throws on server error.
  const tryServerScan = async (image) => {
    const prep = (await prepImage(image)) || (await toB64(image));
    if (!prep) return null;
    let resp;
    try {
      resp = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: prep.b64, mimeType: prep.mimeType }),
      });
    } catch (e) {
      return null;
    }
    if (resp.status === 404) return null;
    let data = null;
    try {
      data = await resp.json();
    } catch (e) {}
    if (resp.ok && data && !data.error) return data;
    if (resp.status === 500 && data && data.error === "not_configured") return null;
    const err = new Error("server");
    err.code = resp.status === 429 ? "rate" : "api";
    throw err;
  };

  const runOCR = async (image) => {
    setScanError("");
    setScanNotice("");
    setScanProgress(0);
    setScanStatus(serverScan ? "Reading with Gemini…" : "Enhancing photo…");
    setScanning(true);
    let worker;
    try {
      let parsed = await tryServerScan(image);
      if (!parsed) {
        if (serverScan)
          setScanNotice(
            "Cloud scanner was unreachable — read this on your device instead. Item names may be rough, so please double-check them."
          );
        // Lazy-load the on-device OCR engine only when the cloud path is unavailable —
        // keeps it (and its wasm) out of the initial bundle.
        let Tesseract;
        try {
          Tesseract = await import("tesseract.js");
        } catch (e) {
          setScanError("The on-device reader is still loading — try again in a moment.");
          return;
        }
        setScanStatus("Enhancing photo…");
        const processed = await preprocess(image);
        setScanStatus("Reading…");
        worker = await Tesseract.createWorker("eng", 1, {
          logger: (m) => {
            if (m.status === "recognizing text") setScanProgress(Math.round((m.progress || 0) * 100));
          },
        });
        await worker.setParameters({
          tessedit_pageseg_mode: "6",
          preserve_interword_spaces: "1",
          user_defined_dpi: "300",
        });
        const { data } = await worker.recognize(processed);
        parsed = parseReceipt(data.text || "", currency);
      }
      // Guard against non-receipt images: a real receipt has at least one priced
      // item or a charge line. If we found neither, warn instead of dropping the
      // user into an empty editor with no explanation.
      const hasPriced = (parsed.items || []).some((it) => num(it.price) > 0);
      const charges = num(parsed.tax) + num(parsed.service) + num(parsed.tip) + num(parsed.discount);
      if (!hasPriced && charges === 0) {
        setScanNotice("");
        setScanError(
          "Hmm, that doesn't look like a receipt — I couldn't find any items with prices. Try a clearer, flat, well-lit photo of the whole receipt, or enter the items manually."
        );
        return;
      }
      applyScan(parsed);
    } catch (err) {
      const c = err && err.code;
      if (c === "rate")
        setScanError("The scanner's free limit was hit — wait a minute and try again, or enter the items manually.");
      else setScanError("Couldn't read that receipt. Try a clearer, flat, well-lit photo — or enter the items manually.");
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (e) {}
      }
      setScanning(false);
      setScanProgress(0);
      setScanStatus("");
    }
  };

  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (fileRef.current) fileRef.current.value = "";
    if (file) await runOCR(file);
  };

  const openCamera = async () => {
    setCamError("");
    setScanError("");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      fileRef.current && fileRef.current.click();
      return;
    }
    try {
      // Ask for a high-resolution rear stream so receipt text stays sharp enough
      // to read. The browser clamps to the nearest supported size.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 2560 },
          height: { ideal: 1440 },
        },
        audio: false,
      });
      streamRef.current = stream;
      // Torch/focus capabilities are only reliable once the track is actually
      // streaming, so they're detected in the play effect below — not here.
      setTorchOn(false);
      setTorchSupported(false);
      setCamOpen(true);
    } catch (e) {
      setCamError("Couldn't open the live camera, opening your photo picker instead.");
      setTimeout(() => fileRef.current && fileRef.current.click(), 150);
    }
  };

  // Toggle the camera flash (torch) on the live video track. Stopping the stream
  // turns it off automatically, so we only manage it while the camera is open.
  const toggleTorch = async () => {
    const track = streamRef.current && streamRef.current.getVideoTracks()[0];
    if (!track || !track.applyConstraints) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] });
      // Reflect the real state when the device reports it (advanced constraints
      // don't throw when unsupported, so this keeps the button honest).
      let actual = next;
      try {
        const s = track.getSettings ? track.getSettings() : {};
        if (typeof s.torch === "boolean") actual = s.torch;
      } catch (e) {}
      setTorchOn(actual);
    } catch (e) {
      setTorchSupported(false);
    }
  };

  useEffect(() => {
    if (!camOpen || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    video.srcObject = stream;
    video.play().catch(() => {});

    const track = stream.getVideoTracks()[0];
    if (!track) return;

    let cancelled = false;
    let focusDone = false;
    const timers = [];

    // Torch support is reported inconsistently across Android devices and often
    // populates only after the camera has been streaming for a moment, so we probe
    // several ways and several times. We only ever ENABLE the button — an empty
    // reading never hides it, since a later probe may still find torch.
    const detect = async () => {
      if (cancelled) return;
      let caps = {};
      let settings = {};
      try {
        caps = track.getCapabilities ? track.getCapabilities() : {};
      } catch (e) {}
      try {
        settings = track.getSettings ? track.getSettings() : {};
      } catch (e) {}

      let torch = !!caps.torch;
      // Some Android/Chrome builds only expose flash via ImageCapture.
      if (!torch && typeof ImageCapture !== "undefined") {
        try {
          const photo = await new ImageCapture(track).getPhotoCapabilities();
          const modes = (photo && photo.fillLightMode) || [];
          if (modes.includes("flash") || modes.includes("torch")) torch = true;
        } catch (e) {}
      }
      // Last resort: a rear (environment) phone camera almost always has a torch
      // even when neither API advertises it.
      if (!torch && settings.facingMode === "environment") torch = true;

      if (!cancelled && torch) setTorchSupported(true);

      // Continuous autofocus for sharper receipt captures, when supported.
      if (!focusDone && caps.focusMode && caps.focusMode.includes && caps.focusMode.includes("continuous")) {
        focusDone = true;
        try {
          track.applyConstraints({ advanced: [{ focusMode: "continuous" }] }).catch(() => {});
        } catch (e) {}
      }
    };

    if (video.readyState >= 1) detect();
    video.addEventListener("loadedmetadata", detect);
    video.addEventListener("playing", detect);
    [300, 1000, 2000].forEach((ms) => timers.push(setTimeout(detect, ms)));

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      video.removeEventListener("loadedmetadata", detect);
      video.removeEventListener("playing", detect);
    };
  }, [camOpen]);

  useEffect(
    () => () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    },
    []
  );

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setTorchOn(false);
    setCamOpen(false);
  };

  const capturePhoto = async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d").drawImage(v, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    closeCamera();
    await runOCR(dataUrl);
  };

  // ---------- Items / People ----------
  const addItem = () => setItems((s) => [...s, { id: uid(), name: "", qty: "", price: "", assignedTo: [] }]);
  const updItem = (id, f, v) => setItems((s) => s.map((i) => (i.id === id ? { ...i, [f]: v } : i)));
  const delItem = (id) => setItems((s) => s.filter((i) => i.id !== id));
  const addPerson = () => {
    const name = newPerson.trim();
    if (!name) return;
    setPeople((s) => [...s, { id: uid(), name }]);
    setNewPerson("");
  };
  const delPerson = (id) => {
    setPeople((s) => s.filter((p) => p.id !== id));
    setItems((s) => s.map((i) => ({ ...i, assignedTo: i.assignedTo.filter((x) => x !== id) })));
    setPaid((s) => {
      const n = { ...s };
      delete n[id];
      return n;
    });
  };
  const toggleAssign = (itemId, personId) =>
    setItems((s) =>
      s.map((i) => {
        if (i.id !== itemId) return i;
        const has = i.assignedTo.includes(personId);
        return { ...i, assignedTo: has ? i.assignedTo.filter((x) => x !== personId) : [...i.assignedTo, personId] };
      })
    );
  const updPaid = (id, v) => setPaid((s) => ({ ...s, [id]: v }));
  const markPayer = (id) => setPaid({ [id]: grandTotal.toFixed(2) });

  // ---------- Math ----------
  const results = () => {
    const base = {};
    people.forEach((p) => (base[p.id] = 0));
    items.forEach((it) => {
      const price = num(it.price),
        a = it.assignedTo || [];
      if (!a.length) return;
      const share = price / a.length;
      a.forEach((pid) => {
        if (base[pid] != null) base[pid] += share;
      });
    });
    const taxN = num(tax),
      svcN = num(service),
      tipN = num(tip),
      discN = num(discount);
    return people.map((p) => {
      const itemTotal = base[p.id];
      const lineItems = items
        .filter((it) => (it.assignedTo || []).includes(p.id))
        .map((it) => {
          const ways = (it.assignedTo || []).length || 1;
          return {
            id: it.id,
            name: (it.name || "Item") + (num(it.qty) > 1 ? ` ×${num(it.qty)}` : ""),
            share: num(it.price) / ways,
            ways,
          };
        });
      const frac = subtotal > 0 ? itemTotal / subtotal : 0;
      const taxShare = taxN * frac,
        svcShare = svcN * frac,
        tipShare = tipN * frac,
        discShare = discN * frac;
      return {
        ...p,
        itemTotal,
        lineItems,
        taxShare,
        svcShare,
        tipShare,
        discShare,
        total: itemTotal + taxShare + svcShare + tipShare - discShare,
      };
    });
  };

  const settleUp = () => {
    const res = results();
    const bal = res.map((r) => ({ name: r.name, amt: r2(num(paid[r.id]) - r.total) }));
    const creditors = bal
      .filter((b) => b.amt > 0.005)
      .map((b) => ({ ...b }))
      .sort((a, b) => b.amt - a.amt);
    const debtors = bal
      .filter((b) => b.amt < -0.005)
      .map((b) => ({ name: b.name, amt: -b.amt }))
      .sort((a, b) => b.amt - a.amt);
    const tx = [];
    let i = 0,
      j = 0;
    while (i < debtors.length && j < creditors.length) {
      const pay = r2(Math.min(debtors[i].amt, creditors[j].amt));
      if (pay > 0.005) tx.push({ from: debtors[i].name, to: creditors[j].name, amt: pay });
      debtors[i].amt = r2(debtors[i].amt - pay);
      creditors[j].amt = r2(creditors[j].amt - pay);
      if (debtors[i].amt < 0.005) i++;
      if (creditors[j].amt < 0.005) j++;
    }
    return tx;
  };

  const assignedSum = items.reduce((s, i) => s + (i.assignedTo.length ? num(i.price) : 0), 0);
  const unassigned = subtotal - assignedSum;

  // ---------- Share / Save / Image ----------
  const base = () => window.location.origin + window.location.pathname;
  const selfLink = async (payload) => base() + "?s=" + encodeURIComponent(await encodeShare(payload));
  const makeShare = async () => {
    if (sharing) return;
    setSharing(true);
    setCopied(false);
    const payload = { people, items, tax, service, tip, discount, currency, paid };
    const longUrl = await selfLink(payload);
    let url = "";
    try {
      const r = await fetch("/api/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: longUrl }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d && d.url) url = d.url;
      }
    } catch (e) {}
    if (!url) url = longUrl; // fallback: full self-contained link (shortener unavailable / too long)
    setLink(url);
    setSharing(false);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {}
  };
  const editCopy = () => {
    setReadOnly(false);
    try {
      window.history.replaceState(null, "", window.location.pathname);
    } catch (e) {}
    setStep("review");
  };
  const saveToDevice = () => {
    const id = uid();
    const label = `${money(grandTotal)} · ${new Date().toLocaleDateString()}`;
    const data = { people, items, tax, service, tip, discount, currency, paid };
    setHistory((h) => [{ id, label, count: people.length, data }, ...h].slice(0, 12));
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };
  const loadFromDevice = (h) => {
    applyData(h.data);
    setReadOnly(false);
    setStep("results");
  };
  const delFromDevice = (id) => setHistory((h) => h.filter((x) => x.id !== id));

  const makeImage = () => {
    setGenning(true);
    setImgError("");
    setImgUrl("");
    const { svg, W, H } = buildSvg({
      res: results(),
      tx: settleUp(),
      money,
      grandTotal,
      tax,
      service,
      tip,
      discount,
    });
    const img = new Image();
    img.onload = () => {
      try {
        const scale = 2,
          c = document.createElement("canvas");
        c.width = W * scale;
        c.height = H * scale;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, W, H);
        setImgUrl(c.toDataURL("image/png"));
      } catch (e) {
        setImgError("Couldn't generate the image. Try again.");
      } finally {
        setGenning(false);
      }
    };
    img.onerror = () => {
      setImgError("Couldn't generate the image. Try again.");
      setGenning(false);
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  };

  const startManual = () => {
    setItems([{ id: uid(), name: "", qty: "", price: "", assignedTo: [] }]);
    setPeople([]);
    setTax("");
    setService("");
    setTip("");
    setDiscount("");
    setCurrency("Rp");
    setPaid({});
    setReadOnly(false);
    setStep("review");
  };
  const reset = () => {
    setItems([]);
    setPeople([]);
    setTax("");
    setService("");
    setTip("");
    setDiscount("");
    setCurrency("Rp");
    setPaid({});
    setReadOnly(false);
    setLink("");
    setImgUrl("");
    setImgError("");
    setScanError("");
    try {
      window.history.replaceState(null, "", window.location.pathname);
    } catch (e) {}
    setStep("start");
  };
  const tipPct = (pct) => setTip(((subtotal * pct) / 100).toFixed(2));

  // Theme tokens — the app toggles class strings manually (no Tailwind `dark:` variant).
  const t = {
    app: dark ? "bg-gray-900 text-gray-100" : "bg-green-50 text-green-900",
    card: dark ? "bg-gray-800" : "bg-white",
    soft: dark ? "bg-gray-700" : "bg-green-50",
    border: dark ? "border-gray-700" : "border-green-200",
    borderSoft: dark ? "border-gray-700" : "border-green-100",
    head: dark ? "text-gray-100" : "text-green-900",
    sub: dark ? "text-gray-400" : "text-green-700",
    label: dark ? "text-gray-200" : "text-green-800",
    inputText: dark ? "text-gray-100" : "text-green-900",
    chip: dark ? "bg-gray-700 text-green-300" : "bg-green-100 text-green-800",
    chipBtn: dark ? "bg-gray-700 hover:bg-gray-600 text-green-300" : "bg-green-100 hover:bg-green-200 text-green-700",
    totals: dark ? "bg-gray-800 text-gray-200" : "bg-green-100 text-green-800",
    secBtn: dark
      ? "bg-gray-800 hover:bg-gray-700 text-green-300 border-gray-700"
      : "bg-white hover:bg-green-100 text-green-700 border-green-200",
    pillOff: dark ? "bg-gray-800 text-green-300 border-gray-600" : "bg-white text-green-700 border-green-200",
    warn: dark ? "bg-amber-900 text-amber-200" : "bg-amber-50 text-amber-700",
    err: dark ? "bg-red-900 text-red-200" : "bg-red-50 text-red-600",
    accent: dark ? "text-green-400" : "text-green-600",
  };

  const value = {
    // state
    step,
    setStep,
    items,
    people,
    tax,
    setTax,
    service,
    setService,
    tip,
    setTip,
    discount,
    setDiscount,
    currency,
    setCurrency,
    paid,
    dark,
    setDark,
    history,
    serverScan,
    scanning,
    scanStatus,
    scanProgress,
    scanError,
    scanNotice,
    camOpen,
    camError,
    torchOn,
    torchSupported,
    newPerson,
    setNewPerson,
    readOnly,
    link,
    copied,
    sharing,
    saved,
    imgUrl,
    genning,
    imgError,
    // refs
    fileRef,
    videoRef,
    // derived
    money,
    num,
    subtotal,
    grandTotal,
    totalPaid,
    unassigned,
    results,
    settleUp,
    // actions
    onFile,
    openCamera,
    closeCamera,
    capturePhoto,
    toggleTorch,
    startManual,
    addItem,
    updItem,
    delItem,
    addPerson,
    delPerson,
    toggleAssign,
    updPaid,
    markPayer,
    tipPct,
    makeShare,
    editCopy,
    saveToDevice,
    loadFromDevice,
    delFromDevice,
    makeImage,
    reset,
    setLink,
    setImgUrl,
    // theme
    t,
  };

  return <SplitContext.Provider value={value}>{children}</SplitContext.Provider>;
}
