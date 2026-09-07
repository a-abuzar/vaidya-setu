import React from "react";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

interface VirtualNumpadProps {
  onKeyPress: (key: string) => void;
  className?: string;
}

export function VirtualNumpad({ onKeyPress, className }: VirtualNumpadProps) {
  const handleKey = (key: string) => {
    onKeyPress(key);
  };

  const handleBackspace = () => {
    onKeyPress("Backspace");
  };

  const renderKey = (key: string) => (
    <button
      key={key}
      type="button"
      onPointerDown={(e) => e.preventDefault()}
      onClick={() => handleKey(key)}
      className="flex h-12 w-full flex-1 items-center justify-center rounded-lg border border-border bg-background text-lg font-medium shadow-sm transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:bg-primary/10"
    >
      {key}
    </button>
  );

  return (
    <div className={cn("grid grid-cols-3 gap-2 rounded-xl border border-border/50 bg-card p-3 shadow-inner w-[240px]", className)}>
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(renderKey)}
      <div className="col-start-2">
        {renderKey("0")}
      </div>
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onClick={handleBackspace}
        className="flex h-12 w-full items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground shadow-sm transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:bg-primary/10"
      >
        <Delete className="size-5" />
      </button>
    </div>
  );
}
