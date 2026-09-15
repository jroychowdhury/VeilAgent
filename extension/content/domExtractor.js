/* SEE (structure) - read the page's interactive elements.
 *
 * Only labels, roles and geometry are collected. Values of sensitive fields are
 * never copied out: we record `has_value` instead of the value itself.
 */

window.VeilDom = (() => {
  const SELECTOR = 'a[href], button, input, select, textarea, [role="button"], [onclick]';

  function visible(el) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    const style = getComputedStyle(el);
    return style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0";
  }

  function kindOf(el) {
    const tag = el.tagName.toLowerCase();
    if (tag === "a") return "link";
    if (tag === "button" || el.getAttribute("role") === "button") return "button";
    if (tag === "input" || tag === "select" || tag === "textarea") return "input";
    return "control";
  }

  function labelOf(el) {
    const explicit = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null;
    const candidates = [
      el.getAttribute("aria-label"),
      explicit ? explicit.textContent : null,
      el.tagName.toLowerCase() === "input" || el.tagName.toLowerCase() === "select"
        ? null
        : (el.textContent || "").trim(),
      el.getAttribute("placeholder"),
      el.getAttribute("name"),
      el.id
    ];
    const label = candidates.find(c => c && c.trim());
    return (label || el.tagName.toLowerCase()).trim().replace(/\s+/g, " ").slice(0, 80);
  }

  /** Extract elements and keep a live registry so the executor can act by index. */
  function extract() {
    const registry = [];
    document.querySelectorAll(SELECTOR).forEach(el => {
      if (!visible(el)) return;
      const rect = el.getBoundingClientRect();
      registry.push({
        index: registry.length,
        kind: kindOf(el),
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute("type") || null,
        label: labelOf(el),
        name: el.getAttribute("name") || null,
        placeholder: el.getAttribute("placeholder") || null,
        aria_label: el.getAttribute("aria-label") || null,
        id: el.id || null,
        has_value: !!(el.value && String(el.value).trim()),
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        _el: el
      });
    });
    window.__veilRegistry = registry;
    return registry;
  }

  /** A short chunk of page text, used only after redaction. */
  function textPreview(limit = 600) {
    let raw = document.body.innerText;
    if (!raw) {
      // Fallback for engines without innerText: skip script/style source.
      const clone = document.body.cloneNode(true);
      clone.querySelectorAll("script, style, noscript").forEach(n => n.remove());
      raw = clone.textContent || "";
    }
    return raw.replace(/\s+/g, " ").trim().slice(0, limit);
  }

  return { extract, textPreview };
})();
