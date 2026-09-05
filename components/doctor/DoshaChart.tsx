"use client";

interface DoshaData {
  vata: number;
  pitta: number;
  kapha: number;
}

export function DoshaChart({ data }: { data: DoshaData }): React.ReactElement {
  // Normalize data to 0-100 range for the chart if it isn't already
  const normalize = (val: number) => Math.max(0, Math.min(100, val));
  
  const vata = normalize(data?.vata || 33);
  const pitta = normalize(data?.pitta || 33);
  const kapha = normalize(data?.kapha || 33);

  // SVG coordinate calculations for a triangle radar chart
  const center = 100;
  const radius = 80;
  
  // Points for the outer background triangle
  const bgVata = [center, center - radius]; // Top
  const bgPitta = [center + radius * Math.cos(Math.PI/6), center + radius * Math.sin(Math.PI/6)]; // Bottom Right
  const bgKapha = [center - radius * Math.cos(Math.PI/6), center + radius * Math.sin(Math.PI/6)]; // Bottom Left

  // Points for the actual data polygon
  const ptVata = [center, center - (radius * (vata/100))];
  const ptPitta = [center + (radius * (pitta/100)) * Math.cos(Math.PI/6), center + (radius * (pitta/100)) * Math.sin(Math.PI/6)];
  const ptKapha = [center - (radius * (kapha/100)) * Math.cos(Math.PI/6), center + (radius * (kapha/100)) * Math.sin(Math.PI/6)];

  return (
    <div className="w-full h-full relative">
      <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
        {/* Grid lines */}
        <polygon 
          points={`${bgVata.join(',')} ${bgPitta.join(',')} ${bgKapha.join(',')}`} 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1" 
          className="text-border opacity-50"
        />
        
        {/* Axes */}
        <line x1={center} y1={center} x2={bgVata[0]} y2={bgVata[1]} stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-border opacity-50" />
        <line x1={center} y1={center} x2={bgPitta[0]} y2={bgPitta[1]} stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-border opacity-50" />
        <line x1={center} y1={center} x2={bgKapha[0]} y2={bgKapha[1]} stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-border opacity-50" />

        {/* Data Polygon */}
        <polygon 
          points={`${ptVata.join(',')} ${ptPitta.join(',')} ${ptKapha.join(',')}`} 
          fill="currentColor" 
          className="text-accent opacity-30"
        />
        <polygon 
          points={`${ptVata.join(',')} ${ptPitta.join(',')} ${ptKapha.join(',')}`} 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinejoin="round"
          className="text-accent"
        />
        
        {/* Data Points */}
        <circle cx={ptVata[0]} cy={ptVata[1]} r="4" fill="currentColor" className="text-accent" />
        <circle cx={ptPitta[0]} cy={ptPitta[1]} r="4" fill="currentColor" className="text-accent" />
        <circle cx={ptKapha[0]} cy={ptKapha[1]} r="4" fill="currentColor" className="text-accent" />
      </svg>
      
      {/* Labels */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 font-bold text-sm text-foreground">Vata</div>
      <div className="absolute -bottom-2 -right-4 font-bold text-sm text-foreground">Pitta</div>
      <div className="absolute -bottom-2 -left-4 font-bold text-sm text-foreground">Kapha</div>
    </div>
  );
}
