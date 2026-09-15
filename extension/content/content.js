/* Message router for the content script.
 *
 * The side panel asks for a scan; everything sensitive is detected, redacted and
 * counted here, inside the page's isolated world, before a reply is sent back.
 */

(() => {
  function buildSanitizedContext() {
    const detections = window.VeilDetect.scanDocument();
    const registry = window.VeilDom.extract();
    const policy = window.VeilRedact.policy(detections);

    const elements = registry.map(el => ({
      index: el.index,
      kind: el.kind,
      tag: el.tag,
      type: el.type,
      label: window.VeilRedact.redactLabel(el.label, detections),
      name: el.name,
      placeholder: el.placeholder ? window.VeilRedact.redactLabel(el.placeholder, detections) : null,
      aria_label: el.aria_label,
      id: el.id,
      has_value: el.has_value
    }));

    const rawPreview = window.VeilDom.textPreview();

    return {
      url: location.pathname,
      page_title: document.title,
      elements: policy.allowed ? elements : [],
      text_preview: policy.allowed ? window.VeilRedact.redactText(rawPreview, detections) : "",
      redactions: detections.length,
      screenshot_transmitted: false,
      vision_confidence: policy.confidence,
      _local: {
        pairs: window.VeilRedact.pairs(detections),
        summary: window.VeilDetect.summarise(detections),
        boxes: detections.map(d => ({ type: d.type, rect: d.rect })).filter(b => b.rect),
        policy,
        beforePreview: rawPreview.slice(0, 300),
        afterPreview: window.VeilRedact.redactText(rawPreview, detections).slice(0, 300),
        elementCount: registry.length,
        viewport: { width: window.innerWidth, height: window.innerHeight }
      }
    };
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      if (message.type === "VEIL_SCAN") {
        sendResponse({ ok: true, context: buildSanitizedContext() });
        return true;
      }
      if (message.type === "VEIL_EXECUTE") {
        sendResponse(window.VeilExec.run(message.action));
        return true;
      }
      if (message.type === "VEIL_PING") {
        sendResponse({ ok: true, url: location.href });
        return true;
      }
    } catch (error) {
      sendResponse({ ok: false, message: String(error) });
    }
    return true;
  });
})();
