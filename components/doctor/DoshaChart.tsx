/**
 * DoshaChart — SVG triangle visualization of Vata / Pitta / Kapha balance.
 * Reads from the `ayush_assessment` jsonb field.
 *
 * Expected shape of ayush_assessment:
 *   { vata: number, pitta: number, kapha: number }  (0–100 each)
 *
 * Falls back to a "No assessment recorded" placeholder if null or malformed.
 */

interface DoshaValues {
  vata: number;
  pitta: number;
  kapha: number;
}

function parseDoshaValues(raw: unknown): DoshaValues | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const vata = typeof obj["vata"] === "number" ? obj["vata"] : null;
  const pitta = typeof obj["pitta"] === "number" ? obj["pitta"] : null;
  const kapha = typeof obj["kapha"] === "number" ? obj["kapha"] : null;
  if (vata === null || pitta === null || kapha === null) return null;
  return { vata, pitta, kapha };
}

// Equilateral triangle vertices (SVG 200×180 viewBox)
const TRI = {
  vata: { x: 100, y: 10 },   // top
  pitta: { x: 190, y: 170 }, // bottom-right
  kapha: { x: 10, y: 170 },  // bottom-left
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Convert normalised dosha values to an SVG point inside the triangle. */
function doshaToPoint(values: DoshaValues): { x: number; y: number } {
  const total = values.vata + values.pitta + values.kapha || 1;
  const v = values.vata / total;
  const p = values.pitta / total;
  const k = values.kapha / total;
  return {
    x: v * TRI.vata.x + p * TRI.pitta.x + k * TRI.kapha.x,
    y: v * TRI.vata.y + p * TRI.pitta.y + k * TRI.kapha.y,
  };
}

export interface DoshaChartProps {
  ayushAssessment: unknown;
}

export function DoshaChart({ ayushAssessment }: DoshaChartProps): React.ReactElement {
  const values = parseDoshaValues(ayushAssessment);

  if (!values) {
    return (
      <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-dashed border-border text-muted-foreground gap-2">
        <span className="text-3xl">🌿</span>
        <p className="text-sm font-medium">No AYUSH assessment recorded</p>
        <p className="text-xs text-muted-foreground/70">
          Prakriti/Vikriti data not available for this session
        </p>
      </div>
    );
  }

  const point = doshaToPoint(values);

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        viewBox="0 0 200 190"
        className="w-full max-w-xs"
        aria-label="Dosha balance triangle chart"
        role="img"
      >
        {/* Triangle fill */}
        <polygon
          points={`${TRI.vata.x},${TRI.vata.y} ${TRI.pitta.x},${TRI.pitta.y} ${TRI.kapha.x},${TRI.kapha.y}`}
          fill="hsl(166 82% 24% / 0.08)"
          stroke="hsl(166 82% 24% / 0.4)"
          strokeWidth="2"
        />

        {/* Centre lines */}
        {[
          [TRI.vata, { x: lerp(TRI.pitta.x, TRI.kapha.x, 0.5), y: lerp(TRI.pitta.y, TRI.kapha.y, 0.5) }],
          [TRI.pitta, { x: lerp(TRI.vata.x, TRI.kapha.x, 0.5), y: lerp(TRI.vata.y, TRI.kapha.y, 0.5) }],
          [TRI.kapha, { x: lerp(TRI.vata.x, TRI.pitta.x, 0.5), y: lerp(TRI.vata.y, TRI.pitta.y, 0.5) }],
        ].map(([a, b], i) => (
          <line
            key={i}
            x1={a!.x}
            y1={a!.y}
            x2={b!.x}
            y2={b!.y}
            stroke="hsl(166 82% 24% / 0.15)"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
        ))}

        {/* Dosha point */}
        <circle
          cx={point.x}
          cy={point.y}
          r="8"
          fill="hsl(33 68% 50%)"
          stroke="white"
          strokeWidth="2"
        />

        {/* Labels */}
        <text x={TRI.vata.x} y={TRI.vata.y - 6} textAnchor="middle" className="text-xs font-semibold fill-primary" fontSize="11">
          Vata
        </text>
        <text x={TRI.vata.x} y={TRI.vata.y - 18} textAnchor="middle" className="fill-muted-foreground" fontSize="9">
          {values.vata}
        </text>
        <text x={TRI.pitta.x + 6} y={TRI.pitta.y + 4} textAnchor="start" className="text-xs font-semibold fill-primary" fontSize="11">
          Pitta
        </text>
        <text x={TRI.pitta.x + 6} y={TRI.pitta.y + 14} textAnchor="start" className="fill-muted-foreground" fontSize="9">
          {values.pitta}
        </text>
        <text x={TRI.kapha.x - 6} y={TRI.kapha.y + 4} textAnchor="end" className="text-xs font-semibold fill-primary" fontSize="11">
          Kapha
        </text>
        <text x={TRI.kapha.x - 6} y={TRI.kapha.y + 14} textAnchor="end" className="fill-muted-foreground" fontSize="9">
          {values.kapha}
        </text>
      </svg>

      {/* Legend */}
      <div className="flex gap-6 text-sm">
        {([["Vata", values.vata], ["Pitta", values.pitta], ["Kapha", values.kapha]] as [string, number][]).map(
          ([name, val]) => (
            <div key={name} className="flex flex-col items-center gap-0.5">
              <span className="font-semibold text-primary">{val}</span>
              <span className="text-muted-foreground text-xs">{name}</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
