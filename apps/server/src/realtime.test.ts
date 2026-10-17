import { afterEach, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import type {
  ClientEvents,
  ServerEvents,
  RoomView,
  Command,
  Reply,
} from '@typespeed/shared';
import { defaultSettings } from '@typespeed/shared';
import { createServer } from './index';

const clients: Socket<ServerEvents, ClientEvents>[] = [];
afterEach(() => {
  for (const client of clients.splice(0)) client.disconnect();
});
it('real polling connections enforce admission and accept a same-origin referrer', async () => {
  const app = await createServer();
  const address = await app.listen({ port: 0, host: '127.0.0.1' });
  const connect = async (headers: Record<string, string>) => {
    const socket: Socket<ServerEvents, ClientEvents> = io(address, {
      transports: ['polling'],
      extraHeaders: headers,
      reconnection: false,
      autoConnect: false,
    });
    clients.push(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
      socket.connect();
    });
    return socket;
  };
  const command = (
    socket: Socket<ServerEvents, ClientEvents>,
    payload: Command,
  ): Promise<Reply> => socket.timeout(2000).emitWithAck('command', payload);
  try {
    const host = await connect({
      Referer: 'http://127.0.0.1:5173/multiplayer',
    });
    const guest = await connect({ Origin: 'http://127.0.0.1:5173' });
    let hostView: RoomView | undefined;
    let guestView: RoomView | undefined;
    host.on('room', (room) => {
      hostView = room;
    });
    guest.on('room', (room) => {
      guestView = room;
    });
    expect(
      (
        await command(host, {
          type: 'create',
          name: 'Ankit',
          settings: defaultSettings,
        })
      ).ok,
    ).toBe(true);
    const joined = await command(guest, {
      type: 'join',
      name: 'Rahul',
      code: hostView!.code,
    });
    if (!joined.ok) throw new Error(joined.error);
    expect(guestView).toBeUndefined();
    expect((await command(guest, { type: 'start' })).ok).toBe(false);
    expect((await command(host, { type: 'approve', id: joined.id! })).ok).toBe(
      true,
    );
    await expect.poll(() => guestView?.players.length).toBe(2);
    expect(guestView!.requests).toEqual([]);
    expect(JSON.stringify(guestView)).not.toContain(joined.token);
    await expect(
      connect({ Origin: 'https://untrusted.example' }),
    ).rejects.toThrow();
  } finally {
    for (const client of clients.splice(0)) client.disconnect();
    await app.close();
  }
}, 15_000);
