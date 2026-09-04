"use client";

import { useState } from "react";
import { Copy, Download, Check, ChevronDown, ChevronUp } from "lucide-react";

export interface FhirPreviewProps {
  /** The FHIR R4 resource object to display. */
  fhirResource: Record<string, unknown>;
}

/**
 * FhirPreview — JSON viewer for the FHIR R4 output from mapSummaryToFHIR.
 * Provides copy-to-clipboard and download-as-JSON actions.
 * The actual ABDM push is a stub (TODO Phase 11).
 */
export function FhirPreview({ fhirResource }: FhirPreviewProps): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  const jsonString = JSON.stringify(fhirResource, null, 2);

  const handleCopy = (): void => {
    navigator.clipboard
      .writeText(jsonString)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((e: unknown) => console.error("Clipboard copy failed:", e));
  };

  const handleDownload = (): void => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fhir-${(fhirResource["id"] as string | undefined) ?? "resource"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
          FHIR R4 Resource
          <span className="text-xs font-normal text-muted-foreground ml-1">
            ({(fhirResource["resourceType"] as string | undefined) ?? "unknown"})
          </span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            aria-label="Copy FHIR JSON"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-primary" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            aria-label="Download FHIR JSON"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>

      {/* JSON body */}
      {!collapsed && (
        <div className="overflow-auto max-h-96 p-4">
          <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-all leading-relaxed">
            {jsonString}
          </pre>
        </div>
      )}

      {collapsed && (
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground italic">
            Click to expand FHIR payload
          </p>
        </div>
      )}
    </div>
  );
}
