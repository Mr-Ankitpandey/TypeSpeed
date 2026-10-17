# Development workflow

TypeSpeed is created and maintained by Ankit Pandey. Keep changes focused, reviewable, and consistent with the local-first, zero-cost architecture.

## Stage-based delivery

1. Choose a small, complete implementation stage with a clear outcome.
2. Implement and review the change; keep unrelated work out of the stage.
3. Run the relevant tests, TypeScript checks, lint, and affected production builds. Record any verification limits accurately.
4. Update the README and technical documentation when behavior or setup changes.
5. Commit the completed stage with a concise Conventional Commit message, then push it to the configured upstream branch. Repeat for subsequent stages.

Use messages such as `feat(typing): persist practice preferences`, `fix(rooms): expire disconnected pending requests`, or `test(races): cover reconnect during countdown`. Describe the actual change and avoid generated attribution trailers. Use the repository's configured author identity.

Do not combine unfinished features with a validated milestone or describe unimplemented roadmap items as available features. Do not force-push shared history. Inspect incoming remote changes before integrating them.

## Repository boundaries

- `packages/typing-engine`: framework-independent typing and scoring logic.
- `packages/shared`: shared schemas and event contracts.
- `apps/web`: browser UI and local practice state.
- `apps/server`: authoritative membership, permissions, schedules, and results.
- `tests` and colocated `*.test.ts`: acceptance and unit/integration coverage.
- `docs`: accurate product and technical documentation.

Keep dependency directories, build outputs, test artifacts, logs, credentials, and local environment files out of commits. Preserve third-party license notices. Do not add a paid service, mandatory account, or database dependency to the MVP.

See [README](README.md) for setup and verification commands.
