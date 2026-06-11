import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const host = process.env.APP_HOST || '0.0.0.0';
const port = Number(process.env.APP_PORT || 4173);
const root = join(process.cwd(), 'dist');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function resolveAsset(url) {
  const rawPath = decodeURIComponent(new URL(url, 'http://localhost').pathname);
  const cleanPath = normalize(rawPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = join(root, cleanPath);

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    return filePath;
  }

  return join(root, 'index.html');
}

createServer((request, response) => {
  const filePath = resolveAsset(request.url || '/');
  const ext = extname(filePath);
  response.writeHead(200, {
    'Content-Type': contentTypes[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
  });
  createReadStream(filePath).pipe(response);
}).listen(port, host, () => {
  console.log(`Sourdough Timeline Calculator listening on http://${host}:${port}`);
});
