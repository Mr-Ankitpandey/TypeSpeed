import { randomBytes, randomUUID, randomInt } from 'node:crypto';
import {
  applyOperation,
  emptyState,
  generatePassage,
  rankPlayers,
  score,
  type TypingState,
} from '@typespeed/typing-engine';
import {
  commandSchema,
  type Command,
  type Reply,
  type RoomSettings,
  type RoomState,
  type RoomView,
  type ServerEvents,
} from '@typespeed/shared';

type Session = {
  id: string;
  token: string;
  name: string;
  code: string;
  socket?: string;
  disconnectedAt?: number;
  status: 'PENDING' | 'APPROVED';
  createdAt: number;
  ready: boolean;
  typing: TypingState;
  sequence: number;
  inputs: number[];
};
type Room = {
  code: string;
  hostId: string;
  state: RoomState;
  settings: RoomSettings;
  members: Set<string>;
  pending: Set<string>;
  touched: number;
  round?: string;
  passage?: string;
  startsAt?: number;
};
type Send = <K extends keyof ServerEvents>(
  socket: string,
  event: K,
  payload: Parameters<ServerEvents[K]>[0],
) => void;
export class RoomService {
  readonly rooms = new Map<string, Room>();
  private sessions = new Map<string, Session>();
  private tokens = new Map<string, string>();
  private sockets = new Map<string, string>();
  private limits = new Map<string, number[]>();
  constructor(
    private send: Send,
    private now = Date.now,
  ) {}
  private check(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(message);
  }
  private limited(key: string, count: number, interval = 60_000) {
    const recent = (this.limits.get(key) ?? []).filter(
      (t) => t > this.now() - interval,
    );
    this.check(
      recent.length < count,
      'Too many requests. Please wait a moment.',
    );
    recent.push(this.now());
    this.limits.set(key, recent);
  }
  handle(socket: string, address: string, raw: unknown): Reply {
    try {
      const command = commandSchema.parse(raw);
      this.limited(`event:${socket}`, 180, 1000);
      return this.execute(socket, address, command);
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error && error.name !== 'ZodError'
            ? error.message
            : 'Invalid request.',
      };
    }
  }
  private execute(socket: string, address: string, command: Command): Reply {
    if (command.type === 'resume') {
      this.limited(`resume:${address}`, 30);
      const session = this.sessions.get(this.tokens.get(command.token) ?? '');
      this.check(session, 'Session expired. Request access again.');
      this.check(
        !this.sockets.has(socket) || this.sockets.get(socket) === session.id,
        'Leave the current room first.',
      );
      if (session.socket && session.socket !== socket) {
        this.send(session.socket, 'closed', 'Session resumed in another tab.');
        this.sockets.delete(session.socket);
      }
      session.socket = socket;
      session.disconnectedAt = undefined;
      this.sockets.set(socket, session.id);
      const room = this.rooms.get(session.code)!;
      if (session.status === 'PENDING')
        this.send(socket, 'request', {
          state: 'PENDING',
          message: 'Waiting for the room host to approve your entry.',
        });
      this.broadcast(room);
      return {
        ok: true,
        id: session.id,
        sequence: session.sequence,
        state: session.typing,
      };
    }
    if (command.type === 'create' || command.type === 'join') {
      this.check(
        !this.sockets.has(socket),
        'Leave your current room or cancel your request first.',
      );
      this.limited(`admission:${address}`, 12);
      this.check(
        this.sessions.size < 2000,
        'Server is at capacity. Try again later.',
      );
      let room: Room;
      if (command.type === 'create') {
        this.limited(`create:${address}`, 5);
        this.check(this.rooms.size < 200, 'Server is at capacity.');
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code: string;
        do {
          code = Array.from(
            { length: 6 },
            () => alphabet[randomInt(alphabet.length)],
          ).join('');
        } while (this.rooms.has(code));
        room = {
          code,
          hostId: '',
          state: 'WAITING',
          settings: command.settings,
          members: new Set(),
          pending: new Set(),
          touched: this.now(),
        };
        this.rooms.set(code, room);
      } else {
        const existing = this.rooms.get(command.code);
        this.check(existing, 'Room not found or expired.');
        room = existing;
        this.check(
          room.state === 'WAITING',
          'This room is not accepting requests right now.',
        );
        this.check(
          room.members.size < room.settings.maxPlayers,
          'This room is full.',
        );
        this.check(
          room.pending.size < 16,
          'Too many pending requests. Try again later.',
        );
        this.check(
          [...room.members, ...room.pending].every(
            (id) =>
              this.sessions.get(id)?.name.toLowerCase() !==
              command.name.toLowerCase(),
          ),
          'That display name is already in use.',
        );
      }
      const session: Session = {
        id: randomUUID(),
        token: randomBytes(32).toString('hex'),
        name: command.name,
        code: room.code,
        socket,
        status: command.type === 'create' ? 'APPROVED' : 'PENDING',
        createdAt: this.now(),
        ready: false,
        typing: emptyState(),
        sequence: 0,
        inputs: [],
      };
      this.sessions.set(session.id, session);
      this.tokens.set(session.token, session.id);
      this.sockets.set(socket, session.id);
      if (command.type === 'create') {
        room.hostId = session.id;
        room.members.add(session.id);
      } else {
        room.pending.add(session.id);
        this.send(socket, 'request', {
          state: 'PENDING',
          message:
            'Your request has been sent. Waiting for the room host to approve your entry.',
        });
      }
      room.touched = this.now();
      this.broadcast(room);
      return { ok: true, token: session.token, id: session.id };
    }
    const session = this.sessions.get(this.sockets.get(socket) ?? '');
    this.check(
      session && session.socket === socket,
      'Your session is not authorized.',
    );
    const room = this.rooms.get(session.code);
    this.check(room, 'Room expired.');
    if (command.type === 'cancel') {
      this.check(session.status === 'PENDING', 'No pending request.');
      this.remove(session, 'Request cancelled.');
      this.broadcast(room);
      return { ok: true };
    }
    this.check(
      session.status === 'APPROVED' && room.members.has(session.id),
      'Host approval is required.',
    );
    if (command.type === 'leave') {
      this.remove(session, 'You left the room.');
      this.transferHost(room);
      this.broadcast(room);
      return { ok: true };
    }
    if (
      [
        'approve',
        'reject',
        'kick',
        'close',
        'settings',
        'start',
        'rematch',
      ].includes(command.type)
    )
      this.check(room.hostId === session.id, 'Only the host can do that.');
    if (command.type === 'approve' || command.type === 'reject') {
      this.check(
        room.state === 'WAITING',
        'Admissions are locked during a race.',
      );
      const guest = this.sessions.get(command.id);
      this.check(
        guest && room.pending.has(guest.id),
        'Request is no longer pending.',
      );
      if (command.type === 'reject') {
        if (guest.socket)
          this.send(guest.socket, 'request', {
            state: 'REJECTED',
            message: 'The room host declined your request.',
          });
        this.remove(guest);
      } else {
        this.check(
          room.members.size < room.settings.maxPlayers,
          'This room is full.',
        );
        this.check(guest.socket, 'Guest is disconnected.');
        room.pending.delete(guest.id);
        room.members.add(guest.id);
        guest.status = 'APPROVED';
        this.send(guest.socket, 'request', {
          state: 'APPROVED',
          message: 'You’re in! Welcome to the room.',
        });
      }
    } else if (command.type === 'kick') {
      this.check(
        room.state === 'WAITING',
        'Players cannot be removed during a race.',
      );
      this.check(
        command.id !== room.hostId && room.members.has(command.id),
        'Cannot remove that player.',
      );
      this.remove(
        this.sessions.get(command.id)!,
        'The host removed you from the room.',
      );
    } else if (command.type === 'close') {
      this.close(room, 'The host closed this room.');
      return { ok: true };
    } else if (command.type === 'ready') {
      this.check(room.state === 'WAITING', 'Ready status is locked.');
      session.ready = command.ready;
    } else if (command.type === 'settings') {
      this.check(room.state === 'WAITING', 'Settings are locked.');
      this.check(
        command.settings.maxPlayers >= room.members.size,
        'Capacity cannot be smaller than the current group.',
      );
      room.settings = command.settings;
      for (const id of room.members) this.sessions.get(id)!.ready = false;
    } else if (command.type === 'start') {
      this.check(room.state === 'WAITING', 'Race already started.');
      this.check(
        room.members.size >= 2,
        'At least two approved players are required.',
      );
      this.check(
        [...room.members].every((id) => {
          const p = this.sessions.get(id)!;
          return p.socket && p.ready;
        }),
        'Every player must be connected and ready.',
      );
      room.state = 'COUNTDOWN';
      room.round = randomUUID();
      room.passage = generatePassage(room.settings);
      room.startsAt = this.now() + 3500;
      for (const id of room.members) {
        const p = this.sessions.get(id)!;
        p.typing = emptyState();
        p.sequence = 0;
        p.inputs = [];
      }
      for (const id of [...room.pending]) {
        const p = this.sessions.get(id)!;
        if (p.socket)
          this.send(p.socket, 'request', {
            state: 'EXPIRED',
            message: 'The race started before your request was approved.',
          });
        this.remove(p);
      }
    } else if (command.type === 'rematch') {
      this.check(room.state === 'FINISHED', 'Finish this race first.');
      room.state = 'WAITING';
      room.passage = undefined;
      room.round = undefined;
      room.startsAt = undefined;
      for (const id of room.members) this.sessions.get(id)!.ready = false;
    } else if (command.type === 'input') {
      const now = this.now();
      this.check(
        (room.state === 'COUNTDOWN' || room.state === 'RACING') &&
          room.startsAt !== undefined &&
          now >= room.startsAt &&
          now < room.startsAt + room.settings.duration * 1000,
        'Input is outside the official race window.',
      );
      this.check(command.round === room.round, 'Stale race round.');
      this.check(
        command.sequence === session.sequence + 1,
        'Input sequence is duplicated or out of order.',
      );
      session.inputs = session.inputs.filter((t) => t > now - 1000);
      this.check(
        session.inputs.length < 35,
        'Input rate exceeds the fair-play limit.',
      );
      session.inputs.push(now);
      session.typing = applyOperation(
        session.typing,
        room.passage!,
        command.operation,
      );
      session.sequence = command.sequence;
      // Progress is broadcast by tick, never once per keypress.
      return { ok: true, sequence: session.sequence };
    }
    room.touched = this.now();
    this.broadcast(room);
    return { ok: true };
  }
  disconnect(socket: string) {
    const session = this.sessions.get(this.sockets.get(socket) ?? '');
    this.sockets.delete(socket);
    if (session?.socket === socket) {
      session.socket = undefined;
      session.disconnectedAt = this.now();
      session.ready = false;
      const room = this.rooms.get(session.code);
      if (room) this.broadcast(room);
    }
  }
  private remove(session: Session, message?: string) {
    if (session.socket) {
      if (message) this.send(session.socket, 'closed', message);
      this.sockets.delete(session.socket);
    }
    const room = this.rooms.get(session.code);
    room?.members.delete(session.id);
    room?.pending.delete(session.id);
    this.tokens.delete(session.token);
    this.sessions.delete(session.id);
  }
  private transferHost(room: Room) {
    if (room.members.has(room.hostId)) return;
    const next =
      [...room.members].find((id) => this.sessions.get(id)?.socket) ??
      [...room.members][0];
    if (next) room.hostId = next;
    else this.close(room, 'The room is empty.');
  }
  private close(room: Room, message: string) {
    for (const id of [...room.members, ...room.pending]) {
      const session = this.sessions.get(id);
      if (session) this.remove(session, message);
    }
    this.rooms.delete(room.code);
  }
  tick() {
    const now = this.now();
    for (const [key, times] of this.limits) {
      const recent = times.filter((t) => t > now - 60_000);
      if (recent.length) this.limits.set(key, recent);
      else this.limits.delete(key);
    }
    for (const room of this.rooms.values()) {
      if (now - room.touched > 30 * 60_000) {
        this.close(room, 'Room expired after 30 minutes of inactivity.');
        continue;
      }
      for (const id of [...room.pending]) {
        const p = this.sessions.get(id)!;
        if (now - p.createdAt > 120_000) {
          if (p.socket)
            this.send(p.socket, 'request', {
              state: 'EXPIRED',
              message: 'Your request expired. Please try again.',
            });
          this.remove(p);
        }
      }
      for (const id of [...room.members]) {
        const p = this.sessions.get(id)!;
        if (
          p.disconnectedAt !== undefined &&
          now - p.disconnectedAt > 30_000 &&
          room.state !== 'RACING' &&
          room.state !== 'COUNTDOWN'
        )
          this.remove(p);
      }
      const host = this.sessions.get(room.hostId);
      if (
        host?.disconnectedAt !== undefined &&
        now - host.disconnectedAt > 30_000
      ) {
        const next = [...room.members].find(
          (id) => this.sessions.get(id)?.socket,
        );
        if (next) room.hostId = next;
      }
      this.transferHost(room);
      if (!this.rooms.has(room.code)) continue;
      if (room.state === 'COUNTDOWN' && now >= room.startsAt!)
        room.state = 'RACING';
      if (
        room.state === 'RACING' &&
        now >= room.startsAt! + room.settings.duration * 1000
      )
        room.state = 'FINISHED';
      this.broadcast(room);
    }
  }
  private broadcast(room: Room) {
    if (!this.rooms.has(room.code)) return;
    const elapsed =
      room.state === 'FINISHED'
        ? room.settings.duration
        : Math.max(
            0.001,
            Math.min(
              room.settings.duration,
              (this.now() - (room.startsAt ?? this.now())) / 1000,
            ),
          );
    const players = [...room.members].map((id) => {
      const p = this.sessions.get(id)!;
      return {
        id,
        name: p.name,
        ready: p.ready,
        connected: !!p.socket,
        score: score(p.typing, room.passage ?? '', elapsed),
      };
    });
    const ranked = room.state === 'FINISHED' ? rankPlayers(players) : players;
    for (const id of room.members) {
      const p = this.sessions.get(id)!;
      if (!p.socket) continue;
      const view: RoomView = {
        code: room.code,
        hostId: room.hostId,
        state: room.state,
        settings: room.settings,
        players: ranked,
        requests:
          id === room.hostId
            ? [...room.pending].map((id) => ({
                id,
                name: this.sessions.get(id)!.name,
              }))
            : [],
        round: room.round,
        passage: room.passage,
        startsAt: room.startsAt,
        serverNow: this.now(),
      };
      this.send(p.socket, 'room', view);
    }
  }
  dispose() {
    for (const room of this.rooms.values())
      this.close(room, 'Server is shutting down.');
    this.limits.clear();
  }
}
