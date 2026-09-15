/* REDACT - replace detected values with block characters before anything leaves the device.
 *
 * Fail-closed rule (from the proposal): if detection confidence for a page drops
 * below the threshold, the page's visual/text payload is not transmitted at all.
 */

window.VeilRedact = (() => {
  const CONFIDENCE_THRESHOLD = 0.80;
  const BLOCK = "\u2588";

  function mask(value) {
    const len = Math.min(String(value).replace(/\s/g, "").length, 20);
    return BLOCK.repeat(Math.max(len, 4));
  }

  /** Replace every detected value found inside `text`. */
  function redactText(text, detections) {
    let out = text || "";
    const values = [...new Set(detections.map(d => d.value))]
      .sort((a, b) => b.length - a.length); // longest first, avoids partial overlaps
    values.forEach(value => {
      if (!value) return;
      const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      out = out.replace(new RegExp(escaped, "g"), mask(value));
    });
    return out;
  }

  /** Redact a short label used to describe a control to the reasoning layer. */
  function redactLabel(label, detections) {
    const inline = window.VeilDetect.scanText(label);
    return redactText(redactText(label, detections), inline);
  }

  /**
   * Build the before/after pairs the privacy panel shows. Stays local.
   */
  function pairs(detections) {
    return detections.map(d => ({
      type: d.type,
      before: d.value,
      after: mask(d.value),
      confidence: d.confidence,
      source: d.source
    }));
  }

  /**
   * Decide whether this page's context may be transmitted.
   * Returns {allowed, confidence, reason}.
   */
  function policy(detections) {
    if (detections.length === 0) {
      return { allowed: true, confidence: 1, reason: "No sensitive values found on this page" };
    }
    const lowest = detections.reduce((m, d) => Math.min(m, d.confidence), 1);
    if (lowest < CONFIDENCE_THRESHOLD) {
      return {
        allowed: false,
        confidence: lowest,
        reason: `Detection confidence ${lowest.toFixed(2)} is below the ${CONFIDENCE_THRESHOLD} threshold, so nothing was transmitted`
      };
    }
    return {
      allowed: true,
      confidence: lowest,
      reason: `All ${detections.length} detections cleared the ${CONFIDENCE_THRESHOLD} confidence threshold`
    };
  }

  return { redactText, redactLabel, pairs, policy, mask, CONFIDENCE_THRESHOLD, BLOCK };
})();
