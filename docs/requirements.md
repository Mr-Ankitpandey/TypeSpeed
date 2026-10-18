# Product requirements

TypeSpeed is a free, open-source typing practice and private multiplayer platform created by Ankit Pandey.

## Core constraints

- Build, run, and test locally without payment, account registration, a billing account, or an external managed service.
- Use free, open-source development technologies and bundled typing content.
- Require no database for the MVP. Use browser storage for practice history and preferences, and memory for multiplayer state.
- Keep solo practice independent of backend availability.
- Keep the architecture a lightweight npm-workspace modular monolith with one persistent Node backend.

## Solo typing

Support 15-, 30-, 60-, and 120-second tests, easy/medium/hard English content, punctuation and number options, restart, character validation, Backspace corrections, and automatic completion. Report validated WPM, raw WPM, accuracy, correct characters, incorrect attempts, uncorrected errors, and duration.

Store recent results locally and display best/average speed, average accuracy, total tests, and recent progress. Handle unavailable or full browser storage gracefully. Keep text readable, input responsive, and controls keyboard-accessible. Support light/dark themes and reduced-motion preferences.

Practice-setting preferences persist in browser storage. A native input field supports mobile virtual keyboards; device-specific behavior still needs physical-device testing.

## Private multiplayer

Rooms support 2–8 guests without login or email. Hosts choose 30-, 60-, or 120-second races, difficulty, and content options. Room codes and invitation URLs are public invitations, never authorization credentials.

A joining player remains pending until the host approves the request on the server. Pending guests receive no protected lobby or race content. Hosts can reject requests, remove players, change settings before countdown, start races, and close rooms. Guests can cancel pending requests, set readiness after approval, participate, and leave.

Starting requires at least two approved, connected, ready participants. Settings lock at countdown. All participants receive identical content and the server's official start schedule. Rematches keep approved membership and create a new round.

## Authority and scoring

The server validates structured, sequenced typing operations and independently tracks characters, attempts, corrections, and progress. It rejects unauthorized, duplicate, stale, malformed, excessive, and late operations. Client scores and rankings are not authoritative.

Validated WPM uses correctly retained characters and the full official duration. Accuracy includes corrected mistakes. Winning requires at least 95% accuracy. Ranking compares qualification, validated WPM, accuracy, then fewer incorrect attempts; exact ties share ranks. Display a clear no-qualifying-winner result when appropriate. See [scoring](scoring.md).

## Lifecycle and safety

Room lifecycle: WAITING → COUNTDOWN → RACING → FINISHED → WAITING, with terminal closure/expiry. Request lifecycle: PENDING → APPROVED, REJECTED, CANCELLED, or EXPIRED.

Use cryptographically secure temporary session credentials independent of socket IDs. Enforce host and participant permissions server-side. Support refresh recovery, bounded reconnect grace, credential revocation, and safe host transfer. Dispose of timers/listeners and clean up stale rooms, requests, and sessions.

Bound payloads, connections, rooms, sessions, and request/input rates. Validate input at runtime. Handle duplicate names, full rooms, rejected/expired requests, simultaneous approvals, disconnections, server restarts, and unavailable browser storage with clear feedback. Do not claim perfect cheat prevention.

## Verification

Use strict TypeScript, ESLint, unit/integration tests, and browser tests. Cover typing corrections and scoring; room authorization and lifecycle; approval/rejection/cancellation; race timing and input sequencing; rematches and reconnection. Browser tests use isolated player contexts and verify a complete host-approved race.

## Data and deployment limits

Rooms and multiplayer results are temporary. Browser history is device-specific and disappears when browser data is cleared. There is no cross-device synchronization. Public deployment must be assessed separately from free local operation; no permanent zero-cost hosting guarantee is made. See [deployment](deployment.md).

## Extended learning release

The learning release adds the daily trio, targeted and adaptive drills, recorded ghosts, five-minute plans, beginner lessons, skill challenges, Latin-language content, six solo arcade experiences, private cooperative relay/boss rooms, replay inspection, local milestones, weekly goals, personal appearance settings, friend challenge links, result cards, studio backup import/export and offline solo caching. See [activity rules](learning-and-games.md).

## Operational follow-up

Broaden real-device, network/resource and assistive-technology testing, and verify the actual production deployment. These checks do not imply a guarantee of public uptime, search ranking or perfect cheat prevention.
