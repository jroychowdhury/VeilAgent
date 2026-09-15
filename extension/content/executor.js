/* ACT - carry out a validated action on the page. */

window.VeilExec = (() => {
  function elementAt(index) {
    const registry = window.__veilRegistry || [];
    const entry = registry[index];
    return entry ? entry._el : null;
  }

  function highlight(el) {
    const previous = el.style.outline;
    el.style.outline = "3px solid #7c5cff";
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    setTimeout(() => { el.style.outline = previous; }, 1200);
  }

  function click(index) {
    const el = elementAt(index);
    if (!el) return { ok: false, message: "Element " + index + " is no longer on the page" };
    highlight(el);
    setTimeout(() => el.click(), 350);
    return { ok: true, message: "Clicked " + (el.textContent || el.value || el.tagName).trim().slice(0, 40) };
  }

  function fill(index, value) {
    const el = elementAt(index);
    if (!el) return { ok: false, message: "Field " + index + " is no longer on the page" };
    highlight(el);
    el.focus();
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return { ok: true, message: "Filled a field with a value supplied by the task" };
  }

  function scroll(amount) {
    window.scrollBy({ top: amount || 400, behavior: "smooth" });
    return { ok: true, message: "Scrolled the page" };
  }

  function navigate(url) {
    location.href = url;
    return { ok: true, message: "Navigating to " + url };
  }

  function run(action) {
    switch (action.action) {
      case "click": return click(action.target_index);
      case "fill": return fill(action.target_index, action.value);
      case "scroll": return scroll(action.value);
      case "navigate": return navigate(action.value);
      case "answer":
      case "done": return { ok: true, message: action.message || "Task finished" };
      default: return { ok: false, message: "Unsupported action: " + action.action };
    }
  }

  return { run };
})();
