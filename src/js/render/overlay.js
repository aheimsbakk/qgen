/**
 * Overlay compositor: backing plate, emoji text, or uploaded image at the
 * centre of the symbol.
 */

import { roundedRectanglePath } from './painter.js';

const EMOJI_FONT_STACK = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
const BACKING_PADDING_RATIO = 0.1;
const BACKING_CORNER_RATIO = 0.2;
const TEXT_SIZE_RATIO = 0.8;

/** Draw the light plate that keeps the overlay off the data modules. */
function drawBackingPlate(context, centre, overlaySize, colour) {
  const padding = overlaySize * BACKING_PADDING_RATIO;
  const side = overlaySize + padding * 2;
  context.fillStyle = colour;
  roundedRectanglePath(
    context,
    centre - side / 2,
    centre - side / 2,
    side,
    side,
    overlaySize * BACKING_CORNER_RATIO
  );
  context.fill();
}

function drawTextOverlay(context, content, centre, overlaySize, colour) {
  context.font = `${overlaySize * TEXT_SIZE_RATIO}px ${EMOJI_FONT_STACK}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = colour;
  // Optical adjustment: glyphs sit slightly above the mathematical centre.
  context.fillText(content, centre, centre + overlaySize * 0.05);
}

function drawImageOverlay(context, image, centre, overlaySize) {
  const aspect = image.width / image.height;
  let width = overlaySize;
  let height = overlaySize;
  if (aspect > 1) height = overlaySize / aspect;
  else width = overlaySize * aspect;
  context.drawImage(image, centre - width / 2, centre - height / 2, width, height);
}

/**
 * Composite the overlay onto an already painted symbol.
 * @param {CanvasRenderingContext2D} context
 * @param {object} style Style branch of the state tree.
 * @param {number} pixelSize Output side length in pixels.
 */
export function composeOverlay(context, style, pixelSize) {
  const overlay = style.overlay;
  if (overlay.kind === 'none' || !overlay.content) return;

  const centre = pixelSize / 2;
  const overlaySize = pixelSize * overlay.size_ratio;

  if (!overlay.transparent_bg) {
    drawBackingPlate(context, centre, overlaySize, overlay.color_bg);
  }

  if (overlay.kind === 'emoji') {
    drawTextOverlay(context, String(overlay.content), centre, overlaySize, overlay.color_fg);
    return;
  }

  if (overlay.kind === 'image') {
    drawImageOverlay(context, overlay.content, centre, overlaySize);
  }
}
