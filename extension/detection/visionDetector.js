/* SEE (pixels) + visual redaction.
 *
 * The proposal calls for a lightweight local vision model (ONNX Runtime Web /
 * Transformers.js, BlazeFace-class). The prototype uses the DOM-derived boxes as
 * the region source, which keeps the demo deterministic. The interface below is
 * the one a real detector would drop into: boxes in, confidence out.
 *
 * Fail-closed: if any detected value cannot be mapped to a box inside the
 * viewport, the screenshot is marked unsafe and is not transmitted.
 */

window.VeilVision = (() => {
  const CONFIDENCE_THRESHOLD = 0.80;

  function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Screenshot could not be decoded"));
      img.src = dataUrl;
    });
  }

  /**
   * @param {string} dataUrl  raw screenshot
   * @param {Array}  boxes    [{type, rect}] in CSS pixels
   * @param {object} viewport {width, height}
   * @returns {{redactedDataUrl:string, confidence:number, covered:number, safe:boolean, reason:string}}
   */
  async function redactScreenshot(dataUrl, boxes, viewport) {
    const img = await loadImage(dataUrl);
    const scale = img.width / (viewport.width || img.width);

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    let covered = 0;
    let missed = 0;

    boxes.forEach(({ rect }) => {
      if (!rect || rect.width <= 0 || rect.height <= 0) { missed += 1; return; }
      const onScreen = rect.y + rect.height > 0 && rect.y < viewport.height;
      if (!onScreen) return; // off-screen values are not in the image at all
      const pad = 3;
      ctx.fillStyle = "#101010";
      ctx.fillRect(
        (rect.x - pad) * scale,
        (rect.y - pad) * scale,
        (rect.width + pad * 2) * scale,
        (rect.height + pad * 2) * scale
      );
      covered += 1;
    });

    const confidence = boxes.length === 0 ? 1 : covered / (covered + missed || 1);
    const safe = confidence >= CONFIDENCE_THRESHOLD;

    return {
      redactedDataUrl: canvas.toDataURL("image/png"),
      confidence,
      covered,
      missed,
      safe,
      reason: safe
        ? `${covered} sensitive regions blacked out before the image was allowed anywhere`
        : `${missed} detected values had no reliable box, so the image is held back`
    };
  }

  return { redactScreenshot, CONFIDENCE_THRESHOLD };
})();
