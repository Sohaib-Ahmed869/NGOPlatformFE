import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Plus,
  Check,
  Pencil,
  Archive,
  X,
  AlertTriangle,
  Users,
  Zap,
  CloudOff,
} from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SAPageHeader from "../components/SAPageHeader";
import SALoader from "../SALoader";
import toast from "react-hot-toast";

const card = "rounded-xl border border-gray-100 bg-white shadow-sm";
const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5";
const labelCls = "mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400";

const EMPTY_FORM = {
  code: "",
  name: "",
  description: "",
  currency: "usd",
  price: { monthly: "", annual: "" },
  limits: { campaigns: "", volunteers: "", volunteerEnabled: false },
  features: [],
  isPublic: true,
};

const fmtLimit = (v) => (v === null || v === undefined ? "Unlimited" : v);
const money = (v, ccy) =>
  `${(ccy || "usd").toUpperCase() === "USD" ? "$" : ""}${Number(v || 0).toLocaleString()}`;

function planToForm(p) {
  return {
    code: p.code,
    name: p.name,
    description: p.description || "",
    currency: p.currency || "usd",
    price: {
      monthly: p.price?.monthly ?? "",
      annual: p.price?.annual ?? "",
    },
    limits: {
      campaigns: p.limits?.campaigns ?? "", // "" = Unlimited
      volunteers: p.limits?.volunteers ?? "",
      volunteerEnabled: !!p.limits?.volunteerEnabled,
    },
    features: Array.isArray(p.features) ? [...p.features] : [],
    isPublic: p.isPublic !== false,
  };
}

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [cycle, setCycle] = useState("monthly"); // "monthly" | "annual"

  const [editing, setEditing] = useState(null); // null | { mode:"new" } | { mode:"edit", code }
  const [form, setForm] = useState(EMPTY_FORM);
  const [featureDraft, setFeatureDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const [migrate, setMigrate] = useState(null); // { code, count }
  const [archiveTarget, setArchiveTarget] = useState(null);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await superadminService.getPlans();
      setPlans(res.data.plans || []);
      setStripeEnabled(res.data.stripeEnabled !== false);
    } catch (err) {
      console.error("Failed to fetch plans:", err);
      toast.error("Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setFeatureDraft("");
    setEditing({ mode: "new" });
  };
  const openEdit = (p) => {
    setForm(planToForm(p));
    setFeatureDraft("");
    setEditing({ mode: "edit", code: p.code });
  };

  const setField = (path, value) =>
    setForm((f) => {
      const next = structuredClone(f);
      const keys = path.split(".");
      let ref = next;
      for (let i = 0; i < keys.length - 1; i++) ref = ref[keys[i]];
      ref[keys[keys.length - 1]] = value;
      return next;
    });

  const addFeature = () => {
    const v = featureDraft.trim();
    if (!v) return;
    setForm((f) => ({ ...f, features: [...f.features, v] }));
    setFeatureDraft("");
  };
  const removeFeature = (i) =>
    setForm((f) => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }));

  const buildBody = () => ({
    code: form.code,
    name: form.name,
    description: form.description,
    currency: form.currency,
    price: {
      monthly: Number(form.price.monthly) || 0,
      annual: Number(form.price.annual) || 0,
    },
    limits: {
      campaigns: form.limits.campaigns === "" ? null : Number(form.limits.campaigns),
      volunteers: form.limits.volunteers === "" ? null : Number(form.limits.volunteers),
      volunteerEnabled: form.limits.volunteerEnabled,
    },
    features: form.features,
    isPublic: form.isPublic,
  });

  const handleSave = async () => {
    if (!form.name.trim() || (editing.mode === "new" && !form.code.trim())) {
      toast.error("Name and code are required");
      return;
    }
    setSaving(true);
    try {
      if (editing.mode === "new") {
        await superadminService.createPlan(buildBody());
        toast.success("Plan created");
        setEditing(null);
        fetchPlans();
      } else {
        const res = await superadminService.updatePlan(editing.code, buildBody());
        toast.success("Plan updated");
        setEditing(null);
        fetchPlans();
        if (res.data?.priceChanged && res.data?.subscribersAffected > 0) {
          setMigrate({ code: editing.code, count: res.data.subscribersAffected });
        }
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  const handleMigrate = async () => {
    if (!migrate) return;
    try {
      const res = await superadminService.migratePlanSubscribers(migrate.code);
      toast.success(`Migrated ${res.data?.migrated ?? 0} subscriber(s)`);
    } catch {
      toast.error("Migration failed");
    } finally {
      setMigrate(null);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      await superadminService.archivePlan(archiveTarget.code);
      toast.success("Plan archived");
      setArchiveTarget(null);
      fetchPlans();
    } catch {
      toast.error("Failed to archive plan");
    }
  };

  const cycleBtn = (val, label) => (
    <button
      type="button"
      onClick={() => setCycle(val)}
      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
        cycle === val ? "bg-accent text-white" : "text-gray-500 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <SAPageHeader
        eyebrow="Billing"
        title="Plans"
        subtitle="Create and price the plans tenants subscribe to — synced to Stripe."
        actions={
          <div className="flex items-center gap-3">
            <div className="flex overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/10">
              {cycleBtn("monthly", "Monthly")}
              {cycleBtn("annual", "Annual")}
            </div>
            <button
              type="button"
              onClick={openNew}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
            >
              <Plus className="h-4 w-4" /> New Plan
            </button>
          </div>
        }
      />

      {!stripeEnabled && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          <CloudOff className="h-4 w-4 shrink-0" />
          Stripe is not configured — plans are saved but not synced to Stripe.
        </div>
      )}

      {loading ? (
        <SALoader />
      ) : plans.length === 0 ? (
        <div className={`${card} py-20 text-center`}>
          <Layers className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="mb-4 text-gray-500">No plans yet</p>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
          >
            <Plus className="h-4 w-4" /> Create your first plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p, i) => {
            const color = p.color || "#10b981";
            const amount = p.price?.[cycle] || 0;
            const otherCycle = cycle === "monthly" ? "annual" : "monthly";
            const synced = !!p.stripePriceIds?.[cycle];
            return (
              <motion.div
                key={p.code}
                className={`${card} group flex flex-col p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 ${
                  p.archivedAt ? "opacity-60" : ""
                }`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04, ease: [0.2, 0.7, 0.2, 1] }}
              >
                <div className="mb-3 flex items-start justify-between">
                  <span
                    className="grid h-11 w-11 place-items-center rounded-xl"
                    style={{ background: `${color}14`, color }}
                  >
                    <Layers className="h-5 w-5" />
                  </span>
                  <div className="flex flex-col items-end gap-1">
                    {p.archivedAt ? (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                        Archived
                      </span>
                    ) : synced ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        <Check className="h-3 w-3" /> Synced
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        Not synced
                      </span>
                    )}
                    {!p.isPublic && !p.archivedAt && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                        Hidden
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-gray-900">{p.name}</h3>
                <p className="mb-3 font-mono text-[11px] text-gray-400">{p.code}</p>

                <div className="mb-3">
                  <span className="text-2xl font-bold text-gray-900">{money(amount, p.currency)}</span>
                  <span className="text-xs text-gray-400">/{cycle === "monthly" ? "mo" : "yr"}</span>
                  <p className="mt-0.5 font-mono text-[10px] text-gray-400">
                    {money(p.price?.[otherCycle], p.currency)}/{otherCycle === "monthly" ? "mo" : "yr"}
                  </p>
                </div>

                <div className="mb-3 space-y-1 border-t border-gray-100 pt-3 font-mono text-[11px] text-gray-500">
                  <div className="flex justify-between">
                    <span>Campaigns</span>
                    <span className="text-gray-800">{fmtLimit(p.limits?.campaigns)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Volunteers</span>
                    <span className="text-gray-800">{fmtLimit(p.limits?.volunteers)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Volunteer module</span>
                    <span className="text-gray-800">{p.limits?.volunteerEnabled ? "Yes" : "No"}</span>
                  </div>
                </div>

                {p.features?.length > 0 && (
                  <ul className="mb-3 space-y-1">
                    {p.features.map((f, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-xs text-gray-600">
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" /> {f}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-gray-400">
                    <Users className="h-3 w-3" />
                    {p.subscribers?.total || 0} tenants
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="inline-flex items-center gap-1 rounded-md border border-accent/20 bg-accent/10 px-2 py-1 text-[10px] font-medium text-accent transition-colors hover:bg-accent/20"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    {!p.archivedAt && (
                      <button
                        type="button"
                        onClick={() => setArchiveTarget(p)}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-600 transition-colors hover:bg-red-100"
                      >
                        <Archive className="h-3 w-3" /> Archive
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create / Edit modal */}
      <AnimatePresence>
        {editing && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditing(null)} />
            <motion.div
              className={`${card} relative max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-xl`}
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
            >
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editing.mode === "new" ? "New Plan" : "Edit Plan"}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {editing.mode === "new"
                      ? "Creates a Stripe product + prices automatically."
                      : "Editing a price mints a new Stripe price."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Name</label>
                    <input
                      className={inputCls}
                      value={form.name}
                      onChange={(e) => setField("name", e.target.value)}
                      placeholder="Professional"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Code</label>
                    <input
                      className={`${inputCls} ${editing.mode === "edit" ? "cursor-not-allowed opacity-60" : ""}`}
                      value={form.code}
                      disabled={editing.mode === "edit"}
                      onChange={(e) => setField("code", e.target.value)}
                      placeholder="professional"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Description</label>
                  <input
                    className={inputCls}
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    placeholder="Growing organisations that need more."
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Currency</label>
                    <input
                      className={inputCls}
                      value={form.currency}
                      onChange={(e) => setField("currency", e.target.value)}
                      placeholder="usd"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Monthly</label>
                    <input
                      type="number"
                      min="0"
                      className={inputCls}
                      value={form.price.monthly}
                      onChange={(e) => setField("price.monthly", e.target.value)}
                      placeholder="500"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Annual</label>
                    <input
                      type="number"
                      min="0"
                      className={inputCls}
                      value={form.price.annual}
                      onChange={(e) => setField("price.annual", e.target.value)}
                      placeholder="4800"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400">Limits</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Campaigns</label>
                      <input
                        type="number"
                        min="0"
                        className={inputCls}
                        value={form.limits.campaigns}
                        onChange={(e) => setField("limits.campaigns", e.target.value)}
                        placeholder="Unlimited"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Volunteers</label>
                      <input
                        type="number"
                        min="0"
                        className={inputCls}
                        value={form.limits.volunteers}
                        onChange={(e) => setField("limits.volunteers", e.target.value)}
                        placeholder="Unlimited"
                      />
                    </div>
                  </div>
                  <p className="mt-1.5 text-[10px] text-gray-400">Leave blank for unlimited.</p>
                  <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.limits.volunteerEnabled}
                      onChange={(e) => setField("limits.volunteerEnabled", e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                    />
                    Volunteer module enabled
                  </label>
                </div>

                <div>
                  <label className={labelCls}>Features</label>
                  <div className="flex gap-2">
                    <input
                      className={inputCls}
                      value={featureDraft}
                      onChange={(e) => setFeatureDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addFeature();
                        }
                      }}
                      placeholder="Add a feature and press Enter"
                    />
                    <button
                      type="button"
                      onClick={addFeature}
                      className="shrink-0 rounded-lg border border-gray-200 px-3 text-sm text-gray-600 hover:bg-gray-50 dark:border-white/10"
                    >
                      Add
                    </button>
                  </div>
                  {form.features.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {form.features.map((f, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700"
                        >
                          {f}
                          <button type="button" onClick={() => removeFeature(idx)} className="text-gray-400 hover:text-red-500">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.isPublic}
                    onChange={(e) => setField("isPublic", e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                  />
                  Show on the public pricing page
                </label>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"
                >
                  {saving ? "Saving…" : editing.mode === "new" ? "Create Plan" : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Price-change → migrate prompt */}
      <AnimatePresence>
        {migrate && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMigrate(null)} />
            <motion.div
              className={`${card} relative w-full max-w-sm p-6 shadow-xl`}
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
            >
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-amber-50 ring-1 ring-amber-100">
                <Zap className="h-6 w-6 text-amber-500" />
              </div>
              <h3 className="mb-1 text-center text-lg font-semibold text-gray-900">New Stripe price created</h3>
              <p className="mb-6 text-center text-sm text-gray-500">
                <strong className="text-gray-800">{migrate.count}</strong> active tenant
                {migrate.count === 1 ? "" : "s"} stay on the old price until migrated. Move them to the new
                price now?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMigrate(null)}
                  className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10"
                >
                  Keep grandfathered
                </button>
                <button
                  type="button"
                  onClick={handleMigrate}
                  className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
                >
                  Migrate {migrate.count}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Archive confirm */}
      <AnimatePresence>
        {archiveTarget && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setArchiveTarget(null)} />
            <motion.div
              className={`${card} relative w-full max-w-sm p-6 shadow-xl`}
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
            >
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-red-50 ring-1 ring-red-100">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="mb-1 text-center text-lg font-semibold text-gray-900">Archive Plan</h3>
              <p className="mb-6 text-center text-sm text-gray-500">
                Archive <strong className="text-gray-800">{archiveTarget.name}</strong>? It will be hidden from
                signup; existing subscribers are unaffected.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setArchiveTarget(null)}
                  className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleArchive}
                  className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                >
                  Archive
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
