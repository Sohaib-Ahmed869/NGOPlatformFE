import React, { useRef, useEffect, useState, useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import tenantService from "../../services/tenant.service";
import platformService from "../../services/platform.service";
import {
  motion, AnimatePresence, useInView, useMotionValue, useSpring,
  useReducedMotion, useScroll, useTransform,
} from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Heart, Users, ArrowRight, Check, Sparkles,
  Shield, Palette, Target, CreditCard, Calendar, Megaphone,
  BarChart3, LifeBuoy, Quote, HandHeart, Play, Star, ChevronDown, MessageCircle,
  Rocket, TrendingUp, Camera, Mail,
} from "lucide-react";
import CtaSection from "./CtaSection";
// The Donexus mark, used as a MASK (not an <img>) so it takes the live theme
// colour instead of the baked-in green — see <DonexusMark/>.
import donexusMark from "../../assets/Donexus Logo/Donexus-268.png";

gsap.registerPlugin(ScrollTrigger);

/* ── Brand palette, driven by the platform design tokens (set in App.jsx
   PLATFORM_VARS). Neutrals stay literal; brand hues resolve to the shared
   --tenant-* vars so the whole page themes consistently. ── */
const V = {
  // surface2 = a faint wash of the brand accent (was a hardcoded mint), so the
  // alternating section bands + light fills follow the theme instead of staying green.
  bg: "var(--tenant-bg, #F3F8F5)", surface: "#FFFFFF", surface2: "rgba(var(--tenant-accent-rgb), .08)",
  line: "rgba(var(--tenant-primary-rgb), .10)", line2: "rgba(var(--tenant-primary-rgb), .05)",
  ink: "var(--tenant-primary, #102A23)", inkSoft: "#46685C", inkFaint: "#8AA89C",
  primary: "var(--tenant-accent, #047857)", primary2: "var(--pf-accent-2, #065F46)",
  // `glow` = lighter shade of the brand accent, used as the SECOND stop of the
  // theme gradient (keeps gradients single-hue / on-theme instead of accent→gold).
  glow: "var(--tenant-accent-light, #059669)",
  accent: "var(--pf-gold, #F59E0B)", accentSoft: "var(--pf-gold-soft, #FEF3C7)", accentGlow: "rgba(245,158,11,.22)",
  success: "#059669",
};
const font = "var(--font-body, 'Outfit', system-ui, sans-serif)";

/* ── Animation helpers ──
   ONE motion vocabulary for the whole page (§7.1): entrances rise 24px and fade
   in over 0.7s on the expo-out curve, lists stagger at 0.1s. Nothing scales on
   entrance. Deviating per-section is what makes a page feel assembled rather
   than designed, so these three constants are the only source of truth. ── */
const EASE = [0.22, 1, 0.36, 1]; // expo-out — mirrors --ease in the CSS
const REVEAL = 0.7;              // seconds
const RISE = 24;                 // px

const Reveal = ({ children, delay = 0, className = "", style = {} }) => {
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
};

const stagger = { visible: { transition: { staggerChildren: 0.1 } } };
const fadeUpChild = {
  hidden: { opacity: 0, y: RISE },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: REVEAL, delay: i * 0.1, ease: EASE } }),
};

const MotionLink = motion(Link);
const MagneticBtn = ({ children, className = "", style = {}, as: Tag = "a", ...props }) => {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 22 });
  const sy = useSpring(y, { stiffness: 220, damping: 22 });
  const move = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set((e.clientX - r.left - r.width / 2) * 0.16);
    y.set((e.clientY - r.top - r.height / 2) * 0.2);
  };
  const leave = () => { x.set(0); y.set(0); };
  const Component = Tag === "link" ? MotionLink : motion.a;
  return (
    <Component ref={ref} className={className} style={{ ...style, x: sx, y: sy }}
      onMouseMove={move} onMouseLeave={leave} {...props}>
      {children}
    </Component>
  );
};

/* ── Injected CSS ──
   The page follows DESIGN_GUIDELINES.md: a fluid clamp() system with three
   scale-up tiers, the asymmetric corner signature, and one shared motion
   vocabulary. The brand hues stay on the --tenant-* tokens (see `V`), so this
   layer is shape + scale + motion only, never colour. */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..700&display=swap');

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

/* Distinct, editorial display serif for headings (not the generic geometric
   sans every generated landing page ships). Body text stays as-is. */
.saas-page h1,.saas-page h2,.saas-page h3,.saas-page h4,.saas-page h5,.saas-page h6{
  font-family:'Fraunces','Outfit',Georgia,serif !important;
  letter-spacing:-0.015em;
}
/* Display headings run at 500, NOT Tailwind's font-bold: Fraunces is already a
   high-contrast serif, so 700 at 40–80px reads as a slab. Small headings
   (h3–h6, card + list titles) keep their own weights — they need the density. */
.saas-page h1,.saas-page h2{font-weight:500 !important}

/* ---------- The corner signature (§2.3) ----------
   Three round corners and one tight corner at the BOTTOM-RIGHT. Applied by
   mapping Tailwind's radius utilities, so the shape lands everywhere without
   editing every element. Specificity (0,2,0) beats Tailwind's (0,1,0) — no
   !important needed.
   rounded-full is deliberately exempt: avatars, status dots, progress bars and
   the billing toggle are genuinely circular and the asymmetry would read as a
   rendering bug. */
.saas-page [class*="rounded-2xl"],
.saas-page [class*="rounded-3xl"]{ border-radius:16px 16px 4px 16px }
.saas-page [class*="rounded-xl"]{ border-radius:12px 12px 3px 12px }
.saas-page [class*="rounded-lg"],
.saas-page [class*="rounded-md"]{ border-radius:8px 8px 2px 8px }
/* Interactive surfaces use the em form so the corner scales with the button's
   own (fluid) font-size instead of drifting square at large sizes. */
.saas-page a[class*="rounded-"]:not([class*="rounded-full"]),
.saas-page button[class*="rounded-"]:not([class*="rounded-full"]),
.saas-page .saas-chip{ border-radius:.55em .55em .11em .55em }

/* ---------- Hero atmosphere ----------
   The hero used to sit on a photograph. It now sits on light: the only texture
   is a dot field masked to a soft ellipse so it dissolves long before it
   reaches an edge, read over the gradient blooms framer-motion drifts behind
   it. No keyframes here — that motion is owned by the component (§7.7), so it
   can stop dead when the visitor prefers reduced motion. */
.saas-hero-dots{
  background-image:radial-gradient(rgba(var(--tenant-primary-rgb),.20) 1px,transparent 1px);
  background-size:28px 28px;
  -webkit-mask-image:radial-gradient(ellipse 58% 54% at 50% 40%,#000 0%,rgba(0,0,0,.34) 56%,transparent 82%);
  mask-image:radial-gradient(ellipse 58% 54% at 50% 40%,#000 0%,rgba(0,0,0,.34) 56%,transparent 82%);
}

/* ---------- The sky glow ----------
   Ported from the Think Studio hero (.home:before): wide, SHALLOW ellipses
   NOTE: this whole css block is a JS template literal, so a stray backtick or
   a dollar-brace in a comment here is a build error, not a typo.
   anchored ABOVE the top edge, so the section is lit from off-screen and only
   the lower falloff is ever visible. Three radii stacked — a tight bright core,
   an off-centre one at 20% to break the symmetry, and a huge soft wash that
   reaches the corners on wide screens.

   The eight stops per gradient are the entire trick and must not be collapsed
   to two: at 1350px across, a two-stop radial bands into visible rings, and the
   hand-stepped alpha ramp is what makes this read as LIGHT rather than as a
   coloured shape. The reference runs bright teal on near-black; the alphas here
   are re-tuned roughly 3× down because our ground is off-white — anything near
   the original strength turns the top of the page into a solid mint slab.
   Everything resolves through --tenant-*-rgb, so it recolours with the brand. */
.saas-hero-glow{
  background:
    radial-gradient(1350px 520px at 50% -70px,
      rgba(var(--tenant-accent-rgb),.22) 0%,  rgba(var(--tenant-accent-rgb),.165) 12%,
      rgba(var(--tenant-accent-rgb),.11) 26%, rgba(var(--tenant-accent-rgb),.07) 40%,
      rgba(var(--tenant-accent-rgb),.042) 55%,rgba(var(--tenant-accent-rgb),.02) 70%,
      rgba(var(--tenant-accent-rgb),.008) 85%,rgba(var(--tenant-accent-rgb),0) 100%),
    radial-gradient(1100px 460px at 20% -60px,
      rgba(var(--tenant-accent-rgb),.115) 0%, rgba(var(--tenant-accent-rgb),.075) 22%,
      rgba(var(--tenant-accent-rgb),.046) 44%,rgba(var(--tenant-accent-rgb),.024) 64%,
      rgba(var(--tenant-accent-rgb),.01) 82%, rgba(var(--tenant-accent-rgb),0) 100%),
    radial-gradient(2100px 980px at 50% -240px,
      rgba(var(--tenant-primary-rgb),.085) 0%,rgba(var(--tenant-primary-rgb),.06) 20%,
      rgba(var(--tenant-primary-rgb),.04) 40%,rgba(var(--tenant-primary-rgb),.022) 60%,
      rgba(var(--tenant-primary-rgb),.009) 78%,rgba(var(--tenant-primary-rgb),0) 92%),
    /* the fourth layer rises from BELOW, so the stat band sits on a horizon
       instead of on a hard edge — the reference does the same at page scale */
    radial-gradient(1800px 920px at 50% calc(100% + 260px),
      rgba(var(--tenant-accent-rgb),.10) 0%,  rgba(var(--tenant-accent-rgb),.055) 34%,
      rgba(var(--tenant-accent-rgb),.02) 62%, rgba(var(--tenant-accent-rgb),0) 88%);
}
/* ---------- Descender room for the two masked headline lines ----------
   saas-h1 runs line-height 1.03, which is TIGHTER than Fraunces' own glyph box,
   so every descender pokes out below the box it lives in before any of our CSS
   gets involved. Measured from the shipped font (unitsPerEm 2000): the deepest
   lowercase is g at yMin -0.246em, win ascent/descent 1.170/0.3045em, giving a
   baseline 0.948em down and a g bottom at 1.194em — i.e. 0.164em BELOW a 1.03em
   box. That 0.164em is the number every value here has to clear.

   It gets clipped in two independent places, and both need the room:
     1. .saas-hero-mask — the roll mask. overflow:hidden clips at the padding box.
     2. .saas-hero-ink  — background-clip:text. Blink only paints the gradient
        inside the span's OWN border box; glyph ink below that box receives no
        paint and, since the text is color:transparent, renders as nothing.
   Fixing only #1 is why the g stayed shaved while the p and y on line one looked
   fine — line one is solid-coloured text and never hits #2 at all. If gradient
   text ever loses its descenders again, this is the one to check.

   --clip is the shared knob; each box hands the space straight back with an
   equal negative margin, so neither affects layout and generous is free. */
.saas-hero-mask{
  --clip:.34em;
  overflow:hidden;
  padding-bottom:var(--clip);
  margin-bottom:calc(-1 * var(--clip));
}
.saas-hero-ink{ padding-bottom:var(--clip); margin-bottom:calc(-1 * var(--clip)) }
@media (max-width:430px){ .saas-hero-rotate{ font-size:.86em } }
.saas-card{transition:transform .4s ease,border-color .4s ease,box-shadow .4s ease}
.saas-card:hover{transform:translateY(-4px);border-color:rgba(var(--tenant-accent-rgb),.28);box-shadow:0 18px 40px -16px rgba(var(--tenant-accent-rgb),.22)}
.saas-btn-primary{position:relative;overflow:hidden}
.saas-btn-primary::before{content:"";position:absolute;inset:0;
  background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.45) 50%,transparent 65%);
  transform:translateX(-120%);transition:transform 1s cubic-bezier(.2,.8,.2,1);pointer-events:none}
.saas-btn-primary:hover::before{transform:translateX(120%)}
.saas-step{transition:transform .4s ease,box-shadow .4s ease}
.saas-step:hover{transform:translateY(-4px);box-shadow:0 18px 40px -16px rgba(var(--tenant-accent-rgb),.2)}
.saas-faq2{transition:transform .35s ease,box-shadow .35s ease,border-color .35s ease,background .35s ease}
.saas-faq2:hover{transform:translateY(-2px)}
.saas-cta-ghost{transition:background .3s ease,border-color .3s ease,transform .3s ease}
.saas-cta-ghost:hover{background:rgba(255,255,255,.22)!important;border-color:rgba(255,255,255,.55)!important;transform:translateY(-2px)}
.saas-ic{transition:transform .35s ease,background .35s ease,color .35s ease,border-color .35s ease}
.saas-card:hover .saas-ic{transform:rotate(-6deg) scale(1.08);background:linear-gradient(150deg,var(--tenant-accent,#047857),var(--tenant-accent-light,#059669));color:#fff;border-color:transparent}
.saas-topline{transform:scaleX(0);transform-origin:left;transition:transform .55s cubic-bezier(.2,.8,.2,1)}
.saas-card:hover .saas-topline,.saas-step:hover .saas-topline{transform:scaleX(1)}
@keyframes saas-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.saas-marquee{animation:saas-marquee 40s linear infinite}
.saas-marquee:hover{animation-play-state:paused}

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
/* ---------- How it works — the road ----------
   Steps alternate sides so the route zigzags across the full measure without
   ever becoming a horizontal row.

   --lane is where the carriageway runs, measured from the card's own left edge
   — INSIDE the card, not in a gutter beside it. The card's opaque surface is
   what hides the road along its length, so the route enters under the numbered
   marker and re-emerges below the card. The rail is over-extended past both
   ends of the card (--approach) so a stub of road is visible going in and
   coming out; without it the road would appear to start and stop at the card
   edges rather than pass beneath. */
.saas-ribbon{
  --lane: 54px;
  --approach: 30px;
  position:relative; max-width:1040px; margin-inline:auto;
  margin-top:clamp(44px,5vw,76px);
}
.saas-ribbon__svg{ position:absolute; left:0; top:0; pointer-events:none; overflow:visible }
.saas-ribbon__rows{
  position:relative; display:flex; flex-direction:column;
  gap:clamp(64px,7vw,116px); list-style:none; padding:0; margin:0;
}
.saas-ribbon__row{ display:grid; grid-template-columns:minmax(0,1fr) }
@media (min-width:880px){
  .saas-ribbon__row{ grid-template-columns:minmax(0,1fr) minmax(0,1fr); column-gap:clamp(40px,6vw,96px) }
  .saas-ribbon__row--l .saas-ribbon__cell{ grid-column:1 }
  .saas-ribbon__row--r .saas-ribbon__cell{ grid-column:2 }
}
.saas-ribbon__cell{ position:relative }
/* Zero-width probe the path is measured from.
   top:0 is the card's top edge, which is exactly where the numbered marker is
   centred — the road has to ARRIVE at the marker. Overhanging the top by
   --approach as well left the path ending 30px short of the last dot, with the
   marker floating off the end of the road. Only the foot overhangs, so the
   road re-emerges below the card. */
.saas-ribbon__rail{
  position:absolute; width:0; left:var(--lane);
  top:0; bottom:calc(-1 * var(--approach));
}
/* Sits ON the lane, straddling the card's top edge: the marker for where the
   road goes under. z-index clears the card; the card's top padding is what
   keeps the title from colliding with it. */
.saas-ribbon__dot{
  position:absolute; z-index:1;
  left:calc(var(--lane) - 23px); top:-23px;
  display:grid; place-items:center;
  width:46px; height:46px; border-radius:50%;
  font-size:15px; font-weight:700; color:#fff;
  background:linear-gradient(150deg, var(--tenant-accent-light,#059669), var(--pf-accent-2,#065F46));
  box-shadow:0 0 0 5px rgba(var(--tenant-accent-rgb),.12), 0 10px 22px -10px rgba(6,40,30,.5);
}
.saas-ribbon__body{
  background:#fff;
  border:1px solid rgba(var(--tenant-primary-rgb),.10);
  /* radius comes from the rounded-2xl class in the JSX so the card picks up the
     shared corner signature — declaring it here would lose to that rule anyway
     (specificity 0,2,0 beats 0,1,0) and only look like it worked. */
  padding:clamp(30px,3vw,38px) clamp(22px,2.4vw,32px) clamp(22px,2.4vw,30px);
  box-shadow:0 30px 70px -40px rgba(6,40,30,.34);
  transition:transform .5s var(--ease), box-shadow .5s var(--ease);
}
.saas-ribbon__body:hover{
  transform:translateY(-3px);
  box-shadow:0 38px 84px -40px rgba(6,40,30,.4);
}
/* Inset panel rather than a hairline rule: it gives the product shot a surface
   of its own, so a card reads as copy PLUS a screenshot instead of one column
   of mixed content. */
.saas-ribbon__visual{
  display:flex; justify-content:center; align-items:center;
  margin-top:clamp(18px,2.2vw,26px); padding:clamp(16px,2vw,22px);
  min-height:104px;
  border-radius:14px 14px 4px 14px;
  background:var(--tenant-bg,#F3F8F5);
  border:1px solid rgba(var(--tenant-primary-rgb),.07);
}

.saas-rosette-col{ container-type: inline-size }
.saas-rosette{
  /* The ring must clear a whole NODE, not just the label: the node box is
     ~100px tall (44px icon + gap + up to two text lines) and is centred on the
     orbit, so its inner edge sits ~50px inside --orbit. --pad therefore has to
     beat 50px minus the 6% slack between the element box and the drawn circle
     (r=94 of 100). The old 34px floor lost that race below ~1300px and the ring
     sliced through the 6-o'clock icon and the diagonal labels. */
  --ring: clamp(176px, 44cqw, 300px);
  --pad: clamp(50px, 9.5cqw, 64px);
  --orbit: calc(var(--ring) / 2 + var(--pad));
  --label-w: clamp(112px, 25cqw, 150px);
  position:relative; width:100%;
  /* 150, not 112: the 12- and 6-o'clock labels now sit on the far side of
     their icons, so the stage has to reach a whole node past the orbit. */
  height:calc(var(--orbit) * 2 + 150px);
}
.saas-rosette-ring{
  position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
  width:var(--ring); height:var(--ring); overflow:visible; pointer-events:none;
}
/* .46, down from .52, and the halo behind it is gone. The mark is eight
   interlocking ribbons — at hub scale it is the single busiest object on the
   screen, and a bloom behind it only smeared the gaps between the loops. Let it
   be small and crisp; the ring and labels carry the structure. */
.saas-rosette-hub{
  position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
  width:calc(var(--ring) * .46); height:calc(var(--ring) * .46);
  display:grid; place-items:center; pointer-events:none;
}
.saas-rosette-mark{position:relative}
.saas-rosette-node{
  position:absolute; left:50%; top:50%;
  width:var(--label-w); display:flex; flex-direction:column; align-items:center; gap:9px;
  text-align:center; background:none; border:0; padding:0; cursor:pointer;
}
.saas-rosette-ic{
  display:grid; place-items:center; width:44px; height:44px; border-radius:50%;
  transition:background .4s var(--ease), color .4s var(--ease),
    box-shadow .4s var(--ease), transform .4s var(--ease);
}
/* Hovering an unselected feature previews its chrome — the only hint that the
   bare glyphs are clickable now that they carry no outline of their own. */
.saas-rosette-node:hover .saas-rosette-ic{
  transform:translateY(-2px); background:rgba(var(--tenant-accent-rgb),.10);
}
/* The unselected labels are DIMMED, not faint: --inkFaint (#8AA89C) sits at
   2.40:1 on the page background, and these are interactive tab labels, not
   decoration. --inkSoft clears AA at 5.76:1 (§10). */
.saas-rosette-label{
  font-size:13.5px; line-height:1.3; letter-spacing:-.01em;
  transition:color .4s var(--ease), font-weight .4s var(--ease);
}
/* Keyboard users get the focus ring; the mouse path stays clean (§10). */
.saas-rosette-node:focus-visible{outline:none}
.saas-rosette-node:focus-visible .saas-rosette-ic{
  outline:2px solid var(--tenant-accent,#047857); outline-offset:3px;
}
@media (prefers-reduced-motion:reduce){
  .saas-rosette-ic,.saas-rosette-label,.saas-rosette-mark{transition:none}
}
/* Charity logo wall — two rows scrolling in opposite directions. Each track
   holds two halves and every half repeats the row twice, so one half always
   overflows the viewport and the -50% loop never shows a gap (§ same trick as
   .saas-marquee above, but per-row so the two directions stay independent). */
@keyframes saas-logorow-l{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes saas-logorow-r{from{transform:translateX(-50%)}to{transform:translateX(0)}}
.saas-logorow{position:relative;overflow:hidden;
  -webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);
  mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.saas-logotrack{display:flex;width:max-content;align-items:center;will-change:transform}
.saas-logotrack--l{animation:saas-logorow-l 42s linear infinite}
.saas-logotrack--r{animation:saas-logorow-r 52s linear infinite}
/* Deliberately NO hover pause. Scrolling with a wheel or trackpad leaves the
   cursor parked mid-viewport, so the row drifting past it would stop dead at
   exactly the moment you scrolled onto the section — which reads as a stuck,
   broken band rather than a considerate pause. The rows never stop. */
.saas-logoitem{flex:none;display:flex;align-items:center;margin-right:var(--logo-gap)}
/* Logos ship at their own aspect ratios, so a single row height makes stacked
   marks (WWF, Oxfam) read far smaller than wordmarks. --logo-scale is the
   per-logo correction that keeps optical weight even across the row. */
.saas-logoimg{height:calc(var(--logo-h) * var(--logo-scale,1));width:auto;max-width:none;
  object-fit:contain;opacity:.66;transition:opacity .3s ease,transform .3s cubic-bezier(.22,1,.36,1)}
.saas-logoitem:hover .saas-logoimg{opacity:1;transform:scale(1.05)}
/* No reduced-motion rule here on purpose — the page-wide reset at §7.7 already
   neutralises every animation with !important, so anything set here is dead. */
@keyframes saas-prog-shine{0%{transform:translateX(-130%)}55%,100%{transform:translateX(420%)}}
.saas-prog-shine{animation:saas-prog-shine 2.8s ease-in-out infinite}
@keyframes saas-pulse-ring{0%{transform:scale(.85);opacity:.55}80%{opacity:0}100%{transform:scale(2);opacity:0}}
.saas-pulse-ring{animation:saas-pulse-ring 2.1s ease-out infinite}
@keyframes saas-pop-in{0%{transform:scale(0) rotate(-30deg);opacity:0}60%{transform:scale(1.15) rotate(0)}100%{transform:scale(1);opacity:1}}


/* ---------- Reduced motion (§7.7) ----------
   Two levels now that the scroll-lock is gone: CSS motion is neutralised here,
   and JS-driven motion checks useReducedMotion() and never subscribes. */
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}
}
`;

/* ── Friendly section badge — carries the corner signature via .saas-chip ── */
const Badge = ({ icon: Icon, children, center }) => (
  <span className={`saas-chip inline-flex items-center gap-2 px-3.5 py-1.5 text-[13px] font-medium ${center ? "mx-auto" : ""}`}
    style={{ background: V.surface, border: `1px solid ${V.line}`, color: V.primary, boxShadow: "0 1px 2px rgba(6,40,30,.04)" }}>
    {Icon && <Icon className="w-3.5 h-3.5" />}
    {children}
  </span>
);

/* ── The standard section head: eyebrow → h2 → lede (§5.1).
   `id` is required rather than optional — every section labels itself with
   aria-labelledby pointing at this h2, so a screen reader announces the section
   by its real heading instead of "region". ── */
const SectionHead = ({ id, badge, badgeIcon, title, subtitle, center }) => (
  <Reveal className={`mb-[clamp(36px,4.4vw,64px)] max-w-[680px] ${center ? "mx-auto text-center" : ""}`}>
    {badge && <Badge icon={badgeIcon} center={center}>{badge}</Badge>}
    <h2 id={id} className="saas-h2 mt-5 font-bold"
      style={{ color: V.ink }} dangerouslySetInnerHTML={{ __html: title }} />
    {subtitle && (
      <p className={`saas-lede mt-4 ${center ? "mx-auto" : ""}`} style={{ color: V.inkSoft }}>{subtitle}</p>
    )}
  </Reveal>
);

/* ── Animated single-open FAQ accordion ── */
function FaqItem({ faq, index, isOpen, onToggle }) {
  return (
    <Reveal delay={index * 0.05}>
      <div
        className="saas-faq2 relative overflow-hidden rounded-2xl"
        style={{
          background: isOpen ? `linear-gradient(180deg, rgba(var(--tenant-accent-rgb),.06), ${V.surface})` : V.surface,
          border: `1px solid ${isOpen ? "rgba(var(--tenant-accent-rgb),.35)" : V.line}`,
          boxShadow: isOpen ? "0 20px 44px -22px rgba(var(--tenant-accent-rgb),.4)" : "none",
        }}
      >
        {/* accent rail that appears when the item is open */}
        {isOpen && (
          <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]"
            style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.glow})` }} />
        )}
        <button onClick={onToggle} aria-expanded={isOpen}
          className="flex w-full items-center gap-4 px-6 py-5 text-left">
          <span className="font-mono text-[12px] font-bold tabular-nums transition-colors"
            style={{ color: isOpen ? V.primary : V.inkFaint }}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="flex-1 text-[16px] font-semibold leading-snug transition-colors"
            style={{ color: isOpen ? V.primary : V.ink }}>
            {faq.q}
          </span>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full transition-all duration-300"
            style={{
              background: isOpen ? V.primary : V.surface2,
              color: isOpen ? "#fff" : V.primary,
              border: `1px solid ${isOpen ? "transparent" : V.line}`,
              transform: isOpen ? "rotate(180deg)" : "none",
            }}>
            <ChevronDown className="h-4 w-4" />
          </span>
        </button>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.2, 0.7, 0.2, 1] }}
              style={{ overflow: "hidden" }}>
              <p className="px-6 pb-6 pl-[3.4rem] text-[14.5px] leading-relaxed" style={{ color: V.inkSoft }}>
                {faq.a}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reveal>
  );
}

function FaqList({ faqs }) {
  const [open, setOpen] = useState(0); // first item open by default
  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => (
        <FaqItem key={faq.q} faq={faq} index={i} isOpen={open === i}
          onToggle={() => setOpen((cur) => (cur === i ? -1 : i))} />
      ))}
    </div>
  );
}

/* ── Testimonial avatar with a graceful initials fallback if the image 404s ── */
function ReviewAvatar({ t }) {
  const [err, setErr] = useState(false);
  if (t.img && !err) {
    return (
      <img src={t.img} alt={t.author} loading="lazy" onError={() => setErr(true)}
        className="h-11 w-11 shrink-0 rounded-full object-cover" style={{ border: `2px solid ${V.surface}`, boxShadow: `0 0 0 1px ${V.line}` }} />
    );
  }
  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[13px] font-bold text-white"
      style={{ background: `linear-gradient(140deg, ${V.primary}, ${V.primary2})` }}>{t.initials}</div>
  );
}

/* ── A single testimonial card (fixed width for the marquee carousel). ── */
function ReviewCard({ t }) {
  return (
    <article className="saas-card relative mr-5 flex w-[340px] shrink-0 flex-col overflow-hidden p-8 sm:w-[400px]"
      style={{ background: V.surface, border: `1px solid ${V.line}` }}>
      <span aria-hidden className="saas-topline pointer-events-none absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${V.primary}, ${V.glow})` }} />
      {/* oversized faint quotation glyph for editorial depth */}
      <Quote aria-hidden className="pointer-events-none absolute right-3 top-5 h-24 w-24" style={{ color: V.accent, opacity: 0.08 }} />
      <div className="relative flex items-center justify-between">
        <Quote className="h-7 w-7" style={{ color: V.accent }} />
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, s) => (
            <Star key={s} className="h-4 w-4" style={{ color: V.accent, fill: V.accent }} />
          ))}
        </div>
      </div>
      {/* The quote is the hero — set large in the editorial serif. */}
      <blockquote className="relative mt-5 flex-1 text-[20px] font-medium leading-[1.42] tracking-[-0.01em]"
        style={{ color: V.ink, fontFamily: "'Fraunces', Georgia, serif" }}>
        {t.quote}
      </blockquote>
      <div className="mt-7 flex items-center gap-3 pt-5" style={{ borderTop: `1px solid ${V.line}` }}>
        <ReviewAvatar t={t} />
        <div className="min-w-0">
          <div className="text-[14px] font-semibold" style={{ color: V.ink }}>{t.author}</div>
          <div className="text-[12.5px]" style={{ color: V.inkFaint }}>{t.role}</div>
        </div>
      </div>
    </article>
  );
}

/* ── Data ── */

/* Hero stats come from GET /api/platform/stats — real cross-tenant totals, not
   the four invented figures this used to ship. `format` turns a raw count into
   the {to, prefix, suffix, decimals} the <Counter/> rolls, picking the unit from
   the magnitude so 940 reads "940" and 1_240_000 reads "$1.2M".

   Nothing here substitutes a placeholder when a figure is zero: the band drops
   any stat that has no real value and hides itself entirely below two of them
   (see <HeroStats/>). An empty platform showing "$0 raised" would be worse than
   showing nothing, and inventing a number is what we're moving away from. */
const heroStats = [
  { key: "raised", label: "Raised for good causes", money: true },
  { key: "charities", label: "Charities on the platform", plus: true },
  { key: "donors", label: "Donors reached", plus: true },
  { key: "countries", label: "Countries served" },
];

// n → the Counter's props. `plus` only appends "+" once the figure is big
// enough for rounding to have lost something — "7+ charities" is just odd.
function formatStat(n, { money, plus }) {
  const prefix = money ? "$" : "";
  if (n >= 1_000_000) return { to: n / 1_000_000, prefix, suffix: "M+", decimals: 1 };
  if (n >= 10_000) return { to: Math.round(n / 1000), prefix, suffix: "K+" };
  if (n >= 1000 && money) return { to: Math.round(n / 1000), prefix, suffix: "K+" };
  return { to: n, prefix, suffix: plus && n >= 25 ? "+" : "" };
}

const features = [
  { icon: CreditCard, kind: "donations", title: "Simple donations", desc: "Accept one-time, monthly and instalment gifts. Receipts and thank-you emails are sent automatically. No spreadsheets." },
  { icon: Users, kind: "donors", title: "Know your donors", desc: "Every supporter in one place: giving history, contact details and the causes closest to their heart." },
  { icon: Palette, kind: "brand", title: "Your brand, your portal", desc: "Your own web address, your logo and your colours. Donors see your charity, never us." },
  { icon: Target, kind: "campaigns", title: "Campaigns that inspire", desc: "Set a goal, watch the progress bar fill, and share updates that keep supporters connected to the impact." },
  { icon: Calendar, kind: "events", title: "Events & volunteers", desc: "Run fundraisers and drives, manage sign-ups and coordinate your volunteer team with ease." },
  { icon: BarChart3, kind: "insights", title: "Clear insights", desc: "See what's working at a glance: donations over time, recurring supporters and campaign results." },
];

const steps = [
  { n: "1", title: "Create your charity space", desc: "Pick a plan, choose your web address and set up your admin account. You'll be ready in a few minutes." },
  { n: "2", title: "Make it yours", desc: "Add your logo, choose your colours and launch your first campaign. No design or tech skills needed." },
  { n: "3", title: "Start receiving gifts", desc: "Share your page. Donations arrive securely, receipts go out automatically, and supporters stay updated." },
];


// `img` is a dummy avatar (pravatar) with a graceful initials fallback if it
// fails to load — see <ReviewAvatar/>.
const testimonials = [
  { quote: "We moved off spreadsheets and our monthly donations grew by 40% in the first quarter. Supporters love how easy giving has become.", author: "Sarah Mitchell", role: "Director · Hope Bridge", initials: "SM", img: "https://i.pravatar.cc/120?img=47" },
  { quote: "Our donors finally see our charity, not a generic payment page. That trust shows up in every campaign we run.", author: "Ahmed Al-Rahman", role: "Operations · Mercy Global", initials: "AR", img: "https://i.pravatar.cc/120?img=12" },
  { quote: "Sharing campaign updates keeps people connected to the cause. Supporter retention has never been higher.", author: "Maria Santos", role: "Fundraising · Bright Future", initials: "MS", img: "https://i.pravatar.cc/120?img=45" },
  { quote: "Onboarding took an afternoon. By the next morning we'd taken our first online gift. No developers required.", author: "James Okonkwo", role: "CEO · Atlas Aid", initials: "JO", img: "https://i.pravatar.cc/120?img=15" },
  { quote: "Recurring giving used to be a nightmare to manage. Now it just runs, and our reporting is finally clean.", author: "Priya Nair", role: "Programs · GiveWell Local", initials: "PN", img: "https://i.pravatar.cc/120?img=32" },
  { quote: "Our volunteers coordinate events in one place: sign-ups, reminders and attendance, all handled.", author: "Tom Becker", role: "Comms · Ocean Relief", initials: "TB", img: "https://i.pravatar.cc/120?img=51" },
  { quote: "Gift Aid and annual statements that used to eat a week now take minutes. It's given us our time back.", author: "Eleanor Whitcombe", role: "Trustee · Thames Relief", initials: "EW", img: "https://i.pravatar.cc/120?img=20" },
  { quote: "The branded portal made us look like a national charity overnight. Donors keep telling us how professional it feels.", author: "Daniel Okafor", role: "Volunteer Lead · Shelter First", initials: "DO", img: "https://i.pravatar.cc/120?img=33" },
];

const pricingPlans = [
  { tier: "Basic", desc: "For small charities getting started.", priceNum: 200, annualNum: 160, annualTotal: 1920, features: ["Up to 3 campaigns", "Donation processing", "Donor management", "Your branded portal", "Admin dashboard"] },
  { tier: "Professional", desc: "For growing charities running active appeals.", priceNum: 500, annualNum: 400, annualTotal: 4800, popular: true, features: ["Up to 5 campaigns", "Everything in Basic", "Up to 10 volunteers", "Campaign updates", "Event management"] },
  { tier: "Enterprise", desc: "For established charities operating at scale.", priceNum: 1000, annualNum: 800, annualTotal: 9600, features: ["Unlimited campaigns", "Everything in Professional", "Unlimited volunteers", "Priority support", "Tailored onboarding"] },
];

// Live (SuperAdmin-managed) plan → the home pricing-card shape.
const mapHomePlan = (p) => ({
  code: p.code,
  tier: p.name,
  desc: p.description || "",
  priceNum: p.price?.monthly || 0,
  annualTotal: p.price?.annual || 0,
  annualNum: Math.round((p.price?.annual || 0) / 12),
  popular: !!p.isPopular,
  features: Array.isArray(p.features) ? p.features : [],
});

const faqs = [
  { q: "Can I change my plan later?", a: "Yes. You can upgrade or downgrade at any time from your dashboard. Changes take effect on your next billing date." },
  { q: "How do my donors pay?", a: "Supporters can give by credit or debit card, Apple Pay, Google Pay and PayPal, all handled securely through Stripe." },
  { q: "Do you take a cut of donations?", a: "No. We never charge a platform fee on donations. You only pay the standard Stripe processing fee, so more of every gift reaches your cause." },
  { q: "Is my donor data safe?", a: "Absolutely. Each charity's data is fully isolated, encrypted in transit and at rest, with role-based access and audit logs." },
  { q: "Do I need technical skills?", a: "Not at all. Setting up your portal, branding and campaigns is done through simple forms, and most charities are live within minutes." },
];

/* ── Charity logo wall ──
   Well-known Australian charities, shown as sector context — NOT as customers.
   See the section's caption: it says so in plain words, and it needs to keep
   saying so until these are replaced by real tenants who've agreed to appear.
   `scale` normalises OPTICAL AREA, not height. Sizing every logo to one row
   height looks wrong here: these marks run from 0.67:1 (the stacked WWF panda)
   to 6.2:1 (the Vinnies lockup), so equal heights make the wide wordmarks carry
   ~4x the ink of the stacked ones. Each scale is sqrt(target area / (h² · ratio))
   damped to the 0.62 power — full normalisation would push the stacked marks
   past 2x the row height — then clamped to 1.42 so nothing breaks the band. ── */
const charityLogos = [
  [ // row one — scrolls left
    { name: "Australian Red Cross", file: "red-cross.svg", scale: 1.07 },
    { name: "UNICEF Australia", file: "unicef.svg", scale: 0.9 },
    { name: "The Salvation Army", file: "salvation-army.svg", scale: 1.42 },
    { name: "Cancer Council Australia", file: "cancer-council.svg", scale: 1.08 },
    { name: "World Vision Australia", file: "world-vision.svg", scale: 0.86 },
    { name: "Oxfam Australia", file: "oxfam.svg", scale: 1.42 },
    { name: "Beyond Blue", file: "beyond-blue.png", scale: 1.03 },
    { name: "Save the Children Australia", file: "save-the-children.png", scale: 0.85 },
  ],
  [ // row two — scrolls right
    { name: "The Smith Family", file: "smith-family.svg", scale: 1.11 },
    { name: "RSPCA Australia", file: "rspca.svg", scale: 0.98 },
    { name: "WWF-Australia", file: "wwf.svg", scale: 1.42 },
    { name: "Lifeline Australia", file: "lifeline.svg", scale: 0.87 },
    { name: "St Vincent de Paul Society", file: "vinnies.png", scale: 0.8 },
    { name: "Royal Flying Doctor Service", file: "rfds.png", scale: 0.97 },
    { name: "The Fred Hollows Foundation", file: "fred-hollows.svg", scale: 0.88 },
  ],
];
const initialsOf = (name) => name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/* ── GSAP count-up — rolls a number from 0 → `to` the first time it scrolls
   into view, with thousands separators and an optional prefix/suffix. ── */
function Counter({ to, decimals = 0, prefix = "", suffix = "", duration = 1.8, className = "", style = {} }) {
  const ref = useRef(null);
  const started = useRef(false);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const fmt = (n) =>
    prefix + n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    const node = ref.current;
    const obj = { v: 0 };
    const tween = gsap.to(obj, {
      v: to, duration, ease: "power2.out",
      onUpdate: () => { if (node) node.textContent = fmt(obj.v); },
    });
    return () => tween.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, to]);

  return <span ref={ref} className={className} style={style}>{fmt(0)}</span>;
}

/* ── The headline's rotating last line. Each phrase rolls up out of the clipped
   box while the previous one rolls out the top (AnimatePresence mode="wait", so
   only one is ever mounted). An invisible twin of the LONGEST phrase sits in the
   same grid cell and holds the width — without it the centred headline would
   twitch wider and narrower on every swap. The rotation is decorative: the <h1>
   carries a static aria-label, so this whole span is aria-hidden. ── */
function RotatingPhrase({ phrases }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const widest = phrases.reduce((a, b) => (b.length > a.length ? b : a), "");

  useEffect(() => {
    if (reduce) return undefined; // frozen on the first phrase — no timer at all
    const id = setInterval(() => setI((v) => (v + 1) % phrases.length), 2800);
    return () => clearInterval(id);
  }, [reduce, phrases.length]);

  return (
    <span aria-hidden className="saas-hero-mask saas-hero-rotate relative inline-grid align-bottom">
      <span className="invisible col-start-1 row-start-1 whitespace-nowrap">{widest}</span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={phrases[i]}
          className="saas-hero-ink col-start-1 row-start-1 whitespace-nowrap bg-clip-text text-transparent"
          style={{ backgroundImage: "linear-gradient(100deg, var(--tenant-accent-light, #059669) 0%, var(--tenant-accent, #047857) 58%, var(--pf-accent-2, #065F46) 100%)" }}
          initial={reduce ? { opacity: 0 } : { y: "108%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: "-108%", opacity: 0 }}
          transition={{ duration: reduce ? 0.2 : 0.62, ease: EASE }}
        >
          {phrases[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* ── Hero — a light, editorial opening.
   The photographic wash is gone. Depth now comes from three slow-drifting
   gradient blooms and a masked dot field, all framer-motion driven and all
   built from the platform tokens, so the hero recolours with the brand instead
   of being pinned to one stock photo. The headline rises word by word from
   behind a mask and its closing line rotates through four promises; the stat
   band still anchors the bottom edge, now as hairline-on-light. Everything
   stops under prefers-reduced-motion, and the section keeps `data-hero` so the
   navbar collapse still measures against it. ── */
const heroPhrases = ["do more good.", "raise more funds.", "reach more donors.", "grow with ease."];
const heroWords = ["Help", "your", "charity"];

// Ambient blooms: position, tint and their own drift. Kept on the accent token
// (single-hue, per the gradient rule in `V`) at low alpha so text stays legible.
// These are deliberately WEAKER than the static .saas-hero-glow behind them —
// the glow is the composition, the blooms only keep it from sitting still. Push
// these alphas back up and the two layers stack into a muddy green field.
const heroBlooms = [
  {
    box: "left-[-16%] top-[-20%] h-[min(62vw,760px)] w-[min(62vw,760px)]",
    tint: "rgba(var(--tenant-accent-rgb),.13)", duration: 26,
    drift: { x: [0, 70, -26, 0], y: [0, 44, -18, 0], scale: [1, 1.1, 0.95, 1] },
  },
  {
    box: "right-[-18%] top-[4%] h-[min(54vw,660px)] w-[min(54vw,660px)]",
    tint: "rgba(var(--tenant-primary-rgb),.11)", duration: 34,
    drift: { x: [0, -62, 24, 0], y: [0, 30, -36, 0], scale: [1, 1.14, 0.97, 1] },
  },
  {
    box: "bottom-[-26%] left-[24%] h-[min(46vw,580px)] w-[min(46vw,580px)]",
    tint: "rgba(var(--tenant-accent-rgb),.10)", duration: 30,
    drift: { x: [0, 40, -44, 0], y: [0, -26, 16, 0], scale: [1, 1.08, 1.02, 1] },
  },
];

function HeroSection() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  // Restrained parallax: the content drifts down a little and dissolves as the
  // section leaves, the blooms rise against it. Flat under reduced motion.
  const contentY = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["0%", "16%"]);
  const contentFade = useTransform(scrollYProgress, [0, 0.82], [1, 0]);
  const bloomY = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["0%", "-18%"]);

  return (
    <section
      ref={ref}
      data-hero
      aria-labelledby="saas-hero-title"
      className="relative flex min-h-[100svh] flex-col overflow-hidden"
      style={{ background: `linear-gradient(180deg, #FFFFFF 0%, ${V.bg} 58%)`, color: V.ink }}
    >
      {/* Sky glow — deliberately OUTSIDE the parallax wrapper and unanimated:
          it's meant to read as light spilling in from above the viewport, and
          light doesn't drift. Sits behind everything else. */}
      <div className="saas-hero-glow pointer-events-none absolute inset-0" aria-hidden />

      {/* Ambient blooms — the scroll parallax lives on the wrapper so each bloom
          keeps its own x/y drift loop uncontested. */}
      <motion.div className="pointer-events-none absolute inset-0" style={{ y: bloomY }} aria-hidden>
        {heroBlooms.map((b) => (
          <motion.div
            key={b.box}
            className={`absolute rounded-full ${b.box}`}
            style={{ background: `radial-gradient(circle at 50% 50%, ${b.tint} 0%, transparent 68%)` }}
            animate={reduce ? undefined : b.drift}
            transition={reduce ? undefined : { duration: b.duration, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </motion.div>

      {/* Dot field, masked to an ellipse so it never meets an edge */}
      <div className="saas-hero-dots pointer-events-none absolute inset-0 opacity-70" aria-hidden />

      {/* ── Content (centred) ── */}
      <motion.div className="relative z-10 flex flex-1 items-center justify-center" style={{ y: contentY, opacity: contentFade }}>
        {/* The measure is wide (px, not ch) because the headline must hold its
            longest rotating phrase on ONE line all the way up to the 2000px
            type tier — the lede keeps its own 52ch measure via .saas-lede. */}
        <div className="mx-auto w-full max-w-[min(1180px,94vw)] pb-[clamp(40px,6vh,72px)] pt-[clamp(112px,16vh,176px)] text-center"
          style={{ paddingInline: "var(--page-pad)" }}>

          {/* Eyebrow — the pulsing dot is the only thing here that loops on its
              own, so it reads as "live" rather than as decoration. */}
          <motion.div initial={{ opacity: 0, y: RISE }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: REVEAL, delay: 0.05, ease: EASE }}>
            <span className="saas-chip inline-flex items-center gap-2.5 px-4 py-1.5 text-[13px] font-medium"
              style={{ background: V.surface, border: `1px solid ${V.line}`, color: V.primary, boxShadow: "0 1px 2px rgba(6,40,30,.05)" }}>
              <span className="relative grid h-2 w-2 place-items-center">
                {!reduce && (
                  <motion.span className="absolute h-2 w-2 rounded-full" style={{ background: V.primary }}
                    animate={{ scale: [1, 2.6], opacity: [0.5, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }} />
                )}
                <span className="h-2 w-2 rounded-full" style={{ background: V.primary }} />
              </span>
              The complete platform for charities
            </span>
          </motion.div>

          {/* Headline — words rise from behind their own clipping mask, then the
              last line takes over and keeps rotating. */}
          <h1 id="saas-hero-title" className="saas-h1 mt-7 font-bold" aria-label="Help your charity do more good."
            style={{ color: V.ink }}>
            <span className="block">
              {heroWords.map((w, i) => (
                // .saas-hero-mask = the clip + its descender room (see the css)
                <span key={w} className="saas-hero-mask inline-block align-bottom" aria-hidden>
                  <motion.span className="inline-block"
                    initial={reduce ? { opacity: 0 } : { y: "110%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.95, delay: 0.16 + i * 0.09, ease: EASE }}>
                    {/* NON-BREAKING space on purpose: a plain trailing space at
                        the end of an inline-block collapses and words collide */}
                    {w}{i < heroWords.length - 1 ? " " : ""}
                  </motion.span>
                </span>
              ))}
            </span>
            <motion.span className="mt-[.06em] block"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.44, ease: EASE }}>
              <RotatingPhrase phrases={heroPhrases} />
            </motion.span>
          </h1>

          <motion.p className="saas-lede mx-auto mt-6" style={{ color: V.inkSoft }}
            initial={{ opacity: 0, y: RISE }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: REVEAL, delay: 0.5, ease: EASE }}>
            Everything your organisation needs to raise funds, welcome donors and run heartfelt
            campaigns, all in one warm, beautiful platform with your name on it.
          </motion.p>

          <motion.div className="mt-9 flex flex-wrap items-center justify-center gap-3"
            initial={{ opacity: 0, y: RISE }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: REVEAL, delay: 0.62, ease: EASE }}>
            <MagneticBtn as="link" to="/plans"
              className="saas-btn-primary group inline-flex items-center gap-2.5 rounded-xl px-7 py-3.5 text-[15px] font-semibold text-white"
              style={{ background: "linear-gradient(180deg, var(--tenant-accent, #047857), var(--pf-accent-2, #065F46))", boxShadow: "0 18px 40px -14px rgba(var(--tenant-accent-rgb), .55)" }}>
              Start your charity portal
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </MagneticBtn>
            <a href="#how" className="saas-card group inline-flex items-center gap-2.5 rounded-xl px-6 py-3.5 text-[15px] font-medium"
              style={{ background: V.surface, border: `1px solid ${V.line}`, color: V.ink, boxShadow: "0 1px 2px rgba(6,40,30,.05)" }}>
              <span className="grid h-6 w-6 place-items-center rounded-full" style={{ background: V.surface2, color: V.primary }}>
                <Play className="h-3 w-3 translate-x-px fill-current" />
              </span>
              See how it works
            </a>
          </motion.div>

          {/* Stats live INSIDE the centred column, not pinned to the section's
              bottom edge. As a full-bleed bar down there it read as a fixed
              toolbar — it was the one element that neither drifted nor faded
              with the rest of the hero on scroll. In here it inherits the
              parallax and the fade, so it leaves with everything else. */}
          <HeroStats />
        </div>
      </motion.div>
    </section>
  );
}

/* ── The hero's stat row, driven by the live platform totals.
   Three states, and none of them is "make something up":
     loading / failed  → render nothing at all
     < 2 real figures  → render nothing (a lone "3 charities" is not a proof bar)
     otherwise         → the figures that actually have a value
   Rendered as the last block of the hero's centred column — a hairline rule and
   a row of figures, NOT a full-bleed bar on the section's bottom edge. Keep it
   that way: the bar version sat against the viewport edge and stayed put while
   the hero faded past it, which reads as a fixed toolbar even though nothing
   was ever position:fixed. ── */
/* The row orchestrates its children rather than each tile timing itself: the
   wrapper fades in, then `delayChildren` hands over to the shared fadeUpChild
   ladder (custom={i} → i * 0.1s), so the stats inherit the page's one motion
   vocabulary instead of inventing a second set of delays.
   `hover` is spread on top of fadeUpChild for a reason — a variant LABEL
   propagates to descendants, so the tile lifting is also what tells the figure
   inside it to scale. Renaming this key silently kills that. */
const statTile = {
  ...fadeUpChild,
  hover: { y: -4, transition: { type: "spring", stiffness: 340, damping: 22 } },
};
const statFigure = { hover: { scale: 1.07, transition: { type: "spring", stiffness: 340, damping: 20 } } };
const statsWrap = {
  hidden: { opacity: 0, y: RISE },
  visible: { opacity: 1, y: 0, transition: { duration: REVEAL, ease: EASE, delay: 0.86, delayChildren: 0.94 } },
};

function HeroStats() {
  const [stats, setStats] = useState(null); // null = loading / unavailable
  const reduce = useReducedMotion();

  useEffect(() => {
    let alive = true;
    platformService
      .getPublicStats()
      .then((res) => { if (alive) setStats(res?.data || null); })
      .catch(() => { if (alive) setStats(null); });
    return () => { alive = false; };
  }, []);

  const shown = stats
    ? heroStats
      .map((s) => ({ ...s, value: Number(stats[s.key]) || 0 }))
      .filter((s) => s.value > 0)
    : [];

  if (shown.length < 2) return null;

  return (
    <motion.div className="mx-auto mt-[clamp(40px,5vh,64px)] w-full max-w-[860px]"
      variants={statsWrap} initial="hidden" animate="visible">
      {/* The rule draws itself out from the centre instead of just being there —
          it's the line that separates the pitch above from the proof below, so
          it earns the beat. Its own initial/animate opts it out of the variant
          tree; the tiles below stay on it. */}
      <motion.span aria-hidden className="block h-px w-full origin-center"
        style={{ background: `linear-gradient(90deg, transparent, ${V.line} 18%, ${V.line} 82%, transparent)` }}
        initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.88, ease: EASE }} />

      {/* Flex, not a fixed 4-col grid: the row can legitimately render 2, 3 or
          4 tiles now, and a grid would strand them left-aligned with a hole. */}
      <div className="flex flex-wrap justify-center gap-x-8 gap-y-7 pt-[clamp(24px,3vh,36px)]">
        {shown.map((s, i) => {
          const f = formatStat(s.value, s);
          return (
            <motion.div key={s.key} custom={i} variants={statTile}
              whileHover={reduce ? undefined : "hover"}
              className="group w-[42%] cursor-default text-center sm:w-auto sm:min-w-[130px] sm:max-w-[220px] sm:flex-1">
              <motion.span className="block" variants={statFigure}>
                <Counter to={f.to} prefix={f.prefix} suffix={f.suffix} decimals={f.decimals}
                  className="text-[clamp(24px,2.2vw,30px)] font-bold tracking-tight" style={{ color: V.ink }} />
              </motion.span>
              <div className="mt-1 text-[13px]" style={{ color: V.inkSoft }}>{s.label}</div>
              {/* accent rule, grown from the centre on hover — CSS, not framer:
                  it only ever reacts to :hover and needs no state of its own */}
              <span aria-hidden className="mx-auto mt-2.5 block h-[2px] w-9 origin-center scale-x-0 rounded-full transition-transform duration-300 ease-out group-hover:scale-x-100"
                style={{ background: `linear-gradient(90deg, ${V.primary}, ${V.glow})` }} />
            </motion.div>
          );
        })}
      </div>
    </motion.div>
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
function DonexusMark({ size = 96, className = "", style = {} }) {
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

/* ── The bespoke mini-mockup for each feature — a real-looking slice of the
   product (donation card, donor list, branded portal, campaign, events,
   insights chart). ── */
function FeaturePreview({ kind }) {
  if (kind === "donations") {
    return (
      <div>
        <div className="text-[13px] font-medium" style={{ color: V.inkSoft }}>Make a gift to</div>
        <div className="text-[18px] font-bold" style={{ color: V.ink }}>Clean Water for Every Village</div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {["$25", "$50", "$100"].map((a, idx) => (
            <div key={a} className="rounded-xl py-2.5 text-center text-[14px] font-semibold"
              style={idx === 1 ? { background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, color: "#fff" } : { background: V.surface, border: `1px solid ${V.line}`, color: V.ink }}>{a}</div>
          ))}
        </div>
        <div className="mt-3 inline-flex rounded-xl p-1" style={{ background: V.surface2 }}>
          <span className="rounded-lg px-4 py-1.5 text-[13px] font-semibold" style={{ background: V.surface, color: V.ink, boxShadow: "0 1px 2px rgba(0,0,0,.06)" }}>One-time</span>
          <span className="rounded-lg px-4 py-1.5 text-[13px] font-medium" style={{ color: V.inkSoft }}>Monthly</span>
        </div>
        <button className="mt-5 w-full rounded-xl py-3 text-[14px] font-semibold text-white" style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})` }}>Give $50</button>
        <div className="mt-3 flex items-center gap-1.5 text-[12.5px]" style={{ color: V.inkSoft }}>
          <Check className="h-4 w-4" style={{ color: V.success }} /> Receipt &amp; thank-you sent automatically
        </div>
      </div>
    );
  }
  if (kind === "donors") {
    const rows = [
      { n: "Emily Richardson", t: "Monthly donor", a: "$50" },
      { n: "Ahmed Khan", t: "One-time gift", a: "$120" },
      { n: "Sarah Chen", t: "Monthly donor", a: "$25" },
      { n: "David Okafor", t: "One-time gift", a: "$80" },
    ];
    return (
      <div>
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-bold" style={{ color: V.ink }}>Recent supporters</div>
          <span className="text-[12px]" style={{ color: V.inkSoft }}>312 this month</span>
        </div>
        <div className="mt-3 space-y-2">
          {rows.map((d) => (
            <div key={d.n} className="flex items-center gap-3 rounded-xl p-2.5" style={{ background: V.surface, border: `1px solid ${V.line}` }}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: `linear-gradient(140deg, ${V.primary}, ${V.primary2})` }}>{initialsOf(d.n)}</span>
              <div className="flex-1">
                <div className="text-[13.5px] font-semibold" style={{ color: V.ink }}>{d.n}</div>
                <div className="text-[11.5px]" style={{ color: V.inkFaint }}>{d.t}</div>
              </div>
              <span className="text-[13px] font-bold" style={{ color: V.primary }}>{d.a}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (kind === "brand") {
    return (
      <div>
        <div className="relative overflow-hidden rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${V.primary}, ${V.primary2})` }}>
          <span className="absolute -right-6 -top-6 h-24 w-24 rounded-full" style={{ background: "rgba(255,255,255,.08)" }} />
          <div className="relative flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: "rgba(255,255,255,.18)" }}><HandHeart className="h-5 w-5" /></span>
            {/* A TENANT's portal, so it carries a charity's name — deliberately
                not "Donexus". This panel's whole claim is "donors see your
                charity, never us"; putting the vendor's name on it would
                contradict the copy three lines below. Hope Bridge is the same
                fictional charity used in the partner wall and testimonials. */}
            <div className="text-[15px] font-bold">Hope Bridge</div>
          </div>
          <div className="relative mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-semibold" style={{ background: "#fff", color: V.primary }}>
            <Heart className="h-3.5 w-3.5" /> Donate now
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-[12.5px]" style={{ color: V.inkSoft }}>Your colours &amp; logo</div>
          <div className="flex gap-1.5">
            {[V.primary, V.accent, V.primary2, "#0EA5E9"].map((c) => (
              <span key={c} className="h-6 w-6 rounded-lg" style={{ background: c, border: `1px solid ${V.line}` }} />
            ))}
          </div>
        </div>
        <div className="mt-3 rounded-lg px-3 py-2.5 text-[12.5px]" style={{ background: V.surface, border: `1px solid ${V.line}`, color: V.inkSoft }}>
          <span style={{ color: V.primary }}>https://</span>hopebridge.donexus.org
        </div>
      </div>
    );
  }
  if (kind === "campaigns") {
    return (
      <div>
        <div className="text-[13px] font-medium" style={{ color: V.inkSoft }}>Active campaign</div>
        <div className="text-[18px] font-bold" style={{ color: V.ink }}>Clean Water for Every Village</div>
        <div className="mt-3 flex items-baseline gap-2">
          <Counter to={38500} prefix="$" className="text-[26px] font-bold" style={{ color: V.ink }} />
          <span className="text-[13px]" style={{ color: V.inkFaint }}>of $50,000 goal</span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full" style={{ background: V.surface2 }}>
          <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${V.primary}, ${V.glow})` }}
            initial={{ width: 0 }} animate={{ width: "78%" }} transition={{ duration: 1.2, ease: [0.2, 0.7, 0.2, 1] }} />
        </div>
        <div className="mt-4 rounded-xl p-3.5" style={{ background: V.surface, border: `1px solid ${V.line}` }}>
          <div className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: V.primary }}>
            <Megaphone className="h-3.5 w-3.5" /> Update posted
          </div>
          <div className="mt-1 text-[12.5px] leading-relaxed" style={{ color: V.inkSoft }}>“The first three wells are complete. Thank you for making it happen!”</div>
        </div>
      </div>
    );
  }
  if (kind === "events") {
    const evs = [
      { m: "JUN", d: "18", t: "Charity Gala Dinner", r: "86 going" },
      { m: "JUL", d: "02", t: "Community Fun Run", r: "142 going" },
      { m: "JUL", d: "20", t: "Volunteer Orientation", r: "38 going" },
    ];
    return (
      <div>
        <div className="text-[15px] font-bold" style={{ color: V.ink }}>Upcoming events</div>
        <div className="mt-3 space-y-2">
          {evs.map((e) => (
            <div key={e.t} className="flex items-center gap-3 rounded-xl p-2.5" style={{ background: V.surface, border: `1px solid ${V.line}` }}>
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg" style={{ background: "rgba(var(--tenant-accent-rgb),.10)" }}>
                <div className="text-[9px] font-bold leading-none" style={{ color: V.primary }}>{e.m}</div>
                <div className="text-[15px] font-extrabold leading-tight" style={{ color: V.ink }}>{e.d}</div>
              </div>
              <div className="flex-1">
                <div className="text-[13.5px] font-semibold" style={{ color: V.ink }}>{e.t}</div>
                <div className="text-[11.5px]" style={{ color: V.inkFaint }}>{e.r}</div>
              </div>
              <span className="rounded-lg px-2.5 py-1 text-[11.5px] font-semibold" style={{ background: "rgba(var(--tenant-accent-rgb),.10)", color: V.primary }}>RSVP</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  // insights
  const bars = [40, 62, 48, 80, 58, 92, 74];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-bold" style={{ color: V.ink }}>Donations this month</div>
        <span className="text-[12px] font-semibold" style={{ color: V.success }}>↑ 24%</span>
      </div>
      <Counter to={48250} prefix="$" className="mt-1 block text-[24px] font-bold" style={{ color: V.ink }} />
      <div className="mt-4 flex items-end gap-2" style={{ height: 130 }}>
        {bars.map((h, idx) => (
          <motion.div key={idx} className="flex-1 rounded-t-md"
            style={{ background: idx === 5 ? `linear-gradient(180deg, ${V.glow}, ${V.primary})` : `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, opacity: idx === 5 ? 1 : 0.85 }}
            initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ duration: 0.7, delay: idx * 0.06, ease: [0.2, 0.7, 0.2, 1] }} />
        ))}
      </div>
      <div className="mt-3 flex justify-between text-[11px]" style={{ color: V.inkFaint }}>
        {days.map((d) => <span key={d}>{d}</span>)}
      </div>
    </div>
  );
}

/* ── Orbit-ring geometry, in the SVG's own 200×200 user units.
   ONE unbroken hairline circle plus ONE short marker arc that travels round it.
   This replaced six separately-lit segments: at six-way granularity each arc
   spanned ~51° of its 60° slot, so the gaps read as a ring that had snapped
   rather than a ring divided, and the lit arc ran so far past its own label
   that it collided with the neighbouring ones. The count is already carried by
   the six labels; the ring only has to answer "which one, and how far round". ── */
const RING_R = 94;
const RING_C = 2 * Math.PI * RING_R;
const RING_ARC = RING_C * (34 / 360);   // marker sweep — narrower than a label
/* Degrees CLOCKWISE FROM 12 O'CLOCK — the convention the node transform needs,
   because its `translateY(-orbit)` leg already points up. Feeding it a standard
   atan2 angle (0° = 3 o'clock) lands every label a quarter-turn out of step
   with the ring segment and spoke meant to point at it. */
const spinOf = (i) => i * (360 / features.length);

/* ── The feature rosette — the Donexus mark as the hub of a six-way selector.
   The mark turns 60° per step (a full revolution across the six) and the ring
   segment for the active feature lights up while the other five sit at a 12%
   tint. Below it, the live preview renders straight onto the page background:
   no browser chrome, no card, no frame.

   This deliberately does NOT scroll-pin. The old explorer pinned for
   (6-1) × 46svh ≈ 3.6 screens of dead scroll, and the pin engaged at `top 88px`
   which parked the section heading underneath the sticky navbar. A radial
   control is a "pick one" affordance, not a "scrub through" one, so it is
   driven by click / arrow keys, with a gentle auto-advance that stops for good
   the moment the visitor takes over. ── */
function FeatureRosette() {
  const [active, setActive] = useState(0);
  const [touched, setTouched] = useState(false);
  const [wide, setWide] = useState(false);
  const rootRef = useRef(null);
  const stRef = useRef(null);
  const btnRefs = useRef([]);
  const reduce = useReducedMotion();
  const inView = useInView(rootRef, { amount: 0.35 });

  // The radial layout needs room to breathe; below 1024px it becomes a list.
  useEffect(() => {
    const m = window.matchMedia("(min-width: 1024px)");
    const sync = () => setWide(m.matches);
    sync();
    m.addEventListener("change", sync);
    return () => m.removeEventListener("change", sync);
  }, []);

  // Desktop: pin the two-up block and let vertical scroll walk the ring round
  // its six positions, so the panel on the right changes as you go.
  //
  // Travel is (items - 1) × 42svh (§8.2). Only the HAND-OFFS need scroll — a
  // full viewport per feature would be 3.6 screens of nothing moving but the
  // ring. The last feature still lands at the end of the pin.
  const pinned = wide && !reduce;
  useEffect(() => {
    if (!pinned || !rootRef.current) return undefined;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
      const st = ScrollTrigger.create({
        trigger: rootRef.current,
        start: "top 104px",
        end: () => "+=" + Math.round(window.innerHeight * 0.42 * (features.length - 1)),
        pin: true,
        pinSpacing: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const n = features.length;
          const i = Math.min(n - 1, Math.floor(self.progress * n));
          setActive((prev) => (prev === i ? prev : i));
          // Feature i owns progress [i/n, (i+1)/n), so its CENTRE is (i+.5)/n.
          // angle = p·360 − step/2 puts the marker exactly on feature i at that
          // centre; clamping parks it on the first and last rather than letting
          // it overshoot past them at either end of the pin.
          const step = 360 / n;
          const deg = Math.min(360 - step, Math.max(0, self.progress * 360 - step / 2));
          turnRef.current = deg;
          setRot.current?.(deg);
        },
      });
      stRef.current = st;
      return () => { stRef.current = null; };
    });
    return () => mm.revert();
  }, [pinned]);

  // Auto-advance is the FALLBACK for the un-pinned cases only (narrow screens,
  // reduced motion). While pinned the scrubber owns `active`, and a timer
  // fighting it would flick the panel to a feature the ring is not pointing at.
  useEffect(() => {
    if (pinned || reduce || touched || !inView) return undefined;
    const id = setInterval(() => setActive((i) => (i + 1) % features.length), 4200);
    return () => clearInterval(id);
  }, [pinned, reduce, touched, inView]);

  /* ── Rotation ──
     The hub and the marker arc share one angle, applied IMPERATIVELY through a
     gsap.quickTo. A scrub updates it every scroll frame, and pushing that
     through React state would re-render the whole rosette ~60×/second.

     While pinned it is a CONTINUOUS function of scroll progress, not an
     accumulator over `active`. The accumulator it replaced only ever counted
     forward: scrolling back up computed (active - prev) mod 6, so one step
     backwards read as FIVE steps forward and the mark spun a whole extra
     revolution instead of simply reversing. Deriving the angle from progress
     makes reversal free — scroll up and it unwinds exactly as it wound. */
  const markRef = useRef(null);
  const arcRef = useRef(null);
  const turnRef = useRef(0);
  const proxy = useRef({ v: 0 });
  const setRot = useRef(null);

  useEffect(() => {
    const apply = () => {
      const t = `rotate(${proxy.current.v}deg)`;
      if (markRef.current) markRef.current.style.transform = t;
      if (arcRef.current) arcRef.current.style.transform = t;
    };
    // A short eased follow rather than a raw 1:1 write: the scrubber reports on
    // discrete frames, and writing those straight through reads as a stutter at
    // speed. quickTo re-targets the same tween instead of spawning one per event.
    setRot.current = reduce
      ? (deg) => { proxy.current.v = deg; apply(); }
      : gsap.quickTo(proxy.current, "v", { duration: 0.35, ease: "power3", onUpdate: apply });
    setRot.current(turnRef.current);
    return () => { setRot.current = null; };
  }, [reduce]);

  // The un-pinned path (clicks on narrow screens, auto-advance) still moves in
  // whole steps. Take the SHORT way round, so 5 → 0 turns 60° forward rather
  // than 300° back, and 0 → 5 turns 60° back rather than 300° forward.
  const prevActive = useRef(0);
  useEffect(() => {
    const n = features.length;
    let d = (active - prevActive.current) % n;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    prevActive.current = active;
    if (!pinned && d) {
      turnRef.current += d * (360 / n);
      setRot.current?.(turnRef.current);
    }
  }, [active, pinned]);

  // Clicking while pinned has to move the SCROLLBAR, not just the state — the
  // scrubber recomputes `active` from progress on the very next scroll event
  // and would otherwise yank the selection straight back.
  const select = (i) => {
    setTouched(true);
    const st = stRef.current;
    if (st) window.scrollTo({ top: st.start + ((i + 0.5) / features.length) * (st.end - st.start), behavior: "smooth" });
    else setActive(i);
  };

  // Roving tabindex: ← / → move between features, Home / End jump to the ends.
  const onKeyDown = (e) => {
    const last = features.length - 1;
    let next = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = active === last ? 0 : active + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = active === 0 ? last : active - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    select(next);
    btnRefs.current[next]?.focus();
  };

  const f = features[active];

  const tabProps = (i) => ({
    ref: (el) => { btnRefs.current[i] = el; },
    type: "button",
    role: "tab",
    id: `saas-feat-tab-${i}`,
    "aria-selected": i === active,
    "aria-controls": "saas-feat-panel",
    tabIndex: i === active ? 0 : -1,
    onClick: () => select(i),
  });

  return (
    <div ref={rootRef}
      className="saas-rosette-stage grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,.92fr)_minmax(0,1.08fr)] lg:gap-[var(--gap)]">
      {/* ══ LEFT — the selector ══ */}
      <div className="saas-rosette-col">
      {wide ? (
        /* ── Radial ── */
        <div className="saas-rosette" role="tablist" aria-label="Platform features" onKeyDown={onKeyDown}>
          {/* Orbit ring. Sized to --ring and centred on the stage. */}
          <svg className="saas-rosette-ring" viewBox="0 0 200 200" aria-hidden focusable="false">
            <circle cx="100" cy="100" r={RING_R} fill="none" strokeWidth="1.5"
              stroke="rgba(var(--tenant-accent-rgb),.16)" />
            {/* The marker arc rides the same angle as the hub, written straight
                to .style.transform by the quickTo above — no CSS transition, or
                it would fight the tween and lag the scrub.
                transform-box is spelled out: the initial value only became
                view-box in the CSS Transforms L2 revision, and a border-box
                fallback would swing it around the wrong point. */}
            <g ref={arcRef} style={{ transform: "rotate(0deg)", transformBox: "view-box", transformOrigin: "100px 100px" }}>
              {/* rotate(-90) starts the dash at 12 o'clock; the half-arc offset
                  then centres it on the label rather than beginning there. */}
              <circle cx="100" cy="100" r={RING_R} fill="none" stroke={V.primary}
                strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={`${RING_ARC} ${RING_C - RING_ARC}`}
                strokeDashoffset={RING_ARC / 2}
                transform="rotate(-90 100 100)" />
            </g>
          </svg>

          {/* Hub — the mark, turning 60° per step. */}
          {/* The mark is wrapped rather than rotated directly: <DonexusMark/>
              renders a plain <span> and does not forward a ref, and the wrapper
              is what the quickTo writes to. */}
          <div className="saas-rosette-hub">
            <span ref={markRef} className="saas-rosette-mark"
              style={{ display: "block", width: "100%", height: "100%", transform: "rotate(0deg)" }}>
              <DonexusMark style={{ width: "100%", height: "100%" }} />
            </span>
          </div>

          {/* Six labels, parked on the orbit. The double-rotate keeps each one
              upright while placing it by angle — no per-item measurement. */}
          {features.map((item, i) => {
            const on = i === active;
            const a = spinOf(i);
            const Icon = item.icon;
            return (
              // Text always stacks AWAY from the hub. The label sat below its
              // icon at every position, which for the three upper nodes drove
              // it back INWARDS — far enough that the ring passed straight
              // through the words. Flipping the upper half to column-reverse
              // pushes every label outward instead, and costs no extra radius.
              <button key={item.title} {...tabProps(i)} className="saas-rosette-node"
                style={{
                  transform: `translate(-50%,-50%) rotate(${a}deg) translateY(calc(-1 * var(--orbit))) rotate(${-a}deg)`,
                  flexDirection: a > 90 && a < 270 ? "column" : "column-reverse",
                }}>
                {/* Only the SELECTED icon gets chrome. Six outlined circles
                    around an already-intricate eight-loop mark was most of the
                    noise — and with all six ringed, nothing announced which one
                    was live except a weight change in the label. The box stays
                    44px either way, so dropping the ring shifts no layout. */}
                <span className="saas-rosette-ic"
                  style={on
                    ? { background: `linear-gradient(150deg, ${V.glow}, ${V.primary2})`, color: "#fff", boxShadow: "0 14px 30px -14px rgba(var(--tenant-accent-rgb),.55)" }
                    : { background: "transparent", color: "rgba(var(--tenant-accent-rgb),.55)" }}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="saas-rosette-label" style={{ color: on ? V.ink : V.inkSoft, fontWeight: on ? 700 : 500 }}>
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        /* ── Narrow fallback: a plain, upright list. ── */
        <div role="tablist" aria-label="Platform features" onKeyDown={onKeyDown} className="flex flex-col">
          {features.map((item, i) => {
            const on = i === active;
            const Icon = item.icon;
            return (
              <button key={item.title} {...tabProps(i)}
                className="flex items-center gap-3 py-3.5 text-left"
                style={{ borderTop: i === 0 ? "none" : `1px solid ${V.line}` }}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg"
                  style={on
                    ? { background: `linear-gradient(150deg, ${V.glow}, ${V.primary2})`, color: "#fff" }
                    : { background: V.surface, color: V.primary, border: `1px solid ${V.line}` }}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="text-[15px] tracking-tight" style={{ color: on ? V.ink : V.inkSoft, fontWeight: on ? 700 : 500 }}>
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>
      )}
      </div>

      {/* ══ RIGHT — the live panel ══
          Intentionally unframed: it sits directly on the page background,
          which is what the mockups inside <FeaturePreview/> are drawn against,
          so their white cards keep the contrast they were designed for.

          The panels are STACKED and cross-fade rather than swapping with
          AnimatePresence's `wait` mode. Scrubbing can cross two or three
          features in a flick, and `wait` queues each exit before the next
          entrance, so the panel would visibly trail the ring. Absolute
          positioning also fixes the panel's height, which matters more here
          than it looks: a panel that grew or shrank per feature would resize
          the pinned box and make the whole section jitter as you scroll. */}
      <div id="saas-feat-panel" role="tabpanel" aria-labelledby={`saas-feat-tab-${active}`}
        className="relative w-full">
        {/* No negative z-index: neither .saas-page nor .saas-section opens a
            stacking context, so -z-10 would drop this behind the page
            background entirely. Paint order does the job — the glow is
            absolute and the panel after it is `relative`, so the panel wins. */}
        <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[110%] w-[118%] -translate-x-1/2 -translate-y-1/2"
          style={{ background: "radial-gradient(closest-side, rgba(var(--tenant-accent-rgb),.10), transparent 78%)" }} />
        <div className="relative" style={{ minHeight: 440 }}>
          <AnimatePresence initial={false}>
            <motion.div key={active} className="absolute inset-x-0 top-0"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: EASE }}>
              <h3 className="text-[clamp(20px,1.8vw,26px)] font-bold tracking-tight" style={{ color: V.ink }}>
                {f.title}
              </h3>
              <p className="mt-2.5 max-w-[46ch] text-[15px] leading-relaxed" style={{ color: V.inkSoft }}>
                {f.desc}
              </p>
              <div className="mt-7">
                <FeaturePreview kind={f.kind} />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ── How it works — a vertical timeline.

   This replaced a horizontal three-column stepper that autoplayed one "active"
   column at a time. Two things were wrong with it. Laid out across the full
   shell the three columns were 400px apart, so nothing read as a SEQUENCE —
   just three headings in a row. And dimming the two inactive columns to
   inkFaint at 45% opacity meant that two thirds of the section was always
   unreadable; it looked like a rendering fault rather than a walkthrough.

   Stood on its end, the order is carried by the layout itself, so nothing has
   to be dimmed to say "not this one" — all three steps are fully legible at
   once, and each pairs with its own product shot instead of the three sharing
   one panel that swapped underneath them. Progress is now scroll-linked rather
   than timed: the connector between two dots draws itself as you arrive at the
   next step, so the rail still reads as motion without a clock deciding how
   fast anyone reads. ── */

/* ── The mini product shot for the active step — a real slice of the app, so
   the section pays off with something to look at rather than three sentences.
   All three are built to one width; their container holds one height, so the
   cross-fade never resizes the panel. ── */
function StepVisual({ index }) {
  if (index === 0) {
    return (
      <div className="w-full max-w-[380px] space-y-2.5">
        <div className="flex items-center rounded-lg px-3 py-2.5 text-[12.5px]" style={{ background: V.surface, border: `1px solid ${V.line}` }}>
          <span style={{ color: V.ink, fontWeight: 600 }}>hopebridge</span>
          <span style={{ color: V.inkFaint }}>.donexus.org</span>
          <Check className="ml-auto h-4 w-4" style={{ color: V.success }} />
        </div>
        <div className="flex gap-1.5">
          {["Basic", "Pro", "Enterprise"].map((pl, i) => (
            <span key={pl} className="rounded-md px-2.5 py-1 text-[11.5px] font-semibold"
              style={i === 1 ? { background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, color: "#fff" } : { background: V.surface2, color: V.inkSoft }}>{pl}</span>
          ))}
        </div>
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className="flex w-full max-w-[380px] items-center gap-3.5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white" style={{ background: `linear-gradient(150deg, ${V.primary}, ${V.glow})` }}>
          <HandHeart className="h-5 w-5" />
        </span>
        <div className="flex gap-1.5">
          {[V.primary, V.accent, V.primary2, "#0EA5E9", "#F472B6"].map((c) => (
            <span key={c} className="h-7 w-7 rounded-lg" style={{ background: c, border: `1px solid ${V.line}` }} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex w-full max-w-[380px] items-center gap-3 rounded-xl p-3" style={{ background: V.surface, border: `1px solid ${V.line}` }}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: `linear-gradient(140deg, ${V.primary}, ${V.primary2})` }}>ER</span>
      <div className="flex-1 text-[13px]">
        <span style={{ color: V.ink, fontWeight: 600 }}>Emily</span> <span style={{ color: V.inkSoft }}>gave</span> <span style={{ color: V.primary, fontWeight: 700 }}>$50</span>
      </div>
      <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold" style={{ color: V.success }}><Check className="h-3.5 w-3.5" /> Receipt</span>
    </div>
  );
}

/* ── The ribbon.

   The path is GENERATED from the measured position of each step, not authored
   as a fixed `d`. A hand-drawn path in a normalised viewBox would need
   preserveAspectRatio="none" to stretch to the section, and that scales the
   stroke unevenly — the ribbon would fatten horizontally and thin vertically at
   every width. Measuring instead keeps one user unit equal to one pixel, so the
   carriageway stays ROAD_W wide everywhere and the curve always meets the dots.

   Each step contributes TWO points: where the road meets the top of the card
   and where it leaves the bottom. The rail those come from is deliberately
   INSIDE the card's footprint, not beside it in a gutter — the road runs under
   the card and the card's own surface hides it, so the route visibly enters at
   the numbered marker and re-emerges below. Running it down the flank instead
   made the card look like something the road merely passed, rather than a stop
   on it.

   The two points also keep every S-curve in the row gap. Anchoring one point
   per step would put each horizontal crossing at the vertical midpoint between
   steps — behind a card — and the road would vanish exactly where the turn is
   most worth seeing. ── */
const ROAD_W = 13;   // carriageway width, in px == SVG user units

function StepsRibbon() {
  const wrapRef = useRef(null);
  const railRefs = useRef([]);
  const drawRef = useRef(null);
  const reduce = useReducedMotion();
  const [geo, setGeo] = useState({ w: 0, h: 0, rails: [] });

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;
    const measure = () => {
      const c = wrap.getBoundingClientRect();
      const rails = railRefs.current.filter(Boolean).map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left - c.left, top: r.top - c.top, bot: r.bottom - c.top };
      });
      setGeo((g) => {
        const same = Math.abs(g.w - c.width) < 0.5 && Math.abs(g.h - c.height) < 0.5
          && g.rails.length === rails.length
          && g.rails.every((p, i) => Math.abs(p.x - rails[i].x) < 0.5
            && Math.abs(p.top - rails[i].top) < 0.5 && Math.abs(p.bot - rails[i].bot) < 0.5);
        return same ? g : { w: c.width, h: c.height, rails };
      });
    };
    measure();
    // Fonts landing late shift every row, so re-measure rather than trusting
    // the first pass; the observer is on the wrapper, which the SVG (absolute)
    // cannot resize, so this cannot feed back on itself.
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, []);

  const d = React.useMemo(() => {
    const r = geo.rails;
    if (r.length < 2) return "";
    let s = `M ${r[0].x} ${Math.max(0, r[0].top - 44)} L ${r[0].x} ${r[0].bot}`;
    for (let i = 1; i < r.length; i++) {
      const a = r[i - 1], b = r[i];
      const k = Math.max(28, (b.top - a.bot) * 0.62);   // control-point reach
      s += ` C ${a.x} ${a.bot + k} ${b.x} ${b.top - k} ${b.x} ${b.top}`;
      // No rail past the LAST dot. Running it down the final card's flank left
      // a line hanging off the bottom of the section with nothing to connect
      // to, which read as a loose thread rather than an ending.
      if (i < r.length - 1) s += ` L ${b.x} ${b.bot}`;
    }
    return s;
  }, [geo]);

  // Draw the accent copy of the path on scroll. strokeDasharray is set to the
  // full length and the offset scrubbed to 0, so the line appears to be drawn
  // rather than faded in.
  useEffect(() => {
    const el = drawRef.current;
    if (!el || !d || !wrapRef.current) return undefined;
    const len = el.getTotalLength();
    el.style.strokeDasharray = String(len);
    if (reduce) { el.style.strokeDashoffset = "0"; return undefined; }
    el.style.strokeDashoffset = String(len);
    const tw = gsap.to(el, {
      strokeDashoffset: 0,
      ease: "none",
      scrollTrigger: {
        trigger: wrapRef.current,
        start: "top 78%",
        end: "bottom 68%",
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    });
    return () => { tw.scrollTrigger?.kill(); tw.kill(); };
  }, [d, reduce]);

  return (
    <div ref={wrapRef} className="saas-ribbon">
      <svg className="saas-ribbon__svg" width={geo.w || 1} height={geo.h || 1}
        viewBox={`0 0 ${geo.w || 1} ${geo.h || 1}`} aria-hidden focusable="false">
        <defs>
          <linearGradient id="saas-road-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={V.glow} />
            <stop offset="100%" stopColor={V.primary2} />
          </linearGradient>
          {/* The reveal is a MASK, not a dashoffset on the road itself: the
              surface and its lane markings have to appear together, and the
              markings already spend strokeDasharray on being dashes. Wiping a
              mask over both is the only way to reveal them as one object.
              userSpaceOnUse — the default objectBoundingBox would resolve the
              stroke against the path's own bbox and collapse it. */}
          <mask id="saas-road-mask" maskUnits="userSpaceOnUse">
            <path ref={drawRef} d={d} fill="none" stroke="#fff"
              strokeWidth={ROAD_W + 6} strokeLinecap="round" />
          </mask>
        </defs>

        {/* Unsurfaced road: the route ahead is always visible, so the section
            reads as a journey with a known end rather than a line to nowhere. */}
        <path d={d} fill="none" stroke="rgba(var(--tenant-accent-rgb),.13)"
          strokeWidth={ROAD_W} strokeLinecap="round" />

        {/* Surfaced road + lane markings, wiped in by the mask above. */}
        <g mask="url(#saas-road-mask)">
          <path d={d} fill="none" stroke="url(#saas-road-grad)" strokeWidth={ROAD_W} strokeLinecap="round" />
          <path d={d} fill="none" stroke="rgba(255,255,255,.72)" strokeWidth="2"
            strokeDasharray="9 13" strokeLinecap="round" />
        </g>
      </svg>

      <ol className="saas-ribbon__rows">
        {steps.map((s, i) => (
          <RibbonStep key={s.n} step={s} i={i}
            setRail={(el) => { railRefs.current[i] = el; }} />
        ))}
      </ol>
    </div>
  );
}

function RibbonStep({ step, i, setRail }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const on = useInView(ref, { once: true, amount: 0.4 });
  const left = i % 2 === 0;

  return (
    <li ref={ref} className={`saas-ribbon__row saas-ribbon__row--${left ? "l" : "r"}`}>
      <div className="saas-ribbon__cell">
        {/* Zero-width, un-animated: the path is measured off THIS, so it must
            never carry a transform of its own or the ribbon would be laid out
            against a position the card is only passing through. */}
        <span ref={setRail} aria-hidden className="saas-ribbon__rail" />

        <motion.span aria-hidden className="saas-ribbon__dot"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={on ? { scale: 1, opacity: 1 } : {}}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 24 }}>
          {i + 1}
        </motion.span>

        <motion.div className="saas-ribbon__body rounded-2xl"
          initial={{ opacity: 0, y: RISE, x: reduce ? 0 : (left ? -16 : 16) }}
          animate={on ? { opacity: 1, y: 0, x: 0 } : {}}
          transition={{ duration: REVEAL, ease: EASE }}>
          <h3 className="saas-h3 font-bold" style={{ color: V.ink }}>{step.title}</h3>
          <p className="mt-2.5 text-[15px] leading-relaxed" style={{ color: V.inkSoft }}>{step.desc}</p>
          <div className="saas-ribbon__visual">
            <StepVisual index={i} />
          </div>
        </motion.div>
      </div>
    </li>
  );
}

/* ── A single campaign told as a scroll-revealed story timeline: current
   progress up top, then the milestones a supporter would follow. ── */
const campaignJourney = [
  { icon: Rocket, title: "Campaign launched", time: "6 weeks ago", desc: "Goal set at $50,000 to bring clean water to four villages." },
  { icon: TrendingUp, title: "25% funded", time: "5 weeks ago", desc: "124 early supporters got the project moving." },
  { icon: Camera, title: "Photo update posted", time: "3 weeks ago", desc: "“The first three wells are complete. Thank you!”", photo: true },
  { icon: Users, title: "78% · 312 donors", time: "Today", desc: "$38,500 raised of $50,000. Almost there.", current: true },
  { icon: Mail, title: "Impact report", time: "Coming soon", desc: "Every donor gets a closing thank-you with the results.", upcoming: true },
];

function CampaignStory() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <div ref={ref} className="rounded-2xl p-6 lg:p-7" style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: "0 24px 50px -24px rgba(6,40,30,.2)" }}>
      {/* Current state */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.14em]" style={{ color: V.primary }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: V.success }} /> Active campaign
          </span>
          <h3 className="mt-1.5 text-[19px] font-bold tracking-[-0.01em]" style={{ color: V.ink }}>Clean Water for Every Village</h3>
        </div>
        <Counter to={78} suffix="%" className="text-[20px] font-bold" style={{ color: V.primary }} />
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full" style={{ background: V.surface2 }}>
        <motion.div className="relative h-full overflow-hidden rounded-full" style={{ background: `linear-gradient(90deg, ${V.primary}, ${V.glow})` }}
          initial={{ width: 0 }} whileInView={{ width: "78%" }} viewport={{ once: true }} transition={{ duration: 1.3, ease: [0.2, 0.7, 0.2, 1] }}>
          <span aria-hidden className="saas-prog-shine absolute inset-y-0 w-1/3" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,.65), transparent)" }} />
        </motion.div>
      </div>
      <div className="mt-2 text-[12.5px]" style={{ color: V.inkFaint }}>
        <Counter to={38500} prefix="$" /> raised of $50,000 · <Counter to={312} /> donors
      </div>

      {/* Story timeline */}
      <div className="relative mt-6 pt-6" style={{ borderTop: `1px solid ${V.line}` }}>
        <motion.div aria-hidden className="absolute left-[15px] w-[2px] origin-top" style={{ top: 40, bottom: 24, background: `linear-gradient(180deg, ${V.primary}, ${V.glow})` }}
          initial={{ scaleY: 0 }} animate={inView ? { scaleY: 1 } : { scaleY: 0 }} transition={{ duration: 1, ease: [0.2, 0.7, 0.2, 1] }} />
        <ol className="space-y-4">
          {campaignJourney.map((m, i) => (
            <motion.li key={m.title} className="relative pl-11"
              initial={{ opacity: 0, x: -14 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.5, delay: 0.25 + i * 0.13, ease: [0.2, 0.7, 0.2, 1] }}>
              <motion.span className="absolute left-0 top-0 z-10 grid h-8 w-8 place-items-center rounded-full"
                initial={{ scale: 0, rotate: -25 }} animate={inView ? { scale: 1, rotate: 0 } : {}}
                transition={{ delay: 0.3 + i * 0.13, type: "spring", stiffness: 280, damping: 16 }}
                style={m.upcoming
                  ? { background: V.surface, border: "2px dashed rgba(var(--tenant-primary-rgb),.25)", color: V.inkFaint }
                  : { background: `linear-gradient(150deg, ${V.primary}, ${V.glow})`, color: "#fff" }}>
                {m.current && <span aria-hidden className="saas-pulse-ring absolute inset-0 rounded-full" style={{ border: `2px solid ${V.accent}` }} />}
                <m.icon className="relative h-4 w-4" />
              </motion.span>
              <div className="flex flex-wrap items-center gap-x-2">
                <span className="text-[14px] font-bold" style={{ color: V.ink }}>{m.title}</span>
                <span className="text-[11px]" style={{ color: V.inkFaint }}>· {m.time}</span>
                {m.current && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: "rgba(var(--tenant-accent-rgb),.12)", color: V.primary }}>Now</span>}
              </div>
              <p className="mt-0.5 text-[13px] leading-relaxed" style={{ color: V.inkSoft }}>{m.desc}</p>
              {m.photo && (
                <motion.div className="relative mt-2.5 overflow-hidden rounded-xl"
                  initial={{ opacity: 0, scale: 0.96 }} animate={inView ? { opacity: 1, scale: 1 } : {}} transition={{ duration: 0.5, delay: 0.6 }}
                  style={{ border: `1px solid ${V.line}`, background: `linear-gradient(135deg, ${V.primary}, ${V.primary2})` }}>
                  <img src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=600&q=70"
                    alt="Supporters celebrating the new village well" className="h-28 w-full object-cover" loading="lazy" />
                  <span className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold text-white"
                    style={{ background: "rgba(0,0,0,.5)", backdropFilter: "blur(4px)" }}>
                    <Camera className="h-3 w-3" /> Photo update
                  </span>
                </motion.div>
              )}
            </motion.li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* ── A price that rolls (GSAP) from 0 on first view, then from the previous
   amount to the new one whenever the billing cycle flips it. ── */
function RollingPrice({ value, className = "", style = {} }) {
  const ref = useRef(null);
  const prev = useRef(0);
  const seen = useRef(false);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  useEffect(() => {
    if (!inView) return;
    const node = ref.current;
    const from = seen.current ? prev.current : 0;
    seen.current = true;
    const obj = { v: from };
    const tween = gsap.to(obj, { v: value, duration: 0.7, ease: "power2.out",
      onUpdate: () => { if (node) node.textContent = "$" + Math.round(obj.v).toLocaleString("en-US"); } });
    prev.current = value;
    return () => tween.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value]);
  return <span ref={ref} className={className} style={style}>{"$" + value.toLocaleString("en-US")}</span>;
}

/* ── Pricing grid with a Monthly/Annual toggle (sliding pill) that re-rolls the
   prices and reveals the annual saving; the popular plan is spotlit. ── */
function PricingCards() {
  const [billing, setBilling] = useState("monthly");
  const [dbPlans, setDbPlans] = useState(null); // null = loading
  const annual = billing === "annual";

  useEffect(() => {
    tenantService
      .getPublicPlans()
      .then((res) => setDbPlans(Array.isArray(res.data) ? res.data : []))
      .catch(() => setDbPlans([]));
  }, []);

  // Live plans drive the section; curated defaults show while loading / if none.
  const cards = dbPlans && dbPlans.length ? dbPlans.map(mapHomePlan) : pricingPlans;

  return (
    <>
      {/* Billing toggle */}
      <div className="mb-12 flex justify-center">
        {/* The sliding pill lives INSIDE the active button (shared layoutId), so it
            matches each button's real width — no more 50% overlap with "Annual". */}
        <div className="relative inline-flex rounded-full p-1.5" style={{ background: V.surface, border: `1px solid ${V.line}`, boxShadow: "inset 0 1px 0 rgba(255,255,255,.7), 0 2px 6px rgba(6,40,30,.05)" }}>
          <button type="button" onClick={() => setBilling("monthly")} className="relative rounded-full px-6 py-2 text-[14px] font-semibold transition-colors" style={{ color: annual ? V.inkSoft : "#fff" }}>
            {!annual && (
              <motion.span aria-hidden layoutId="saas-billing-pill" className="absolute inset-0 rounded-full"
                style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, boxShadow: "0 6px 16px -6px rgba(var(--tenant-accent-rgb),.5)" }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }} />
            )}
            <span className="relative z-10">Monthly</span>
          </button>
          <button type="button" onClick={() => setBilling("annual")} className="relative rounded-full px-6 py-2 text-[14px] font-semibold transition-colors" style={{ color: annual ? "#fff" : V.inkSoft }}>
            {annual && (
              <motion.span aria-hidden layoutId="saas-billing-pill" className="absolute inset-0 rounded-full"
                style={{ background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, boxShadow: "0 6px 16px -6px rgba(var(--tenant-accent-rgb),.5)" }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }} />
            )}
            <span className="relative z-10 inline-flex items-center gap-2">
              Annual
              <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={annual ? { background: "rgba(255,255,255,.22)", color: "#fff" } : { background: "rgba(var(--tenant-accent-rgb),.14)", color: V.primary }}>Save 20%</span>
            </span>
          </button>
        </div>
      </div>

      {/* Cards */}
      <motion.div className="grid grid-cols-1 items-stretch gap-5 pt-3 md:grid-cols-3"
        initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger}>
        {cards.map((plan, i) => {
          // Show the ACTUAL price for the selected cycle: the yearly total when
          // annual is on, the monthly price otherwise (per-month equiv goes below).
          const bigPrice = annual ? plan.annualTotal : plan.priceNum;
          return (
            <motion.div key={plan.code || plan.tier} variants={fadeUpChild} custom={i} className="h-full">
              {/* middle wrapper carries the static spotlight transform (kept off the
                  framer-animated & hover-animated layers to avoid transform clashes) */}
              <div className={`h-full ${plan.popular ? "md:relative md:z-10 md:-translate-y-2 md:scale-[1.035]" : ""}`}>
                <div className={`saas-card relative flex h-full flex-col rounded-2xl p-8 ${plan.popular ? "" : "overflow-hidden"}`}
                  style={{
                    background: plan.popular ? `radial-gradient(120% 80% at 50% -10%, rgba(var(--tenant-accent-rgb),.12), transparent 60%), ${V.surface}` : V.surface,
                    border: plan.popular ? `2px solid ${V.primary}` : `1px solid ${V.line}`,
                    boxShadow: plan.popular ? "0 34px 70px -26px rgba(var(--tenant-accent-rgb),.5)" : "none",
                  }}>
                  {!plan.popular && <span aria-hidden className="saas-topline pointer-events-none absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${V.primary}, ${V.glow})` }} />}
                  {plan.popular && (
                    <span className="absolute -top-3.5 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-white"
                      style={{ background: `linear-gradient(135deg, ${V.primary}, ${V.primary2})`, boxShadow: "0 8px 20px -6px rgba(var(--tenant-accent-rgb),.5)" }}>
                      <Sparkles className="h-3.5 w-3.5" /> Most popular
                    </span>
                  )}
                  <div className="text-[20px] font-bold" style={{ color: V.ink }}>{plan.tier}</div>
                  <div className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: V.inkSoft }}>{plan.desc}</div>
                  <div className="mt-5 pb-6" style={{ borderBottom: `1px solid ${V.line}` }}>
                    <div className="flex items-baseline gap-1.5">
                      <RollingPrice value={bigPrice} className="text-[42px] font-bold tracking-tight" style={{ color: V.ink }} />
                      <span className="text-[14px]" style={{ color: V.inkFaint }}>{annual ? "/ year" : "/ month"}</span>
                    </div>
                    <AnimatePresence initial={false}>
                      {annual && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px]">
                            <span style={{ color: V.inkFaint }}>≈ ${plan.annualNum.toLocaleString()}/mo · billed yearly</span>
                            <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "rgba(5,150,105,.12)", color: V.success }}>
                              Save ${(plan.priceNum * 12 - plan.annualTotal).toLocaleString()}/yr
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <ul className="mb-7 mt-6 flex-1 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-[14px]" style={{ color: V.inkSoft }}>
                        <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full" style={{ background: plan.popular ? "rgba(var(--tenant-accent-rgb),.14)" : V.surface2 }}>
                          <Check className="h-3 w-3" strokeWidth={3} style={{ color: V.primary }} />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to={`/register?plan=${plan.code || plan.tier.toLowerCase()}&billing=${billing}`}
                    className={`group flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14.5px] font-semibold transition-all ${plan.popular ? "saas-btn-primary text-white" : ""}`}
                    style={plan.popular
                      ? { background: `linear-gradient(180deg, ${V.primary}, ${V.primary2})`, boxShadow: `0 12px 26px -10px rgba(var(--tenant-accent-rgb),.5)` }
                      : { background: V.surface2, color: V.ink, border: `1px solid ${V.line}` }}>
                    Get started
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </>
  );
}

/* ── Charity logo wall ──
   Full-bleed band of two rows drifting in opposite directions, edges dissolved
   with a mask so logos fade out rather than clip. Hovering a row pauses it and
   lifts that logo to full opacity, which is what makes the strip feel browsable
   instead of decorative. Rows share the page's entrance vocabulary (§ Reveal),
   staggered so the second row follows the first. ── */
function CharityWall() {
  return (
    <section aria-labelledby="saas-wall-title" className="relative py-[clamp(44px,5vw,76px)]"
      style={{
        borderTop: `1px solid ${V.line}`, borderBottom: `1px solid ${V.line}`,
        "--logo-gap": "clamp(38px,4.6vw,72px)",
        "--logo-h": "clamp(26px,3vw,42px)",
      }}>
      <div className="saas-shell mb-[clamp(24px,2.6vw,40px)]" style={{ paddingInline: "var(--page-pad)" }}>
        <div className="flex items-center justify-center gap-4">
          <span className="hidden h-px w-12 sm:block" style={{ background: `linear-gradient(90deg, transparent, ${V.line})` }} />
          <p id="saas-wall-title" className="text-center text-[12px] font-semibold uppercase tracking-[0.2em]" style={{ color: V.inkFaint }}>
            Built for the causes Australia already gives to
          </p>
          <span className="hidden h-px w-12 sm:block" style={{ background: `linear-gradient(270deg, transparent, ${V.line})` }} />
        </div>
      </div>

      <div className="flex flex-col gap-[clamp(20px,2.4vw,34px)]">
        {charityLogos.map((row, r) => (
          <Reveal key={r} delay={0.12 + r * 0.12}>
            <div className="saas-logorow">
              <div className={`saas-logotrack saas-logotrack--${r === 0 ? "l" : "r"}`}>
                {[0, 1].map((half) => (
                  <div key={half} className="flex shrink-0 items-center" aria-hidden={half === 1}>
                    {[...row, ...row].map((c, i) => (
                      <div key={`${half}-${i}`} className="saas-logoitem" style={{ "--logo-scale": c.scale ?? 1 }}>
                        <img
                          className="saas-logoimg"
                          src={`/logos/charities/${c.file}`}
                          /* Only the first pass of the first half is announced;
                             the repeats exist purely to fill the loop. */
                          alt={half === 0 && i < row.length ? c.name : ""}
                          loading="lazy"
                          decoding="async"
                          draggable="false"
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════ MAIN ═══════════════ */
export default function SaaSHome() {
  // Honour a "/#section" hash arriving from another page (e.g. Contact's
  // "See all FAQs" → /#faq). The features section is GSAP-pinned, which adds a
  // tall pin-spacer to the layout. We:
  //   1. refresh ScrollTrigger so the spacer is settled into the layout,
  //   2. jump INSTANTLY to the element (a smooth scroll would travel through the
  //      pinned section and get interrupted, stranding you in features/how),
  //   3. re-measure & re-jump a couple of frames later to correct for any layout
  //      shift as the pin renders at its final state.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return undefined;
    const rafs = [];
    const jump = () => {
      const el = document.getElementById(id);
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 80; // clear the fixed navbar
      window.scrollTo({ top, behavior: "auto" });
    };
    const t = setTimeout(() => {
      ScrollTrigger.refresh();
      jump();
      rafs.push(requestAnimationFrame(() => { jump(); rafs.push(requestAnimationFrame(jump)); }));
    }, 500);
    return () => { clearTimeout(t); rafs.forEach(cancelAnimationFrame); };
  }, []);

  return (
    <div
      className="saas-page"
      style={{
        fontFamily: font, background: V.bg, color: V.ink, position: "relative",
        // MUST be `clip`, not `hidden` (§4.4). `hidden` turns this into a
        // scroll container, which silently kills position:sticky anywhere
        // inside it. The "how it works" scroll-lock that first depended on
        // that is gone, but `clip` contains the hero's bleeding blooms just as
        // well and leaves sticky working for whatever gets added next.
        overflowX: "clip",
      }}>
      <style>{css}</style>

      {/* ══ HERO ══ */}
      <HeroSection />

      {/* ══ CHARITY LOGO WALL — two counter-scrolling rows ══ */}
      <CharityWall />

      {/* ══ FEATURES ══ */}
      <section id="features" aria-labelledby="saas-features-title" className="saas-section relative">
        <div className="saas-shell relative">
          <SectionHead center id="saas-features-title"
            title="One friendly home for<br/>all your fundraising."
            subtitle="From the first donation to the final thank-you, the platform handles the busywork so your team can focus on the cause." />
          <FeatureRosette />
        </div>
      </section>

      {/* ══ HOW IT WORKS — vertical timeline ══ */}
      <section id="how" aria-labelledby="saas-how-title" className="saas-section" style={{ background: V.surface2 }}>
        <div className="saas-shell">
          <SectionHead center id="saas-how-title"
            title="Three simple steps to<br/>your own donation portal."
            subtitle="From signing up to your first donation. No developers, no lead times, no waiting on anyone." />
          <StepsRibbon />
        </div>
      </section>

      {/* ══ CAMPAIGNS ══ */}
      {/* Untinted on purpose. The page alternates plain / tinted bands, and the
          plain section that used to sit between this and "How it works" is gone
          — leaving both tinted would fuse them into one band tall enough to
          read as a rendering fault rather than two sections. */}
      <section aria-labelledby="saas-campaigns-title" className="saas-section">
        <div className="saas-shell grid grid-cols-1 items-center lg:grid-cols-2" style={{ gap: "var(--gap)" }}>
          <Reveal className="order-2 lg:order-1">
            <CampaignStory />
          </Reveal>
          <Reveal delay={0.15} className="order-1 lg:order-2">
            <h2 id="saas-campaigns-title" className="saas-h2 mt-5 font-bold" style={{ color: V.ink }}>
              Campaigns supporters can <span style={{ color: V.primary }}>follow</span>.
            </h2>
            <p className="saas-lede mt-4" style={{ color: V.inkSoft }}>
              Set a goal, show live progress, and post heartfelt updates. Every donor is kept in the loop,
              so giving feels like being part of the story.
            </p>
            <ul className="mt-7 space-y-3.5">
              {[
                "Goals with live progress bars",
                "Share photo and video updates",
                "Every donor notified automatically",
                "Closing impact reports to say thank you",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px]" style={{ color: V.ink }}>
                  <span className="w-6 h-6 rounded-full grid place-items-center shrink-0 mt-0.5" style={{ background: V.surface }}>
                    <Check className="w-3.5 h-3.5" style={{ color: V.primary }} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ══ TESTIMONIALS ══ */}
      <section aria-labelledby="saas-reviews-title" className="overflow-hidden" style={{ paddingBlock: "var(--section-y)" }}>
        <div style={{ paddingInline: "var(--page-pad)" }}>
          <SectionHead center id="saas-reviews-title"
            title="Trusted by the people<br/>doing the good work." />
        </div>
        {/* Auto-scrolling marquee carousel — the list is doubled for a seamless
            loop; it pauses when hovered. Edge fades soften the in/out. */}
        <div className="relative">
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 sm:w-28" style={{ background: `linear-gradient(90deg, ${V.bg}, transparent)` }} />
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 sm:w-28" style={{ background: `linear-gradient(270deg, ${V.bg}, transparent)` }} />
          <div className="saas-marquee flex w-max py-2" style={{ animationDuration: "55s" }}>
            {[...testimonials, ...testimonials].map((t, i) => (
              <ReviewCard key={i} t={t} />
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRICING ══ */}
      <section id="pricing" aria-labelledby="saas-pricing-title" className="saas-section" style={{ background: V.surface2 }}>
        <div className="saas-shell">
          <SectionHead center id="saas-pricing-title"
            title="A plan for every charity."
            subtitle="No platform fee on donations, ever. Choose a plan, change it whenever you need." />
          <PricingCards />
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section id="faq" aria-labelledby="saas-faq-title" className="saas-section">
        <div className="mx-auto max-w-[820px]">
          <SectionHead center id="saas-faq-title"
            title="Frequently asked questions"
            subtitle="Everything you need to know about the platform and billing. Can't find what you're after? We're only a message away." />

          {/* Centred accordion */}
          <FaqList faqs={faqs} />
        </div>
      </section>

      {/* ══ CTA ══ */}
      {/* CtaSection only takes `className` — the page gutter is passed as an
          arbitrary utility rather than a style prop it would drop. */}
      <CtaSection className="px-[var(--page-pad)] pb-[clamp(64px,7vw,112px)]" primaryTo="/plans" />
    </div>
  );
}
