import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import {
  Keyboard,
  BarChart3,
  Users,
  SlidersHorizontal,
  Sun,
  Moon,
  ArrowUpRight,
} from 'lucide-react';
import { useState } from 'react';
import { Practice } from './features/typing/Practice';
import { Multiplayer } from './features/multiplayer/Multiplayer';
import { readHistory, readStored, saveStored } from './lib/storage';
import './styles.css';

function Analytics() {
  const [history, setHistory] = useState(readHistory);
  const average = (key: 'wpm' | 'accuracy') =>
    history.length
      ? history.reduce((n, r) => n + r[key], 0) / history.length
      : 0;
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">YOUR PERSONAL JOURNEY</div>
        <h1>
          Progress, <em>one key at a time.</em>
        </h1>
        <p>Every session counts. Your history stays on this device.</p>
      </div>
      <div className="summary-grid">
        {[
          ['Tests completed', history.length],
          [
            'Personal best',
            `${Math.max(0, ...history.map((r) => r.wpm)).toFixed(1)} wpm`,
          ],
          ['Average speed', `${average('wpm').toFixed(1)} wpm`],
          ['Average accuracy', `${average('accuracy').toFixed(1)}%`],
        ].map(([label, value]) => (
          <div className="panel stat-tile" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="panel">
        <div className="section-header">
          <h2>Recent sessions</h2>
          {history.length > 0 && (
            <button
              className="quiet"
              onClick={() => {
                if (confirm('Delete all practice history from this browser?')) {
                  if (saveStored('typespeed.history', [])) setHistory([]);
                }
              }}
            >
              Clear history
            </button>
          )}
        </div>
        {history.length ? (
          <>
            <div
              className="spark-bars"
              aria-label="Speed over your last twenty tests, oldest to newest"
            >
              {history
                .slice(0, 20)
                .reverse()
                .map((r) => (
                  <div
                    key={r.id}
                    title={`${r.wpm.toFixed(1)} WPM`}
                    style={{
                      height: `${Math.max(3, (r.wpm / Math.max(...history.map((x) => x.wpm), 1)) * 100)}%`,
                    }}
                  />
                ))}
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Duration</th>
                    <th>Difficulty</th>
                    <th>WPM</th>
                    <th>Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((r) => (
                    <tr key={r.id}>
                      <td>{new Date(r.date).toLocaleString()}</td>
                      <td>{r.duration}s</td>
                      <td>{r.difficulty}</td>
                      <td>{r.wpm.toFixed(1)}</td>
                      <td>{r.accuracy.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <BarChart3 size={36} />
            <h3>Your next chapter starts here.</h3>
            <p>Finish your first practice test to see your stats.</p>
            <NavLink className="primary" to="/">
              Start practicing <ArrowUpRight size={16} />
            </NavLink>
          </div>
        )}
      </div>
    </>
  );
}
function App() {
  const [light, setLight] = useState(() =>
    readStored(
      'typespeed.light',
      false,
      (v): v is boolean => typeof v === 'boolean',
    ),
  );
  function toggleTheme() {
    setLight(!light);
    saveStored('typespeed.light', !light);
  }
  return (
    <div className={light ? 'app light' : 'app'}>
      <header>
        <NavLink to="/" className="brand">
          <span className="brand-icon">
            <Keyboard size={22} />
          </span>
          type<span>speed</span>
          <small>BETA</small>
        </NavLink>
        <nav aria-label="Main navigation">
          <NavLink to="/" end>
            <Keyboard size={16} />
            Practice
          </NavLink>
          <NavLink to="/multiplayer">
            <Users size={16} />
            Multiplayer
          </NavLink>
          <NavLink to="/analytics">
            <BarChart3 size={16} />
            My progress
          </NavLink>
        </nav>
        <div className="header-actions">
          <button
            className="icon-button"
            aria-label="Toggle theme"
            onClick={toggleTheme}
          >
            {light ? <Moon size={19} /> : <Sun size={19} />}
          </button>
          <NavLink className="icon-button" aria-label="Settings" to="/settings">
            <SlidersHorizontal size={18} />
          </NavLink>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Practice />} />
          <Route path="/multiplayer" element={<Multiplayer />} />
          <Route path="/room/:code" element={<Multiplayer />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route
            path="/settings"
            element={
              <>
                <div className="page-heading">
                  <div className="eyebrow">MAKE IT YOURS</div>
                  <h1>
                    Your <em>space.</em>
                  </h1>
                  <p>A focused setup for your next personal best.</p>
                </div>
                <div className="panel settings">
                  <h2>Appearance</h2>
                  <p>Choose the theme that feels right.</p>
                  <button className="primary" onClick={toggleTheme}>
                    Switch to {light ? 'dark' : 'light'} theme
                  </button>
                  <hr />
                  <h2>Your data, your device</h2>
                  <p>
                    Practice history is saved in this browser. Clearing browser
                    data removes it. No cross-device synchronization or account
                    is required.
                  </p>
                  <p>
                    Keyboard input supports printable English characters and
                    Backspace. Paste is disabled for consistent scoring.
                  </p>
                </div>
              </>
            }
          />
          <Route
            path="*"
            element={
              <div className="panel empty-state">
                <h2>That page isn’t here.</h2>
                <p>Head back to practice and find your flow.</p>
                <NavLink className="primary" to="/">
                  Practice now
                </NavLink>
              </div>
            }
          />
        </Routes>
      </main>
      <footer>
        <span className="footer-brand">
          <Keyboard size={16} /> typespeed <span>Find your rhythm.</span>
        </span>
        <span>
          Free & open source <span className="footer-dot">•</span> Built for the
          love of typing
        </span>
        <span className="local-label">
          <span className="live-dot" /> LOCAL FIRST
        </span>
      </footer>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
