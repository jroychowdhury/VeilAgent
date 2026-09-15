/* DETECT - local PII detection.
 *
 * Two signals, both on device:
 *   1. regex patterns over visible text and input values
 *   2. DOM heuristics - data-field / name / id / label / input type
 *
 * Nothing in this file talks to the network.
 */

window.VeilDetect = (() => {
  const PATTERNS = [
    { type: "EMAIL", confidence: 0.97, re: /\b[\w.+-]+@[\w-]+\.[\w.-]{2,}\b/g },
    { type: "CARD_NUMBER", confidence: 0.95, re: /\b(?:\d[ -]*?){13,16}\b/g },
    { type: "IFSC", confidence: 0.93, re: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g },
    { type: "PAN", confidence: 0.92, re: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g },
    // Phone runs before account number: a 10-digit Indian mobile would otherwise
    // be swallowed by the broader account-number pattern.
    { type: "PHONE", confidence: 0.9, re: /\b(?:\+91[- ]?)?[6-9]\d{9}\b/g },
    { type: "ACCOUNT_NUMBER", confidence: 0.88, re: /\b\d{11,18}\b/g }
  ];

  // Attribute name -> PII type. This is the DOM heuristic layer.
  const FIELD_HINTS = {
    accountnumber: "ACCOUNT_NUMBER",
    account: "ACCOUNT_NUMBER",
    acctno: "ACCOUNT_NUMBER",
    ifsc: "IFSC",
    email: "EMAIL",
    mail: "EMAIL",
    phone: "PHONE",
    mobile: "PHONE",
    pan: "PAN",
    cardnumber: "CARD_NUMBER",
    card: "CARD_NUMBER",
    password: "PASSWORD",
    balance: "BALANCE",
    customername: "NAME",
    beneficiary: "NAME"
  };

  function hintFor(el) {
    const raw = [
      el.getAttribute && el.getAttribute("data-field"),
      el.getAttribute && el.getAttribute("name"),
      el.id,
      el.getAttribute && el.getAttribute("autocomplete")
    ].filter(Boolean).join(" ").toLowerCase().replace(/[^a-z]/g, "");
    if (!raw) return null;
    for (const key of Object.keys(FIELD_HINTS)) {
      if (raw.includes(key)) return FIELD_HINTS[key];
    }
    if (el.type === "password") return "PASSWORD";
    return null;
  }

  /** Detect PII inside a single string. */
  function scanText(text) {
    const found = [];
    if (!text) return found;
    for (const { type, re, confidence } of PATTERNS) {
      re.lastIndex = 0;
      let match;
      while ((match = re.exec(text)) !== null) {
        const value = match[0].trim();
        if (type === "ACCOUNT_NUMBER" && value.replace(/\D/g, "").length > 18) continue;
        if (found.some(f => f.value === value)) continue;
        found.push({ type, value, confidence, source: "regex" });
      }
    }
    return found;
  }

  /**
   * Walk the document and return every detection with its element and screen box.
   * @returns {Array<{type,value,confidence,source,element,rect}>}
   */
  function scanDocument(root = document.body) {
    const detections = [];
    const seen = new Set();

    const push = (type, value, confidence, source, element) => {
      const key = type + "|" + value;
      if (!value || seen.has(key)) return;
      seen.add(key);
      const rect = element ? element.getBoundingClientRect() : null;
      detections.push({
        type,
        value,
        confidence,
        source,
        element,
        rect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null
      });
    };

    // Elements the page itself has labelled - highest confidence path.
    root.querySelectorAll("[data-field]").forEach(el => {
      const type = hintFor(el);
      const value = (el.value !== undefined && el.value !== "" ? el.value : el.textContent || "").trim();
      if (type && value) push(type, value, 0.99, "dom-attribute", el);
    });

    // Form controls.
    root.querySelectorAll("input, select, textarea").forEach(el => {
      const type = hintFor(el);
      const value = (el.value || "").trim();
      if (type === "PASSWORD" && value) {
        push("PASSWORD", value, 0.99, "dom-attribute", el);
        return;
      }
      if (type && value) push(type, value, 0.96, "dom-attribute", el);
      else if (value) scanText(value).forEach(d => push(d.type, d.value, d.confidence, "regex-input", el));
    });

    // Remaining visible text, leaf elements only so boxes stay tight.
    root.querySelectorAll("dd, td, span, p, li, h1, h2, h3, div").forEach(el => {
      if (el.children.length > 0) return;
      const text = (el.textContent || "").trim();
      if (!text || text.length > 400) return;
      scanText(text).forEach(d => push(d.type, d.value, d.confidence, d.source, el));
    });

    return detections;
  }

  function summarise(detections) {
    const byType = {};
    detections.forEach(d => { byType[d.type] = (byType[d.type] || 0) + 1; });
    const lowest = detections.reduce((m, d) => Math.min(m, d.confidence), 1);
    return { total: detections.length, byType, lowestConfidence: detections.length ? lowest : 1 };
  }

  return { scanText, scanDocument, summarise, PATTERNS, FIELD_HINTS };
})();
