import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save,
  Lock,
  Check,
  Minus,
  ChevronDown,
  Search,
  X,
  MoreVertical,
  Copy,
  Power,
  Sparkles,
  Info,
  Globe,
  Wrench,
  Infinity as InfinityIcon,
  Layers,
  ToggleRight,
  Gauge,
  Banknote,
  Users,
  LayoutTemplate,
  Moon,
  Plug,
  SlidersHorizontal,
} from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SALoader from "../SALoader";
import toast from "react-hot-toast";

const card = "border border-gray-100 bg-white shadow-sm";
const ACCENT = "var(--tenant-accent, #047857)";
const accentTint = (a) => `rgba(var(--tenant-accent-rgb, 4, 120, 87), ${a})`;
const HERO_GRADIENT =
  "linear-gradient(120deg, var(--tenant-primary, #102A23), var(--tenant-accent, #047857))";

const CCY_SYMBOL = { AUD: "A$", USD: "$", GBP: "£", EUR: "€", NZD: "NZ$", CAD: "C$" };
const money = (v, ccy) => {
  const c = (ccy || "aud").toUpperCase();
  const sym = CCY_SYMBOL[c] || "";
  return `${sym}${Number(v || 0).toLocaleString()}${sym ? "" : ` ${c}`}`;
};

// The plan columns sit on a faint, theme-tinted "comparison panel" with vertical
// lanes, so the wide feature column reads as a distinct zone. The popular column
// gets a stronger tint so it stands out.
const LANE = "border-l border-gray-100";
const PLAN_COL_W = "w-[200px]";
const planCellClass = () => LANE;
const planCellStyle = (popular) => ({ backgroundColor: accentTint(popular ? 0.08 : 0.04) });

// Per-group identity (icon + tint) for the section headers.
const GROUP_META = {
  fundraising: { icon: Banknote, tint: "#10b981" },
  engagement: { icon: Users, tint: "#6366f1" },
  content: { icon: LayoutTemplate, tint: "#0ea5e9" },
  islamic: { icon: Moon, tint: "#8b5cf6" },
  integrations: { icon: Plug, tint: "#f59e0b" },
  quotas: { icon: Gauge, tint: "#14b8a6" },
};

// Initial cell value for a flag — mirrors the backend resolver: a plan with no
// featureFlags configured yet means "everything available", core is always on.
function initFlag(plan, f) {
  const pf = plan.featureFlags || {};
  if (f.core) return true;
  if (Object.keys(pf).length === 0) return true;
  return pf[f.key] !== undefined ? !!pf[f.key] : false;
}
// Initial cell value for a meter — number, or "" meaning Unlimited.
function initLimit(plan, m) {
  const v = plan.limits ? plan.limits[m.key] : undefined;
  return v === null || v === undefined ? "" : String(v);
}

export default function Features() {
  const [groups, setGroups] = useState([]);
  const [features, setFeatures] = useState([]);
  const [plans, setPlans] = useState([]);
  const [matrix, setMatrix] = useState({}); // { code: { features:{}, limits:{} } }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [baseline, setBaseline] = useState({}); // snapshot for discard / change count

  const [collapsed, setCollapsed] = useState(() => new Set());
  const [expanded, setExpanded] = useState(() => new Set()); // feature keys with "unlocks" shown
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(null); // { code, top, left }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [catRes, planRes] = await Promise.all([
          superadminService.getFeatureCatalog(),
          superadminService.getPlans(),
        ]);
        setGroups(catRes.data.groups || []);
        setFeatures(catRes.data.features || []);
        const activePlans = (planRes.data.plans || [])
          .filter((p) => !p.archivedAt)
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setPlans(activePlans);

        const flagDefs = (catRes.data.features || []).filter((f) => f.type === "flag");
        const meterDefs = (catRes.data.features || []).filter((f) => f.type === "meter");
        const m = {};
        for (const p of activePlans) {
          m[p.code] = {
            features: Object.fromEntries(flagDefs.map((f) => [f.key, initFlag(p, f)])),
            limits: Object.fromEntries(meterDefs.map((mm) => [mm.key, initLimit(p, mm)])),
          };
        }
        setMatrix(m);
        setBaseline(JSON.parse(JSON.stringify(m)));
      } catch (err) {
        console.error("Failed to load features:", err);
        toast.error("Failed to load feature matrix");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const flagDefs = useMemo(() => features.filter((f) => f.type === "flag"), [features]);
  const featuresByGroup = useMemo(() => {
    const map = {};
    for (const f of features) (map[f.group] ||= []).push(f);
    return map;
  }, [features]);

  // ── Counters ──────────────────────────────────────────────────────────────
  const planOnCount = (code) =>
    flagDefs.filter((f) => f.core || matrix[code]?.features?.[f.key]).length;

  const groupOnCount = (code, groupRows) => {
    const flags = groupRows.filter((f) => f.type === "flag");
    return {
      on: flags.filter((f) => f.core || matrix[code]?.features?.[f.key]).length,
      total: flags.length,
    };
  };

  const stats = useMemo(() => {
    const flags = features.filter((f) => f.type === "flag");
    const meters = features.filter((f) => f.type === "meter");
    return {
      plans: plans.length,
      capabilities: flags.length,
      quotas: meters.length,
      muslim: flags.filter((f) => f.vertical === "muslim").length,
    };
  }, [features, plans]);

  // How many cells differ from the saved baseline (drives the floating save bar).
  const changeCount = useMemo(() => {
    let n = 0;
    for (const code of Object.keys(matrix)) {
      const b = baseline[code];
      if (!b) continue;
      const cur = matrix[code];
      for (const k of Object.keys(cur.features || {}))
        if (!!cur.features[k] !== !!b.features?.[k]) n++;
      for (const k of Object.keys(cur.limits || {}))
        if (String(cur.limits[k] ?? "") !== String(b.limits?.[k] ?? "")) n++;
    }
    return n;
  }, [matrix, baseline]);

  const discard = () => {
    setMatrix(JSON.parse(JSON.stringify(baseline)));
    setDirty(false);
  };

  // ── Mutators ──────────────────────────────────────────────────────────────
  const setFlag = (code, key, value) => {
    setMatrix((prev) => ({
      ...prev,
      [code]: { ...prev[code], features: { ...prev[code].features, [key]: value } },
    }));
    setDirty(true);
  };
  const toggleFlag = (code, key) =>
    setFlag(code, key, !matrix[code]?.features?.[key]);

  const setLimit = (code, key, value) => {
    setMatrix((prev) => ({
      ...prev,
      [code]: { ...prev[code], limits: { ...prev[code].limits, [key]: value } },
    }));
    setDirty(true);
  };

  // Set every toggleable (non-core) flag for a plan within a set of feature rows.
  const setRowsForPlan = (code, rows, value) => {
    const keys = rows.filter((f) => f.type === "flag" && !f.core).map((f) => f.key);
    if (!keys.length) return;
    setMatrix((prev) => {
      const next = { ...prev[code].features };
      for (const k of keys) next[k] = value;
      return { ...prev, [code]: { ...prev[code], features: next } };
    });
    setDirty(true);
  };

  // Set a whole group across ALL plans.
  const setGroupAllPlans = (rows, value) => {
    const keys = rows.filter((f) => f.type === "flag" && !f.core).map((f) => f.key);
    if (!keys.length) return;
    setMatrix((prev) => {
      const next = { ...prev };
      for (const p of plans) {
        const f = { ...next[p.code].features };
        for (const k of keys) f[k] = value;
        next[p.code] = { ...next[p.code], features: f };
      }
      return next;
    });
    setDirty(true);
  };

  // Enable/disable every flag for one plan (column).
  const setPlanAllFlags = (code, value) => setRowsForPlan(code, flagDefs, value);

  // Copy one plan's entire entitlement config onto another.
  const copyPlan = (srcCode, dstCode) => {
    setMatrix((prev) => ({
      ...prev,
      [dstCode]: {
        features: { ...prev[srcCode].features },
        limits: { ...prev[srcCode].limits },
      },
    }));
    setDirty(true);
    setMenu(null);
    const src = plans.find((p) => p.code === srcCode);
    toast.success(`Copied entitlements from ${src?.name || srcCode}`);
  };

  const toggleCollapse = (key) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  const toggleExpand = (key) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const anyCollapsed = collapsed.size > 0;
  const toggleAllGroups = () => {
    if (anyCollapsed) setCollapsed(new Set());
    else setCollapsed(new Set(groups.map((g) => g.key)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      for (const p of plans) {
        const cell = matrix[p.code];
        payload[p.code] = {
          features: cell.features,
          limits: Object.fromEntries(
            Object.entries(cell.limits).map(([k, v]) => [k, v === "" ? null : Number(v)])
          ),
        };
      }
      await superadminService.saveEntitlements(payload);
      toast.success("Feature matrix saved");
      setDirty(false);
      setBaseline(JSON.parse(JSON.stringify(matrix)));
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const q = query.trim().toLowerCase();
  const matchesQuery = (f) =>
    !q ||
    f.label.toLowerCase().includes(q) ||
    f.key.toLowerCase().includes(q) ||
    (f.description || "").toLowerCase().includes(q);

  const openMenu = (e, code) => {
    const r = e.currentTarget.getBoundingClientRect();
    setMenu({ code, top: r.bottom + 6, left: Math.max(8, r.right - 208) });
  };

  return (
    <div className="[&_*]:!rounded-none">
      {/* Hero + KPI strip */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mb-6 overflow-hidden border border-gray-100 bg-white shadow-sm"
      >
        <div className="relative overflow-hidden px-6 py-7 sm:px-8" style={{ background: HERO_GRADIENT }}>
          <svg
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 text-white"
            viewBox="0 0 128 128"
            fill="none"
          >
            <circle cx="64" cy="64" r="46" fill="currentColor" fillOpacity="0.06" />
            <circle cx="64" cy="64" r="46" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" />
          </svg>
          <div className="relative min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Billing</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Features &amp; entitlements</h1>
            <p className="mt-1 max-w-xl text-sm text-white/80">
              Choose which capabilities and usage limits each plan gets. Applies to the admin portal and
              the public site.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 sm:grid-cols-4 sm:divide-y-0">
          <HeaderStat icon={Layers} label="Plans" value={stats.plans} color="#6366f1" />
          <HeaderStat icon={ToggleRight} label="Capabilities" value={stats.capabilities} color="#10b981" />
          <HeaderStat icon={Gauge} label="Metered quotas" value={stats.quotas} color="#f59e0b" />
          <HeaderStat icon={Moon} label="Muslim-only" value={stats.muslim} color="#8b5cf6" />
        </div>
      </motion.div>

      {loading ? (
        <SALoader />
      ) : plans.length === 0 ? (
        <div className={`${card} py-20 text-center`}>
          <SlidersHorizontal className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">No active plans yet — create one first.</p>
        </div>
      ) : (
        <>
          {/* Toolbar: search · legend · expand-all */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search features…"
                className="w-full border border-gray-200 bg-white py-2 pl-9 pr-9 text-sm text-gray-800 outline-none transition-colors focus:border-accent"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="hidden items-center gap-3 text-[11px] text-gray-400 sm:flex">
              <span className="inline-flex items-center gap-1">
                <span
                  className="grid h-4 w-4 place-items-center"
                  style={{ backgroundColor: accentTint(0.16), color: ACCENT }}
                >
                  <Check className="h-3 w-3" />
                </span>
                Enabled
              </span>
              <span className="inline-flex items-center gap-1">
                <Minus className="h-3.5 w-3.5 text-gray-300" />
                Disabled
              </span>
              <span className="inline-flex items-center gap-1">
                <Lock className="h-3 w-3 text-gray-400" /> Always on
              </span>
            </div>
            <button
              type="button"
              onClick={toggleAllGroups}
              disabled={!!q}
              className="inline-flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${anyCollapsed ? "-rotate-90" : ""}`} />
              {anyCollapsed ? "Expand all" : "Collapse all"}
            </button>
          </div>

          <div className={`${card} overflow-x-auto`}>
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="sticky left-0 z-10 bg-white px-4 pb-3 pt-4 text-left align-bottom text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                    Feature
                  </th>
                  {plans.map((p) => {
                    const color = p.color || "#10b981";
                    const popular = p.isPopular;
                    const onCount = planOnCount(p.code);
                    return (
                      <th
                        key={p.code}
                        className={`relative ${PLAN_COL_W} px-4 pb-3 pt-4 align-bottom ${LANE}`}
                        style={{
                          backgroundColor: accentTint(popular ? 0.1 : 0.05),
                          ...(popular
                            ? { boxShadow: "inset 0 2px 0 0 var(--tenant-accent, #047857)" }
                            : {}),
                        }}
                      >
                        <button
                          type="button"
                          onClick={(e) => openMenu(e, p.code)}
                          className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-700"
                          title="Bulk actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        <div className="flex flex-col items-center gap-1">
                          <span className="h-1.5 w-7" style={{ backgroundColor: color }} />
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="text-sm font-bold text-gray-900">{p.name}</span>
                            {popular && <Sparkles className="h-3.5 w-3.5" style={{ color: ACCENT }} />}
                          </div>
                          <span className="text-xs font-semibold text-gray-600">
                            {p.price?.monthly ? `${money(p.price.monthly, p.currency)}/mo` : "Free"}
                          </span>
                          <span
                            className="mt-1 px-2 py-0.5 text-[10px] font-semibold"
                            style={{ backgroundColor: accentTint(0.12), color: ACCENT }}
                          >
                            {onCount}/{flagDefs.length} on
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const rows = featuresByGroup[g.key] || [];
                  if (rows.length === 0) return null;
                  const visibleRows = q ? rows.filter(matchesQuery) : rows;
                  if (q && visibleRows.length === 0) return null;
                  const showRows = q ? true : !collapsed.has(g.key);
                  const meta = GROUP_META[g.key] || { icon: Layers, tint: "#64748b" };
                  const GIcon = meta.icon;
                  const flagRows = rows.filter((f) => f.type === "flag");
                  const hasToggleable = flagRows.some((f) => !f.core);
                  const allOnEverywhere =
                    hasToggleable &&
                    plans.every((p) =>
                      flagRows
                        .filter((f) => !f.core)
                        .every((f) => matrix[p.code]?.features?.[f.key])
                    );

                  return (
                    <FeatureGroupRows
                      key={g.key}
                      group={g}
                      meta={meta}
                      GIcon={GIcon}
                      rows={rows}
                      visibleRows={visibleRows}
                      flagRows={flagRows}
                      hasToggleable={hasToggleable}
                      allOnEverywhere={allOnEverywhere}
                      showRows={showRows}
                      collapsed={collapsed.has(g.key) && !q}
                      plans={plans}
                      matrix={matrix}
                      expanded={expanded}
                      onToggleCollapse={() => toggleCollapse(g.key)}
                      onToggleExpand={toggleExpand}
                      onToggleFlag={toggleFlag}
                      onLimit={setLimit}
                      onGroupAllPlans={setGroupAllPlans}
                      onPlanGroup={setRowsForPlan}
                      groupOnCount={groupOnCount}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-gray-400">
            Boolean capabilities gate the matching public pages and admin sections. Numeric quotas cap how
            much of a resource a tenant can create — leave blank for unlimited. Core capabilities (lock
            icon) are always on. Use the <MoreVertical className="inline h-3 w-3" /> menu on a plan to bulk
            toggle or copy its entitlements.
          </p>
        </>
      )}

      {/* Plan column bulk-action popover (fixed, so the table scroll never clips it) */}
      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div
            className="fixed z-50 w-52 border border-gray-100 bg-white py-1.5 shadow-lg"
            style={{ top: menu.top, left: menu.left }}
          >
            <button
              type="button"
              onClick={() => {
                setPlanAllFlags(menu.code, true);
                setMenu(null);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              <Power className="h-4 w-4" style={{ color: ACCENT }} /> Enable all features
            </button>
            <button
              type="button"
              onClick={() => {
                setPlanAllFlags(menu.code, false);
                setMenu(null);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              <Power className="h-4 w-4 text-gray-400" /> Disable all features
            </button>
            {plans.length > 1 && (
              <>
                <div className="my-1 border-t border-gray-100" />
                <p className="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Copy entitlements from
                </p>
                {plans
                  .filter((p) => p.code !== menu.code)
                  .map((p) => (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => copyPlan(p.code, menu.code)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Copy className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
              </>
            )}
          </div>
        </>
      )}

      {/* Floating save bar — slides up from the bottom-centre while there are edits */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ y: 90, x: "-50%", opacity: 0 }}
            animate={{ y: 0, x: "-50%", opacity: 1 }}
            exit={{ y: 90, x: "-50%", opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
            className="fixed bottom-6 left-1/2 z-50"
          >
            <div className="flex items-center gap-5 border border-gray-100 bg-white py-3 pl-4 pr-3 shadow-2xl shadow-black/20">
              <span className="flex items-center gap-2.5">
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center"
                  style={{ backgroundColor: accentTint(0.14), color: ACCENT }}
                >
                  <Save className="h-4 w-4" />
                </span>
                <span className="whitespace-nowrap text-sm">
                  <span className="font-semibold text-gray-900">
                    {changeCount || ""} unsaved change{changeCount === 1 ? "" : "s"}
                  </span>
                  <span className="ml-1.5 hidden text-gray-400 sm:inline">— not yet applied</span>
                </span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={discard}
                  disabled={saving}
                  className="px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: ACCENT }}
                >
                  <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HeaderStat({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center"
        style={{ background: `${color}1a`, color }}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold leading-none text-gray-900">{value}</p>
        <p className="mt-1 text-xs text-gray-400">{label}</p>
      </div>
    </div>
  );
}

function FeatureGroupRows({
  group,
  meta,
  GIcon,
  rows,
  visibleRows,
  flagRows,
  hasToggleable,
  allOnEverywhere,
  showRows,
  collapsed,
  plans,
  matrix,
  expanded,
  onToggleCollapse,
  onToggleExpand,
  onToggleFlag,
  onLimit,
  onGroupAllPlans,
  onPlanGroup,
  groupOnCount,
}) {
  const isQuota = flagRows.length === 0; // quotas group has only meters
  return (
    <>
      {/* Group header row */}
      <tr className="group/ghdr border-y border-gray-100 bg-gray-50/70">
        <td className="sticky left-0 z-10 bg-gray-50 px-4 py-2">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="grid h-6 w-6 shrink-0 place-items-center text-gray-400 transition-colors hover:bg-gray-200/70 hover:text-gray-700"
              title={collapsed ? "Expand" : "Collapse"}
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${collapsed ? "-rotate-90" : ""}`} />
            </button>
            <span
              className="grid h-7 w-7 shrink-0 place-items-center"
              style={{ background: `${meta.tint}1f`, color: meta.tint }}
            >
              <GIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold uppercase tracking-wide text-gray-700">
                  {group.label}
                </span>
                <span className="text-[11px] font-normal text-gray-400">
                  {rows.length} {isQuota ? "quotas" : "features"}
                </span>
              </div>
              {group.blurb && <p className="truncate text-[11px] text-gray-400">{group.blurb}</p>}
            </div>
            {hasToggleable && (
              <button
                type="button"
                onClick={() => onGroupAllPlans(rows, !allOnEverywhere)}
                className="ml-1 hidden shrink-0 items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-400 opacity-0 transition-opacity hover:text-gray-700 group-hover/ghdr:opacity-100 lg:inline-flex"
                title={allOnEverywhere ? "Disable for all plans" : "Enable for all plans"}
              >
                <Power className="h-3 w-3" />
                {allOnEverywhere ? "Clear all" : "Enable all"}
              </button>
            )}
          </div>
        </td>
        {plans.map((p) => {
          if (isQuota) {
            const set = rows.filter(
              (f) => f.type === "meter" && (matrix[p.code]?.limits?.[f.key] ?? "") !== ""
            ).length;
            return (
              <td
                key={p.code}
                className={`px-3 py-2 text-center align-middle ${LANE}`}
                style={planCellStyle(p.isPopular)}
              >
                <span className="text-[10px] text-gray-400">
                  {set}/{rows.length} capped
                </span>
              </td>
            );
          }
          const { on, total } = groupOnCount(p.code, rows);
          const allOn = total > 0 && on === total;
          const toggleable = flagRows.some((f) => !f.core);
          return (
            <td
              key={p.code}
              className={`px-3 py-2 text-center align-middle ${LANE}`}
              style={planCellStyle(p.isPopular)}
            >
              <button
                type="button"
                disabled={!toggleable}
                onClick={() => onPlanGroup(p.code, rows, !allOn)}
                title={toggleable ? (allOn ? "Disable this group" : "Enable this group") : "All core"}
                className="px-2 py-0.5 text-[10px] font-semibold transition-colors disabled:cursor-default"
                style={
                  allOn
                    ? { backgroundColor: accentTint(0.16), color: ACCENT }
                    : { color: "#9ca3af" }
                }
              >
                {on}/{total}
              </button>
            </td>
          );
        })}
      </tr>

      {/* Feature rows */}
      {showRows &&
        visibleRows.map((f) => {
          const hasUnlocks = (f.pages?.length || 0) + (f.adminNav?.length || 0) > 0;
          const isOpen = expanded.has(f.key);
          return (
            <FeatureRow
              key={f.key}
              f={f}
              plans={plans}
              matrix={matrix}
              hasUnlocks={hasUnlocks}
              isOpen={isOpen}
              onToggleExpand={() => onToggleExpand(f.key)}
              onToggleFlag={onToggleFlag}
              onLimit={onLimit}
            />
          );
        })}
    </>
  );
}

function FeatureRow({ f, plans, matrix, hasUnlocks, isOpen, onToggleExpand, onToggleFlag, onLimit }) {
  return (
    <>
      <tr className="group/row border-b border-gray-50 last:border-0">
        <td className="sticky left-0 z-10 bg-white px-4 py-2 pl-[52px] transition-colors group-hover/row:bg-gray-50/60">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-medium text-gray-800">{f.label}</span>
            {f.core && <Lock className="h-3 w-3 text-gray-300" title="Always on" />}
            {f.vertical === "muslim" && (
              <span className="bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600">
                Muslim
              </span>
            )}
            {hasUnlocks && (
              <button
                type="button"
                onClick={onToggleExpand}
                className={`grid h-5 w-5 place-items-center transition-all hover:text-gray-600 ${
                  isOpen ? "opacity-100" : "text-gray-300 opacity-0 group-hover/row:opacity-100"
                }`}
                style={isOpen ? { color: ACCENT } : undefined}
                title="What this unlocks"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {f.description && <p className="mt-0.5 text-[11px] leading-snug text-gray-400">{f.description}</p>}
        </td>
        {plans.map((p) => {
          const cell = matrix[p.code] || { features: {}, limits: {} };
          if (f.type === "meter") {
            const val = cell.limits[f.key] ?? "";
            return (
              <td
                key={p.code}
                className={`px-3 py-2 text-center ${planCellClass(p.isPopular)}`}
                style={planCellStyle(p.isPopular)}
              >
                <div className="relative inline-flex items-center">
                  <input
                    type="number"
                    min="0"
                    value={val}
                    onChange={(e) => onLimit(p.code, f.key, e.target.value)}
                    placeholder="∞"
                    className="w-[72px] border border-gray-200 bg-white px-2 py-1 text-center text-sm text-gray-800 outline-none transition-colors focus:border-accent"
                  />
                  {val === "" && (
                    <InfinityIcon className="pointer-events-none absolute left-1/2 h-3.5 w-3.5 -translate-x-1/2 text-gray-300" />
                  )}
                </div>
              </td>
            );
          }
          const on = f.core ? true : !!cell.features[f.key];
          return (
            <td
              key={p.code}
              className={`px-3 py-2 text-center ${planCellClass(p.isPopular)}`}
              style={planCellStyle(p.isPopular)}
            >
              <button
                type="button"
                disabled={f.core}
                onClick={() => onToggleFlag(p.code, f.key)}
                title={f.core ? "Always on" : on ? "Enabled — click to disable" : "Disabled — click to enable"}
                className={`inline-grid h-6 w-8 place-items-center transition-colors ${
                  on
                    ? f.core
                      ? "cursor-not-allowed"
                      : "hover:opacity-75"
                    : "text-gray-300 hover:text-gray-500"
                }`}
                style={on ? { backgroundColor: accentTint(0.16), color: ACCENT } : undefined}
              >
                {on ? (
                  f.core ? <Lock className="h-3.5 w-3.5" /> : <Check className="h-4 w-4" />
                ) : (
                  <Minus className="h-3.5 w-3.5" />
                )}
              </button>
            </td>
          );
        })}
      </tr>

      {/* "What this unlocks" detail */}
      {isOpen && hasUnlocks && (
        <tr className="bg-gray-50/40">
          <td colSpan={plans.length + 1} className="px-4 py-2.5 pl-[52px]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Unlocks
              </span>
              {(f.pages || []).map((pg) => (
                <span
                  key={`pg-${pg}`}
                  className="inline-flex items-center gap-1 border border-sky-100 bg-sky-50 px-2 py-0.5 text-[11px] text-sky-700"
                >
                  <Globe className="h-3 w-3" /> {pg}
                </span>
              ))}
              {(f.adminNav || []).map((r) => (
                <span
                  key={`nav-${r}`}
                  className="inline-flex items-center gap-1 border border-gray-200 bg-white px-2 py-0.5 font-mono text-[11px] text-gray-600"
                >
                  <Wrench className="h-3 w-3 text-gray-400" /> {r}
                </span>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
