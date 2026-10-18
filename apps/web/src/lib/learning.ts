import { z } from 'zod';
import {
  applyOperation,
  emptyState,
  score,
  isTypingCharacter,
  type Operation,
} from '@typespeed/typing-engine';
import { readStored, saveStored } from './storage';
import { achievements, type KeyProfile } from './training';
const progressSchema = z.object({
  completed: z.number().int().nonnegative(),
  unlocked: z.array(z.string().max(80)).max(30),
  days: z.array(z.string().datetime()).max(370),
  lessons: z.array(z.string().max(100)).max(20),
});
export const readProgress = () =>
  readStored(
    'typespeed.progress',
    {
      completed: 0,
      unlocked: [] as string[],
      days: [] as string[],
      lessons: [] as string[],
    },
    (v): v is z.infer<typeof progressSchema> =>
      progressSchema.safeParse(v).success,
  );

const operation = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('insert'),
    char: z.string().refine(isTypingCharacter),
  }),
  z.object({ kind: z.literal('delete') }),
]);
export const recordingSchema = z
  .object({
    id: z.string().max(80),
    title: z.string().max(100),
    mode: z.string().max(60),
    date: z.string().datetime(),
    passage: z
      .string()
      .min(1)
      .max(12000)
      .refine((text) => Array.from(text).every(isTypingCharacter)),
    duration: z.number().positive().max(600),
    events: z
      .array(z.object({ ms: z.number().min(0).max(600000), op: operation }))
      .max(15000),
    completed: z.boolean(),
    passed: z.boolean(),
  })
  .superRefine((r, ctx) => {
    if (
      r.events.some(
        (e, i) =>
          e.ms > r.duration * 1000 || (i > 0 && e.ms < r.events[i - 1].ms),
      )
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid event timeline' });
  });
export type Recording = z.infer<typeof recordingSchema>;
export type TimedOperation = { ms: number; op: Operation };
export const readRecordings = () =>
  readStored<Recording[]>(
    'typespeed.recordings',
    [],
    (v): v is Recording[] =>
      z.array(recordingSchema).max(20).safeParse(v).success,
  );
export function saveRecording(record: Recording) {
  if (!recordingSchema.safeParse(record).success) return false;
  const existing = readRecordings();
  const records = [record, ...existing.filter((r) => r.id !== record.id)].slice(
    0,
    20,
  );
  while (records.length) {
    if (saveStored('typespeed.recordings', records)) {
      if (record.completed && !existing.some((r) => r.id === record.id)) {
        const progress = readProgress();
        progress.completed++;
        const badges = achievements([
          {
            ...recordingScore(record),
            duration: record.duration,
            mode: record.mode.startsWith('daily') ? 'daily' : record.mode,
          },
        ])
          .filter((b) => b.unlocked)
          .map((b) => b.name);
        if (progress.completed >= 10) badges.push('Consistency');
        progress.unlocked = [...new Set([...progress.unlocked, ...badges])];
        progress.days = [
          record.date,
          ...progress.days.filter(
            (d) =>
              new Date(d).toDateString() !==
              new Date(record.date).toDateString(),
          ),
        ].slice(0, 370);
        if (record.mode === 'beginner' && record.passed)
          progress.lessons = [
            ...new Set([...progress.lessons, record.title]),
          ].slice(0, 20);
        if (!saveStored('typespeed.progress', progress)) return false;
      }
      return true;
    }
    records.pop();
  }
  return false;
}
export function replayState(record: Recording, ms = record.duration * 1000) {
  return record.events.reduce(
    (state, event) =>
      event.ms <= ms ? applyOperation(state, record.passage, event.op) : state,
    emptyState(),
  );
}
export const recordingScore = (r: Recording) =>
  score(replayState(r), r.passage, r.duration);
export function learningProfile(records = readRecordings()) {
  const keys: KeyProfile = {};
  const transitions: Record<string, { total: number; count: number }> = {};
  const missed = new Set<string>();
  for (const r of records) {
    let state = emptyState();
    let previous: { char: string; ms: number } | undefined;
    for (const e of r.events) {
      if (e.op.kind === 'insert' && state.typed.length < r.passage.length) {
        const expected = r.passage[state.typed.length];
        const entry = keys[expected] ?? { attempts: 0, errors: 0 };
        entry.attempts++;
        entry.errors += Number(e.op.char !== expected);
        keys[expected] = entry;
        if (e.op.char !== expected) {
          const start = r.passage.lastIndexOf(' ', state.typed.length - 1) + 1;
          const end = r.passage.indexOf(' ', state.typed.length);
          missed.add(r.passage.slice(start, end < 0 ? undefined : end));
        }
        if (
          previous &&
          e.op.char === expected &&
          e.ms - previous.ms > 0 &&
          e.ms - previous.ms < 3000
        ) {
          const pair = previous.char + expected;
          const t = transitions[pair] ?? { total: 0, count: 0 };
          t.total += e.ms - previous.ms;
          t.count++;
          transitions[pair] = t;
        }
        previous =
          e.op.char === expected ? { char: expected, ms: e.ms } : undefined;
      } else previous = undefined;
      state = applyOperation(state, r.passage, e.op);
    }
  }
  return {
    keys,
    missed: [...missed].slice(0, 150),
    transitions: Object.entries(transitions)
      .filter(([, v]) => v.count >= 5)
      .sort((a, b) => b[1].total / b[1].count - a[1].total / a[1].count)
      .slice(0, 8),
  };
}
const challengeSchema = z
  .object({
    v: z.literal(1),
    passage: z
      .string()
      .min(1)
      .max(12000)
      .refine((text) => Array.from(text).every(isTypingCharacter)),
    duration: z.number().positive().max(600),
    target: z.number().finite().min(0),
  })
  .strict();
export function challengeLink(
  passage: string,
  duration: number,
  target: number,
) {
  const data = challengeSchema.parse({ v: 1, passage, duration, target });
  return `${location.origin}/play?mode=friend#${encodeURIComponent(JSON.stringify(data))}`;
}
export function readChallenge(hash: string) {
  try {
    if (hash.length > 120000) return null;
    const data = challengeSchema.safeParse(
      JSON.parse(decodeURIComponent(hash.slice(1))),
    );
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}
export function downloadFile(
  name: string,
  content: string,
  type = 'application/json',
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportBackup() {
  downloadFile(
    'typespeed-progress.json',
    JSON.stringify({
      version: 1,
      recordings: readRecordings(),
      preferences: readAppearance(),
      goal: readWeeklyGoal(),
      progress: readProgress(),
    }),
  );
}
const appearanceSchema = z.object({
  layout: z.enum(['qwerty', 'azerty', 'dvorak', 'colemak']),
  caret: z.enum(['line', 'block', 'underline']),
  font: z.number().min(18).max(32),
  sound: z.boolean(),
  guide: z.boolean(),
  accent: z.enum(['mint', 'violet', 'amber']),
});
export const readAppearance = () =>
  readStored(
    'typespeed.appearance',
    {
      layout: 'qwerty',
      caret: 'line',
      font: 25,
      sound: false,
      guide: false,
      accent: 'mint',
    } as z.infer<typeof appearanceSchema>,
    (v): v is z.infer<typeof appearanceSchema> =>
      appearanceSchema.safeParse(v).success,
  );
export const readWeeklyGoal = () =>
  readStored(
    'typespeed.weeklyGoal',
    3,
    (v): v is number =>
      typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 7,
  );
export function importBackup(text: string) {
  if (text.length > 8_000_000) throw new Error('Backup exceeds 8 MB.');
  const data = z
    .object({
      version: z.literal(1),
      recordings: z.array(recordingSchema).max(20),
      preferences: appearanceSchema,
      goal: z.number().int().min(1).max(7),
      progress: progressSchema.optional(),
    })
    .parse(JSON.parse(text));
  // Store records first: the largest write must succeed before preferences change.
  if (!saveStored('typespeed.recordings', data.recordings))
    throw new Error(
      'Not enough browser storage. Existing records were preserved.',
    );
  if (
    !saveStored('typespeed.appearance', data.preferences) ||
    !saveStored('typespeed.weeklyGoal', data.goal)
  )
    throw new Error('Records imported; some preferences could not be saved.');
  if (
    !saveStored(
      'typespeed.progress',
      data.progress ?? { completed: 0, unlocked: [], days: [], lessons: [] },
    )
  )
    throw new Error('Progress summary could not be imported.');
}
export function weeklyDays(
  records: Pick<Recording, 'date' | 'completed'>[],
  now = new Date(),
) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return new Set(
    records
      .filter(
        (r) =>
          r.completed && new Date(r.date) >= start && new Date(r.date) <= now,
      )
      .map((r) => new Date(r.date).toDateString()),
  ).size;
}
