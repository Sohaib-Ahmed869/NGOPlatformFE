import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { cn } from "../../utils/cn";
import { PageBand } from "./scenes";
// The Donexus mark, used as a MASK (not an <img>) so it takes the live theme
// colour instead of the baked-in green — see <DonexusMark/>.
import donexusMark from "../../assets/Donexus Logo/Donexus-268.png";

/**
 * The Donexus marketing site's one design source.
 *
 * Every page under pages/SaaS used to carry its own copy of the palette, its
 * own <style> block and its own button markup, which is why they drifted. They
 * all import from here now: one palette, one type scale, one motion vocabulary,
 * one set of controls. Change it here and the whole site follows.
 *
 * Brand hues resolve to the --tenant-* tokens set by PLATFORM_VARS in App.jsx,
 * so editing the platform brand in SuperAdmin recolours the site.
 */

/* ── Palette ─────────────────────────────────────────────────────────────── */
export const V = {
  bg: "var(--tenant-bg, #F3F8F5)",
  surface: "#FFFFFF",
  // A faint wash of the brand accent, used for alternating section bands.
  surface2: "rgba(var(--tenant-accent-rgb), .08)",
  line: "rgba(var(--tenant-primary-rgb), .10)",
  line2: "rgba(var(--tenant-primary-rgb), .05)",
  ink: "var(--tenant-primary, #102A23)",
  inkSoft: "#46685C",
  inkFaint: "#8AA89C",
  primary: "var(--tenant-accent, #047857)",
  primary2: "var(--pf-accent-2, #065F46)",
  glow: "var(--tenant-accent-light, #059669)",
  accent: "var(--pf-gold, #F59E0B)",
  accentSoft: "var(--pf-gold-soft, #FEF3C7)",
  success: "#059669",
};
export const font = "var(--font-body, 'Outfit', system-ui, sans-serif)";

/* ── Motion ──────────────────────────────────────────────────────────────
   ONE vocabulary for the whole site: entrances rise 24px and fade in over 0.7s
   on the expo-out curve, lists stagger at 0.1s. Nothing scales on entrance.
   Deviating per-page is what makes a site feel assembled rather than designed. */
export const EASE = [0.22, 1, 0.36, 1];
export const REVEAL = 0.7;
export const RISE = 24;

export const stagger = { visible: { transition: { staggerChildren: 0.1 } } };
export const fadeUpChild = {
  hidden: { opacity: 0, y: RISE },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: REVEAL, delay: i * 0.1, ease: EASE } }),
};

export function Reveal({ children, delay = 0, className = "", style = {} }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.12 });
  return (
    <motion.div ref={ref} className={className} style={style}
      initial={{ opacity: 0, y: RISE }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: RISE }}
      transition={{ duration: REVEAL, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}

/* ── Shared stylesheet ───────────────────────────────────────────────────
   The fluid clamp() type scale, page shell and marquee helpers. Mount it once
   per page with <PageStyle/>. */
export const pageCss = `

/* ---------- Design tokens (§4.1) ----------
   Almost nothing here is a fixed pixel value. Sections read these instead of
   hardcoding padding/width, so one edit re-proportions the whole page. */
.saas-page{
  --page-pad: clamp(24px, 5vw, 80px);   /* shared page gutter */
  --shell: 1200px;                      /* max content measure */
  --section-y: clamp(64px, 7.6vw, 104px);
  --gap: clamp(24px, 3.4vw, 64px);
  --ease: cubic-bezier(.22,1,.36,1);    /* expo-out — every entrance uses it */
  --reveal: .7s;                        /* entrance duration */

}
/* Tier 2 + 3 (§4.2). Each tier's min equals the previous tier's max so there is
   no visual jump at the boundary — clamp() alone would strand content in the
   middle of a 2560px screen. */
@media (min-width:1440px){
  .saas-page{ --page-pad: clamp(80px, 5vw, 120px); --shell:1320px; --section-y: clamp(104px, 7.6vw, 132px) }
}
@media (min-width:2000px){
  .saas-page{ --page-pad: clamp(120px, 5vw, 180px); --shell:1520px; --section-y: clamp(132px, 6.6vw, 168px) }
}
.saas-section{ padding-block: var(--section-y); padding-inline: var(--page-pad) }
.saas-shell{ width:100%; max-width: var(--shell); margin-inline:auto }
/* Full-bleed children re-pad themselves; the negative margin MUST use the same
   expression as the padding or the two drift apart at different widths. */
.saas-bleed{ margin-inline: calc(-1 * var(--page-pad)); padding-inline: var(--page-pad) }

/* ---------- Type roles (§3.2) ----------
   Large type carries negative tracking; small type never does. Measure is
   constrained in ch, not px, so it holds across the whole fluid ladder. */
.saas-h1{ font-size: clamp(36px, 5vw, 64px); line-height:1.03; letter-spacing:-0.03em }
.saas-h2{ font-size: clamp(26px, 3.2vw, 40px); line-height:1.08; letter-spacing:-0.02em }
.saas-h3{ font-size: clamp(18px, 1.5vw, 23px); line-height:1.2; letter-spacing:-0.01em }
.saas-lede{ font-size: clamp(15px, 1.2vw, 18px); line-height:1.6; max-width:52ch }
.saas-measure{ max-width:46ch }
/* Off-screen clipping, never display:none, so an icon-only control keeps an
   accessible name (§10). */
.saas-sr{ position:absolute; width:1px; height:1px; margin:-1px; padding:0; border:0;
  overflow:hidden; clip-path:inset(50%); white-space:nowrap }
@media (min-width:1440px){
  .saas-h1{ font-size: clamp(64px, 5vw, 78px) }
  .saas-h2{ font-size: clamp(40px, 3.2vw, 50px) }
  .saas-h3{ font-size: clamp(23px, 1.5vw, 27px) }
  .saas-lede{ font-size: clamp(18px, 1.2vw, 20px) }
}
@media (min-width:2000px){
  .saas-h1{ font-size: clamp(78px, 4.4vw, 96px) }
  .saas-h2{ font-size: clamp(50px, 2.8vw, 62px) }
  .saas-h3{ font-size: clamp(27px, 1.4vw, 31px) }
  .saas-lede{ font-size: clamp(20px, 1.1vw, 22px) }
}


/* ---------- Headings ----------
   Headings run in the same geometric sans as the body, bold and tightly
   tracked. The page's weight comes from the illustrations and the colour
   blocks, so the type stays plain and gets out of their way. */
.saas-page h1,.saas-page h2,.saas-page h3,.saas-page h4,.saas-page h5,.saas-page h6{
  font-family: var(--font-heading, 'Outfit', ui-sans-serif, system-ui, sans-serif);
  font-weight: 700;
  letter-spacing: -0.03em;
}

/* ---------- Corners ----------
   Fully round throughout; controls and chips are pills, set explicitly by the
   components in this file rather than by a blanket a/button rule, so a
   card-shaped link never turns into a stadium.
   Scoped to [data-saas-site] (App.jsx), NOT .saas-page. .saas-page wraps a
   page's body only — the navbar, the footer on every route, and the whole
   /register and /get-started flow sit outside it, so for as long as this map
   was scoped there those surfaces silently fell back to Tailwind's own radii
   and drifted from the home page they are meant to match. */
[data-saas-site] [class*="rounded-3xl"]{ border-radius:28px }
[data-saas-site] [class*="rounded-2xl"]{ border-radius:24px }
[data-saas-site] [class*="rounded-xl"]{ border-radius:16px }
[data-saas-site] [class*="rounded-lg"],
[data-saas-site] [class*="rounded-md"]{ border-radius:12px }
[data-saas-site] .saas-chip{ border-radius:999px }
/* The radius map above is applied by mapping Tailwind's radius utilities, so
   the shape lands everywhere without editing every element. Specificity (0,2,0)
   beats Tailwind's (0,1,0) — no !important needed.
   rounded-full is deliberately exempt: avatars, status dots, progress bars and
   the billing toggle are genuinely circular and squaring them would read as a
   rendering bug.
   The FLOOR that catches elements with no radius utility at all is in
   src/index.css — it has to be in the always-loaded sheet because
   /register/success never imports this file. Keep the two in step. */

/* ---------- Section seams (§2.4) ----------
   With the tinted bands gone the page runs on ONE light surface from the logo
   wall to the pricing table, so sections are separated by a hairline that
   fades out at both ends rather than by a change of colour. Applied via a
   class so a section can opt out (the dark ones do). */
.saas-seam{ position:relative }
.saas-seam::before{ content:""; position:absolute; inset-inline:var(--page-pad); top:0; height:1px;
  background:linear-gradient(90deg,transparent,rgba(var(--tenant-primary-rgb),.11) 22%,
             rgba(var(--tenant-primary-rgb),.11) 78%,transparent) }


/* ---------- Hero headline motion ----------
   Every moving part of the <h1> travels inside one of these boxes: the three
   opening words rise from behind its bottom edge, and the rotating last line
   rolls through it. SaaSHome.jsx has always asked for this class; it was never
   actually defined, so nothing clipped and the type just slid in on top of the
   chip above and the lede below — motion with no edge to come from.

   The measurements, taken off Outfit at the hero size, are why the box is
   lopsided. Against a 1.03em line box the baseline sits .875em down and the
   tallest ink rises .736em, so glyph tops are already .139em INSIDE the box —
   the clip must stay flush with the top edge or an exiting phrase surfaces
   above it and lands on top of "Help your charity". Descenders are the only
   thing that escapes: .222em below the baseline is .067em past the bottom
   edge, so the box is opened by .1em there and the equal negative margin hands
   that space straight back to the layout, leaving the headline's line boxes
   exactly where they were. Move either number and ROLL in SaaSHome.jsx has to
   move with it. */
.saas-hero-mask{ overflow:hidden; padding-bottom:.1em; margin-bottom:-.1em }
@media (max-width:430px){ .saas-hero-rotate{ font-size:.86em } }
.saas-card{border-radius:24px;transition:transform .4s ease,border-color .4s ease,box-shadow .4s ease}
.saas-card:hover{transform:translateY(-4px);border-color:rgba(var(--tenant-accent-rgb),.28);box-shadow:0 18px 40px -16px rgba(var(--tenant-accent-rgb),.22)}
.saas-btn-primary{position:relative;overflow:hidden}
.saas-btn-primary::before{content:"";position:absolute;inset:0;
  background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.45) 50%,transparent 65%);
  transform:translateX(-120%);transition:transform 1s cubic-bezier(.2,.8,.2,1);pointer-events:none}
.saas-btn-primary:hover::before{transform:translateX(120%)}
.saas-cta-ghost{transition:background .3s ease,border-color .3s ease,transform .3s ease}
.saas-cta-ghost:hover{background:rgba(255,255,255,.22)!important;border-color:rgba(255,255,255,.55)!important;transform:translateY(-2px)}
.saas-ic{transition:transform .35s ease,background .35s ease,color .35s ease,border-color .35s ease}
.saas-card:hover .saas-ic{transform:rotate(-6deg) scale(1.08);background:linear-gradient(150deg,var(--tenant-accent,#047857),var(--tenant-accent-light,#059669));color:#fff;border-color:transparent}
/* The accent rule that wipes across a card's top edge on hover. It needs BOTH
   halves: without the :hover rule below it is parked at scaleX(0) forever and
   the pricing cards that render one simply never show it. */
.saas-topline{transform:scaleX(0);transform-origin:left;transition:transform .55s cubic-bezier(.2,.8,.2,1)}
.saas-card:hover .saas-topline{transform:scaleX(1)}

/* ---------- The feature rosette ----------
   One square stage, everything inside placed from the centre. Two custom
   properties drive the whole geometry: --ring is the orbit's diameter and
   --orbit the radius the six labels are parked at. The stage's own height is
   derived from them, so changing --ring re-proportions the control and nothing
   needs measuring in JS. */
/* Sized from its COLUMN, not the viewport. In the two-up layout the left
   column is ~40% of the shell, so a vw-based clamp overshoots badly at the
   1024px breakpoint — the ring gets drawn wider than the column it sits in and
   the 3-and-9-o'clock labels clip off the edge. cqw tracks the column itself.
   Budget: ring(52) + 2×pad(6.5) + label(25) = 90cqw, leaving 10% slack. */
/* While pinned the block is glued to the top of the viewport, which leaves a
   tall dead band underneath it. Filling the viewport and centring the two
   columns inside puts the composition where the eye already is. Only from
   1024px up — that is the only width that pins. */
@media (min-width:1024px){
  .saas-rosette-stage{ min-height:calc(100svh - 150px); align-content:center }
}
/* Tool stack — a single row scrolling left. The track holds two halves and
   every half repeats the row twice, so one half always overflows the viewport
   and the -50% loop never shows a gap. */
@keyframes saas-logorow-l{from{transform:translateX(0)}to{transform:translateX(-50%)}}
/* --tool-size lives HERE, not on .saas-tool, because the row needs it too: it
   sizes the marks AND the headroom the row has to leave for them.
   That padding is not decoration. overflow:hidden clips at the padding box, and
   without it the row is exactly one mark tall — so the hover scale below grew
   the mark 1.8px past the top and bottom edges and the logo you pointed at came
   back with its head and feet shaved off. Keep the padding above
   (scale - 1) / 2 * --tool-size, currently .07, or the clipping returns. */
.saas-logorow{--tool-size:clamp(24px,1.8vw,27px);
  position:relative;overflow:hidden;
  padding-block:calc(var(--tool-size) * .18);
  -webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);
  mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.saas-logotrack{display:flex;width:max-content;align-items:center;will-change:transform}
/* Duration is not a taste setting — it is derived. The loop distance is one
   half of the track, so the row drifts at (half width / duration) px/s, and the
   pace this band was tuned to is ~73px/s. One half currently measures ~4386px,
   hence 60s. Anything that changes the row's WIDTH changes that speed: adding
   or cutting marks, and equally just growing --tool-size, since the gaps scale
   with it. Both have moved it more than once already — dropping nine marks at
   the old 103s left the row crawling at 42px/s. Re-measure and re-divide.
   The other constraint: one half must stay wider than the widest viewport you
   care about or the loop shows a gap. With 13 marks it is ~4386px against a
   3440px ultrawide — still clear, but that is the floor. Cut many more and the
   halves need a third pass of the list, not just a new duration. */
.saas-logotrack--l{animation:saas-logorow-l 60s linear infinite}
/* The row DOES stop, but only while the pointer is actually on a mark — never
   on bare band. That distinction is the whole rule: parking a cursor mid-
   viewport and scrolling used to stop the band dead the moment you reached the
   section, which read as broken rather than considerate, and the gaps between
   marks are wide enough that a cursor left anywhere else lets it run. Stopping
   is what makes the colour reveal below usable at all — the mark you point at
   has to hold still long enough to look at. Fine pointers only: there is no
   hover on a touchscreen, and :has gates the whole thing so a browser
   without it simply never pauses. NOTE this block lives inside a JS template
   literal: no backticks anywhere in these comments. */
@media (hover:hover) and (pointer:fine){
  .saas-logorow:has(.saas-tool:hover) .saas-logotrack--l{animation-play-state:paused}
}
/* ONE number drives the row. The mark size is the unit and the label, the space
   between a mark and its label, and the space between items are all multiples
   of it, so nudging --tool-size rescales the band as a set instead of leaving
   the gaps stranded at their old pixel values.
   The multipliers are the ratios the row already had at a 21px mark — label
   .6, inner gap .42, item gap 2.75 — so growing the unit keeps the rhythm it
   was tuned to rather than just crowding bigger marks into the old spacing.
   The clamp floor is 24px, not the viewport-scaled value: 1.8vw bottoms out
   around 7px on a phone, and letting it clamp lower there made the band SMALLER
   on mobile than the fixed 21px/14px it replaced. */
.saas-tool{flex:none;display:inline-flex;align-items:center;
  gap:calc(var(--tool-size) * .42);margin-right:calc(var(--tool-size) * 2.75)}
/* Mono ink at rest, the real logo in its own brand colour on hover — the same
   bargain the charity wall made before it: twenty-two brand palettes at full
   saturation (Stripe purple, AWS orange, React cyan, MongoDB green) would be
   the loudest thing on a page whose whole scheme is one green, so the row reads
   as provenance until you point at it. */
.saas-tool svg{flex:none;width:var(--tool-size);height:var(--tool-size);
  color:rgba(var(--tenant-primary-rgb),.5);
  transition:color .35s ease,transform .35s cubic-bezier(.22,1,.36,1)}
.saas-tool span{font-size:calc(var(--tool-size) * .6);font-weight:500;white-space:nowrap;
  color:rgba(var(--tenant-primary-rgb),.62);transition:color .35s ease}
/* --tool-brand is set per item in SaaSHome.jsx; the fallback keeps a mark
   visible rather than transparent if one is ever added without a hex. */
.saas-tool:hover svg{color:var(--tool-brand,currentColor);transform:scale(1.14)}
.saas-tool:hover span{color:var(--tenant-primary,#102A23)}
/* No reduced-motion rule here on purpose — the page-wide reset at §7.7 already
   neutralises every animation with !important, so anything set here is dead. */
@keyframes saas-prog-shine{0%{transform:translateX(-130%)}55%,100%{transform:translateX(420%)}}
.saas-prog-shine{animation:saas-prog-shine 2.8s ease-in-out infinite}
@keyframes saas-pop-in{0%{transform:scale(0) rotate(-30deg);opacity:0}60%{transform:scale(1.15) rotate(0)}100%{transform:scale(1);opacity:1}}

/* ---------- Reduced motion (§7.7) ----------
   Two levels now that the scroll-lock is gone: CSS motion is neutralised here,
   and JS-driven motion checks useReducedMotion() and never subscribes. */
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}
}`;

export function PageStyle() {
  return <style>{pageCss}</style>;
}

/* ── Controls ────────────────────────────────────────────────────────────
   Solid pills. The site reads as flat colour blocks, so buttons carry their
   weight through fill, not through shadow. */
export function Btn({ to, href, children, tone = "brand", className = "", style = {}, ...rest }) {
  const tint = {
    brand: { background: V.primary, color: "#fff" },
    dark: { background: V.ink, color: "#fff" },
    light: { background: V.surface, color: V.ink },
    ghost: { border: `1px solid ${V.line}`, color: V.ink },
    outline: { border: "1px solid rgba(255,255,255,.25)", color: "#fff" },
  }[tone];

  const cls = cn(
    "inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-semibold leading-none transition-all duration-300 hover:brightness-[1.06]",
    className,
  );
  const s = { ...tint, ...style };

  if (href) return <a href={href} className={cls} style={s} {...rest}>{children}</a>;
  if (to) return <Link to={to} className={cls} style={s} {...rest}>{children}</Link>;
  return <button type="button" className={cls} style={s} {...rest}>{children}</button>;
}

/* ── Eyebrow chip ────────────────────────────────────────────────────────── */
export function Chip({ children, tone = "dark", className = "" }) {
  const light = tone === "light";
  return (
    <span className={cn("inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 text-[13px] font-semibold", className)}
      style={light
        ? { background: "rgba(255,255,255,.1)", color: "#fff" }
        : { background: V.surface2, color: V.primary }}>
      <span className="h-2 w-2 rounded-full" style={{ background: V.primary }} />
      {children}
    </span>
  );
}

/* ── Section heading ─────────────────────────────────────────────────────
   `title` accepts inline markup (a <br/> to control the line break), which is
   why it is set with dangerouslySetInnerHTML — the strings are ours, authored
   in this repo, never user or tenant input. */
export function SectionHead({ id, badge, title, subtitle, center = false, tone = "dark" }) {
  const light = tone === "light";
  return (
    <Reveal className={cn("max-w-[44rem]", center && "mx-auto text-center")}>
      {badge && <Chip tone={tone}>{badge}</Chip>}
      <h2 id={id} className={cn("saas-h2 font-bold", badge && "mt-5")}
        style={{ color: light ? "#fff" : V.ink }}
        dangerouslySetInnerHTML={{ __html: title }} />
      {subtitle && (
        <p className={cn("saas-lede mt-4", center && "mx-auto")}
          style={{ color: light ? "rgba(255,255,255,.6)" : V.inkSoft }}>
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}

/* ── Surface ─────────────────────────────────────────────────────────────── */
export function Card({ children, className = "", style = {} }) {
  return (
    <div className={cn("overflow-hidden rounded-[24px]", className)}
      style={{ background: V.surface, border: `1px solid ${V.line}`, ...style }}>
      {children}
    </div>
  );
}

/* ── The Donexus mark.
   Rendered as a CSS mask over a themed gradient rather than as an <img>: the
   PNG is ~79% transparent, so its alpha channel IS the artwork, and masking
   lets the mark inherit --tenant-accent like everything else on the page.
   An <img> would freeze it at the baked-in green and fight every other preset.

   NOTE ON THE GEOMETRY: the mark is FOUR interlocking ribbon bows at 90°,
   reading as eight loops — it is 4-fold symmetric (verified: a 90° rotation
   self-matches at 0.98, a 60° one at 0.58, i.e. noise). It is NOT a six-petal
   rosette, so nothing here may assume one petal per feature. The mark stays
   whole and turns as a unit; the six-way split lives on the orbit ring, which
   we draw ourselves. Because 60° is not a multiple of 90°, each step is a
   visible turn, and six of them complete exactly one revolution. ── */
export function DonexusMark({ size = 96, className = "", style = {} }) {
  const mask = {
    WebkitMaskImage: `url(${donexusMark})`, maskImage: `url(${donexusMark})`,
    WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
    WebkitMaskPosition: "center", maskPosition: "center",
    WebkitMaskSize: "contain", maskSize: "contain",
  };
  return (
    <span aria-hidden className={className}
      style={{ display: "block", width: size, height: size, background: `linear-gradient(145deg, ${V.glow}, ${V.primary2})`, ...mask, ...style }} />
  );
}

/* ── Inner-page hero ─────────────────────────────────────────────────────
   The centred opening every page but the home page uses: chip, title, lede,
   optional actions, closed by a slim strip of the hero's landscape. The band
   ends in the page background, so whatever follows it can be any colour. */
export function PageHero({ chip, title, lede, children, band = true, id }) {
  return (
    <section className="relative overflow-hidden" style={{ background: V.bg }}>
      <div
        className="relative z-10 mx-auto w-full max-w-[min(1180px,94vw)] pb-[clamp(28px,4vh,56px)] pt-[clamp(104px,14vh,156px)] text-center"
        style={{ paddingInline: "var(--page-pad)" }}
      >
        <motion.div initial={{ opacity: 0, y: RISE }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: REVEAL, delay: 0.05, ease: EASE }}>
          {chip && <Chip>{chip}</Chip>}
        </motion.div>
        <motion.h1 id={id} className={cn("saas-h1 font-bold", chip && "mt-6")} style={{ color: V.ink }}
          initial={{ opacity: 0, y: RISE }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: REVEAL, delay: 0.12, ease: EASE }}>
          {title}
        </motion.h1>
        {lede && (
          <motion.p className="saas-lede mx-auto mt-5" style={{ color: V.inkSoft }}
            initial={{ opacity: 0, y: RISE }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: REVEAL, delay: 0.2, ease: EASE }}>
            {lede}
          </motion.p>
        )}
        {children && (
          <motion.div className="mt-8 flex flex-wrap items-center justify-center gap-3"
            initial={{ opacity: 0, y: RISE }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: REVEAL, delay: 0.28, ease: EASE }}>
            {children}
          </motion.div>
        )}
      </div>
      {band && <PageBand className="-mb-px block h-[clamp(76px,8vw,132px)] w-full" />}
    </section>
  );
}
