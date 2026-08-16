import http from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import type { ClientMessage } from '../../shared/protocol.js';
import { handleClientMessage, RoomManager } from './room.js';

const PORT = Number(process.env.PORT) || 8080;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

const manager = new RoomManager();

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'mrwhite-rooms' }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

wss.on('connection', (socket: WebSocket) => {
  const playerIdRef: { current: string | null } = { current: null };

  socket.on('message', (data) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(data));
    } catch {
      socket.send(JSON.stringify({ type: 'error', message: 'JSON inválido.' }));
      return;
    }
    if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
      socket.send(JSON.stringify({ type: 'error', message: 'Mensaje inválido.' }));
      return;
    }
    try {
      handleClientMessage(manager, socket, playerIdRef, parsed as ClientMessage);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error interno.';
      socket.send(JSON.stringify({ type: 'error', message }));
    }
  });

  socket.on('close', () => {
    if (playerIdRef.current) {
      const room = manager.leave(playerIdRef.current, socket);
      room?.syncAll();
    }
  });
});

setInterval(() => manager.sweepExpired(), SWEEP_INTERVAL_MS).unref();

server.listen(PORT, () => {
  console.log(`mrwhite-rooms listening on :${PORT}`);
});
