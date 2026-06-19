import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ticket, Plus, X, Archive, AlertTriangle, Check, CloudOff, Cloud, Sparkles, TrendingUp } from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SASelect from "../components/SASelect";
import SALoader from "../SALoader";
import { cn } from "../../utils/cn";
import toast from "react-hot-toast";

const card = "rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-[var(--admin-card)]";
const HEADER_GRADIENT = "linear-gradient(120deg, var(--tenant-primary, #102A23), var(--tenant-accent, #047857))";
const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-accent dark:border-white/10 dark:bg-white/5 dark:text-white/85";
const labelCls = "mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400";
// Page-bg colour so the ticket notches read as punched-out perforations.
const NOTCH = "var(--tenant-bg, #F3F8F5)";

const EMPTY = { code: "", description: "", type: "percent", value: "", currency: "usd", duration: "once", durationInMonths: "", maxRedemptions: "", redeemBy: "" };
const typeColor = (type) => (type === "percent" ? "#10b981" : "#6366f1");
const discountText = (c) => (c.type === "percent" ? `${c.value || 0}% off` : `$${c.value || 0} off`);
const durationText = (c) => (c.duration === "repeating" && c.durationInMonths ? `repeating · ${c.durationInMonths}mo` : c.duration);

const CODE_WORDS = ["SAVE", "LAUNCH", "WELCOME", "BONUS", "DEAL", "OFFER", "PROMO", "HELLO"];
const genCode = () => `${CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)]}${Math.floor(10 + Math.random() * 90)}`;

/* Stat cell in the attached strip under the hero banner. */
function HeaderStat({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${color}1a`, color }}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold leading-none text-gray-900 dark:text-white">{value}</p>
        <p className="mt-1 text-xs text-gray-400">{label}</p>
      </div>
    </div>
  );
}

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
function CouponTicket({ c, preview = false, onArchive }) {
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
        {!preview && !archived ? (
          <button onClick={() => onArchive(c)} className="mt-3 inline-flex items-center gap-1 border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-600 transition-colors hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10">
            <Archive className="h-3 w-3" /> Archive
          </button>
        ) : null}
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
  const [view, setView] = useState("active"); // active | archived | all

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await superadminService.getCoupons();
      setCoupons(res.data.coupons || []);
      setStripeEnabled(res.data.stripeEnabled !== false);
    } catch {
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.code.trim() || !form.value) return toast.error("Code and value are required");
    setSaving(true);
    try {
      await superadminService.createCoupon({
        code: form.code,
        description: form.description,
        type: form.type,
        value: Number(form.value),
        currency: form.currency,
        duration: form.duration,
        durationInMonths: form.duration === "repeating" ? Number(form.durationInMonths) || 1 : undefined,
        maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
        redeemBy: form.redeemBy || undefined,
      });
      toast.success("Coupon created");
      setOpen(false);
      setForm(EMPTY);
      fetchCoupons();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to create coupon");
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    try {
      await superadminService.archiveCoupon(archiveTarget.code);
      toast.success("Coupon archived");
      setArchiveTarget(null);
      fetchCoupons();
    } catch {
      toast.error("Failed to archive");
    }
  };

  const active = coupons.filter((c) => !c.archivedAt);
  const totalRedemptions = coupons.reduce((s, c) => s + (c.timesRedeemed || 0), 0);
  const syncedCount = active.filter((c) => c.stripeCouponId).length;
  const statTiles = [
    { label: "Coupons", value: coupons.length, icon: Ticket, color: "#6366f1" },
    { label: "Active", value: active.length, icon: Check, color: "#10b981" },
    { label: "Redemptions", value: totalRedemptions, icon: TrendingUp, color: "#0ea5e9" },
    { label: "Synced to Stripe", value: syncedCount, icon: Cloud, color: "#f59e0b" },
  ];

  const archivedCount = coupons.length - active.length;
  const visible = coupons.filter((c) => (view === "all" ? true : view === "archived" ? c.archivedAt : !c.archivedAt));

  return (
    // Sharp-corner variant: square every descendant's corners — matches the rest.
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
          <button onClick={() => { setForm(EMPTY); setOpen(true); }} className="relative z-10 inline-flex items-center gap-1.5 bg-white/15 px-3.5 py-2 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur-sm transition-colors hover:bg-white/25">
            <Plus className="h-4 w-4" /> New coupon
          </button>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 dark:divide-white/10 sm:grid-cols-4 sm:divide-y-0">
          {statTiles.map((t) => <HeaderStat key={t.label} {...t} />)}
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
              className={cn("px-3 py-1.5 text-xs font-medium transition-colors", view === o.value ? "bg-accent text-white" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-white/5 dark:text-white/70 dark:ring-white/10")}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <SALoader label="Coupons" />
      ) : coupons.length === 0 ? (
        <div className={`${card} py-20 text-center`}>
          <Ticket className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">No coupons yet</p>
          <button onClick={() => { setForm(EMPTY); setOpen(true); }} className="mt-4 inline-flex items-center gap-1.5 bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-light"><Plus className="h-4 w-4" /> Create your first coupon</button>
        </div>
      ) : visible.length === 0 ? (
        <div className={`${card} py-20 text-center`}>
          <Ticket className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">No {view} coupons</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((c, i) => (
            <motion.div key={c._id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.4) }}>
              <CouponTicket c={c} onArchive={setArchiveTarget} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Create modal — form + live preview */}
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div className={`${card} relative max-h-[92vh] w-full max-w-3xl overflow-hidden shadow-xl`} initial={{ scale: 0.96, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 20 }}>
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-white/10">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">New coupon</h3>
                <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10"><X className="h-4 w-4" /></button>
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
                </div>

                {/* Live preview */}
                <div className="border-t border-gray-100 p-6 dark:border-white/10 sm:border-l sm:border-t-0" style={{ background: NOTCH }}>
                  <p className="mb-3 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Live preview</p>
                  <CouponTicket c={{ ...form, timesRedeemed: 0, planCodes: [] }} preview />
                  <p className="mt-3 text-center text-[11px] text-gray-400">This is how the coupon will read to your team.</p>
                </div>
              </div>

              <div className="flex gap-3 border-t border-gray-100 px-6 py-4 dark:border-white/10">
                <button onClick={() => setOpen(false)} className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-white/80">Cancel</button>
                <button onClick={save} disabled={saving} className="flex-1 bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent-light disabled:opacity-50">{saving ? "Creating…" : "Create coupon"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Archive confirm */}
      <AnimatePresence>
        {archiveTarget && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setArchiveTarget(null)} />
            <motion.div className={`${card} relative w-full max-w-sm p-6 shadow-xl`} initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center bg-red-50 ring-1 ring-red-100 dark:bg-red-500/10"><AlertTriangle className="h-6 w-6 text-red-500" /></div>
              <h3 className="mb-1 text-center text-lg font-semibold text-gray-900 dark:text-white">Archive coupon</h3>
              <p className="mb-6 text-center text-sm text-gray-500">Archive <strong className="text-gray-800 dark:text-white/90">{archiveTarget.code}</strong>? It can no longer be redeemed.</p>
              <div className="flex gap-3">
                <button onClick={() => setArchiveTarget(null)} className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-white/80">Cancel</button>
                <button onClick={archive} className="flex-1 bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Archive</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
