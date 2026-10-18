import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TypingArea } from '../../components/TypingArea';
import { achievements } from '../../lib/training';
import {
  exportBackup,
  importBackup,
  learningProfile,
  readAppearance,
  readRecordings,
  readWeeklyGoal,
  readProgress,
  recordingScore,
  replayState,
  weeklyDays,
} from '../../lib/learning';
import { saveStored } from '../../lib/storage';
export function Insights() {
  const [records, setRecords] = useState(readRecordings);
  const [goal, setGoal] = useState(readWeeklyGoal);
  const [appearance, setAppearance] = useState(readAppearance);
  const [message, setMessage] = useState('');
  const profile = learningProfile(records);
  const progress = readProgress();
  const days = weeklyDays(
    progress.days.map((date) => ({ date, completed: true })),
  );
  const badges = achievements(
    records
      .filter((r) => r.completed)
      .map((r) => ({
        ...recordingScore(r),
        duration: r.duration,
        mode: r.mode.startsWith('daily') ? 'daily' : r.mode,
      })),
  ).map((b) => ({
    ...b,
    unlocked: b.unlocked || progress.unlocked.includes(b.name),
  }));
  function saveAppearance(next: typeof appearance) {
    setAppearance(next);
    if (!saveStored('typespeed.appearance', next))
      setMessage('Appearance could not be saved.');
  }
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">UNDERSTAND YOUR PROGRESS</div>
        <h1>Your practice studio.</h1>
        <p>
          Insights from up to 20 saved recordings. Local progress is not an
          official competitive record.
        </p>
      </div>
      <div className="panel">
        <h2>Weekly goal</h2>
        <p>
          {days} of {goal} practice days this week. A missed day never erases
          your earlier achievements.
        </p>
        <label>
          Days per week
          <select
            value={goal}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (saveStored('typespeed.weeklyGoal', n)) setGoal(n);
              else setMessage('Goal could not be saved.');
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <progress value={Math.min(days, goal)} max={goal} />
      </div>
      <div className="panel">
        <h2>Keyboard heatmap</h2>
        <p>
          Rates appear after at least five attempts per key. Mistakes include
          corrected errors.
        </p>
        <div className="heatmap">
          {Array.from('abcdefghijklmnopqrstuvwxyz0123456789').map((key) => {
            const p = profile.keys[key];
            return (
              <span
                key={key}
                className={
                  p && p.attempts >= 5 && p.errors / p.attempts > 0.1
                    ? 'weak-key'
                    : ''
                }
              >
                {key}
                <small>
                  {p && p.attempts >= 5
                    ? `${Math.round((p.errors / p.attempts) * 100)}% errors`
                    : 'More data needed'}
                </small>
              </span>
            );
          })}
        </div>
        <h3>Slow transitions</h3>
        {profile.transitions.length ? (
          <ul>
            {profile.transitions.map(([pair, v]) => (
              <li key={pair}>
                {JSON.stringify(pair)}: {Math.round(v.total / v.count)} ms
                average ({v.count} samples)
              </li>
            ))}
          </ul>
        ) : (
          <p>
            Type more to collect five clean samples of a letter pair. Pauses
            over three seconds are excluded.
          </p>
        )}
        <Link className="primary" to="/play?mode=mistakes">
          Practice missed words
        </Link>
      </div>
      <div className="panel">
        <h2>Achievements</h2>
        <div className="activity-grid">
          {badges.map((b) => (
            <div
              className={`achievement ${b.unlocked ? 'unlocked' : ''}`}
              key={b.name}
            >
              <strong>
                {b.unlocked ? '✓' : '○'} {b.name}
              </strong>
              <p>{b.detail}</p>
            </div>
          ))}
        </div>
        <p>
          Earned achievements stay unlocked when old recordings rotate out.
          Export a backup before clearing browser data.
        </p>
      </div>
      <div className="panel">
        <h2>Make practice yours</h2>
        <div className="form-grid">
          <label>
            Caret
            <select
              value={appearance.caret}
              onChange={(e) =>
                saveAppearance({
                  ...appearance,
                  caret: e.target.value as typeof appearance.caret,
                })
              }
            >
              {['line', 'block', 'underline'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Font size
            <input
              type="range"
              min={18}
              max={32}
              value={appearance.font}
              onChange={(e) =>
                saveAppearance({ ...appearance, font: Number(e.target.value) })
              }
            />
            {appearance.font}px
          </label>
          <label>
            Keyboard guide
            <select
              value={appearance.layout}
              onChange={(e) =>
                saveAppearance({
                  ...appearance,
                  layout: e.target.value as typeof appearance.layout,
                })
              }
            >
              {['qwerty', 'azerty', 'dvorak', 'colemak'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Accent
            <select
              value={appearance.accent}
              onChange={(e) =>
                saveAppearance({
                  ...appearance,
                  accent: e.target.value as typeof appearance.accent,
                })
              }
            >
              <option value="mint">Mint</option>
              <option value="violet" disabled={!badges[0].unlocked}>
                Violet · finish one test
              </option>
              <option value="amber" disabled={!badges[3].unlocked}>
                Amber · earn Precision
              </option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={appearance.sound}
              onChange={(e) =>
                saveAppearance({ ...appearance, sound: e.target.checked })
              }
            />{' '}
            Optional key sounds
          </label>
          <label>
            <input
              type="checkbox"
              checked={appearance.guide}
              onChange={(e) =>
                saveAppearance({ ...appearance, guide: e.target.checked })
              }
            />{' '}
            Show keyboard guide
          </label>
        </div>
        <p>
          These settings apply to challenge and arcade sessions. Light/dark
          appearance is available in the main header.
        </p>
      </div>
      <div className="panel">
        <h2>Progress backups</h2>
        <p>
          Export recordings, studio settings and your weekly goal. Import
          replaces those items on this device. The standard practice history is
          kept separately.
        </p>
        <button className="quiet" onClick={exportBackup}>
          Export backup
        </button>
        <label>
          Import backup
          <input
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 8_000_000) {
                setMessage('Backup exceeds 8 MB.');
                return;
              }
              if (
                !confirm(
                  'Replace studio recordings and preferences with this backup?',
                )
              )
                return;
              try {
                importBackup(await file.text());
                setRecords(readRecordings());
                setAppearance(readAppearance());
                setGoal(readWeeklyGoal());
                setMessage('Backup imported.');
              } catch {
                setMessage(
                  'Import failed. Check that this is a valid TypeSpeed backup and storage is available.',
                );
              }
              e.target.value = '';
            }}
          />
        </label>
        <button
          className="quiet"
          onClick={() => {
            if (
              confirm(
                'Delete all saved recordings and their derived studio insights?',
              ) &&
              saveStored('typespeed.recordings', [])
            )
              setRecords([]);
          }}
        >
          Delete recordings
        </button>
        {message && <p role="status">{message}</p>}
      </div>
    </>
  );
}
export function Replays() {
  const [records] = useState(readRecordings);
  const [id, setId] = useState(records[0]?.id ?? '');
  const [ms, setMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const record = records.find((r) => r.id === id);
  useEffect(() => {
    if (!playing || !record) return;
    const start = performance.now() - ms;
    const timer = setInterval(() => {
      const next = Math.min(record.duration * 1000, performance.now() - start);
      setMs(next);
      if (next >= record.duration * 1000) setPlaying(false);
    }, 50);
    return () => clearInterval(timer);
  }, [playing, id]);
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">LEARN FROM EVERY ATTEMPT</div>
        <h1>Your replays.</h1>
        <p>
          Scrub through corrections and pauses. Recordings stay on this device.
        </p>
      </div>
      {record ? (
        <div className="panel">
          <label>
            Recording
            <select
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                setMs(0);
                setPlaying(false);
              }}
            >
              {records.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} · {new Date(r.date).toLocaleString()}
                </option>
              ))}
            </select>
          </label>
          <button
            className="quiet"
            onClick={() => {
              if (ms >= record.duration * 1000) setMs(0);
              setPlaying(!playing);
            }}
          >
            {playing ? 'Pause' : 'Play'}
          </button>
          <label>
            Replay position
            <input
              type="range"
              min={0}
              max={Math.ceil(record.duration * 1000)}
              step={1}
              value={ms}
              onChange={(e) => {
                setPlaying(false);
                setMs(Number(e.target.value));
              }}
            />
            {(ms / 1000).toFixed(1)} / {record.duration.toFixed(1)} seconds
          </label>
          <TypingArea
            passage={record.passage}
            typed={replayState(record, ms).typed}
            onOperation={() => {}}
            disabled
          />
          <details>
            <summary>Correction and pause markers</summary>
            <div className="marker-list">
              {record.events
                .filter(
                  (e, i) =>
                    e.op.kind === 'delete' ||
                    (i > 0 && e.ms - record.events[i - 1].ms > 1000),
                )
                .slice(0, 100)
                .map((e, i) => (
                  <button
                    className="quiet"
                    key={i}
                    onClick={() => {
                      setPlaying(false);
                      setMs(e.ms);
                    }}
                  >
                    {(e.ms / 1000).toFixed(1)}s{' '}
                    {e.op.kind === 'delete' ? 'Backspace' : 'Pause'}
                  </button>
                ))}
            </div>
          </details>
          <Link className="primary" to="/play?mode=ghost">
            Race a saved ghost
          </Link>
        </div>
      ) : (
        <div className="panel">
          <p>No recordings yet.</p>
          <Link className="primary" to="/challenges">
            Start a challenge
          </Link>
        </div>
      )}
    </>
  );
}
