/**
 * Export service: re-encode the last valid payload at the requested size and
 * hand the PNG to a file download or the system clipboard.
 *
 * Export never re-reads the form. It uses the payload the pipeline last
 * confirmed, so an invalid edit in the form cannot change what is exported.
 */

const CLIPBOARD_TIMEOUT_MS = 5000;
const NO_PAYLOAD_MESSAGE = 'Fill in the fields first. There is no valid QR code to export yet.';

/**
 * Convert a canvas to a PNG blob.
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<Blob>}
 */
function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error('The browser could not produce a PNG from the drawing.'));
    }, 'image/png');
  });
}

/** Reject after a fixed delay so a stuck clipboard promise cannot hang export. */
function withTimeout(promise, message) {
  return Promise.race([
    promise,
    new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error(message)), CLIPBOARD_TIMEOUT_MS);
    })
  ]);
}

/** File and clipboard export for the QR image. */
export class ExportService {
  /**
   * @param {{store: object, pipeline: object, renderToCanvas: Function}} deps
   *   `renderToCanvas(symbol, style, pixelSize)` returns a canvas of that size.
   */
  constructor({ store, pipeline, renderToCanvas }) {
    this.store = store;
    this.pipeline = pipeline;
    this.renderToCanvas = renderToCanvas;
  }

  /**
   * Encode the last valid payload at the export size and paint it.
   * @returns {{canvas: HTMLCanvasElement, fileName: string}}
   */
  #buildImage() {
    const state = this.store.getState();
    if (!state.export.last_valid_payload) {
      throw new Error(NO_PAYLOAD_MESSAGE);
    }

    let paintedCanvas = null;
    const paint = (symbol, style, pixelSize) => {
      paintedCanvas = this.renderToCanvas(symbol, style, pixelSize);
    };

    let symbol;
    try {
      symbol = this.pipeline.buildExport(state.export.pixel_size, paint);
    } catch (error) {
      throw new Error(`Export failed: ${error.message}`);
    }

    if (!symbol || !paintedCanvas) {
      throw new Error(NO_PAYLOAD_MESSAGE);
    }

    return { canvas: paintedCanvas, fileName: `${state.schema_type}-qr.png` };
  }

  /**
   * Save the current export as a PNG file.
   * @returns {{ok: boolean, message: string}}
   */
  async save() {
    try {
      const { canvas, fileName } = this.#buildImage();
      const blob = await canvasToPngBlob(canvas);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Revoke on a delay so the download has taken the blob.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return { ok: true, message: `Saved as ${fileName}` };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  }

  /**
   * Copy the current export to the system clipboard as an image.
   * @returns {{ok: boolean, message: string}}
   */
  async copy() {
    try {
      const { canvas } = this.#buildImage();

      if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
        return {
          ok: false,
          message: 'This browser does not allow copying images to the clipboard. Use Save PNG instead.'
        };
      }

      const blob = await canvasToPngBlob(canvas);
      await withTimeout(
        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]),
        'The clipboard did not respond in time. Use Save PNG instead.'
      );
      return { ok: true, message: 'QR image copied to the clipboard' };
    } catch (error) {
      // Strip a trailing period so the fallback sentence reads as one line.
      const reason = error.message.replace(/\.$/, '');
      return { ok: false, message: `Copy failed: ${reason}. Use Save PNG instead.` };
    }
  }
}
