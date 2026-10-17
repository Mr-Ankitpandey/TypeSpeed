export type Operation = { kind: 'insert'; char: string } | { kind: 'delete' };
export type TypingState = {
  typed: string;
  attempts: number;
  correctAttempts: number;
  backspaces: number;
};
export const emptyState = (): TypingState => ({
  typed: '',
  attempts: 0,
  correctAttempts: 0,
  backspaces: 0,
});

/** Append-only typing with backspace. Corrections never erase attempt history. */
export function applyOperation(
  state: TypingState,
  passage: string,
  operation: Operation,
): TypingState {
  if (operation.kind === 'delete')
    return {
      ...state,
      typed: state.typed.slice(0, -1),
      backspaces: state.backspaces + 1,
    };
  if (
    !/^[\x20-\x7e]$/.test(operation.char) ||
    state.typed.length >= passage.length
  )
    return state;
  return {
    ...state,
    typed: state.typed + operation.char,
    attempts: state.attempts + 1,
    correctAttempts:
      state.correctAttempts +
      Number(operation.char === passage[state.typed.length]),
  };
}

export function score(state: TypingState, passage: string, seconds: number) {
  const correct = [...state.typed].reduce(
    (count, char, index) => count + Number(char === passage[index]),
    0,
  );
  const minutes = Math.max(seconds, 0.001) / 60;
  return {
    wpm: correct / 5 / minutes,
    rawWpm: state.attempts / 5 / minutes,
    accuracy: state.attempts
      ? (state.correctAttempts / state.attempts) * 100
      : 0,
    correct,
    incorrectAttempts: state.attempts - state.correctAttempts,
    uncorrectedErrors: state.typed.length - correct,
    backspaces: state.backspaces,
    progress: passage.length ? state.typed.length / passage.length : 0,
  };
}
export type Score = ReturnType<typeof score>;
export function rankPlayers<T extends { id: string; score: Score }>(
  players: T[],
) {
  const compare = (a: T, b: T) =>
    Number(b.score.accuracy >= 95) - Number(a.score.accuracy >= 95) ||
    b.score.wpm - a.score.wpm ||
    b.score.accuracy - a.score.accuracy ||
    a.score.incorrectAttempts - b.score.incorrectAttempts;
  const sorted = [...players].sort(compare);
  let rank = 1;
  return sorted.map((player, index) => {
    if (index && compare(player, sorted[index - 1]) !== 0) rank = index + 1;
    return { ...player, rank, eligible: player.score.accuracy >= 95 };
  });
}

const words = {
  easy: 'the sun and sky make a bright day we can find our way home with a good friend take your time to see how far you go each small step will help you grow keep an open mind let the world show you something new water light green tree soft wind slow down feel free look up think well write more read book walk path warm smile calm place',
  medium:
    'steady practice brings progress through patient effort discover another moment between quiet mornings and distant horizons build something meaningful explore different ideas follow your curiosity create space for thought balance focus rhythm journey wonder natural simple motion gentle change learning together future beyond become thoughtful inspire imagine',
  hard: 'extraordinary synchronization ambiguous philosophy perseverance juxtaposition architecture quintessential conscientious phenomenon equilibrium sophisticated resilience algorithmic kaleidoscope ubiquitous heterogeneous meticulous susceptibility asynchronous punctuation collaborative interpretation entrepreneurship',
};
export type Difficulty = keyof typeof words;
export type ContentOptions = {
  difficulty: Difficulty;
  punctuation: boolean;
  numbers: boolean;
};
/** Original bundled word banks; injectable randomness enables deterministic tests. */
export function generatePassage(
  options: ContentOptions,
  random: () => number = Math.random,
  count = 450,
) {
  const bank = words[options.difficulty].split(' ');
  return Array.from({ length: count }, (_, i) => {
    let word = bank[Math.floor(random() * bank.length)];
    if (options.numbers && i % 11 === 7)
      word = String(Math.floor(random() * 1000));
    if (options.punctuation && i % 9 === 8)
      word += ['.', ',', '?'][Math.floor(random() * 3)];
    return word;
  }).join(' ');
}
