import { Figure, Tree, Cloud } from "../../components/illustration";
import { S, BrowserWindow, Phone, NotifyCard, MiniChart } from "./illustration";

/**
 * Donexus scenes — the same flat-vector hand as the charity sites, pointed at
 * the product rather than the field.
 *
 * The audience is a charity CEO or fundraising manager, so what the drawings
 * show is what they get: their own donation page on their own subdomain, a
 * receipt going out, a donation landing, the numbers adding up.
 */

/* ── Hero: the product, in the open ──────────────────────────────────────── */
export default function HeroScene() {
  return (
    <svg
      className="block h-[38vw] max-h-[540px] min-h-[290px] w-full"
      viewBox="0 60 1440 540"
      preserveAspectRatio="xMidYMax slice"
      role="img"
      aria-label="A charity's donation page on its own web address, with a donor receipt, a live donation notification and a chart of donations"
    >
      <defs>
        <linearGradient id="dx-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={S.bg} />
          <stop offset="100%" stopColor={S.sky} />
        </linearGradient>
      </defs>

      <rect y="60" width="1440" height="540" fill="url(#dx-sky)" />

      {/* light */}
      <circle cx="1152" cy="188" r="120" fill={S.brand} opacity="0.08" />
      <circle cx="1152" cy="188" r="66" fill={S.brand} opacity="0.1" />
      <Cloud x={196} y={196} s={0.95} />
      <Cloud x={1300} y={158} s={0.7} />

      {/* land */}
      <path d="M0 336C190 306 360 330 540 326 740 321 900 344 1080 334 1240 325 1350 342 1440 334V600H0Z" fill={S.hillFar} />
      <path d="M0 388C210 362 420 384 640 380 860 376 1080 396 1440 386V600H0Z" fill={S.hillMid} />
      <Tree x={96} y={402} s={1.15} tone={S.grassDeep} />
      <Tree x={1348} y={410} s={0.85} tone={S.grassDeep} />
      <path d="M0 436C220 412 460 430 700 440 940 450 1180 456 1440 448V600H0Z" fill={S.hillNear} />

      {/* the charity's own donation page */}
      <BrowserWindow x={452} y={130} s={1} />

      {/* the donor's receipt */}
      <Phone x={286} y={214} s={0.92} />

      {/* a donation landing, and the week's numbers */}
      <NotifyCard x={1010} y={168} s={0.94} />
      <MiniChart x={1052} y={286} s={0.86} />

      {/* the people either side of it */}
      <Figure x={218} y={524} h={128} tone={1} cloth={S.brand} pose="reach" />
      <Figure x={1206} y={530} h={112} tone={0} cloth={S.grassDeep} skirt pose="wave" />
      <Figure x={1292} y={534} h={94} tone={2} cloth={S.inkSoft} pose="stand" />

      {/* the band that runs off the bottom edge into the section below */}
      <path d="M0 512C220 490 480 506 760 518 1000 528 1220 522 1440 514V600H0Z" fill={S.grass} />
      <path d="M0 548C240 528 520 544 800 554 1040 562 1240 556 1440 550V600H0Z" fill={S.ink} />
    </svg>
  );
}

/* ── How it works: three steps ───────────────────────────────────────────── */

/* 1 — pick a plan and a web address. */
export function StepSetup({ className }) {
  return (
    <svg viewBox="0 0 320 200" className={className} role="img" aria-label="Choosing a plan and a web address">
      <rect x="30" y="34" width="260" height="46" rx="23" fill={S.chrome} stroke={S.chromeEdge} strokeWidth="2" />
      <circle cx="56" cy="57" r="7" fill={S.brand} />
      <rect x="76" y="52" width="112" height="10" rx="5" fill={S.slabDeep} />
      <rect x="196" y="52" width="72" height="10" rx="5" fill={S.brand} opacity="0.35" />

      <rect x="30" y="96" width="80" height="72" rx="18" fill={S.chrome} stroke={S.chromeEdge} strokeWidth="2" />
      <rect x="48" y="116" width="44" height="10" rx="5" fill={S.slabDeep} />
      <rect x="48" y="136" width="28" height="8" rx="4" fill={S.slab} />

      <rect x="120" y="88" width="80" height="88" rx="18" fill={S.brand} />
      <rect x="138" y="112" width="44" height="10" rx="5" fill={S.chrome} opacity="0.9" />
      <rect x="138" y="132" width="28" height="8" rx="4" fill={S.chrome} opacity="0.6" />
      <circle cx="196" cy="94" r="15" fill={S.ink} />
      <path d="M190 94l4 5 8-9" stroke={S.chrome} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      <rect x="210" y="96" width="80" height="72" rx="18" fill={S.chrome} stroke={S.chromeEdge} strokeWidth="2" />
      <rect x="228" y="116" width="44" height="10" rx="5" fill={S.slabDeep} />
      <rect x="228" y="136" width="28" height="8" rx="4" fill={S.slab} />
    </svg>
  );
}

/* 2 — your logo, your colours, your page. */
export function StepBrand({ className }) {
  return (
    <svg viewBox="0 0 320 200" className={className} role="img" aria-label="Adding a logo and brand colours to the donation page">
      <BrowserWindow x={92} y={28} s={0.42} />
      <g>
        <circle cx="48" cy="62" r="22" fill={S.brand} />
        <circle cx="48" cy="112" r="22" fill={S.gold} />
        <circle cx="48" cy="162" r="22" fill={S.ink} />
        <circle cx="48" cy="62" r="29" fill="none" stroke={S.brand} strokeWidth="3" />
      </g>
    </svg>
  );
}

/* 3 — share it, and the donations arrive. */
export function StepReceive({ className }) {
  return (
    <svg viewBox="0 0 320 200" className={className} role="img" aria-label="Donations arriving and receipts going out automatically">
      <NotifyCard x={16} y={26} s={0.82} />
      <NotifyCard x={54} y={112} s={0.82} />
      <Phone x={208} y={20} s={0.58} />
      <path
        d="M190 74c20 6 30 20 30 40"
        stroke={S.hillNear}
        strokeWidth="4"
        strokeDasharray="9 9"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/* ── Closing: the horizon the CTA sits on ────────────────────────────────── */
export function ClosingHorizon({ className }) {
  const FAR = "#1B4638";
  const MID = "#15382D";
  const NEAR = "#102A23";
  const CUT = "#0A1C17";
  return (
    <svg
      viewBox="0 0 1440 240"
      preserveAspectRatio="xMidYMax slice"
      className={className}
      role="img"
      aria-label="Dusk horizon"
    >
      <defs>
        <radialGradient id="dx-dusk" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={S.gold} stopOpacity="0.3" />
          <stop offset="100%" stopColor={S.gold} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="1160" cy="140" rx="440" ry="130" fill="url(#dx-dusk)" />
      <circle cx="1160" cy="130" r="56" fill={S.gold} opacity="0.45" />
      <circle cx="1160" cy="130" r="32" fill={S.gold} opacity="0.8" />

      <path d="M0 120C180 98 340 118 520 114 720 109 900 130 1080 120 1240 111 1350 126 1440 120V240H0Z" fill={FAR} />
      <path d="M0 158C200 138 420 156 640 164 860 172 1120 162 1440 154V240H0Z" fill={MID} />
      <Tree x={148} y={168} s={0.85} mono={NEAR} />
      <Tree x={1320} y={174} s={0.65} mono={NEAR} />
      <path d="M0 198C240 180 520 196 800 206 1040 214 1240 206 1440 200V240H0Z" fill={NEAR} />
      <Figure x={512} y={214} h={94} pose="walk" mono={CUT} />
      <Figure x={578} y={218} h={70} pose="walk" mono={CUT} />
      <Figure x={892} y={216} h={86} pose="carry" mono={CUT} />
    </svg>
  );
}

/* ── Page band ───────────────────────────────────────────────────────────
 * A slim strip of the same landscape, for the top of an inner page. It ends in
 * the page background rather than the primary colour, so it softly closes a
 * hero instead of forcing a dark section underneath the way <HeroScene/> does.
 */
export function PageBand({ className }) {
  return (
    <svg
      viewBox="0 0 1440 150"
      preserveAspectRatio="xMidYMax slice"
      className={className}
      role="presentation"
      aria-hidden="true"
    >
      <path d="M0 44C190 20 380 42 560 40 760 37 940 58 1120 48 1260 40 1350 54 1440 46V150H0Z" fill={S.hillFar} />
      <path d="M0 82C210 60 430 80 650 78 870 76 1100 94 1440 84V150H0Z" fill={S.hillMid} />
      <Tree x={112} y={96} s={0.62} tone={S.grassDeep} />
      <Tree x={1332} y={100} s={0.5} tone={S.grassDeep} />
      <path d="M0 112C230 92 470 108 710 116 950 124 1190 128 1440 120V150H0Z" fill={S.hillNear} />
    </svg>
  );
}
