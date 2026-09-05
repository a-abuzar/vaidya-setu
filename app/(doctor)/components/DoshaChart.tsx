"use client";

/**
 * Dosha-balance visualization for the AYUSH extended assessment.
 *
 * Renders a simple SVG triangle with proportional weights per dosha
 * (Vata, Pitta, Kapha). The visualization is intentionally simple
 * — an equilateral triangle with three circular nodes whose
 * distance from the centre encodes the dosha balance. This matches
 * the visual-language need called out in the brief: a visual
 * differentiator vs. a generic chatbot.
 *
 * Per docs/MODULE_CONTRACT.md, the Dashavidha Pariksha assessment
 * fields are still TODO in the AI layer. Until upstream Module A
 * emits structured dosha values, this chart accepts a permissive
 * `weights` prop and renders the placeholder values supplied by the
 * dashboard, with a TODO note in TECHNICAL_REFERENCE.md.
 */
export interface DoshaWeights {
  vata: number;
  pitta: number;
  kapha: number;
}

const NORMALIZE: DoshaWeights = { vata: 1, pitta: 1, kapha: 1 };

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function DoshaChart({
  weights,
}: {
  weights: DoshaWeights;
}): React.ReactElement {
  // Triangle vertices (cx 150, cy 130)
  const vata = { x: 150, y: 20 };
  const pitta = { x: 270, y: 220 };
  const kapha = { x: 30, y: 220 };
  const centroid = { x: 150, y: 153.33 };

  const w = {
    vata: clamp01(weights.vata / (weights.vata + NORMALIZE.vata)),
    pitta: clamp01(weights.pitta / (weights.pitta + NORMALIZE.pitta)),
    kapha: clamp01(weights.kapha / (weights.kapha + NORMALIZE.kapha)),
  };

  const dot = (v: { x: number; y: number }, t: number): { x: number; y: number } => ({
    x: centroid.x + (v.x - centroid.x) * t,
    y: centroid.y + (v.y - centroid.y) * t,
  });

  const vDot = dot(vata, w.vata);
  const pDot = dot(pitta, w.pitta);
  const kDot = dot(kapha, w.kapha);

  return (
    <svg
      viewBox="0 0 300 240"
      role="img"
      aria-label="AYUSH dosha balance chart"
      className="h-full w-full"
    >
      <polygon
        points={`${vata.x},${vata.y} ${pitta.x},${pitta.y} ${kapha.x},${kapha.y}`}
        className="fill-muted stroke-border"
        strokeWidth={2}
      />
      {/* Centroid marker */}
      <circle cx={centroid.x} cy={centroid.y} r={3} className="fill-muted-foreground" />
      {/* Dosha vertices */}
      <circle cx={vata.x} cy={vata.y} r={12} className="fill-primary" />
      <circle cx={pitta.x} cy={pitta.y} r={12} className="fill-destructive" />
      <circle cx={kapha.x} cy={kapha.y} r={12} className="fill-accent" />
      <text x={vata.x} y={vata.y - 18} textAnchor="middle" className="fill-foreground text-base font-bold">
        Vata
      </text>
      <text x={pitta.x} y={pitta.y + 24} textAnchor="middle" className="fill-foreground text-base font-bold">
        Pitta
      </text>
      <text x={kapha.x} y={kapha.y + 24} textAnchor="middle" className="fill-foreground text-base font-bold">
        Kapha
      </text>
      {/* Per-dashavidha weight dots */}
      <circle cx={vDot.x} cy={vDot.y} r={10} className="fill-primary opacity-90" stroke="white" strokeWidth={2} />
      <circle cx={pDot.x} cy={pDot.y} r={10} className="fill-destructive opacity-90" stroke="white" strokeWidth={2} />
      <circle cx={kDot.x} cy={kDot.y} r={10} className="fill-accent opacity-90" stroke="white" strokeWidth={2} />
      {/* Connecting lines to show balance centroid */}
      <line
        x1={vDot.x}
        y1={vDot.y}
        x2={centroid.x}
        y2={centroid.y}
        className="stroke-primary"
        strokeDasharray="3 3"
        strokeWidth={1.5}
      />
      <line
        x1={pDot.x}
        y1={pDot.y}
        x2={centroid.x}
        y2={centroid.y}
        className="stroke-destructive"
        strokeDasharray="3 3"
        strokeWidth={1.5}
      />
      <line
        x1={kDot.x}
        y1={kDot.y}
        x2={centroid.x}
        y2={centroid.y}
        className="stroke-accent"
        strokeDasharray="3 3"
        strokeWidth={1.5}
      />
    </svg>
  );
}