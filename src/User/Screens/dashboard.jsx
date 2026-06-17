import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  DollarSign, HandCoins, Megaphone, Ticket, Target, Repeat, Layers, CreditCard,
  HeartHandshake, ChevronRight, Calendar, Wallet, TrendingUp,
  Sparkles, ExternalLink, Receipt, Heart, Users, Flag,
} from "lucide-react";
import { TabLoader } from "../../components/TabLoader";
import { withMinDelay } from "../../utils/minDelay";
import DonationService from "../../services/donation.service.jsx";
import GoFundMeService from "../../services/goFundMeService";
import publicEventsService from "../../services/publicEvents.service";
import { useAuth } from "../../context/AuthContext";
import usePageContent from "../../hooks/usePageContent";
import { cn } from "../../utils/cn";

/* ── helpers ──────────────────────────────────────────────────────────── */
const HEADER_GRADIENT = "linear-gradient(120deg, var(--tenant-primary, #2C2418), var(--tenant-accent, #C9A84C))";
const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const moneyShort = (n) => {
  const v = Number(n || 0);
  if (v >= 1000) return `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return `$${Math.round(v)}`;
};
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const getInitials = (name) => {
  if (!name) return "U";
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "U";
};
const resolveAvatar = (path) => {
  if (!path || path.includes("/api/placeholder")) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  return `${API_BASE}/${String(path).replace(/\\/g, "/").replace(/^\/+/, "")}`;
};

const getThemeColor = (varName, fallback) => {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
};

const PAID_ORDER = new Set(["completed", "active"]);
const PAID_EVENT = new Set(["paid", "completed"]);
const ENDED = ["cancelled", "canceled", "failed", "ended"];
const FREQ_MONTHLY = { daily: 30, weekly: 52 / 12, fortnightly: 26 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: Math.min(i * 0.05, 0.4), duration: 0.4 } }),
};

// Amount actually paid on an order (so far) across the three donation types.
function orderPaidAmount(o) {
  if (o.paymentType === "recurring") {
    const hist = (o.recurringDetails?.paymentHistory || []).filter((p) => p.status === "succeeded");
    if (hist.length) return hist.reduce((s, p) => s + (p.amount || 0), 0);
    const amt = o.recurringDetails?.amount || o.totalAmount || 0;
    const n = o.recurringDetails?.totalPayments || (PAID_ORDER.has((o.paymentStatus || "").toLowerCase()) ? 1 : 0);
    return n * amt;
  }
  if (o.paymentType === "installments") {
    const paid = o.installmentDetails?.installmentsPaid || 0;
    const amt =
      o.installmentDetails?.installmentAmount ||
      (o.installmentDetails?.numberOfInstallments ? o.totalAmount / o.installmentDetails.numberOfInstallments : 0);
    return paid * amt;
  }
  return PAID_ORDER.has((o.paymentStatus || "").toLowerCase()) ? o.totalAmount || 0 : 0;
}

// Dated "money in" events for the monthly trend, tagged by channel.
function buildPaymentEvents(orders, campaignDonations, eventRegs) {
  const out = [];
  orders.forEach((o) => {
    if (o.paymentType === "recurring") {
      const hist = (o.recurringDetails?.paymentHistory || []).filter((p) => p.status === "succeeded");
      if (hist.length) hist.forEach((p) => out.push({ date: p.date, amount: p.amount || o.recurringDetails?.amount || 0, channel: "donation" }));
      else if (PAID_ORDER.has((o.paymentStatus || "").toLowerCase()))
        out.push({ date: o.createdAt, amount: o.recurringDetails?.amount || o.totalAmount || 0, channel: "donation" });
    } else if (o.paymentType === "installments") {
      const hist = (o.installmentDetails?.installmentHistory || []).filter((h) => ["completed", "succeeded"].includes(h.status));
      if (hist.length) hist.forEach((h) => out.push({ date: h.date, amount: h.amount || o.installmentDetails?.installmentAmount || 0, channel: "donation" }));
    } else if (PAID_ORDER.has((o.paymentStatus || "").toLowerCase())) {
      out.push({ date: o.createdAt, amount: o.totalAmount || 0, channel: "donation" });
    }
  });
  campaignDonations.filter((d) => (d.paymentStatus || "").toLowerCase() === "completed").forEach((d) => out.push({ date: d.createdAt, amount: d.amount || 0, channel: "campaign" }));
  eventRegs.filter((r) => PAID_EVENT.has((r.paymentStatus || "").toLowerCase())).forEach((r) => out.push({ date: r.createdAt, amount: r.amountPaid || 0, channel: "event" }));
  return out;
}

function lastMonths(n) {
  const arr = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    arr.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString(undefined, { month: "short" }), y: d.getFullYear(), m: d.getMonth() });
  }
  return arr;
}

const CHANNELS = {
  donation: { label: "Donations", icon: HandCoins },
  campaign: { label: "Fundraisers", icon: Megaphone },
  event: { label: "Events", icon: Ticket },
};

/* ── small UI bits ────────────────────────────────────────────────────── */
const Card = ({ className = "", children, ...rest }) => (
  <div className={cn("border border-gray-100 bg-white shadow-sm", className)} {...rest}>{children}</div>
);

function SectionHead({ icon: Icon, title, sub, to, action }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <span className="grid h-9 w-9 shrink-0 place-items-center bg-accent/10 text-accent">
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate font-heading text-base font-bold text-primary">{title}</h2>
          {sub && <p className="truncate text-xs text-text-muted">{sub}</p>}
        </div>
      </div>
      {to && (
        <Link to={to} className="group inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent transition-colors hover:text-accent-light">
          {action || "View all"} <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

function HeaderStat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
      <span className="grid h-9 w-9 shrink-0 place-items-center bg-accent/10 text-accent">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate font-heading text-lg font-bold leading-none text-primary">{value}</p>
        <p className="mt-1 text-xs text-text-muted">{label}</p>
      </div>
    </div>
  );
}

// Inline sparkline for the KPI tiles.
function Sparkline({ data, color, height = 30 }) {
  if (!data || data.length < 2 || !data.some((v) => v > 0)) return <div style={{ height }} />;
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1, w = 100;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");
  const id = `sk-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${pts} ${w},${height} 0,${height}`} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function StatTile({ icon: Icon, label, value, color, spark, sub, index = 0 }) {
  return (
    <motion.div variants={fadeUp} custom={index} className="group border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{label}</p>
          <p className="mt-1.5 font-heading text-2xl font-bold leading-none text-primary">{value}</p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center" style={{ background: `${color}14`, color }}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3"><Sparkline data={spark} color={color} /></div>
      {sub && <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-text-muted">{sub}</p>}
    </motion.div>
  );
}

/* SVG donut with rounded caps + center label. */
function DonutChart({ segments, size = 168, centerValue, centerLabel }) {
  const r = 58, c = 2 * Math.PI * r, gap = 8;
  let offset = 0;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  return (
    <svg width={size} height={size} viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#f1f5f9" strokeWidth="15" />
      {total > 0 && segments.filter((s) => s.value > 0).map((seg, i) => {
        const pct = seg.value / total;
        const dashLen = Math.max(0, pct * c - gap);
        const el = (
          <circle key={i} cx="70" cy="70" r={r} fill="none" stroke={seg.color} strokeWidth="15" strokeLinecap="round"
            strokeDasharray={`${dashLen} ${c - dashLen}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)"
            style={{ transition: "stroke-dasharray .6s ease" }} />
        );
        offset += pct * c;
        return el;
      })}
      <text x="70" y="67" textAnchor="middle" fontSize="17" fontWeight="700" fill="currentColor" className="text-primary">{centerValue}</text>
      <text x="70" y="84" textAnchor="middle" fontSize="9" fill="#94a3b8">{centerLabel || "total"}</text>
    </svg>
  );
}

function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color || "var(--tenant-accent, #C9A84C)" }} />
    </div>
  );
}

const STATUS_PILL = {
  completed: "bg-green-50 text-green-700",
  paid: "bg-green-50 text-green-700",
  active: "bg-emerald-50 text-emerald-700",
  approved: "bg-emerald-50 text-emerald-700",
  pending: "bg-yellow-50 text-yellow-700",
  processing: "bg-blue-50 text-blue-700",
  free: "bg-gray-100 text-gray-600",
  failed: "bg-red-50 text-red-700",
  rejected: "bg-red-50 text-red-700",
};
const pill = (s) => STATUS_PILL[(s || "").toLowerCase()] || "bg-gray-100 text-gray-600";
const titleCase = (s) => (s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/* ── component ────────────────────────────────────────────────────────── */
// Session cache of the dashboard's merged datasets so the screen paints
// instantly on revisit (stale-while-revalidate). The first visit of the session
// shows the Calcite TabLoader; revisits hydrate from here and refresh quietly —
// same approach as My Payments / Subscriptions.
let _dashCache = null;

const UserDashboard = () => {
  const { user } = useAuth();
  // Reuse the tenant's home-hero background image (cached/prefetched on tenant
  // load) behind the dashboard header — no separate setting to maintain.
  const { content: homeContent } = usePageContent("home");
  const cached = _dashCache;
  const [orders, setOrders] = useState(cached?.orders || DonationService.getCachedUserDonations()?.orders || []);
  const [campaignDonations, setCampaignDonations] = useState(cached?.campaignDonations || []);
  const [myFundraisers, setMyFundraisers] = useState(cached?.myFundraisers || []);
  const [eventRegs, setEventRegs] = useState(cached?.eventRegs || []);
  const [loading, setLoading] = useState(!cached);
  const [metric, setMetric] = useState("amount"); // amount | count

  useEffect(() => {
    let active = true;
    const cold = !_dashCache;
    (async () => {
      const work = Promise.allSettled([
        DonationService.getUserDonations(),
        GoFundMeService.getMyDonations({ limit: 100 }),
        GoFundMeService.getMyRequests(),
        publicEventsService.myRegistrations(),
      ]).then(([ord, camp, mine, evs]) => {
        const prev = _dashCache || {};
        return {
          orders: ord.status === "fulfilled" && Array.isArray(ord.value?.orders) ? ord.value.orders : prev.orders || [],
          campaignDonations: camp.status === "fulfilled" ? camp.value?.donations || [] : prev.campaignDonations || [],
          myFundraisers: mine.status === "fulfilled" ? mine.value?.goFundMes || [] : prev.myFundraisers || [],
          eventRegs: evs.status === "fulfilled" ? (Array.isArray(evs.value) ? evs.value : []) : prev.eventRegs || [],
        };
      });
      // Only delay (for a smooth brand loader) on a true cold load.
      const data = cold ? await withMinDelay(work) : await work;
      if (!active) return;
      _dashCache = data;
      setOrders(data.orders);
      setCampaignDonations(data.campaignDonations);
      setMyFundraisers(data.myFundraisers);
      setEventRegs(data.eventRegs);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const accent = getThemeColor("--tenant-accent", "#C9A84C");
  const CH_COLORS = useMemo(() => ({ donation: accent, campaign: "#8B5CF6", event: "#F59E0B" }), [accent]);

  const d = useMemo(() => {
    // Channel totals
    const donationPaid = orders.reduce((s, o) => s + orderPaidAmount(o), 0);
    const campaignPaid = campaignDonations
      .filter((x) => (x.paymentStatus || "").toLowerCase() === "completed")
      .reduce((s, x) => s + (x.amount || 0), 0);
    const eventPaid = eventRegs
      .filter((x) => PAID_EVENT.has((x.paymentStatus || "").toLowerCase()))
      .reduce((s, x) => s + (x.amountPaid || 0), 0);
    const totalGiven = donationPaid + campaignPaid + eventPaid;

    // Donation-type split
    const single = orders.filter((o) => o.paymentType === "single");
    const recurring = orders.filter((o) => o.paymentType === "recurring");
    const installments = orders.filter((o) => o.paymentType === "installments");

    const activeRecurring = recurring.filter(
      (o) => !ENDED.includes((o.paymentStatus || "").toLowerCase()) && (!o.recurringDetails?.endDate || new Date(o.recurringDetails.endDate) > new Date()),
    );
    const activeInstallments = installments.filter(
      (o) => !ENDED.includes((o.paymentStatus || "").toLowerCase()) && (o.installmentDetails?.installmentsPaid || 0) < (o.installmentDetails?.numberOfInstallments || 0),
    );
    const estMonthly = activeRecurring.reduce(
      (s, o) => s + (o.recurringDetails?.amount || o.totalAmount || 0) * (FREQ_MONTHLY[(o.recurringDetails?.frequency || "monthly").toLowerCase()] || 1),
      0,
    );

    // Programs supported
    const programOrders = orders.filter((o) => o.donationType === "Program Donation" || o.programId || (o.items?.[0]?.donationType || "").toLowerCase().includes("program"));
    const programMap = new Map();
    programOrders.forEach((o) => {
      const title = o.items?.[0]?.title || "Program";
      const cur = programMap.get(title) || { title, amount: 0, count: 0, last: o.createdAt };
      cur.amount += orderPaidAmount(o) || o.totalAmount || 0;
      cur.count += 1;
      if (new Date(o.createdAt) > new Date(cur.last)) cur.last = o.createdAt;
      programMap.set(title, cur);
    });
    const programs = [...programMap.values()].sort((a, b) => b.amount - a.amount);

    // Campaigns contributed to (grouped)
    const campMap = new Map();
    campaignDonations.forEach((x) => {
      const g = x.goFundMeId;
      if (!g) return;
      const id = g._id || g.title;
      const cur = campMap.get(id) || { id, title: g.title, slug: g.slug, image: g.image, currentAmount: g.currentAmount, targetAmount: g.targetAmount, status: g.status, mine: 0, count: 0, last: x.createdAt };
      if ((x.paymentStatus || "").toLowerCase() === "completed") { cur.mine += x.amount || 0; cur.count += 1; }
      if (new Date(x.createdAt) > new Date(cur.last)) cur.last = x.createdAt;
      campMap.set(id, cur);
    });
    const campaigns = [...campMap.values()].filter((c) => c.count > 0).sort((a, b) => new Date(b.last) - new Date(a.last));

    // Events
    const events = [...eventRegs].sort((a, b) => {
      const da = a.eventId?.date ? new Date(a.eventId.date) : new Date(a.createdAt);
      const db = b.eventId?.date ? new Date(b.eventId.date) : new Date(b.createdAt);
      const now = new Date();
      const ua = da >= now ? 0 : 1, ub = db >= now ? 0 : 1; // upcoming first
      if (ua !== ub) return ua - ub;
      return ua === 0 ? da - db : db - da;
    });

    // Monthly trend (8 months, stacked by channel)
    const buckets = lastMonths(8);
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    const monthly = buckets.map((b) => ({ month: b.label, donation: 0, campaign: 0, event: 0, donationN: 0, campaignN: 0, eventN: 0 }));
    buildPaymentEvents(orders, campaignDonations, eventRegs).forEach((e) => {
      if (!e.date) return;
      const dt = new Date(e.date);
      const k = `${dt.getFullYear()}-${dt.getMonth()}`;
      if (!idx.has(k)) return;
      const row = monthly[idx.get(k)];
      row[e.channel] += e.amount || 0;
      row[`${e.channel}N`] += 1;
    });

    // Causes supported (unique)
    const causes = new Set();
    orders.forEach((o) => o.items?.[0]?.title && causes.add(o.items[0].title));
    campaigns.forEach((c) => causes.add(c.title));
    events.forEach((e) => e.eventId?.title && causes.add(e.eventId.title));

    const totalContributions =
      orders.filter((o) => orderPaidAmount(o) > 0 || PAID_ORDER.has((o.paymentStatus || "").toLowerCase())).length +
      campaignDonations.filter((x) => (x.paymentStatus || "").toLowerCase() === "completed").length +
      eventRegs.filter((x) => PAID_EVENT.has((x.paymentStatus || "").toLowerCase())).length;

    return {
      donationPaid, campaignPaid, eventPaid, totalGiven,
      single, recurring, installments, activeRecurring, activeInstallments, estMonthly,
      programs, campaigns, events, monthly, causes: causes.size, totalContributions,
    };
  }, [orders, campaignDonations, eventRegs]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <TabLoader label="Loading dashboard…" />
      </div>
    );
  }

  const firstName = (user?.name || "").trim().split(/\s+/)[0] || "there";
  const displayName = (user?.name || "").trim() || user?.email?.split("@")[0] || "Member";
  const avatar = resolveAvatar(user?.profileImage);
  const heroImage = homeContent?.hero?.image || "";
  const channelSegments = [
    { name: "Donations", value: d.donationPaid, color: CH_COLORS.donation },
    { name: "Fundraisers", value: d.campaignPaid, color: CH_COLORS.campaign },
    { name: "Events", value: d.eventPaid, color: CH_COLORS.event },
  ];
  const typeSegments = [
    { name: "One-time", value: d.single.length, color: accent, icon: CreditCard },
    { name: "Recurring", value: d.recurring.length, color: "#10B981", icon: Repeat },
    { name: "Installment", value: d.installments.length, color: "#F59E0B", icon: Layers },
  ];
  const donationCount = d.single.length + d.recurring.length + d.installments.length;

  const sparkOf = (keys) => d.monthly.map((m) => keys.reduce((s, k) => s + (m[k] || 0), 0));
  const nothingYet = d.totalGiven === 0 && donationCount === 0 && d.events.length === 0 && d.campaigns.length === 0 && myFundraisers.length === 0;

  return (
    <motion.div initial="hidden" animate="visible" className="w-full space-y-6">
      {/* Hero */}
      <motion.div variants={fadeUp} custom={0}>
        <Card className="overflow-hidden">
          <div
            className="relative flex flex-wrap items-start justify-between gap-4 overflow-hidden px-6 py-7 sm:px-8"
            style={heroImage ? undefined : { background: HEADER_GRADIENT }}
          >
            {heroImage && (
              <>
                <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
                {/* Brand gradient kept as a translucent overlay so white text stays legible */}
                <div className="absolute inset-0" style={{ background: HEADER_GRADIENT, opacity: 0.85 }} />
              </>
            )}
            <div className="relative z-10 flex min-w-0 items-center gap-4">
              {avatar ? (
                <img src={avatar} alt={displayName} className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-white/40" />
              ) : (
                <span
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white ring-2 ring-white/40"
                  style={{ background: "linear-gradient(135deg, var(--tenant-accent, #C9A84C), var(--tenant-accent-light, #D4B85A))" }}
                >
                  {getInitials(displayName)}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Welcome back</p>
                <h1 className="mt-1 font-heading text-2xl font-bold text-white">Hi {firstName}, your impact so far</h1>
                <p className="mt-1 text-sm text-white/80">Donations, fundraisers, events and programs — all in one place.</p>
              </div>
            </div>
            <div className="relative z-10 flex shrink-0 flex-wrap gap-2">
              <Link to="/donate" className="inline-flex items-center gap-1.5 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition-transform hover:-translate-y-0.5">
                <Heart className="h-4 w-4" /> Donate
              </Link>
              <Link to="/user/payments" className="inline-flex items-center gap-1.5 border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20">
                <Receipt className="h-4 w-4" /> Payments
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 sm:grid-cols-4 sm:divide-y-0">
            <HeaderStat icon={DollarSign} label="Total contributed" value={money(d.totalGiven)} />
            <HeaderStat icon={HandCoins} label="Contributions" value={d.totalContributions} />
            <HeaderStat icon={Sparkles} label="Causes supported" value={d.causes} />
            <HeaderStat icon={HeartHandshake} label="Est. monthly giving" value={money(d.estMonthly)} />
          </div>
        </Card>
      </motion.div>

      {nothingYet ? (
        <Card className="px-6 py-16 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent">
            <Heart className="h-7 w-7" />
          </span>
          <p className="font-heading text-lg font-bold text-primary">Your giving journey starts here</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-text-muted">Make your first donation, register for an event or support a fundraiser — everything you do will show up on this dashboard.</p>
          <Link to="/donate" className="mt-5 inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light">
            <Heart className="h-4 w-4" /> Make a donation
          </Link>
        </Card>
      ) : (
        <>
          {/* KPI tiles */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile index={1} icon={HandCoins} label="Donations" value={money(d.donationPaid)} color={accent} spark={sparkOf(["donation"])} sub={`${donationCount} gift${donationCount === 1 ? "" : "s"}`} />
            <StatTile index={2} icon={Megaphone} label="Fundraisers" value={money(d.campaignPaid)} color={CH_COLORS.campaign} spark={sparkOf(["campaign"])} sub={`${d.campaigns.length} campaign${d.campaigns.length === 1 ? "" : "s"}`} />
            <StatTile index={3} icon={Ticket} label="Events" value={money(d.eventPaid)} color={CH_COLORS.event} spark={sparkOf(["event"])} sub={`${d.events.length} registration${d.events.length === 1 ? "" : "s"}`} />
            <StatTile index={4} icon={Wallet} label="Active subscriptions" value={d.activeRecurring.length + d.activeInstallments.length} color="#06B6D4" spark={sparkOf(["donation", "campaign", "event"])} sub={`${money(d.estMonthly)}/mo est.`} />
          </div>

          {/* Trend + channel donut */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <motion.div variants={fadeUp} custom={5} className="lg:col-span-2">
              <Card className="h-full">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center bg-accent/10 text-accent"><TrendingUp className="h-[18px] w-[18px]" /></span>
                    <div>
                      <h2 className="font-heading text-base font-bold text-primary">Giving over time</h2>
                      <p className="text-xs text-text-muted">Last 8 months by channel</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 border border-gray-200 p-0.5">
                    {[{ id: "amount", label: "Amount" }, { id: "count", label: "Count" }].map((t) => (
                      <button key={t.id} onClick={() => setMetric(t.id)} className={cn("px-2.5 py-1 text-xs font-semibold transition-colors", metric === t.id ? "bg-accent text-white" : "text-text-muted hover:text-primary")}>{t.label}</button>
                    ))}
                  </div>
                </div>
                <div className="h-72 px-2 py-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d.monthly} margin={{ top: 6, right: 16, left: -8, bottom: 0 }} barCategoryGap="22%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false}
                        tickFormatter={(v) => (metric === "amount" ? moneyShort(v) : v)} width={48} />
                      <Tooltip
                        cursor={{ fill: "rgba(0,0,0,0.03)" }}
                        contentStyle={{ borderRadius: 0, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.06)", fontSize: 12 }}
                        formatter={(value, name) => [metric === "amount" ? money(value) : value, name]}
                      />
                      <Bar dataKey={metric === "amount" ? "donation" : "donationN"} stackId="a" name="Donations" fill={CH_COLORS.donation} radius={[0, 0, 0, 0]} />
                      <Bar dataKey={metric === "amount" ? "campaign" : "campaignN"} stackId="a" name="Fundraisers" fill={CH_COLORS.campaign} />
                      <Bar dataKey={metric === "amount" ? "event" : "eventN"} stackId="a" name="Events" fill={CH_COLORS.event} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 px-5 py-3">
                  {Object.entries(CHANNELS).map(([k, v]) => (
                    <span key={k} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-text-muted">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CH_COLORS[k] }} /> {v.label}
                    </span>
                  ))}
                </div>
              </Card>
            </motion.div>

            <motion.div variants={fadeUp} custom={6}>
              <Card className="flex h-full flex-col">
                <SectionHead icon={Target} title="Where it goes" sub="Share of your support" />
                <div className="flex flex-1 flex-col items-center justify-center gap-4 p-5">
                  <DonutChart segments={channelSegments} centerValue={moneyShort(d.totalGiven)} centerLabel="given" />
                  <div className="w-full space-y-2">
                    {channelSegments.map((s) => {
                      const pct = d.totalGiven > 0 ? Math.round((s.value / d.totalGiven) * 100) : 0;
                      return (
                        <div key={s.name} className="flex items-center justify-between gap-2 text-sm">
                          <span className="inline-flex items-center gap-2 text-text-muted">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} /> {s.name}
                          </span>
                          <span className="font-semibold text-primary">{money(s.value)} <span className="text-xs font-normal text-text-muted">· {pct}%</span></span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Donation types + subscriptions snapshot */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <motion.div variants={fadeUp} custom={7} className="lg:col-span-2">
              <Card className="h-full">
                <SectionHead icon={HandCoins} title="Your donations" sub={`${donationCount} total — one-time, recurring & installment`} to="/user/donations" />
                <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
                  {typeSegments.map((t) => {
                    const pct = donationCount > 0 ? Math.round((t.value / donationCount) * 100) : 0;
                    return (
                      <div key={t.name} className="border border-gray-100 p-4">
                        <div className="flex items-center justify-between">
                          <span className="grid h-9 w-9 place-items-center" style={{ background: `${t.color}14`, color: t.color }}><t.icon className="h-[18px] w-[18px]" /></span>
                          <span className="font-heading text-2xl font-bold text-primary">{t.value}</span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-primary">{t.name}</p>
                        <div className="mt-2"><ProgressBar value={t.value} max={donationCount} color={t.color} /></div>
                        <p className="mt-1 text-[11px] text-text-muted">{pct}% of donations</p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </motion.div>

            <motion.div variants={fadeUp} custom={8}>
              <Card className="flex h-full flex-col">
                <SectionHead icon={Repeat} title="Subscriptions" sub="Recurring & installments" to="/user/subscriptions" />
                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-gray-100 p-3">
                      <p className="font-heading text-xl font-bold text-primary">{d.activeRecurring.length}</p>
                      <p className="text-xs text-text-muted">Active recurring</p>
                    </div>
                    <div className="border border-gray-100 p-3">
                      <p className="font-heading text-xl font-bold text-primary">{d.activeInstallments.length}</p>
                      <p className="text-xs text-text-muted">Installment plans</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 border border-accent/20 bg-accent/5 p-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center bg-accent/10 text-accent"><HeartHandshake className="h-5 w-5" /></span>
                    <div>
                      <p className="font-heading text-lg font-bold leading-none text-primary">{money(d.estMonthly)}</p>
                      <p className="mt-1 text-xs text-text-muted">Estimated monthly giving</p>
                    </div>
                  </div>
                  {(() => {
                    const next = d.activeRecurring
                      .map((o) => o.recurringDetails?.nextPaymentDate)
                      .concat(d.activeInstallments.map((o) => o.installmentDetails?.nextInstallmentDate))
                      .filter(Boolean)
                      .sort((a, b) => new Date(a) - new Date(b))[0];
                    return next ? (
                      <p className="flex items-center gap-2 text-sm text-text-muted"><Calendar className="h-4 w-4 text-accent" /> Next payment {fmtDate(next)}</p>
                    ) : (
                      <p className="text-sm text-text-muted">No upcoming scheduled payments.</p>
                    );
                  })()}
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Events + Programs */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <motion.div variants={fadeUp} custom={9}>
              <Card className="h-full">
                <SectionHead icon={Ticket} title="Your events" sub={`${d.events.length} registration${d.events.length === 1 ? "" : "s"}`} to="/events" action="Browse" />
                {d.events.length === 0 ? (
                  <EmptyRow icon={Ticket} text="No event registrations yet." cta="Find an event" to="/events" />
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {d.events.slice(0, 4).map((r) => {
                      const upcoming = r.eventId?.date && new Date(r.eventId.date) >= new Date();
                      const free = (r.paymentStatus || "").toLowerCase() === "free" || !(r.amountPaid > 0);
                      return (
                        <li key={r._id} className="flex items-center gap-3 px-5 py-3.5">
                          <span className="grid h-10 w-10 shrink-0 place-items-center" style={{ background: `${CH_COLORS.event}14`, color: CH_COLORS.event }}><Ticket className="h-5 w-5" /></span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-primary">{r.eventId?.title || "Event"}</p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                              <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {fmtDate(r.eventId?.date || r.createdAt)}</span>
                              {upcoming && <span className="bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Upcoming</span>}
                              {(r.numberOfGuests || 0) > 0 && <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> +{r.numberOfGuests}</span>}
                            </div>
                          </div>
                          <span className="shrink-0 text-right">
                            <p className="text-sm font-semibold text-primary">{free ? "Free" : money(r.amountPaid)}</p>
                            <span className={cn("mt-0.5 inline-flex px-1.5 py-0.5 text-[10px] font-semibold", pill(r.paymentStatus))}>{titleCase(r.paymentStatus)}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </motion.div>

            <motion.div variants={fadeUp} custom={10}>
              <Card className="h-full">
                <SectionHead icon={Target} title="Programs supported" sub={`${d.programs.length} program${d.programs.length === 1 ? "" : "s"}`} to="/user/programs" />
                {d.programs.length === 0 ? (
                  <EmptyRow icon={Target} text="You haven't donated to a program yet." cta="Explore programs" to="/programs" />
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {d.programs.slice(0, 4).map((p) => (
                      <li key={p.title} className="flex items-center gap-3 px-5 py-3.5">
                        <span className="grid h-10 w-10 shrink-0 place-items-center bg-accent/10 text-accent"><Target className="h-5 w-5" /></span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-primary">{p.title}</p>
                          <p className="mt-0.5 text-xs text-text-muted">{p.count} donation{p.count === 1 ? "" : "s"} · last {fmtDate(p.last)}</p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-primary">{money(p.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </motion.div>
          </div>

          {/* Campaigns contributed */}
          {d.campaigns.length > 0 && (
            <motion.div variants={fadeUp} custom={11}>
              <Card>
                <SectionHead icon={Megaphone} title="Fundraisers you've supported" sub={`${d.campaigns.length} campaign${d.campaigns.length === 1 ? "" : "s"}`} to="/p2p-campaigns" action="Browse" />
                <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                  {d.campaigns.slice(0, 6).map((c) => (
                    <Link key={c.id} to={c.slug ? `/p2p-campaigns/${c.slug}` : "/p2p-campaigns"} className="group flex flex-col border border-gray-100 p-4 transition-shadow hover:shadow-md">
                      <div className="flex items-start justify-between gap-2">
                        <span className="grid h-9 w-9 shrink-0 place-items-center" style={{ background: `${CH_COLORS.campaign}14`, color: CH_COLORS.campaign }}><Megaphone className="h-[18px] w-[18px]" /></span>
                        <ExternalLink className="h-4 w-4 text-gray-300 transition-colors group-hover:text-accent" />
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-semibold text-primary">{c.title}</p>
                      {c.targetAmount > 0 && (
                        <div className="mt-3">
                          <ProgressBar value={c.currentAmount || 0} max={c.targetAmount} color={CH_COLORS.campaign} />
                          <p className="mt-1 text-[11px] text-text-muted">{moneyShort(c.currentAmount)} of {moneyShort(c.targetAmount)} raised</p>
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-3">
                        <span className="text-[11px] text-text-muted">Your gift</span>
                        <span className="text-sm font-bold text-accent">{money(c.mine)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* My fundraisers */}
          {myFundraisers.length > 0 && (
            <motion.div variants={fadeUp} custom={12}>
              <Card>
                <SectionHead icon={Flag} title="Your fundraisers" sub={`${myFundraisers.length} created`} to="/p2p-campaigns/start" action="Start new" />
                <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                  {myFundraisers.slice(0, 6).map((f) => {
                    const pct = f.targetAmount > 0 ? Math.min(100, Math.round(((f.currentAmount || 0) / f.targetAmount) * 100)) : 0;
                    return (
                      <Link key={f._id} to={f.slug && f.status === "approved" ? `/p2p-campaigns/${f.slug}` : "/p2p-campaigns"} className="group flex flex-col border border-gray-100 p-4 transition-shadow hover:shadow-md">
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-2 text-sm font-semibold text-primary">{f.title}</p>
                          <span className={cn("shrink-0 px-1.5 py-0.5 text-[10px] font-semibold", pill(f.status))}>{titleCase(f.status)}</span>
                        </div>
                        <div className="mt-3">
                          <ProgressBar value={f.currentAmount || 0} max={f.targetAmount || 0} color={accent} />
                          <div className="mt-1.5 flex items-center justify-between text-[11px] text-text-muted">
                            <span>{moneyShort(f.currentAmount)} raised</span>
                            <span className="font-semibold text-primary">{pct}%</span>
                          </div>
                        </div>
                        <p className="mt-2 text-[11px] text-text-muted">Goal {moneyShort(f.targetAmount)}</p>
                      </Link>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          )}

        </>
      )}
    </motion.div>
  );
};

function EmptyRow({ icon: Icon, text, cta, to }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-5 py-10 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-gray-50 text-gray-400"><Icon className="h-5 w-5" /></span>
      <p className="text-sm text-text-muted">{text}</p>
      {cta && to && (
        <Link to={to} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-light">
          {cta} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

export default UserDashboard;
