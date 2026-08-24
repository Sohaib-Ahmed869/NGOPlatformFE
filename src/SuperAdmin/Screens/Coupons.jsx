import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Ticket, Plus, X, Archive, AlertTriangle, Check, CloudOff, Cloud, Sparkles, TrendingUp, RefreshCw, Pencil, RotateCcw, Trash2 } from "lucide-react";
import superadminService from "../../services/superadmin.service";
import { useSARealtime } from "../context/SARealtimeContext";
import { useConfirm } from "../components/ConfirmProvider";
import SAErrorState from "../components/SAErrorState";
import SALoader from "../SALoader";
import { cn } from "../../utils/cn";
import toast from "react-hot-toast";

import AnimatedNumberBase from "../components/AnimatedNumber";

// Kept this screen's original 0.7s pacing — deduplicating the
// implementation shouldn't silently restyle it.
const AnimatedNumber = (props) => <AnimatedNumberBase duration={0.7} {...props} />;
const card = "rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-[var(--admin-card)]";
const HEADER_GRADIENT = "linear-gradient(120deg, var(--tenant-primary, #102A23), var(--tenant-accent, #047857))";
const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-accent dark:border-white/10 dark:bg-white/5 dark:text-white/85";
const labelCls = "mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400";
// Page-bg colour so the ticket notches read as punched-out perforations.
const NOTCH = "var(--tenant-bg, #F3F8F5)";

const EMPTY = { code: "", description: "", type: "percent", value: "", currency: "usd", duration: "once", durationInMonths: "", maxRedemptions: "", redeemBy: "", planCodes: [] };

// Build the create-form state from an existing coupon (used by "Replace").
const formFromCoupon = (c) => ({
  code: c.code || "",
  description: c.description || "",
  type: c.type || "percent",
  value: c.value ?? "",
  currency: c.currency || "usd",
  duration: c.duration || "once",
  durationInMonths: c.durationInMonths ?? "",
  maxRedemptions: c.maxRedemptions ?? "",
  redeemBy: c.redeemBy ? new Date(c.redeemBy).toISOString().slice(0, 10) : "",
  planCodes: [...(c.planCodes || [])],
});
const typeColor = (type) => (type === "percent" ? "#10b981" : "#6366f1");
const discountText = (c) => (c.type === "percent" ? `${c.value || 0}% off` : `$${c.value || 0} off`);
const durationText = (c) => (c.duration === "repeating" && c.durationInMonths ? `repeating · ${c.durationInMonths}mo` : c.duration);

// Ticket action buttons: `flex-1` so they divide the card's full width evenly,
// with a min-width that makes them wrap to a second row instead of squashing
// the labels when all four are showing on a narrow card.
const ACTION_BTN =
  "inline-flex flex-1 min-w-[76px] items-center justify-center gap-1 whitespace-nowrap border px-2 py-1.5 text-[10px] font-medium transition-colors";

const CODE_WORDS = ["SAVE", "LAUNCH", "WELCOME", "BONUS", "DEAL", "OFFER", "PROMO", "HELLO"];
const genCode = () => `${CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)]}${Math.floor(10 + Math.random() * 90)}`;

/* Stat cell in the attached strip under the hero banner. */
function HeaderStat({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${color}1a`, color }}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold leading-none text-gray-900 dark:text-white">{value}</p>
        <p className="mt-1 truncate text-xs text-gray-400">{label}</p>
        {sub ? <p className="truncate text-[10px] text-gray-300 dark:text-white/30">{sub}</p> : null}
      </div>
    </div>
  );
}

/* Entrance choreography — the ticket grid staggers its cards in. */
const gridVariants = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } } };
const cardVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.2, 0.7, 0.2, 1] } },
};

/* Segmented toggle (Type / Duration). */
function Segmented({ value, onChange, options }) {
  return (
    <div className="flex overflow-hidden border border-gray-200 dark:border-white/10">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "flex-1 px-3 py-2 text-xs font-semibold transition-colors",
              active ? "bg-accent text-white" : "bg-white text-gray-500 hover:bg-gray-50 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* Tear-off coupon ticket — used on the grid AND as the live create-preview. */
function CouponTicket({ c, preview = false, onArchive, onEdit, onReplace, onDelete }) {
  const color = typeColor(c.type);
  const archived = !!c.archivedAt;
  const redeemed = c.timesRedeemed || 0;
  const max = c.maxRedemptions ? Number(c.maxRedemptions) : 0;
  const pct = max ? Math.min(100, Math.round((redeemed / max) * 100)) : 0;
  return (
    <div className={cn(`${card} relative overflow-hidden`, archived && "opacity-60")}>
      {/* top stub */}
      <div className="p-5 pb-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${color}1a`, color }}><Ticket className="h-5 w-5" /></span>
          {!preview && (
            archived ? (
              <span className="bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-white/10">Archived</span>
            ) : c.stripeCouponId ? (
              <span className="inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/10"><Check className="h-3 w-3" /> Synced</span>
            ) : (
              <span className="bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/10">Not synced</span>
            )
          )}
        </div>
        <p className="font-mono text-xl font-bold tracking-[0.12em] text-gray-900 dark:text-white">{c.code || <span className="text-gray-300 dark:text-white/20">COUPONCODE</span>}</p>
        <p className="mt-0.5 text-sm font-semibold" style={{ color }}>{discountText(c)} <span className="font-normal capitalize text-gray-400">· {durationText(c)}</span></p>
        {c.description ? <p className="mt-1.5 line-clamp-2 text-xs text-gray-500 dark:text-white/60">{c.description}</p> : null}
      </div>

      {/* perforation — dashed line with punched-out edge notches. The notches are
          ::before/::after pseudo-elements (the page-wide `[&_*]:!rounded-none`
          override targets real elements via `*`, so pseudo-elements stay round). */}
      <div className="relative mx-5 border-t border-dashed border-gray-200 dark:border-white/15 before:absolute before:top-1/2 before:-left-[1.75rem] before:h-4 before:w-4 before:-translate-y-1/2 before:rounded-full before:bg-[var(--tenant-bg)] before:content-[''] after:absolute after:top-1/2 after:-right-[1.75rem] after:h-4 after:w-4 after:-translate-y-1/2 after:rounded-full after:bg-[var(--tenant-bg)] after:content-['']" />

      {/* bottom — meta */}
      <div className="p-5 pt-4">
        <div className="space-y-1.5 font-mono text-[10px] text-gray-400">
          <div className="flex items-center justify-between"><span>Redemptions</span><span className="text-gray-700 dark:text-white/70">{redeemed}{max ? ` / ${max}` : ""}</span></div>
          {max ? (
            <div className="h-1.5 overflow-hidden bg-gray-100 dark:bg-white/10"><div className="h-full" style={{ width: `${pct}%`, background: color }} /></div>
          ) : null}
          <div className="flex justify-between"><span>Expires</span><span className="text-gray-700 dark:text-white/70">{c.redeemBy ? new Date(c.redeemBy).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "Never"}</span></div>
          <div className="flex justify-between"><span>Plans</span><span className="text-gray-700 dark:text-white/70">{c.planCodes?.length ? c.planCodes.join(", ") : "All plans"}</span></div>
        </div>
        {!preview && (
          // The button count varies (1–4 depending on archived/redeemed), so
          // each one flexes to fill the row and they wrap as a group rather
          // than bunching up on the left.
          <div className="mt-3 flex flex-wrap gap-1.5">
            {/* Description + plan limits live only in our DB, so they're a real
                edit. The discount terms are immutable in Stripe — changing those
                means Replace (archive + recreate). */}
            <button onClick={() => onEdit(c)} className={`${ACTION_BTN} border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/70`}>
              <Pencil className="h-3 w-3 shrink-0" /> Edit
            </button>
            {!archived && (
              <button onClick={() => onReplace(c)} title="Archive this and create a replacement with new terms" className={`${ACTION_BTN} border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/70`}>
                <RotateCcw className="h-3 w-3 shrink-0" /> Replace
              </button>
            )}
            {!archived && (
              <button onClick={() => onArchive(c)} className={`${ACTION_BTN} border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10`}>
                <Archive className="h-3 w-3 shrink-0" /> Archive
              </button>
            )}
            {/* Hard delete only for a coupon nobody ever used — anything
                redeemed is a financial record and stays archived. */}
            {redeemed === 0 && (
              <button onClick={() => onDelete(c)} title="Never redeemed — safe to delete outright" className={`${ACTION_BTN} border-red-200 bg-white text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:bg-transparent`}>
                <Trash2 className="h-3 w-3 shrink-0" /> Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [view, setView] = useState("active"); // active | archived | all
  // Non-null while the create modal is acting as "replace <code>".
  const [replacing, setReplacing] = useState(null);
  const [editTarget, setEditTarget] = useState(null); // { code, description, planCodes }
  const [editSaving, setEditSaving] = useState(false);
  const [plans, setPlans] = useState([]); // for the plan-restriction picker

  const [error, setError] = useState(null);
  const [revalidating, setRevalidating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const confirm = useConfirm();
  // Realtime nudge — another operator creating or archiving a coupon clears the
  // cache and bumps this.
  const { couponsVersion } = useSARealtime();

  // Cache-first: the list is session-cached in the service, so revisiting this
  // screen costs no request. Mutations and realtime events clear the cache; a
  // refresh with data already on screen revalidates silently instead of
  // flashing the loader.
  const loadedOnceRef = useRef(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      if (loadedOnceRef.current) setRevalidating(true);
      else setLoading(true);
      try {
        const res = await superadminService.getCouponsCached();
        if (!alive) return;
        setCoupons(res.data.coupons || []);
        setStripeEnabled(res.data.stripeEnabled !== false);
        setError(null);
        loadedOnceRef.current = true;
      } catch (err) {
        if (!alive) return;
        // Not "No coupons yet" — that invites creating a duplicate code.
        const msg = err?.response?.data?.error || "Couldn't load coupons.";
        if (loadedOnceRef.current) toast.error(msg);
        else setError(msg);
      } finally {
        if (alive) {
          setLoading(false);
          setRevalidating(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [refreshKey, couponsVersion]);

  const refresh = () => setRefreshKey((k) => k + 1);
  const hardRefresh = () => {
    superadminService.invalidateCouponsCache();
    refresh();
  };

  // Plans power the "restrict to plans" picker. Session-cached, so this is
  // free once any other screen has loaded them.
  useEffect(() => {
    superadminService
      .getPlansCached()
      .then((res) => setPlans((res.data.plans || []).filter((p) => !p.archivedAt)))
      .catch(() => {});
  }, []);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Everything Stripe will reject, caught here so the operator gets a pointed
  // message instead of a generic 400 (the server enforces the same rules).
  const validate = () => {
    const code = form.code.trim();
    if (!code) return "A coupon code is required";
    if (!/^[A-Z0-9_-]{3,}$/.test(code)) return "Code must be 3+ characters: letters, numbers, - or _";
    // When replacing, reusing the SAME code is the point — the server archives
    // the original before recreating it.
    if (coupons.some((c) => c.code === code && c.code !== replacing)) return `Coupon ${code} already exists`;
    const amount = Number(form.value);
    if (!form.value || !Number.isFinite(amount) || amount <= 0) return "Discount must be a positive number";
    if (form.type === "percent" && amount > 100) return "A percent discount cannot exceed 100";
    if (form.duration === "repeating") {
      const months = Number(form.durationInMonths);
      if (!form.durationInMonths || !Number.isFinite(months) || months < 1) return "Repeating coupons need a month count of 1 or more";
    }
    if (form.maxRedemptions !== "") {
      const max = Number(form.maxRedemptions);
      // "0" is truthy as a string — a plain falsy check would let a coupon
      // through that can never be redeemed.
      if (!Number.isFinite(max) || max < 1) return "Max redemptions must be at least 1, or blank for unlimited";
    }
    if (form.redeemBy) {
      const d = new Date(`${form.redeemBy}T23:59:59`);
      if (Number.isNaN(d.getTime())) return "Invalid expiry date";
      if (d.getTime() < Date.now()) return "The expiry date is in the past";
    }
    return null;
  };

  const save = async () => {
    if (saving) return;
    const problem = validate();
    if (problem) return toast.error(problem);
    setSaving(true);
    try {
      const body = {
        code: form.code.trim(),
        description: form.description,
        type: form.type,
        value: Number(form.value),
        currency: form.currency,
        duration: form.duration,
        durationInMonths: form.duration === "repeating" ? Number(form.durationInMonths) || 1 : undefined,
        maxRedemptions: form.maxRedemptions === "" ? undefined : Number(form.maxRedemptions),
        redeemBy: form.redeemBy || undefined,
        planCodes: form.planCodes,
      };
      if (replacing) {
        const res = await superadminService.replaceCoupon(replacing, body);
        toast.success(
          res.data.archived
            ? `${res.data.archived} archived — ${res.data.coupon.code} is live`
            : `${res.data.coupon.code} reissued on the new terms`,
        );
      } else {
        const res = await superadminService.createCoupon(body);
        // The row saves even when the Stripe half fails, and a coupon with no
        // Stripe promotion code silently does nothing at checkout — so don't
        // report a plain success when the server says it didn't sync.
        if (res?.data?.stripeSynced === false) {
          toast.error(res.data.warning || "Coupon saved but not synced to Stripe", { duration: 9000 });
        } else {
          toast.success("Coupon created");
        }
      }
      setOpen(false);
      setReplacing(null);
      setForm(EMPTY);
      refresh(); // the service already dropped the cache
    } catch (err) {
      toast.error(err?.response?.data?.error || `Failed to ${replacing ? "replace" : "create"} coupon`);
    } finally {
      setSaving(false);
    }
  };

  const startReplace = (c) => {
    setReplacing(c.code);
    setForm(formFromCoupon(c));
    setOpen(true);
  };

  const saveEdit = async () => {
    if (!editTarget || editSaving) return;
    setEditSaving(true);
    try {
      await superadminService.updateCoupon(editTarget.code, {
        description: editTarget.description,
        planCodes: editTarget.planCodes,
      });
      toast.success("Coupon updated");
      setEditTarget(null);
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to update coupon");
    } finally {
      setEditSaving(false);
    }
  };

  // Hard delete — offered only for never-redeemed coupons; the server enforces
  // the same rule, so a stale UI can't destroy a used one.
  const removeCoupon = async (c) => {
    const ok = await confirm({
      title: `Delete ${c.code}?`,
      message: "This coupon has never been redeemed, so it can be removed completely — from here and from Stripe. Archived coupons keep their history; a delete does not.",
      tone: "danger",
      confirmText: "Delete permanently",
    });
    if (!ok) return;
    try {
      await superadminService.deleteCoupon(c.code);
      toast.success(`${c.code} deleted`);
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to delete coupon");
    }
  };

  // Closing the create modal throws the form away — confirm if anything's typed.
  const closeCreate = async () => {
    if (saving) return;
    const pristine = replacing ? formFromCoupon(coupons.find((c) => c.code === replacing) || {}) : EMPTY;
    const touched = JSON.stringify(form) !== JSON.stringify(pristine);
    if (touched) {
      const ok = await confirm({
        title: replacing ? "Discard this replacement?" : "Discard this coupon?",
        message: replacing
          ? `Closing now leaves ${replacing} exactly as it is — nothing has been archived yet.`
          : "You've started filling in a coupon. Closing now discards it.",
        tone: "danger",
        confirmText: "Discard",
        cancelText: "Keep editing",
      });
      if (!ok) return;
    }
    setOpen(false);
    setReplacing(null);
    setForm(EMPTY);
  };

  const archive = async () => {
    if (!archiveTarget || archiving) return;
    setArchiving(true);
    try {
      await superadminService.archiveCoupon(archiveTarget.code);
      toast.success("Coupon archived");
      setArchiveTarget(null);
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to archive");
    } finally {
      setArchiving(false);
    }
  };

  const { active, archivedCount, visible, statTiles } = useMemo(() => {
    const act = coupons.filter((c) => !c.archivedAt);
    const totalRedemptions = coupons.reduce((s, c) => s + (c.timesRedeemed || 0), 0);
    const synced = act.filter((c) => c.stripeCouponId).length;
    // Live coupons that can still actually be redeemed today.
    const now = Date.now();
    const redeemable = act.filter(
      (c) =>
        (!c.redeemBy || new Date(c.redeemBy).getTime() >= now) &&
        (!c.maxRedemptions || (c.timesRedeemed || 0) < c.maxRedemptions),
    ).length;
    return {
      active: act,
      archivedCount: coupons.length - act.length,
      visible: coupons.filter((c) => (view === "all" ? true : view === "archived" ? c.archivedAt : !c.archivedAt)),
      statTiles: [
        { label: "Coupons", value: <AnimatedNumber value={coupons.length} />, sub: `${coupons.length - act.length} archived`, icon: Ticket, color: "#6366f1" },
        { label: "Active", value: <AnimatedNumber value={act.length} />, sub: `${redeemable} still redeemable`, icon: Check, color: "#10b981" },
        { label: "Redemptions", value: <AnimatedNumber value={totalRedemptions} />, sub: "across all coupons", icon: TrendingUp, color: "#0ea5e9" },
        {
          label: "Synced to Stripe",
          value: <AnimatedNumber value={synced} suffix={` / ${act.length}`} />,
          sub: synced === act.length ? "all in sync" : `${act.length - synced} not synced`,
          icon: Cloud,
          color: synced === act.length ? "#10b981" : "#f59e0b",
        },
      ],
    };
  }, [coupons, view]);

  return (
    // Sharp-corner variant: square every descendant's corners — matches the rest.
    // MotionConfig honours the OS "reduce motion" preference for everything inside.
    <MotionConfig reducedMotion="user">
    <div className="[&_*]:!rounded-none">
      {/* Hero — gradient banner + attached stat strip */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }} className={`${card} mb-6 overflow-hidden`}>
        <div className="relative flex flex-wrap items-start justify-between gap-4 overflow-hidden px-6 py-7 sm:px-8" style={{ background: HEADER_GRADIENT }}>
          <svg aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 text-white" viewBox="0 0 128 128" fill="none">
            <circle cx="64" cy="64" r="46" fill="currentColor" fillOpacity="0.06" />
            <circle cx="64" cy="64" r="46" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" />
          </svg>
          <div aria-hidden className="pointer-events-none absolute bottom-4 right-12 h-10 w-24 opacity-[.20]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.95) 1.5px, transparent 1.5px)", backgroundSize: "12px 12px" }} />
          <div className="relative z-10 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Billing</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Coupons</h1>
            <p className="mt-1 text-sm text-white/80">Discount codes for new SaaS subscriptions — synced to Stripe.</p>
          </div>
          <div className="relative z-10 flex items-center gap-2">
            <button
              type="button"
              title="Refresh"
              aria-label="Refresh"
              onClick={hardRefresh}
              disabled={loading || revalidating}
              className="grid h-9 w-9 shrink-0 place-items-center bg-white/15 text-white ring-1 ring-white/25 transition-colors hover:bg-white/25 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${revalidating ? "animate-spin" : ""}`} />
            </button>
            <button onClick={() => { setForm(EMPTY); setOpen(true); }} className="inline-flex items-center gap-1.5 bg-white/15 px-3.5 py-2 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur-sm transition-colors hover:bg-white/25">
              <Plus className="h-4 w-4" /> New coupon
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 dark:divide-white/10 sm:grid-cols-4 sm:divide-y-0">
          {statTiles.map((t, i) => (
            <motion.div
              key={t.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.06, duration: 0.4, ease: "easeOut" }}
            >
              <HeaderStat {...t} />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {!stripeEnabled && (
        <div className="mb-5 flex items-center gap-2 border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10">
          <CloudOff className="h-4 w-4 shrink-0" /> Stripe is not configured — coupons are saved but not synced.
        </div>
      )}

      {/* Filter */}
      {!loading && coupons.length > 0 && (
        <div className="mb-5 flex items-center gap-2">
          {[
            { value: "active", label: `Active (${active.length})` },
            { value: "archived", label: `Archived (${archivedCount})` },
            { value: "all", label: `All (${coupons.length})` },
          ].map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setView(o.value)}
              className={cn("relative px-3 py-1.5 text-xs font-medium transition-colors", view === o.value ? "text-white" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-white/5 dark:text-white/70 dark:ring-white/10")}
            >
              {view === o.value && (
                <motion.span
                  layoutId="saCouponViewPill"
                  className="absolute inset-0 bg-accent"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative z-[1]">{o.label}</span>
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
      {loading ? (
        <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <SALoader label="Coupons" />
        </motion.div>
      ) : error ? (
        <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <SAErrorState message={error} onRetry={hardRefresh} />
        </motion.div>
      ) : coupons.length === 0 ? (
        <motion.div
          key="empty"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={`${card} py-20 text-center`}
        >
          <motion.span
            className="inline-block"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.08 }}
          >
            <Ticket className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          </motion.span>
          <p className="text-gray-500">No coupons yet</p>
          <button onClick={() => { setForm(EMPTY); setOpen(true); }} className="mt-4 inline-flex items-center gap-1.5 bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-light"><Plus className="h-4 w-4" /> Create your first coupon</button>
        </motion.div>
      ) : visible.length === 0 ? (
        <motion.div
          key={`empty-${view}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={`${card} py-20 text-center`}
        >
          <Ticket className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">No {view} coupons</p>
        </motion.div>
      ) : (
        <motion.div
          key={`grid-${view}`}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={gridVariants}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
        >
          {visible.map((c) => (
            <motion.div key={c._id} layout variants={cardVariants} whileHover={{ y: -4 }}>
              <CouponTicket
                c={c}
                onArchive={setArchiveTarget}
                onEdit={(x) => setEditTarget({ code: x.code, description: x.description || "", planCodes: [...(x.planCodes || [])] })}
                onReplace={startReplace}
                onDelete={removeCoupon}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
      </AnimatePresence>

      {/* Create modal — form + live preview */}
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeCreate} />
            <motion.div
              className={`${card} relative max-h-[92vh] w-full max-w-3xl overflow-hidden shadow-xl`}
              initial={{ scale: 0.94, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 16, opacity: 0, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-white/10">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{replacing ? `Replace ${replacing}` : "New coupon"}</h3>
                  {replacing && (
                    <p className="mt-0.5 text-xs text-gray-400">
                      {form.code.trim() === replacing
                        ? `Stripe can't change a live coupon's terms, so ${replacing} is reissued: the old Stripe coupon is dropped and a fresh one created under the same code. Its redemption count restarts, and tenants already on the old discount keep it.`
                        : `Saving archives ${replacing} and creates ${form.code.trim() || "the new code"} alongside it. Tenants already on the old discount keep it.`}
                    </p>
                  )}
                </div>
                <button onClick={closeCreate} disabled={saving} className="grid h-8 w-8 shrink-0 place-items-center text-gray-400 hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-white/10"><X className="h-4 w-4" /></button>
              </div>

              <div className="grid max-h-[calc(92vh-8rem)] grid-cols-1 overflow-y-auto sm:grid-cols-2">
                {/* Form */}
                <div className="space-y-4 p-6">
                  <div>
                    <label className={labelCls}>Code</label>
                    <div className="flex gap-2">
                      <input className={`${inputCls} font-mono uppercase`} value={form.code} onChange={(e) => setField("code", e.target.value.toUpperCase())} placeholder="LAUNCH20" />
                      <button type="button" onClick={() => setField("code", genCode())} title="Generate a code" className="inline-flex shrink-0 items-center gap-1 border border-gray-200 px-2.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/10">
                        <Sparkles className="h-3.5 w-3.5" /> Generate
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Description</label>
                    <input className={inputCls} value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="20% off the first year" />
                  </div>
                  <div>
                    <label className={labelCls}>Discount type</label>
                    <Segmented value={form.type} onChange={(v) => setField("type", v)} options={[{ value: "percent", label: "Percent (%)" }, { value: "amount", label: "Fixed ($)" }]} />
                  </div>
                  <div>
                    <label className={labelCls}>{form.type === "percent" ? "Percent off" : "Amount off ($)"}</label>
                    <input type="number" min="0" className={inputCls} value={form.value} onChange={(e) => setField("value", e.target.value)} placeholder={form.type === "percent" ? "20" : "50"} />
                  </div>
                  <div>
                    <label className={labelCls}>Duration</label>
                    <Segmented value={form.duration} onChange={(v) => setField("duration", v)} options={[{ value: "once", label: "Once" }, { value: "repeating", label: "Repeating" }, { value: "forever", label: "Forever" }]} />
                  </div>
                  {form.duration === "repeating" && (
                    <div>
                      <label className={labelCls}>Months</label>
                      <input type="number" min="1" className={inputCls} value={form.durationInMonths} onChange={(e) => setField("durationInMonths", e.target.value)} placeholder="3" />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Max redemptions</label>
                      <input type="number" min="0" className={inputCls} value={form.maxRedemptions} onChange={(e) => setField("maxRedemptions", e.target.value)} placeholder="∞" />
                    </div>
                    <div>
                      <label className={labelCls}>Expires</label>
                      <input type="date" className={inputCls} value={form.redeemBy} onChange={(e) => setField("redeemBy", e.target.value)} />
                    </div>
                  </div>
                  {/* Plan whitelist — enforced by the coupon validator, not by
                      Stripe. Empty = valid on every plan. */}
                  {plans.length > 0 && (
                    <div>
                      <label className={labelCls}>Restrict to plans</label>
                      <div className="flex flex-wrap gap-1.5">
                        {plans.map((p) => {
                          const on = form.planCodes.includes(p.code);
                          return (
                            <button
                              key={p.code}
                              type="button"
                              onClick={() =>
                                setField("planCodes", on ? form.planCodes.filter((x) => x !== p.code) : [...form.planCodes, p.code])
                              }
                              className={cn(
                                "inline-flex items-center gap-1 border px-2.5 py-1 text-xs transition-colors",
                                on
                                  ? "border-accent bg-accent/10 font-medium text-accent"
                                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/70",
                              )}
                            >
                              {on && <Check className="h-3 w-3" />} {p.name}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-1.5 text-[11px] text-gray-400">
                        {form.planCodes.length === 0 ? "Valid on all plans." : `Only redeemable on ${form.planCodes.length} plan${form.planCodes.length === 1 ? "" : "s"}.`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Live preview */}
                <div className="border-t border-gray-100 p-6 dark:border-white/10 sm:border-l sm:border-t-0" style={{ background: NOTCH }}>
                  <p className="mb-3 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Live preview</p>
                  <CouponTicket c={{ ...form, timesRedeemed: 0 }} preview />
                  <p className="mt-3 text-center text-[11px] text-gray-400">This is how the coupon will read to your team.</p>
                </div>
              </div>

              <div className="flex gap-3 border-t border-gray-100 px-6 py-4 dark:border-white/10">
                <button onClick={closeCreate} disabled={saving} className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-white/80">Cancel</button>
                <button onClick={save} disabled={saving} className="flex-1 bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent-light disabled:opacity-50">
                  {saving ? (replacing ? "Replacing…" : "Creating…") : replacing ? `Archive & replace ${replacing}` : "Create coupon"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit modal — ONLY the fields that don't exist in Stripe's economics */}
      <AnimatePresence>
        {editTarget && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !editSaving && setEditTarget(null)} />
            <motion.div
              className={`${card} relative w-full max-w-md p-6 shadow-xl`}
              initial={{ scale: 0.92, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 16, opacity: 0, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit {editTarget.code}</h3>
              <p className="mt-1 text-xs text-gray-400">
                The discount, duration, limit and expiry are fixed once a coupon exists — Stripe doesn&apos;t allow changing them. Use
                Replace for those.
              </p>
              <div className="mt-5 space-y-4">
                <div>
                  <label className={labelCls}>Description</label>
                  <input
                    className={inputCls}
                    value={editTarget.description}
                    onChange={(e) => setEditTarget((t) => ({ ...t, description: e.target.value }))}
                    placeholder="20% off the first year"
                  />
                </div>
                <div>
                  <label className={labelCls}>Restrict to plans</label>
                  {plans.length === 0 ? (
                    <p className="text-xs text-gray-400">No active plans to restrict to.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {plans.map((p) => {
                        const on = editTarget.planCodes.includes(p.code);
                        return (
                          <button
                            key={p.code}
                            type="button"
                            onClick={() =>
                              setEditTarget((t) => ({
                                ...t,
                                planCodes: on ? t.planCodes.filter((x) => x !== p.code) : [...t.planCodes, p.code],
                              }))
                            }
                            className={cn(
                              "inline-flex items-center gap-1 border px-2.5 py-1 text-xs transition-colors",
                              on
                                ? "border-accent bg-accent/10 font-medium text-accent"
                                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/70",
                            )}
                          >
                            {on && <Check className="h-3 w-3" />} {p.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <p className="mt-1.5 text-[11px] text-gray-400">
                    {editTarget.planCodes.length === 0 ? "Valid on all plans." : `Only redeemable on ${editTarget.planCodes.length} plan${editTarget.planCodes.length === 1 ? "" : "s"}.`}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setEditTarget(null)} disabled={editSaving} className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:text-white/80">Cancel</button>
                <button onClick={saveEdit} disabled={editSaving} className="flex-1 bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent-light disabled:opacity-60">{editSaving ? "Saving…" : "Save changes"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Archive confirm */}
      <AnimatePresence>
        {archiveTarget && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !archiving && setArchiveTarget(null)} />
            <motion.div
              className={`${card} relative w-full max-w-sm p-6 shadow-xl`}
              initial={{ scale: 0.92, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 16, opacity: 0, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.08 }}
                className="mx-auto mb-4 grid h-12 w-12 place-items-center bg-red-50 ring-1 ring-red-100 dark:bg-red-500/10"
              >
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </motion.div>
              <h3 className="mb-1 text-center text-lg font-semibold text-gray-900 dark:text-white">Archive coupon</h3>
              <p className="mb-6 text-center text-sm text-gray-500">
                Archive <strong className="text-gray-800 dark:text-white/90">{archiveTarget.code}</strong>? It can no longer be redeemed
                {archiveTarget.timesRedeemed > 0
                  ? `, but the ${archiveTarget.timesRedeemed} existing redemption${archiveTarget.timesRedeemed === 1 ? "" : "s"} keep their discount`
                  : ""}
                .
              </p>
              <div className="flex gap-3">
                <button onClick={() => setArchiveTarget(null)} disabled={archiving} className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:text-white/80">Cancel</button>
                <button onClick={archive} disabled={archiving} className="flex-1 bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{archiving ? "Archiving…" : "Archive"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
}
