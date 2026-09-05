"use client";

/**
 * Accessible switch built on a plain `<button role="switch">`. We do
 * not use `@base-ui/react/switch` here because the production build
 * enforces an enclosing `<label>` (validation error #26) which is
 * awkward for our consent grid. A native button with the ARIA switch
 * pattern is fully accessible and behaves identically for keyboard
 * and screen-reader users.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  id?: string;
  name?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  className,
  ...rest
}: SwitchProps): React.ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={rest["aria-label"]}
      id={rest.id}
      name={rest.name}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-9 w-16 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none inline-block h-7 w-7 transform rounded-full bg-background shadow-lg ring-0 transition-transform",
          checked ? "translate-x-7" : "translate-x-0",
        )}
      />
    </button>
  );
}