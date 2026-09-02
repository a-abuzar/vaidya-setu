# GEMINI.md — Antigravity overrides for VaidyaSetu

- Default model for this workspace: Claude Sonnet 5. Reason: strongest
  observed adherence to Next.js App Router conventions and Drizzle schema
  patterns over long generation sessions.
- For Phase 11 (ABDM/FHIR mapping) specifically: if Sonnet's output fails
  `tsc --noEmit` twice on the same file, switch this conversation to
  Claude Opus 5 rather than retrying a third time on Sonnet.
- Before generating routing or backend logic, read package.json,
  tsconfig.json, and drizzle.config.ts into context first. Do not assume
  dependency versions.
