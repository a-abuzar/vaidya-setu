/**
 * Kiosk home page — patient-facing entry point.
 */
export default function KioskHomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold">VaidyaSetu</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        AI-Native Patient Case-Taking Kiosk
      </p>
    </main>
  );
}
