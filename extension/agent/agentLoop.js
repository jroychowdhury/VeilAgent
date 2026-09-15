/* The autonomous loop: SEE -> DETECT -> REDACT -> ACCESS CHECK -> SEND -> REASON -> ACT -> REPEAT */

window.VeilAgentLoop = (() => {
  const MAX_STEPS = 6;

  function sendToTab(tabId, message) {
    return new Promise(resolve => {
      chrome.tabs.sendMessage(tabId, message, reply => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, message: chrome.runtime.lastError.message });
        } else {
          resolve(reply || { ok: false, message: "No reply from the page" });
        }
      });
    });
  }

  function captureScreenshot() {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ type: "VEIL_CAPTURE" }, reply => resolve(reply || { ok: false }));
    });
  }

  const wait = ms => new Promise(r => setTimeout(r, ms));

  /**
   * @param {object} options
   *   tabId, task, onStage(stage, detail), onContext(context), onScreenshot(result)
   */
  async function run({ tabId, task, onStage, onContext, onScreenshot }) {
    for (let step = 1; step <= MAX_STEPS; step += 1) {
      onStage("see", `Step ${step}: reading the page`);

      const scan = await sendToTab(tabId, { type: "VEIL_SCAN" });
      if (!scan.ok) {
        onStage("error", scan.message + " - open the SecureBank page and reload it.");
        return;
      }
      const context = scan.context;
      const local = context._local;
      delete context._local;

      onStage("detect", `${local.summary.total} sensitive values found on device`);
      onStage("redact", local.policy.reason);
      onContext({ context, local });

      // Screenshot: captured, blacked out and kept local.
      const shot = await captureScreenshot();
      if (shot.ok) {
        try {
          const vision = await window.VeilVision.redactScreenshot(shot.dataUrl, local.boxes, local.viewport);
          onScreenshot(vision);
          context.vision_confidence = vision.confidence;
        } catch (error) {
          onScreenshot({ safe: false, reason: String(error) });
        }
      }

      if (!local.policy.allowed) {
        onStage("blocked", "Fail-closed: nothing was transmitted for this page");
        return;
      }

      onStage("access", "Checking client authorization");
      const response = await window.VeilAccess.post("/agent/reason", { task, context });

      if (!response.ok) {
        onStage("blocked", `Request refused (${response.status}): ${response.body.detail || "no detail"}`);
        return;
      }

      const decision = response.body.decision;
      onStage("reason", `${window.VeilActions.describe(decision)} - ${decision.reason}`);

      const verdict = window.VeilActions.validate(decision, context);
      if (!verdict.valid) {
        onStage("blocked", "Validator stopped the action: " + verdict.reason);
        await window.VeilAccess.post("/agent/result", {
          task, action: decision.action, result: "BLOCKED BY VALIDATOR: " + verdict.reason
        });
        return;
      }

      if (decision.done || decision.action === "done" || decision.action === "answer") {
        onStage("done", decision.message || decision.reason);
        await window.VeilAccess.post("/agent/result", { task, action: decision.action, result: "Completed" });
        return;
      }

      const result = await sendToTab(tabId, { type: "VEIL_EXECUTE", action: decision });
      onStage("act", result.message);
      await window.VeilAccess.post("/agent/result", { task, action: decision.action, result: result.message });

      await wait(1200); // let the page settle, then SEE again
    }
    onStage("done", `Stopped after ${MAX_STEPS} steps.`);
  }

  return { run, MAX_STEPS };
})();
