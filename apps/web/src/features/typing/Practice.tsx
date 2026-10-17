import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  RotateCcw,
  Timer,
  Zap,
  Target,
  Keyboard,
} from 'lucide-react';
import {
  applyOperation,
  emptyState,
  generatePassage,
  score,
  type Difficulty,
  type Operation,
  type TypingState,
} from '@typespeed/typing-engine';
import { TypingArea } from '../../components/TypingArea';
import { readHistory, saveStored, type Result } from '../../lib/storage';
import { readPreferences } from '../../lib/preferences';
import {
  PerformanceChart,
  type Sample,
} from '../../components/PerformanceChart';

export function Practice() {
  const [preferences] = useState(readPreferences);
  const [duration, setDuration] = useState<number>(preferences.duration);
  const [difficulty, setDifficulty] = useState<Difficulty>(
    preferences.difficulty,
  );
  const [punctuation, setPunctuation] = useState(preferences.punctuation);
  const [numbers, setNumbers] = useState(preferences.numbers);
  const samples = useRef<Sample[]>([]);
  const [passage, setPassage] = useState(() =>
    generatePassage({ difficulty, punctuation, numbers }),
  );
  const [state, setState] = useState(emptyState);
  const stateRef = useRef<TypingState>(state);
  const started = useRef<number | null>(null);
  const ended = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [storageWarning, setStorageWarning] = useState(false);
  const reset = () => {
    started.current = null;
    ended.current = false;
    stateRef.current = emptyState();
    setState(stateRef.current);
    setElapsed(0);
    setResult(null);
    samples.current = [];
    setPassage(generatePassage({ difficulty, punctuation, numbers }));
  };
  useEffect(() => {
    saveStored('typespeed.practice', {
      duration,
      difficulty,
      punctuation,
      numbers,
    });
    reset(); /* A configuration change begins a fresh test. */
  }, [duration, difficulty, punctuation, numbers]);
  const finish = () => {
    if (ended.current) return;
    ended.current = true;
    const next = {
      ...score(stateRef.current, passage, duration),
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      duration,
      difficulty,
      samples: [
        ...samples.current,
        {
          seconds: duration,
          ...score(stateRef.current, passage, duration),
          characters: stateRef.current.typed.length,
        },
      ],
    };
    setResult(next);
    setElapsed(duration);
    setStorageWarning(
      !saveStored('typespeed.history', [next, ...readHistory()].slice(0, 200)),
    );
  };
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (started.current !== null && !ended.current) {
        const next = (performance.now() - started.current) / 1000;
        setElapsed(Math.min(next, duration));
        if (
          next < duration &&
          Math.floor(next) > (samples.current.at(-1)?.seconds ?? 0)
        )
          samples.current.push({
            seconds: Math.floor(next),
            ...score(stateRef.current, passage, next),
            characters: stateRef.current.typed.length,
          });
        if (next >= duration) finish();
      }
    }, 100);
    return () => clearInterval(timer);
  }, [duration, passage, difficulty]);
  function input(op: Operation) {
    if (ended.current) return;
    if (started.current === null && op.kind === 'delete') return;
    if (started.current === null) started.current = performance.now();
    if ((performance.now() - started.current) / 1000 >= duration) {
      finish();
      return;
    }
    stateRef.current = applyOperation(stateRef.current, passage, op);
    setState(stateRef.current);
  }
  const live = score(state, passage, Math.max(elapsed, 1));
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">
          <span className="live-dot" /> YOUR DAILY MOMENT OF FOCUS
        </div>
        <h1>
          Find your <em>flow.</em>
        </h1>
        <p>A little practice. A little faster. A little better, every day.</p>
      </div>
      <div className="practice-panel">
        <div className="test-controls">
          <div className="segmented" aria-label="Test duration">
            <Timer size={16} />
            {[15, 30, 60, 120].map((s) => (
              <button
                key={s}
                className={duration === s ? 'selected' : ''}
                onClick={() => setDuration(s)}
              >
                {s}
                <span>s</span>
              </button>
            ))}
          </div>
          <span className="divider" />
          <div className="segmented">
            {(['easy', 'medium', 'hard'] as const).map((d) => (
              <button
                key={d}
                className={difficulty === d ? 'selected' : ''}
                onClick={() => setDifficulty(d)}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="toggles">
            <button
              aria-pressed={punctuation}
              className={punctuation ? 'active' : ''}
              onClick={() => setPunctuation(!punctuation)}
            >
              ＠ punctuation
            </button>
            <button
              aria-pressed={numbers}
              className={numbers ? 'active' : ''}
              onClick={() => setNumbers(!numbers)}
            >
              ＃ numbers
            </button>
          </div>
        </div>
        {result ? (
          <div className="result-view">
            <div className="eyebrow">PRACTICE COMPLETE</div>
            <h2>One step faster.</h2>
            <div className="result-grid">
              {[
                ['Validated WPM', result.wpm.toFixed(1)],
                ['Raw WPM', result.rawWpm.toFixed(1)],
                ['Accuracy', `${result.accuracy.toFixed(1)}%`],
                ['Correct characters', result.correct],
                ['Incorrect attempts', result.incorrectAttempts],
                ['Uncorrected errors', result.uncorrectedErrors],
              ].map(([label, value]) => (
                <div key={label}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <p>
              {duration} seconds · {difficulty} · {result.backspaces} backspaces
            </p>
            <PerformanceChart samples={result.samples ?? []} />
            <button className="primary" onClick={reset}>
              Try again <RotateCcw size={16} />
            </button>
            {storageWarning && (
              <p role="status">
                Browser storage is unavailable. This result could not be saved.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="live-stats">
              <div className="time-left">
                <span>{Math.ceil(duration - elapsed)}</span>
                <small>seconds left</small>
              </div>
              <div>
                <Zap size={15} />
                <strong>{elapsed ? Math.round(live.wpm) : 0}</strong>
                <span>wpm</span>
              </div>
              <div>
                <Target size={15} />
                <strong>
                  {state.attempts ? Math.round(live.accuracy) : 100}%
                </strong>
                <span>accuracy</span>
              </div>
              <span className="language">
                ENGLISH <span>•</span> WORDS
              </span>
            </div>
            <TypingArea
              passage={passage}
              typed={state.typed}
              onOperation={input}
            />
            <div className="typing-footer">
              <span>
                <Keyboard size={15} />
                {elapsed
                  ? 'Keep going. You’ve got this.'
                  : 'Click the text and start typing to begin'}
              </span>
              <button
                className="icon-button"
                title="Restart test"
                aria-label="Restart test"
                onClick={reset}
              >
                <RotateCcw size={18} />
              </button>
            </div>
            <div className="time-track">
              <div style={{ width: `${(elapsed / duration) * 100}%` }} />
            </div>
          </>
        )}
      </div>
      <div className="below-test">
        <span>
          <kbd>Tab</kbd> to move between controls
        </span>
        <span>
          <span className="live-dot" /> No account. No distractions. Just you
          and the keys.
        </span>
      </div>
      <div className="feature-cards">
        <a className="feature-card" href="/multiplayer">
          <span className="card-symbol">↗</span>
          <div>
            <span className="eyebrow">BETTER TOGETHER</span>
            <h3>A little friendly competition.</h3>
            <p>
              Create a private room. Invite your people. Find out who’s fastest.
            </p>
          </div>
          <ArrowRight size={20} />
        </a>
        <a className="feature-card" href="/analytics">
          <span className="card-symbol muted">▥</span>
          <div>
            <span className="eyebrow">SMALL WINS ADD UP</span>
            <h3>Watch your progress.</h3>
            <p>
              Your personal bests and practice history, right here on your
              device.
            </p>
          </div>
          <ArrowRight size={20} />
        </a>
      </div>
    </>
  );
}
