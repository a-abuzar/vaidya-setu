"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function DoctorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  useEffect(() => {
    console.error("[Doctor Portal Error]", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center p-6 text-center">
      <Card className="flex w-full flex-col items-center gap-4 border-destructive/30 bg-destructive/5 p-8 shadow-sm">
        <span
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-2xl bg-destructive text-destructive-foreground shadow-sm"
        >
          <AlertTriangle className="size-6" />
        </span>
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Doctor Portal Error
          </h1>
          <p className="text-sm text-muted-foreground">
            {error.message || "An unexpected error occurred while loading this view."}
          </p>
          {error.digest ? (
            <p className="font-mono text-xs text-muted-foreground">
              Reference ID: {error.digest}
            </p>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Button
            type="button"
            variant="default"
            onClick={() => reset()}
            className="gap-2"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Try again
          </Button>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Return to kiosk
          </Link>
        </div>
      </Card>
    </main>
  );
}
