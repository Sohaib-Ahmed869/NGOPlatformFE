/**
 * Donexus illustration primitives — the product half of the kit.
 *
 * The people and scenery come from components/illustration.jsx (shared with the
 * charity sites); this file adds the things a SaaS scene needs: a browser
 * window, a phone, a notification card, a mini chart.
 *
 * Colours resolve through the PLATFORM_VARS set in App.jsx, so the drawings
 * follow the platform brand if it is re-themed from SuperAdmin -> Platform.
 * The literal greens below are the neutrals of the scene, not the brand.
 */

export const S = {
  ink: "var(--tenant-primary, #102A23)",
  inkSoft: "var(--tenant-primary-light, #1C453A)",
  brand: "var(--tenant-accent, #047857)",
  brandLt: "var(--tenant-accent-light, #059669)",
  bg: "var(--tenant-bg, #F3F8F5)",
  gold: "var(--pf-gold, #F59E0B)",

  /* Scene neutrals — sage greens that sit under the brand without competing. */
  sky: "#EEF6F1",
  hillFar: "#DCEBE2",
  hillMid: "#C3DDCE",
  hillNear: "#A6CBB6",
  grass: "#8CBBA0",
  grassDeep: "#6EA286",
  chrome: "#FFFFFF",
  chromeEdge: "#E3EDE7",
  slab: "#F4F9F6",
  slabDeep: "#E6F0EA",
  dot: "#C7D8CF",
};

/* ── Browser window ───────────────────────────────────────────────────────
 * The charity's own donation page, on their own subdomain — the single most
 * important thing the product does, so it is the centre of the hero.
 * Drawn with the top-left at the origin.
 */
export function BrowserWindow({ x = 0, y = 0, s = 1 }) {
  // Fixed design space — the page content below is laid out against these, so
  // resizing happens through `s` only. A w/h prop pair would silently clip.
  const w = 520;
  const h = 340;
  const bar = 40;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="0" y="0" width={w} height={h} rx="22" fill={S.chrome} />
      <rect x="0" y="0" width={w} height={h} rx="22" fill="none" stroke={S.chromeEdge} strokeWidth="2" />

      {/* chrome */}
      <path d={`M0 22a22 22 0 0 1 22-22h${w - 44}a22 22 0 0 1 22 22v${bar - 22}H0z`} fill={S.slab} />
      <g fill={S.dot}>
        <circle cx="22" cy="20" r="5" />
        <circle cx="40" cy="20" r="5" />
        <circle cx="58" cy="20" r="5" />
      </g>
      <rect x="78" y="11" width={w - 100} height="18" rx="9" fill={S.chrome} />
      <circle cx="93" cy="20" r="4" fill={S.brand} />
      <rect x="104" y="16" width="132" height="8" rx="4" fill={S.dot} />

      {/* page: banner, headline, amount chips, donate button, progress */}
      <rect x="18" y={bar + 14} width={w - 36} height="104" rx="14" fill={S.hillMid} />
      <circle cx={w / 2} cy={bar + 66} r="26" fill={S.chrome} opacity="0.55" />
      <path
        d={`M${w / 2} ${bar + 79}c-11-8-19-14-19-22a10 10 0 0 1 19-5 10 10 0 0 1 19 5c0 8-8 14-19 22Z`}
        fill={S.brand}
      />

      <rect x="18" y={bar + 132} width="188" height="13" rx="6.5" fill={S.slabDeep} />
      <rect x="18" y={bar + 154} width="124" height="10" rx="5" fill={S.slab} />

      <g>
        <rect x="18" y={bar + 182} width="72" height="34" rx="17" fill={S.slab} stroke={S.chromeEdge} strokeWidth="2" />
        <rect x="38" y={bar + 194} width="32" height="10" rx="5" fill={S.dot} />
        <rect x="100" y={bar + 182} width="72" height="34" rx="17" fill={S.brand} />
        <rect x="120" y={bar + 194} width="32" height="10" rx="5" fill={S.chrome} opacity="0.85" />
        <rect x="182" y={bar + 182} width="72" height="34" rx="17" fill={S.slab} stroke={S.chromeEdge} strokeWidth="2" />
        <rect x="202" y={bar + 194} width="32" height="10" rx="5" fill={S.dot} />
      </g>

      <rect x={w - 168} y={bar + 182} width="150" height="34" rx="17" fill={S.ink} />
      <rect x={w - 132} y={bar + 194} width="78" height="10" rx="5" fill={S.chrome} opacity="0.9" />

      <rect x="18" y={bar + 234} width={w - 36} height="10" rx="5" fill={S.slabDeep} />
      <rect x="18" y={bar + 234} width={(w - 36) * 0.68} height="10" rx="5" fill={S.brand} />
    </g>
  );
}

/* ── Phone ───────────────────────────────────────────────────────────────
 * The donor's receipt, seconds after they gave.
 */
export function Phone({ x = 0, y = 0, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="0" y="0" width="150" height="290" rx="28" fill={S.ink} />
      <rect x="7" y="7" width="136" height="276" rx="22" fill={S.chrome} />
      <rect x="55" y="16" width="40" height="7" rx="3.5" fill={S.slabDeep} />

      <circle cx="75" cy="86" r="26" fill={S.brand} />
      <path d="M64 86l8 9 17-19" stroke={S.chrome} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      <rect x="34" y="128" width="82" height="12" rx="6" fill={S.slabDeep} />
      <rect x="46" y="150" width="58" height="9" rx="4.5" fill={S.slab} />

      <rect x="24" y="182" width="102" height="10" rx="5" fill={S.slab} />
      <rect x="24" y="202" width="76" height="10" rx="5" fill={S.slab} />
      <rect x="24" y="234" width="102" height="30" rx="15" fill={S.slab} stroke={S.chromeEdge} strokeWidth="2" />
    </g>
  );
}

/* ── Floating notification — a gift landing, live. ───────────────────────── */
export function NotifyCard({ x = 0, y = 0, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="0" y="0" width="238" height="80" rx="20" fill={S.chrome} />
      <rect x="0" y="0" width="238" height="80" rx="20" fill="none" stroke={S.chromeEdge} strokeWidth="2" />
      <circle cx="42" cy="40" r="22" fill={S.brand} opacity="0.14" />
      <path
        d="M42 51c-11-8-18-13-18-21a9.5 9.5 0 0 1 18-4.5A9.5 9.5 0 0 1 60 30c0 8-7 13-18 21Z"
        fill={S.brand}
      />
      <rect x="78" y="24" width="118" height="12" rx="6" fill={S.slabDeep} />
      <rect x="78" y="46" width="72" height="10" rx="5" fill={S.slab} />
      <circle cx="212" cy="28" r="7" fill={S.gold} />
    </g>
  );
}

/* ── Mini chart card — "clear insights", drawn. ──────────────────────────── */
export function MiniChart({ x = 0, y = 0, s = 1 }) {
  const bars = [26, 40, 33, 54, 68];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="0" y="0" width="196" height="146" rx="20" fill={S.chrome} />
      <rect x="0" y="0" width="196" height="146" rx="20" fill="none" stroke={S.chromeEdge} strokeWidth="2" />
      <rect x="20" y="20" width="82" height="10" rx="5" fill={S.slabDeep} />
      {bars.map((b, i) => (
        <rect
          key={i}
          x={20 + i * 34}
          y={122 - b}
          width="20"
          height={b}
          rx="10"
          fill={i === bars.length - 1 ? S.brand : S.hillNear}
        />
      ))}
      <rect x="20" y="124" width="156" height="4" rx="2" fill={S.slabDeep} />
    </g>
  );
}

