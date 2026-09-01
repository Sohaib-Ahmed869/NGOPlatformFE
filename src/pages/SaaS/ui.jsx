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

export function Reveal({ children, id, delay = 0, className = "", style = {} }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.12 });
  // `id` is forwarded so callers can anchor scroll-spy / in-page links to a Reveal.
  return (
    <motion.div ref={ref} id={id} className={className} style={style}
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
   pace this band was tuned to is ~73px/s. One half currently measures ~4277px,
   hence 60s (71px/s). Anything that changes the row's WIDTH changes that speed:
   adding or cutting marks, and equally just growing --tool-size, since the gaps
   scale with it. Both have moved it more than once — dropping nine marks at the
   old 103s left the row crawling at 42px/s. Re-measure and re-divide.
   The other constraint — one half must out-measure the widest viewport or the
   loop shows a gap — is no longer yours to police by hand. TRACK_PASSES in
   SaaSHome.jsx repeats the list enough times to clear an ultrawide whatever its
   length, which is why a five-mark list still fills this band. Width still
   moves the SPEED though, so a list edit is still a re-measure. */
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

/* ---------- Ways to give ----------
   Not a display panel with three tabs on it. The reader sets an amount and a
   plan and the schedule redraws underneath, which is the only honest way to
   answer "what is my donor actually agreeing to". Two columns: the form on the
   left, what it produces on the right.

   The rail is a 12-column grid, one column per month, and EVERY layer sits on
   that same grid so nothing needs measuring in JS:
     .saas-give__line    the full-width hairline (twelve months, unlit)
     .saas-give__span    the accent rule over the months that get charged
     .saas-give__comb    the same thing when the charges outnumber the months
                         (a weekly plan is 52 of them, a daily one 365), drawn
                         as a repeating gradient rather than as 365 DOM nodes
     .saas-give__mark    the dots, one per column, justify-self:center
   A dot is centred in its column, so the first sits at 1/24 of the width and
   the last at 23/24. The accent rule is inset by that same 1/24 at both ends
   and its scaleX is (charges - 1) / 11, NOT charges / 12. Get that wrong and
   the rule overshoots the dot it is meant to stop on.

   --p is dwell progress, written every frame by the rAF loop in SaaSHome.jsx
   and read back by the fill under the selected row. One clock, two views of
   it. The pill radii below are explicit for the same reason the square ones
   are: index.css:210 shapes every bare control on this site to --radius-btn,
   and only an element carrying its own radius class escapes it. */
.saas-give{
  --rail-months: 12;
  --mark: clamp(9px, .8vw, 11px);
  --p: 0;
  display:grid; gap:clamp(28px,3vw,44px);
  padding:clamp(24px,2.8vw,40px);
}
@media (min-width:900px){
  .saas-give{ grid-template-columns:minmax(0,290px) minmax(0,1fr); gap:clamp(40px,4.4vw,72px) }
}

/* ---- the form ---- */
/* Sentence case, no letterspacing, no uppercase micro-label. A tracked-out
   all-caps eyebrow over every block is the single most template-looking thing
   a marketing page can wear, and this section wore two of them. */
.saas-give__lbl{ font-size:13px; font-weight:500; color:rgba(var(--tenant-primary-rgb),.45) }
.saas-give__amt{ display:flex; align-items:baseline; gap:5px; width:max-content; max-width:100%;
  margin-top:6px; padding-bottom:5px;
  border-bottom:2px solid rgba(var(--tenant-accent-rgb),.32);
  transition:border-color .25s var(--ease,ease) }
.saas-give__amt:hover{ border-bottom-color:rgba(var(--tenant-accent-rgb),.6) }
.saas-give__amt:focus-within{ border-bottom-color:var(--tenant-accent,#047857) }
.saas-give__cur{ font-size:clamp(19px,1.8vw,24px); font-weight:600;
  color:rgba(var(--tenant-primary-rgb),.35) }
/* The field carries no box of its own: the rule under it is the affordance, and
   it is the one place on the page besides the primary button that wears the
   accent. Width is set inline from the value length so the rule tracks the
   number instead of sitting under empty space. */
.saas-give__amtin{ min-width:2ch; padding:0; border:0; outline:none; background:transparent;
  font:inherit; font-size:clamp(34px,3.6vw,50px); font-weight:700; line-height:1;
  letter-spacing:-.03em; color:var(--tenant-primary,#102A23);
  font-variant-numeric:tabular-nums }
.saas-give__amtin::-webkit-outer-spin-button,
.saas-give__amtin::-webkit-inner-spin-button{ -webkit-appearance:none; margin:0 }

.saas-give__opts{ margin-top:clamp(24px,2.6vw,34px) }
.saas-give__row{ position:relative; display:flex; align-items:center; justify-content:space-between;
  flex-wrap:wrap; gap:2px 12px; padding:0 2px 0 16px;
  border-top:1px solid rgba(var(--tenant-primary-rgb),.09) }
.saas-give__row:last-child{ border-bottom:1px solid rgba(var(--tenant-primary-rgb),.09) }
/* The selection marker is a rule down the left edge of the row, drawn from the
   top. No tinted panel, no chip, no tick: the row it marks is already the only
   one in ink. */
.saas-give__row::before{ content:""; position:absolute; left:0; top:-1px; bottom:0; width:2px;
  background:var(--tenant-accent,#047857); transform:scaleY(0); transform-origin:top;
  transition:transform .34s var(--ease,ease) }
.saas-give__row[data-on="true"]::before{ transform:scaleY(1) }
/* The 16px inset lives on the ROW, not here: a sub-control that wraps to a
   second line has to start on the same left edge as the label above it, and
   when the padding sat on the button the wrapped line began under the accent
   rule instead, with its first word half cut off. */
.saas-give__opt{ flex:1 1 auto; padding:14px 0; text-align:left;
  font-size:15px; font-weight:600; color:rgba(var(--tenant-primary-rgb),.5);
  transition:color .3s var(--ease,ease) }
.saas-give__row:hover .saas-give__opt,
.saas-give__row[data-on="true"] .saas-give__opt{ color:var(--tenant-primary,#102A23) }
/* The dwell clock. It only exists while the section is still demonstrating
   itself; the first time the reader touches anything it is pinned and the rule
   goes away rather than sitting there full. */
.saas-give__clock{ position:absolute; left:0; right:0; bottom:-1px; height:1px; opacity:0 }
.saas-give__row[data-on="true"] .saas-give__clock{ opacity:1 }
.saas-give__clock i{ display:block; height:100%; transform-origin:left;
  transform:scaleX(var(--p)); background:rgba(var(--tenant-accent-rgb),.5) }
.saas-give[data-pinned="true"] .saas-give__clock{ opacity:0 }

.saas-give__sub{ display:inline-flex; align-items:center; gap:6px; padding:0 0 12px;
  font-size:13px; color:rgba(var(--tenant-primary-rgb),.45) }
.saas-give__freq{ display:inline-flex; flex-wrap:wrap; gap:2px }
.saas-give__freqbtn{ padding:4px 9px; font-size:12.5px; font-weight:600;
  color:rgba(var(--tenant-primary-rgb),.45);
  transition:color .22s ease, background .22s ease }
.saas-give__freqbtn:hover{ color:var(--tenant-primary,#102A23);
  background:rgba(var(--tenant-primary-rgb),.05) }
.saas-give__freqbtn[aria-pressed="true"]{ color:#fff; background:var(--tenant-accent,#047857) }
.saas-give__stepbtn{ width:25px; height:25px; display:grid; place-items:center;
  border:1px solid rgba(var(--tenant-primary-rgb),.15); color:rgba(var(--tenant-primary-rgb),.55);
  transition:color .22s ease, border-color .22s ease }
.saas-give__stepbtn:hover:not(:disabled){ color:var(--tenant-accent,#047857);
  border-color:var(--tenant-accent,#047857) }
.saas-give__stepbtn:disabled{ opacity:.3 }
.saas-give__stepbtn svg{ width:12px; height:12px }
.saas-give__stepval{ min-width:2.2ch; text-align:center; font-size:14px; font-weight:700;
  font-variant-numeric:tabular-nums; color:var(--tenant-primary,#102A23) }

/* ---- what it produces ---- */
.saas-give__out{ display:flex; flex-direction:column; justify-content:center }
.saas-give__sum{ font-size:clamp(18px,1.6vw,22px); line-height:1.4; font-weight:600;
  letter-spacing:-.01em; color:var(--tenant-primary,#102A23) }

/* Top margin leaves room for the hover chip, which escapes upward out of the
   marks row. Cut it and the chip lands on the summary line. */
.saas-give__rail{ position:relative; margin-top:clamp(34px,3.6vw,50px) }
.saas-give__rail[data-drag="true"]{ cursor:ew-resize; touch-action:none }
.saas-give__marks{ position:relative; display:grid;
  grid-template-columns:repeat(var(--rail-months),1fr); align-items:center; height:var(--mark) }
.saas-give__line,.saas-give__span,.saas-give__comb{ position:absolute; top:50% }
.saas-give__line{ inset-inline:0; height:1px; margin-top:-.5px;
  background:rgba(var(--tenant-primary-rgb),.12) }
/* Two weights, not two colours: months with nothing on them stay a hairline,
   months with a charge get a drawn rule. At a shared 1px the accent vanished
   between the dots and the rail read as twelve unconnected marks. */
.saas-give__span{ left:calc(100% / 24); right:calc(100% / 24); height:2px; margin-top:-1px;
  transform-origin:left; background:var(--tenant-accent,#047857) }
/* --comb-gap is set inline as 100/charges percent, so the teeth thin out as the
   plan gets more frequent: twelve monthly charges are dots, fifty-two weekly
   ones are a comb, three hundred and sixty-five daily ones are very nearly a
   solid bar. The density IS the information. */
.saas-give__comb{ left:calc(100% / 24); right:calc(100% / 24); height:11px; margin-top:-5.5px;
  transform-origin:left;
  background-image:repeating-linear-gradient(90deg,
    var(--tenant-accent,#047857) 0 var(--comb-ink,1px),
    transparent var(--comb-ink,1px) var(--comb-gap,8%)) }
.saas-give__mark{ justify-self:center; width:var(--mark); height:var(--mark); border-radius:999px }
/* The "and it keeps going" arrowhead, on a plan with no end date. It hangs off
   the right edge rather than sitting in month twelve: the point is that the
   schedule leaves the picture. */
.saas-give__more{ position:absolute; top:50%; right:-3px; translate:0 -50%;
  display:flex; color:var(--tenant-accent,#047857) }
.saas-give__more svg{ width:15px; height:15px }
.saas-give__tip{ position:absolute; bottom:calc(100% + 11px); translate:-50% 0;
  padding:5px 10px; white-space:nowrap; font-size:11.5px; font-weight:600;
  color:#fff; background:var(--tenant-primary,#102A23); pointer-events:none }
/* Amounts under the dots. Twelve will not fit a phone, and they are the layer
   the rail can lose without losing its meaning: the dots and the months still
   carry the shape of the schedule. */
.saas-give__amounts,.saas-give__months{ display:grid;
  grid-template-columns:repeat(var(--rail-months),1fr); text-align:center }
.saas-give__amounts{ margin-top:11px; font-size:11px; font-weight:600;
  font-variant-numeric:tabular-nums; color:rgba(var(--tenant-primary-rgb),.5) }
@media (max-width:640px){ .saas-give__amounts{ display:none } }
.saas-give__months{ margin-top:7px; font-size:11px; font-weight:600;
  color:rgba(var(--tenant-primary-rgb),.3) }
.saas-give__months span{ transition:color .2s ease }
.saas-give__months span[data-on="true"]{ color:var(--tenant-primary,#102A23) }
.saas-give__months i{ display:none; font-style:normal }
/* 640px is where the amounts row drops out; the rail keeps its full width for
   a while after that, so the initials only take over once the names really do
   run into each other. */
@media (max-width:820px){
  .saas-give__months b{ display:none }
  .saas-give__months i{ display:inline }
}
.saas-give__foot{ margin-top:clamp(20px,2.2vw,28px); font-size:13px; line-height:1.6;
  color:rgba(var(--tenant-primary-rgb),.5) }
.saas-give__hint{ color:rgba(var(--tenant-primary-rgb),.38) }
@media (hover:none){ .saas-give__hint{ display:none } }

/* ---------- How the money reaches you ----------
   The marks reuse .saas-tool wholesale, same sizing and the same mono-ink-until-
   hovered bargain as the tool stack, so the two rows on this page cannot drift
   apart. The only thing overridden is the marquee's right margin, which a
   wrapping flex row replaces with a real gap. */
.saas-pay{ display:flex; flex-direction:column; align-items:center; text-align:center;
  gap:clamp(13px,1.5vw,18px) }
.saas-pay__row{ --tool-size:clamp(22px,1.6vw,26px);
  display:flex; flex-wrap:wrap; align-items:center; justify-content:center;
  gap:clamp(16px,2.2vw,30px); margin:0; padding:0; list-style:none }
.saas-pay__row .saas-tool{ margin-right:0 }
.saas-pay__sep{ width:1px; height:20px; background:rgba(var(--tenant-primary-rgb),.14) }
@media (max-width:520px){ .saas-pay__sep{ display:none } }
.saas-pay__foot{ max-width:66ch; font-size:13px; line-height:1.6;
  color:rgba(var(--tenant-primary-rgb),.5) }

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
