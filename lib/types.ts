/**
 * Shared type primitives used across all VaidyaSetu modules.
 * Defined in docs/MODULE_CONTRACT.md — do not redefine boundaries independently.
 */

// ──────────────────────────────────────────────────────────────────────
// Result type — discriminated union for cross-module error handling.
// Modules never throw across boundaries — they return Result<T, E>.
// ──────────────────────────────────────────────────────────────────────

export type Result<T, E = VaidyaSetuError> =
  | { success: true; data: T }
  | { success: false; error: E };

export interface VaidyaSetuError {
  code: string;
  message: string;
  retryable: boolean;
}

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function err<E = VaidyaSetuError>(error: E): Result<never, E> {
  return { success: false, error };
}

// ──────────────────────────────────────────────────────────────────────
// Domain primitives
// ──────────────────────────────────────────────────────────────────────

export type SupportedLanguage = "en" | "hi" | "ta";
export type PatientId = string;
export type SessionId = string;
export type DocumentId = string;
export type ConsentArtifactId = string;
export type AbhaNumber = string;
export type ISOTimestamp = string;
export type Gender = "male" | "female" | "other";
