/**
 * Kiosk route-group layout.
 *
 * This layout is intentionally minimal. Each patient-facing screen
 * renders its own KioskShell with the correct StepIndicator, rather
 * than the layout knowing about specific routes. This keeps the
 * layout stable when new screens are added.
 */
export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="font-sans">{children}</div>;
}