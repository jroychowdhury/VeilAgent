/* Action validator - the safety boundary between the model and the browser.
 *
 * An action is executed only if it is on the allowlist, points at an element that
 * actually exists, and is not an irreversible money movement.
 */

window.VeilActions = (() => {
  const ALLOWED = ["click", "fill", "scroll", "navigate", "answer", "done"];

  // Controls the agent must never press on its own.
  const REQUIRES_HUMAN = /\b(confirm|authorise|authorize|pay now|send money now|delete|close account|otp)\b/i;

  function validate(action, context) {
    if (!action || typeof action !== "object") {
      return { valid: false, reason: "Reasoning layer returned no action" };
    }
    if (!ALLOWED.includes(action.action)) {
      return { valid: false, reason: `Action "${action.action}" is not on the allowlist` };
    }
    if (action.action === "navigate") {
      const url = String(action.value || "");
      if (!/^https?:\/\/(localhost|127\.0\.0\.1):8000\//.test(url)) {
        return { valid: false, reason: "Navigation outside the demo origin is blocked" };
      }
    }
    if (action.action === "click" || action.action === "fill") {
      const element = (context.elements || []).find(e => e.index === action.target_index);
      if (!element) {
        return { valid: false, reason: `No element at index ${action.target_index}` };
      }
      if (REQUIRES_HUMAN.test(element.label || "")) {
        return {
          valid: false,
          reason: `"${element.label}" moves money or is irreversible, so it needs a human`
        };
      }
      if (action.action === "fill" && (action.value === undefined || action.value === null)) {
        return { valid: false, reason: "Fill action arrived without a value" };
      }
    }
    return { valid: true, reason: "Action passed validation" };
  }

  function describe(action) {
    switch (action.action) {
      case "click": return `Click "${action.target}"`;
      case "fill": return `Type into "${action.target}"`;
      case "scroll": return "Scroll the page";
      case "navigate": return `Go to ${action.value}`;
      case "answer": return "Answer without touching the page";
      default: return "Finish";
    }
  }

  return { validate, describe, ALLOWED };
})();
