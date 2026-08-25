import { C, Figure, Tree, Hut, Clinic } from "../../components/illustration";

/**
 * Section-scale scenes, drawn from the same kit as the hero (see
 * illustration.jsx) so the whole page shares one hand.
 *
 * Each scene is a bare <svg> with a transparent ground — the section supplies
 * the surface colour, which keeps a scene reusable on cream, white or primary.
 */

/* ── How it works: three steps ───────────────────────────────────────────── */

/* 1 — three causes on offer, the middle one picked out in the accent. */
export function StepChoose({ className }) {
  const tile = (x, y, fill, stroke) => (
    <rect x={x} y={y} width="72" height="92" rx="20" fill={fill} stroke={stroke} strokeWidth="2" />
  );
  return (
    <svg viewBox="0 0 320 200" className={className} role="img" aria-label="Three causes to choose from, with one selected">
      {tile(24, 74, C.shell, C.shellDeep)}
      <path d="M60 118c0-10 10-22 10-22s10 12 10 22a10 10 0 0 1-20 0z" fill={C.glass} />

      {tile(212, 74, C.shell, C.shellDeep)}
      <path d="M230 112h48a24 24 0 0 1-48 0z" fill={C.clay} opacity="0.55" />
      <rect x="226" y="106" width="56" height="7" rx="3.5" fill={C.clay} opacity="0.75" />
      <path d="M248 98v-10M254 98v-14M260 98v-10" stroke={C.clay} strokeWidth="3" strokeLinecap="round" opacity="0.45" />

      {/* selected */}
      <rect x="118" y="56" width="84" height="110" rx="22" fill={C.gold} />
      <path
        d="M160 132c-14-10-24-18-24-28a13 13 0 0 1 24-6 13 13 0 0 1 24 6c0 10-10 18-24 28Z"
        fill={C.ink}
      />
      <circle cx="196" cy="62" r="15" fill={C.ink} />
      <path d="M190 62l4 5 8-9" stroke={C.gold} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/* 2 — the clinic reaching a village, supplies carried the last stretch. */
export function StepDeliver({ className }) {
  return (
    <svg viewBox="0 0 320 200" className={className} role="img" aria-label="An aid vehicle delivering supplies to a village">
      <path d="M0 154C60 142 120 150 180 156 240 162 286 156 320 152V200H0Z" fill={C.olive} />
      <path
        d="M78 150C120 138 176 142 236 150"
        stroke={C.shellDeep}
        strokeWidth="4"
        strokeDasharray="10 10"
        strokeLinecap="round"
        fill="none"
      />
      <g transform="translate(72 152) scale(0.3)">
        <Clinic x={0} y={0} s={1} />
      </g>
      <Hut x={272} y={156} s={0.62} />
      <Tree x={222} y={150} s={0.5} />
      <Figure x={168} y={168} h={62} tone={1} cloth={C.clay} pose="carry" />
    </svg>
  );
}

/* 3 — the receipt: what the gift funded, reported back. */
export function StepReport({ className }) {
  const bars = [26, 44, 34, 58, 72];
  return (
    <svg viewBox="0 0 320 200" className={className} role="img" aria-label="An impact report showing where a donation went">
      <rect x="104" y="30" width="196" height="140" rx="22" fill={C.shell} />
      <rect x="122" y="50" width="72" height="9" rx="4.5" fill={C.shellDeep} />
      <rect x="122" y="66" width="46" height="9" rx="4.5" fill={C.shellDeep} />
      {bars.map((h, i) => (
        <rect
          key={i}
          x={122 + i * 32}
          y={150 - h}
          width="20"
          height={h}
          rx="10"
          fill={i === bars.length - 1 ? C.gold : C.clay}
          opacity={i === bars.length - 1 ? 1 : 0.32}
        />
      ))}
      <rect x="122" y="150" width="160" height="4" rx="2" fill={C.shellDeep} />
      <circle cx="272" cy="60" r="17" fill={C.gold} />
      <path d="M265 60l5 6 10-12" stroke={C.ink} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Figure x={52} y={178} h={128} tone={0} cloth={C.oliveDeep} pose="reach" />
    </svg>
  );
}

/* ── Impact: the numbers as a drawn chart ────────────────────────────────── */

/* Wells built per year — a flat column chart sized for the dark impact panel.
   `values` are percentages of the plot height. */
export function ImpactChart({ className }) {
  const cols = [
    { y: 2019, v: 22 },
    { y: 2020, v: 31 },
    { y: 2021, v: 28 },
    { y: 2022, v: 48 },
    { y: 2023, v: 62 },
    { y: 2024, v: 71 },
    { y: 2025, v: 100 },
  ];
  const W = 520;
  const H = 210;
  const base = 176;
  const gap = 68;
  const barW = 34;
  const x0 = 26;
  const top = (v) => base - (v / 100) * 116;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label="Column chart of water points built each year, rising to a record in 2025">
      {/* guide lines */}
      <g stroke="#FFFFFF" strokeOpacity="0.12" strokeWidth="2">
        <path d={`M0 ${base}H${W}`} />
        <path d={`M0 ${base - 44}H${W}`} strokeDasharray="6 10" />
        <path d={`M0 ${base - 88}H${W}`} strokeDasharray="6 10" />
      </g>

      {cols.map((c, i) => {
        const last = i === cols.length - 1;
        const x = x0 + i * gap;
        return (
          <g key={c.y}>
            <rect
              x={x}
              y={top(c.v)}
              width={barW}
              height={base - top(c.v)}
              rx={barW / 2}
              fill={last ? C.gold : "#FFFFFF"}
              opacity={last ? 1 : 0.18}
            />
            <text
              x={x + barW / 2}
              y={base + 22}
              textAnchor="middle"
              fill="#FFFFFF"
              fillOpacity={last ? 0.75 : 0.4}
              style={{ font: "600 12px Outfit, sans-serif" }}
            >
              {c.y}
            </text>
          </g>
        );
      })}

      {/* callout on the record year */}
      <g transform={`translate(${x0 + 6 * gap + barW / 2} ${top(100) - 22})`}>
        <rect x="-30" y="-19" width="60" height="28" rx="14" fill={C.gold} />
        <text x="0" y="0" textAnchor="middle" fill={C.ink} style={{ font: "700 14px Outfit, sans-serif" }}>
          +64
        </text>
      </g>
    </svg>
  );
}

/* ── Closing: a horizon the CTA sits on ──────────────────────────────────── */

/* Drawn in darker tones than the landscape so it reads against the primary
   fill — the same place, at dusk. */
export function ClosingHorizon({ className }) {
  const FAR = "#55462F";
  const MID = "#443722";
  const NEAR = "#332918";
  const CUT = "#241D12";
  return (
    <svg
      viewBox="0 0 1440 240"
      preserveAspectRatio="xMidYMax slice"
      className={className}
      role="img"
      aria-label="Dusk horizon with people walking home"
    >
      {/* low sun and its glow along the horizon */}
      <ellipse cx="1180" cy="132" rx="420" ry="120" fill={C.gold} opacity="0.16" />
      <circle cx="1180" cy="126" r="70" fill={C.gold} opacity="0.55" />
      <circle cx="1180" cy="126" r="40" fill={C.gold} opacity="0.8" />

      <path d="M0 118C180 96 340 116 520 112 720 107 900 128 1080 118 1240 109 1350 124 1440 118V240H0Z" fill={FAR} />
      <path d="M0 156C200 136 420 154 640 162 860 170 1120 160 1440 152V240H0Z" fill={MID} />
      <Hut x={996} y={158} s={0.5} mono={NEAR} />
      <Tree x={132} y={166} s={0.9} mono={NEAR} />
      <Tree x={1330} y={172} s={0.7} mono={NEAR} />
      <path d="M0 196C240 178 520 194 800 204 1040 212 1240 204 1440 198V240H0Z" fill={NEAR} />
      <Figure x={478} y={212} h={96} pose="walk" mono={CUT} />
      <Figure x={548} y={216} h={68} pose="walk" mono={CUT} />
      <Figure x={598} y={218} h={58} pose="walk" mono={CUT} />
      <Figure x={860} y={214} h={88} pose="carry" mono={CUT} />
    </svg>
  );
}
