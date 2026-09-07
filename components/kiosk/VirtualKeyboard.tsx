import React from "react";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void;
  className?: string;
}

const ROW_1 = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
const ROW_2 = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"];
const ROW_3 = ["a", "s", "d", "f", "g", "h", "j", "k", "l"];
const ROW_4 = ["z", "x", "c", "v", "b", "n", "m"];

export function VirtualKeyboard({ onKeyPress, className }: VirtualKeyboardProps) {
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
      className="flex h-12 w-full flex-1 items-center justify-center rounded-lg border border-border bg-background text-lg font-medium uppercase shadow-sm transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:bg-primary/10"
    >
      {key}
    </button>
  );

  return (
    <div className={cn("flex w-full flex-col gap-2 rounded-xl border border-border/50 bg-card p-3 shadow-inner", className)}>
      <div className="flex w-full gap-1.5">{ROW_1.map(renderKey)}</div>
      <div className="flex w-full gap-1.5">{ROW_2.map(renderKey)}</div>
      <div className="flex w-full gap-1.5 px-4">{ROW_3.map(renderKey)}</div>
      <div className="flex w-full gap-1.5 px-8">
        {ROW_4.map(renderKey)}
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={handleBackspace}
          className="flex h-12 w-16 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground shadow-sm transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:bg-primary/10"
        >
          <Delete className="size-5" />
        </button>
      </div>
      <div className="flex w-full justify-center gap-2 mt-1 px-8">
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => handleKey(" ")}
          className="flex h-12 w-full items-center justify-center rounded-lg border border-border bg-background uppercase text-sm font-medium tracking-widest shadow-sm transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:bg-primary/10"
        >
          Space
        </button>
      </div>
    </div>
  );
}
