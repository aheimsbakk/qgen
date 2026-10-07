/**
 * State rules: allowed value sets, numeric limits, and the checks every state
 * write must pass. Kept apart from the store so the store stays a container.
 */

/** Raised when a command is rejected. Callers show the message to the user. */
export class ValidationError extends Error {
  /**
   * @param {string} message Plain-language reason, safe to show in the UI.
   */
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.code = 'invalid_state_write';
  }
}

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const MODULE_SHAPES = ['square', 'rounded', 'dots', 'v_bars', 'h_bars'];
export const OVERLAY_KINDS = ['none', 'emoji', 'image'];
export const MOBILE_VIEWS = ['settings', 'preview'];
export const PREVIEW_STATUSES = ['ready', 'empty', 'invalid', 'error'];

// Fills the Symbol field when the user switches to the emoji kind, so the
// preview shows a working example they can edit instead of an empty field.
export const OVERLAY_EMOJI_EXAMPLE = '\u{1F642}';

export const NUMBER_LIMITS = {
  dot_scale: { min: 0.1, max: 1.0 },
  'overlay.size_ratio': { min: 0.1, max: 0.35 },
  pixel_size: { min: 256, max: 2048, integer: true }
};

/** Colour paths in the style branch, including the nested overlay paths. */
export const COLOR_PATHS = [
  'color_fg',
  'color_bg',
  'color_eye',
  'overlay.color_fg',
  'overlay.color_bg'
];

/**
 * Reject a value outside an allowed set.
 * @param {*} value
 * @param {string[]} allowed
 * @param {string} label Human name of the setting.
 */
export function assertEnum(value, allowed, label) {
  if (!allowed.includes(value)) {
    throw new ValidationError(`${label} must be one of: ${allowed.join(', ')}`);
  }
}

/** Reject a non-boolean write to a switch. */
export function assertBoolean(value, label) {
  if (typeof value !== 'boolean') {
    throw new ValidationError(`${label} must be true or false`);
  }
}

/** Reject a colour that is not six-digit hex. */
export function assertColor(value, path) {
  if (typeof value !== 'string' || !HEX_COLOR.test(value)) {
    throw new ValidationError(`Colour for ${path} must be six-digit hex, for example #1A2B3C`);
  }
}

/**
 * Clamp a number into its limits, rounding when the setting is an integer.
 * @param {string} path Key in NUMBER_LIMITS.
 * @param {number|string} value
 * @returns {number}
 */
export function clampNumber(path, value) {
  const limits = NUMBER_LIMITS[path];
  const raw = Number(value);
  if (Number.isNaN(raw)) {
    throw new ValidationError(`${path} needs a number`);
  }
  const clamped = Math.min(limits.max, Math.max(limits.min, raw));
  return limits.integer ? Math.round(clamped) : Number(clamped.toFixed(2));
}
