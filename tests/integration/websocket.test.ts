import http from 'http';
import type { AddressInfo } from 'net';
import WebSocket from 'ws';
import app from '../../src/app';
import { initWebSocketServer } from '../../src/websocket/socket';
import { connectTestDB, clearTestDB, closeTestDB } from '../helpers/db';
import { createAdminAndLogin, createUserAndLogin, createUser } from '../helpers/factories';

let server: http.Server;
let wsBaseUrl: string;

beforeAll(async () => {
  await connectTestDB();
  server = http.createServer(app);
  initWebSocketServer(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;
  wsBaseUrl = `ws://localhost:${port}/ws`;
});

afterEach(clearTestDB);

afterAll(async () => {
  await closeTestDB();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

// The underlying WebSocket handshake (HTTP Upgrade) completes — and the
// client's "open" event fires — before our app-level connection handler
// runs, even for connections the app immediately rejects. So the only
// reliable signal for "was this connection rejected?" is whether a "close"
// event follows shortly after — not whether "open" fired at all.
const waitForClose = (socket: WebSocket, timeoutMs = 1000): Promise<number | null> => {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    socket.once('close', (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });
};

describe('WebSocket /ws', () => {
  it('closes the connection when no token is provided', async () => {
    const socket = new WebSocket(wsBaseUrl);
    const closeCode = await waitForClose(socket);

    expect(closeCode).toBe(4001);
  });

  it('closes the connection for a non-admin token', async () => {
    const { accessToken } = await createUserAndLogin();
    const socket = new WebSocket(`${wsBaseUrl}?token=${accessToken}`);
    const closeCode = await waitForClose(socket);

    expect(closeCode).toBe(4003);
  });

  it('accepts the connection for a valid admin token and delivers a user_created broadcast', async () => {
    const admin = await createAdminAndLogin();
    const socket = new WebSocket(`${wsBaseUrl}?token=${admin.accessToken}`);

    await new Promise<void>((resolve) => socket.once('open', () => resolve()));

    // Give the server a moment — if it were going to reject this
    // connection, it would have closed it by now.
    const closeCode = await waitForClose(socket, 300);
    expect(closeCode).toBeNull();

    const messagePromise = new Promise<Record<string, unknown>>((resolve) => {
      socket.once('message', (data) => resolve(JSON.parse(data.toString())));
    });

    await createUser({ username: 'broadcastme' });

    const message = await messagePromise;
    expect(message.event).toBe('user_created');
    expect((message.data as { username: string }).username).toBe('broadcastme');

    socket.close();
  });
});
