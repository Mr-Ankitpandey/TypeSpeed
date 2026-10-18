import { z } from 'zod';
import type { Score, TypingState } from '@typespeed/typing-engine';
export const settingsSchema = z
  .object({
    duration: z.union([z.literal(30), z.literal(60), z.literal(120)]),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    maxPlayers: z.number().int().min(2).max(8),
    punctuation: z.boolean(),
    numbers: z.boolean(),
    mode: z.enum(['race', 'relay', 'boss']).default('race'),
  })
  .strict();
export type RoomSettings = z.infer<typeof settingsSchema>;
export const defaultSettings: RoomSettings = {
  duration: 60,
  difficulty: 'easy',
  maxPlayers: 4,
  punctuation: false,
  numbers: false,
  mode: 'race',
};
const name = z
  .string()
  .trim()
  .min(1)
  .max(24)
  .regex(
    /^[\p{L}\p{N} _.-]+$/u,
    'Use letters, numbers, spaces, dots, dashes or underscores',
  );
const id = z.string().uuid();
export const commandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('create'), name, settings: settingsSchema }),
  z.object({
    type: z.literal('join'),
    name,
    code: z.string().regex(/^[A-Z2-9]{6}$/),
  }),
  z.object({
    type: z.literal('resume'),
    token: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  z.object({ type: z.literal('approve'), id }),
  z.object({ type: z.literal('reject'), id }),
  z.object({ type: z.literal('cancel') }),
  z.object({ type: z.literal('leave') }),
  z.object({ type: z.literal('close') }),
  z.object({ type: z.literal('kick'), id }),
  z.object({ type: z.literal('ready'), ready: z.boolean() }),
  z.object({ type: z.literal('settings'), settings: settingsSchema }),
  z.object({ type: z.literal('start') }),
  z.object({ type: z.literal('rematch') }),
  z.object({
    type: z.literal('input'),
    round: id,
    sequence: z.number().int().positive(),
    operation: z.discriminatedUnion('kind', [
      z
        .object({
          kind: z.literal('insert'),
          char: z.string().regex(/^[\x20-\x7e]$/),
        })
        .strict(),
      z.object({ kind: z.literal('delete') }).strict(),
    ]),
  }),
]);
export type Command = z.infer<typeof commandSchema>;
export type RoomState =
  'WAITING' | 'COUNTDOWN' | 'RACING' | 'FINISHED' | 'CLOSED' | 'EXPIRED';
export type RequestState =
  'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
export type PlayerView = {
  id: string;
  name: string;
  ready: boolean;
  connected: boolean;
  score?: Score;
  rank?: number;
  eligible?: boolean;
};
export type RoomView = {
  code: string;
  hostId: string;
  state: RoomState;
  settings: RoomSettings;
  players: PlayerView[];
  requests: { id: string; name: string }[];
  round?: string;
  passage?: string;
  startsAt?: number;
  serverNow: number;
  cooperative?: {
    mode: 'relay' | 'boss';
    activeId?: string;
    correct: number;
    target: number;
    complete: boolean;
  };
};
export type Reply =
  | {
      ok: true;
      token?: string;
      id?: string;
      sequence?: number;
      state?: TypingState;
    }
  | { ok: false; error: string };
export interface ClientEvents {
  command: (payload: Command, ack: (response: Reply) => void) => void;
  clock: (ack: (now: number) => void) => void;
}
export interface ServerEvents {
  room: (room: RoomView) => void;
  request: (status: { state: RequestState; message: string }) => void;
  closed: (message: string) => void;
}
