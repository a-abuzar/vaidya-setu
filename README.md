<div align="center">

# 🌿 VaidyaSetu

**AI-Assisted Patient Case-Taking Software for AYUSH OPDs**

*Built for Smart India Hackathon 2024 — Problem Statement 26047*
*Ministry of AYUSH · All India Institute of Ayurveda*

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Hono](https://img.shields.io/badge/Hono-4-E36002?logo=hono)](https://hono.dev)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle)](https://orm.drizzle.team)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

*VaidyaSetu (वैद्यसेतु) — "Bridge to the Physician" — is an open-source, multilingual, AI-powered patient intake kiosk designed for India's government Ayurveda, Yoga, Unani, Siddha, and Homeopathy (AYUSH) outpatient departments. It captures structured clinical history through conversational voice interaction, generates AYUSH-aware clinical summaries, and delivers them to a physician dashboard — reducing wait times, eliminating paper records, and making quality healthcare accessible to patients regardless of literacy or language.*

</div>

---

## 📋 Table of Contents

- [What is VaidyaSetu?](#-what-is-vaidyasetu)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Database Schema](#-database-schema)
- [AI Services](#-ai-services)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running Locally](#running-locally)
  - [Deploying to Cloudflare](#deploying-to-cloudflare)
- [Application Flow](#-application-flow)
- [Physician Dashboard](#-physician-dashboard)
- [Accessibility Design](#-accessibility-design)
- [Compliance & Privacy](#-compliance--privacy)
- [API Reference](#-api-reference)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🏥 What is VaidyaSetu?

India's AYUSH OPDs serve millions of patients annually, yet most still rely on handwritten paper records, overworked doctors manually transcribing intake notes, and language barriers that exclude non-literate or non-Hindi-speaking patients from giving an accurate history.

**VaidyaSetu is a touchscreen kiosk application** that patients interact with *before* seeing the doctor. It:

1. Greets the patient in their preferred language (Hindi, Tamil, or English)
2. Collects DPDP Act 2023-compliant informed consent
3. Conducts a structured voice-driven clinical interview following the SOCRATES framework
4. Detects red-flag emergency symptoms in real-time and escalates immediately
5. Generates a structured AYUSH-aware clinical summary (Prakriti, Dosha imbalance, chief complaint, HPI, review of systems)
6. Presents the summary to the physician via a protected web dashboard
7. Supports optional ABHA Health ID linking for ABDM-compliant electronic health records

This is not a diagnostic tool. It is a **case-taking assistant** — the physician retains full clinical authority and must review, edit, and approve every summary before it enters the patient record.

---

## ✨ Key Features

### Patient-Facing Kiosk
- **Multilingual from the start** — Hindi, Tamil, and English. Language selection speaks a greeting immediately so the patient understands which button to press before reading it.
- **Voice-first interface** — Hold-to-speak button using Sarvam AI's `saaras:v3` STT model, tuned for Indian-language speech with Cloudflare-edge latency.
- **AI-driven follow-up questions** — The triage engine (Groq `qwen3.8-27b`, Gemini `gemini-3.6-flash` fallback) generates contextual SOCRATES follow-up questions in the patient's language.
- **Red-flag escalation** — Emergency symptom patterns trigger a full-screen high-contrast interrupt with staff notification, preventing patient self-discharge.
- **Touch option grid** — Every question comes with 2–6 one-tap answer options so non-literate patients can still complete the intake.
- **Document scanning** — Patients can photograph existing prescriptions, lab reports, and discharge summaries for OCR ingestion.
- **Offline-capable** — All mutations are queued with `idb-keyval` when the network is unavailable and replayed transparently when connectivity returns.
- **Text-to-Speech (TTS)** — Every question and instruction is read aloud via Sarvam AI `bulbul:v3` (server-proxied, key never exposed to browser). Falls back to browser `SpeechSynthesis` on API failure.

### Accessibility
- **20px minimum body text**, 28px+ headings
- **64px minimum touch targets** on every interactive element
- **WCAG AAA 7:1 contrast** ratio enforced
- **A++ text scaling** (three levels, persisted across sessions)
- **High-contrast mode** for visually impaired users
- **Audio on/off toggle** — when off, zero API calls are fired (not just muted)
- **`prefers-reduced-motion`** respected throughout

### Physician Dashboard
- Real-time OPD queue with session status and red-flag indicators
- Editable structured clinical summary (Chief Complaint, HPI, Medications, Family/Personal History)
- **AYUSH Dosha radar chart** — SVG visualization of Vata/Pitta/Kapha balance from the AYUSH assessment
- FHIR R4 DiagnosticReport generation for ABDM push
- Clerk-authenticated; kiosk routes remain fully public

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Patient Touchscreen                          │
│                                                                     │
│  WelcomePage → ConsentPage → IdentifyPage → EncounterPage           │
│  → DocumentScanPage → SummaryPage                                   │
│                                                                     │
│  React 19 · Zustand (client state) · Tailwind v4 · shadcn/ui        │
└───────────────────────┬─────────────────────────────────────────────┘
                        │  fetch / RPC client (Hono RPC, typed)
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Hono.js Edge API  (/api/[[...route]])                  │
│                                                                     │
│  /ai/transcribe   → Sarvam STT (saaras:v3)                          │
│  /ai/tts          → Sarvam TTS (bulbul:v3) — SARVAM_API_KEY server  │
│  /ai/triage       → Groq (primary) → Gemini (fallback)              │
│  /sessions/*      → CRUD, finalize, transcript sync                 │
│  /doctor/*        → Queue, detail, approve, FHIR export (Clerk-auth)│
└──────┬────────────────────────────┬────────────────────────────────┘
       │ Drizzle ORM                │ Direct HTTP
       ▼                            ▼
┌─────────────┐         ┌──────────────────────────┐
│  Neon DB    │         │  External AI Services     │
│  PostgreSQL │         │  • Sarvam AI (STT + TTS)  │
│  Serverless │         │  • Groq (LLM triage)      │
└─────────────┘         │  • Gemini (LLM fallback + │
                        │    summary generation)    │
                        └──────────────────────────┘
```

The entire stack runs on **Cloudflare Workers** via `@opennextjs/cloudflare`. The API is a standard Hono app exported as a Next.js route handler — no custom server, compatible with both Vercel and Cloudflare.

---

## 🛠️ Technology Stack

| Layer | Technology | Why |
|---|---|---|
| **Framework** | Next.js 16.3 (App Router) | File-based routing, Server Components, built-in image optimization |
| **Language** | TypeScript (strict mode, `noImplicitAny`) | Type safety at every module boundary |
| **API layer** | Hono.js v4 + `@hono/zod-validator` | Lightweight, edge-native, typed RPC client |
| **Database** | Neon PostgreSQL (serverless HTTP driver) | Zero-cold-start at the edge, generous free tier |
| **ORM** | Drizzle ORM + drizzle-zod | Type-safe queries, Zod schema generation, no raw SQL |
| **State** | Zustand v5 | Minimal, fast, fine-grained subscriptions for kiosk UI |
| **Validation** | Zod v4 | Every API boundary validated; no `any` in schemas |
| **Auth** | Clerk v7 (`@clerk/nextjs`) | Physician dashboard protected; kiosk routes bypass-free |
| **UI Primitives** | Base UI + shadcn/ui | Headless, accessible, zero-opinionated styling |
| **Styling** | Tailwind v4 (`@import "tailwindcss"`) | CSS variables, no config file |
| **STT** | Sarvam AI `saaras:v3` | Best-in-class accuracy for Indian languages |
| **TTS** | Sarvam AI `bulbul:v3` | Natural Indian-language voices; server-proxied |
| **LLM (primary)** | Groq `qwen/qwen3.8-27b` | Ultra-low latency triage classification |
| **LLM (fallback/summary)** | Gemini `gemini-3.6-flash` | Clinical summary generation; Groq fallback |
| **Offline sync** | `idb-keyval` | IndexedDB mutation queue; transparent replay |
| **Deployment** | Cloudflare Workers via `@opennextjs/cloudflare` | Edge-global, zero cold starts, free egress |
| **Testing** | Vitest | Unit tests for store logic and API contracts |

---

## 🗄️ Database Schema

```
patients
├── id (uuid PK)
├── full_name, date_of_birth, gender, phone
├── preferred_language (en | hi | ta)
├── abha_id, abha_linked
└── created_at

sessions
├── id (uuid PK)
├── patient_id → patients.id (RESTRICT on delete)
├── kiosk_id, status (in_progress | awaiting_triage | completed | escalated)
├── started_at, completed_at
└── ...

conversations
├── id (uuid PK)
├── session_id → sessions.id (CASCADE)
├── transcript (JSONB: [{role, text, lang, timestamp}])
├── red_flag (bool), red_flag_reason
└── ...

documents
├── id (uuid PK)
├── session_id → sessions.id (CASCADE)
├── r2_key, doc_type, ocr_status
└── extracted_json (JSONB)

summaries
├── id (uuid PK)
├── session_id → sessions.id (CASCADE)
├── chief_complaint, hpi, past_history, drug_allergy_history
├── family_history, personal_history, ros, prior_investigations
├── ayush_assessment (JSONB — Prakriti/Vikriti/Dosha fields)
├── physician_edited (bool), finalized_at
└── ...

abdm_links
├── id (uuid PK)
├── patient_id → patients.id (CASCADE)
├── abha_number, consent_artifact_id
└── linked_at
```

Foreign key policies are intentionally conservative: `patients → sessions` is `RESTRICT` (clinical encounters cannot be silently cascade-deleted), while child records within a session `CASCADE` on session deletion.

---

## 🤖 AI Services

### Speech-to-Text — `saaras:v3`
Handles voice capture during the encounter. Audio is recorded client-side as a WAV blob and `POST`ed to `/api/ai/transcribe`, which forwards it to Sarvam server-side. Falls back to the browser Web Speech API on HTTP 429 or network failure.

### Text-to-Speech — `bulbul:v3`
Every question, instruction, and consent text can be read aloud. The client calls `POST /api/ai/tts` — the Sarvam API key is **never exposed to the browser**. Text longer than 2500 characters is automatically chunked. Voice/language mapping:

| Language | Voice | Rationale |
|---|---|---|
| Hindi (`hi-IN`) | `meera` | Clear diction, works with Hinglish code-mixing |
| Tamil (`ta-IN`) | `ratan` | Recommended for Tamil prosody by Sarvam |
| English (`en-IN`) | `ishita` | Clear Indian-English enunciation |

Pace is set to **0.9×** (below the 1.0 default) for the elderly patient audience. Falls back to browser `SpeechSynthesis` on any API failure.

### Triage LLM — Groq + Gemini
The `POST /api/ai/triage` endpoint evaluates each patient turn against the SOCRATES framework, detects red-flag symptoms, and generates a contextual follow-up question in the patient's language. Groq is the primary provider (ultra-low latency); Gemini is the automatic fallback.

### Clinical Summary — Gemini
`POST /api/sessions/:id/finalize` sends the complete transcript to `generateSummaryGemini()`, which returns a structured AYUSH-aware clinical summary including Prakriti/Dosha assessment fields.

---

## 📁 Project Structure

```
vaidyasetu/
├── app/
│   ├── (kiosk)/          # Public patient-facing routes
│   │   ├── page.tsx          # Welcome / language select
│   │   ├── consent/          # DPDP consent
│   │   ├── identify/         # ABHA linking or guest
│   │   ├── encounter/        # Voice interview (main flow)
│   │   ├── documents/        # Document scan upload
│   │   └── summary/          # Patient review & finalize
│   ├── (doctor)/         # Clerk-protected physician routes
│   │   ├── layout.tsx        # Sidebar shell
│   │   └── dashboard/        # OPD queue + session detail
│   ├── api/[[...route]]/  # Hono.js edge API
│   │   └── route.ts          # All routes (sessions, ai, doctor)
│   ├── sign-in/          # Clerk auth page
│   └── globals.css        # Tailwind v4 + AYUSH design tokens
├── components/
│   ├── kiosk/            # Kiosk-specific components
│   │   ├── useSpeech.ts      # TTS hook (Sarvam-first, Web Speech fallback)
│   │   ├── KioskShell.tsx    # Persistent layout wrapper
│   │   ├── HoldToSpeak.tsx   # Voice capture button
│   │   ├── VirtualKeyboard.tsx
│   │   └── ThinkingIndicator.tsx
│   └── ui/               # shadcn/ui primitives
├── lib/
│   ├── ai/
│   │   ├── sarvam.ts         # STT + TTS (bulbul:v3 fully implemented)
│   │   ├── groq.ts           # Triage LLM
│   │   ├── gemini.ts         # Summary + fallback triage
│   │   └── abdm.ts           # FHIR DiagnosticReport mapping
│   ├── db/
│   │   ├── schema.ts         # Drizzle schema (all tables + Zod)
│   │   └── index.ts          # Neon HTTP client
│   ├── store/
│   │   ├── session.ts        # Encounter state + offline queue
│   │   ├── kiosk-ui.ts       # Accessibility + language settings
│   │   └── consent.ts        # DPDP consent state
│   ├── i18n/             # Dictionary-based i18n (en, hi, ta)
│   ├── env.ts            # Fail-fast Zod env validation
│   └── types.ts          # Shared TypeScript types + Result<T>
├── docs/
│   ├── MODULE_CONTRACT.md    # Module A/B/C/D interface contracts
│   └── TECHNICAL_REFERENCE.md
├── .env.example          # All required keys documented
├── drizzle.config.ts
├── next.config.ts
├── open-next.config.ts   # Cloudflare Workers adapter config
└── wrangler.jsonc        # Cloudflare Wrangler config
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | ≥ 20 | LTS recommended |
| npm | ≥ 10 | Ships with Node 20 |
| PostgreSQL | 15+ | Or a free [Neon](https://neon.tech) database |
| Git | any | — |

You will need API keys for (see [Environment Variables](#environment-variables)):
- **Sarvam AI** — STT + TTS ([console.sarvam.ai](https://console.sarvam.ai))
- **Groq** — primary LLM ([console.groq.com](https://console.groq.com))
- **Google Gemini** — fallback + summary ([aistudio.google.com](https://aistudio.google.com))
- **Clerk** — physician auth ([dashboard.clerk.com](https://dashboard.clerk.com))
- **Neon** — PostgreSQL ([neon.tech](https://neon.tech))

> **Quick demo without Clerk:** Set `CLERK_BYPASS=true` and use any non-empty placeholder for the Clerk keys. The kiosk works fully; the physician dashboard becomes publicly accessible (acceptable for a demo, never for production).

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/VaidyaSetu.git
cd VaidyaSetu

# 2. Install dependencies
npm install

# 3. Copy the environment template
cp .env.example .env.local
# → Open .env.local and fill in all values (see next section)

# 4. Push the database schema
npx drizzle-kit push

# 5. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the patient kiosk.
The physician dashboard is at [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

### Environment Variables

Copy `.env.example` to `.env.local`. Every variable in the file is required unless the comment marks it optional:

```bash
# Speech AI (Sarvam) — https://console.sarvam.ai
SARVAM_API_KEY=your_key_here

# Triage LLM (Groq) — https://console.groq.com
GROQ_API_KEY=your_key_here

# Summary + fallback LLM (Gemini) — https://aistudio.google.com
GEMINI_API_KEY=your_key_here

# Physician auth (Clerk) — https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Database (Neon or any PostgreSQL 15+) — https://neon.tech
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# ABDM — optional for demo, required for ABHA linking in production
ABDM_CLIENT_ID=
ABDM_CLIENT_SECRET=

# Development only — set true to skip Clerk for demos
CLERK_BYPASS=true
```

### Database Setup

VaidyaSetu uses Drizzle ORM. All migrations are generated automatically:

```bash
# Push schema changes to the database (recommended for first setup)
npx drizzle-kit push

# Or generate a SQL migration file (for controlled deployments)
npx drizzle-kit generate
npx drizzle-kit migrate
```

### Running Locally

```bash
npm run dev       # Next.js development server with Turbopack
npm run build     # Production build (validates TypeScript)
npm run test      # Run Vitest unit tests
npm run lint      # ESLint
```

### Deploying to Cloudflare

VaidyaSetu is pre-configured for Cloudflare Workers via `@opennextjs/cloudflare`:

```bash
# Build for Cloudflare Workers
npm run build:worker

# Preview locally with Wrangler
npm run preview:worker

# Deploy to Cloudflare
npm run deploy
```

Add your environment variables to Cloudflare via the dashboard or Wrangler:
```bash
wrangler secret put SARVAM_API_KEY
wrangler secret put GROQ_API_KEY
# ... repeat for each key
```

> **Note on the Edge Runtime deprecation warning:** The Next.js 16 build will emit `⚠ The Edge Runtime is deprecated.` for the Hono API route. This is expected — Hono runs fine on the `nodejs` runtime for local development and on the Cloudflare Workers adapter for production. It does not affect functionality.

---

## 🔄 Application Flow

```
Patient arrives at kiosk
        │
        ▼
① Welcome Screen
   Select language (Hindi / Tamil / English)
   → Greeting spoken in selected language
        │
        ▼
② Consent Screen  (DPDP Act 2023)
   4 toggles: clinical data collection (required),
              ABHA linking (optional),
              physician data sharing (required),
              temporary storage (required)
   → Each consent purpose can be read aloud
        │
        ▼
③ Identity Screen
   Path A: Link ABHA Health ID (if consented)
   Path B: Continue as Guest
        │
        ▼
④ Encounter Screen  ← main clinical interaction
   AI asks one question at a time (SOCRATES framework)
   Patient responds via:
     • Hold-to-speak voice (Sarvam STT)
     • Touch-option grid (one-tap answers)
     • Virtual keyboard (fallback)
   Each answer is confirmed before sending to AI
   Red-flag → full-screen escalation interrupt
   Loop until AI determines history is complete
        │
        ▼
⑤ Document Scan Screen
   Camera capture of prescriptions / lab reports
   OCR queued for processing
   (skippable)
        │
        ▼
⑥ Summary Review Screen
   Patient confirms the captured history
   Explicit confirm → session finalized
   AI generates structured clinical summary
   Patient receives a 4-character take-away code
        │
        ▼
Doctor's dashboard updates in real-time
```

---

## 👨‍⚕️ Physician Dashboard

The physician dashboard lives at `/dashboard` and is protected by Clerk authentication.

**Queue View (`/dashboard`):**
- Shows all active sessions sorted by start time
- Status chips: In Progress / Completed / Escalated (red flag)
- ABHA-linked badge
- Direct link to session detail

**Session Detail (`/dashboard/:sessionId`):**
- Patient demographics
- Editable clinical summary fields (Chief Complaint, HPI, Personal History, Family History)
- AYUSH Dosha radar chart (Vata / Pitta / Kapha) from the AI AYUSH assessment
- Red-flag alert panel
- "Push to ABDM" action (generates FHIR R4 DiagnosticReport)
- Save Draft / Approve flow

---

## ♿ Accessibility Design

VaidyaSetu is designed for patients who may be elderly, visually impaired, non-literate, or unfamiliar with touchscreens. Every design decision was evaluated against this audience:

| Constraint | Implementation |
|---|---|
| Minimum body text | 20px (`text-xl`) |
| Minimum heading text | 28px (`text-3xl`) |
| Minimum touch target | 64px × 64px (`.kiosk-touch` class enforced) |
| Contrast ratio | WCAG AAA 7:1 — verified against AYUSH palette |
| Text scaling | 3 levels (Comfortable / Large / XL), persisted in `localStorage` |
| High contrast mode | Togglable; applies CSS class to root |
| Audio | On by default; when off, zero API calls fire (not just muted) |
| Animations | Respect `prefers-reduced-motion` throughout |
| Navigation | Back / Home / Help on every screen after language select |
| Autoplay | TTS only plays following explicit user gesture or audio-unlocked session |

---

## 🔒 Compliance & Privacy

| Regulation | How VaidyaSetu addresses it |
|---|---|
| **DPDP Act 2023** | Granular purpose-specific consent collected before any data capture. Each purpose (clinical data, ABHA linking, physician sharing, storage) is individually toggled. Consent timestamp recorded. |
| **ABDM / NHA** | ABHA Health ID optional — patients who do not consent to ABDM linking are not blocked. Session data can be exported as FHIR R4 DiagnosticReport. |
| **Clinical safety** | VaidyaSetu is explicitly a case-taking assistant, not a diagnostic tool. The physician dashboard requires explicit physician review and approval before any record is finalized. |
| **API key security** | All external API keys are server-side only (`serverEnv`). The Sarvam API key is proxied through the Hono backend — it never appears in any client bundle. |
| **Offline resilience** | Mutations are queued locally (IndexedDB) when offline and replayed when connectivity returns — no patient data is lost. |
| **Anonymous intake** | The kiosk creates anonymous sessions when patients choose not to provide PII, using randomised internal IDs rather than placeholder personal data. |

---

## 📡 API Reference

All endpoints are under `/api`. The full type-safe client is generated from the Hono `AppType` export.

### AI Routes (`/api/ai`)

| Method | Path | Body | Description |
|---|---|---|---|
| `POST` | `/api/ai/transcribe` | `FormData { file: Blob }` | Sarvam STT — returns transcript string |
| `POST` | `/api/ai/tts` | `{ text, language, voice?, pace? }` | Sarvam TTS — returns `{ chunks: string[], contentType }` |
| `POST` | `/api/ai/triage` | `{ transcript, language? }` | Triage LLM — returns `TriageData` |

### Session Routes (`/api/sessions`)

| Method | Path | Body | Description |
|---|---|---|---|
| `POST` | `/api/sessions` | Patient + kiosk ID | Create named session |
| `POST` | `/api/sessions/anon` | `{ kioskId, preferredLanguage, consent?, patientInfo? }` | Create anonymous session |
| `PATCH` | `/api/sessions/:id` | `{ status?, transcript? }` | Update session status or transcript |
| `POST` | `/api/sessions/:id/documents` | `FormData { file, doc_type }` | Upload document to session |
| `POST` | `/api/sessions/:id/finalize` | — | Finalize + generate clinical summary |
| `GET` | `/api/sessions/:id/summary` | — | Fetch generated summary |

### Doctor Routes (`/api/doctor`) — Clerk-protected

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/doctor/sessions` | OPD queue — all sessions with counts |
| `GET` | `/api/doctor/sessions/:id` | Full session detail with summary + transcript |
| `POST` | `/api/doctor/sessions/:id/approve` | Physician approval — marks `physician_edited=true` |
| `POST` | `/api/doctor/sessions/:id/fhir` | Generate + return FHIR DiagnosticReport |

---

## 🤝 Contributing

This project is archived and no longer actively maintained. However, pull requests for the following would be considered by the community:

- **ABDM gateway integration** — The `/doctor/sessions/:id/fhir` endpoint generates valid FHIR R4 bundles but the actual ABDM push is stubbed. A live ABDM sandbox integration would be the highest-value contribution.
- **Camera + OCR pipeline** — The document scan UI exists; the backend OCR (`extractDocumentOcr` in `lib/ai/sarvam.ts`) is not yet implemented. Connecting Sarvam's document OCR API would complete this flow.
- **Additional Indian languages** — The i18n system (`lib/i18n/`) is dictionary-based and easy to extend. Telugu, Kannada, and Bengali would be the natural next additions.
- **Real QR code generation** — The take-away code screen uses a placeholder dot-grid. Replacing it with the `qrcode` package would be straightforward.
- **Tests** — Coverage for the AI service layer and Hono route handlers is sparse.

### Development Guidelines
1. TypeScript strict mode — no `any`, every exported function has an explicit return type.
2. Zod validation on every API boundary, incoming and outgoing.
3. Drizzle only — never `db.execute()` with a raw string.
4. No empty `catch` blocks — errors are logged with context or re-thrown.
5. Run `npx tsc --noEmit && npm test` before opening a PR.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

You are free to fork, modify, and deploy VaidyaSetu in your own AYUSH or community health setting. Attribution is appreciated but not required.

---

<div align="center">

**Built with ❤️ for Smart India Hackathon 2024**

*Problem Statement 26047 — Ministry of AYUSH, All India Institute of Ayurveda*

</div>
