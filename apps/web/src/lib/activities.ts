import { generatePassage } from '@typespeed/typing-engine';
import { adaptiveDifficulty, seededRandom, trainingPassage } from './training';
import { learningProfile, readRecordings, recordingScore } from './learning';
export const activities = {
  dailySprint: [
    'Daily sprint',
    'The same 30-second passage for everyone today.',
    'Daily',
  ],
  dailyAccuracy: [
    'Daily accuracy',
    '60 seconds, at least 98% accuracy and 25 correct characters.',
    'Daily',
  ],
  dailyPunctuation: [
    'Daily punctuation',
    '60 seconds of capitals and punctuation. Aim for 95% accuracy.',
    'Daily',
  ],
  mistakes: [
    'Practice my mistakes',
    'Words you missed in recent saved sessions.',
    'Training',
  ],
  adaptive: [
    'Adaptive practice',
    'Difficulty based on your last five sessions.',
    'Training',
  ],
  ghost: [
    'Race your ghost',
    'Replay a saved performance on the identical passage.',
    'Training',
  ],
  plan: [
    'Five-minute practice plan',
    'Warm up, target weaknesses, then benchmark.',
    'Training',
  ],
  clean100: [
    'Clean 100',
    'Complete 100 words with at least 98% accuracy.',
    'Challenges',
  ],
  perfect25: [
    'Perfect 25',
    'Complete 25 words without an incorrect attempt.',
    'Challenges',
  ],
  consistency: [
    'Consistency run',
    'Stay within 10 WPM of your chosen pace for 60 seconds.',
    'Challenges',
  ],
  punctuation: [
    'Punctuation pro',
    'Practice full sentences with punctuation.',
    'Challenges',
  ],
  numbers: [
    'Number sprint',
    'Practice dates, amounts and numerical sequences.',
    'Challenges',
  ],
  code: [
    'Code sprint',
    'Practice symbols, brackets and developer expressions.',
    'Challenges',
  ],
  ladder: [
    'Personal best ladder',
    'Beat your recent comparable 60-second benchmark by 2 WPM at 95% accuracy.',
    'Challenges',
  ],
  wordfall: [
    'Wordfall',
    'Clear the falling word before it crosses the boundary.',
    'Games',
  ],
  tower: [
    'Precision tower',
    'Build glass blocks with clean words. Recover stability after mistakes.',
    'Games',
  ],
  defender: [
    'Keyboard defender',
    'Clear approaching targets; each wave adds keyboard variety.',
    'Games',
  ],
  rally: [
    'TypeSpeed rally',
    'Travel a neon track through accurate typing.',
    'Games',
  ],
  rhythm: [
    'Rhythm flow',
    'Build a flowing pattern by keeping a steady typing rhythm.',
    'Games',
  ],
  story: [
    'Story quest',
    'Complete original chapters and choose your next path.',
    'Games',
  ],
  beginner: [
    'Beginner learning path',
    'Progress from home-row keys to complete sentences.',
    'Learning',
  ],
  custom: ['Custom text', 'Practice your own text locally.', 'Learning'],
  spanish: [
    'Spanish practice',
    'Practice common Spanish words and accents.',
    'Learning',
  ],
  french: [
    'French practice',
    'Practice common French words and accents.',
    'Learning',
  ],
  german: [
    'German practice',
    'Practice common German words and accents.',
    'Learning',
  ],
  friend: [
    'Friend challenge',
    'Attempt a shared passage and an unverified target score.',
    'Social',
  ],
} as const;
export type Activity = keyof typeof activities;
export function clearedPrefix(passage: string, typed: string) {
  let offset = 0,
    count = 0;
  for (const word of passage.split(' ')) {
    const end = Math.min(passage.length, offset + word.length + 1);
    if (typed.slice(offset, end) !== passage.slice(offset, end)) break;
    offset = end;
    count++;
  }
  return { offset, count };
}
export const lessons = [
  ['Home row anchors', 'f j ff jj fj jf fff jjj fjf jfj'],
  ['Home row reach', 'asdf jkl as sad lad fall flask ask all'],
  ['Top row', 'quiet write power tree queue type route'],
  ['Bottom row', 'zebra mix cave box brave move zoom'],
  ['Capitals and punctuation', 'A fresh start. Keep calm, and type with care!'],
  [
    'Everyday sentences',
    'The morning light fills the room. We practice a little every day.',
  ],
];
export const stories = [
  [
    'The glass observatory',
    'Mira found a quiet observatory above the city. Inside, a glass map glowed with two paths: one followed the river, and one climbed toward the stars. She placed her hands on the old keyboard and opened the door.',
  ],
  [
    'Along the river',
    'The river carried tiny lights beneath a silver bridge. Mira typed a message to the keeper, who answered with a map of the forgotten garden. Together they repaired the gate and watched the sleeping flowers open.',
  ],
  [
    'Toward the stars',
    'Above the clouds, a small station waited in silence. Mira restored its signal one careful word at a time. A distant voice replied. The lost explorers could finally see the way home, and the sky filled with returning lights.',
  ],
];
export type ActivityConfig = {
  mode: Activity;
  passage: string;
  duration: number;
  fixed: boolean;
  target: number;
  title: string;
};
export function activityConfig(
  mode: Activity,
  custom = '',
  level = 0,
  target = 40,
  day = new Date().toISOString().slice(0, 10),
): ActivityConfig {
  const records = readRecordings();
  const profile = learningProfile(records);
  const history = records.filter((r) => r.completed).map(recordingScore);
  let passage = generatePassage({
    difficulty: 'easy',
    punctuation: false,
    numbers: false,
  });
  let duration = 60;
  let fixed = false;
  if (mode.startsWith('daily')) {
    passage = generatePassage(
      {
        difficulty: 'medium',
        punctuation: mode === 'dailyPunctuation',
        numbers: false,
      },
      seededRandom(`trio-v1:${day}:${mode}`),
    );
    duration = mode === 'dailySprint' ? 30 : 60;
  }
  if (mode === 'mistakes')
    passage = (
      profile.missed.length
        ? profile.missed.join(' ')
        : 'steady careful practice focus accuracy'
    ).repeat(1); // Expanded below without joining words.
  if (mode === 'mistakes') passage = Array(30).fill(passage).join(' ');
  if (mode === 'adaptive')
    passage = trainingPassage(
      'adaptive',
      {
        difficulty: adaptiveDifficulty(history),
        punctuation: false,
        numbers: false,
      },
      '',
      profile.keys,
      history,
    );
  if (mode === 'plan') {
    duration = level === 0 ? 60 : 120;
    passage =
      level === 1
        ? activityConfig('mistakes').passage
        : generatePassage({
            difficulty: level === 0 ? 'easy' : adaptiveDifficulty(history),
            punctuation: false,
            numbers: false,
          });
  }
  if (mode === 'clean100' || mode === 'perfect25') {
    passage = passage
      .split(' ')
      .slice(0, mode === 'clean100' ? 100 : 25)
      .join(' ');
    fixed = true;
    duration = 600;
  }
  if (mode === 'punctuation')
    passage = generatePassage({
      difficulty: 'medium',
      punctuation: true,
      numbers: false,
    });
  if (mode === 'numbers')
    passage = Array.from(
      { length: 200 },
      (_, i) =>
        ['2026-10-18', '12:45', '$24.50', '1234567890', '98.75%', `${i + 100}`][
          i % 6
        ],
    ).join(' ');
  if (
    mode === 'code' ||
    mode === 'spanish' ||
    mode === 'french' ||
    mode === 'german'
  )
    passage = trainingPassage(
      mode,
      { difficulty: 'medium', punctuation: false, numbers: false },
      '',
      profile.keys,
      history,
    );
  if (mode === 'code')
    passage = Array(12)
      .fill(
        'function total(values) {\n  let sum = 0;\n  for (const value of values) {\n    sum += value;\n  }\n  return sum;\n}',
      )
      .join('\n\n');
  if (mode === 'custom') {
    passage = trainingPassage(
      'custom',
      { difficulty: 'easy', punctuation: false, numbers: false },
      custom,
      {},
      [],
    );
    fixed = true;
    duration = 600;
  }
  if (mode === 'ladder') {
    const comparable = records
      .filter((r) => r.mode === 'ladder' && r.completed)
      .slice(0, 5);
    target = comparable.length
      ? Math.max(...comparable.map((r) => recordingScore(r).wpm)) + 2
      : 20;
  }
  if (mode === 'beginner') {
    passage = Array(3)
      .fill(lessons[Math.min(level, lessons.length - 1)][1])
      .join(' ');
    fixed = true;
    duration = 600;
  }
  if (mode === 'story') {
    passage = stories[Math.min(level, stories.length - 1)][1];
    fixed = true;
    duration = 600;
  }
  if (mode === 'defender')
    passage = generatePassage({
      difficulty: 'easy',
      punctuation: false,
      numbers: false,
    })
      .split(' ')
      .slice(0, 10)
      .concat(
        generatePassage({
          difficulty: 'medium',
          punctuation: true,
          numbers: true,
        }).split(' '),
      )
      .join(' ');
  const title =
    mode === 'beginner'
      ? `Lesson: ${lessons[level][0]}`
      : mode === 'story'
        ? stories[level][0]
        : mode === 'plan'
          ? `Practice plan: stage ${level + 1} of 3`
          : activities[mode][0];
  return { mode, passage, duration, fixed, target, title };
}
export function challengePassed(
  config: ActivityConfig,
  accuracy: number,
  correct: number,
  finished: boolean,
  wpm: number,
  steady: boolean,
) {
  if (config.mode === 'perfect25') return finished && accuracy === 100;
  if (config.mode === 'clean100') return finished && accuracy >= 98;
  if (config.mode === 'dailyAccuracy') return accuracy >= 98 && correct >= 25;
  if (config.mode === 'consistency')
    return steady && accuracy >= 95 && correct >= 25;
  if (config.mode === 'ladder' || config.mode === 'friend')
    return wpm >= config.target && accuracy >= 95;
  if (config.mode === 'beginner') return finished && accuracy >= 95;
  return (config.fixed ? finished : correct >= 25) && accuracy >= 95;
}
