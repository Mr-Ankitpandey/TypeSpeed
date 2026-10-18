import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  learningProfile,
  recordingSchema,
  replayState,
  saveRecording,
  readRecordings,
  readChallenge,
  challengeLink,
  importBackup,
  weeklyDays,
  readProgress,
  type Recording,
} from './learning';
import { activityConfig, challengePassed } from './activities';
import { normalizeCustom } from './training';
const record: Recording = {
  id: 'test',
  title: 'Test',
  mode: 'practice',
  date: '2026-10-18T00:00:00.000Z',
  passage: 'cat',
  duration: 30,
  events: [
    { ms: 0, op: { kind: 'insert', char: 'x' } },
    { ms: 100, op: { kind: 'delete' } },
    { ms: 200, op: { kind: 'insert', char: 'c' } },
    { ms: 300, op: { kind: 'insert', char: 'a' } },
    { ms: 400, op: { kind: 'insert', char: 't' } },
  ],
  completed: true,
  passed: false,
};
beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
  });
  vi.stubGlobal('location', { origin: 'https://typespeed.example' });
});
describe('learning records and challenge rules', () => {
  it('replays corrections at their actual timestamps and targets expected keys', () => {
    expect(replayState(record, 50).typed).toBe('x');
    expect(replayState(record, 100).typed).toBe('');
    expect(replayState(record).typed).toBe('cat');
    const profile = learningProfile([record]);
    expect(profile.keys.c).toEqual({ attempts: 2, errors: 1 });
    expect(profile.missed).toEqual(['cat']);
  });
  it('rejects impossible and out-of-order timelines', () => {
    expect(
      recordingSchema.safeParse({
        ...record,
        events: [{ ms: 31000, op: { kind: 'delete' } }],
      }).success,
    ).toBe(false);
    expect(
      recordingSchema.safeParse({
        ...record,
        events: [record.events[2], record.events[1]],
      }).success,
    ).toBe(false);
  });
  it('bounds recordings and tolerates denied storage', () => {
    for (let i = 0; i < 25; i++)
      expect(saveRecording({ ...record, id: String(i) })).toBe(true);
    expect(readRecordings()).toHaveLength(20);
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw Error();
      },
      setItem: () => {
        throw Error();
      },
    });
    expect(saveRecording(record)).toBe(false);
    expect(readRecordings()).toEqual([]);
  });
  it('keeps daily content reproducible and changes it on another UTC day', () => {
    const a = activityConfig('dailySprint', '', 0, 40, '2026-10-18');
    expect(activityConfig('dailySprint', '', 0, 40, '2026-10-18')).toEqual(a);
    expect(
      activityConfig('dailySprint', '', 0, 40, '2026-10-19').passage,
    ).not.toBe(a.passage);
    expect(activityConfig('dailyAccuracy').duration).toBe(60);
  });
  it('enforces fixed-count accuracy and consistency goals', () => {
    expect(activityConfig('clean100').passage.split(' ')).toHaveLength(100);
    expect(activityConfig('perfect25').passage.split(' ')).toHaveLength(25);
    expect(
      challengePassed(activityConfig('perfect25'), 99, 100, true, 50, true),
    ).toBe(false);
    expect(
      challengePassed(activityConfig('consistency'), 100, 100, true, 40, false),
    ).toBe(false);
  });
  it('round trips a full challenge without truncation and rejects malformed links', () => {
    const passage = 'word '.repeat(600);
    const link = challengeLink(passage, 30.25, 42);
    expect(readChallenge(link.slice(link.indexOf('#')))).toMatchObject({
      passage,
      duration: 30.25,
      target: 42,
    });
    expect(readChallenge('#bad')).toBeNull();
    expect(
      readChallenge(
        '#' +
          encodeURIComponent(
            JSON.stringify({ v: 1, passage: 'a', duration: -1, target: 1 }),
          ),
      ),
    ).toBeNull();
  });
  it('normalizes unsupported custom characters and preserves Latin accents', () => {
    expect(normalizeCustom('  café\n mañana 😀 ')).toBe('café mañana');
  });
  it('validates imports before replacing stored records', () => {
    saveRecording(record);
    expect(() => importBackup('{"version":1,"recordings":[{}]}')).toThrow();
    expect(readRecordings()).toHaveLength(1);
  });
  it('counts unique completed practice days in the current week', () => {
    expect(
      weeklyDays(
        [
          record,
          { ...record },
          { ...record, date: '2026-10-01T00:00:00.000Z' },
        ],
        new Date('2026-10-18T12:00:00.000Z'),
      ),
    ).toBe(1);
  });
  it('retains earned milestones after old recordings rotate out without double counting a saved id', () => {
    saveRecording(record);
    saveRecording(record);
    expect(readProgress().completed).toBe(1);
    for (let i = 0; i < 25; i++) saveRecording({ ...record, id: `next-${i}` });
    expect(readRecordings().some((r) => r.id === 'test')).toBe(false);
    expect(readProgress().completed).toBe(26);
    expect(readProgress().unlocked).toContain('Consistency');
  });
});
