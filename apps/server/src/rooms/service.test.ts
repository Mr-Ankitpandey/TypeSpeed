import { beforeEach, describe, expect, it } from 'vitest';
import { RoomService } from './service';
import {
  defaultSettings,
  type Command,
  type Reply,
  type RoomView,
} from '@typespeed/shared';
describe('authoritative room lifecycle', () => {
  let now: number;
  let service: RoomService;
  let events: { socket: string; event: string; payload: unknown }[];
  const call = (socket: string, command: Command): Reply =>
    service.handle(socket, socket, command);
  const view = (socket: string) =>
    events.filter((e) => e.socket === socket && e.event === 'room').at(-1)
      ?.payload as RoomView;
  function create() {
    const host = call('host', {
      type: 'create',
      name: 'Ankit',
      settings: defaultSettings,
    });
    expect(host.ok).toBe(true);
    return view('host').code;
  }
  function join() {
    const code = create();
    const guest = call('guest', { type: 'join', name: 'Rahul', code });
    if (!guest.ok) throw new Error(guest.error);
    return guest;
  }
  function approve() {
    const guest = join();
    expect(call('host', { type: 'approve', id: guest.id! }).ok).toBe(true);
    return guest;
  }
  function start() {
    approve();
    call('host', { type: 'ready', ready: true });
    call('guest', { type: 'ready', ready: true });
    expect(call('host', { type: 'start' }).ok).toBe(true);
    return view('host');
  }
  beforeEach(() => {
    now = 100_000;
    events = [];
    service = new RoomService(
      (socket, event, payload) => events.push({ socket, event, payload }),
      () => now,
    );
  });
  it('updates provisional ranks before the race finishes', () => {
    const room = start();
    now = room.startsAt! + 1000;
    service.tick();
    call('guest', {
      type: 'input',
      round: room.round!,
      sequence: 1,
      operation: { kind: 'insert', char: room.passage![0] },
    });
    service.tick();
    expect(view('host').state).toBe('RACING');
    expect(view('host').players[0]).toMatchObject({ name: 'Rahul', rank: 1 });
  });
  it('enforces relay turns on the server and passes a completed leg', () => {
    approve();
    call('host', {
      type: 'settings',
      settings: { ...defaultSettings, mode: 'relay' },
    });
    call('host', { type: 'ready', ready: true });
    call('guest', { type: 'ready', ready: true });
    call('host', { type: 'start' });
    const room = view('host');
    now = room.startsAt!;
    service.tick();
    expect(
      call('guest', {
        type: 'input',
        round: room.round!,
        sequence: 1,
        operation: { kind: 'insert', char: 'a' },
      }).ok,
    ).toBe(false);
    let sequence = 0;
    for (const char of room.passage!) {
      now += 40;
      expect(
        call('host', {
          type: 'input',
          round: room.round!,
          sequence: ++sequence,
          operation: { kind: 'insert', char },
        }).ok,
      ).toBe(true);
    }
    service.tick();
    expect(view('guest').cooperative?.activeId).toBe(
      view('guest').players.find((p) => p.name === 'Rahul')?.id,
    );
    expect(
      call('host', {
        type: 'input',
        round: room.round!,
        sequence: ++sequence,
        operation: { kind: 'delete' },
      }).ok,
    ).toBe(false);
    expect(
      call('guest', {
        type: 'input',
        round: room.round!,
        sequence: 1,
        operation: { kind: 'insert', char: view('guest').passage![0] },
      }).ok,
    ).toBe(true);
  });
  it('counts only correctly retained characters toward the boss goal', () => {
    approve();
    call('host', {
      type: 'settings',
      settings: { ...defaultSettings, mode: 'boss' },
    });
    call('host', { type: 'ready', ready: true });
    call('guest', { type: 'ready', ready: true });
    call('host', { type: 'start' });
    const room = view('host');
    now = room.startsAt!;
    service.tick();
    call('host', {
      type: 'input',
      round: room.round!,
      sequence: 1,
      operation: { kind: 'insert', char: room.passage![0] },
    });
    call('guest', {
      type: 'input',
      round: room.round!,
      sequence: 1,
      operation: { kind: 'insert', char: '~' },
    });
    service.tick();
    expect(view('host').cooperative?.correct).toBe(1);
    expect(view('host').cooperative?.target).toBe(120);
    call('host', {
      type: 'input',
      round: room.round!,
      sequence: 2,
      operation: { kind: 'delete' },
    });
    service.tick();
    expect(view('host').cooperative?.correct).toBe(0);
  });
  it('keeps pending players outside protected broadcasts and rejects host impersonation', () => {
    const guest = join();
    expect(view('guest')).toBeUndefined();
    expect(call('guest', { type: 'ready', ready: true }).ok).toBe(false);
    expect(call('guest', { type: 'approve', id: guest.id! }).ok).toBe(false);
    expect(call('host', { type: 'approve', id: guest.id! }).ok).toBe(true);
    expect(view('guest').players).toHaveLength(2);
    expect(view('guest').requests).toEqual([]);
    expect(call('guest', { type: 'start' }).ok).toBe(false);
    expect(call('host', { type: 'approve', id: guest.id! }).ok).toBe(false);
  });
  it('revokes rejected, cancelled and kicked credentials', () => {
    const guest = join();
    call('host', { type: 'reject', id: guest.id! });
    expect(call('other', { type: 'resume', token: guest.token! }).ok).toBe(
      false,
    );
    const next = call('guest', {
      type: 'join',
      name: 'Rahul',
      code: view('host').code,
    });
    if (!next.ok) throw new Error(next.error);
    call('guest', { type: 'cancel' });
    expect(call('other', { type: 'resume', token: next.token! }).ok).toBe(
      false,
    );
    const last = call('guest', {
      type: 'join',
      name: 'Rahul',
      code: view('host').code,
    });
    if (!last.ok) throw new Error(last.error);
    call('host', { type: 'approve', id: last.id! });
    call('host', { type: 'kick', id: last.id! });
    expect(call('other', { type: 'resume', token: last.token! }).ok).toBe(
      false,
    );
  });
  it('checks capacity at approval time', () => {
    create();
    call('host', {
      type: 'settings',
      settings: { ...defaultSettings, maxPlayers: 2 },
    });
    const a = call('a', { type: 'join', name: 'A', code: view('host').code });
    const b = call('b', { type: 'join', name: 'B', code: view('host').code });
    if (!a.ok || !b.ok) throw new Error('Join failed');
    expect(call('host', { type: 'approve', id: a.id! }).ok).toBe(true);
    expect(call('host', { type: 'approve', id: b.id! }).ok).toBe(false);
    expect(view('b')).toBeUndefined();
  });
  it('enforces countdown, sequence, official end time and server scoring', () => {
    const room = start();
    expect(room.passage).toBe(view('guest').passage);
    expect(call('host', { type: 'start' }).ok).toBe(false);
    const input: Command = {
      type: 'input',
      round: room.round!,
      sequence: 1,
      operation: { kind: 'insert', char: room.passage![0] },
    };
    expect(call('guest', input).ok).toBe(false);
    now = room.startsAt!;
    service.tick();
    expect(call('guest', input).ok).toBe(true);
    expect(call('guest', input).ok).toBe(false);
    expect(call('guest', { ...input, sequence: 3 }).ok).toBe(false);
    now += 60_000;
    expect(call('guest', { ...input, sequence: 2 }).ok).toBe(false);
    service.tick();
    const result = view('guest');
    expect(result.state).toBe('FINISHED');
    expect(result.players.find((p) => p.name === 'Rahul')).toMatchObject({
      rank: 1,
      eligible: true,
      score: { correct: 1, wpm: 0.2, accuracy: 100 },
    });
    expect(call('host', { type: 'rematch' }).ok).toBe(true);
    expect(view('guest').state).toBe('WAITING');
    expect(view('guest').players).toHaveLength(2);
    expect(view('guest').players.every((p) => !p.ready)).toBe(true);
  });
  it('restores identity and invalidates the older socket on takeover', () => {
    const guest = approve();
    service.disconnect('guest');
    expect(
      view('host').players.find((p) => p.name === 'Rahul')?.connected,
    ).toBe(false);
    expect(call('new', { type: 'resume', token: guest.token! }).ok).toBe(true);
    expect(view('new').players).toHaveLength(2);
    expect(call('newer', { type: 'resume', token: guest.token! }).ok).toBe(
      true,
    );
    expect(call('new', { type: 'ready', ready: true }).ok).toBe(false);
  });
  it('expires requests, transfers disconnected hosts and cleans empty rooms', () => {
    const guest = approve();
    service.disconnect('host');
    now += 30_001;
    service.tick();
    expect(view('guest').hostId).toBe(guest.id);
    call('guest', { type: 'leave' });
    expect(service.rooms.size).toBe(0);
    join();
    now += 120_001;
    service.tick();
    expect(
      events.some(
        (e) =>
          e.event === 'request' &&
          (e.payload as { state: string }).state === 'EXPIRED',
      ),
    ).toBe(true);
  });
  it('rejects malformed and unauthorized input and abusive bursts', () => {
    expect(
      service.handle('x', 'x', {
        type: 'input',
        operation: { kind: 'insert', char: 'paste' },
      }).ok,
    ).toBe(false);
    const room = start();
    now = room.startsAt!;
    service.tick();
    for (let i = 1; i <= 35; i++)
      expect(
        call('guest', {
          type: 'input',
          round: room.round!,
          sequence: i,
          operation: { kind: 'insert', char: 'x' },
        }).ok,
      ).toBe(true);
    expect(
      call('guest', {
        type: 'input',
        round: room.round!,
        sequence: 36,
        operation: { kind: 'insert', char: 'x' },
      }).ok,
    ).toBe(false);
  });
});
