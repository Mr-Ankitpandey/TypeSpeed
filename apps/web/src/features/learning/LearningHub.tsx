import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  activities,
  activityConfig,
  lessons,
  stories,
  type Activity,
  type ActivityConfig,
} from '../../lib/activities';
import {
  learningProfile,
  readChallenge,
  readRecordings,
  readProgress,
  recordingScore,
  type Recording,
} from '../../lib/learning';
import { ActivitySession } from './ActivitySession';
export function LearningHub({ games = false }: { games?: boolean }) {
  const focus = useLocation().search.includes('focus=mistakes');
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">
          {games ? 'PLAY WITH PURPOSE' : 'YOUR NEXT SMALL WIN'}
        </div>
        <h1>{games ? 'The typing arcade.' : 'A little better, every day.'}</h1>
        <p>
          {games
            ? 'Original games, real typing practice. Choose a relaxed session or a survival challenge.'
            : 'Daily challenges, guided learning and personal goals. All progress stays on this device.'}
        </p>
      </div>
      <div className="activity-grid">
        {Object.entries(activities)
          .filter(
            ([key, value]) =>
              key !== 'friend' &&
              (games ? value[2] === 'Games' : value[2] !== 'Games'),
          )
          .map(([key, value]) => (
            <Link
              className="panel activity-card"
              to={`/play?mode=${key}${focus ? '&focus=mistakes' : ''}`}
              key={key}
            >
              <span className="eyebrow">{value[2]}</span>
              <h2>{value[0]}</h2>
              <p>{value[1]}</p>
              <span className="activity-arrow">Start →</span>
            </Link>
          ))}
      </div>
      {games && (
        <div className="panel">
          <h2>Better together</h2>
          <p>
            Team relay passes a shared course between players. Co-op boss
            battles combine everyone's accurate typing.
          </p>
          <Link className="primary" to="/multiplayer">
            Create a multiplayer room
          </Link>
        </div>
      )}
      <div className="action-row">
        <Link className="quiet" to="/insights">
          Heatmap, achievements & weekly goals
        </Link>
        <Link className="quiet" to="/replays">
          Your recordings
        </Link>
      </div>
    </>
  );
}
export function ActivityPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const raw = params.get('mode') ?? 'dailySprint';
  const mode = (
    Object.hasOwn(activities, raw) ? raw : 'dailySprint'
  ) as Activity;
  const [records, setRecords] = useState(readRecordings);
  const [selected, setSelected] = useState(records[0]?.id ?? '');
  const [custom, setCustom] = useState('');
  const [level, setLevel] = useState(() =>
    mode === 'beginner'
      ? Math.max(
          0,
          lessons.findIndex(
            ([name]) => !readProgress().lessons.includes(`Lesson: ${name}`),
          ),
        )
      : 0,
  );
  const [target, setTarget] = useState(() => {
    const recent = records
      .filter((r) => r.completed && r.duration >= 15)
      .slice(0, 5);
    return recent.length
      ? Math.round(
          Math.max(
            15,
            Math.min(
              120,
              recent.reduce((n, r) => n + recordingScore(r).wpm, 0) /
                recent.length,
            ),
          ),
        )
      : 40;
  });
  const [relaxed, setRelaxed] = useState(true);
  const [running, setRunning] = useState<ActivityConfig | null>(null);
  const [round, setRound] = useState(0);
  const [last, setLast] = useState<Recording | null>(null);
  const [error, setError] = useState('');
  const ghost = records.find((r) => r.id === selected);
  const daily = mode.startsWith('daily');
  const day = new Date().toISOString().slice(0, 10);
  const attempts = records.filter(
    (r) => r.mode === mode && r.date.startsWith(day),
  );
  function launch(nextLevel = level) {
    setError('');
    let config = activityConfig(mode, custom, nextLevel, target);
    if (mode === 'ghost') {
      if (!ghost) {
        setError('Finish a practice session first to create a ghost.');
        return;
      }
      config = { ...config, passage: ghost.passage, duration: ghost.duration };
    }
    if (mode === 'friend') {
      const challenge = readChallenge(location.hash);
      if (!challenge) {
        setError(
          'This challenge link is missing or invalid. Ask your friend for a new link.',
        );
        return;
      }
      config = { ...config, ...challenge };
    }
    if (
      params.get('focus') === 'mistakes' &&
      ['wordfall', 'tower', 'defender', 'rally', 'rhythm'].includes(mode)
    ) {
      const words = learningProfile().missed;
      if (words.length)
        config.passage = Array(30).fill(words.join(' ')).join(' ');
    }
    if (!config.passage.trim()) {
      setError(
        'Enter text containing supported Latin letters, numbers or punctuation.',
      );
      return;
    }
    setRunning(config);
    setLast(null);
    setRound((r) => r + 1);
  }
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">
          {activities[mode][2]}
          {daily ? ` · ${day} UTC` : ''}
        </div>
        <h1>{activities[mode][0]}</h1>
        <p>{activities[mode][1]}</p>
      </div>
      {!running ? (
        <div className="panel">
          {mode === 'custom' && (
            <label>
              Your practice text
              <textarea
                className="custom-text"
                maxLength={6000}
                rows={6}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
              />
              <span>
                Whitespace is normalized. Latin letters, accents, numbers and
                punctuation are supported; unsupported characters are removed.
              </span>
            </label>
          )}
          {mode === 'ghost' && (
            <label>
              Saved performance
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                {records.map((r) => (
                  <option value={r.id} key={r.id}>
                    {r.title} · {recordingScore(r).wpm.toFixed(1)} WPM ·{' '}
                    {new Date(r.date).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </label>
          )}
          {(mode === 'beginner' || mode === 'story') && (
            <label>
              {mode === 'beginner' ? 'Lesson' : 'Chapter'}
              <select
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
              >
                {(mode === 'beginner' ? lessons : stories).map(([name], i) => (
                  <option key={name} value={i}>
                    {i + 1}. {name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {mode === 'plan' && (
            <p>
              Five minutes: 60-second warm-up, 120-second mistake drill,
              120-second benchmark. Continue between stages at your own pace.
            </p>
          )}
          {['consistency', 'wordfall', 'defender'].includes(mode) && (
            <label>
              Target pace (WPM)
              <input
                type="number"
                min={15}
                max={200}
                value={target}
                onChange={(e) =>
                  setTarget(
                    Math.max(15, Math.min(200, Number(e.target.value) || 15)),
                  )
                }
              />
            </label>
          )}
          {['wordfall', 'tower', 'defender'].includes(mode) && (
            <label>
              Game mode
              <select
                value={relaxed ? 'relaxed' : 'survival'}
                onChange={(e) => setRelaxed(e.target.value === 'relaxed')}
              >
                <option value="relaxed">Relaxed · keep practicing</option>
                <option value="survival">
                  Survival · end when time or stability runs out
                </option>
              </select>
            </label>
          )}
          {mode === 'friend' && (
            <p>
              The shared target is a local, unverified score. This link contains
              the passage; only share text you intend recipients to see.
            </p>
          )}
          {daily && (
            <p>
              {attempts.length
                ? `${attempts.length} saved attempts today · First: ${recordingScore(attempts.at(-1)!).wpm.toFixed(1)} WPM · Best: ${Math.max(...attempts.map((r) => recordingScore(r).wpm)).toFixed(1)} WPM`
                : 'No saved attempts today.'}{' '}
              The daily trio uses one fixed difficulty. UTC determines the
              challenge date.
            </p>
          )}
          {error && <p role="alert">{error}</p>}
          <button className="primary" onClick={() => launch()}>
            Start session
          </button>
        </div>
      ) : (
        <>
          <ActivitySession
            key={round}
            config={running}
            ghost={mode === 'ghost' ? ghost : undefined}
            relaxed={relaxed}
            onDone={(r) => {
              setLast(r);
              setRecords(readRecordings());
            }}
          />
          <div className="action-row">
            <button className="quiet" onClick={() => launch()}>
              Restart session
            </button>
            <button
              className="quiet"
              onClick={() => {
                setRunning(null);
                setLast(null);
              }}
            >
              Change setup
            </button>
            {last && mode === 'plan' && level < 2 && (
              <button
                className="primary"
                onClick={() => {
                  setLevel(level + 1);
                  launch(level + 1);
                }}
              >
                Continue to {level === 0 ? 'targeted drill' : 'benchmark'}
              </button>
            )}
            {last?.passed &&
              mode === 'beginner' &&
              level < lessons.length - 1 && (
                <button
                  className="primary"
                  onClick={() => {
                    setLevel(level + 1);
                    launch(level + 1);
                  }}
                >
                  Next lesson
                </button>
              )}
            {last?.completed &&
              mode === 'story' &&
              level === 0 &&
              [1, 2].map((i) => (
                <button
                  className="primary"
                  key={i}
                  onClick={() => {
                    setLevel(i);
                    launch(i);
                  }}
                >
                  {stories[i][0]}
                </button>
              ))}
          </div>
        </>
      )}
      <div className="action-row">
        <Link to="/challenges" className="quiet">
          All challenges
        </Link>
        <Link to="/games" className="quiet">
          Arcade
        </Link>
      </div>
    </>
  );
}
