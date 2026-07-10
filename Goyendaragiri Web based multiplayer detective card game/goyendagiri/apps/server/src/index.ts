import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'http';
import { GameRoom } from './GameRoom.js';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const port = Number(process.env.PORT ?? 2567);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const clientDistPath = join(__dirname, '../../client/dist');

// Zombie-server guard: on Windows, multiple node processes can silently bind the
// same port — each with its own room registry, so join codes "don't exist" for
// half the players. Refuse to start if something already answers on this port.
try {
  const res = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(1500) });
  if (res.ok) {
    console.error(`[goyendagiri] FATAL: another server is already running on :${port}.`);
    console.error(`[goyendagiri] Kill stray node processes first (Windows: taskkill /F /IM node.exe) and retry.`);
    process.exit(1);
  }
} catch { /* nothing answering — good, the port is really free */ }

const httpServer = createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200); res.end('ok'); return; }

  // Colyseus matchmaking + non-GET requests are NOT ours to answer (the transport
  // shim handles them) — swallowing them with the SPA fallback breaks joins.
  if (req.method !== 'GET' || req.url?.startsWith('/matchmake')) { res.writeHead(404); res.end(); return; }

  // Serve static client assets from apps/client/dist
  let safeUrl = req.url === '/' ? '/index.html' : req.url;
  const qIdx = safeUrl.indexOf('?');
  if (qIdx !== -1) safeUrl = safeUrl.substring(0, qIdx);
  const hIdx = safeUrl.indexOf('#');
  if (hIdx !== -1) safeUrl = safeUrl.substring(0, hIdx);

  const filePath = join(clientDistPath, safeUrl);

  // path-traversal guard: resolved path must stay inside dist
  if (!filePath.startsWith(clientDistPath)) { res.writeHead(403); res.end(); return; }

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    let contentType = 'text/plain';
    if (filePath.endsWith('.html')) contentType = 'text/html; charset=utf-8';
    else if (filePath.endsWith('.js')) contentType = 'application/javascript; charset=utf-8';
    else if (filePath.endsWith('.css')) contentType = 'text/css; charset=utf-8';
    else if (filePath.endsWith('.json')) contentType = 'application/json';
    else if (filePath.endsWith('.png')) contentType = 'image/png';
    else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (filePath.endsWith('.gif')) contentType = 'image/gif';
    else if (filePath.endsWith('.webp')) contentType = 'image/webp';
    else if (filePath.endsWith('.svg')) contentType = 'image/svg+xml';
    else if (filePath.endsWith('.ico')) contentType = 'image/x-icon';

    try {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(readFileSync(filePath));
      return;
    } catch (err) {
      res.writeHead(500);
      res.end('Server Error');
      return;
    }
  }

  // Fallback to index.html for SPA routing
  const indexPath = join(clientDistPath, 'index.html');
  if (existsSync(indexPath)) {
    try {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(readFileSync(indexPath));
      return;
    } catch (err) {
      res.writeHead(500);
      res.end('Server Error');
      return;
    }
  }

  res.writeHead(404);
  res.end('Not Found');
});

export const gameServer = new Server({ transport: new WebSocketTransport({ server: httpServer }) });
gameServer.define('goyendagiri', GameRoom);

gameServer.listen(port).then(() => {
  console.log(`[goyendagiri] server listening on :${port}`);
  if (existsSync(clientDistPath)) {
    console.log(`[goyendagiri] serving client from ${clientDistPath} — open http://localhost:${port}`);
  }
});
