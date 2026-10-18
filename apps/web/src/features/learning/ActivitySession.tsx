import { useEffect, useRef, useState } from 'react';
import {
  applyOperation,
  emptyState,
  score,
  type Operation,
} from '@typespeed/typing-engine';
import { TypingArea } from '../../components/TypingArea';
import {
  PerformanceChart,
  type Sample,
} from '../../components/PerformanceChart';
import {
  challengePassed,
  clearedPrefix,
  type ActivityConfig,
} from '../../lib/activities';
import {
  challengeLink,
  downloadFile,
  readAppearance,
  replayState,
  saveRecording,
  type Recording,
  type TimedOperation,
} from '../../lib/learning';
import { layouts } from '../../lib/training';

export function KeyboardGuide({
  next,
  layout = 'qwerty',
}: {
  next: string;
  layout?: keyof typeof layouts;
}) {
  const finger = (key: string) =>
    'qazp'.includes(key)
      ? 'little finger'
      : 'wsxol'.includes(key)
        ? 'ring finger'
        : 'edcik'.includes(key)
          ? 'middle finger'
          : 'index finger';
  return (
    <div className="keyboard-guide" aria-label="Keyboard guide">
      {layouts[layout].map((row, i) => (
        <div key={i}>
          {Array.from(row).map((key) => (
            <span
              key={key}
              className={key === next.toLowerCase() ? 'key-next' : ''}
            >
              {key}
            </span>
          ))}
        </div>
      ))}
      <p>
        Next: {next === ' ' ? 'Space' : next || 'Complete'}
        {layout === 'qwerty' && /^[a-z]$/i.test(next)
          ? ` · ${finger(next.toLowerCase())}`
          : ''}
        . Guide only; your device controls its keyboard layout.
      </p>
    </div>
  );
}
export function ActivitySession({
  config,
  ghost,
  relaxed,
  onDone,
}: {
  config: ActivityConfig;
  ghost?: Recording;
  relaxed: boolean;
  onDone: (record: Recording) => void;
}) {
  const [state, setState] = useState(emptyState);
  const stateRef = useRef(state);
  const events = useRef<TimedOperation[]>([]);
  const start = useRef<number | null>(null);
  const done = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<Recording | null>(null);
  const [notice, setNotice] = useState('');
  const samples = useRef<Sample[]>([]);
  const stable = useRef(true);
  const wordStart = useRef(0);
  const [wordAge, setWordAge] = useState(0);
  const audio = useRef<AudioContext | null>(null);
  const [appearance] = useState(readAppearance);
  const mode = config.mode;
  const live = score(state, config.passage, Math.max(1, elapsed));
  const cleared = clearedPrefix(config.passage, state.typed);
  const words = cleared.count;
  const stability = Math.max(
    0,
    Math.min(
      100,
      100 + words * 4 - (state.attempts - state.correctAttempts) * 18,
    ),
  );
  const falling = mode === 'wordfall' || mode === 'defender';
  const boundary = config.passage.indexOf(
    ' ',
    falling ? cleared.offset : state.typed.length,
  );
  const wordEnd = boundary < 0 ? config.passage.length : boundary + 1;
  const wordBeginning = falling
    ? cleared.offset
    : config.passage.lastIndexOf(' ', Math.max(0, state.typed.length - 1)) + 1;
  const currentWord = config.passage.slice(wordBeginning, wordEnd).trim();
  const allowance = Math.max(
    2.5,
    (((wordEnd - wordBeginning) * 60) / (Math.max(15, config.target) * 5)) * 2,
  );
  function finish(seconds: number, completed: boolean) {
    if (done.current) return;
    done.current = true;
    const duration = Math.max(0.001, seconds);
    const metrics = score(stateRef.current, config.passage, duration);
    const record: Recording = {
      id: crypto.randomUUID(),
      title: config.title,
      mode,
      date: new Date().toISOString(),
      passage: config.passage,
      duration,
      events: events.current
        .filter((e) => e.ms <= duration * 1000 + 0.000001)
        .map((e) => ({ ...e, ms: Math.min(e.ms, duration * 1000) })),
      completed,
      passed:
        completed &&
        challengePassed(
          config,
          metrics.accuracy,
          metrics.correct,
          stateRef.current.typed.length === config.passage.length,
          metrics.wpm,
          stable.current,
        ),
    };
    setResult(record);
    setElapsed(duration);
    if (!saveRecording(record))
      setNotice(
        'Some session data could not be saved because browser storage is full or unavailable.',
      );
    onDone(record);
  }
  useEffect(() => {
    const timer = setInterval(() => {
      if (start.current === null || done.current) return;
      const seconds = (performance.now() - start.current) / 1000;
      setElapsed(Math.min(seconds, config.duration));
      setWordAge(seconds - wordStart.current);
      if (
        !relaxed &&
        falling &&
        wordStart.current + allowance < config.duration &&
        seconds > wordStart.current + allowance
      ) {
        finish(wordStart.current + allowance, false);
        return;
      }
      if (seconds >= config.duration) {
        finish(config.duration, !config.fixed);
        return;
      }
      if (Math.floor(seconds) > (samples.current.at(-1)?.seconds ?? 0)) {
        const value = score(stateRef.current, config.passage, seconds);
        samples.current.push({
          seconds: Math.floor(seconds),
          ...value,
          characters: stateRef.current.typed.length,
        });
        if (seconds >= 10 && Math.abs(value.wpm - config.target) > 10)
          stable.current = false;
      }
    }, 50);
    return () => clearInterval(timer);
  }, [config, relaxed, allowance]);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );
  function input(op: Operation) {
    if (done.current || !config.passage || events.current.length >= 15000)
      return;
    if (start.current === null && op.kind === 'delete') return;
    if (start.current === null) {
      start.current = performance.now();
      wordStart.current = 0;
    }
    const ms = performance.now() - start.current;
    if (
      !relaxed &&
      falling &&
      wordStart.current + allowance < config.duration &&
      ms / 1000 - wordStart.current > allowance
    ) {
      finish(wordStart.current + allowance, false);
      return;
    }
    if (ms >= config.duration * 1000) {
      finish(config.duration, !config.fixed);
      return;
    }
    const before = stateRef.current;
    if (falling && op.kind === 'insert' && before.typed.length >= wordEnd)
      return;
    const next = applyOperation(before, config.passage, op);
    if (next === before) return;
    events.current.push({ ms, op });
    stateRef.current = next;
    setState(next);
    if (
      clearedPrefix(config.passage, next.typed).offset >
      clearedPrefix(config.passage, before.typed).offset
    )
      wordStart.current = ms / 1000;
    if (appearance.sound && op.kind === 'insert') {
      try {
        audio.current ??= new AudioContext();
        void audio.current.resume();
        const oscillator = audio.current.createOscillator();
        const gain = audio.current.createGain();
        oscillator.frequency.value =
          next.correctAttempts > before.correctAttempts ? 440 : 180;
        gain.gain.setValueAtTime(0.025, audio.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          audio.current.currentTime + 0.04,
        );
        oscillator.connect(gain);
        gain.connect(audio.current.destination);
        oscillator.start();
        oscillator.stop(audio.current.currentTime + 0.04);
      } catch {
        /* Sound is optional. */
      }
    }
    if (mode === 'perfect25' && next.attempts > next.correctAttempts)
      finish(ms / 1000, false);
    else if (
      !relaxed &&
      mode === 'tower' &&
      100 +
        clearedPrefix(config.passage, next.typed).count * 4 -
        (next.attempts - next.correctAttempts) * 18 <=
        0
    )
      finish(ms / 1000, false);
    else if (next.typed.length === config.passage.length)
      finish(ms / 1000, true);
  }
  if (result) {
    const metrics = score(stateRef.current, config.passage, result.duration);
    return (
      <div className="panel result-view">
        <div className="eyebrow">
          {result.passed
            ? 'CHALLENGE COMPLETE'
            : result.completed
              ? 'SESSION COMPLETE'
              : 'TRY AGAIN'}{' '}
          · LOCAL RESULT
        </div>
        <h2>{config.title}</h2>
        <div className="result-grid">
          <div>
            <strong>{metrics.wpm.toFixed(1)}</strong>
            <span>Validated WPM</span>
          </div>
          <div>
            <strong>{metrics.accuracy.toFixed(1)}%</strong>
            <span>Accuracy, including corrections</span>
          </div>
          <div>
            <strong>{metrics.correct}</strong>
            <span>Correct characters</span>
          </div>
        </div>
        <p>
          {result.duration.toFixed(1)} seconds · {metrics.incorrectAttempts}{' '}
          incorrect attempts.{' '}
          {result.passed
            ? 'Goal achieved.'
            : 'Keep practicing; your attempt still counts toward practice time.'}
        </p>
        <PerformanceChart samples={samples.current} />
        <div className="action-row">
          <a className="quiet" href="/play?mode=mistakes">
            Practice these mistakes
          </a>
          <a className="quiet" href="/games?focus=mistakes">
            Play with weak words
          </a>
          <a className="quiet" href="/replays">
            Inspect replay
          </a>
          <button
            className="quiet"
            onClick={() => {
              const text = `TypeSpeed — ${config.title}\n${metrics.wpm.toFixed(1)} WPM · ${metrics.accuracy.toFixed(1)}% accuracy\n${result.duration.toFixed(1)} seconds · Local, unverified result\n${location.origin}`;
              downloadFile(
                'typespeed-result.svg',
                `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="360"><rect width="720" height="360" rx="28" fill="#142238"/><text x="45" y="65" fill="#9cebd9" font-family="sans-serif" font-size="28">TypeSpeed</text>${text
                  .split('\n')
                  .map(
                    (line, i) =>
                      `<text x="45" y="${115 + i * 45}" fill="#eff5ff" font-family="sans-serif" font-size="20">${line.replace(/[<>&"]/g, '')}</text>`,
                  )
                  .join('')}</svg>`,
                'image/svg+xml',
              );
            }}
          >
            Download result card
          </button>
          <button
            className="quiet"
            onClick={async () => {
              const url = challengeLink(
                config.passage,
                result.duration,
                metrics.wpm,
              );
              try {
                await navigator.clipboard.writeText(url);
                setNotice(
                  'Challenge link copied. The target score is unverified.',
                );
              } catch {
                setNotice(url);
              }
            }}
          >
            Copy friend challenge
          </button>
        </div>
        {notice && (
          <p role="status" className="break-text">
            {notice}
          </p>
        )}
      </div>
    );
  }
  const ghostPosition = ghost
    ? replayState(ghost, elapsed * 1000).typed.length
    : 0;
  const gaps = events.current
    .filter((e) => e.op.kind === 'insert')
    .slice(-12)
    .map((e, i, a) => (i ? e.ms - a[i - 1].ms : 0))
    .slice(1);
  const mean = gaps.reduce((a, b) => a + b, 0) / Math.max(1, gaps.length);
  const rhythm = Math.max(
    0,
    100 -
      (gaps.reduce((a, b) => a + Math.abs(b - mean), 0) /
        Math.max(1, gaps.length) /
        Math.max(1, mean)) *
        100,
  );
  return (
    <div
      className={`practice-panel activity-session caret-${appearance.caret} accent-${appearance.accent}`}
      style={{ '--typing-size': `${appearance.font}px` } as React.CSSProperties}
    >
      <div className="live-stats">
        <strong>{Math.ceil(config.duration - elapsed)}s</strong>
        <span>{live.wpm.toFixed(0)} WPM</span>
        <span>{state.attempts ? live.accuracy.toFixed(1) : 100}% accuracy</span>
        <span>{words} words</span>
      </div>
      {(mode === 'wordfall' || mode === 'defender') && (
        <div
          className={`game-stage ${mode}`}
          aria-label={
            mode === 'wordfall'
              ? 'Falling word arena'
              : 'Approaching target arena'
          }
        >
          <span
            className="game-target"
            style={{
              top: `${Math.min(80, (wordAge / allowance) * 80)}%`,
              left:
                mode === 'defender'
                  ? `${75 - Math.min(60, (wordAge / allowance) * 60)}%`
                  : '40%',
            }}
          >
            {currentWord}
          </span>
          <span className="game-ground">
            {relaxed
              ? 'Relaxed: no elimination'
              : `Clear each word and its space within ${allowance.toFixed(1)}s`}{' '}
            · Wave {Math.floor(words / 10) + 1}
          </span>
        </div>
      )}
      {mode === 'tower' && (
        <div className="tower-stage" aria-label="Precision tower">
          <div>
            {Array.from({ length: Math.min(15, words) }, (_, i) => (
              <span key={i} style={{ width: `${150 - i * 4}px` }} />
            ))}
          </div>
          <p>
            {words} blocks · {stability}% stability {relaxed ? '· relaxed' : ''}
          </p>
        </div>
      )}
      {(mode === 'rally' || mode === 'ghost') && (
        <div className="rally-track">
          <div
            style={{
              width: `${Math.min(100, (state.typed.length / config.passage.length) * 100)}%`,
            }}
          >
            You ◆
          </div>
          {ghost && (
            <div
              className="ghost-lane"
              style={{
                width: `${(ghostPosition / config.passage.length) * 100}%`,
              }}
            >
              Ghost ◇
            </div>
          )}
          <p>
            {ghost
              ? `${state.typed.length - ghostPosition} characters versus your replay`
              : `${Math.round(live.correct / 5)} distance points · cosmetic trail earned by accurate typing`}
          </p>
        </div>
      )}
      {mode === 'rhythm' && (
        <div className="rhythm-stage">
          <div style={{ width: `${rhythm}%` }} />
          <p>
            Rhythm stability: {Math.round(rhythm)}% · based on recent keystroke
            intervals
          </p>
        </div>
      )}
      {mode === 'consistency' && (
        <p className="race-tip">
          Target {config.target} WPM ±10. The first 10 seconds are a warm-up.
        </p>
      )}
      {mode === 'ladder' && (
        <p className="race-tip">
          Target {config.target.toFixed(1)} WPM and 95% accuracy.
        </p>
      )}
      <TypingArea
        passage={config.passage}
        typed={state.typed}
        onOperation={input}
        multiline={config.passage.includes('\n')}
      />
      {(appearance.guide || mode === 'beginner') && (
        <KeyboardGuide
          next={config.passage[state.typed.length] ?? ''}
          layout={appearance.layout}
        />
      )}
      <p className="race-tip">
        {mode === 'code'
          ? 'Code mode: Enter inserts a new line; type two spaces for indentation. Tab remains keyboard navigation. '
          : ''}
        Start typing to begin. Backspace corrects text; original errors remain
        in accuracy.{' '}
        {config.fixed ? 'Finish the passage within 10 minutes.' : 'Timed test.'}
      </p>
    </div>
  );
}
