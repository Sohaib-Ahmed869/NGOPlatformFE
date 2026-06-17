import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ticket, Plus, X, Archive, AlertTriangle, Check, CloudOff } from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SAPageHeader from "../components/SAPageHeader";
import SASelect from "../components/SASelect";
import SALoader from "../SALoader";
import toast from "react-hot-toast";

const card = "rounded-xl border border-gray-100 bg-white shadow-sm";
const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-accent dark:border-white/10 dark:bg-white/5";
const labelCls = "mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400";

const EMPTY = { code: "", description: "", type: "percent", value: "", currency: "usd", duration: "once", durationInMonths: "", maxRedemptions: "", redeemBy: "" };
const fmtDiscount = (c) => (c.type === "percent" ? `${c.value}% off` : `$${c.value} off`);

export default function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState(null);

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

  return (
    <div>
      <SAPageHeader
        eyebrow="Billing"
        title="Coupons"
        subtitle="Discount codes for new SaaS subscriptions — synced to Stripe."
        actions={
          <button onClick={() => { setForm(EMPTY); setOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white hover:bg-accent-light">
            <Plus className="h-4 w-4" /> New Coupon
          </button>
        }
      />

      {!stripeEnabled && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          <CloudOff className="h-4 w-4 shrink-0" /> Stripe is not configured — coupons are saved but not synced.
        </div>
      )}

      {loading ? (
        <SALoader />
      ) : coupons.length === 0 ? (
        <div className={`${card} py-20 text-center`}>
          <Ticket className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">No coupons yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coupons.map((c, i) => (
            <motion.div key={c._id} className={`${card} p-5 ${c.archivedAt ? "opacity-60" : ""}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <div className="mb-3 flex items-start justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent"><Ticket className="h-5 w-5" /></span>
                {c.archivedAt ? (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">Archived</span>
                ) : c.stripeCouponId ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700"><Check className="h-3 w-3" /> Synced</span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Not synced</span>
                )}
              </div>
              <p className="font-mono text-lg font-bold tracking-wide text-gray-900">{c.code}</p>
              <p className="text-sm font-semibold text-accent">{fmtDiscount(c)} <span className="font-normal text-gray-400">· {c.duration}</span></p>
              {c.description && <p className="mt-1 text-xs text-gray-500">{c.description}</p>}
              <div className="mt-3 space-y-1 border-t border-gray-100 pt-3 font-mono text-[10px] text-gray-400">
                <div className="flex justify-between"><span>Redemptions</span><span className="text-gray-700">{c.timesRedeemed}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}</span></div>
                {c.redeemBy && <div className="flex justify-between"><span>Expires</span><span className="text-gray-700">{new Date(c.redeemBy).toLocaleDateString()}</span></div>}
                <div className="flex justify-between"><span>Plans</span><span className="text-gray-700">{c.planCodes?.length ? c.planCodes.join(", ") : "all"}</span></div>
              </div>
              {!c.archivedAt && (
                <button onClick={() => setArchiveTarget(c)} className="mt-3 inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-600 hover:bg-red-100">
                  <Archive className="h-3 w-3" /> Archive
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div className={`${card} relative max-h-[90vh] w-full max-w-md overflow-y-auto p-6 shadow-xl`} initial={{ scale: 0.96, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 20 }}>
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">New Coupon</h3>
                <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-50"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Code</label>
                  <input className={`${inputCls} font-mono uppercase`} value={form.code} onChange={(e) => setField("code", e.target.value.toUpperCase())} placeholder="LAUNCH20" />
                </div>
                <div>
                  <label className={labelCls}>Description</label>
                  <input className={inputCls} value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="20% off the first year" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Type</label>
                    <SASelect fullWidth value={form.type} onChange={(v) => setField("type", v)} options={[{ value: "percent", label: "Percent (%)" }, { value: "amount", label: "Fixed amount" }]} />
                  </div>
                  <div>
                    <label className={labelCls}>{form.type === "percent" ? "Percent off" : "Amount off"}</label>
                    <input type="number" min="0" className={inputCls} value={form.value} onChange={(e) => setField("value", e.target.value)} placeholder={form.type === "percent" ? "20" : "50"} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Duration</label>
                    <SASelect fullWidth value={form.duration} onChange={(v) => setField("duration", v)} options={[{ value: "once", label: "Once" }, { value: "repeating", label: "Repeating" }, { value: "forever", label: "Forever" }]} />
                  </div>
                  {form.duration === "repeating" && (
                    <div>
                      <label className={labelCls}>Months</label>
                      <input type="number" min="1" className={inputCls} value={form.durationInMonths} onChange={(e) => setField("durationInMonths", e.target.value)} placeholder="3" />
                    </div>
                  )}
                </div>
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
              <div className="mt-6 flex gap-3">
                <button onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10">Cancel</button>
                <button onClick={save} disabled={saving} className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent-light disabled:opacity-50">{saving ? "Creating…" : "Create Coupon"}</button>
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
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-red-50 ring-1 ring-red-100"><AlertTriangle className="h-6 w-6 text-red-500" /></div>
              <h3 className="mb-1 text-center text-lg font-semibold text-gray-900">Archive coupon</h3>
              <p className="mb-6 text-center text-sm text-gray-500">Archive <strong className="text-gray-800">{archiveTarget.code}</strong>? It can no longer be redeemed.</p>
              <div className="flex gap-3">
                <button onClick={() => setArchiveTarget(null)} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10">Cancel</button>
                <button onClick={archive} className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Archive</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
