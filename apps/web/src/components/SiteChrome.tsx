import { useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ArrowUpRight,
  BarChart3,
  Gamepad2,
  Github,
  Keyboard,
  Menu,
  Moon,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trophy,
  Users,
  X,
} from 'lucide-react';

function Brand() {
  return (
    <NavLink to="/" className="site-brand" aria-label="TypeSpeed home">
      <span className="site-mark">
        <Keyboard size={23} />
      </span>
      <span>
        type<span>speed</span>
        <small>FIND YOUR RHYTHM</small>
      </span>
    </NavLink>
  );
}
const primaryLinks = [
  { to: '/', label: 'Practice', icon: Keyboard },
  { to: '/challenges', label: 'Challenges', icon: Trophy },
  { to: '/games', label: 'Arcade', icon: Gamepad2 },
  { to: '/multiplayer', label: 'Multiplayer', icon: Users },
];
const personalLinks = [
  ['/analytics', 'My progress'],
  ['/insights', 'Practice studio'],
  ['/replays', 'Replays'],
  ['/learn', 'Typing guides'],
];

export function SiteHeader({
  light,
  toggleTheme,
}: {
  light: boolean;
  toggleTheme: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  return (
    <header
      className="site-header"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          setOpen(false);
          menuButton.current?.focus();
        }
      }}
    >
      <div className="site-header-top">
        <Brand />
        <nav className="desktop-primary" aria-label="Main navigation">
          {primaryLinks.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="site-tools">
          <button
            className="icon-button"
            aria-label="Toggle theme"
            title={light ? 'Switch to dark theme' : 'Switch to light theme'}
            onClick={toggleTheme}
          >
            {light ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <NavLink
            className="icon-button"
            aria-label="Settings"
            title="Settings"
            to="/settings"
          >
            <SlidersHorizontal size={18} />
          </NavLink>
          <button
            ref={menuButton}
            className="icon-button mobile-menu-toggle"
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
      <div className="site-header-bottom">
        <span className="header-note">
          <span className="live-dot" /> A little practice. A little progress.
        </span>
        <nav aria-label="Your workspace">
          {personalLinks.map(([to, label]) => (
            <NavLink key={to} to={to}>
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <nav
        id="mobile-navigation"
        className="mobile-navigation"
        aria-label="Mobile navigation"
        hidden={!open}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('a')) setOpen(false);
        }}
      >
        <span className="eyebrow">FIND YOUR NEXT SESSION</span>
        <div className="mobile-primary-links">
          {primaryLinks.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}>
              <Icon size={18} />
              {label}
              <ArrowUpRight size={14} />
            </NavLink>
          ))}
        </div>
        <div className="mobile-personal-links">
          {personalLinks.map(([to, label]) => (
            <NavLink key={to} to={to}>
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-invitation">
        <div>
          <span className="eyebrow">
            <Sparkles size={14} /> MAKE EVERY KEYSTROKE COUNT
          </span>
          <h2>
            Your next personal best
            <br />
            starts with <em>one word.</em>
          </h2>
        </div>
        <NavLink className="primary" to="/">
          Find your flow <ArrowUpRight size={17} />
        </NavLink>
      </div>
      <div className="footer-directory">
        <div className="footer-intro">
          <Brand />
          <p>
            A space to sharpen your skills, find your rhythm and enjoy getting
            better.
          </p>
          <span className="footer-pill">
            <span className="live-dot" /> Free to practice. Yours to explore.
          </span>
        </div>
        <nav aria-label="Footer practice">
          <h3>Practice & play</h3>
          <NavLink to="/">Typing test</NavLink>
          <NavLink to="/challenges">Challenges & learning</NavLink>
          <NavLink to="/games">Typing arcade</NavLink>
          <NavLink to="/multiplayer">Multiplayer</NavLink>
        </nav>
        <nav aria-label="Footer workspace">
          <h3>Your workspace</h3>
          <NavLink to="/analytics">My progress</NavLink>
          <NavLink to="/insights">Practice studio</NavLink>
          <NavLink to="/replays">Session replays</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
        <nav aria-label="Information">
          <h3>Discover</h3>
          <NavLink to="/learn">Typing guides</NavLink>
          <NavLink to="/about">About TypeSpeed</NavLink>
          <NavLink to="/privacy">Privacy</NavLink>
          <a href="https://github.com/Mr-Ankitpandey/TypeSpeed">
            <Github size={14} /> Source code <ArrowUpRight size={12} />
          </a>
        </nav>
      </div>
      <div className="footer-colophon">
        <span>
          © {new Date().getFullYear()} TypeSpeed. Crafted by{' '}
          <a href="https://github.com/Mr-Ankitpandey">
            Ankit Pandey <ArrowUpRight size={12} />
          </a>
        </span>
        <span>
          <BarChart3 size={14} /> Your progress stays on your device.
        </span>
        <a href="https://github.com/Mr-Ankitpandey/TypeSpeed/blob/main/LICENSE">
          Open source · MIT license
        </a>
      </div>
    </footer>
  );
}
