import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import tenantService from "../../services/tenant.service";
import {
  motion, AnimatePresence, useInView, useMotionValue, useSpring,
  useReducedMotion,
} from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Users, ArrowRight, Check,
  Palette, Target, CreditCard, Calendar,
  BarChart3,
  Landmark, MoveRight, Minus, Plus,
  X as XIcon,
} from "lucide-react";
/* Brand marks for <ToolStack/>. Simple Icons ships one monochrome path per
   brand, so these inherit `color` and sit in the page's ink until hovered —
   an <img> per logo would not. Named imports from the barrel are what
   footer.jsx already does, and Rollup tree-shakes the rest of the set out. */
import {
  SiStripe, SiPaypal, SiAmazonwebservices, SiAmazoncloudwatch, SiMongodb,
  SiVisa, SiMastercard, SiAmericanexpress,
} from "react-icons/si";
import HeroScene, { StepSetup, StepBrand, StepReceive } from "./scenes";
import ProductTour from "./ProductTour";
import CtaSection from "./CtaSection";
import {
  V, font, pageCss as css, EASE, REVEAL, RISE, Reveal, stagger, fadeUpChild,
  Btn, Chip, SectionHead,
} from "./ui";

gsap.registerPlugin(ScrollTrigger);


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


/* ── Data ── */

/* Descriptions are deliberately one tight sentence each and close to the same
   length: the cards sit in a 3-up grid with no images to absorb the difference,
   so a stray long line is what makes a row look ragged. */
const features = [
  { icon: CreditCard, kind: "donations", title: "Simple donations", desc: "One-time, monthly and instalment donations, with receipts and thank-yous sent for you." },
  { icon: Users, kind: "donors", title: "Know your donors", desc: "Every supporter in one place: giving history, contact details, the causes they care about." },
  { icon: Palette, kind: "brand", title: "Your brand, your portal", desc: "Your own web address, your logo, your colours. Donors see your charity, never us." },
  { icon: Target, kind: "campaigns", title: "Campaigns that inspire", desc: "Set a goal, watch it fill, and post updates that keep supporters close to the impact." },
  { icon: Calendar, kind: "events", title: "Events & volunteers", desc: "Run fundraisers and drives, manage sign-ups and coordinate your volunteer team." },
  { icon: BarChart3, kind: "insights", title: "Clear insights", desc: "Donations over time, recurring supporters and campaign results, all at a glance." },
];

const steps = [
  { n: "1", title: "Create your charity space", desc: "Pick a plan, choose your web address and set up your admin account. You'll be ready in a few minutes." },
  { n: "2", title: "Make it yours", desc: "Add your logo, choose your colours and launch your first campaign. No design or tech skills needed." },
  { n: "3", title: "Start receiving donations", desc: "Share your page. Donations arrive securely, receipts go out automatically, and supporters stay updated." },
];


const pricingPlans = [
  { tier: "Essentials", desc: "New and small charities. Core fundraising, one branded site, standard support.", priceNum: 499, annualNum: 399, annualTotal: 4790, features: ["Up to 3 campaigns", "Donation processing", "Donor management", "Your branded portal", "Admin dashboard"] },
  { tier: "Professional", desc: "Established charities running programs, events and recurring giving.", priceNum: 899, annualNum: 719, annualTotal: 8630, popular: true, features: ["Up to 5 campaigns", "Everything in Essentials", "Up to 10 volunteers", "Campaign updates", "Event management"] },
  { tier: "Enterprise", desc: "Multi-program organisations needing the full suite and priority support.", priceNum: 1499, annualNum: 1199, annualTotal: 14390, features: ["Unlimited campaigns", "Everything in Professional", "Unlimited volunteers", "Priority support", "Tailored onboarding"] },
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
/* ── The stack, as one drifting row ──
   Ordered by how much a charity buying this actually cares — the money first,
   then who can get in, then where it runs, then the plumbing. The row loops, so
   nothing is ever "last"; the order only decides what you see first when the
   section scrolls into view.

   Two rules for anything added here:
     1. It has to be genuinely in the build. Every entry below is a dependency
        in NGOPlatformFE/NGOPlatformBE package.json or a line item in
        INFRASTRUCTURE_COST_ANALYSIS.md. This list is a public claim about how
        the platform is run, so an aspirational one is a false one — Mailchimp
        was ripped out in 2026-06 and must never reappear here.
     2. `Icon` must be an export that EXISTS in react-icons/si. A typo is not a
        build error, it is `undefined` rendered as a component, which throws at
        runtime on the live marketing page. Amazon CloudFront is in the stack
        but has no mark in the set at all, which is why it is not in the row.
   `brand` is the mark's official hex, used only on hover — the row runs in mono
   ink until you point at one. ── */
const toolLogos = [
  { name: "Stripe", Icon: SiStripe, brand: "#635BFF" },
  { name: "PayPal", Icon: SiPaypal, brand: "#003087" },
  { name: "AWS", Icon: SiAmazonwebservices, brand: "#FF9900" },
  { name: "CloudWatch", Icon: SiAmazoncloudwatch, brand: "#FF4F8B" },
  { name: "MongoDB Atlas", Icon: SiMongodb, brand: "#47A248" },
];

/* How many times the list repeats inside ONE half of the track.
   The -50% loop translates by exactly one half, so a half NARROWER than the
   viewport leaves visible empty band at the wrap. Two passes carried a
   thirteen-mark list; at five it measures about a third of that and would have
   torn a hole in the row on anything wider than a laptop. Derived rather than
   hardcoded so the next edit to the list cannot reintroduce that. */
const ULTRAWIDE_PX = 3440; // widest viewport worth guaranteeing
// A mark, its label and the gap after it. This must be a LOW estimate: the
// division below turns it into a pass count, so guessing an item narrower than
// it really is buys extra passes, while guessing wide leaves a gap. Measured at
// ~171px on a 1440 viewport; 150 keeps the rounding on the safe side and covers
// a shorter list of short labels, where the average drops.
const APPROX_ITEM_PX = 150;
const TRACK_PASSES = Math.max(
  2,
  Math.ceil(ULTRAWIDE_PX / (toolLogos.length * APPROX_ITEM_PX)),
);

/* ── The headline's rotating last line — a slot-machine roll.
   The outgoing phrase leaves through the top of `.saas-hero-mask` while the
   incoming one arrives from below it AT THE SAME TIME. That simultaneity is
   the whole point: with AnimatePresence mode="wait" the exit ran to completion
   before the next phrase mounted, so the line sat visibly EMPTY for half a
   second on every swap — which is what read as the headline buffering. Both
   phrases live in the one grid cell, so overlapping them costs no layout.

   Two more things this depends on, neither of which is optional:
     • `.saas-hero-mask` (ui.jsx) supplies the clip. It used to be referenced
       here and defined nowhere, so the phrases simply flew in over the chip
       above and the lede below instead of rolling out from behind an edge.
     • the gradient fill sits on a STATIC child of the moving span, never on
       the moving span itself — background-clip:text on a transforming element
       makes the browser re-rasterise the gradient every frame, and that is
       what made the swap shimmer and drop frames.

   The rotation is decorative: the <h1> carries a static aria-label, so this
   whole span is aria-hidden. ── */
const PHRASE_INK = {
  backgroundImage:
    "linear-gradient(100deg, var(--tenant-accent-light, #059669) 0%, var(--tenant-accent, #047857) 58%, var(--pf-accent-2, #065F46) 100%)",
};
/* 120%, not 100%: the mask is a tenth of an em taller than the line it clips
   (the padding that saves the descenders of "good." and "grow"), and the ink
   itself hangs past the line box, so a phrase has to travel further than its
   own height to be completely out of sight. 107% clears the top edge and 96%
   clears the bottom one; the rest is margin for a fallback face with deeper
   metrics than Outfit. */
const ROLL = 120;

function RotatingPhrase({ phrases, hold = 3200 }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.4 });
  const [i, setI] = useState(0);

  /* The timer runs only while the line is on screen AND the tab is in front.
     setInterval keeps ticking in a hidden tab while requestAnimationFrame does
     not, so leaving it running meant returning to a queue of swaps that all
     resolved at once — a burst of half-finished rolls. */
  useEffect(() => {
    if (reduce || !inView) return undefined; // reduced motion → frozen on the first phrase
    let id = 0;
    const start = () => { if (!id) id = window.setInterval(() => setI((v) => (v + 1) % phrases.length), hold); };
    const stop = () => { window.clearInterval(id); id = 0; };
    const onVisibility = () => (document.hidden ? stop() : start());
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => { stop(); document.removeEventListener("visibilitychange", onVisibility); };
  }, [reduce, inView, hold, phrases.length]);

  return (
    <span ref={ref} aria-hidden className="saas-hero-mask saas-hero-rotate relative inline-grid align-bottom">
      {/* Width holder: EVERY phrase, stacked invisibly in the one grid cell, so
          the column is as wide as the widest RENDERED phrase. Picking the
          holder by string length was wrong in a proportional face — character
          count is not width — and the centred headline twitched on the swaps
          where the guess came up short. */}
      {phrases.map((p) => (
        <span key={p} className="invisible col-start-1 row-start-1 whitespace-nowrap">{p}</span>
      ))}
      <AnimatePresence initial={false}>
        <motion.span
          key={phrases[i]}
          className="col-start-1 row-start-1 whitespace-nowrap"
          style={{ willChange: "transform" }}
          initial={reduce ? { opacity: 0 } : { y: `${ROLL}%` }}
          animate={reduce ? { opacity: 1 } : { y: "0%" }}
          exit={reduce ? { opacity: 0 } : { y: `-${ROLL}%` }}
          transition={{ duration: reduce ? 0.2 : 0.66, ease: EASE }}
        >
          <span className="block bg-clip-text text-transparent" style={PHRASE_INK}>{phrases[i]}</span>
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
   behind a mask and its closing line rotates through four promises. Everything
   stops under prefers-reduced-motion, and the section keeps `data-hero` so the
   navbar collapse still measures against it. ── */
const heroPhrases = ["do more good.", "raise more funds.", "reach more donors.", "grow with ease."];
const heroWords = ["Help", "your", "charity"];

function HeroSection() {
  const reduce = useReducedMotion();

  return (
    <section
      data-hero
      aria-labelledby="saas-hero-title"
      className="relative overflow-hidden"
      style={{ background: V.bg, color: V.ink }}
    >
      <div
        className="relative z-10 mx-auto w-full max-w-[min(1180px,94vw)] pb-[clamp(24px,4vh,48px)] pt-[clamp(112px,15vh,168px)] text-center"
        style={{ paddingInline: "var(--page-pad)" }}
      >
        <motion.div initial={{ opacity: 0, y: RISE }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: REVEAL, delay: 0.05, ease: EASE }}>
          <Chip>The complete platform for charities</Chip>
        </motion.div>

        {/* Words rise from behind their own clipping mask, then the last line
            takes over and keeps rotating. */}
        <h1 id="saas-hero-title" className="saas-h1 mt-7 font-bold" aria-label="Help your charity do more good."
          style={{ color: V.ink }}>
          <span className="block">
            {heroWords.map((w, i) => (
              <span key={w} className="saas-hero-mask inline-block align-bottom" aria-hidden>
                <motion.span className="inline-block" style={{ willChange: "transform" }}
                  initial={reduce ? { opacity: 0 } : { y: `${ROLL}%` }}
                  animate={reduce ? { opacity: 1 } : { y: "0%" }}
                  transition={{ duration: reduce ? 0.3 : 0.78, delay: 0.14 + i * 0.08, ease: EASE }}>
                  {/* NON-BREAKING space on purpose: a plain trailing space at the
                      end of an inline-block collapses and the words collide. */}
                  {w}{i < heroWords.length - 1 ? " " : ""}
                </motion.span>
              </span>
            ))}
          </span>
          <motion.span className="mt-[.06em] block" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.44, ease: EASE }}>
            <RotatingPhrase phrases={heroPhrases} />
          </motion.span>
        </h1>

        <motion.p className="saas-lede mx-auto mt-6" style={{ color: V.inkSoft }}
          initial={{ opacity: 0, y: RISE }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: REVEAL, delay: 0.5, ease: EASE }}>
          Your own donation website, on your own web address, taking donations through your own
          Stripe account. Live in a week.
        </motion.p>

        <motion.div className="mt-9 flex flex-wrap items-center justify-center gap-3"
          initial={{ opacity: 0, y: RISE }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: REVEAL, delay: 0.62, ease: EASE }}>
          <MagneticBtn as="link" to="/plans"
            className="inline-flex items-center rounded-full px-8 py-3.5 text-[15px] font-semibold text-white"
            style={{ background: V.primary }}>
            Start your charity portal
          </MagneticBtn>
          <Btn href="#how" tone="ghost">See how it works</Btn>
        </motion.div>
      </div>

      {/* The scene's foreground band is the primary colour and runs off the
          bottom edge, so it continues into <StoryBand/> with no seam. Nothing
          may be inserted between the two. */}
      <motion.div className="relative -mb-px"
        initial={reduce ? false : { opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.28, ease: EASE }}>
        <HeroScene />
      </motion.div>
    </section>
  );
}

/* ── The band the hero's foreground colour runs into.
   Filled edge-to-edge in the primary colour so it continues the bottom of
   <HeroScene/> with no seam. Carries the three things a charity board actually
   asks about. ── */
const proofPoints = [
  { title: "Your Stripe, your donors", body: "Donations land in your account, and the donor list is yours to export whenever you like." },
  { title: "Hosted in Sydney", body: "Australian donor data stays in Australia. Your board will ask; the answer is yes." },
  { title: "No platform fee", body: "We never take a cut of a donation. Stripe's processing fee is the only deduction." },
];

function StoryBand() {
  return (
    <section className="relative overflow-hidden" style={{ background: V.ink, color: "#fff" }}>
      <div className="saas-shell relative py-[clamp(48px,6vw,88px)]" style={{ paddingInline: "var(--page-pad)" }}>
        <Reveal>
          <h2 className="max-w-[18ch] text-[clamp(26px,3.4vw,44px)] font-bold leading-[1.1] tracking-tight">
            The whole thing, with your name on it.
          </h2>
        </Reveal>

        <motion.div className="mt-[clamp(32px,4vw,56px)] grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3"
          variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
          {proofPoints.map((p, i) => (
            <motion.div key={p.title} custom={i} variants={fadeUpChild}>
              <span aria-hidden className="mb-4 block h-[3px] w-9 rounded-full" style={{ background: V.primary }} />
              <h3 className="text-[17px] font-semibold">{p.title}</h3>
              <p className="mt-2 max-w-[34ch] text-[14.5px] leading-relaxed" style={{ color: "rgba(255,255,255,.6)" }}>
                {p.body}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ── Features — six compact cards.
   This section used to render a bespoke mini-mockup of the product inside
   every card (a donation form, a donor list, a branded portal, a campaign bar,
   an events list, a bar chart). It was the tallest block on the page by a wide
   margin and, because each mockup carried its own gradients and tinted panels,
   it was also the loudest — six little colour schemes stacked under a heading
   that only promises "one home". The cards now carry the one thing that block
   was there to say, and the page keeps to its two backgrounds.
   Icon tile / topline / hover-lift are the shared card vocabulary from ui.jsx,
   so nothing here is a one-off treatment. ── */
function FeatureCards() {
  return (
    <motion.div className="mt-[clamp(32px,3.4vw,52px)] grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
      {features.map((f, i) => (
        <motion.div key={f.kind} custom={i} variants={fadeUpChild}
          className="saas-card relative flex flex-col overflow-hidden rounded-[24px] p-6"
          style={{ background: V.surface, border: `1px solid ${V.line}` }}>
          <span aria-hidden className="saas-topline pointer-events-none absolute inset-x-0 top-0 h-[3px]"
            style={{ background: `linear-gradient(90deg, ${V.primary}, ${V.glow})` }} />
          <span className="saas-ic grid h-11 w-11 place-items-center rounded-full"
            style={{ background: V.surface2, color: V.primary, border: `1px solid ${V.line}` }}>
            <f.icon className="h-5 w-5" />
          </span>
          <h3 className="mt-4 text-[17px] font-semibold" style={{ color: V.ink }}>{f.title}</h3>
          <p className="mt-2 text-[14.5px] leading-relaxed" style={{ color: V.inkSoft }}>{f.desc}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}

/* ── How it works — three drawn steps, same hand as the hero. ── */
const stepScenes = [StepSetup, StepBrand, StepReceive];

function StepCards() {
  return (
    <motion.div className="mt-[clamp(36px,4vw,60px)] grid gap-5 md:grid-cols-3"
      variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
      {steps.map((st, i) => {
        const Scene = stepScenes[i];
        return (
          <motion.div key={st.n} custom={i} variants={fadeUpChild}
            className="overflow-hidden rounded-[24px]"
            style={{ background: V.surface, border: `1px solid ${V.line}` }}>
            {Scene && <Scene className="block h-auto w-full" />}
            <div className="p-6 pt-1">
              <div className="flex items-baseline gap-3">
                <span className="text-[13px] font-bold" style={{ color: V.primary }}>{`0${st.n}`}</span>
                <h3 className="text-[17px] font-semibold" style={{ color: V.ink }}>{st.title}</h3>
              </div>
              <p className="mt-2.5 text-[14.5px] leading-relaxed" style={{ color: V.inkSoft }}>{st.desc}</p>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
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
      onUpdate: () => { if (node) node.textContent = "A$" + Math.round(obj.v).toLocaleString("en-AU"); } });
    prev.current = value;
    return () => tween.kill();
     
  }, [inView, value]);
  return <span ref={ref} className={className} style={style}>{"$" + value.toLocaleString("en-US")}</span>;
}

// Builds a Figma-style comparison MATRIX across every tier from the existing
// "own features + Everything in <cheaper tier>" plan data: every card ends up
// listing the SAME full feature set, ticked where that tier includes it (its
// own, or inherited from a cheaper tier) and crossed out where it doesn't —
// instead of each card only listing its own short slice.
// Capped to each tier's first `maxPerTier` own features — a full union across
// real, DB-configured plans ran to 12-14 rows (every plan repeating the SAME
// long list, just checked/crossed differently), which read as noise, not a
// comparison. Slicing per tier keeps the matrix meaningful — every card still
// shows a few of ITS OWN distinguishing features — while bounding the total.
function buildFeatureMatrix(sortedPlans, maxPerTier = 3) {
  const ownByTier = sortedPlans.map((p) => (p.features || []).filter((f) => !f.startsWith("Everything in ")).slice(0, maxPerTier));
  const master = [];
  const seen = new Set();
  ownByTier.forEach((list) => list.forEach((f) => { if (!seen.has(f)) { seen.add(f); master.push(f); } }));
  const cumulative = [];
  const running = new Set();
  ownByTier.forEach((list) => {
    list.forEach((f) => running.add(f));
    cumulative.push(new Set(running));
  });
  return { master, cumulative };
}

/* ── Pricing grid with a real Monthly/Yearly SWITCH (not a segmented pill) and
   a hand-drawn "Save 20%" callout doodling back at it; the popular plan is a
   solid brand-fill card among two plain ones, and every card lists the full
   feature matrix (check / cross) so the tiers compare at a glance. ── */
function PricingCards() {
  const [billing, setBilling] = useState("monthly");
  const [dbPlans, setDbPlans] = useState(null); // null = loading
  const annual = billing === "annual";
  const reduce = useReducedMotion();

  useEffect(() => {
    tenantService
      .getPublicPlans()
      .then((res) => setDbPlans(Array.isArray(res.data) ? res.data : []))
      .catch(() => setDbPlans([]));
  }, []);

  // Live plans drive the section; curated defaults show while loading / if none.
  const cards = dbPlans && dbPlans.length ? dbPlans.map(mapHomePlan) : pricingPlans;
  const sortedCards = [...cards].sort((a, b) => a.priceNum - b.priceNum);
  const { master, cumulative } = buildFeatureMatrix(sortedCards);

  return (
    <>
      {/* Billing switch */}
      <div className="mb-10 flex justify-center">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setBilling("monthly")} className="text-[14.5px] font-semibold transition-colors" style={{ color: annual ? V.inkFaint : V.ink }}>
            Pay Monthly
          </button>
          <button type="button" role="switch" aria-checked={annual} aria-label="Toggle yearly billing"
            onClick={() => setBilling(annual ? "monthly" : "annual")}
            className="relative h-7 w-[50px] shrink-0 rounded-full transition-colors duration-300"
            style={{ background: annual ? V.primary : "rgba(var(--tenant-primary-rgb),.2)" }}>
            <motion.span aria-hidden className="absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-md"
              animate={{ left: annual ? 25 : 3 }} transition={{ type: "spring", stiffness: 500, damping: 32 }} />
          </button>
          <button type="button" onClick={() => setBilling("annual")} className="text-[14.5px] font-semibold transition-colors" style={{ color: annual ? V.ink : V.inkFaint }}>
            Pay Yearly
          </button>
          {/* Hand-drawn arrow curling back from "Save 20%" to point at the
              switch — the shaft draws itself in once scrolled into view, the
              chevron tip follows a beat later, then a slow, gentle nudge keeps
              it alive so it reads as a live annotation, not static art. */}
          <motion.span aria-hidden className="ml-1 hidden -rotate-6 flex-col items-start sm:flex"
            initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: reduce ? 0.01 : 0.5, ease: EASE }}>
            <motion.svg width="48" height="30" viewBox="0 0 48 30" fill="none"
              animate={reduce ? undefined : { y: [0, -3, 0] }}
              transition={reduce ? undefined : { duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 1 }}>
              {/* shaft: a shallow rise from "Save 20%" that levels out into a
                  near-horizontal run LEFT toward the switch — not a tall arc,
                  so the ending direction actually reads as "pointing left"
                  instead of "pointing up". */}
              <motion.path d="M42 24C30 10 18 6 6 10" stroke={V.primary} strokeWidth="2" strokeLinecap="round" fill="none"
                initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: reduce ? 0.01 : 0.9, delay: reduce ? 0 : 0.15, ease: EASE }} />
              {/* chevron tip: wings splay well away from the shaft's own
                  (shallow) approach angle, so they read as a distinct
                  arrowhead instead of the shaft just hooking back on itself. */}
              <motion.path d="M14 4L6 10L13 16" stroke={V.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"
                initial={{ pathLength: 0, opacity: 0 }} whileInView={{ pathLength: 1, opacity: 1 }} viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: reduce ? 0.01 : 0.3, delay: reduce ? 0 : 1, ease: EASE }} />
            </motion.svg>
            <span className="-mt-1 whitespace-nowrap text-[13px] font-bold" style={{ color: V.primary }}>Save 20%</span>
          </motion.span>
        </div>
      </div>

      {/* Cards — the popular plan is a solid brand-fill card, matched in height
          to its two plain neighbours; every card carries the SAME feature
          matrix, ticked or crossed for that tier. */}
      <motion.div className="grid grid-cols-1 items-stretch gap-5 pt-3 md:grid-cols-3"
        initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger}>
        {sortedCards.map((plan, i) => {
          // Show the ACTUAL price for the selected cycle: the yearly total when
          // annual is on, the monthly price otherwise (per-month equiv goes below).
          const bigPrice = annual ? plan.annualTotal : plan.priceNum;
          const included = cumulative[i];
          const pop = plan.popular;
          return (
            <motion.div key={plan.code || plan.tier} variants={fadeUpChild} custom={i}
              className={`relative h-full ${pop ? "md:-translate-y-4 md:z-10" : ""}`}>
              {/* Ambient halo behind the popular card only — a soft breathing
                  bloom that bleeds past the card's own edge so the tier reads
                  as lit, not just dark. Sits OUTSIDE the card's overflow-hidden
                  box (a sibling, not a child) or it would clip itself away. */}
              {pop && (
                <motion.span aria-hidden className="pointer-events-none absolute -inset-5 -z-10 rounded-[30px] blur-2xl"
                  style={{ background: "radial-gradient(65% 65% at 50% 28%, rgba(var(--tenant-accent-rgb),.55), transparent 72%)" }}
                  animate={reduce ? undefined : { opacity: [0.55, 0.9, 0.55], scale: [1, 1.06, 1] }}
                  transition={reduce ? undefined : { duration: 4, repeat: Infinity, ease: "easeInOut" }} />
              )}
              {/* Same rounded-2xl + overflow-hidden + border treatment on every
                  card, popular one included, so the row's corners and edges
                  read as one consistent shape, not one card cut differently. */}
              <div className={`relative flex h-full flex-col overflow-hidden rounded-2xl p-6 ${pop ? "" : "saas-card"}`}
                style={pop
                  ? { background: `linear-gradient(165deg, ${V.ink}, ${V.primary})`, border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 30px 60px -22px rgba(var(--tenant-accent-rgb),.6), 0 0 60px -12px rgba(var(--tenant-accent-rgb),.45)" }
                  : { background: V.surface, border: `1px solid ${V.line}` }}>
                {!pop && <span aria-hidden className="saas-topline pointer-events-none absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${V.primary}, ${V.glow})` }} />}

                <div className="text-[18px] font-bold" style={{ color: pop ? "#fff" : V.ink }}>{plan.tier}</div>
                <div className="mt-1.5 text-[13px] leading-relaxed" style={{ color: pop ? "rgba(255,255,255,.75)" : V.inkSoft }}>{plan.desc}</div>

                <div className="mt-5 flex items-baseline gap-1.5">
                  <RollingPrice value={bigPrice} className="text-[32px] font-bold tracking-tight" style={{ color: pop ? "#fff" : V.ink }} />
                  <span className="text-[13.5px]" style={{ color: pop ? "rgba(255,255,255,.65)" : V.inkFaint }}>{annual ? "/ year" : "/ month"}</span>
                </div>
                <AnimatePresence initial={false}>
                  {annual && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                      <div className="mt-1 text-[12px]" style={{ color: pop ? "rgba(255,255,255,.7)" : V.inkFaint }}>
                        ≈ A${plan.annualNum.toLocaleString("en-AU")}/mo · billed yearly
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Link to={`/register?plan=${plan.code || plan.tier.toLowerCase()}&billing=${billing}`}
                  className="group mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] font-semibold transition-all"
                  style={pop
                    ? { background: "rgba(255,255,255,.14)", color: "#fff", border: "1.5px solid rgba(255,255,255,.55)" }
                    : { background: "transparent", color: V.primary, border: `1.5px solid ${V.primary}` }}>
                  Get Started Now
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>

                <ul className="mt-4 flex-1 space-y-2 border-t pt-4" style={{ borderColor: pop ? "rgba(255,255,255,.16)" : V.line }}>
                  {master.map((f) => {
                    const has = included.has(f);
                    return (
                      <li key={f} className="flex items-center gap-2.5 text-[12.5px]"
                        style={{ color: pop ? (has ? "rgba(255,255,255,.92)" : "rgba(255,255,255,.4)") : (has ? V.inkSoft : V.inkFaint) }}>
                        <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full"
                          style={{ background: pop ? "rgba(255,255,255,.18)" : (has ? "rgba(var(--tenant-accent-rgb),.14)" : "rgba(var(--tenant-primary-rgb),.07)") }}>
                          {has
                            ? <Check className="h-2.5 w-2.5" strokeWidth={3} style={{ color: pop ? "#fff" : V.primary }} />
                            : <XIcon className="h-2.5 w-2.5" strokeWidth={3} style={{ color: pop ? "rgba(255,255,255,.55)" : V.inkFaint }} />}
                        </span>
                        {f}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="mt-10 text-center">
        <Link to="/plans" className="group inline-flex items-center gap-1.5 text-[14px] font-semibold" style={{ color: V.ink }}>
          Compare every plan &amp; feature in detail
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>
    </>
  );
}

/* ── The tool stack ──
   Same band the charity logo wall used to be: a caption, then one row drifting
   left forever, its edges dissolved by a mask so marks fade out rather than
   clip at the viewport edge. What changed is what is in the row — brands we
   actually build on, which needs no "these are not our customers" disclaimer.

   Each item is a mark AND its name, where the charity wall was marks alone.
   Those were wordmarks that read at a glance; a Simple Icons glyph is a bare
   monochrome symbol, and CloudWatch's in particular is unrecognisable without
   the label beside it.

   No `saas-seam`: the dark story band directly above IS the separator, and a
   hairline drawn a pixel under a colour block reads as an artefact. The
   features section below carries the next one. ── */
function ToolStack() {
  return (
    <section id="stack" aria-labelledby="saas-stack-title" className="relative py-[clamp(44px,5vw,76px)]">
      <div className="saas-shell mb-[clamp(24px,2.6vw,40px)]" style={{ paddingInline: "var(--page-pad)" }}>
        <div className="flex items-center justify-center gap-4">
          <span className="hidden h-px w-12 sm:block" style={{ background: `linear-gradient(90deg, transparent, ${V.line})` }} />
          <p id="saas-stack-title" className="text-center text-[12px] font-semibold uppercase tracking-[0.2em]" style={{ color: V.inkFaint }}>
            The tools your site, your data and your donations run on
          </p>
          <span className="hidden h-px w-12 sm:block" style={{ background: `linear-gradient(270deg, transparent, ${V.line})` }} />
        </div>
      </div>

      <Reveal delay={0.12}>
        <div className="saas-logorow">
          <div className="saas-logotrack saas-logotrack--l">
            {[0, 1].map((half) => (
              /* Two halves, each holding TRACK_PASSES copies of the list, so one
                 half always out-measures the viewport and the -50% loop never
                 shows a gap. Only the first pass of the first half is exposed to
                 assistive tech; the rest exist purely to fill the band. */
              <div key={half} className="flex shrink-0 items-center" aria-hidden={half === 1}>
                {Array.from({ length: TRACK_PASSES }, () => toolLogos).flat().map(({ name, Icon, brand }, i) => (
                  <span key={`${half}-${i}`} className="saas-tool" style={{ "--tool-brand": brand }}
                    aria-hidden={half === 0 && i < toolLogos.length ? undefined : true}>
                    <Icon aria-hidden="true" focusable="false" />
                    <span>{name}</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ══════════════════ WAYS TO GIVE ══════════════════
   A working donation plan, not a picture of one. The reader sets the amount and
   the plan; the schedule on the right recalculates with real dates and real
   figures. It demonstrates itself once through the three plans, then hands over
   the moment anyone touches a control and never moves on its own again.

   Every number is the product's, not a brochure's:
     the three plans are Order.paymentType's enum, "single" | "recurring" |
       "installments" (NGOPlatformBE/models/order.js)
     recurring really does offer daily, weekly, monthly and yearly, plus a
       billing day and an optional end date (checkout/constants.js FREQ_OPTIONS
       and PaymentPlanSelector.jsx), and the backend validates that same list
     instalments really are equal monthly payments with the first taken today,
       and the 1 to 12 bound is enforced server side in orderContrller.js
   If any of those change, this section is wrong and has to move with them. The
   standing rule for it: nothing goes in that cannot be pointed at in the code.

   Spelling is "instalment", Australian English (DESIGN_GUIDELINES 11.3), which
   matches <FeatureCards/> above. FAQPage.jsx still says "installments", as does
   the donor checkout. Worth aligning, but not from here. ── */

const money = (n) => `$${n.toLocaleString("en-AU", {
  minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2,
})}`;

/* Add whole months without the end-of-month trap: setMonth(+1) from the 31st
   lands in the month AFTER next (31 Jan + 1 = 3 Mar), which silently drops a
   month out of the schedule for three days of every month. Building the date
   from parts and clamping the day is the only version that survives that. */
const addMonths = (base, n) => {
  const y = base.getFullYear();
  const m = base.getMonth() + n;
  const lastDayOfTarget = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(base.getDate(), lastDayOfTarget));
};

const TODAY = new Date();
const RAIL_MONTHS = 12;
/* The rail is twelve months starting with the CURRENT one, so the schedule on
   screen is the schedule a donor would get if they set it up today. */
const MONTHS = Array.from({ length: RAIL_MONTHS }, (_, i) => addMonths(TODAY, i));
const shortMonth = (d) => d.toLocaleDateString("en-AU", { month: "short" });
// Twelve "Sept"/"Mar" labels collide below about 500px of rail. Both forms are
// rendered and CSS picks one, which is cheaper and steadier than measuring.
const initial = (d) => d.toLocaleDateString("en-AU", { month: "narrow" });
const fullDate = (d) => d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
const dayMonth = (d) => d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });

/* perYear is how many charges land inside the twelve-month window, which is
   what the rail draws. Past twelve there are more charges than columns, so the
   marks stop being dots and become a comb (see .saas-give__comb). */
const FREQS = [
  { id: "day", label: "day", perYear: 365 },
  { id: "week", label: "week", perYear: 52 },
  { id: "month", label: "month", perYear: 12 },
  { id: "year", label: "year", perYear: 1 },
];

const PLANS = [
  { id: "single", label: "All at once" },
  { id: "recurring", label: "On a schedule" },
  { id: "installments", label: "Split it up" },
];

const MIN_SPLIT = 2;   // one instalment is just a one-off; the backend allows it, a demo of it says nothing
const MAX_SPLIT = 12;  // the server-side bound in orderContrller.js
const DWELL_MS = 5600; // the dwell the --p clock in ui.jsx is a view of

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function GivingModes() {
  const reduced = useReducedMotion();
  const [amount, setAmount] = useState(600);
  const [text, setText] = useState("600");     // what is actually in the field
  const [plan, setPlan] = useState("single");
  const [freq, setFreq] = useState("month");
  const [split, setSplit] = useState(6);
  const [hover, setHover] = useState(null);    // rail column under the pointer
  // Set by the first interaction and never unset. Once a reader has started
  // driving this, moving it under them is the rudest thing it could do.
  const [pinned, setPinned] = useState(false);

  const rootRef = useRef(null);
  const railRef = useRef(null);
  const optsRef = useRef([]);
  const pausedRef = useRef(false);
  const progRef = useRef(0);
  const dragRef = useRef(false);

  /* One rAF loop drives both the dwell and the rule that shows it, by writing
     --p on the root and reading it back in CSS. A CSS keyframe clock can be
     paused by the pointer but cannot be RESTARTED from where JS thinks it is,
     so the two drifted apart after the first hover; with the progress held here
     there is one clock and the rule is a view of it.
     Reduced motion removes the loop rather than speeding it up. A panel that
     rearranges itself on a timer is precisely what that setting asks us not to
     do. */
  useEffect(() => {
    if (reduced || pinned) return undefined;
    const el = rootRef.current;
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const dt = now - last;
      last = now;
      if (!pausedRef.current) {
        progRef.current += dt / DWELL_MS;
        if (progRef.current >= 1) {
          // Zero the rule in the SAME frame we advance, or the incoming row
          // inherits a full one for a frame and it reads as a stutter.
          progRef.current = 0;
          el?.style.setProperty("--p", "0");
          setPlan((p) => PLANS[(PLANS.findIndex((x) => x.id === p) + 1) % PLANS.length].id);
        } else {
          el?.style.setProperty("--p", String(progRef.current));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, pinned]);

  const pin = () => {
    if (pinned) return;
    setPinned(true);
    progRef.current = 0;
    rootRef.current?.style.setProperty("--p", "0");
  };

  const choose = (id) => { setPlan(id); pin(); };

  // Roving tabindex with automatic selection, the radiogroup pattern the rest
  // of the site follows (DESIGN_GUIDELINES 10).
  const onKeyDown = (e) => {
    const at = PLANS.findIndex((p) => p.id === plan);
    const last = PLANS.length - 1;
    const to = {
      ArrowDown: at === last ? 0 : at + 1, ArrowRight: at === last ? 0 : at + 1,
      ArrowUp: at === 0 ? last : at - 1, ArrowLeft: at === 0 ? last : at - 1,
      Home: 0, End: last,
    }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    choose(PLANS[to].id);
    optsRef.current[to]?.focus();
  };

  const onAmount = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 7);
    setText(digits);
    setAmount(digits ? parseInt(digits, 10) : 0);
    pin();
  };
  // An empty or zero field would print "$0 today" and divide by nothing, so the
  // field takes itself back to something sensible when the reader leaves it.
  const onAmountBlur = () => {
    if (amount >= 1) { setText(String(amount)); return; }
    setAmount(50);
    setText("50");
  };

  const bumpSplit = (by) => {
    setSplit((n) => Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, n + by)));
    pin();
  };

  /* ── what the plan actually is ── */
  const freqDef = FREQS.find((f) => f.id === freq);
  const charges = plan === "single" ? 1 : plan === "recurring" ? freqDef.perYear : split;
  const perCharge = plan === "installments" ? amount / split : amount;
  const asDots = charges <= RAIL_MONTHS;   // past twelve there are more charges than columns
  const openEnded = plan === "recurring";  // no end date unless the donor sets one

  const summary = plan === "single"
    ? `One payment of ${money(amount)}, today.`
    : plan === "recurring"
      ? `${money(amount)} every ${freqDef.label}, for as long as they choose.`
      : `${money(perCharge)} a month for ${plural(split, "month")}. ${money(amount)} in total.`;

  const footnote = plan === "single"
    ? "Nothing else is scheduled. The receipt goes out on its own."
    : plan === "recurring"
      ? `${plural(charges, "payment")} in the first year. They pick the billing day, and they can change or stop it whenever they like.`
      : `Paid in full on ${fullDate(addMonths(TODAY, split - 1))}. Any number of monthly payments up to ${MAX_SPLIT}.`;

  // What each lit dot is worth. The three plans deliberately say three different
  // things: a one-off shows the whole gift, a schedule repeats the same figure
  // (every third dot, because twelve identical labels is noise rather than
  // information), and a split plan counts UP to the total, which is the one
  // thing the dots alone cannot tell you.
  const dotAmount = (i) => {
    if (i >= charges) return null;
    if (plan === "installments") return money(perCharge * (i + 1));
    if (plan === "recurring") return i % 3 === 0 ? money(perCharge) : null;
    return money(perCharge);
  };

  const colFromX = (clientX) => {
    const r = railRef.current?.getBoundingClientRect();
    if (!r || !r.width) return 0;
    const t = (clientX - r.left) / r.width;
    return Math.min(RAIL_MONTHS - 1, Math.max(0, Math.floor(t * RAIL_MONTHS)));
  };

  /* Dragging the rail sets the number of instalments. It is a pointer-only
     nicety on top of the stepper, which is the control that actually carries
     the semantics: the rail is aria-hidden, so nothing here is the only way to
     reach the value. */
  const canDrag = plan === "installments";
  const onRailDown = (e) => {
    if (!canDrag) return;
    dragRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setSplit(Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, colFromX(e.clientX) + 1)));
    pin();
  };
  const onRailMove = (e) => {
    const col = colFromX(e.clientX);
    setHover(col);
    if (dragRef.current) setSplit(Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, col + 1)));
  };
  const endDrag = () => { dragRef.current = false; };

  // framer-motion animates inline styles from JS, which the page-wide
  // prefers-reduced-motion reset in ui.jsx cannot reach: that block only
  // neutralises CSS animation and transition. Every transition here opts out of
  // its own accord.
  const dur = (s) => (reduced ? 0 : s);

  return (
    <div
      ref={rootRef}
      className="saas-give mt-[clamp(32px,3.4vw,52px)] rounded-[24px]"
      data-pinned={pinned || reduced ? "true" : "false"}
      style={{ background: V.surface, border: `1px solid ${V.line}` }}
      onPointerEnter={() => { pausedRef.current = true; }}
      onPointerLeave={() => { pausedRef.current = false; }}
      onFocusCapture={() => { pausedRef.current = true; }}
      onBlurCapture={() => { pausedRef.current = false; }}
    >
      {/* ── the form ── */}
      <div>
        <label className="saas-give__lbl" htmlFor="saas-give-amount">A donor gives</label>
        <div className="saas-give__amt">
          <span className="saas-give__cur" aria-hidden="true">$</span>
          <input
            id="saas-give-amount"
            className="saas-give__amtin rounded-none"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label="Donation amount in dollars"
            value={text}
            onChange={onAmount}
            onBlur={onAmountBlur}
            /* Sized from the value so the rule underneath tracks the number
               rather than sitting under empty space. */
            style={{ width: `${Math.max(2, text.length)}ch` }}
          />
        </div>

        <div className="saas-give__opts" role="radiogroup"
          aria-label="How the donation is paid" onKeyDown={onKeyDown}>
          {PLANS.map((p, i) => {
            const on = p.id === plan;
            return (
              <div key={p.id} className="saas-give__row" data-on={on ? "true" : "false"}>
                <button
                  ref={(el) => { optsRef.current[i] = el; }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={on ? 0 : -1}
                  className="saas-give__opt rounded-none"
                  onClick={() => choose(p.id)}
                >
                  {p.label}
                </button>
                <span aria-hidden="true" className="saas-give__clock"><i /></span>

                {on && p.id === "recurring" && (
                  <span className="saas-give__sub">
                    Every
                    <span className="saas-give__freq">
                      {FREQS.map((f) => (
                        <button key={f.id} type="button" className="saas-give__freqbtn rounded-full"
                          aria-pressed={f.id === freq}
                          onClick={() => { setFreq(f.id); pin(); }}>
                          {f.label}
                        </button>
                      ))}
                    </span>
                  </span>
                )}

                {on && p.id === "installments" && (
                  <span className="saas-give__sub">
                    <button type="button" className="saas-give__stepbtn rounded-full"
                      onClick={() => bumpSplit(-1)} disabled={split <= MIN_SPLIT}
                      aria-label="One fewer payment">
                      <Minus aria-hidden="true" />
                    </button>
                    <span className="saas-give__stepval" aria-live="polite">{split}</span>
                    <button type="button" className="saas-give__stepbtn rounded-full"
                      onClick={() => bumpSplit(1)} disabled={split >= MAX_SPLIT}
                      aria-label="One more payment">
                      <Plus aria-hidden="true" />
                    </button>
                    payments
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── what that produces ── */}
      <div className="saas-give__out">
        {/* Keyed on everything that can change it, so React swaps the line
            outright and framer plays an ENTRANCE only. An AnimatePresence exit
            would leave the row visibly empty mid-swap, the same trap
            <RotatingPhrase/> fell into. */}
        <motion.p key={`${plan}-${freq}-${split}-${amount}`} className="saas-give__sum"
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur(0.35), ease: EASE }}>
          {summary}
        </motion.p>

        {/* The rail is a picture of the sentence above it, so it is hidden from
            assistive tech entirely: twelve dots and twelve month names read
            aloud is noise, and the two lines around it already say the same
            thing in words. */}
        <div ref={railRef} className="saas-give__rail" aria-hidden="true"
          data-drag={canDrag ? "true" : "false"}
          onPointerDown={onRailDown} onPointerMove={onRailMove} onPointerUp={endDrag}
          onPointerCancel={endDrag} onPointerLeave={() => { endDrag(); setHover(null); }}>
          <div className="saas-give__marks">
            <span className="saas-give__line" />

            {/* The keys are load-bearing. Without them React reconciles these
                two as the same motion.span, framer keeps the motion values it
                already had, and the comb inherited the rule's scaleX: a one-off
                plan leaves it at 0, so switching to weekly drew a comb exactly
                zero pixels wide. */}
            {asDots ? (
              <motion.span key="span" className="saas-give__span"
                initial={false}
                animate={{ scaleX: openEnded ? 1 : (charges - 1) / (RAIL_MONTHS - 1) }}
                transition={{ duration: dur(0.7), ease: EASE }} />
            ) : (
              <motion.span key="comb" className="saas-give__comb"
                /* A 1px tooth every ~3px is a beat pattern, not a comb: at
                   1x the ink lands on pixel N for some periods and N+1 for the
                   next, and the row bands. A fractional tooth is antialiased
                   per period and the banding goes with it. */
                style={{ "--comb-gap": `${100 / charges}%`, "--comb-ink": charges > 60 ? "1.6px" : "1px" }}
                initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                transition={{ duration: dur(0.7), ease: EASE }} />
            )}

            {asDots && MONTHS.map((d, i) => {
              const lit = i < charges;
              return (
                /* Lit dots arrive left to right behind the rule drawing under
                   them; unlit ones drop out at once, so a shorter plan reads as
                   "it stops here" rather than as a row quietly dimming. */
                <motion.span key={`mark-${i}`} className="saas-give__mark"
                  initial={false}
                  animate={{
                    scale: lit ? 1 : 0.5,
                    backgroundColor: lit ? V.primary : "rgba(0,0,0,0)",
                    boxShadow: lit ? "inset 0 0 0 0px rgba(0,0,0,0)" : `inset 0 0 0 1px ${V.line}`,
                  }}
                  transition={{ duration: dur(0.32), delay: dur(lit ? i * 0.045 : 0), ease: EASE }} />
              );
            })}

            {openEnded && (
              <motion.span className="saas-give__more"
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: dur(0.4), delay: dur(0.45), ease: EASE }}>
                <MoveRight />
              </motion.span>
            )}

            {hover !== null && asDots && hover < charges && (
              <span className="saas-give__tip rounded-full"
                style={{ left: `${((hover + 0.5) / RAIL_MONTHS) * 100}%` }}>
                {dayMonth(addMonths(TODAY, hover))} · {money(perCharge)}
              </span>
            )}
          </div>

          <div className="saas-give__amounts">
            {MONTHS.map((d, i) => {
              const label = asDots ? dotAmount(i) : null;
              return (
                <motion.span key={`amt-${i}`}
                  initial={false} animate={{ opacity: label ? 1 : 0 }}
                  transition={{ duration: dur(0.28), delay: dur(label ? i * 0.045 : 0) }}>
                  {label || " "}
                </motion.span>
              );
            })}
          </div>
          <div className="saas-give__months">
            {MONTHS.map((d, i) => (
              <span key={`mon-${i}`} data-on={hover === i ? "true" : "false"}>
                <b>{shortMonth(d)}</b><i>{initial(d)}</i>
              </span>
            ))}
          </div>
        </div>

        <p className="saas-give__foot">
          {footnote}
          {canDrag && <span className="saas-give__hint"> Drag along the schedule to change it.</span>}
        </p>
      </div>
    </div>
  );
}

/* ── How the money reaches you.
   The honest list, which is shorter than the one a payments page usually
   carries: a card (Stripe Elements, so whatever Stripe accepts, of which Visa,
   Mastercard and Amex are the three worth naming), a card the donor has already
   saved, and a bank transfer that shows them the charity's own BSB. There is no
   Apple Pay or Google Pay anywhere in the checkout and the PayPal donor button
   is not built yet, so neither appears here. A strip of wallet marks we cannot
   honour is a lie told in logos.

   --tool-brand is the mark's official hex, used only on hover: the row runs in
   mono ink until you point at one, exactly like <ToolStack/>, whose .saas-tool
   this reuses outright. The two lucide glyphs have no brand of their own, so
   they borrow the tenant accent for that hover. ── */
const payMarks = [
  { name: "Visa", Icon: SiVisa, brand: "#1434CB" },
  { sep: true },
  { name: "Mastercard", Icon: SiMastercard, brand: "#EB001B" },
  { sep: true },
  { name: "Bank transfer", Icon: Landmark, brand: "var(--tenant-accent, #047857)" },
];

function PayRow() {
  return (
    <Reveal delay={0.12} className="mt-[clamp(36px,4vw,60px)]">
      <div className="saas-pay">
        <p className="text-[13px] font-medium" style={{ color: V.inkFaint }}>
          How the money reaches you
        </p>
        <ul className="saas-pay__row">
          {payMarks.map((m, i) => (m.sep
            ? <li key={`sep-${i}`} aria-hidden="true" className="saas-pay__sep" />
            : (
              <li key={m.name} className="saas-tool" style={{ "--tool-brand": m.brand }}>
                <m.Icon aria-hidden="true" focusable="false" />
                <span>{m.name}</span>
              </li>
            )))}
        </ul>
        <p className="saas-pay__foot">
          Cards are charged through Stripe, in your charity&apos;s own account.
        </p>
      </div>
    </Reveal>
  );
}

/* ═══════════════ MAIN ═══════════════ */
export default function SaaSHome() {
  // Honour a "/#section" hash arriving from another page (e.g. the navbar's
  // "How it works" → /#how). The features section is GSAP-pinned, which adds a
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

      {/* ══ THE PRIMARY BLOCK THE HERO RUNS INTO — do not insert above ══ */}
      <StoryBand />

      {/* ══ THE STACK — what the platform is actually built on ══ */}
      <ToolStack />

      {/* ══ PRODUCT TOUR — the actual software, before we describe it ══
          This has to sit ABOVE <FeatureCards/>. The feature copy ("one home for
          all your fundraising") only means something once you have seen the
          thing it describes; with the order reversed the page asks you to take
          six abstract claims on trust and never shows the product at all. ══ */}
      <section id="product" aria-labelledby="saas-product-title" className="saas-section saas-seam">
        <div className="saas-shell">
          <SectionHead center id="saas-product-title"
            title="This is the software<br/>your team logs into."
            subtitle="A full fundraising back office — donations, supporters, campaigns and your public site — behind one login. Have a look around." />
          <ProductTour />
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section id="features" aria-labelledby="saas-features-title" className="saas-section saas-seam">
        <div className="saas-shell relative">
          <SectionHead center id="saas-features-title"
            title="One home for all<br/>your fundraising."
            subtitle="From the first donation to the final thank-you." />
          <FeatureCards />
        </div>
      </section>

      {/* ══ HOW IT WORKS — vertical timeline ══ */}
      <section id="how" aria-labelledby="saas-how-title" className="saas-section saas-seam">
        <div className="saas-shell">
          <SectionHead center id="saas-how-title"
            title="Three steps to your<br/>own donation portal."
            subtitle="No developers, no lead times, no waiting on anyone." />
          <StepCards />
        </div>
      </section>

      {/* ══ WAYS TO GIVE ══
          The last thing before the price, which is where a reader stops being
          persuaded and starts working out whether this fits their fundraising.
          It answers that with the schedule itself rather than another claim,
          and it lands after "how it works" so the sequence reads: here is the
          software, here is what you get set up, here is what a donor can
          actually do with it, here is what it costs. ══ */}
      <section id="giving" aria-labelledby="saas-giving-title" className="saas-section saas-seam">
        <div className="saas-shell">
          <SectionHead center id="saas-giving-title"
            title="One form.<br/>Three ways to give."
            subtitle="Set an amount and pick a plan. This is the same choice your donor gets at checkout, and the same schedule they agree to." />
          <GivingModes />
          <PayRow />
        </div>
      </section>

      {/* ══ PRICING ══ */}
      <section id="pricing" aria-labelledby="saas-pricing-title" className="saas-section saas-seam">
        <div className="saas-shell">
          <SectionHead center id="saas-pricing-title"
            title="A plan for every charity."
            subtitle="No platform fee on donations, ever. Choose a plan, change it whenever you need." />
          <PricingCards />
        </div>
      </section>

      {/* ══ CTA ══ */}
      <CtaSection
        title="Take your first online donation next week."
        primaryLabel="See the plans"
        primaryTo="/plans"
        secondaryLabel="Book a demo"
        secondaryTo="/contact"
      />
    </div>
  );
}
