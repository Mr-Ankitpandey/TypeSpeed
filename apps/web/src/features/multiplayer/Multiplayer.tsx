import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import {
  Copy,
  Users,
  Check,
  X,
  Crown,
  ArrowRight,
  LoaderCircle,
} from 'lucide-react';
import {
  defaultSettings,
  type ClientEvents,
  type ServerEvents,
  type Command,
  type Reply,
  type RoomView,
  type RoomSettings,
} from '@typespeed/shared';
import {
  applyOperation,
  emptyState,
  type Operation,
} from '@typespeed/typing-engine';
import { TypingArea } from '../../components/TypingArea';

function SettingsFields({
  value,
  change,
}: {
  value: RoomSettings;
  change: (value: RoomSettings) => void;
}) {
  return (
    <div className="form-grid">
      <label>
        Race duration
        <select
          value={value.duration}
          onChange={(e) =>
            change({
              ...value,
              duration: Number(e.target.value) as RoomSettings['duration'],
            })
          }
        >
          {[30, 60, 120].map((n) => (
            <option key={n} value={n}>
              {n} seconds
            </option>
          ))}
        </select>
      </label>
      <label>
        Difficulty
        <select
          value={value.difficulty}
          onChange={(e) =>
            change({
              ...value,
              difficulty: e.target.value as RoomSettings['difficulty'],
            })
          }
        >
          {['easy', 'medium', 'hard'].map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </label>
      <label>
        Maximum players
        <select
          value={value.maxPlayers}
          onChange={(e) =>
            change({ ...value, maxPlayers: Number(e.target.value) })
          }
        >
          {[2, 3, 4, 5, 6, 7, 8].map((n) => (
            <option key={n} value={n}>
              {n} players
            </option>
          ))}
        </select>
      </label>
      <label>
        Content
        <select
          value={`${Number(value.punctuation)}${Number(value.numbers)}`}
          onChange={(e) =>
            change({
              ...value,
              punctuation: e.target.value[0] === '1',
              numbers: e.target.value[1] === '1',
            })
          }
        >
          <option value="00">English words</option>
          <option value="10">With punctuation</option>
          <option value="01">With numbers</option>
          <option value="11">Punctuation + numbers</option>
        </select>
      </label>
    </div>
  );
}
export function Multiplayer() {
  const { code: invite } = useParams();
  const socketRef = useRef<Socket<ServerEvents, ClientEvents> | null>(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<RoomView | null>(null);
  const [identity, setIdentity] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState(invite ?? '');
  const [settings, setSettings] = useState(defaultSettings);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const offset = useRef(0);
  const sequence = useRef(0);
  const round = useRef<string | undefined>(undefined);
  const [typing, setTyping] = useState(emptyState);
  const typingRef = useRef(typing);
  const inputBusy = useRef(false);
  const inputQueue = useRef<Operation[]>([]);
  const roomRef = useRef(room);
  roomRef.current = room;
  function storeToken(token?: string) {
    try {
      if (token) sessionStorage.setItem('typespeed.session', token);
      else sessionStorage.removeItem('typespeed.session');
    } catch {
      setNotice(
        'Session storage is unavailable. Refreshing will lose your guest session.',
      );
    }
  }
  useEffect(() => {
    const socket: Socket<ServerEvents, ClientEvents> = io(
      import.meta.env.VITE_SERVER_URL || undefined,
      { autoConnect: false, reconnectionDelay: 1000 },
    );
    socketRef.current = socket;
    socket.on('connect', () => {
      setConnected(true);
      setError('');
      const sent = Date.now();
      socket.emit('clock', (serverNow) => {
        offset.current = serverNow - (sent + Date.now()) / 2;
      });
      let token: string | null = null;
      try {
        token = sessionStorage.getItem('typespeed.session');
      } catch {
        /* Optional storage. */
      }
      if (token)
        socket
          .timeout(5000)
          .emit(
            'command',
            { type: 'resume', token },
            (err: Error | null, reply: Reply) => {
              if (err) {
                setError('Session recovery timed out. Reconnect to try again.');
                return;
              }
              if (!reply.ok) {
                storeToken();
                setRoom(null);
                setPending(false);
                setError(reply.error);
                return;
              }
              setIdentity(reply.id ?? '');
              sequence.current = reply.sequence ?? 0;
              typingRef.current = reply.state ?? emptyState();
              setTyping(typingRef.current);
              inputQueue.current = [];
              inputBusy.current = false;
            },
          );
    });
    socket.on('disconnect', () => {
      setConnected(false);
      inputQueue.current = [];
      inputBusy.current = false;
    });
    socket.on('connect_error', () =>
      setError(
        'Multiplayer server unavailable. Start the local server; solo practice still works.',
      ),
    );
    socket.on('room', (next) => {
      if (next.round !== round.current) {
        round.current = next.round;
        sequence.current = 0;
        typingRef.current = emptyState();
        setTyping(typingRef.current);
        inputQueue.current = [];
      }
      setRoom(next);
      setPending(false);
    });
    socket.on('request', (status) => {
      setNotice(status.message);
      setPending(status.state === 'PENDING');
      if (['REJECTED', 'EXPIRED', 'CANCELLED'].includes(status.state))
        storeToken();
    });
    socket.on('closed', (message) => {
      setRoom(null);
      setPending(false);
      setNotice(message);
      storeToken();
      round.current = undefined;
    });
    socket.connect();
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => {
      clearInterval(timer);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);
  async function send(command: Command) {
    if (!socketRef.current?.connected) {
      setError('Not connected to the multiplayer server.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const reply: Reply = await socketRef.current
        .timeout(5000)
        .emitWithAck('command', command);
      if (!reply.ok) setError(reply.error);
      else {
        if (reply.token) storeToken(reply.token);
        if (reply.id) setIdentity(reply.id);
        if (command.type === 'cancel') {
          setPending(false);
          storeToken();
        }
      }
    } catch {
      setError('The request timed out. Reconnect to recover your room.');
    } finally {
      setBusy(false);
    }
  }
  function drainInput() {
    const current = roomRef.current;
    if (
      inputBusy.current ||
      !inputQueue.current.length ||
      !socketRef.current?.connected ||
      !current?.round
    )
      return;
    const operation = inputQueue.current.shift()!;
    inputBusy.current = true;
    socketRef.current.timeout(3000).emit(
      'command',
      {
        type: 'input',
        round: current.round,
        sequence: sequence.current + 1,
        operation,
      },
      (err: Error | null, reply: Reply) => {
        inputBusy.current = false;
        if (err) {
          inputQueue.current = [];
          setError(
            'Input confirmation lost. Reconnecting to restore server state.',
          );
          socketRef.current?.disconnect().connect();
          return;
        }
        if (!reply.ok) {
          inputQueue.current = [];
          setError(reply.error);
          return;
        }
        sequence.current = reply.sequence!;
        typingRef.current = applyOperation(
          typingRef.current,
          current.passage!,
          operation,
        );
        setTyping(typingRef.current);
        drainInput();
      },
    );
  }
  function input(operation: Operation) {
    if (!connected || inputQueue.current.length > 40) return;
    inputQueue.current.push(operation);
    drainInput();
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice('Copied to clipboard.');
    } catch {
      setNotice(`Copy this: ${value}`);
    }
  }
  const host = room?.hostId === identity;
  const me = room?.players.find((p) => p.id === identity);
  const officialNow = now + offset.current;
  const racing = room && ['COUNTDOWN', 'RACING'].includes(room.state);
  const remaining = room?.startsAt
    ? Math.max(
        0,
        Math.ceil(
          (room.startsAt + room.settings.duration * 1000 - officialNow) / 1000,
        ),
      )
    : 0;
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">
          <Users size={13} /> PRIVATE ROOMS · REAL COMPETITION
        </div>
        <h1>
          Find your <em>people.</em>
        </h1>
        <p>A friendly race, a shared rhythm. No account needed.</p>
      </div>
      {!connected && (
        <div className="status-banner">
          Connecting to your local multiplayer server…
        </div>
      )}
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="status-banner" role="status">
          {notice}
        </div>
      )}
      {pending && !room ? (
        <div className="panel empty-state">
          <LoaderCircle size={36} />
          <h2>Waiting for the host</h2>
          <p>
            Your request has been sent. Waiting for the room host to approve
            your entry.
          </p>
          <button
            className="quiet"
            disabled={busy || !connected}
            onClick={() => void send({ type: 'cancel' })}
          >
            Cancel request
          </button>
        </div>
      ) : !room ? (
        <div className="room-forms">
          <form
            className="panel"
            onSubmit={(e) => {
              e.preventDefault();
              void send({ type: 'create', name, settings });
            }}
          >
            <div className="eyebrow">HOST YOUR OWN</div>
            <h2>Create a private room</h2>
            <p>You choose the pace. You approve the players.</p>
            <label>
              Your display name
              <input
                required
                maxLength={24}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ankit"
              />
            </label>
            <SettingsFields value={settings} change={setSettings} />
            <button className="primary" disabled={busy || !connected}>
              Create room <ArrowRight size={16} />
            </button>
          </form>
          <form
            className="panel"
            onSubmit={(e) => {
              e.preventDefault();
              void send({
                type: 'join',
                name,
                code: code.trim().toUpperCase(),
              });
            }}
          >
            <div className="eyebrow">JOIN YOUR FRIENDS</div>
            <h2>Have an invite?</h2>
            <p>Enter the code. Your host will let you in.</p>
            <label>
              Your display name
              <input
                required
                maxLength={24}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul"
              />
            </label>
            <label>
              Room code
              <input
                required
                minLength={6}
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="A7K9PX"
                className="code-input"
              />
            </label>
            <button className="primary" disabled={busy || !connected}>
              Request to join <ArrowRight size={16} />
            </button>
            <div className="privacy-note">
              Only approved guests enter the lobby. Your name and session are
              temporary.
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="panel room-heading">
            <div>
              <div className="eyebrow">PRIVATE ROOM</div>
              <strong className="room-code">{room.code}</strong>
            </div>
            <button className="quiet" onClick={() => void copy(room.code)}>
              <Copy size={14} /> Copy code
            </button>
            <button
              className="quiet"
              onClick={() => void copy(`${location.origin}/room/${room.code}`)}
            >
              Copy invitation link
            </button>
            <span className="room-badge">{room.state.toLowerCase()}</span>
            <button
              className="quiet"
              disabled={!connected || busy}
              onClick={() => void send({ type: 'leave' })}
            >
              Leave room
            </button>
          </div>
          {racing ? (
            <div className="practice-panel">
              <div className="race-heading">
                <h2>
                  {officialNow < room.startsAt!
                    ? `Starting in ${Math.ceil((room.startsAt! - officialNow) / 1000)}…`
                    : remaining
                      ? 'Find your rhythm.'
                      : 'Finalizing results…'}
                </h2>
                <strong>{remaining}s</strong>
              </div>
              <TypingArea
                passage={room.passage!}
                typed={typing.typed}
                onOperation={input}
                disabled={
                  !connected || officialNow < room.startsAt! || remaining <= 0
                }
              />
              <p className="race-tip">
                Click the passage to focus · The server verifies every
                keystroke.
              </p>
            </div>
          ) : room.state === 'FINISHED' ? (
            <div className="panel">
              <div className="eyebrow">RACE COMPLETE</div>
              <h2>
                {room.players.some((p) => p.eligible)
                  ? `${room.players
                      .filter((p) => p.rank === 1)
                      .map((p) => p.name)
                      .join(
                        ' & ',
                      )} ${room.players.filter((p) => p.rank === 1).length > 1 ? 'win' : 'wins'}!`
                  : 'No qualifying winner'}
              </h2>
              <p>
                95% accuracy is required to qualify. Scores use the full
                official {room.settings.duration}-second duration.
              </p>
              {host && (
                <button
                  className="primary"
                  disabled={busy || !connected}
                  onClick={() => void send({ type: 'rematch' })}
                >
                  Rematch / return to lobby <ArrowRight size={16} />
                </button>
              )}
            </div>
          ) : null}
          <div className="lobby-grid">
            <div className="panel">
              <div className="section-header">
                <h2>
                  {racing
                    ? 'Live leaderboard'
                    : room.state === 'FINISHED'
                      ? 'Final standings'
                      : 'The starting line'}
                </h2>
                <span className="eyebrow">
                  {room.players.length} / {room.settings.maxPlayers} PLAYERS
                </span>
              </div>
              {room.players.map((player) => (
                <div className="player-row" key={player.id}>
                  <div className="avatar">
                    {player.rank ?? player.name[0].toUpperCase()}
                  </div>
                  <div className="player-name">
                    <strong>
                      {player.name}
                      {player.id === identity ? ' (you)' : ''}{' '}
                      {player.id === room.hostId && <Crown size={13} />}
                    </strong>
                    <span>
                      {!player.connected
                        ? 'Reconnecting…'
                        : room.state === 'WAITING'
                          ? player.ready
                            ? 'Ready to race'
                            : 'Getting ready'
                          : `${player.score?.accuracy.toFixed(1)}% accuracy · ${player.score?.incorrectAttempts ?? 0} errors`}
                    </span>
                    {room.state !== 'WAITING' && (
                      <div
                        className="player-progress"
                        role="progressbar"
                        aria-label={`${player.name} passage progress`}
                        aria-valuenow={Math.round(
                          (player.score?.progress ?? 0) * 100,
                        )}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          style={{
                            width: `${(player.score?.progress ?? 0) * 100}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                  {room.state === 'WAITING' ? (
                    <>
                      {player.ready && <Check size={19} className="accent" />}
                      {host && player.id !== identity && (
                        <button
                          className="icon-button"
                          aria-label={`Remove ${player.name}`}
                          onClick={() =>
                            void send({ type: 'kick', id: player.id })
                          }
                        >
                          <X size={15} />
                        </button>
                      )}
                    </>
                  ) : (
                    <strong className="player-wpm">
                      {player.score?.wpm.toFixed(1)}
                      <small>wpm</small>
                    </strong>
                  )}
                </div>
              ))}
              {room.state === 'FINISHED' && (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Player</th>
                        <th>Raw WPM</th>
                        <th>Correct chars</th>
                        <th>Uncorrected</th>
                        <th>Qualified</th>
                      </tr>
                    </thead>
                    <tbody>
                      {room.players.map((player) => (
                        <tr key={player.id}>
                          <td>{player.name}</td>
                          <td>{player.score?.rawWpm.toFixed(1)}</td>
                          <td>{player.score?.correct}</td>
                          <td>{player.score?.uncorrectedErrors}</td>
                          <td>{player.eligible ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {room.state === 'WAITING' && (
                <div className="lobby-actions">
                  <button
                    className={me?.ready ? 'quiet' : 'primary'}
                    disabled={busy || !connected}
                    onClick={() =>
                      void send({ type: 'ready', ready: !me?.ready })
                    }
                  >
                    {me?.ready ? 'Not ready' : 'Ready to race'}
                  </button>
                  {host && (
                    <button
                      className="primary"
                      disabled={
                        busy ||
                        !connected ||
                        room.players.length < 2 ||
                        room.players.some((p) => !p.ready || !p.connected)
                      }
                      onClick={() => void send({ type: 'start' })}
                    >
                      Start race <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
            <div>
              <div className="panel">
                <h3>Race details</h3>
                <p>
                  {room.settings.duration} seconds · {room.settings.difficulty}{' '}
                  · English words
                </p>
                <p>
                  {room.settings.punctuation
                    ? 'Punctuation on'
                    : 'No punctuation'}{' '}
                  · {room.settings.numbers ? 'Numbers on' : 'No numbers'}
                </p>
                <p>
                  Minimum winning accuracy: <span className="accent">95%</span>
                </p>
                {host && room.state === 'WAITING' && (
                  <details>
                    <summary>Edit settings</summary>
                    <SettingsFields value={settings} change={setSettings} />
                    <button
                      className="quiet"
                      onClick={() => void send({ type: 'settings', settings })}
                    >
                      Save settings & reset ready states
                    </button>
                  </details>
                )}
              </div>
              {host && room.state === 'WAITING' && (
                <div className="panel">
                  <h3>
                    Join requests{' '}
                    <span className="accent">{room.requests.length}</span>
                  </h3>
                  {room.requests.length ? (
                    room.requests.map((request) => (
                      <div key={request.id} className="request-row">
                        <span>{request.name}</span>
                        <button
                          className="approve"
                          aria-label={`Approve ${request.name}`}
                          onClick={() =>
                            void send({ type: 'approve', id: request.id })
                          }
                        >
                          <Check size={17} />
                        </button>
                        <button
                          className="reject"
                          aria-label={`Reject ${request.name}`}
                          onClick={() =>
                            void send({ type: 'reject', id: request.id })
                          }
                        >
                          <X size={17} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p>Share your code to invite a friend.</p>
                  )}
                </div>
              )}
              {host && (
                <button
                  className="quiet"
                  onClick={() => {
                    if (confirm('Close this room for everyone?'))
                      void send({ type: 'close' });
                  }}
                >
                  Close room
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
