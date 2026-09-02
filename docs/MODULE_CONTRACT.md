# VaidyaSetu — Module Contracts

> **Phase 1 — Domain Deconstruction & Module Contract**
>
> These are **interface-only** TypeScript contracts. No business logic.
> Every module boundary is defined by its input/output types and listed
> external dependencies. Ambiguities are flagged with `TODO` comments.

---

## Shared Types

```typescript
// ──────────────────────────────────────────────────────────────────────
// Shared primitives used across all four modules
// ──────────────────────────────────────────────────────────────────────

/** Discriminated union for cross-module error handling.
 *  Modules never throw across boundaries — they return Result<T, E>. */
type Result<T, E = VaidyaSetuError> =
  | { success: true; data: T }
  | { success: false; error: E };

interface VaidyaSetuError {
  code: string;      // machine-readable, e.g. "RED_FLAG_DETECTED"
  message: string;   // human-readable context
  retryable: boolean;
}

/** ISO 639-1 codes supported by the kiosk UI (next-intl static dictionaries). */
type SupportedLanguage = "en" | "hi" | "ta";

/** Unique identifiers — all UUIDs in the database layer. */
type PatientId = string;
type SessionId = string;
type DocumentId = string;
type ConsentArtifactId = string;
type AbhaNumber = string;

/** Timestamp in ISO 8601 format. */
type ISOTimestamp = string;

/** Gender enum matching the Drizzle schema. */
type Gender = "male" | "female" | "other";
```

---

## Module A — ConversationalHistoryEngine

### Purpose

Adaptive voice/touch interview engine. Supports dual-mode input
(voice via Sarvam STT, touch via on-screen options). Implements AYUSH
extended assessment (Dashavidha Pariksha) and red-flag detection with
SOCRATES branching on pain complaints.

### External Dependencies

| Dependency | Usage |
|---|---|
| **Sarvam AI** (`saaras:v3`) | Speech-to-Text transcription of patient audio |
| **Sarvam AI** (`bulbul:v3`) | Text-to-Speech for low-literacy audio guidance |
| **Groq** (`llama-3.3-70b-versatile`) | Triage reasoning, red-flag detection, SOCRATES branching, follow-up question generation |
| **Gemini** (`gemini-2.5-flash`) | Failover LLM if Groq returns 429/5xx (same Zod output contract) |

### TypeScript Contracts

```typescript
// ──────────────────────────────────────────────────────────────────────
// Module A: ConversationalHistoryEngine
// ──────────────────────────────────────────────────────────────────────

// --- Input types ---

type InputMode = "voice" | "touch";

interface AudioInput {
  mode: "voice";
  /** Raw audio blob — chunked REST upload, .wav per statement. */
  audioBlob: Blob;
  /** Language the patient is speaking. */
  language: SupportedLanguage;
}

interface TouchInput {
  mode: "touch";
  /** Selected option ID or free-text from on-screen keyboard. */
  selectedOptionId: string | null;
  freeText: string | null;
  language: SupportedLanguage;
}

type PatientInput = AudioInput | TouchInput;

interface ConversationContext {
  sessionId: SessionId;
  patientId: PatientId;
  /** Full transcript so far — appended to on each turn. */
  transcript: TranscriptEntry[];
  /** Whether the AYUSH extended assessment mode is active. */
  ayushModeEnabled: boolean;
  /** Current stage in the interview flow. */
  currentStage: InterviewStage;
  /** SOCRATES fields already answered (only populated if pain detected). */
  socratesState: SocratesState | null;
  /** Dashavidha Pariksha fields already assessed (only if ayushModeEnabled). */
  dashavidhaState: DashavidhaState | null;
}

// --- Interview flow types ---

type InterviewStage =
  | "chief_complaint"
  | "hpi"
  | "past_history"
  | "drug_allergy"
  | "family_history"
  | "personal_history"
  | "ros"            // Review of Systems
  | "ayush_extended" // Dashavidha Pariksha
  | "complete";

interface TranscriptEntry {
  role: "patient" | "system";
  text: string;
  lang: SupportedLanguage;
  timestamp: ISOTimestamp;
}

// --- SOCRATES pain assessment ---

interface SocratesState {
  site: string | null;
  onset: string | null;
  character: string | null;
  radiation: string | null;
  associations: string | null;
  timeCourse: string | null;
  exacerbatingRelieving: string | null;
  severity: string | null;  // typically 0–10 scale
}

type SocratesField = keyof SocratesState;

// --- AYUSH / Dashavidha Pariksha ---

interface DashavidhaState {
  prakriti: string | null;    // Constitutional type (Vata/Pitta/Kapha)
  vikriti: string | null;     // Current imbalance state
  agni: string | null;        // Digestive fire assessment
  koshtha: string | null;     // Bowel habit pattern (Krura/Mridu/Madhyama)
  aharaVihara: string | null; // Diet and lifestyle patterns
  nidana: string | null;      // Causative factors
  samprapti: string | null;   // Pathogenesis understanding
}

// TODO: Dashavidha Pariksha traditionally includes 10 assessment factors
// (Dashavidha = "tenfold"). The spec lists 7. The remaining 3 (Sara, Samhanana,
// Satmya / Pramana / Satva — varies by Ayurvedic text) are omitted here per
// the spec. Confirm with domain expert whether the full 10 are needed or
// whether these 7 suffice for the OPD kiosk context.

type DashavidhaField = keyof DashavidhaState;

// --- Red-flag detection ---

interface RedFlagResult {
  redFlag: boolean;
  redFlagReason: string | null;
}

// --- Triage evaluation output (Groq / Gemini) ---

interface TriageEvaluation {
  redFlag: boolean;
  redFlagReason: string | null;
  /** SOCRATES fields still unanswered — only populated if pain detected. */
  socratesFieldsMissing: SocratesField[];
  /** The single next follow-up question to ask, or null if stage complete. */
  nextQuestion: string | null;
}

// --- STT output ---

interface TranscriptionResult {
  text: string;
  language: SupportedLanguage;
  confidence: number;
  /** True if Web Speech API fallback was used (Sarvam 429). */
  degraded: boolean;
}

// --- TTS output ---

interface SpeechSynthesisResult {
  /** Audio data for playback to the patient. */
  audioBlob: Blob;
  language: SupportedLanguage;
}

// --- Module A engine response ---

interface ConversationTurn {
  /** Updated transcript including this turn. */
  updatedTranscript: TranscriptEntry[];
  /** Triage evaluation for this turn. */
  triage: TriageEvaluation;
  /** The question/prompt to present to the patient next. */
  nextPrompt: string;
  /** Touch-mode options for the next question (null if open-ended). */
  touchOptions: TouchOption[] | null;
  /** Updated interview stage after this turn. */
  nextStage: InterviewStage;
  /** Updated SOCRATES state (null if no pain context). */
  updatedSocratesState: SocratesState | null;
  /** Updated Dashavidha state (null if AYUSH mode inactive). */
  updatedDashavidhaState: DashavidhaState | null;
  /** TTS audio of the next prompt for voice mode. */
  audioPrompt: SpeechSynthesisResult | null;
}

interface TouchOption {
  id: string;
  label: string;
  /** Localized label in patient's language. */
  localizedLabel: string;
}

// --- Module A public interface ---

interface IConversationalHistoryEngine {
  /** Process a single patient input turn and return the next conversation state. */
  processTurn(
    input: PatientInput,
    context: ConversationContext
  ): Promise<Result<ConversationTurn>>;

  /** Transcribe audio input via Sarvam STT (with Web Speech API fallback). */
  transcribeAudio(
    audioBlob: Blob,
    language: SupportedLanguage
  ): Promise<Result<TranscriptionResult>>;

  /** Evaluate transcript for red flags and generate follow-up via Groq (Gemini fallback). */
  evaluateTriage(
    transcript: TranscriptEntry[],
    socratesState: SocratesState | null,
    ayushModeEnabled: boolean
  ): Promise<Result<TriageEvaluation>>;

  /** Generate TTS audio for a prompt string via Sarvam Bulbul. */
  synthesizeSpeech(
    text: string,
    language: SupportedLanguage
  ): Promise<Result<SpeechSynthesisResult>>;
}
```

---

## Module B — MedicalDocumentIntelligence

### Purpose

OCR ingestion for 1–2 pages of medical documents (prescriptions, lab
reports, discharge summaries, imaging reports). Synchronous processing
via Gemini. Constructs a chronological timeline from extracted data and
flags abnormal lab values.

### External Dependencies

| Dependency | Usage |
|---|---|
| **Gemini** (`gemini-2.5-flash`) | Vision OCR — extract structured data from document images/PDFs |
| **Cloudflare R2** | Temporary storage of uploaded document blobs (referenced by `r2_key`, never stored in Postgres) |

### TypeScript Contracts

```typescript
// ──────────────────────────────────────────────────────────────────────
// Module B: MedicalDocumentIntelligence
// ──────────────────────────────────────────────────────────────────────

// --- Input types ---

type DocumentType = "prescription" | "lab_report" | "discharge_summary" | "imaging";

type OcrStatus = "pending" | "processing" | "complete" | "failed";

interface DocumentUploadInput {
  sessionId: SessionId;
  /** Raw file bytes — image (JPEG/PNG) or PDF, 1–2 pages max. */
  fileBlob: Blob;
  fileName: string;
  mimeType: "image/jpeg" | "image/png" | "application/pdf";
  docType: DocumentType;
}

// --- OCR extraction output (Gemini Vision) ---

interface ExtractedDocumentData {
  /** Document-level metadata parsed by Gemini. */
  documentDate: ISOTimestamp | null;
  facilityName: string | null;
  doctorName: string | null;
  /** Extracted content varies by document type. */
  content: PrescriptionContent | LabReportContent | DischargeSummaryContent | ImagingContent;
}

interface PrescriptionContent {
  type: "prescription";
  medications: MedicationEntry[];
  diagnoses: string[];
}

interface MedicationEntry {
  name: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  route: string | null;  // oral, topical, IV, etc.
}

interface LabReportContent {
  type: "lab_report";
  tests: LabTestEntry[];
}

interface LabTestEntry {
  testName: string;
  value: string;
  unit: string | null;
  referenceRange: string | null;
  /** Flagged by Gemini or by comparing value to referenceRange. */
  abnormal: boolean;
  // TODO: Abnormal-value detection strategy is ambiguous. Should we rely
  // solely on Gemini's judgment (risk: hallucinated ranges), or post-process
  // against a known reference-range database? For now, we use Gemini's output
  // and flag it as potentially unreliable. Domain expert review required.
}

interface DischargeSummaryContent {
  type: "discharge_summary";
  admissionDate: ISOTimestamp | null;
  dischargeDate: ISOTimestamp | null;
  diagnoses: string[];
  procedures: string[];
  dischargeMedications: MedicationEntry[];
  followUpInstructions: string | null;
}

interface ImagingContent {
  type: "imaging";
  modality: string | null; // X-ray, CT, MRI, USG, etc.
  bodyPart: string | null;
  findings: string;
  impression: string | null;
}

// --- Chronological timeline ---

interface TimelineEvent {
  date: ISOTimestamp;
  documentId: DocumentId;
  docType: DocumentType;
  /** Brief summary of the event for the timeline view. */
  summary: string;
  /** If lab_report, which tests were abnormal. */
  abnormalFindings: string[];
}

interface DocumentTimeline {
  events: TimelineEvent[];
  /** Aggregate list of all abnormal lab values across all documents. */
  allAbnormalLabValues: AbnormalLabValue[];
}

interface AbnormalLabValue {
  documentId: DocumentId;
  testName: string;
  value: string;
  unit: string | null;
  referenceRange: string | null;
  documentDate: ISOTimestamp | null;
}

// --- Document record (mirrors Drizzle schema) ---

interface DocumentRecord {
  id: DocumentId;
  sessionId: SessionId;
  r2Key: string;
  docType: DocumentType;
  ocrStatus: OcrStatus;
  extractedJson: ExtractedDocumentData | null;
  uploadedAt: ISOTimestamp;
}

// --- Module B public interface ---

interface IMedicalDocumentIntelligence {
  /** Upload a document to R2 and create a pending document record. */
  uploadDocument(
    input: DocumentUploadInput
  ): Promise<Result<DocumentRecord>>;

  /** Run OCR extraction on a pending document via Gemini Vision. Synchronous. */
  extractDocument(
    documentId: DocumentId
  ): Promise<Result<ExtractedDocumentData>>;

  /** Build a chronological timeline from all documents in a session. */
  buildTimeline(
    sessionId: SessionId
  ): Promise<Result<DocumentTimeline>>;

  /** Retrieve all abnormal lab values for a session. */
  getAbnormalLabValues(
    sessionId: SessionId
  ): Promise<Result<AbnormalLabValue[]>>;
}
```

---

## Module C — StructuredSummaryGenerator

### Purpose

Stateless transform: takes a conversation transcript (from Module A)
and an OCR chronology (from Module B) and produces a single-page
clinical summary following the standard medical history format. Outputs
bilingual: patient-facing in local language, physician-facing in
English/Hindi.

### External Dependencies

| Dependency | Usage |
|---|---|
| **Groq** (`llama-3.3-70b-versatile`) | Primary LLM for structured summary generation from transcript + OCR data |
| **Gemini** (`gemini-2.5-flash`) | Failover LLM if Groq returns 429/5xx |
| **Sarvam AI** (Translation API) | Translation of physician-facing English summary to patient-facing local language |

### TypeScript Contracts

```typescript
// ──────────────────────────────────────────────────────────────────────
// Module C: StructuredSummaryGenerator
// ──────────────────────────────────────────────────────────────────────

// --- Input types ---

interface SummaryGenerationInput {
  sessionId: SessionId;
  /** Full conversation transcript from Module A. */
  transcript: TranscriptEntry[];
  /** Document timeline and extracted data from Module B (may be empty). */
  documentTimeline: DocumentTimeline | null;
  /** Patient's preferred language for the patient-facing output. */
  patientLanguage: SupportedLanguage;
  /** AYUSH assessment data, if collected. */
  ayushAssessment: DashavidhaState | null;
}

// --- Clinical summary structure ---
// Follows: Chief Complaint → HPI → Past History → Drug/Allergy →
//          Family → Personal → ROS → Prior Investigations

interface ClinicalSummary {
  chiefComplaint: string;
  hpiNarrative: string; // History of Present Illness — narrative paragraph
  pastHistory: PastHistoryEntry[];
  drugAllergyHistory: DrugAllergyHistory;
  familyHistory: string;
  personalHistory: PersonalHistory;
  reviewOfSystems: ReviewOfSystems;
  priorInvestigations: PriorInvestigation[];
  /** Present only when AYUSH extended mode was active during the interview. */
  ayushAssessment: AyushAssessmentSummary | null;
}

interface PastHistoryEntry {
  condition: string;
  diagnosedDate: string | null; // approximate, e.g. "2019"
  status: "active" | "resolved" | "unknown";
  notes: string | null;
}

interface DrugAllergyHistory {
  currentMedications: MedicationEntry[];
  pastMedications: MedicationEntry[];
  allergies: AllergyEntry[];
}

interface AllergyEntry {
  allergen: string;
  reaction: string | null;
  severity: "mild" | "moderate" | "severe" | "unknown";
}

interface PersonalHistory {
  smoking: string | null;
  alcohol: string | null;
  diet: string | null; // veg/non-veg/mixed
  exercise: string | null;
  occupation: string | null;
  sleep: string | null;
  // TODO: For AYUSH context, personal history may need to capture
  // Dinacharya (daily routine) and Ritucharya (seasonal regimen).
  // Confirm whether these are expected here or only under ayushAssessment.
}

interface ReviewOfSystems {
  /** Each key is a body system; value is findings or "unremarkable". */
  [system: string]: string;
  // TODO: Should ROS be a free-form record or a fixed set of systems
  // (cardiovascular, respiratory, GI, musculoskeletal, neurological, etc.)?
  // Using Record<string, string> for flexibility until confirmed.
}

interface PriorInvestigation {
  testName: string;
  date: ISOTimestamp | null;
  result: string;
  abnormal: boolean;
  source: "ocr" | "patient_reported";
}

interface AyushAssessmentSummary {
  prakriti: string | null;
  vikriti: string | null;
  agni: string | null;
  koshtha: string | null;
  aharaVihara: string | null;
  nidana: string | null;
  samprapti: string | null;
}

// --- Bilingual output ---

interface BilingualSummary {
  /** Physician-facing: structured clinical summary in English. */
  physicianSummary: ClinicalSummary;
  /** Patient-facing: simplified summary in the patient's preferred language. */
  patientSummary: PatientFacingSummary;
}

interface PatientFacingSummary {
  language: SupportedLanguage;
  /** Simplified, non-technical summary of the visit. */
  visitSummary: string;
  /** List of medications the patient should be aware of. */
  medicationList: string[];
  /** Key follow-up instructions in plain language. */
  followUpInstructions: string[];
  /** Any red flags explained in accessible terms. */
  warningSignsToWatch: string[];
}

// --- Summary record (mirrors Drizzle schema) ---

interface SummaryRecord {
  id: string;
  sessionId: SessionId;
  chiefComplaint: string;
  hpi: string;
  pastHistory: PastHistoryEntry[];
  drugAllergyHistory: DrugAllergyHistory;
  familyHistory: string;
  personalHistory: PersonalHistory;
  ros: ReviewOfSystems;
  priorInvestigations: PriorInvestigation[];
  ayushAssessment: AyushAssessmentSummary | null;
  physicianEdited: boolean;
  finalizedAt: ISOTimestamp | null;
}

// --- Module C public interface ---

interface IStructuredSummaryGenerator {
  /** Generate a bilingual clinical summary from transcript + OCR data.
   *  This is a stateless transform — all inputs are passed in, nothing is
   *  read from the database by this function. */
  generateSummary(
    input: SummaryGenerationInput
  ): Promise<Result<BilingualSummary>>;

  /** Translate a physician-facing summary section to the patient's language
   *  via Sarvam. Used internally by generateSummary. */
  translateToPatientLanguage(
    text: string,
    targetLanguage: SupportedLanguage
  ): Promise<Result<string>>;
}
```

---

## Module D — ConsentPrivacyIntegration

### Purpose

Handles ABDM (Ayushman Bharat Digital Mission) OAuth2 handshake, ABHA
number verification, DPDP Act 2023-compliant consent capture, and
session data wipe after submission. Ensures no patient data persists
beyond the session lifecycle without explicit consent.

### External Dependencies

| Dependency | Usage |
|---|---|
| **ABDM Sandbox V3 APIs** | OAuth2 gateway session tokens, ABHA verification, FHIR R4 data exchange |
| **Neon Postgres** (via Drizzle) | Read/write `abdm_links` table, cascade-delete session data on wipe |

### TypeScript Contracts

```typescript
// ──────────────────────────────────────────────────────────────────────
// Module D: ConsentPrivacyIntegration
// ──────────────────────────────────────────────────────────────────────

// --- ABDM OAuth2 types ---

interface AbdmGatewayToken {
  accessToken: string;
  expiresIn: number;       // seconds until expiry
  issuedAt: ISOTimestamp;
  tokenType: "Bearer";
}

interface AbdmCredentials {
  clientId: string;
  clientSecret: string;
}

// --- ABHA verification ---

interface AbhaVerificationInput {
  /** Patient-provided ABHA number or ABHA address. */
  abhaIdentifier: string;
  // TODO: ABDM V3 supports multiple verification methods (Aadhaar OTP,
  // Mobile OTP, demographics). Biometric is out of scope per spec.
  // Which verification method(s) should the kiosk support? For now,
  // exposing a generic interface; the implementation will pick the method.
  verificationMethod: "aadhaar_otp" | "mobile_otp" | "demographics";
}

interface AbhaVerificationResult {
  verified: boolean;
  abhaNumber: AbhaNumber;
  patientName: string | null;
  gender: Gender | null;
  dateOfBirth: string | null;
  /** ABDM health ID / PHR address. */
  healthId: string | null;
}

// --- DPDP Act 2023 consent ---

/** Consent purposes as required by DPDP Act 2023.
 *  Each purpose must be presented to the patient individually. */
type ConsentPurpose =
  | "clinical_data_collection"     // collecting health data during the visit
  | "abdm_health_record_linking"   // linking to ABDM for health record exchange
  | "data_sharing_with_physician"  // sharing summary with the consulting physician
  | "temporary_storage";           // storing data for the duration of the session

interface ConsentItem {
  purpose: ConsentPurpose;
  granted: boolean;
  grantedAt: ISOTimestamp | null;
  /** Patient-facing description in their language. */
  description: string;
}

interface ConsentCaptureInput {
  sessionId: SessionId;
  patientId: PatientId;
  /** Individual consent items — each purpose must be explicitly addressed. */
  consents: ConsentItem[];
  /** Language the consent was presented in. */
  consentLanguage: SupportedLanguage;
  // TODO: DPDP Act 2023 requires consent to be "free, specific, informed,
  // unconditional, and unambiguous" (Section 6). Should we record the exact
  // text shown to the patient at consent time for audit purposes? This would
  // require versioning the consent text. Flagging for legal review.
}

interface ConsentRecord {
  id: string;
  sessionId: SessionId;
  patientId: PatientId;
  consents: ConsentItem[];
  consentLanguage: SupportedLanguage;
  capturedAt: ISOTimestamp;
  /** ABDM consent artifact ID, if ABDM linking was consented to. */
  abdmConsentArtifactId: ConsentArtifactId | null;
}

// --- ABDM link record (mirrors Drizzle schema) ---

interface AbdmLinkRecord {
  id: string;
  patientId: PatientId;
  abhaNumber: AbhaNumber;
  consentArtifactId: ConsentArtifactId | null;
  linkedAt: ISOTimestamp;
}

// --- Session data wipe ---

interface SessionWipeResult {
  sessionId: SessionId;
  /** Tables/records that were wiped. */
  wipedEntities: WipedEntity[];
  /** R2 keys of documents that were deleted from the bucket. */
  deletedR2Keys: string[];
  wipedAt: ISOTimestamp;
}

interface WipedEntity {
  table: "conversations" | "documents" | "summaries";
  recordCount: number;
}

// TODO: Should session wipe delete the patient record itself, or only the
// session-scoped data (conversations, documents, summaries)? If the patient
// has an ABDM link, wiping the patient row would orphan the abdm_links record.
// Current design: wipe session data only, preserve patient + abdm_links rows.
// Confirm this aligns with DPDP Act requirements.

// --- Module D public interface ---

interface IConsentPrivacyIntegration {
  /** Perform OAuth2 handshake with ABDM V3 sandbox gateway.
   *  Returns a session token. Token is cached in memory with its expiry
   *  — never persisted to the database. */
  getGatewaySessionToken(
    credentials: AbdmCredentials
  ): Promise<Result<AbdmGatewayToken>>;

  /** Verify an ABHA number/address against the ABDM gateway. */
  verifyAbha(
    input: AbhaVerificationInput,
    token: AbdmGatewayToken
  ): Promise<Result<AbhaVerificationResult>>;

  /** Capture DPDP Act 2023-compliant consent from the patient. */
  captureConsent(
    input: ConsentCaptureInput
  ): Promise<Result<ConsentRecord>>;

  /** Link a verified ABHA to a patient record. */
  linkAbha(
    patientId: PatientId,
    abhaNumber: AbhaNumber,
    consentArtifactId: ConsentArtifactId | null
  ): Promise<Result<AbdmLinkRecord>>;

  /** Wipe all session-scoped data after submission.
   *  Deletes conversations, documents (both DB records and R2 blobs),
   *  and summaries for the given session.
   *  Does NOT delete the patient or abdm_links records. */
  wipeSessionData(
    sessionId: SessionId
  ): Promise<Result<SessionWipeResult>>;

  // TODO: Should there be a `revokeConsent` method for post-session consent
  // withdrawal (DPDP Act Section 6(6))? This is a v2 concern if session data
  // is wiped immediately post-submission, but flagging for completeness.
}
```

---

## Cross-Module Dependency Matrix

| Module | Sarvam AI | Groq | Gemini | ABDM V3 | Cloudflare R2 | Neon (Drizzle) |
|---|---|---|---|---|---|---|
| **A — ConversationalHistoryEngine** | STT (`saaras:v3`), TTS (`bulbul:v3`) | Triage + SOCRATES reasoning | Failover LLM | — | — | Read/write transcripts |
| **B — MedicalDocumentIntelligence** | — | — | Vision OCR | — | Upload/delete blobs | Read/write documents |
| **C — StructuredSummaryGenerator** | Translation | Summary generation | Failover LLM | — | — | Write summaries |
| **D — ConsentPrivacyIntegration** | — | — | — | OAuth2, ABHA verify | Delete blobs on wipe | Read/write consent + links |

---

## Data Flow Between Modules

```
Patient Input
     │
     ▼
┌─────────────────────────────┐
│  A: ConversationalHistory   │──── transcript ────┐
│     Engine                  │                    │
└─────────────────────────────┘                    │
                                                   ▼
Document Upload                          ┌─────────────────────────┐
     │                                   │  C: StructuredSummary   │
     ▼                                   │     Generator           │
┌─────────────────────────────┐          └─────────────────────────┘
│  B: MedicalDocument         │──── timeline ──────┘        │
│     Intelligence            │                             │
└─────────────────────────────┘                    summary   │
                                                   ▼
                                          ┌─────────────────────────┐
                                          │  D: ConsentPrivacy      │
                                          │     Integration         │
                                          └─────────────────────────┘
                                                   │
                                          ABDM push + session wipe
```

---

## Open Ambiguities (Consolidated TODOs)

1. **Dashavidha Pariksha scope** — Spec lists 7 of 10 traditional assessment factors. Confirm with AYUSH domain expert whether remaining 3 (Sara, Samhanana, Satmya/Pramana/Satva) are needed.

2. **Abnormal lab value detection** — Should we trust Gemini's OCR output for abnormal flags, or post-process against a known reference-range database? Current design uses Gemini output directly.

3. **Review of Systems structure** — Should ROS be a fixed enum of body systems or a flexible `Record<string, string>`? Using flexible format pending confirmation.

4. **ABHA verification method** — Which verification methods (Aadhaar OTP, Mobile OTP, demographics) should the kiosk support? Biometric is out of scope per spec.

5. **DPDP Act consent text versioning** — Should we store the exact consent text shown at capture time for audit trails?

6. **Session wipe scope** — Current design wipes session data (conversations, documents, summaries) but preserves patient + ABDM link records. Confirm DPDP compliance.

7. **Consent revocation** — Post-session consent withdrawal (DPDP Section 6(6)) is deferred to v2 since data is wiped immediately post-submission.

8. **Dinacharya/Ritucharya** — Should daily routine and seasonal regimen data live under `personalHistory` or under `ayushAssessment`?
