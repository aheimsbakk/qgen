/**
 * Element lookup registry. One place knows every id the interface touches, so
 * a renamed element fails fast at start-up instead of mid-interaction.
 */

const ELEMENT_IDS = {
  schemaSelect: 'schemaTypeSelect',
  formContainer: 'dynamicFormContainer',
  payloadMeter: 'payloadMeter',

  shapeSelect: 'moduleShapeSelect',
  dotScaleField: 'dotScaleField',
  dotScaleInput: 'dotScaleInput',
  dotScaleValue: 'dotScaleValue',

  colorFgInput: 'colorFgInput',
  colorBgInput: 'colorBgInput',
  colorEyeInput: 'colorEyeInput',
  colorEyeField: 'colorEyeField',
  inheritFgInput: 'inheritFgInput',

  overlayKindSelect: 'overlayKindSelect',
  overlayEmojiField: 'overlayEmojiField',
  overlayEmojiInput: 'overlayEmojiInput',
  overlayImageField: 'overlayImageField',
  overlayImageInput: 'overlayImageInput',
  overlaySharedField: 'overlaySharedField',
  overlayBackingColorInput: 'overlayBackingColorInput',
  overlayTextColorField: 'overlayTextColorField',
  overlayTextColorInput: 'overlayTextColorInput',
  overlayTransparentInput: 'overlayTransparentInput',
  overlaySizeInput: 'overlaySizeInput',
  overlaySizeValue: 'overlaySizeValue',

  canvasContainer: 'canvasContainer',
  qrCanvas: 'qrCanvas',
  emptyState: 'qrEmptyState',
  errorState: 'qrErrorState',
  errorText: 'qrErrorText',
  symbolInfo: 'symbolInfo',
  previewStatus: 'previewStatus',

  toastRegion: 'toastRegion',

  exportSizeInput: 'exportSizeInput',
  saveButton: 'saveButton',
  copyButton: 'copyButton',

  menuButton: 'menuButton',
  menuDropdown: 'menuDropdown',
  aboutMenuItem: 'aboutMenuItem',

  aboutDialog: 'aboutDialog',
  aboutDialogPanel: 'aboutDialogPanel',
  aboutBackdrop: 'aboutBackdrop',
  aboutCloseButton: 'aboutCloseButton',

  tabSettingsButton: 'tabSettingsButton',
  tabPreviewButton: 'tabPreviewButton',
  mainLayout: 'mainLayout'
};

/**
 * Resolve every registered id once.
 * @returns {Record<string, HTMLElement>}
 * @throws {Error} When an element is missing, naming the id that is absent.
 */
export function collectElements() {
  const elements = {};
  for (const [name, id] of Object.entries(ELEMENT_IDS)) {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Page is missing the element "${id}". Reload the page.`);
    }
    elements[name] = element;
  }
  return elements;
}

export { ELEMENT_IDS };
