import { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
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
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import superadminService from "../../services/superadmin.service";
import { useSARealtime } from "../context/SARealtimeContext";
import SALoader from "../SALoader";
import toast from "react-hot-toast";

import AnimatedNumberBase from "../components/AnimatedNumber";

// Kept this screen's original 0.45s pacing — deduplicating the
// implementation shouldn't silently restyle it.
const AnimatedNumber = (props) => <AnimatedNumberBase duration={0.45} {...props} />;
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

// Whole-number percentage, guarding the empty-matrix divide-by-zero.
const pct = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0);

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
  const [baseline, setBaseline] = useState({}); // snapshot for discard / change count

  const [loadError, setLoadError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { plansVersion } = useSARealtime();

  // `dirty` used to be its own boolean flipped true by every mutator and false
  // only on save/discard, so it drifted out of step with the real diff: toggling
  // a flag on and back off left dirty=true with changeCount=0, and the save bar
  // rendered "  unsaved changes" with no number and a Save button that POSTed
  // nothing. Deriving it from the diff makes the two impossible to disagree —
  // and it keeps the bar up if you edit while a save is in flight.
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
  const dirty = changeCount > 0;

  const [collapsed, setCollapsed] = useState(() => new Set());
  const [expanded, setExpanded] = useState(() => new Set()); // feature keys with "unlocks" shown
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(null); // { code, el } — el is the anchor button
  const [menuPos, setMenuPos] = useState({ top: -9999, left: -9999 });
  const menuRef = useRef(null);

  // Both sources are session-cached in the service (the catalog is static
  // server config; plans clear on any plan mutation or realtime event), so a
  // revisit costs no requests. Unsaved matrix edits are NOT clobbered — a
  // realtime refresh is skipped while `dirty`.
  useEffect(() => {
    if (dirty) return undefined;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [catRes, planRes] = await Promise.all([
          superadminService.getFeatureCatalogCached(),
          superadminService.getPlansCached(),
        ]);
        if (!alive) return;
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
        setLoadError(null);
      } catch (err) {
        if (!alive) return;
        console.error("Failed to load features:", err);
        // Without this the screen said "No active plans yet — create one
        // first", which on a failed load invites creating a duplicate plan.
        setLoadError(err?.response?.data?.error || "Couldn't load the feature matrix.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, plansVersion]);

  const flagDefs = useMemo(() => features.filter((f) => f.type === "flag"), [features]);
  const meterDefs = useMemo(() => features.filter((f) => f.type === "meter"), [features]);
  const featuresByGroup = useMemo(() => {
    const map = {};
    for (const f of features) (map[f.group] ||= []).push(f);
    return map;
  }, [features]);

  // ── Counters ──────────────────────────────────────────────────────────────
  // These used to be plain functions called during render: one per plan column
  // plus one per (plan × group) cell, each re-filtering the catalog — so the
  // whole matrix was recounted on every keystroke in the search box. Now it's a
  // single pass, memoised on the data it actually depends on.
  const counts = useMemo(() => {
    const groupFlags = {};
    for (const key of Object.keys(featuresByGroup)) {
      groupFlags[key] = featuresByGroup[key].filter((f) => f.type === "flag");
    }
    const byPlan = {};
    const byPlanGroup = {};
    for (const p of plans) {
      const on = matrix[p.code]?.features || {};
      const isOn = (f) => (f.core ? true : !!on[f.key]);
      byPlan[p.code] = flagDefs.reduce((n, f) => n + (isOn(f) ? 1 : 0), 0);
      const perGroup = {};
      for (const key of Object.keys(groupFlags)) {
        const flags = groupFlags[key];
        perGroup[key] = { on: flags.reduce((n, f) => n + (isOn(f) ? 1 : 0), 0), total: flags.length };
      }
      byPlanGroup[p.code] = perGroup;
    }
    return { byPlan, byPlanGroup };
  }, [plans, matrix, flagDefs, featuresByGroup]);

  const planOnCount = (code) => counts.byPlan[code] || 0;

  // Header stats. These used to be four CATALOG counts — capabilities, quotas
  // and Muslim-only never changed, so three of the four tiles were frozen on a
  // screen whose whole job is editing entitlements. They now describe the
  // matrix in front of you and move as you toggle.
  const stats = useMemo(() => {
    const planCount = plans.length;
    const enabledCells = plans.reduce((n, p) => n + (counts.byPlan[p.code] || 0), 0);
    // A limit cell holds a numeric string, or "" meaning Unlimited.
    let cappedCells = 0;
    for (const p of plans) {
      const limits = matrix[p.code]?.limits || {};
      for (const m of meterDefs) {
        const v = limits[m.key];
        if (v !== "" && v != null && Number.isFinite(Number(v))) cappedCells++;
      }
    }
    const muslimFlags = flagDefs.filter((f) => f.vertical === "muslim");
    const muslimPlans = plans.filter((p) =>
      muslimFlags.some((f) => (f.core ? true : !!matrix[p.code]?.features?.[f.key])),
    ).length;
    return {
      plans: planCount,
      enabledCells,
      totalFlagCells: planCount * flagDefs.length,
      cappedCells,
      totalMeterCells: planCount * meterDefs.length,
      muslimPlans,
      muslimFlags: muslimFlags.length,
    };
  }, [plans, matrix, flagDefs, meterDefs, counts]);

  const discard = () => setMatrix(JSON.parse(JSON.stringify(baseline)));

  // ── Mutators ──────────────────────────────────────────────────────────────
  // Reads the PREVIOUS state rather than the render-time matrix, so two clicks
  // landing in the same tick toggle twice instead of collapsing into one.
  const toggleFlag = (code, key) =>
    setMatrix((prev) => ({
      ...prev,
      [code]: {
        ...prev[code],
        features: { ...prev[code]?.features, [key]: !prev[code]?.features?.[key] },
      },
    }));

  // "" means Unlimited; anything else must be a plain non-negative integer.
  // Rejecting the keystroke outright (rather than coercing) matters because a
  // <input type="number"> reports "" for invalid input like "-" or "e" — which
  // here would silently turn a capped quota into an unlimited one.
  const setLimit = (code, key, value) => {
    if (value !== "" && !/^\d+$/.test(value)) return;
    setMatrix((prev) => ({
      ...prev,
      [code]: { ...prev[code], limits: { ...prev[code].limits, [key]: value } },
    }));
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
  };

  // Set a whole group across ALL plans.
  const setGroupAllPlans = (rows, value) => {
    const keys = rows.filter((f) => f.type === "flag" && !f.core).map((f) => f.key);
    if (!keys.length) return;
    setMatrix((prev) => {
      const next = { ...prev };
      for (const p of plans) {
        if (!next[p.code]) continue; // matrix not built for this plan yet
        const f = { ...next[p.code].features };
        for (const k of keys) f[k] = value;
        next[p.code] = { ...next[p.code], features: f };
      }
      return next;
    });
  };

  // Enable/disable every flag for one plan (column).
  const setPlanAllFlags = (code, value) => setRowsForPlan(code, flagDefs, value);

  // Copy one plan's entire entitlement config onto another.
  const copyPlan = (srcCode, dstCode) => {
    setMatrix((prev) =>
      prev[srcCode]
        ? {
            ...prev,
            [dstCode]: {
              features: { ...prev[srcCode].features },
              limits: { ...prev[srcCode].limits },
            },
          }
        : prev,
    );
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
    if (saving) return; // a second click would POST the matrix twice
    setSaving(true);
    try {
      // Snapshot what we're about to send: the new baseline must be exactly the
      // saved state, so an edit made DURING the request stays flagged unsaved
      // instead of being silently absorbed.
      const sent = JSON.parse(JSON.stringify(matrix));
      const payload = {};
      for (const p of plans) {
        const cell = sent[p.code];
        if (!cell) continue;
        payload[p.code] = {
          features: cell.features,
          limits: Object.fromEntries(
            Object.entries(cell.limits).map(([k, v]) => [k, v === "" ? null : Number(v)])
          ),
        };
      }
      await superadminService.saveEntitlements(payload);
      toast.success("Feature matrix saved");
      setBaseline(sent);
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

  // The popover is position:fixed, so it was pinned to viewport coordinates
  // captured once at open time — scrolling the page (or the matrix's own
  // horizontal scroller) left it floating away from its button. It now tracks
  // the anchor element and re-measures on scroll/resize, flips above the button
  // when there isn't room below, clamps to the viewport, and closes if the
  // anchor scrolls out of sight.
  const openMenu = (e, code) => setMenu({ code, el: e.currentTarget });

  useLayoutEffect(() => {
    if (!menu?.el) return undefined;
    const place = () => {
      const r = menu.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) {
        setMenu(null); // anchor scrolled out of view
        return;
      }
      const h = menuRef.current?.offsetHeight || 0;
      const w = menuRef.current?.offsetWidth || 208;
      const room = window.innerHeight - r.bottom - 6;
      const flip = h > room && r.top - 6 - h > 8;
      setMenuPos({
        top: flip ? r.top - 6 - h : Math.max(8, Math.min(r.bottom + 6, window.innerHeight - h - 8)),
        left: Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8)),
      });
    };
    place();
    // `capture` so scrolls inside the table's own overflow container count too
    // (scroll events don't bubble).
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [menu]);

  useEffect(() => {
    if (!menu) return undefined;
    const onKey = (e) => e.key === "Escape" && setMenu(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  return (
    // MotionConfig honours the OS "reduce motion" preference for everything
    // inside — the matrix animates a lot (panel stagger, switch springs).
    <MotionConfig reducedMotion="user">
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
          {[
            {
              icon: Layers,
              label: "Plans",
              value: <AnimatedNumber value={stats.plans} />,
              sub: "active",
              color: "#6366f1",
            },
            {
              icon: ToggleRight,
              label: "Capabilities on",
              value: <AnimatedNumber value={stats.enabledCells} suffix={` / ${stats.totalFlagCells}`} />,
              sub: `${pct(stats.enabledCells, stats.totalFlagCells)}% of all cells`,
              color: "#10b981",
            },
            {
              icon: Gauge,
              label: "Quotas capped",
              value: <AnimatedNumber value={stats.cappedCells} suffix={` / ${stats.totalMeterCells}`} />,
              sub: `${Math.max(stats.totalMeterCells - stats.cappedCells, 0)} unlimited`,
              color: "#f59e0b",
            },
            {
              icon: Moon,
              label: "Islamic features",
              value: <AnimatedNumber value={stats.muslimPlans} suffix={` / ${stats.plans}`} />,
              sub: stats.muslimFlags ? `plans with any of ${stats.muslimFlags}` : "none in catalog",
              color: "#8b5cf6",
            },
          ].map((t, i) => (
            <motion.div
              key={t.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.06, duration: 0.4, ease: "easeOut" }}
            >
              <HeaderStat icon={t.icon} label={t.label} value={t.value} sub={t.sub} color={t.color} />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {loading ? (
        <SALoader />
      ) : loadError ? (
        <div className={`${card} py-20 text-center`}>
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-300" />
          <p className="text-gray-600">{loadError}</p>
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="mt-4 inline-flex items-center gap-1.5 border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </button>
        </div>
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
              {/* The quota cells show this when empty — say what it means. */}
              <span className="inline-flex items-center gap-1">
                <InfinityIcon className="h-3.5 w-3.5 text-gray-300" /> Unlimited
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
                      groupCounts={counts.byPlanGroup}
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
            ref={menuRef}
            role="menu"
            className="fixed z-50 w-52 border border-gray-100 bg-white py-1.5 shadow-lg"
            style={{ top: menuPos.top, left: menuPos.left }}
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
                    {changeCount} unsaved change{changeCount === 1 ? "" : "s"}
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
    </MotionConfig>
  );
}

function HeaderStat({ icon: Icon, label, value, sub, color }) {
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
        <p className="mt-1 truncate text-xs text-gray-400">{label}</p>
        {sub ? <p className="truncate text-[10px] text-gray-300">{sub}</p> : null}
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
  groupCounts,
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
          const { on, total } = groupCounts?.[p.code]?.[group.key] || { on: 0, total: 0 };
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
                {/* Empty = unlimited. The ∞ is drawn ONCE, as an icon — this
                    used to render a "∞" text placeholder AND the icon stacked
                    on top of each other, which read as a smudge. It's `peer`-
                    hidden on focus so the caret never sits over the glyph, and
                    the number spinners are suppressed: they crowded a 72px
                    cell and stole clicks meant for the field. */}
                <div className="relative inline-flex items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={val}
                    onChange={(e) => onLimit(p.code, f.key, e.target.value)}
                    aria-label={`${f.label} limit for ${p.name} — leave empty for unlimited`}
                    title={val === "" ? "Unlimited — type a number to cap it" : undefined}
                    className="peer w-[72px] border border-gray-200 bg-white px-2 py-1 text-center text-sm text-gray-800 outline-none transition-colors focus:border-accent"
                  />
                  {val === "" && (
                    <InfinityIcon
                      aria-hidden
                      className="pointer-events-none absolute left-1/2 h-4 w-4 -translate-x-1/2 text-gray-300 transition-opacity peer-focus:opacity-0"
                    />
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
