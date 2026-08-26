import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import tenantService from "../../services/tenant.service";
import platformService from "../../services/platform.service";
import {
  motion, AnimatePresence, useInView, useMotionValue, useSpring,
  useReducedMotion,
} from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Users, ArrowRight, Check,
  Palette, Target, CreditCard, Calendar,
  BarChart3, Quote, Star,
  X as XIcon,
} from "lucide-react";
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

/* Descriptions are deliberately one tight sentence each and close to the same
   length: the cards sit in a 3-up grid with no images to absorb the difference,
   so a stray long line is what makes a row look ragged. */
const features = [
  { icon: CreditCard, kind: "donations", title: "Simple donations", desc: "One-time, monthly and instalment gifts, with receipts and thank-yous sent for you." },
  { icon: Users, kind: "donors", title: "Know your donors", desc: "Every supporter in one place: giving history, contact details, the causes they care about." },
  { icon: Palette, kind: "brand", title: "Your brand, your portal", desc: "Your own web address, your logo, your colours. Donors see your charity, never us." },
  { icon: Target, kind: "campaigns", title: "Campaigns that inspire", desc: "Set a goal, watch it fill, and post updates that keep supporters close to the impact." },
  { icon: Calendar, kind: "events", title: "Events & volunteers", desc: "Run fundraisers and drives, manage sign-ups and coordinate your volunteer team." },
  { icon: BarChart3, kind: "insights", title: "Clear insights", desc: "Donations over time, recurring supporters and campaign results, all at a glance." },
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
  { name: "Australian Red Cross", file: "red-cross.svg", scale: 1.07 },
  { name: "UNICEF Australia", file: "unicef.svg", scale: 0.9 },
  { name: "The Salvation Army", file: "salvation-army.svg", scale: 1.42 },
  { name: "Cancer Council Australia", file: "cancer-council.svg", scale: 1.08 },
  { name: "World Vision Australia", file: "world-vision.svg", scale: 0.86 },
  { name: "Oxfam Australia", file: "oxfam.svg", scale: 1.42 },
  { name: "Beyond Blue", file: "beyond-blue.png", scale: 1.03 },
  { name: "Save the Children Australia", file: "save-the-children.png", scale: 0.85 },
  { name: "The Smith Family", file: "smith-family.svg", scale: 1.11 },
  { name: "RSPCA Australia", file: "rspca.svg", scale: 0.98 },
  { name: "WWF-Australia", file: "wwf.svg", scale: 1.42 },
  { name: "Lifeline Australia", file: "lifeline.svg", scale: 0.87 },
  { name: "St Vincent de Paul Society", file: "vinnies.png", scale: 0.8 },
  { name: "Royal Flying Doctor Service", file: "rfds.png", scale: 0.97 },
  { name: "The Fred Hollows Foundation", file: "fred-hollows.svg", scale: 0.88 },
];

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
                <motion.span className="inline-block"
                  initial={reduce ? { opacity: 0 } : { y: "110%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.95, delay: 0.16 + i * 0.09, ease: EASE }}>
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
          Your own donation website, on your own web address, taking gifts through your own
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

function HeroStats({ tone = "dark" }) {
  const light = tone === "light";
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
        style={{ background: `linear-gradient(90deg, transparent, ${light ? "rgba(255,255,255,.18)" : V.line} 18%, ${light ? "rgba(255,255,255,.18)" : V.line} 82%, transparent)` }}
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
                  className="text-[clamp(26px,2.4vw,34px)] font-bold tracking-tight" style={{ color: light ? "#FFFFFF" : V.ink }} />
              </motion.span>
              <div className="mt-1 text-[13px]" style={{ color: light ? "rgba(255,255,255,.55)" : V.inkSoft }}>{s.label}</div>
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

/* ── The band the hero's foreground colour runs into.
   Filled edge-to-edge in the primary colour so it continues the bottom of
   <HeroScene/> with no seam. Carries the three things a charity board actually
   asks about, and the live platform figures underneath — <HeroStats/> renders
   nothing at all rather than inventing a number, so this block has to read fine
   with the row absent. ── */
const proofPoints = [
  { title: "Your Stripe, your donors", body: "Gifts land in your account, and the donor list is yours to export whenever you like." },
  { title: "Hosted in Sydney", body: "Australian donor data stays in Australia. Your board will ask; the answer is yes." },
  { title: "Zakat, Sadaqah, Lillah, Fidya", body: "Islamic giving categories are built in, not bolted on." },
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

        <HeroStats tone="light" />
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
      onUpdate: () => { if (node) node.textContent = "$" + Math.round(obj.v).toLocaleString("en-US"); } });
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
                        ≈ ${plan.annualNum.toLocaleString()}/mo · billed yearly
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

/* ── Charity logo wall ──
   Full-bleed band of a single row drifting left, edges dissolved with a mask
   so logos fade out rather than clip. Hovering a logo lifts it to full
   opacity, which is what makes the strip feel browsable instead of
   decorative. ── */
function CharityWall() {
  return (
    // No seam of its own: the dark story band directly above IS the separator,
    // and a hairline drawn a pixel under a colour block reads as an artefact.
    // The features section below carries the next one.
    <section aria-labelledby="saas-wall-title" className="relative py-[clamp(44px,5vw,76px)]"
      style={{
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

      <Reveal delay={0.12}>
        <div className="saas-logorow">
          <div className="saas-logotrack saas-logotrack--l">
            {[0, 1].map((half) => (
              <div key={half} className="flex shrink-0 items-center" aria-hidden={half === 1}>
                {[...charityLogos, ...charityLogos].map((c, i) => (
                  <div key={`${half}-${i}`} className="saas-logoitem" style={{ "--logo-scale": c.scale ?? 1 }}>
                    <img
                      className="saas-logoimg"
                      src={`/logos/charities/${c.file}`}
                      /* Only the first pass of the first half is announced;
                         the repeats exist purely to fill the loop. */
                      alt={half === 0 && i < charityLogos.length ? c.name : ""}
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

      {/* ══ CHARITY LOGO WALL — one scrolling row ══ */}
      <CharityWall />

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

      {/* ══ TESTIMONIALS ══ */}
      <section aria-labelledby="saas-reviews-title" className="saas-seam overflow-hidden" style={{ paddingBlock: "var(--section-y)" }}>
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
        title="Take your first online gift next week."
        primaryLabel="See the plans"
        primaryTo="/plans"
        secondaryLabel="Book a demo"
        secondaryTo="/contact"
      />
    </div>
  );
}
