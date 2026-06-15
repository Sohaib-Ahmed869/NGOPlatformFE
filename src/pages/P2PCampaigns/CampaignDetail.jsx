import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  Share2,
  Users,
  User,
  Calendar,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  Wallet,
  HandHeart,
  ShieldCheck,
  Check,
  Clock,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-hot-toast";
import GoFundMeService from "../../services/goFundMeService";
import HeroOverlay from "../../components/HeroOverlay";

const money = (n) => `$${Number(n || 0).toLocaleString()}`;
const URGENCY = {
  low: "bg-emerald-50 text-emerald-700",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-orange-50 text-orange-700",
  critical: "bg-red-50 text-red-700",
};

const STORY_SECTIONS = [
  { key: "personalStory", icon: BookOpen, title: "My story" },
  { key: "financialSituation", icon: Wallet, title: "The situation" },
  { key: "reasonForFunding", icon: HandHeart, title: "Why your help matters" },
];

// Session cache so revisiting a fundraiser is instant (stale-while-revalidate).
const detailCache = new Map(); // slug -> { campaign, recent }

/* Page-shaped skeleton shown only on a true cold load (no cached/passed data). */
function DetailSkeleton() {
  return (
    <div className="bg-background">
      <div className="relative h-[320px] w-full overflow-hidden lg:h-[420px]">
        <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-gray-300 to-gray-200" />
      </div>
      <section className="px-6 pb-20">
        <div className="mx-auto -mt-14 max-w-6xl lg:-mt-20">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
            <div className="space-y-6 lg:col-span-2">
              <div className="border border-gray-100 bg-white p-8 shadow-sm">
                <div className="h-4 w-24 animate-pulse bg-gray-100" />
                <div className="mt-4 space-y-2"><div className="h-4 w-full animate-pulse bg-gray-100" /><div className="h-4 w-5/6 animate-pulse bg-gray-100" /></div>
              </div>
              <div className="space-y-5 border border-gray-100 bg-white p-8 shadow-sm">
                {[0, 1, 2].map((i) => (
                  <div key={i}>
                    <div className="h-5 w-44 animate-pulse bg-gray-100" />
                    <div className="mt-2 h-3 w-full animate-pulse bg-gray-100" />
                    <div className="mt-1.5 h-3 w-4/5 animate-pulse bg-gray-100" />
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-1">
              <div className="border border-gray-100 bg-white p-6 shadow-sm">
                <div className="h-8 w-32 animate-pulse bg-gray-100" />
                <div className="mt-3 h-2.5 w-full animate-pulse rounded-full bg-gray-100" />
                <div className="mt-5 h-16 w-full animate-pulse bg-gray-100" />
                <div className="mt-5 h-12 w-full animate-pulse bg-gray-100" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function CampaignDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion();

  // Instant render: prefer the campaign handed over from the listing, then the
  // session cache. Only show the skeleton when we have nothing at all.
  const seed = () => {
    const passed = location.state?.campaign?.slug === slug ? location.state.campaign : null;
    return passed || detailCache.get(slug)?.campaign || null;
  };
  const [campaign, setCampaign] = useState(seed);
  const [recent, setRecent] = useState(detailCache.get(slug)?.recent || []);
  const [loading, setLoading] = useState(!seed());
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  // Parallax hero (hooks must run before any early return).
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-8%", "14%"]);
  const bgScale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [1, 1.1]);

  const applyData = useCallback(
    (res) => {
      const data = res.goFundMe;
      const rec = res.recentDonations || [];
      detailCache.set(slug, { campaign: data, recent: rec });
      setCampaign(data);
      setRecent(rec);
    },
    [slug],
  );

  useEffect(() => {
    window.scrollTo(0, 0);
    let active = true;
    // Re-seed instantly from passed state / cache when the slug changes.
    const passed = location.state?.campaign?.slug === slug ? location.state.campaign : null;
    const cached = detailCache.get(slug);
    const init = passed || cached?.campaign || null;
    if (init) {
      setCampaign(init);
      setRecent(cached?.recent || []);
    }
    setLoading(!init);
    setError(false);

    // Always revalidate in the background.
    GoFundMeService.getCampaignBySlug(slug)
      .then((res) => active && applyData(res))
      .catch(() => {
        // Only surface an error if we have nothing to show.
        if (active && !init) setError(true);
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, applyData]);

  const retry = () => {
    setLoading(true);
    setError(false);
    GoFundMeService.getCampaignBySlug(slug)
      .then(applyData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: campaign.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success("Link copied");
        setTimeout(() => setCopied(false), 2000);
      }
    } catch { /* dismissed */ }
  };

  // Cold load with nothing to show yet → page-shaped skeleton (no blank spinner).
  if (loading && !campaign) return <DetailSkeleton />;

  // Genuine failure with no cached/passed data → recoverable error, not a redirect.
  if (error && !campaign) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-background px-6 text-center">
        <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-red-50 text-red-500">
          <AlertTriangle className="h-7 w-7" />
        </span>
        <h2 className="font-heading text-xl font-bold text-primary">We couldn't load this fundraiser</h2>
        <p className="mt-1.5 max-w-sm text-sm text-text-muted">It may have been removed or completed, or there was a network hiccup.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={retry} className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light">
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
          <button onClick={() => navigate("/p2p-campaigns")} className="inline-flex items-center gap-2 border border-gray-200 px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:border-accent/50 hover:text-accent">
            <ArrowLeft className="h-4 w-4" /> Back to fundraisers
          </button>
        </div>
      </div>
    );
  }

  if (!campaign) return null;

  const pct = campaign.targetAmount > 0 ? Math.min(100, Math.round((campaign.currentAmount / campaign.targetAmount) * 100)) : 0;
  const remaining = Math.max(0, campaign.targetAmount - campaign.currentAmount);
  const days = Math.max(1, Math.ceil((Date.now() - new Date(campaign.createdAt)) / 86400000));
  const canDonate = campaign.status === "approved" && campaign.isActive;
  const creator = campaign.userId?.name || "a supporter";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="bg-background">
      {/* ── HERO — a <section> so the navbar's "collapse past the hero"
            measurement (it queries the first <section>) targets it. ────────── */}
      <section ref={heroRef} className="relative overflow-hidden py-28 lg:py-36">
        <motion.div style={{ y: bgY, scale: bgScale }} className="absolute -inset-y-[12%] inset-x-0 bg-primary will-change-transform">
          {campaign.image && (
            <img
              src={campaign.image}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          )}
          <HeroOverlay />
        </motion.div>

        <div className="relative z-10 mx-auto max-w-5xl px-6">
          <button onClick={() => navigate("/p2p-campaigns")} className="group mb-6 flex items-center gap-1.5 text-sm font-medium text-white/85 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to fundraisers
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">{campaign.category === "other" && campaign.customCategory ? campaign.customCategory : campaign.category}</span>
            <span className={`px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${URGENCY[campaign.urgencyLevel] || URGENCY.medium}`}>{campaign.urgencyLevel} priority</span>
            {campaign.status === "completed" && (
              <span className="inline-flex items-center gap-1 bg-emerald-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                <CheckCircle className="h-3 w-3" /> Funded
              </span>
            )}
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-4 max-w-3xl font-heading text-3xl font-bold leading-tight text-warm-cream md:text-5xl"
          >
            {campaign.title}
          </motion.h1>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-warm-beige/85">
            <span className="inline-flex items-center gap-1.5"><User className="h-4 w-4" /> by {creator}</span>
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {new Date(campaign.createdAt).toLocaleDateString()}</span>
            <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" /> {campaign.donationCount} supporters</span>
          </div>
        </div>
      </section>

      {/* ── BODY (cards overlap the hero) ────────────────────────────── */}
      <section className="relative z-10 px-6 pb-20">
        <div className="mx-auto -mt-14 max-w-6xl lg:-mt-20">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
            {/* Main */}
            <div className="space-y-6 lg:col-span-2">
              {/* Summary card */}
              <div className="border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                    <Heart className="h-3.5 w-3.5" /> The appeal
                  </span>
                  <button onClick={share} className="inline-flex shrink-0 items-center gap-1.5 border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-accent/50 hover:text-accent">
                    {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />} {copied ? "Copied" : "Share"}
                  </button>
                </div>
                <p className="mt-4 text-lg leading-relaxed text-gray-700">{campaign.description}</p>
              </div>

              {/* Story sections */}
              <div className="space-y-6 border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
                {STORY_SECTIONS.map(({ key, icon: Icon, title }) =>
                  campaign[key] ? (
                    <div key={key}>
                      <div className="mb-2 flex items-center gap-2.5">
                        <span className="grid h-9 w-9 shrink-0 place-items-center bg-accent/10 text-accent">
                          <Icon className="h-[18px] w-[18px]" />
                        </span>
                        <h2 className="font-heading text-lg font-bold text-primary">{title}</h2>
                      </div>
                      <p className="whitespace-pre-line leading-relaxed text-gray-700">{campaign[key]}</p>
                    </div>
                  ) : null,
                )}
              </div>

              {/* Recent donations */}
              {recent.length > 0 && (
                <div className="border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
                  <div className="mb-4 flex items-center gap-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center bg-accent/10 text-accent">
                      <Users className="h-[18px] w-[18px]" />
                    </span>
                    <h2 className="font-heading text-lg font-bold text-primary">Recent supporters</h2>
                  </div>
                  <div className="space-y-3">
                    {recent.map((d, i) => (
                      <div key={i} className="flex items-start gap-3 border border-gray-50 bg-gray-50/60 p-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/10"><Heart className="h-4 w-4 text-accent" /></div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate font-medium text-primary">{d.donorName}</p>
                            <span className="shrink-0 font-semibold text-accent">${Number(d.amount).toLocaleString()}</span>
                          </div>
                          {d.message && <p className="mt-0.5 text-sm italic text-text-muted">“{d.message}”</p>}
                          <p className="mt-0.5 text-xs text-text-muted">{new Date(d.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-24">
                <div className="border border-gray-100 bg-white p-6 shadow-lg shadow-black/5">
                  <div className="flex items-end justify-between gap-2">
                    <span className="font-heading text-3xl font-bold text-accent">{money(campaign.currentAmount)}</span>
                    <span className="pb-1 text-sm text-text-muted">of {money(campaign.targetAmount)}</span>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-100">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <p className="mt-2 text-sm font-medium text-primary">
                    {pct}% <span className="font-normal text-text-muted">of goal reached</span>
                  </p>

                  <div className="mt-5 grid grid-cols-3 gap-2 border-y border-gray-100 py-4 text-center">
                    <div>
                      <div className="font-heading text-lg font-bold text-primary">{campaign.donationCount}</div>
                      <div className="text-[11px] uppercase tracking-wide text-text-muted">Donors</div>
                    </div>
                    <div>
                      <div className="font-heading text-lg font-bold text-primary">{money(remaining)}</div>
                      <div className="text-[11px] uppercase tracking-wide text-text-muted">To go</div>
                    </div>
                    <div>
                      <div className="font-heading text-lg font-bold text-primary">{days}</div>
                      <div className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-text-muted"><Clock className="h-3 w-3" /> Days live</div>
                    </div>
                  </div>

                  {canDonate ? (
                    <>
                      <button onClick={() => navigate(`/p2p-campaigns/${slug}/donate`, { state: { campaign } })} className="mt-5 flex w-full items-center justify-center gap-2 bg-accent py-3.5 font-semibold text-white shadow-sm transition-colors hover:bg-accent-light">
                        <Heart className="h-5 w-5" /> Donate now
                      </button>
                      <button onClick={share} className="mt-2.5 flex w-full items-center justify-center gap-2 border border-gray-200 py-2.5 text-sm font-semibold text-primary transition-colors hover:border-accent/50 hover:text-accent">
                        {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />} {copied ? "Link copied" : "Share this fundraiser"}
                      </button>
                      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-text-muted">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Secure payment · goes directly to the cause
                      </p>
                    </>
                  ) : campaign.status === "completed" ? (
                    <div className="mt-5 flex w-full items-center justify-center gap-2 bg-emerald-50 py-3.5 font-semibold text-emerald-700">
                      <CheckCircle className="h-5 w-5" /> Goal reached — thank you!
                    </div>
                  ) : (
                    <div className="mt-5 flex w-full items-center justify-center gap-2 bg-gray-100 py-3.5 font-medium text-gray-500">
                      <AlertTriangle className="h-5 w-5" /> Not accepting donations
                    </div>
                  )}
                </div>

                {/* Organiser note */}
                <div className="mt-4 flex items-center gap-3 border border-gray-100 bg-white p-4 shadow-sm">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                    {creator.trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 text-sm">
                    <p className="text-[11px] uppercase tracking-wide text-text-muted">Organised by</p>
                    <p className="truncate font-semibold text-primary">{creator}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
