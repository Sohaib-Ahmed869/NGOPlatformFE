/**
 * Flat-vector illustration kit for the homepage.
 *
 * Every scene on the page is drawn from these primitives so the whole site
 * shares one hand. Brand colours resolve through the tenant CSS vars; the warm
 * supporting hues below give the scenes the range three brand colours cannot,
 * and are all analogous to the gold accent so they read as one family.
 *
 * LIMBS ARE STROKES, NOT BOXES. A rounded-cap stroke from joint to joint always
 * meets the body cleanly and never leaves the gap a rotated <rect> does — this
 * is what makes the figures read as figures. Do not go back to rects.
 */

export const C = {
  sand: "#E4D6BC",
  shore: "#D9C6A2",
  olivePale: "#B7B27C",
  olive: "#98A05C",
  oliveDeep: "#7C8749",
  oliveDark: "#5F6B39",
  clay: "#C4744A",
  clayDeep: "#A65C38",
  clayPale: "#DC9A6C",
  bark: "#6B5A3E",
  shell: "#EDE4D3",
  shellDeep: "#DCCDAF",
  glass: "#A6BCB6",
  ink: "var(--tenant-primary, #2C2418)",
  inkSoft: "var(--tenant-primary-light, #4A3C2A)",
  gold: "var(--tenant-accent, #C9A84C)",
  cream: "var(--tenant-bg, #FAF7F2)",
};

/* Skin + hair tones, so a crowd isn't one colour. */
export const SKINS = [
  { s: "#8B5E3C", h: "#3E2817" },
  { s: "#A9784F", h: "#4A3320" },
  { s: "#70492C", h: "#33200F" },
  { s: "#C09268", h: "#5A4026" },
];

/* ── Figure ───────────────────────────────────────────────────────────────
 * Drawn in a local space 106 units tall with the FEET AT THE ORIGIN, then
 * translated and scaled — so callers position a person by where they stand.
 *
 *   pose  "stand" | "walk" | "wave" | "sit" | "carry" | "reach"
 *   h     height in parent units (default 106 = 1:1)
 *   tone  index into SKINS
 */
export function Figure({ x = 0, y = 0, h = 106, tone = 0, cloth = C.clay, skirt = false, pose = "stand", flip = false, mono = null }) {
  // `mono` flattens the whole figure to one colour — used where a scene wants
  // silhouettes against a light source rather than full-colour people.
  const { s: skinTone, h: hairTone } = SKINS[tone % SKINS.length];
  const skin = mono || skinTone;
  const hair = mono || hairTone;
  const wear = mono || cloth;
  const k = h / 106;

  const legs = {
    stand: [
      "M-6 -40 L-6 -6",
      "M6 -40 L6 -6",
    ],
    walk: [
      "M-5 -40 L-14 -7",
      "M5 -40 L11 -6",
    ],
    wave: [
      "M-6 -40 L-8 -6",
      "M6 -40 L8 -6",
    ],
    carry: [
      "M-6 -40 L-9 -6",
      "M6 -40 L9 -6",
    ],
    reach: [
      "M-6 -40 L-10 -6",
      "M6 -40 L7 -6",
    ],
    // seated: origin is where they SIT, legs stretched out in front
    sit: [
      "M-2 -12 L28 -6",
      "M6 -12 L34 -10",
    ],
  }[pose] || [];

  const arms = {
    stand: ["M-13 -66 L-17 -42", "M13 -66 L17 -42"],
    walk: ["M-13 -66 L-19 -46", "M13 -66 L18 -44"],
    wave: ["M-13 -66 L-18 -44", "M13 -66 L25 -88"],
    carry: ["M-13 -66 L-18 -54", "M13 -66 L18 -54"],
    reach: ["M-13 -66 L-16 -44", "M13 -66 L28 -60"],
    sit: ["M-13 -42 L-24 -12", "M13 -42 L28 -22"],
  }[pose] || [];

  const seated = pose === "sit";
  const torsoY = seated ? -50 : -74;
  const torsoH = seated ? 42 : 40;
  const headCY = seated ? -70 : -94;
  const neckY = seated ? -66 : -90;

  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -k : k} ${k})`}>
      {/* legs behind the body */}
      <g stroke={skin} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {legs.map((d, i) => <path key={i} d={d} />)}
      </g>
      {/* torso */}
      {skirt ? (
        <path d={`M-13 ${torsoY} h26 l7 ${torsoH + 6} h-40 z`} fill={wear} />
      ) : (
        <rect x="-15" y={torsoY} width="30" height={torsoH} rx="13" fill={wear} />
      )}
      {/* arms in front */}
      <g stroke={skin} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {arms.map((d, i) => <path key={i} d={d} />)}
      </g>
      {pose === "carry" && (
        <g>
          <rect x="-18" y="-62" width="36" height="24" rx="5" fill={mono || C.shell} />
          {!mono && <rect x="-3" y="-62" width="6" height="24" fill={C.gold} opacity="0.55" />}
        </g>
      )}
      {/* neck + head — hair is a slightly raised disc, the face sits just below
          it, which leaves a clean crown without any clipping. */}
      <rect x="-4" y={neckY} width="8" height="10" fill={skin} />
      <circle cx="0" cy={headCY - 2} r="11.5" fill={hair} />
      <circle cx="0" cy={headCY + 1.5} r="10" fill={skin} />
      {!mono && (
        <g fill={hair}>
          <circle cx="-3.7" cy={headCY + 1} r="1.5" />
          <circle cx="3.7" cy={headCY + 1} r="1.5" />
        </g>
      )}
    </g>
  );
}

/* ── Scenery ─────────────────────────────────────────────────────────────── */

export function Tree({ x = 0, y = 0, s = 1, tone = C.oliveDeep, mono = null }) {
  const trunk = mono || C.bark;
  const a = mono || tone;
  const b = mono || C.oliveDark;
  const c = mono || C.olive;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-7" y="-56" width="14" height="58" rx="7" fill={trunk} />
      <circle cx="0" cy="-74" r="34" fill={a} />
      <circle cx="-23" cy="-56" r="21" fill={b} />
      <circle cx="22" cy="-58" r="18" fill={c} />
    </g>
  );
}

export function Hut({ x = 0, y = 0, s = 1, roof = C.clayDeep, wall = C.sand, mono = null }) {
  if (mono) roof = wall = mono;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-46 -30 0 -76 46 -30Z" fill={roof} />
      <rect x="-36" y="-32" width="72" height="34" rx="7" fill={wall} />
      <rect x="-10" y="-22" width="20" height="24" rx="6" fill={C.bark} opacity="0.55" />
    </g>
  );
}

export function Cloud({ x = 0, y = 0, s = 1 }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M-72 0q0-30 30-30 12-26 42-26t42 26q30 0 30 30z"
      fill="#FFFFFF"
      opacity="0.9"
    />
  );
}

export function Sun({ x = 0, y = 0, r = 96 }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={C.gold} opacity="0.16" />
      <circle cx={x} cy={y} r={r * 0.56} fill={C.gold} opacity="0.26" />
    </g>
  );
}

export function Birds({ x = 0, y = 0, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={C.bark} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.45">
      <path d="M0 0q10-9 20 0M20 0q10-9 20 0" />
      <path d="M56 30q8-7 16 0M72 30q8-7 16 0" />
    </g>
  );
}

/* A stack of aid crates, banded in the accent. */
export function Crates({ x = 0, y = 0, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-31" y="-34" width="62" height="34" rx="8" fill={C.shell} />
      <rect x="-31" y="-34" width="62" height="9" rx="4.5" fill={C.shellDeep} />
      <rect x="-5" y="-34" width="10" height="34" fill={C.gold} opacity="0.55" />
      <rect x="-23" y="-66" width="46" height="32" rx="8" fill={C.shellDeep} />
      <rect x="-4" y="-66" width="8" height="32" fill={C.gold} opacity="0.5" />
    </g>
  );
}

/* The solar-powered mobile clinic — the page's signature object. */
export function Clinic({ x = 0, y = 0, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="34" rx="188" ry="17" fill={C.oliveDark} opacity="0.3" />

      {/* solar array */}
      <rect x="-118" y="-162" width="18" height="26" rx="5" fill={C.bark} />
      <rect x="94" y="-162" width="18" height="26" rx="5" fill={C.bark} />
      <rect x="-134" y="-180" width="266" height="26" rx="8" fill={C.inkSoft} />
      <g stroke={C.gold} strokeWidth="3" opacity="0.5">
        <path d="M-90 -180v26M-46 -180v26M-2 -180v26M42 -180v26M86 -180v26" />
      </g>
      <rect x="-134" y="-180" width="266" height="7" rx="3.5" fill={C.gold} opacity="0.32" />

      {/* body */}
      <rect x="-162" y="-140" width="322" height="132" rx="30" fill={C.shell} />
      <rect x="-162" y="-140" width="322" height="26" rx="13" fill="#F8F2E7" />
      <rect x="-162" y="-34" width="322" height="26" rx="13" fill={C.shellDeep} />

      {/* door */}
      <rect x="-86" y="-112" width="82" height="98" rx="14" fill={C.shellDeep} />
      <rect x="-74" y="-100" width="26" height="26" rx="6" fill={C.glass} />
      <rect x="-42" y="-100" width="26" height="26" rx="6" fill={C.glass} />
      <circle cx="-14" cy="-56" r="5" fill={C.ink} />

      {/* window with a lit lamp */}
      <rect x="28" y="-106" width="96" height="66" rx="16" fill={C.glass} />
      <rect x="36" y="-98" width="80" height="50" rx="12" fill="#F8F2E7" />
      <path d="M64 -60h24l6-15a18 18 0 1 0-36 0z" fill={C.gold} />

      {/* aid mark */}
      <circle cx="-124" cy="-76" r="23" fill={C.gold} />
      <path d="M-124 -64c-7-5-12-9-12-14a6.5 6.5 0 0 1 12-3 6.5 6.5 0 0 1 12 3c0 5-5 9-12 14Z" fill={C.shell} />

      {/* wheels */}
      <circle cx="-102" cy="-2" r="30" fill={C.ink} />
      <circle cx="-102" cy="-2" r="12" fill={C.shellDeep} />
      <circle cx="98" cy="-2" r="30" fill={C.ink} />
      <circle cx="98" cy="-2" r="12" fill={C.shellDeep} />
    </g>
  );
}

/* Hand pump over a well — the water programmes' shorthand. */
export function Pump({ x = 0, y = 0, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-30" y="-10" width="60" height="12" rx="6" fill={C.shellDeep} />
      <rect x="-6" y="-72" width="12" height="64" rx="6" fill={C.inkSoft} />
      <path d="M-6 -60h-26" stroke={C.inkSoft} strokeWidth="10" strokeLinecap="round" />
      <path d="M6 -66l26-10" stroke={C.gold} strokeWidth="10" strokeLinecap="round" />
      <path d="M-32 -56v10" stroke={C.gold} strokeWidth="8" strokeLinecap="round" />
      <path d="M-32 -40v6M-32 -30v5" stroke={C.glass} strokeWidth="5" strokeLinecap="round" />
      <path d="M-46 -8q0-14 14-14t14 14z" fill={C.glass} />
    </g>
  );
}
