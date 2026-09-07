"use client";

/**
 * Persistent Back / Home / Help control row that lives at the top of
 * every patient-facing screen except the welcome screen.
 *
 * Each button carries an icon + text label, has a 64px minimum touch
 * target, and exposes an explicit aria-label translated to the active
 * language.
 *
 * Note: the help "Call staff" confirmation dialog is implemented with
 * a plain `<dialog>` element instead of @base-ui/react/dialog to
 * avoid the production-build form-control validation error #26
 * triggered when base-ui Dialog is statically prerendered.
 */
import { ArrowLeft, Home, HelpCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useKioskUi } from "@/lib/store/kiosk-ui";
import { t } from "@/lib/i18n/dict";
import { toast } from "sonner";

export function KioskTopBar(): React.ReactElement {
  const router = useRouter();
  const language = useKioskUi((s) => s.language);
  const setLanguage = useKioskUi((s) => s.setLanguage);
  const [helpOpen, setHelpOpen] = useState(false);

  const handleBack = (): void => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  const handleHome = (): void => {
    router.push("/");
  };

  const handleHelp = (): void => {
    setHelpOpen(true);
    toast.success(t(language, "help.called"), {
      description: t(language, "help.body"),
    });
  };

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-14 gap-2 rounded-2xl px-4 text-base font-semibold"
            onClick={handleBack}
            aria-label={t(language, "nav.back")}
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
            <span className="hidden sm:inline">{t(language, "nav.back")}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-14 gap-2 rounded-2xl px-4 text-base font-semibold"
            onClick={handleHome}
            aria-label={t(language, "nav.home")}
          >
            <Home className="size-5" aria-hidden="true" />
            <span className="hidden sm:inline">{t(language, "nav.home")}</span>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-2xl border border-border shadow-sm">
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`px-4 py-3 min-h-14 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${language === "en" ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted"}`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage("hi")}
              className={`border-l border-border px-4 py-3 min-h-14 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${language === "hi" ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted"}`}
            >
              HI
            </button>
            <button
              type="button"
              onClick={() => setLanguage("ta")}
              className={`border-l border-border px-4 py-3 min-h-14 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${language === "ta" ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted"}`}
            >
              TA
            </button>
          </div>
          <Button
            type="button"
            variant="default"
            size="lg"
            className="min-h-14 gap-2 rounded-2xl px-4 text-base font-semibold shadow-md"
            onClick={handleHelp}
            aria-label={t(language, "nav.help")}
          >
            <HelpCircle className="size-5" aria-hidden="true" />
            <span>{t(language, "nav.help")}</span>
          </Button>
        </div>
      </div>

      {helpOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setHelpOpen(false)}
        >
          <div
            className="max-w-md rounded-3xl bg-card p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="help-dialog-title"
              className="text-2xl font-bold leading-tight"
            >
              {t(language, "help.heading")}
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              {t(language, "help.body")}
            </p>
            <button
              type="button"
              onClick={() => setHelpOpen(false)}
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
            >
              {t(language, "help.cancel")}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}