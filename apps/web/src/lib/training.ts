import {
  generatePassage,
  isTypingCharacter,
  type Difficulty,
} from '@typespeed/typing-engine';
export const modes = {
  words: 'English words',
  quotes: 'Original quotes',
  custom: 'Custom text',
  code: 'Developer code',
  spanish: 'Spanish words',
  french: 'French words',
  german: 'German words',
  weak: 'Weak-key drills',
  adaptive: 'Adaptive practice',
  daily: 'Daily challenge',
  ghost: 'Ghost race',
} as const;
export type PracticeMode = keyof typeof modes;
export type KeyProfile = Record<string, { attempts: number; errors: number }>;
export function seededRandom(seed: string) {
  let state = Array.from(seed).reduce(
    (n, c) => Math.imul(n ^ c.charCodeAt(0), 16777619) >>> 0,
    2166136261,
  );
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
export function weakestKeys(profile: KeyProfile) {
  return Object.entries(profile)
    .filter(([key, v]) => key !== ' ' && v.attempts >= 3 && v.errors > 0)
    .sort(
      (a, b) =>
        b[1].errors / b[1].attempts - a[1].errors / a[1].attempts ||
        b[1].attempts - a[1].attempts,
    )
    .slice(0, 5)
    .map(([key]) => key);
}
export function adaptiveDifficulty(
  history: { accuracy: number; wpm: number }[],
): Difficulty {
  const recent = history.slice(0, 5);
  if (!recent.length) return 'easy';
  const accuracy = recent.reduce((n, r) => n + r.accuracy, 0) / recent.length;
  const wpm = recent.reduce((n, r) => n + r.wpm, 0) / recent.length;
  return accuracy >= 98 && wpm >= 60
    ? 'hard'
    : accuracy >= 94 && wpm >= 30
      ? 'medium'
      : 'easy';
}
export function normalizeCustom(text: string) {
  return Array.from(text.normalize('NFC').replace(/\s+/g, ' '))
    .filter(isTypingCharacter)
    .join('')
    .trim()
    .slice(0, 6000);
}
const languageWords = {
  spanish:
    'tiempo casa amigo camino aprender escribir palabra mundo cielo agua mañana corazón rápido pequeño también después siempre vida libro ciudad trabajo familia nuevo mejor luz',
  french:
    'temps maison ami chemin apprendre écrire mot monde ciel eau matin cœur rapide petit aussi après toujours vie livre ville travail famille nouveau lumière été',
  german:
    'Zeit Haus Freund Weg lernen schreiben Wort Welt Himmel Wasser Morgen Herz schnell klein auch später immer Leben Buch Stadt Arbeit Familie neu besser Licht schön',
};
const quotes =
  'Small steps become lasting habits when we return to them with patience. A clear thought deserves a careful sentence. Let accuracy set the rhythm and speed follow with practice. Every quiet minute of attention is a chance to learn something new.';
const code =
  'const sum = (a, b) => a + b; function greet(name) { return `Hello, ${name}!`; } const values = [1, 2, 3].map(x => x * 2); if (ready && connected) { startRace(); } for (let i = 0; i < 5; i++) { count += i; }';
export function trainingPassage(
  mode: PracticeMode,
  options: { difficulty: Difficulty; punctuation: boolean; numbers: boolean },
  custom: string,
  profile: KeyProfile,
  history: { accuracy: number; wpm: number }[],
  day = new Date().toISOString().slice(0, 10),
) {
  if (mode === 'daily')
    return generatePassage(
      { difficulty: 'medium', punctuation: false, numbers: false },
      seededRandom(`typespeed-v1-${day}`),
    );
  if (mode === 'custom') return normalizeCustom(custom);
  if (mode === 'quotes' || mode === 'code')
    return Array(25)
      .fill(mode === 'quotes' ? quotes : code)
      .join(' ');
  if (mode in languageWords) {
    const bank = languageWords[mode as keyof typeof languageWords].split(' ');
    return Array.from(
      { length: 450 },
      () => bank[Math.floor(Math.random() * bank.length)],
    ).join(' ');
  }
  if (mode === 'weak' || mode === 'adaptive') {
    const keys = weakestKeys(profile);
    const difficulty =
      mode === 'adaptive' ? adaptiveDifficulty(history) : 'easy';
    const base = generatePassage({ ...options, difficulty });
    const targeted = base
      .split(' ')
      .filter((word) =>
        keys.some((key) => word.toLowerCase().includes(key.toLowerCase())),
      );
    return keys.length && targeted.length
      ? Array.from({ length: 450 }, (_, i) =>
          i % 3 === 0
            ? base.split(' ')[i % 450]
            : targeted[i % targeted.length],
        ).join(' ')
      : base;
  }
  return generatePassage(options);
}
export const layouts = {
  qwerty: ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'],
  azerty: ['azertyuiop', 'qsdfghjklm', 'wxcvbn'],
  dvorak: ["',.pyfgcrl", 'aoeuidhtns', ';qjkxbmwvz'],
  colemak: ['qwfpgjluy;', 'arstdhneio', 'zxcvbkm'],
} as const;
export function achievements(
  history: {
    accuracy: number;
    wpm: number;
    correct: number;
    duration: number;
    mode?: string;
  }[],
) {
  return [
    {
      name: 'First steps',
      detail: 'Finish a practice test',
      unlocked: history.length > 0,
    },
    {
      name: 'Finding flow',
      detail: 'Reach 40 validated WPM',
      unlocked: history.some((r) => r.wpm >= 40),
    },
    {
      name: 'Fast fingers',
      detail: 'Reach 80 validated WPM',
      unlocked: history.some((r) => r.wpm >= 80),
    },
    {
      name: 'Precision',
      detail: '100% accuracy with 25+ correct characters',
      unlocked: history.some((r) => r.accuracy === 100 && r.correct >= 25),
    },
    {
      name: 'Consistency',
      detail: 'Complete 10 tests in saved history',
      unlocked: history.length >= 10,
    },
    {
      name: 'Endurance',
      detail: 'Finish a 120-second test',
      unlocked: history.some((r) => r.duration === 120),
    },
    {
      name: 'Daily focus',
      detail: 'Complete a daily challenge',
      unlocked: history.some((r) => r.mode === 'daily'),
    },
  ];
}
