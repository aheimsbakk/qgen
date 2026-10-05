import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC_ROOT = new URL('../../src/', import.meta.url).pathname;

/** Every file the shipped application loads. */
function sourceFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...sourceFiles(path));
    } else if (entry.isFile()) {
      found.push(path);
    }
  }
  return found;
}

/**
 * Patterns that would make the app depend on something outside `src/`.
 * Plain links in text, such as the About link, are allowed: they only load
 * when the user follows them.
 */
const FORBIDDEN = [
  { label: 'network request API', pattern: /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(/ },
  { label: 'background or worker API', pattern: /\b(importScripts|new Worker|serviceWorker)\b/ },
  { label: 'dynamic import of a non-relative module', pattern: /\bimport\(\s*['"](?![./])/ },
  { label: 'external resource reference', pattern: /<(script|link|img|iframe)\b[^>]*(src|href)\s*=\s*["']https?:/i },
  { label: 'assigned external source', pattern: /\.src\s*=\s*["']https?:/ },
  { label: 'stylesheet import or external url()', pattern: /@import|url\(\s*["']?https?:/i }
];

test('src/ loads no code or asset from outside the project', () => {
  const files = sourceFiles(SRC_ROOT);
  assert.ok(files.length > 0, 'no application files found');

  const violations = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const { label, pattern } of FORBIDDEN) {
      const match = text.match(pattern);
      if (match) {
        violations.push(`${file.replace(SRC_ROOT, 'src/')}: ${label} -> ${match[0]}`);
      }
    }
  }

  assert.deepEqual(violations, []);
});

test('src/ declares no package manifest or build output', () => {
  const offenders = sourceFiles(SRC_ROOT).filter((file) => {
    return /(^|\/)(node_modules|dist|build|package\.json|package-lock\.json)\//.test(file)
      || /(package\.json|package-lock\.json)$/.test(file);
  });

  assert.deepEqual(offenders, []);
});
