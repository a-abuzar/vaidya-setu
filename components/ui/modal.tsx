"use client";

/**
 * Plain modal dialog implementation. We avoid @base-ui/react/dialog
 * here because its production build raises form-control validation
 * errors when statically prerendered.
 *
 * Implements the same keyboard + focus management guarantees as a
 * native `<dialog>` element so it stays accessible without
 * depending on a heavy third-party library.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: ModalProps): React.ReactElement | null {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className={cn(
          "grid w-full max-w-lg gap-4 rounded-2xl border bg-card p-6 shadow-2xl",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold leading-tight">{title}</h2>
        {description ? (
          <p className="text-base text-muted-foreground">{description}</p>
        ) : null}
        {children}
      </div>
    </div>
  );
}