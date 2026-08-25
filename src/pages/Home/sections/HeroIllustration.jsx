import { C, Figure, Tree, Hut, Cloud, Sun, Birds, Crates, Clinic } from "../../../components/illustration";

/**
 * The hero's landscape — a solar-powered mobile aid clinic parked on the
 * riverbank, with children walking out to meet it.
 *
 * The river is painted in the PRIMARY colour and runs off the bottom edge, so it
 * continues with no seam into the primary-filled band that follows on the page
 * (see StoryBand.jsx). Every terrain band spans the full 1440 width — a band
 * that stops mid-canvas leaves a straight vertical seam.
 *
 * The viewBox is fixed and scaled with `slice`, so the scene crops from the
 * sides on narrow screens rather than squashing.
 */
export default function HeroIllustration() {
  return (
    <svg
      className="block h-[34vw] max-h-[480px] min-h-[250px] w-full"
      viewBox="0 120 1440 480"
      preserveAspectRatio="xMidYMax slice"
      role="img"
      aria-label="Illustration of a solar-powered mobile aid clinic parked on a riverbank, with children walking towards it"
    >
      <defs>
        <linearGradient id="hi-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.cream} />
          <stop offset="100%" stopColor="#F6EFE2" />
        </linearGradient>
        <linearGradient id="hi-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.inkSoft} />
          <stop offset="55%" stopColor={C.ink} />
        </linearGradient>
      </defs>

      {/* sky */}
      <rect y="120" width="1440" height="480" fill="url(#hi-sky)" />
      <Sun x={1136} y={212} r={96} />
      <Cloud x={190} y={218} s={1} />
      <Cloud x={528} y={186} s={0.8} />
      <Cloud x={953} y={232} s={0.9} />
      <Cloud x={1336} y={174} s={0.68} />
      <Birds x={642} y={214} s={1} />

      {/* terrain */}
      <path d="M0 300C180 272 340 296 500 288 660 280 860 302 1040 290 1200 279 1350 296 1440 288V600H0Z" fill={C.sand} />
      <path d="M0 338C170 308 320 330 480 326 640 322 780 346 940 338 1120 329 1290 350 1440 340V600H0Z" fill={C.olivePale} />
      <path d="M0 374C160 358 300 368 460 364 640 359 800 380 980 372 1160 364 1310 380 1440 374V600H0Z" fill={C.gold} />
      <path d="M0 402C190 382 380 400 560 396 760 391 900 412 1080 404 1240 397 1350 410 1440 404V600H0Z" fill={C.oliveDeep} />

      {/* rock formation on the right bank */}
      <g>
        <rect x="1268" y="336" width="130" height="46" rx="22" fill={C.clayPale} />
        <rect x="1178" y="376" width="182" height="54" rx="26" fill={C.clay} />
        <rect x="1178" y="376" width="182" height="18" rx="9" fill={C.clayPale} />
        <rect x="1246" y="424" width="194" height="58" rx="28" fill={C.clayDeep} />
        <rect x="1246" y="424" width="194" height="18" rx="9" fill={C.clay} />
        <rect x="1140" y="428" width="132" height="50" rx="24" fill={C.clay} />
        <rect x="1140" y="428" width="132" height="16" rx="8" fill={C.clayPale} />
        <rect x="1206" y="474" width="234" height="48" rx="24" fill={C.clayDeep} />
      </g>

      {/* meadow */}
      <path d="M0 444C200 422 420 440 620 450 820 460 1000 472 1200 464 1300 460 1380 466 1440 462V600H0Z" fill={C.olive} />
      <path d="M0 494C220 476 460 492 700 502 940 512 1180 518 1440 510V600H0Z" fill={C.oliveDark} opacity="0.3" />

      {/* village on the far bank */}
      <Tree x={74} y={452} s={1.45} />
      <Hut x={1024} y={484} s={0.78} />
      <Hut x={1112} y={490} s={0.6} roof={C.clay} wall={C.shell} />
      <Tree x={942} y={478} s={0.9} />
      <Tree x={1192} y={490} s={0.72} />

      {/* clinic + supplies */}
      <Clinic x={330} y={448} s={1} />
      <Crates x={534} y={478} s={0.9} />

      {/* shore */}
      <path d="M0 518C200 502 440 516 700 528 940 539 1180 544 1440 534V600H0Z" fill={C.shore} />

      {/* people, standing on the bank */}
      <Figure x={166} y={512} h={104} tone={1} cloth={C.oliveDark} pose="carry" />
      <Figure x={676} y={524} h={112} tone={0} cloth={C.gold} skirt pose="wave" />
      <Figure x={594} y={528} h={78} tone={2} cloth={C.clay} pose="walk" />
      <Figure x={640} y={532} h={66} tone={1} cloth={C.shell} pose="walk" />
      <Figure x={868} y={538} h={78} tone={3} cloth={C.clayPale} pose="sit" />
      <Figure x={1064} y={500} h={70} tone={2} cloth={C.clay} skirt pose="stand" />

      {/* river — runs off the bottom edge into the section below */}
      <path d="M0 534C200 518 440 532 700 544 940 555 1180 560 1440 550V600H0Z" fill="url(#hi-water)" />
      <g stroke={C.gold} strokeWidth="4" strokeLinecap="round" opacity="0.26" fill="none">
        <path d="M148 574h68" />
        <path d="M356 586h54" />
        <path d="M642 588h76" />
        <path d="M1004 586h58" />
        <path d="M1208 578h72" />
      </g>
      <g fill={C.gold} opacity="0.14">
        <rect x="1096" y="556" width="80" height="8" rx="4" />
        <rect x="1112" y="576" width="48" height="8" rx="4" />
      </g>
    </svg>
  );
}
