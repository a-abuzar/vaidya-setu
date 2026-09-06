"use client";

/**
 * Document scan screen.
 *
 * The patient can:
 *   1. Pick the document type (prescription / lab / discharge / imaging)
 *   2. Capture with the rear camera (getUserMedia + canvas still)
 *   3. Review the thumbnail, retake, or accept
 *   4. Submit — uploads to the existing /api/sessions/:id/documents
 *      endpoint via multipart form data
 *   5. Scan another document, or skip to summary
 *
 * "I have no documents" is rendered as an equally-prominent skip path.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pill,
  FlaskConical,
  FileText,
  ScanLine,
  Camera,
  RotateCw,
  Check,
  Plus,
  X,
  ScanQrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { KioskShell } from "@/components/kiosk/KioskShell";
import { useKioskUi } from "@/lib/store/kiosk-ui";
import { useSessionStore } from "@/lib/store/session";
import { rpcClient } from "@/lib/api-client";
import { t } from "@/lib/i18n/dict";
import { toast } from "sonner";

type DocType = "prescription" | "lab_report" | "discharge_summary" | "imaging";

interface DocTypeMeta {
  id: DocType;
  icon: React.ReactNode;
  labelKey: string;
}

const DOC_TYPES: DocTypeMeta[] = [
  { id: "prescription", icon: <Pill className="size-7" aria-hidden="true" />, labelKey: "documents.type.prescription" },
  { id: "lab_report", icon: <FlaskConical className="size-7" aria-hidden="true" />, labelKey: "documents.type.lab_report" },
  { id: "discharge_summary", icon: <FileText className="size-7" aria-hidden="true" />, labelKey: "documents.type.discharge_summary" },
  { id: "imaging", icon: <ScanQrCode className="size-7" aria-hidden="true" />, labelKey: "documents.type.imaging" },
];

type Phase =
  | { kind: "pick_type" }
  | { kind: "camera"; docType: DocType }
  | { kind: "preview"; docType: DocType; dataUrl: string }
  | { kind: "uploading"; docType: DocType; dataUrl: string };

export default function DocumentsPage(): React.ReactElement {
  const router = useRouter();
  const language = useKioskUi((s) => s.language);
  const sessionId = useSessionStore((s) => s.sessionId);
  const uploadedDocumentIds = useSessionStore((s) => s.uploadedDocumentIds);
  const addUploadedDocument = useSessionStore((s) => s.addUploadedDocument);
  const [phase, setPhase] = useState<Phase>({ kind: "pick_type" });
  const [permissionDenied, setPermissionDenied] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (sessionId === null) {
      router.replace("/encounter");
    }
  }, [sessionId, router]);

  const startCamera = async (docType: DocType): Promise<void> => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      toast.error(t(language, "documents.camera.fail"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setPermissionDenied(false);
      setPhase({ kind: "camera", docType });
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch((err: unknown) => {
            console.warn("[documents] video play() failed", err);
          });
        }
      });
    } catch (err: unknown) {
      console.error("[documents] getUserMedia failed", err);
      setPermissionDenied(true);
      toast.error(t(language, "documents.camera.permission"));
    }
  };

  const stopCamera = (): void => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = (): void => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 1280;
    canvas.height = v.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    stopCamera();
    if (phase.kind !== "camera") return;
    setPhase({ kind: "preview", docType: phase.docType, dataUrl });
  };

  const retake = (): void => {
    if (phase.kind !== "preview") return;
    void startCamera(phase.docType);
  };

  const submitPhoto = async (): Promise<void> => {
    if (phase.kind !== "preview") return;
    if (sessionId === null) {
      toast.error(t(language, "error.network"));
      return;
    }
    setPhase({ kind: "uploading", docType: phase.docType, dataUrl: phase.dataUrl });
    try {
      const blob = await (await fetch(phase.dataUrl)).blob();
      const file = new File([blob], `document-${Date.now()}.jpg`, { type: "image/jpeg" });
      const res = await rpcClient.api.sessions[":id"].documents.$post({
        param: { id: sessionId },
        form: { file, doc_type: phase.docType },
      });
      if (!res.ok) {
        throw new Error(`Upload HTTP ${res.status}`);
      }
      const payload = (await res.json()) as
        | { success: true; data: { id: string } }
        | { success: false; error: { message: string } };
      if (!payload.success) {
        throw new Error(payload.error.message);
      }
      addUploadedDocument(payload.data.id);
      toast.success(t(language, "documents.uploaded"));
      setPhase({ kind: "pick_type" });
    } catch (err: unknown) {
      console.error("[documents] upload failed", err);
      toast.error(t(language, "error.network"));
      setPhase({ kind: "preview", docType: phase.docType, dataUrl: phase.dataUrl });
    }
  };

  const goToSummary = (): void => {
    router.push("/summary");
  };

  return (
    <KioskShell step="documents">
      <header className="flex flex-col gap-2 text-center sm:text-left">
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
          {t(language, "documents.heading")}
        </h1>
        <p className="text-base text-muted-foreground sm:text-lg">
          {t(language, "documents.subheading")}
        </p>
      </header>

      {phase.kind === "pick_type" ? (
        <>
          <section
            aria-label={t(language, "documents.heading")}
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {DOC_TYPES.map((dt) => (
              <button
                key={dt.id}
                type="button"
                onClick={() => void startCamera(dt.id)}
                className="group flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card p-4 shadow-sm transition-all hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span
                  className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"
                  aria-hidden="true"
                >
                  {dt.icon}
                </span>
                <span className="text-sm font-semibold">{t(language, dt.labelKey)}</span>
              </button>
            ))}
          </section>
          <Separator />
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-h-12 rounded-xl px-4 text-base"
              onClick={goToSummary}
            >
              <X className="mr-2 size-4" aria-hidden="true" />
              {t(language, "documents.skip")}
            </Button>
            {uploadedDocumentIds.length > 0 ? (
              <Button
                type="button"
                size="lg"
                className="min-h-12 rounded-xl px-6 text-base font-bold shadow-sm"
                onClick={goToSummary}
              >
                {t(language, "nav.next")}
                <Plus className="ml-2 size-4" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
          {permissionDenied ? (
            <p className="text-center text-sm font-semibold text-warning">
              {t(language, "documents.camera.permission")}
            </p>
          ) : null}
        </>
      ) : null}

      {phase.kind === "camera" ? (
        <section className="flex flex-col gap-3">
          <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-primary bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className="aspect-video w-full object-cover"
              aria-label="Camera preview"
            />
            <div className="pointer-events-none absolute inset-0 m-6 rounded-xl border-2 border-dashed border-white/80" />
            <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-base font-bold text-white drop-shadow-md">
              {t(language, "documents.guide")}
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-h-10 rounded-xl px-4 text-sm"
              onClick={() => {
                stopCamera();
                setPhase({ kind: "pick_type" });
              }}
            >
              {t(language, "nav.cancel")}
            </Button>
            <Button
              type="button"
              size="lg"
              className="min-h-12 rounded-xl px-8 text-base font-bold shadow-sm"
              onClick={capturePhoto}
            >
              <Camera className="mr-2 size-5" aria-hidden="true" />
              {t(language, "documents.capture")}
            </Button>
          </div>
        </section>
      ) : null}

      {phase.kind === "preview" ? (
        <section className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-2xl border-2 border-primary bg-card shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={phase.dataUrl}
              alt="Captured document preview"
              className="max-h-[60vh] w-full object-contain"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-h-10 rounded-xl px-4 text-sm"
              onClick={retake}
            >
              <RotateCw className="mr-2 size-4" aria-hidden="true" />
              {t(language, "documents.retake")}
            </Button>
            <Button
              type="button"
              size="lg"
              className="min-h-12 rounded-xl px-6 text-base font-bold shadow-sm"
              onClick={() => void submitPhoto()}
            >
              <Check className="mr-2 size-4" aria-hidden="true" />
              {t(language, "documents.preview")}
            </Button>
          </div>
        </section>
      ) : null}

      {phase.kind === "uploading" ? (
        <section className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center">
          <ScanLine className="size-10 animate-pulse text-primary" aria-hidden="true" />
          <h2 className="text-xl font-bold">
            {t(language, "documents.processing")}
          </h2>
        </section>
      ) : null}

      {phase.kind === "pick_type" && uploadedDocumentIds.length > 0 ? (
        <p className="text-center text-sm font-semibold text-success">
          ✓ {uploadedDocumentIds.length} uploaded
        </p>
      ) : null}
    </KioskShell>
  );
}