"use client";

/**
 * Plain horizontal/vertical rule. We avoid `@base-ui/react/separator`
 * because its production build throws validation errors when nested
 * inside forms that have not yet been hydrated.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface SeparatorProps extends React.ComponentProps<"hr"> {
  orientation?: "horizontal" | "vertical";
}

export function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorProps): React.ReactElement {
  return (
    <hr
      data-slot="separator"
      data-orientation={orientation}
      aria-orientation={orientation}
      className={cn(
        "shrink-0 border-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
}