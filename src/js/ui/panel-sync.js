/**
 * Style panel visibility.
 *
 * Controls that cannot apply in the current mode are hidden rather than
 * disabled, so the panel only shows what the user can actually use.
 */

const SCALED_SHAPES = new Set(['dots', 'v_bars', 'h_bars']);

/** Keeps style controls in step with the style branch of the state tree. */
export class PanelSync {
  /**
   * @param {Record<string, HTMLElement>} elements From dom-refs.
   */
  constructor(elements) {
    this.elements = elements;
  }

  /**
   * @param {object} state Full state tree.
   */
  sync(state) {
    const style = state.style;

    this.elements.dotScaleField.hidden = !SCALED_SHAPES.has(style.module_shape);
    this.elements.dotScaleInput.value = String(style.dot_scale);
    this.elements.dotScaleValue.textContent = style.dot_scale.toFixed(2);

    this.elements.colorEyeField.hidden = style.inherit_fg;
    this.elements.colorFgInput.value = style.color_fg;
    this.elements.colorBgInput.value = style.color_bg;
    this.elements.colorEyeInput.value = style.color_eye;
    this.elements.inheritFgInput.checked = style.inherit_fg;

    this.#syncOverlay(style);
  }

  #syncOverlay(style) {
    const overlay = style.overlay;
    const hasOverlay = overlay.kind !== 'none';

    this.elements.overlayKindSelect.value = overlay.kind;
    this.elements.overlayEmojiField.hidden = overlay.kind !== 'emoji';
    this.elements.overlayImageField.hidden = overlay.kind !== 'image';
    this.elements.overlaySharedField.hidden = !hasOverlay;
    this.elements.overlayTextColorField.hidden = overlay.kind !== 'emoji';

    this.elements.overlayBackingColorInput.value = overlay.color_bg;
    this.elements.overlayTextColorInput.value = overlay.color_fg;
    this.elements.overlayTransparentInput.checked = overlay.transparent_bg;
    this.elements.overlaySizeInput.value = String(overlay.size_ratio);
    this.elements.overlaySizeValue.textContent = `${Math.round(overlay.size_ratio * 100)}%`;
  }
}
