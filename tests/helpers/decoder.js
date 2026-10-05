/**
 * Decode bridge: turn a symbol into a PNG and read it back with OpenCV.
 *
 * This is the independent check on the encoder. A symbol that only our own
 * code can read is not proof; a symbol a separate decoder can read is.
 */

import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { encode } from '../../src/js/qr/encoder.js';

const run = promisify(execFile);

const TESTS_ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
const ARTIFACTS_DIR = resolve(TESTS_ROOT, 'artifacts');
const UV_TIMEOUT_MS = 120000;

/**
 * Encode a payload and describe the symbol as rows, quiet zone included.
 * @param {string} payload
 * @param {'L'|'M'|'Q'|'H'} level
 * @returns {{payload: string, level: string, version: number, mode: string,
 *            maskIndex: number, rows: string[]}}
 */
export function dumpSymbol(payload, level) {
  const symbol = encode(payload, { level });
  const rows = [];

  for (let row = -4; row < symbol.size + 4; row += 1) {
    let line = '';
    for (let col = -4; col < symbol.size + 4; col += 1) {
      const inside = row >= 0 && row < symbol.size && col >= 0 && col < symbol.size;
      line += inside && symbol.matrix.isDark(row, col) ? '#' : '.';
    }
    rows.push(line);
  }

  return {
    payload,
    level,
    version: symbol.version,
    mode: symbol.mode,
    maskIndex: symbol.maskIndex,
    rows
  };
}

async function runDecoder(script, args) {
  const { stdout } = await run('uv', ['run', '--project', 'tools/decoder', 'python', script, ...args], {
    cwd: TESTS_ROOT,
    timeout: UV_TIMEOUT_MS
  });
  return JSON.parse(stdout.trim());
}

/**
 * Render a dump to PNG and decode it with OpenCV.
 * @param {object} dump Result of `dumpSymbol`.
 * @param {string} name Unique artifact name, without an extension.
 * @returns {Promise<{ok: boolean, text: string|null, error?: string}>}
 */
export async function decodeDump(dump, name) {
  await mkdir(ARTIFACTS_DIR, { recursive: true });

  const dumpPath = resolve(ARTIFACTS_DIR, `${name}.json`);
  const imagePath = resolve(ARTIFACTS_DIR, `${name}.png`);
  await writeFile(dumpPath, JSON.stringify(dump));

  const rendered = await runDecoder('tools/decoder/matrix_to_png.py', [dumpPath, imagePath, '8']);
  if (!rendered.ok) {
    throw new Error(`Could not render ${name}: ${rendered.error}`);
  }

  return runDecoder('tools/decoder/decode_png.py', [imagePath]);
}

/**
 * Decode a PNG that came out of a browser, given as base64 data.
 * @param {string} base64 Image bytes without the `data:` prefix.
 * @param {string} name Unique artifact name, without an extension.
 * @returns {Promise<{ok: boolean, text: string|null, error?: string}>}
 */
export async function decodePngBase64(base64, name) {
  await mkdir(ARTIFACTS_DIR, { recursive: true });
  const imagePath = resolve(ARTIFACTS_DIR, `${name}.png`);
  await writeFile(imagePath, Buffer.from(base64, 'base64'));
  return runDecoder('tools/decoder/decode_png.py', [imagePath]);
}
