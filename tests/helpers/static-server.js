/**
 * Static file server for the end-to-end suite.
 *
 * Serves the real `src/` directory over http so the page loads modules the way
 * a browser loads them. No framework, no build step.
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC_ROOT = resolve(fileURLToPath(new URL('../../src/', import.meta.url)));

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

/**
 * Start the server on an unused port, or on a fixed port when one is given.
 * @param {number} [port] Port to bind. `0` lets the system choose one.
 * @returns {Promise<{url: string, close: () => Promise<void>}>}
 */
export async function startStaticServer(port = 0) {
  const server = createServer(async (request, response) => {
    const requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const target = normalize(join(SRC_ROOT, requestPath === '/' ? 'index.html' : requestPath));

    // Reject anything that climbs out of src/.
    if (!target.startsWith(`${SRC_ROOT}/`) && target !== SRC_ROOT) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    try {
      const body = await readFile(target);
      response.writeHead(200, { 'content-type': CONTENT_TYPES[extname(target)] ?? 'application/octet-stream' });
      response.end(body);
    } catch (error) {
      if (error.code === 'ENOENT') {
        response.writeHead(404).end('Not found');
        return;
      }
      response.writeHead(500).end('Server error');
    }
  });

  await new Promise((resolveReady) => server.listen(port, '127.0.0.1', resolveReady));
  const address = server.address();

  return {
    url: `http://127.0.0.1:${address.port}/`,
    close: () => new Promise((resolveClose) => server.close(resolveClose))
  };
}

// Running the file directly serves the app for local use in a browser.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.QGEN_PORT ?? 8080);
  const server = await startStaticServer(port);
  console.log(`QGen is served at ${server.url}`);
  console.log('Press Ctrl+C to stop.');

  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });
}
