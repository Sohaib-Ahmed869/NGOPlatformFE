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
  X as XIcon,
} from "lucide-react";
/* Brand marks for <ToolStack/>. Simple Icons ships one monochrome path per
   brand, so these inherit `color` and sit in the page's ink until hovered —
   an <img> per logo would not. Named imports from the barrel are what
   footer.jsx already does, and Rollup tree-shakes the rest of the set out. */
import {
  SiStripe, SiPaypal, SiAmazonwebservices, SiAmazoncloudwatch, SiMongodb,
  SiNodedotjs, SiExpress, SiSocketdotio, SiReact, SiTailwindcss, SiMui,
  SiFramer, SiGreensock,
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


/* ── Safeguards — the section that replaced the testimonial marquee.

   What was here was eight invented charities saying flattering things, with
   stock avatars and a specific number ("donations grew 40%") nobody could
   check. Directly before the price is the worst possible place for that: it is
   exactly where a buyer stops being persuaded and starts being sceptical, and
   the questions in their head are not "do others like it" but "who touches my
   donors' cards, where does the money land, and who can read this".

   Every line is a fact about the build rather than a claim about it — the card
   column really is four characters wide, the keys really are AES-256-GCM, the
   audit log really is append-only. That constraint IS the section: anything we
   cannot point at in the codebase does not go in it. `artefact` is the thing
   itself, set in mono, because an identifier in mono reads as a specification
   and a sentence about it reads as marketing.

   ── On the shape, which took three goes ─────────────────────────────────
   It is NOT a card grid. A tinted round icon chip, a staggered fade-up per
   item, an accent seam lit across a card's top edge and a glow on hover are
   the four things that make a section look auto-generated, and a 3×2 of them
   is the single most template-looking block on the internet. <FeatureCards/>
   above already spends that pattern; a second one directly before the price
   made the page look assembled rather than designed.

   It is also not the thin two-column list that replaced it first — sober is
   not the same as plain, and that version left half the width empty.

   What it is: one alignment spine. The heading holds the left column and stays
   put while the evidence scrolls past it; every row hangs off a single rule
   with its index, claim, mechanism and artefact in a fixed vertical order, so
   the rhythm comes from type and spacing rather than from decoration. No
   chips, no seams, no hover lift, no per-item motion. ── */
const safeguards = [
  {
    claim: "Card details never reach us",
    how: "Your donor's browser tokenises the card directly with Stripe. The only card field in our database is four characters wide — the last four digits, so a donor can recognise their own card.",
    artefact: "•••• •••• •••• 4242",
    label: "Stripe Elements",
  },
  {
    claim: "Donations settle into your account",
    how: "Payments go to your charity's own Stripe and PayPal accounts. We never take custody of your money, and we never take a percentage of a donation.",
    artefact: "0.00%",
    label: "Our cut of a donation",
  },
  {
    claim: "Your data is yours alone",
    how: "Every record is stamped with your organisation and every query is scoped to it before it runs — the same rule for search, exports and reporting as for the donor list.",
    artefact: "organisationId",
    label: "Scoped on every read",
  },
  {
    claim: "Keys are encrypted before they are stored",
    how: "Payment and email credentials are sealed on the way into the database, under a key that is not kept in it.",
    artefact: "AES-256-GCM",
    label: "Secrets at rest",
  },
  {
    claim: "Support cannot look without your say-so",
    how: "A support session is time-limited and view-only unless you widen it, and you can revoke it from your own screen while it is still running.",
    artefact: "Revoke · anytime",
    label: "Your kill switch",
  },
  {
    claim: "Every operator action is on the record",
    how: "Two-factor sign-in and IP allowlisting guard the platform console, and an append-only log keeps the account, address and time behind every change.",
    artefact: "append-only",
    label: "Audit log",
  },
];

function Safeguards() {
  return (
    /* 28rem, not less: .saas-h2 is a 40-50px clamp at this breakpoint, and in a
       narrower column "The parts you can't" broke into three ragged lines with
       an orphan. The column is sized to the type, not the other way round. */
    <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] xl:gap-x-24">
      {/* The heading is the left column, not a centred banner above — it stays
          beside the evidence instead of scrolling away from it, and the section
          fills its width instead of leaving half of it empty. */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        <Reveal>
          <h2 id="saas-safeguards-title" className="saas-h2 font-bold" style={{ color: V.ink }}>
            The parts you can&rsquo;t<br />afford to get wrong.
          </h2>
          <p className="mt-4 text-[15.5px] leading-relaxed" style={{ color: V.inkSoft }}>
            {/* Not "opposite": below lg this column stacks ABOVE the list. */}
            Your donors&rsquo; money, their data, and who is allowed near either. Every line here is
            a fact about how it is built, not a promise about how we behave.
          </p>
          <Link to="/contact"
            className="mt-6 inline-flex items-center gap-2 text-[14px] font-semibold"
            style={{ color: V.primary }}>
            Ask us anything about it
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </div>

      <Reveal delay={0.08}>
        <ul>
          {safeguards.map((s, i) => (
            <li key={s.claim}
              className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4 py-7 sm:grid-cols-[2.75rem_minmax(0,1fr)] sm:gap-x-6"
              /* The rule sits between rows and closes the list, so the block
                 reads as one object rather than six loose ones. */
              style={{ borderTop: `1px solid ${V.line}`, ...(i === safeguards.length - 1 ? { borderBottom: `1px solid ${V.line}` } : {}) }}>
              <span aria-hidden className="pt-[3px] font-mono text-[12px] tabular-nums" style={{ color: V.inkFaint }}>
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="min-w-0">
                <h3 className="text-[18px] font-semibold leading-snug sm:text-[19px]" style={{ color: V.ink }}>
                  {s.claim}
                </h3>
                <p className="mt-2 max-w-[54ch] text-[14.5px] leading-relaxed" style={{ color: V.inkSoft }}>
                  {s.how}
                </p>

                {/* The evidence, as the thing itself. A masked card number and
                    "0.00%" say what a sentence about them cannot. */}
                <p className="mt-3.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="font-mono text-[13px] font-medium tracking-tight" style={{ color: V.ink }}>
                    {s.artefact}
                  </span>
                  <span className="text-[12px]" style={{ color: V.inkFaint }}>{s.label}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Reveal>
    </div>
  );
}

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
  { name: "Node.js", Icon: SiNodedotjs, brand: "#5FA04E" },
  { name: "Express", Icon: SiExpress, brand: "#000000" },
  { name: "Socket.IO", Icon: SiSocketdotio, brand: "#010101" },
  { name: "React", Icon: SiReact, brand: "#61DAFB" },
  { name: "Tailwind CSS", Icon: SiTailwindcss, brand: "#06B6D4" },
  { name: "MUI", Icon: SiMui, brand: "#007FFF" },
  { name: "Framer Motion", Icon: SiFramer, brand: "#0055FF" },
  { name: "GSAP", Icon: SiGreensock, brand: "#0AE448" },
];

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
   monochrome symbol, and a good part of this list (CloudWatch, Socket.IO, MUI,
   GSAP) is unrecognisable without the label beside it.

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
              /* Two halves, each holding the list twice, so one half always
                 overflows even an ultrawide viewport and the -50% loop never
                 shows a gap. Only the first pass of the first half is exposed
                 to assistive tech; the other three exist purely to fill it. */
              <div key={half} className="flex shrink-0 items-center" aria-hidden={half === 1}>
                {[...toolLogos, ...toolLogos].map(({ name, Icon, brand }, i) => (
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

      {/* ══ SAFEGUARDS — the last thing before the price ══
          Deliberately here and not earlier. This is where a reader stops being
          persuaded and starts being sceptical, and the questions in their head
          are about custody of money and data, not about who else likes us. ══ */}
      <section id="safeguards" aria-labelledby="saas-safeguards-title" className="saas-section saas-seam">
        <div className="saas-shell">
          <Safeguards />
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
