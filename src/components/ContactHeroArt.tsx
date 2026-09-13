/* ────────────────────────────────────────────────────────────── */
/*  A custom illustration, not a stock photo — this environment has  */
/*  no AI image-generation tool available, so rather than fall back  */
/*  to a generic gradient blob, the hero art is built to mean         */
/*  something specific to this brand: a "chama" is literally a       */
/*  circle — a ring of members connected to, and through, a shared   */
/*  pool. Eight member nodes ring a central hub in the brand's own   */
/*  primary/gold palette, on the same dark/light theme tokens as the */
/*  rest of the app (so it never looks pasted-in, light or dark).    */
/* ────────────────────────────────────────────────────────────── */

const NODES = [
  { x: 240, y: 70 },
  { x: 360, y: 120 },
  { x: 410, y: 240 },
  { x: 360, y: 360 },
  { x: 240, y: 410 },
  { x: 120, y: 360 },
  { x: 70, y: 240 },
  { x: 120, y: 120 },
];

const CENTER = { x: 240, y: 240 };

export function ContactHeroArt({ className }: { className?: string }) {
  const ringPath = NODES.map((n, i) => `${i === 0 ? 'M' : 'L'} ${n.x} ${n.y}`).join(' ') + ' Z';

  return (
    <svg viewBox="0 0 480 480" className={className} role="img" aria-label="Illustration of a chama: members connected in a circle around a shared fund">
      <circle cx={CENTER.x} cy={CENTER.y} r="220" className="fill-primary/5" />
      <circle cx={CENTER.x} cy={CENTER.y} r="150" className="fill-gold/5" />

      {/* Spokes — each member's individual link into the shared pool */}
      {NODES.map((n, i) => (
        <line key={`spoke-${i}`} x1={CENTER.x} y1={CENTER.y} x2={n.x} y2={n.y} className="stroke-primary/25" strokeWidth="1.5" />
      ))}

      {/* The ring itself — the circle of trust members form with each other */}
      <path d={ringPath} fill="none" className="stroke-gold/40" strokeWidth="2" />

      {/* Member nodes */}
      {NODES.map((n, i) => (
        <circle key={`node-${i}`} cx={n.x} cy={n.y} r="15" className="fill-card stroke-primary" strokeWidth="2.5" />
      ))}

      {/* Central hub — L-Chama holding the pool together */}
      <circle cx={CENTER.x} cy={CENTER.y} r="42" className="fill-gold" />
      <circle cx={CENTER.x - 10} cy={CENTER.y - 4} r="9" className="fill-gold-foreground/90" />
      <circle cx={CENTER.x + 11} cy={CENTER.y - 4} r="9" className="fill-gold-foreground/90" />
      <path
        d={`M ${CENTER.x - 22} ${CENTER.y + 20} Q ${CENTER.x} ${CENTER.y - 2} ${CENTER.x + 22} ${CENTER.y + 20}`}
        fill="none"
        className="stroke-gold-foreground/90"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
