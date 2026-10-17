# Architecture and milestones

One npm-workspace modular monolith. The frontend is independent of the backend for solo use. React owns screen state; the reusable pure engine owns typing and scoring. The backend owns room membership, host privileges, race schedules and competitive scores. A RoomService class encapsulates Maps; its clock and event sink are injectable. A future store can replace these Maps without changing socket adapters or engine semantics.

## State machines

Room: WAITING → COUNTDOWN → RACING → FINISHED → WAITING. Close and expiration are terminal, and remove the in-memory room. Requests: PENDING → APPROVED / REJECTED / CANCELLED / EXPIRED. Only approved sessions receive room snapshots.

Session IDs are UUIDs; credentials use 32 random bytes. Room codes use six cryptographically selected characters and collision checks. A credential binds one current socket; takeover invalidates the old socket's authorization. Tokens never appear in room snapshots or invitation URLs. Keep tokens out of logs.

The server runs every 250 ms for progress and cleanup. Requests expire after two minutes, disconnected memberships after 30 seconds outside active races, and idle rooms after 30 minutes. Active-race disconnected participants are retained for scoring; they cannot upload old timestamped input. A disconnected host can transfer after 30 seconds without cancelling the race. Explicit departure removes membership; a remaining guest becomes host. Empty rooms close.

Rate limits: 5 room creations/minute/IP, 12 admissions/minute/IP, 30 resumes/minute/IP, 180 commands/second/socket, 35 accepted typing operations/second/player, 20 simultaneous connections/IP. 200 rooms and 2,000 sessions maximum; 16 pending requests per room. Payload limit: 8 KiB. Origin allowlist applies to handshake including WebSockets. Do not trust a forwarded IP header without configuring a trusted reverse proxy.

## Milestones

0. Repository, strict TypeScript, npm workspaces, schemas and documentation.
1. Solo typing, history, themes, analytics and engine tests.
2. Guest rooms, approvals, lobby, expiry and recovery.
3. Authoritative races, rankings and rematches.
4. Verification, responsive design and security review. Public deployment hardening and broader device/assistive-technology testing remain future work.

No production hosting is selected. No deployment or billing registration has been performed. No external fonts or analytics are loaded. The design does not copy another typing product's assets.

Future scaling would require shared room ownership, a session store and coordinated timers; these are deliberately absent from this single-process MVP.
