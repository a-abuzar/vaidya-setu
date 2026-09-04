"use client";

import { useState, useRef, useCallback } from "react";
import { useSessionStore } from "@/lib/store/session";
import { getDictionary } from "@/lib/i18n";
import { rpcClient } from "@/lib/api-client";
import {
  Camera,
  RefreshCw,
  Check,
  Trash2,
  SkipForward,
  Pill,
  FlaskConical,
  FileText,
  ScanLine,
  Loader2,
  AlertCircle,
} from "lucide-react";

type DocType = "prescription" | "lab_report" | "discharge_summary" | "imaging";

interface CapturedDoc {
  id: string;
  previewUrl: string;
  blob: Blob;
  docType: DocType;
}

const DOC_TYPE_ICONS: Record<DocType, React.ReactNode> = {
  prescription: <Pill className="w-7 h-7" />,
  lab_report: <FlaskConical className="w-7 h-7" />,
  discharge_summary: <FileText className="w-7 h-7" />,
  imaging: <ScanLine className="w-7 h-7" />,
};

/**
 * DocumentScanScreen — camera capture, type selection, multi-doc list, upload.
 * Gracefully handles missing camera permission and NOT_IMPLEMENTED OCR.
 */
export function DocumentScanScreen(): React.ReactElement {
  const language = useSessionStore((s) => s.language);
  const sessionId = useSessionStore((s) => s.sessionId);
  const uploadProgress = useSessionStore((s) => s.uploadProgress);
  const setUploadProgress = useSessionStore((s) => s.setUploadProgress);
  const addUploadedDocument = useSessionStore((s) => s.addUploadedDocument);
  const nextStep = useSessionStore((s) => s.nextStep);

  const dict = getDictionary(language);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [capturePreview, setCapturePreview] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<DocType>("prescription");
  const [capturedDocs, setCapturedDocs] = useState<CapturedDoc[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const DOC_TYPES: { type: DocType; label: string }[] = [
    { type: "prescription", label: dict.documentScan.docTypes.prescription },
    { type: "lab_report", label: dict.documentScan.docTypes.lab_report },
    {
      type: "discharge_summary",
      label: dict.documentScan.docTypes.discharge_summary,
    },
    { type: "imaging", label: dict.documentScan.docTypes.imaging },
  ];

  const startCamera = useCallback(async (): Promise<void> => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.name === "NotAllowedError"
          ? dict.errors.cameraPermission
          : dict.errors.generic;
      setCameraError(msg);
      console.error("Camera error:", err);
    }
  }, [dict.errors.cameraPermission, dict.errors.generic]);

  const stopCamera = useCallback((): void => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const capturePhoto = useCallback((): void => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        setCapturePreview(url);
        setCapturedBlob(blob);
        stopCamera();
      },
      "image/jpeg",
      0.85
    );
  }, [stopCamera]);

  const retake = (): void => {
    if (capturePreview) URL.revokeObjectURL(capturePreview);
    setCapturePreview(null);
    setCapturedBlob(null);
    startCamera().catch((e: unknown) => console.error("Retake camera error:", e));
  };

  const usePhoto = (): void => {
    if (!capturePreview || !capturedBlob) return;
    const doc: CapturedDoc = {
      id: crypto.randomUUID(),
      previewUrl: capturePreview,
      blob: capturedBlob,
      docType: selectedDocType,
    };
    setCapturedDocs((prev) => [...prev, doc]);
    setCapturePreview(null);
    setCapturedBlob(null);
  };

  const removeDoc = (id: string): void => {
    setCapturedDocs((prev) => {
      const removed = prev.find((d) => d.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((d) => d.id !== id);
    });
  };

  const uploadAndContinue = async (): Promise<void> => {
    if (!sessionId || capturedDocs.length === 0) {
      nextStep();
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const total = capturedDocs.length;
    let uploaded = 0;

    for (const doc of capturedDocs) {
      try {
        const file = new File([doc.blob], `document-${doc.id}.jpg`, {
          type: "image/jpeg",
        });
        const res = await rpcClient.api.sessions[":id"].documents.$post({
          param: { id: sessionId },
          form: { file, doc_type: doc.docType },
        });
        if (!res.ok) {
          const errData = await res.json();
          console.error("Upload failed for doc:", doc.id, errData);
        } else {
          const data = await res.json();
          if (data.success) {
            addUploadedDocument(data.data.id);
          }
        }
      } catch (uploadErr: unknown) {
        console.error("Upload error for doc:", doc.id, uploadErr);
      }
      uploaded += 1;
      setUploadProgress(Math.round((uploaded / total) * 100));
    }

    setIsUploading(false);
    nextStep();
  };

  const skip = (): void => nextStep();

  return (
    <main className="flex-1 flex flex-col items-center justify-start p-4 overflow-y-auto">
      <div className="w-full max-w-2xl flex flex-col gap-5 pb-4">
        {/* Header */}
        <div className="text-center pt-2">
          <h1 className="text-3xl font-bold text-foreground mb-1">
            {dict.documentScan.title}
          </h1>
          <p className="text-lg text-muted-foreground">
            {dict.documentScan.subtitle}
          </p>
        </div>

        {/* Camera error */}
        {cameraError && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/30">
            <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-base text-destructive">{cameraError}</p>
          </div>
        )}

        {/* Camera / Preview area */}
        {!capturePreview && (
          <div className="relative rounded-2xl overflow-hidden bg-foreground/5 border-2 border-dashed border-border aspect-[4/3]">
            {/* Guide frame overlay */}
            {cameraActive && (
              <div className="absolute inset-4 border-4 border-white/70 rounded-xl pointer-events-none z-10">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
              </div>
            )}

            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />

            {!cameraActive && (
              <button
                onClick={() =>
                  startCamera().catch((e: unknown) =>
                    console.error("Camera start error:", e)
                  )
                }
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Camera className="w-16 h-16" />
                <span className="text-lg font-medium">
                  {dict.documentScan.capture}
                </span>
              </button>
            )}
          </div>
        )}

        {/* Capture / Retake buttons */}
        {cameraActive && !capturePreview && (
          <button
            onClick={capturePhoto}
            className="kiosk-touch w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-primary text-primary-foreground text-xl font-bold shadow-lg active:scale-[0.98]"
          >
            <Camera className="w-7 h-7" />
            {dict.documentScan.capture}
          </button>
        )}

        {/* Preview + use/retake */}
        {capturePreview && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl overflow-hidden border-2 border-primary aspect-[4/3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capturePreview}
                alt="Captured document"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Doc type selection */}
            <div className="grid grid-cols-2 gap-3">
              {DOC_TYPES.map(({ type, label }) => (
                <button
                  key={type}
                  onClick={() => setSelectedDocType(type)}
                  className={`kiosk-touch flex items-center gap-3 px-4 py-4 rounded-xl border-2 font-medium text-base transition-colors ${
                    selectedDocType === type
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground"
                  }`}
                >
                  {DOC_TYPE_ICONS[type]}
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={retake}
                className="kiosk-touch flex-1 flex items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-secondary text-foreground font-semibold text-lg"
              >
                <RefreshCw className="w-5 h-5" />
                {dict.documentScan.retake}
              </button>
              <button
                onClick={usePhoto}
                className="kiosk-touch flex-1 flex items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-lg"
              >
                <Check className="w-5 h-5" />
                {dict.documentScan.usePhoto}
              </button>
            </div>
          </div>
        )}

        {/* Captured documents list */}
        {capturedDocs.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-base font-semibold text-foreground">
              {language === "hi"
                ? `${capturedDocs.length} दस्तावेज़ जोड़े गए`
                : language === "ta"
                  ? `${capturedDocs.length} ஆவணங்கள் சேர்க்கப்பட்டன`
                  : `${capturedDocs.length} document${capturedDocs.length > 1 ? "s" : ""} added`}
            </p>
            {capturedDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={doc.previewUrl}
                  alt="Document thumbnail"
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-foreground">
                    {
                      DOC_TYPES.find((d) => d.type === doc.docType)
                        ?.label
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {language === "hi"
                      ? "OCR प्रसंस्करण प्रतीक्षा में..."
                      : language === "ta"
                        ? "OCR செயலாக்கம் காத்திருக்கிறது..."
                        : "OCR processing pending..."}
                  </p>
                </div>
                <button
                  onClick={() => removeDoc(doc.id)}
                  className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                  aria-label="Remove document"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload progress */}
        {isUploading && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-base text-muted-foreground">
                {dict.documentScan.uploadingLabel}
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!cameraActive && !capturePreview && (
          <div className="flex flex-col gap-3 mt-2">
            {capturedDocs.length > 0 && (
              <button
                onClick={() =>
                  uploadAndContinue().catch((e: unknown) =>
                    console.error("Upload error:", e)
                  )
                }
                disabled={isUploading}
                className="kiosk-touch w-full flex items-center justify-center gap-3 px-6 py-5 rounded-2xl bg-primary text-primary-foreground text-xl font-bold shadow-lg disabled:opacity-40"
              >
                {isUploading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Check className="w-6 h-6" />
                )}
                {language === "hi"
                  ? "जमा करें और आगे बढ़ें"
                  : language === "ta"
                    ? "சமர்ப்பித்து தொடரவும்"
                    : "Submit & Continue"}
              </button>
            )}

            {/* Prominent skip */}
            <button
              onClick={skip}
              className="kiosk-touch w-full flex items-center justify-center gap-3 px-6 py-5 rounded-2xl border-2 border-border bg-card text-foreground text-lg font-semibold"
            >
              <SkipForward className="w-6 h-6" />
              {dict.documentScan.skipButton}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
