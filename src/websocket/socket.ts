import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { verifyAccessToken } from '../utils/jwt';
import { logger } from '../utils/logger';

// We use the plain "ws" library instead of something like Socket.IO because
// this app only needs one simple use case (push a message to connected
// admins) — "ws" needs no special client library, any standard WebSocket
// client can connect to it.

// Every currently-connected, verified-admin socket. This is just an
// in-memory Set, which is fine for a single-process app like this one. If
// this ever ran as multiple server instances behind a load balancer, an
// admin connected to instance A wouldn't hear about events on instance B —
// that would need a shared pub/sub layer (e.g. Redis) to fan messages out
// across instances. Out of scope for this practice project.
const connectedAdmins = new Set<WebSocket>();

let wss: WebSocketServer | null = null;

// Attaches the WebSocket server to the same HTTP server Express is already
// using, on path /ws — so clients connect to the same host/port as the
// REST API, just with a different path and the ws:// protocol.
export const initWebSocketServer = (httpServer: Server): void => {
  wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (socket, request) => {
    // The access token is passed as a query param:
    // ws://host/ws?token=<accessToken>
    const url = new URL(request.url || '', 'http://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
      socket.close(4001, 'Unauthorized: missing token');
      return;
    }

    try {
      const payload = verifyAccessToken(token);

      if (payload.role !== 'admin') {
        socket.close(4003, 'Forbidden: admin only');
        return;
      }

      connectedAdmins.add(socket);
      logger.info('Admin connected to WebSocket', { userId: payload.sub });

      socket.on('close', () => {
        connectedAdmins.delete(socket);
        logger.info('Admin disconnected from WebSocket', { userId: payload.sub });
      });
    } catch {
      // Covers an expired, malformed, or badly-signed token.
      socket.close(4001, 'Unauthorized: invalid or expired token');
    }
  });
};

// Called from user.service.ts whenever a new user is created. Sends the
// update to every connected admin; does nothing if the WS server hasn't
// started yet or no admins happen to be connected right now.
export const broadcastNewUser = (user: unknown): void => {
  if (!wss || connectedAdmins.size === 0) {
    return;
  }

  const message = JSON.stringify({ event: 'user_created', data: user });

  for (const socket of connectedAdmins) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  }
};
