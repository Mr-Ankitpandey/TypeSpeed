import type { Score } from '@typespeed/typing-engine';
export type Result = Score & {
  id: string;
  date: string;
  duration: number;
  difficulty: string;
};
export function readStored<T>(
  key: string,
  fallback: T,
  validate: (value: unknown) => value is T,
): T {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    return validate(value) ? value : fallback;
  } catch {
    return fallback;
  }
}
export function saveStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export const readHistory = () =>
  readStored<Result[]>(
    'typespeed.history',
    [],
    (v): v is Result[] =>
      Array.isArray(v) &&
      v.every(
        (r) =>
          r &&
          typeof r.id === 'string' &&
          typeof r.date === 'string' &&
          Number.isFinite(r.wpm) &&
          Number.isFinite(r.accuracy) &&
          Number.isFinite(r.duration),
      ),
  );
