/**
 * Module painter and colour mapper.
 *
 * Shapes are drawn per module on whole-pixel boundaries. Finder patterns are
 * drawn as whole 7x7 blocks so no shape can break them apart and leave the
 * symbol unscannable.
 */

import { layoutFor } from './surface.js';

const SCALED_SHAPES = new Set(['dots', 'v_bars', 'h_bars']);

const DATA_CORNER_RADIUS = 0.4;
const FINDER_CORNER_RADIUS = 0.3;

/**
 * True when the module belongs to one of the three finder patterns.
 * @param {number} row
 * @param {number} col
 * @param {number} size Symbol side in modules.
 * @returns {boolean}
 */
export function isFinderModule(row, col, size) {
  const inTopBand = row < 7;
  const inBottomBand = row >= size - 7;
  const inLeftBand = col < 7;
  const inRightBand = col >= size - 7;
  return (inTopBand && (inLeftBand || inRightBand)) || (inBottomBand && inLeftBand);
}

/**
 * Rounded rectangle path. Written by hand because Firefox and WebKit differ in
 * how they treat the built-in rounded rectangle method.
 * @param {CanvasRenderingContext2D} context
 */
export function roundedRectanglePath(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function drawModule(context, shape, scale, x, y, width, height, isFinder) {
  if (isFinder) {
    if (shape === 'rounded') {
      roundedRectanglePath(context, x, y, width, height, width * FINDER_CORNER_RADIUS);
      context.fill();
      return;
    }
    if (shape === 'dots') {
      context.beginPath();
      context.arc(x + width / 2, y + height / 2, width / 2, 0, Math.PI * 2);
      context.fill();
      return;
    }
    context.fillRect(x, y, width, height);
    return;
  }

  switch (shape) {
    case 'rounded':
      roundedRectanglePath(context, x, y, width, height, width * DATA_CORNER_RADIUS);
      context.fill();
      break;
    case 'dots': {
      const radius = (width / 2) * scale;
      context.beginPath();
      context.arc(x + width / 2, y + height / 2, radius, 0, Math.PI * 2);
      context.fill();
      break;
    }
    case 'v_bars': {
      const barWidth = Math.max(1, Math.round(width * scale));
      context.fillRect(x + Math.round((width - barWidth) / 2), y, barWidth, height);
      break;
    }
    case 'h_bars': {
      const barHeight = Math.max(1, Math.round(height * scale));
      context.fillRect(x, y + Math.round((height - barHeight) / 2), width, barHeight);
      break;
    }
    default:
      context.fillRect(x, y, width, height);
  }
}

/**
 * Paint a finished symbol onto a canvas context.
 * @param {CanvasRenderingContext2D} context
 * @param {{size: number, matrix: import('../qr/matrix.js').SymbolMatrix}} symbol
 * @param {object} style Style branch of the state tree.
 * @param {number} pixelSize Output side length in pixels.
 */
export function paintSymbol(context, symbol, style, pixelSize) {
  const layout = layoutFor(symbol.size, pixelSize);
  const scale = SCALED_SHAPES.has(style.module_shape) ? style.dot_scale : 1;

  context.fillStyle = style.color_bg;
  context.fillRect(0, 0, pixelSize, pixelSize);

  const eyeColour = style.inherit_fg ? style.color_fg : style.color_eye;

  for (let row = 0; row < symbol.size; row += 1) {
    for (let col = 0; col < symbol.size; col += 1) {
      if (!symbol.matrix.isDark(row, col)) continue;
      const isFinder = isFinderModule(row, col, symbol.size);
      context.fillStyle = isFinder ? eyeColour : style.color_fg;
      drawModule(
        context,
        style.module_shape,
        scale,
        layout.edge(col),
        layout.edge(row),
        layout.span(col),
        layout.span(row),
        isFinder
      );
    }
  }
}
