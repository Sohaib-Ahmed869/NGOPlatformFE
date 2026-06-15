import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  Target,
  Plus,
  Users,
  Heart,
  ArrowRight,
  Megaphone,
  HandHeart,
  Coins,
  Sparkles,
  TrendingUp,
  Flame,
} from "lucide-react";
import GoFundMeService from "../../services/goFundMeService";
import NewsletterSection from "../Home/Newsletter/newsletter";
import { CustomSelect } from "../../components/CustomSelect";
import { SectionHeading, CardHoverGlow, CTABand, IconBadge, Eyebrow, reveal } from "../../components/giving";
import { cn } from "../../utils/cn";

const money = (n) => `$${Number(n || 0).toLocaleString()}`;

// Fixed hero image so it loads instantly on first paint (not after the
// campaigns fetch resolves) — same approach as the Partners page.
const HERO_IMG = "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1600&q=80";

const SORTS = [
  { value: "recent", label: "Most recent" },
  { value: "urgent", label: "Most urgent" },
  { value: "progress", label: "Closest to goal" },
  { value: "amount", label: "Largest goal" },
];

const HOW_IT_WORKS = [
  { icon: HandHeart, title: "Start your fundraiser", text: "Create your page in minutes — share your story, set a goal and add a photo that brings it to life." },
  { icon: Megaphone, title: "Rally your community", text: "Spread the word to friends, family and supporters. Every share helps your cause reach further." },
  { icon: Coins, title: "Receive donations", text: "Contributions go straight toward your cause, with every gift tracked openly on your page." },
];

const catLabel = (c) => (c.category === "other" ? c.customCategory || "Other" : c.category);
const isUrgent = (c) => c.urgencyLevel === "high" || c.urgencyLevel === "critical";

const cardIn = (i) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: (i % 3) * 0.08 },
});

/* ── A single fundraiser card ─────────────────────────────────────────── */
function CampaignCard({ c, i }) {
  const reduce = useReducedMotion();
  const pct = c.targetAmount > 0 ? Math.min(100, Math.round((c.currentAmount / c.targetAmount) * 100)) : 0;
  const creator = c.userId?.name;

  return (
    <motion.div {...cardIn(i)} whileHover={reduce ? {} : { y: -6 }} className="h-full">
      <Link
        to={`/p2p-campaigns/${c.slug}`}
        state={{ campaign: c }}
        className="group relative flex h-full flex-col overflow-hidden border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20"
      >
        <CardHoverGlow />
        <div className="relative h-48 overflow-hidden bg-accent/10">
          <img
            src={c.image}
            alt={c.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          <span className="absolute left-3 top-3 bg-white/90 px-2.5 py-1 text-[11px] font-semibold capitalize text-primary backdrop-blur">
            {catLabel(c)}
          </span>
          {isUrgent(c) && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 bg-red-500/95 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur">
              <Flame className="h-3 w-3" /> Urgent
            </span>
          )}
        </div>

        <div className="relative flex flex-1 flex-col p-5">
          <h3 className="font-heading text-lg font-bold leading-snug text-primary line-clamp-2">{c.title}</h3>
          {creator && <p className="mt-1 text-xs text-text-muted">by {creator}</p>}
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-text-muted">{c.description}</p>

          <div className="mt-auto pt-5">
            <div className="mb-1.5 flex items-end justify-between">
              <span className="font-heading text-lg font-bold text-primary">{money(c.currentAmount)}</span>
              <span className="text-xs font-semibold text-accent">{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2.5 flex items-center justify-between text-xs text-text-muted">
              <span>raised of {money(c.targetAmount)}</span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {c.donationCount || 0}
              </span>
            </div>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition-all group-hover:gap-2.5">
              Donate now <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ── Loading skeleton card ────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
      <div className="h-48 w-full animate-pulse bg-gray-100" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-3/4 animate-pulse bg-gray-100" />
        <div className="h-3 w-1/3 animate-pulse bg-gray-100" />
        <div className="h-3 w-full animate-pulse bg-gray-100" />
        <div className="mt-4 h-2 w-full animate-pulse rounded-full bg-gray-100" />
        <div className="h-3 w-1/2 animate-pulse bg-gray-100" />
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [pagination, setPagination] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("recent");
  const [category, setCategory] = useState("all");
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    GoFundMeService.getCategories()
      .then((res) => {
        const { predefined = [], custom = [] } = res?.categories || {};
        setCategories([...predefined, ...custom.filter(Boolean)]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    GoFundMeService.getPublicCampaigns({ sort, category, limit: 48 })
      .then((res) => {
        setCampaigns(res.goFundMes || []);
        setPagination(res.pagination || { total: (res.goFundMes || []).length });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sort, category]);

  const stats = useMemo(() => {
    const totalRaised = campaigns.reduce((s, c) => s + (c.currentAmount || 0), 0);
    const totalBackers = campaigns.reduce((s, c) => s + (c.donationCount || 0), 0);
    return { totalRaised, totalBackers, active: pagination.total || campaigns.length };
  }, [campaigns, pagination]);

  // "All" + whichever categories actually exist for this tenant.
  const categoryOptions = useMemo(
    () => [{ value: "all", label: "All causes" }, ...categories.map((c) => ({ value: c, label: c }))],
    [categories],
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="bg-background">
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pb-28 pt-32 lg:pb-32 lg:pt-40">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-light" />
        <div className="absolute inset-0">
          <img
            src={HERO_IMG}
            alt=""
            fetchPriority="high"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/55" />
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{ background: "linear-gradient(135deg, var(--tenant-primary, #2C2418), transparent 70%)" }}
          />
        </div>
        <span aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Eyebrow icon={Target} light>
              Community fundraisers
            </Eyebrow>
            <h1 className="mt-5 font-heading text-4xl font-bold leading-[1.08] text-white md:text-5xl lg:text-6xl">
              Support a cause, or start your own
            </h1>
            <p className="mx-auto mt-5 max-w-2xl font-body text-lg leading-relaxed text-white/75">
              Real fundraisers from our community. Give directly to causes that move you, or launch your own in minutes.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/p2p-campaigns/start"
                className="inline-flex items-center gap-2 bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-light"
              >
                <Plus className="h-4 w-4" /> Start a fundraiser
              </Link>
              <a
                href="#fundraisers"
                className="inline-flex items-center gap-2 border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                Browse fundraisers <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats card (straddles the hero) ──────────────────────────── */}
      {!loading && campaigns.length > 0 && (
        <div className="relative z-20 mx-auto -mt-14 max-w-3xl px-6">
          <motion.div
            {...reveal()}
            className="grid grid-cols-3 divide-x divide-gray-100 border border-gray-100 bg-white p-6 shadow-xl shadow-black/5"
          >
            {[
              { icon: TrendingUp, value: money(stats.totalRaised), label: "Raised so far" },
              { icon: Target, value: stats.active, label: stats.active === 1 ? "Fundraiser" : "Fundraisers" },
              { icon: Heart, value: stats.totalBackers, label: "Generous backers" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center px-2 text-center">
                <s.icon className="mb-1.5 h-5 w-5 text-accent" />
                <p className="font-heading text-xl font-bold text-primary md:text-2xl">{s.value}</p>
                <p className="mt-0.5 text-[11px] text-text-muted md:text-xs">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      )}

      {/* ── Fundraisers grid ─────────────────────────────────────────── */}
      <section id="fundraisers" className="scroll-mt-24 px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <Eyebrow icon={Sparkles}>Active fundraisers</Eyebrow>
              <h2 className="mt-3 font-heading text-3xl font-bold text-primary md:text-4xl">Causes that need you</h2>
            </div>
            <CustomSelect
              value={sort}
              onChange={setSort}
              options={SORTS}
              className="w-full sm:w-52"
              triggerClassName="border border-gray-200 bg-white px-3.5 py-2.5 text-sm focus:border-accent outline-none"
            />
          </div>

          {/* Category filter pills */}
          {categoryOptions.length > 1 && (
            <div className="mb-8 flex flex-wrap gap-2">
              {categoryOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCategory(opt.value)}
                  className={cn(
                    "px-3.5 py-1.5 text-sm font-medium capitalize transition-colors",
                    category === opt.value
                      ? "bg-accent text-white shadow-sm shadow-accent/25"
                      : "border border-gray-200 bg-white text-text-muted hover:border-accent/40 hover:text-primary",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="border border-gray-100 bg-white p-16 text-center shadow-sm">
              <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-accent/10">
                <Heart className="h-7 w-7 text-accent" />
              </span>
              <p className="font-heading text-lg font-bold text-primary">No fundraisers here yet</p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-text-muted">
                {category !== "all"
                  ? "No fundraisers in this category right now — try another, or start your own."
                  : "Be the first to rally the community around a cause you care about."}
              </p>
              <Link
                to="/p2p-campaigns/start"
                className="mt-6 inline-flex items-center gap-2 bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
              >
                <Plus className="h-4 w-4" /> Start a fundraiser
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((c, i) => (
                <CampaignCard key={c._id} c={c} i={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="border-t border-gray-100 bg-white px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            icon={Sparkles}
            eyebrow="How it works"
            title="Fundraising, made simple"
            intro="From idea to impact in three easy steps — no experience needed."
            center
          />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.title}
                {...cardIn(i)}
                className="group relative overflow-hidden border border-gray-100 bg-white p-8 shadow-sm transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/20"
              >
                <CardHoverGlow />
                <div className="relative mb-5 flex items-center gap-4">
                  <IconBadge icon={step.icon} size="lg" />
                  <span className="font-heading text-3xl font-bold text-accent/20">{i + 1}</span>
                </div>
                <h3 className="relative font-heading text-xl font-bold text-primary">{step.title}</h3>
                <p className="relative mt-3 text-sm leading-relaxed text-text-muted">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────────────────── */}
      <CTABand
        title="Have a cause close to your heart?"
        text="Whether it's for a family in need, a community project or an emergency — your fundraiser could be the start of something powerful."
      >
        <Link
          to="/p2p-campaigns/start"
          className="inline-flex items-center gap-2 bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-light"
        >
          <Plus className="h-4 w-4" /> Start a fundraiser
        </Link>
        <Link
          to="/donate"
          className="inline-flex items-center gap-2 border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          Donate to the cause <Heart className="h-4 w-4" />
        </Link>
      </CTABand>

      <NewsletterSection />
    </motion.div>
  );
}
