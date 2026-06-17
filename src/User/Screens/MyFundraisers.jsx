import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Megaphone,
  Plus,
  Users,
  TrendingUp,
  Target,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import GoFundMeService from "../../services/goFundMeService";
import { TabLoader } from "../../components/TabLoader";
import { withMinDelay } from "../../utils/minDelay";
import { cn } from "../../utils/cn";

// Session cache so the screen paints instantly on revisit (stale-while-revalidate).
let _fundraisersCache = null;

const HEADER_GRADIENT = "linear-gradient(120deg, var(--tenant-primary, #2C2418), var(--tenant-accent, #C9A84C))";
const money = (n) => `$${Number(n || 0).toLocaleString()}`;

const statusMeta = (s, isActive) => {
  const v = (s || "").toLowerCase();
  if (v === "approved") return { label: isActive === false ? "Paused" : "Live", cls: "bg-green-50 text-green-700" };
  if (v === "completed") return { label: "Funded", cls: "bg-emerald-50 text-emerald-700" };
  if (v === "pending") return { label: "Under review", cls: "bg-amber-50 text-amber-700" };
  if (v === "rejected") return { label: "Not approved", cls: "bg-red-50 text-red-700" };
  if (v === "deactivated") return { label: "Closed", cls: "bg-gray-100 text-gray-600" };
  return { label: s || "—", cls: "bg-gray-100 text-gray-600" };
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "approved", label: "Live" },
  { value: "pending", label: "Under review" },
  { value: "completed", label: "Funded" },
];

function HeaderStat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 bg-white px-5 py-4 sm:px-6">
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

const catLabel = (f) => (f.category === "other" ? f.customCategory || "Other" : f.category);

function FundraiserCard({ f, index = 0 }) {
  const pct = f.targetAmount > 0 ? Math.min(100, Math.round((f.currentAmount / f.targetAmount) * 100)) : 0;
  const st = statusMeta(f.status, f.isActive);
  const viewable = (f.status === "approved" || f.status === "completed") && f.slug;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: Math.min(index * 0.04, 0.32) }}
      className="flex flex-col overflow-hidden border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative h-36 w-full bg-accent/10">
        {f.image && <img src={f.image} alt={f.title} className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
        <span className="absolute left-3 top-3 bg-white/90 px-2 py-0.5 text-[10px] font-semibold capitalize text-primary backdrop-blur">
          {catLabel(f)}
        </span>
        <span className={cn("absolute right-3 top-3 px-2 py-0.5 text-[10px] font-semibold", st.cls)}>{st.label}</span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="truncate font-heading text-base font-bold text-primary" title={f.title}>{f.title}</h3>

        <div className="mt-3">
          <div className="mb-1.5 flex items-end justify-between">
            <span className="font-heading text-lg font-bold text-primary">{money(f.currentAmount)}</span>
            <span className="text-xs font-semibold text-accent">{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
            <span>of {money(f.targetAmount)}</span>
            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {f.donationCount || 0}</span>
          </div>
        </div>

        {/* Status-specific footer */}
        <div className="mt-auto pt-5">
          {viewable ? (
            <Link
              to={`/p2p-campaigns/${f.slug}`}
              className="flex w-full items-center justify-center gap-2 border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-accent/50 hover:text-accent"
            >
              View fundraiser <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : f.status === "pending" ? (
            <div className="flex items-start gap-2 border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" /> Awaiting admin approval — you'll be notified once it's live.
            </div>
          ) : f.status === "rejected" ? (
            <div className="flex items-start gap-2 border border-red-100 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{f.adminNotes ? f.adminNotes : "This fundraiser wasn't approved."}</span>
            </div>
          ) : (
            <div className="border border-gray-100 bg-gray-50 p-3 text-center text-xs text-text-muted">This fundraiser is closed.</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function MyFundraisers() {
  const [items, setItems] = useState(_fundraisersCache || []);
  const [loading, setLoading] = useState(!_fundraisersCache);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let active = true;
    const cold = !_fundraisersCache;
    (async () => {
      try {
        const req = GoFundMeService.getMyRequests();
        const res = cold ? await withMinDelay(req) : await req;
        if (!active) return;
        const list = res?.goFundMes || [];
        _fundraisersCache = list;
        setItems(list);
      } catch {
        if (active) toast.error("Couldn't load your fundraisers");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(() => {
    const c = { all: items.length, approved: 0, pending: 0, completed: 0 };
    items.forEach((f) => {
      if (c[f.status] !== undefined) c[f.status] += 1;
    });
    return c;
  }, [items]);

  const stats = useMemo(() => {
    const live = items.filter((f) => f.status === "approved" || f.status === "completed");
    return {
      raised: live.reduce((s, f) => s + (f.currentAmount || 0), 0),
      backers: items.reduce((s, f) => s + (f.donationCount || 0), 0),
      count: items.length,
    };
  }, [items]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <TabLoader />
      </div>
    );
  }

  const visible = filter === "all" ? items : items.filter((f) => f.status === filter);

  return (
    <div className="w-full space-y-6">
      {/* Header card with gradient band + integrated stats */}
      <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-7 sm:px-8" style={{ background: HEADER_GRADIENT }}>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Community fundraisers</p>
            <h1 className="mt-1 font-heading text-2xl font-bold text-white">My Fundraisers</h1>
            <p className="mt-1 text-sm text-white/80">The fundraisers you've started and how they're tracking.</p>
          </div>
          <Link
            to="/p2p-campaigns/start"
            className="inline-flex shrink-0 items-center gap-1.5 bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-white/90"
          >
            <Plus className="h-4 w-4" /> Start a fundraiser
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-px bg-gray-100 sm:grid-cols-3">
          <HeaderStat icon={TrendingUp} label="Raised so far" value={money(stats.raised)} />
          <HeaderStat icon={Megaphone} label="Fundraisers" value={stats.count} />
          <HeaderStat icon={Users} label="Total backers" value={stats.backers} />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="border border-gray-100 bg-white p-12 text-center shadow-sm">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center bg-accent/10 text-accent">
            <Megaphone className="h-6 w-6" />
          </span>
          <p className="font-medium text-primary">No fundraisers yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">Start a fundraiser to rally your community around a cause you care about.</p>
          <Link to="/p2p-campaigns/start" className="mt-6 inline-flex items-center gap-2 bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-light">
            <Plus className="h-4 w-4" /> Start a fundraiser
          </Link>
        </div>
      ) : (
        <>
          {/* Filter pills */}
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const active = filter === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    "relative isolate inline-flex items-center gap-1.5 border px-3.5 py-1.5 text-sm font-medium transition-colors duration-200",
                    active
                      ? "border-accent text-accent"
                      : "border-gray-200 text-text-muted hover:border-accent/40 hover:text-primary",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="fundraisersFilterActive"
                      className="absolute inset-0 -z-10 bg-accent/10"
                      transition={{ type: "spring", stiffness: 500, damping: 34 }}
                    />
                  )}
                  {f.label}
                  <span className={cn("text-xs", active ? "text-accent/70" : "text-gray-400")}>{counts[f.value] ?? 0}</span>
                </button>
              );
            })}
          </div>

          <motion.div
            key={filter}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {visible.length === 0 ? (
              <div className="border border-gray-100 bg-white p-12 text-center shadow-sm">
                <CheckCircle className="mx-auto mb-3 h-10 w-10 text-text-muted" />
                <p className="font-medium text-primary">Nothing in this category</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((f, i) => (
                  <FundraiserCard key={f._id} f={f} index={i} />
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}
