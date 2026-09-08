"use client";

import React from "react";
import { Sparkles, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThinkingIndicatorProps {
  variant?: "fullscreen" | "inline";
  title?: string;
  subtitle?: string;
  className?: string;
}

export function ThinkingIndicator({
  variant = "fullscreen",
  title = "Thinking…",
  subtitle,
  className,
}: ThinkingIndicatorProps): React.ReactElement {
  if (variant === "inline") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-foreground shadow-xs backdrop-blur-xs transition-all",
          className,
        )}
      >
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-accent opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-primary-mid" />
        </span>
        <span className="text-sm font-medium tracking-wide text-foreground">
          {title}
        </span>
        <span className="flex items-center gap-1" aria-hidden="true">
          <span className="size-1.5 animate-[bounce_1.2s_infinite_0ms] rounded-full bg-primary-mid" />
          <span className="size-1.5 animate-[bounce_1.2s_infinite_200ms] rounded-full bg-primary-mid" />
          <span className="size-1.5 animate-[bounce_1.2s_infinite_400ms] rounded-full bg-primary-mid" />
        </span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-card to-background p-10 text-center shadow-md sm:p-14",
        className,
      )}
    >
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute -top-24 size-72 rounded-full bg-primary-xlight/60 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 size-72 rounded-full bg-primary-light/30 blur-3xl"
        aria-hidden="true"
      />

      {/* Central Pulsing Ripple Visual */}
      <div className="relative mb-8 flex size-28 items-center justify-center">
        {/* Outermost gentle wave */}
        <div
          className="absolute inset-0 animate-ping rounded-full bg-primary-accent/20"
          style={{ animationDuration: "3s" }}
          aria-hidden="true"
        />
        {/* Mid wave */}
        <div
          className="absolute -inset-3 animate-pulse rounded-full bg-primary-light/40"
          style={{ animationDuration: "2s" }}
          aria-hidden="true"
        />
        {/* Core disc */}
        <div
          className="relative flex size-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-primary-mid text-primary-foreground shadow-lg shadow-primary/20"
          aria-hidden="true"
        >
          <Activity className="size-9 animate-pulse" />
          <Sparkles className="absolute -top-1.5 -right-1.5 size-5 text-accent animate-bounce" />
        </div>
      </div>

      {/* Title & Subtitle */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
            {subtitle}
          </p>
        ) : null}
      </div>

      {/* Dynamic Wave Pulse Bar */}
      <div
        className="relative z-10 mt-6 flex items-center gap-2 rounded-full bg-secondary/80 px-4 py-2 border border-border/50"
        aria-hidden="true"
      >
        <span className="size-2 animate-[bounce_1.4s_infinite_0ms] rounded-full bg-primary" />
        <span className="size-2 animate-[bounce_1.4s_infinite_200ms] rounded-full bg-primary-mid" />
        <span className="size-2 animate-[bounce_1.4s_infinite_400ms] rounded-full bg-primary-accent" />
        <span className="size-2 animate-[bounce_1.4s_infinite_600ms] rounded-full bg-primary-light" />
      </div>
    </div>
  );
}
