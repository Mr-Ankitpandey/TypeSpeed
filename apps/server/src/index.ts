import Fastify from 'fastify';
import { Server } from 'socket.io';
import type {
  ClientEvents,
  ServerEvents,
  RoomView,
  RequestState,
} from '@typespeed/shared';
import { RoomService } from './rooms/service';
export async function createServer() {
  const app = Fastify({ logger: true, bodyLimit: 8192 });
  const origins = (
    process.env.ALLOWED_ORIGINS ?? 'http://127.0.0.1:5173,http://localhost:5173'
  ).split(',');
  const io = new Server<ClientEvents, ServerEvents>(app.server, {
    maxHttpBufferSize: 8192,
    cors: { origin: origins },
    allowRequest: (req, done) => {
      // Same-origin polling GETs may omit Origin; browsers still send Referer.
      let origin = req.headers.origin;
      if (!origin && req.headers.referer) {
        try {
          origin = new URL(req.headers.referer).origin;
        } catch {
          /* Reject malformed referrers. */
        }
      }
      done(null, !!origin && origins.includes(origin));
    },
  });
  const service = new RoomService((socket, event, payload) => {
    const target = io.to(socket);
    if (event === 'room') target.emit('room', payload as RoomView);
    else if (event === 'request')
      target.emit(
        'request',
        payload as { state: RequestState; message: string },
      );
    else target.emit('closed', payload as string);
  });
  const connections = new Map<string, number>();
  io.use((socket, next) => {
    const address = socket.handshake.address;
    if ((connections.get(address) ?? 0) >= 20)
      return next(new Error('Too many connections.'));
    next();
  });
  io.on('connection', (socket) => {
    const address = socket.handshake.address;
    connections.set(address, (connections.get(address) ?? 0) + 1);
    socket.on('command', (command, ack) => {
      if (typeof ack === 'function')
        ack(service.handle(socket.id, address, command));
    });
    socket.on('clock', (ack) => {
      if (typeof ack === 'function') ack(Date.now());
    });
    socket.on('disconnect', () => {
      connections.set(
        address,
        Math.max(0, (connections.get(address) ?? 1) - 1),
      );
      if (!connections.get(address)) connections.delete(address);
      service.disconnect(socket.id);
    });
  });
  const interval = setInterval(() => service.tick(), 250);
  app.get('/health', async () => ({ status: 'ok' }));
  app.addHook('onClose', async () => {
    clearInterval(interval);
    service.dispose();
    io.close();
  });
  return app;
}
if (process.env.NODE_ENV !== 'test') {
  const app = await createServer();
  await app.listen({
    port: Number(process.env.PORT ?? 3001),
    host: process.env.HOST ?? '127.0.0.1',
  });
  for (const signal of ['SIGINT', 'SIGTERM'] as const)
    process.once(signal, () => {
      void app.close();
    });
}
