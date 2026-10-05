/**
 * Surface adapter: canvas creation, sizing, and the quiet zone layout.
 *
 * Preview uses a fixed resolution so typing stays responsive. Export uses the
 * pixel size the user asked for.
 */

import { QUIET_ZONE_MODULES } from '../qr/tables.js';

/** Fixed preview resolution in pixels. */
export const PREVIEW_PIXEL_SIZE = 512;

/**
 * Build the geometry that maps modules to pixels, quiet zone included.
 *
 * Module edges are rounded to whole pixels. Fractional edges make Firefox
 * anti-alias every module border, and a blurred code fails to scan.
 * @param {number} moduleCount Modules on one side of the symbol.
 * @param {number} pixelSize Output side length.
 * @returns {{cellSize: number, quietZone: number, edge: (module: number) => number,
 *            span: (module: number) => number}}
 */
export function layoutFor(moduleCount, pixelSize) {
  const totalModules = moduleCount + QUIET_ZONE_MODULES * 2;
  const step = pixelSize / totalModules;
  const edges = Array.from({ length: totalModules + 1 }, (_, index) => Math.round(index * step));

  const offset = (module) => edges[module + QUIET_ZONE_MODULES];

  return {
    cellSize: step,
    quietZone: QUIET_ZONE_MODULES,
    edge: offset,
    span: (module) => offset(module + 1) - offset(module)
  };
}

/**
 * Resize a canvas and return its 2D context.
 * @param {HTMLCanvasElement} canvas
 * @param {number} pixelSize
 * @returns {CanvasRenderingContext2D}
 */
export function prepareCanvas(canvas, pixelSize) {
  canvas.width = pixelSize;
  canvas.height = pixelSize;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('This browser cannot draw on a canvas. Export needs canvas support.');
  }
  return context;
}

/**
 * Create an offscreen canvas for export output.
 * @param {number} pixelSize
 * @returns {{canvas: HTMLCanvasElement, context: CanvasRenderingContext2D}}
 */
export function createOffscreenSurface(pixelSize) {
  const canvas = document.createElement('canvas');
  const context = prepareCanvas(canvas, pixelSize);
  return { canvas, context };
}
