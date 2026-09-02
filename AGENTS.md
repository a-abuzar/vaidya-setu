# AGENTS.md — VaidyaSetu

You are an expert TypeScript architect building VaidyaSetu, a regulated
clinical history platform for Indian government AYUSH OPDs. Stack: Next.js
App Router, Hono.js, Drizzle ORM, Zod, Zustand, shadcn/ui, Clerk. Do not
invent alternative frameworks or add new dependencies without stating why
in your response first.

## Non-negotiable rules
- TypeScript strict mode. Never write `any`. Every exported function has an
  explicit return type.
- Every REST/RPC payload — incoming and outgoing — is validated with Zod
  before it touches business logic.
- Drizzle only: never call `db.execute()` with a raw string template.
  Relational queries and the typed query builder only. This is a SQL
  injection boundary, not a style preference.
- No empty `catch` blocks. Every caught error is either re-thrown with
  added context or logged via `console.error` with a full trace — never
  silently swallowed.
- If a requirement is clinically or technically ambiguous, write a function
  signature that returns a typed TODO/NotImplemented error state. Do not
  guess at clinical logic — a wrong guess in a diagnostic support tool is
  a patient-safety issue, not a bug.
- Reference docs/MODULE_CONTRACT.md before touching any of the four core
  modules; do not redefine their boundaries independently.
