# First MVP milestone verification

These sections record successive milestones. Earlier limitations describe the project at that stage; the latest release is covered at the end.

## Completed checks

- 12 Vitest engine, room-service and live Socket.IO integration tests passed.
- Playwright verified desktop/mobile layout, solo completion and persisted history, a 400-character typing/scrolling session, host approval followed by a full 60-second two-player race and rematch/refresh, and rejection keeping a guest outside the lobby.
- Race acceptance used separate browser contexts for Ankit and Rahul, checked identical passages and countdowns, submitted different performances and confirmed Ankit as the qualifying winner on both clients.
- TypeScript strict checks, ESLint and frontend/backend production builds passed during implementation.
- Dependency audit reported zero vulnerabilities after patching the initially reported development-tool advisories.
- Desktop and 390-pixel mobile screenshots were visually inspected. Browser layout checks cover practice, multiplayer, analytics and settings.

## Issues found and corrected

- Same-origin polling can omit Origin: the allowlist now checks a valid Referer origin when Origin is absent. A live Socket.IO regression test covers this and rejects an untrusted origin.
- Backend bundling now explicitly includes both shared workspace packages through tsup configuration.
- Cursor scroll offset is calculated relative to its actual scrolling container.
- The first character's caret has room to render without clipping.
- Character rendering is memoized in 80-character blocks so timer updates and unrelated keypresses do not reconcile the whole passage.

The long-passage check originally exhausted its 30-second test window during a concurrent build. It now explicitly selects 120 seconds, verifies all 400 characters, and asserts that the cursor stays visible. Focused browser checks were rerun after the rendering fix; multiplayer acceptance also passed after the result-detail additions.

## Boundaries and next milestone

This is a local MVP, not a publicly deployed or security-audited service. Next: broader network interruption and latency coverage, longer-running resource tests, assistive-technology review, mobile virtual-keyboard input, persistent practice-setting preferences, and deployment hardening. Advanced optional features remain outside this milestone. No public hosting service has been selected or configured.

Known MVP limitations are documented in README: in-memory multiplayer data, browser-local history, printable English keyboard input, and receipt-time scoring that disadvantages high-latency connections. The tests do not establish perfect bot resistance.

# Glass interface and search visibility stage

The production build and strict type check pass. All 16 unit/integration tests and all eight browser scenarios pass, including the full 60-second multiplayer race/rematch. A further visual run covers dark/light layouts, 390px mobile practice, and desktop multiplayer. Screenshots were inspected for clipping, spacing, and readability. ESLint and whitespace checks pass.

Build verification checks prerendered content, unique titles, canonical policy, private-page noindex metadata, and sitemap contents. Both an unset-domain build and a test-only HTTPS origin build passed. The example origin is not a deployment; normal artifacts are rebuilt without it. Live hosting, Search Console verification, real-device keyboard behavior, and real-user performance have not been validated.

# Learning, arcade and cooperative release

- All 28 unit/integration tests passed, including recording validation, replay scoring, persistent milestones, deterministic challenges, backups, relay turn authorization and cooperative scoring.
- The full online browser suite passed 15 scenarios. A final targeted run passed all seven learning scenarios, including an additional composition-input regression, bringing verified online coverage to 16 distinct scenarios.
- Browser checks cover daily completion, custom text with corrections, replay seeking, ghost setup, valid/invalid backup imports, accented and multiline input, challenge failures, background-tab survival deadlines, all solo modes, mobile layouts, and completed two-player relay and boss rounds.
- The production offline browser test passed: install and activate the service worker online, disconnect, navigate to the arcade, complete custom practice and open its replay.
- TypeScript strict checks and ESLint passed. Desktop and 390px mobile game screenshots were inspected for clipping and spacing.
- The final frontend/backend production build passed, including prerendering and metadata/indexing validation for all 15 pages. Production canonical URLs and the sitemap remain intentionally omitted until the actual deployment domain is configured.

The offline test found two issues that were corrected: route prefetches now request the exact prerendered HTML file, and static assets are looked up by canonical path so Origin-dependent request headers cannot prevent a cache hit. Replay seeking reaches the final millisecond, composition commits normalized accented input once, and survival deadlines remain authoritative when a background timer resumes late.

This remains an undeployed local release. Browser automation uses Chromium; it does not establish physical-device IME compatibility, assistive-technology conformance, production load capacity or public-hosting security. Local scores and shared asynchronous challenges are unverified. Global accounts, cross-device sync and permanent leaderboards are outside the account-free release.
