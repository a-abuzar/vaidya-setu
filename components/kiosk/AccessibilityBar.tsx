"use client";

import { useSessionStore } from "@/lib/store/session";
import { Minus, Plus, Type, Sun, Volume2, VolumeX } from "lucide-react";

const TEXT_SIZES = [1, 1.25, 1.5] as const;
type TextSize = (typeof TEXT_SIZES)[number];

/**
 * Accessibility control bar — pinned to the top of every kiosk screen.
 * Controls: text size, high contrast, audio on/off.
 * All touch targets ≥64px.
 */
export function AccessibilityBar(): React.ReactElement {
  const textSizeMultiplier = useSessionStore((s) => s.textSizeMultiplier);
  const highContrastMode = useSessionStore((s) => s.highContrastMode);
  const audioEnabled = useSessionStore((s) => s.audioEnabled);
  const setTextSize = useSessionStore((s) => s.setTextSize);
  const setHighContrast = useSessionStore((s) => s.setHighContrast);
  const setAudioEnabled = useSessionStore((s) => s.setAudioEnabled);

  const handleTextSizeDecrease = (): void => {
    const idx = TEXT_SIZES.indexOf(textSizeMultiplier as TextSize);
    if (idx > 0) {
      setTextSize(TEXT_SIZES[idx - 1]);
    }
  };

  const handleTextSizeIncrease = (): void => {
    const idx = TEXT_SIZES.indexOf(textSizeMultiplier as TextSize);
    if (idx < TEXT_SIZES.length - 1) {
      setTextSize(TEXT_SIZES[idx + 1]);
    }
  };

  return (
    <div
      className="flex items-center justify-center gap-2 px-4 py-2 bg-card border-b border-border"
      role="toolbar"
      aria-label="Accessibility controls"
    >
      {/* Text size controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleTextSizeDecrease}
          disabled={textSizeMultiplier <= TEXT_SIZES[0]}
          className="kiosk-touch flex items-center gap-2 px-3 py-2 rounded-xl text-foreground bg-secondary hover:bg-muted disabled:opacity-40 transition-colors"
          aria-label="Decrease text size"
        >
          <Minus className="w-5 h-5" />
          <span className="text-sm font-medium">A</span>
        </button>

        <div className="flex items-center gap-1 px-2">
          <Type className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground min-w-[3ch] text-center">
            {Math.round(textSizeMultiplier * 100)}%
          </span>
        </div>

        <button
          onClick={handleTextSizeIncrease}
          disabled={textSizeMultiplier >= TEXT_SIZES[TEXT_SIZES.length - 1]}
          className="kiosk-touch flex items-center gap-2 px-3 py-2 rounded-xl text-foreground bg-secondary hover:bg-muted disabled:opacity-40 transition-colors"
          aria-label="Increase text size"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm font-bold">A</span>
        </button>
      </div>

      <div className="w-px h-8 bg-border mx-1" />

      {/* High contrast toggle */}
      <button
        onClick={() => setHighContrast(!highContrastMode)}
        className={`kiosk-touch flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
          highContrastMode
            ? "bg-foreground text-background"
            : "bg-secondary text-foreground hover:bg-muted"
        }`}
        aria-pressed={highContrastMode}
        aria-label="Toggle high contrast mode"
      >
        <Sun className="w-5 h-5" />
        <span>Contrast</span>
      </button>

      <div className="w-px h-8 bg-border mx-1" />

      {/* Audio toggle */}
      <button
        onClick={() => setAudioEnabled(!audioEnabled)}
        className={`kiosk-touch flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
          audioEnabled
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-foreground hover:bg-muted"
        }`}
        aria-pressed={audioEnabled}
        aria-label={audioEnabled ? "Mute audio" : "Enable audio"}
      >
        {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        <span>{audioEnabled ? "Audio On" : "Audio Off"}</span>
      </button>
    </div>
  );
}
