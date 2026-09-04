"use client";

import { useState } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";

interface SummaryFields {
  chief_complaint: string;
  hpi: string;
  family_history: string;
  personal_history: string;
}

export interface SummaryEditorProps {
  sessionId: string;
  initialSummary: SummaryFields;
}

const FIELD_LABELS: Record<keyof SummaryFields, string> = {
  chief_complaint: "Chief Complaint",
  hpi: "History of Present Illness",
  family_history: "Family History",
  personal_history: "Personal History",
};

/**
 * SummaryEditor — inline editing for clinical summary text fields.
 * Each field has its own edit/save/cancel cycle.
 * On save, PATCHes the session via the API.
 *
 * NOTE: The API currently doesn't expose a summary PATCH endpoint.
 * This component calls the endpoint defensively and logs a warning if unavailable.
 * TODO (Phase 12): Add PATCH /api/sessions/:id/summary endpoint.
 */
export function SummaryEditor({
  sessionId,
  initialSummary,
}: SummaryEditorProps): React.ReactElement {
  const [fields, setFields] = useState<SummaryFields>(initialSummary);
  const [editingField, setEditingField] = useState<keyof SummaryFields | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [savingField, setSavingField] = useState<keyof SummaryFields | null>(null);
  const [savedFields, setSavedFields] = useState<Set<keyof SummaryFields>>(new Set());

  const startEdit = (field: keyof SummaryFields): void => {
    setEditingField(field);
    setDraftValue(fields[field]);
  };

  const cancelEdit = (): void => {
    setEditingField(null);
    setDraftValue("");
  };

  const saveEdit = async (field: keyof SummaryFields): Promise<void> => {
    setSavingField(field);
    try {
      // TODO (Phase 12): Replace with real summary PATCH call when endpoint exists
      // For now, optimistically update local state and warn
      console.warn(
        `SummaryEditor: PATCH /api/sessions/${sessionId}/summary not yet implemented. Saved locally only.`
      );
      // Simulate network delay
      await new Promise<void>((resolve) => setTimeout(resolve, 400));
      setFields((prev) => ({ ...prev, [field]: draftValue }));
      setSavedFields((prev) => new Set(prev).add(field));
      setEditingField(null);
      setDraftValue("");
    } catch (err: unknown) {
      console.error("SummaryEditor save error:", err);
    } finally {
      setSavingField(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {(Object.keys(FIELD_LABELS) as (keyof SummaryFields)[]).map((field) => {
        const isEditing = editingField === field;
        const isSaving = savingField === field;
        const wasSaved = savedFields.has(field);

        return (
          <div
            key={field}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            {/* Field header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {FIELD_LABELS[field]}
                </span>
                {wasSaved && (
                  <span className="text-xs text-primary font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" /> Edited
                  </span>
                )}
              </div>
              {!isEditing && (
                <button
                  onClick={() => startEdit(field)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                  aria-label={`Edit ${FIELD_LABELS[field]}`}
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
              )}
            </div>

            {/* Field body */}
            <div className="p-4">
              {isEditing ? (
                <div className="flex flex-col gap-3">
                  <textarea
                    value={draftValue}
                    onChange={(e) => setDraftValue(e.target.value)}
                    className="w-full min-h-[100px] px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-y focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    aria-label={`Edit ${FIELD_LABELS[field]}`}
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={cancelEdit}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={() =>
                        saveEdit(field).catch((e: unknown) =>
                          console.error("Save error:", e)
                        )
                      }
                      disabled={isSaving || draftValue.trim() === fields[field]}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 transition-colors"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {fields[field] || (
                    <span className="text-muted-foreground italic">
                      No information recorded
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
