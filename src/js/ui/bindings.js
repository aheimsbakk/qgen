/**
 * Control bindings: every input writes through a state store command.
 * No business rules live here; validation and clamping belong to the store.
 */

import { ValidationError } from '../core/state-store.js';

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Wires page controls to store commands and export actions. */
export class Bindings {
  /**
   * @param {{elements: Record<string, HTMLElement>, store: object,
   *          exportService: object, toasts: object}} deps
   */
  constructor({ elements, store, exportService, toasts }) {
    this.elements = elements;
    this.store = store;
    this.exportService = exportService;
    this.toasts = toasts;
    this.imageToken = 0;
  }

  /** Attach every control. Call once at start-up. */
  attach() {
    const e = this.elements;

    e.schemaSelect.addEventListener('change', () => {
      this.#run(() => this.store.setSchemaType(e.schemaSelect.value));
    });

    e.shapeSelect.addEventListener('change', () => {
      this.#run(() => this.store.setStyle('module_shape', e.shapeSelect.value));
    });

    e.dotScaleInput.addEventListener('input', () => {
      this.#run(() => this.store.setStyle('dot_scale', e.dotScaleInput.value));
    });

    e.colorFgInput.addEventListener('input', () => {
      this.#run(() => this.store.setStyle('color_fg', e.colorFgInput.value));
    });
    e.colorBgInput.addEventListener('input', () => {
      this.#run(() => this.store.setStyle('color_bg', e.colorBgInput.value));
    });
    e.colorEyeInput.addEventListener('input', () => {
      this.#run(() => this.store.setStyle('color_eye', e.colorEyeInput.value));
    });
    e.inheritFgInput.addEventListener('change', () => {
      this.#run(() => this.store.setStyle('inherit_fg', e.inheritFgInput.checked));
    });

    e.overlayKindSelect.addEventListener('change', () => {
      this.#run(() => {
        // The store drops overlay content on a kind change; release the decoded
        // image first so its memory is not left behind.
        const content = this.store.getState().style.overlay.content;
        if (content && typeof content.close === 'function') content.close();
        this.store.setStyle('overlay.kind', e.overlayKindSelect.value);
      });
    });
    e.overlayEmojiInput.addEventListener('input', () => {
      this.#run(() => this.store.setStyle('overlay.content', e.overlayEmojiInput.value));
    });
    e.overlayImageInput.addEventListener('change', () => {
      this.#handleImageUpload(e.overlayImageInput);
    });
    e.overlayBackingColorInput.addEventListener('input', () => {
      this.#run(() => this.store.setStyle('overlay.color_bg', e.overlayBackingColorInput.value));
    });
    e.overlayTextColorInput.addEventListener('input', () => {
      this.#run(() => this.store.setStyle('overlay.color_fg', e.overlayTextColorInput.value));
    });
    e.overlayTransparentInput.addEventListener('change', () => {
      this.#run(() => this.store.setStyle('overlay.transparent_bg', e.overlayTransparentInput.checked));
    });
    e.overlaySizeInput.addEventListener('input', () => {
      this.#run(() => this.store.setStyle('overlay.size_ratio', e.overlaySizeInput.value));
    });

    e.exportSizeInput.addEventListener('change', () => {
      this.#run(() => this.store.setExport('pixel_size', e.exportSizeInput.value));
    });

    e.saveButton.addEventListener('click', () => {
      this.exportService.save().then((outcome) => this.toasts.show(outcome));
    });
    e.copyButton.addEventListener('click', () => {
      this.exportService.copy().then((outcome) => this.toasts.show(outcome));
    });
  }

  /** Field inputs are rebuilt per content type, so they use one shared path. */
  handleFieldChange(key, value) {
    this.#run(() => this.store.setField(key, value));
  }

  /**
   * Read an uploaded overlay image and store it as a decoded bitmap.
   * Out-of-order loads are ignored so a slow first file cannot overwrite a
   * newer one.
   */
  async #handleImageUpload(input) {
    const file = input.files && input.files[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      this.toasts.show({
        ok: false,
        message: 'Use a PNG, JPEG, or WebP image for the overlay.'
      });
      input.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      this.toasts.show({ ok: false, message: 'The image is too large. Use a file under 5 MB.' });
      input.value = '';
      return;
    }

    const token = ++this.imageToken;
    try {
      const bitmap = await createImageBitmap(file);
      if (token !== this.imageToken) {
        bitmap.close();
        return;
      }
      this.store.setStyle('overlay.content', bitmap);
    } catch (error) {
      this.toasts.show({
        ok: false,
        message: `Could not read that image: ${error.message}. Try a PNG, JPEG, or WebP file.`
      });
    } finally {
      input.value = '';
    }
  }

  /** Run a store command and report a rejection instead of throwing. */
  #run(command) {
    try {
      command();
    } catch (error) {
      const message = error instanceof ValidationError
        ? error.message
        : `That change was not applied: ${error.message}`;
      this.toasts.show({ ok: false, message });
    }
  }
}
