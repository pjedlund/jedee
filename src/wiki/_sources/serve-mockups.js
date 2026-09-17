// Serves the mockups over http for both shooters. MapLibre builds absolute URLs from location.origin ("null" on file://), and the tile file needs a real origin. /assets/ maps to dist/ the way the site serves it.
import { readFile } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

// ⚠ R2's CORS policy only admits johanedlund.se and localhost:8080, so the random port needs web security off to read the tile file.
export const launchArgs = ['--disable-web-security', '--enable-unsafe-swiftshader'];

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.pbf': 'application/x-protobuf' };

export async function serveMockups(here) {
  const root = path.resolve(here, '../../..');
  const server = createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(root, url.startsWith('/assets/') ? 'dist' : '', url);
    readFile(file, (err, data) => {
      res.writeHead(err ? 404 : 200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { server, base: `http://127.0.0.1:${server.address().port}/${path.relative(root, here)}` };
}
