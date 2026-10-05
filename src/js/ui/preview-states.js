/**
 * Preview state surface: canvas, empty placeholder, error message, and the
 * spoken status for screen readers.
 */

const STATUS_TEXT = {
  empty: 'No QR code yet. Fill in the required fields.',
  invalid: 'The QR code is not updated. Fix the highlighted fields.'
};

/** Shows the preview in the state that matches the last render result. */
export class PreviewStates {
  /**
   * @param {Record<string, HTMLElement>} elements From dom-refs.
   */
  constructor(elements) {
    this.elements = elements;
  }

  /**
   * @param {object} result Result object from the render pipeline.
   */
  apply(result) {
    const { canvasContainer, emptyState, errorState, errorText, symbolInfo, previewStatus } = this.elements;

    const showCanvas = result.status === 'ready' || result.status === 'invalid';
    canvasContainer.hidden = !showCanvas;
    emptyState.hidden = result.status !== 'empty';
    errorState.hidden = result.status !== 'error';
    canvasContainer.classList.toggle('is-dimmed', result.status === 'invalid');

    if (result.status === 'error') {
      errorText.textContent = result.message ?? 'The QR code could not be built.';
    }

    symbolInfo.textContent = result.status === 'ready' ? describeSymbol(result.symbol) : '';

    // Short status text only. The payload itself is never announced.
    previewStatus.textContent = statusLabel(result);
  }
}

function describeSymbol(symbol) {
  if (!symbol) return '';
  return `Version ${symbol.version} · Error level ${symbol.level} · Mask ${symbol.maskIndex}`;
}

function statusLabel(result) {
  if (result.status === 'ready') {
    return `QR code ready. ${describeSymbol(result.symbol)}.`;
  }
  if (result.status === 'error') {
    return result.message ?? 'The QR code could not be built.';
  }
  return STATUS_TEXT[result.status] ?? STATUS_TEXT.invalid;
}
