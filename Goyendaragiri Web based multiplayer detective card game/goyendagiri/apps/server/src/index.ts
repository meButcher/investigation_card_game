import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'http';
import { GameRoom } from './GameRoom.js';

const port = Number(process.env.PORT ?? 2567);

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
  res.writeHead(404); res.end();
});

export const gameServer = new Server({ transport: new WebSocketTransport({ server: httpServer }) });
gameServer.define('goyendagiri', GameRoom);

gameServer.listen(port).then(() => console.log(`[goyendagiri] server listening on :${port}`));
