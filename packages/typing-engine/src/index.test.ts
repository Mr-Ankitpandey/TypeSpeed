import { describe, it, expect } from 'vitest';
import {
  applyOperation,
  emptyState,
  score,
  rankPlayers,
  generatePassage,
} from './index';
describe('typing and scoring', () => {
  it('retains wrong attempts after correction', () => {
    let state = applyOperation(emptyState(), 'cat', {
      kind: 'insert',
      char: 'x',
    });
    state = applyOperation(state, 'cat', { kind: 'delete' });
    for (const char of 'cat')
      state = applyOperation(state, 'cat', { kind: 'insert', char });
    expect(score(state, 'cat', 30)).toMatchObject({
      wpm: 1.2,
      rawWpm: 1.6,
      accuracy: 75,
      correct: 3,
      incorrectAttempts: 1,
      uncorrectedErrors: 0,
      backspaces: 1,
    });
  });
  it('counts retained errors and rejects non-printable/pasted input', () => {
    let state = applyOperation(emptyState(), 'cat', {
      kind: 'insert',
      char: 'x',
    });
    expect(score(state, 'cat', 60).uncorrectedErrors).toBe(1);
    state = applyOperation(state, 'cat', { kind: 'insert', char: 'paste' });
    expect(state.attempts).toBe(1);
    expect(applyOperation(emptyState(), 'cat', { kind: 'delete' }).typed).toBe(
      '',
    );
  });
  it('ranks eligibility first, supports shared ranks and preserves precision', () => {
    const base = score(emptyState(), '', 60);
    const ranks = rankPlayers([
      { id: 'fast', score: { ...base, wpm: 100, accuracy: 90 } },
      { id: 'a', score: { ...base, wpm: 50, accuracy: 99 } },
      { id: 'b', score: { ...base, wpm: 50, accuracy: 99 } },
    ]);
    expect(ranks.map((p) => [p.id, p.rank])).toEqual([
      ['a', 1],
      ['b', 1],
      ['fast', 3],
    ]);
    expect(ranks[2].eligible).toBe(false);
  });
  it('generates deterministic bundled content', () => {
    expect(
      generatePassage(
        { difficulty: 'easy', punctuation: false, numbers: false },
        () => 0,
        3,
      ),
    ).toBe('the the the');
  });
});
