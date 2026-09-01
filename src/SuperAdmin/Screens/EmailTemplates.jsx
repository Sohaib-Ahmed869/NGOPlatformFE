import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Mail,
  Palette,
  ScrollText,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  Send,
  AlertTriangle,
  PowerOff,
  PenLine,
} from "lucide-react";
import emailTemplatesService from "../../services/emailTemplates.service";
import SAPageHeader from "../components/SAPageHeader";
import EmailLayoutPanel from "../../components/email/EmailLayoutPanel";
import EmailLogsPanel from "../../components/email/EmailLogsPanel";
import EmailTemplateList from "../../components/email/EmailTemplateList";
import useEmailConsole from "../../components/email/useEmailConsole";
import { cn } from "../../utils/cn";

/**
 * The platform-wide email console.
 *
 * One screen, three tabs, because they are the same job at different altitudes:
 * WHAT we send (templates), how it's DRESSED (the shared layout), and what
 * actually WENT OUT (the log). Editing a single template is a separate route —
 * it needs the full width.
 *
 * Two things this screen is careful about:
 *
 * The view lives in the URL. Tab, search, category and status are query params,
 * so a refresh, a deep link, or coming back from the editor lands you exactly
 * where you were rather than at the top of 43 rows. Filter changes `replace`
 * rather than push, or Back would walk backwards through every keystroke.
 *
 * A tab you've opened stays mounted. The send log carries its own filters, page
 * and query; unmounting it on every tab switch threw that away and refired the
 * request. Hidden, not destroyed.
 */

const card =
  "rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-[var(--admin-card)]";
const HERO_GRADIENT =
  "linear-gradient(120deg, var(--tenant-primary, #102A23), var(--tenant-accent, #047857))";

const TABS = [
  { key: "templates", label: "Emails", icon: Mail },
  { key: "layout", label: "Branding & layout", icon: Palette },
  { key: "logs", label: "Send log", icon: ScrollText },
];

const TAB_KEYS = TABS.map((t) => t.key);

/** Coarse on purpose — this answers "is it current?", not "when exactly?". */
function describeAge(at) {
  const mins = Math.floor((Date.now() - at) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function EmailTemplates() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const { templates, groups, stats, loading, refreshing, error, busyKeys, fetchedAt, toggle, refresh } =
    useEmailConsole(emailTemplatesService);

  const tab = TAB_KEYS.includes(params.get("tab")) ? params.get("tab") : "templates";

  const filters = useMemo(
    () => ({
      q: params.get("q") || "",
      group: params.get("cat") || "all",
      status: params.get("st") || "all",
    }),
    [params],
  );

  // Query params are the source of truth, but only for what isn't the default —
  // an untouched screen should have a clean URL.
  const patchParams = useCallback(
    (patch, { push = false } = {}) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (!v || v === "all" || v === "templates") next.delete(k);
            else next.set(k, v);
          }
          return next;
        },
        { replace: !push },
      );
    },
    [setParams],
  );

  const setFilters = useCallback(
    (f) => patchParams({ q: f.q, cat: f.group, st: f.status }),
    [patchParams],
  );

  const setTab = useCallback((key) => patchParams({ tab: key }, { push: true }), [patchParams]);

  // Mount a tab the first time it's opened, then keep it alive.
  const [visited, setVisited] = useState(() => new Set([tab]));
  useEffect(() => setVisited((s) => (s.has(tab) ? s : new Set(s).add(tab))), [tab]);

  const openTemplate = useCallback(
    (t) => navigate(`/emails/${encodeURIComponent(t.key)}${window.location.search}`),
    [navigate],
  );

  // Same shape as openTemplate: the view you left travels with you, so Back
  // lands on the category and search you were in rather than the top of 43.
  const sendTemplate = useCallback(
    (t) => navigate(`/emails/send/${encodeURIComponent(t.key)}${window.location.search}`),
    [navigate],
  );

  const applyStatus = useCallback(
    (value) => {
      setTab("templates");
      setFilters({ ...filters, status: filters.status === value ? "all" : value });
    },
    [filters, setFilters, setTab],
  );

  return (
    <div>
      <SAPageHeader
        eyebrow="Communications"
        title="Emails"
        subtitle="Every message the platform sends, editable without a deploy."
        actions={
          <>
          <button
            onClick={() => navigate(`/emails/compose${window.location.search}`)}
            title="Write a one-off email and send it in the platform's branding"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:border-accent hover:text-accent dark:border-white/10 dark:text-white/65"
          >
            <PenLine className="h-3.5 w-3.5" />
            Compose
          </button>
          <button
            onClick={refresh}
            disabled={refreshing}
            // The list is served from memory between visits, so say when it was
            // actually read — otherwise "is this current?" has no answer and
            // the honest response is to hit Refresh every time.
            title={fetchedAt ? `Last read ${describeAge(fetchedAt)}` : "Load the catalogue"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:border-accent hover:text-accent disabled:opacity-50 dark:border-white/10 dark:text-white/65"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
          </>
        }
      />

      {/* ── summary ──
          One band instead of a hero plus a four-tile grid: the prose was static
          and the tiles were decoration. Every number here is now a filter. */}
      <div className={cn(card, "mb-5 overflow-hidden")}>
        <div
          className="flex flex-wrap items-center gap-x-6 gap-y-4 px-5 py-4 text-white"
          style={{ background: HERO_GRADIENT }}
        >
          <div className="flex min-w-[240px] flex-1 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15">
              <Mail className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold leading-tight">
                {stats.total || "—"} transactional emails
              </h2>
              <p className="mt-0.5 text-xs text-white/65">
                Platform defaults. Charities override the donor-facing ones; the rest follow you.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Metric
              icon={SlidersHorizontal}
              label="Customised"
              value={stats.customised}
              active={filters.status === "customised"}
              onClick={() => applyStatus("customised")}
            />
            <Metric
              icon={Layers}
              label="Using defaults"
              value={stats.defaults}
              active={filters.status === "default"}
              onClick={() => applyStatus("default")}
            />
            <Metric icon={Send} label="Sent · 30d" value={stats.sent} onClick={() => setTab("logs")} />
            <Metric
              icon={AlertTriangle}
              label="Failed · 30d"
              value={stats.failed}
              tone={stats.failed ? "danger" : undefined}
              active={filters.status === "failing"}
              onClick={() => applyStatus("failing")}
            />
            {stats.off > 0 && (
              <Metric
                icon={PowerOff}
                label="Switched off"
                value={stats.off}
                tone="warn"
                active={filters.status === "off"}
                onClick={() => applyStatus("off")}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── tabs ── */}
      <div className="mb-5 flex flex-wrap gap-1 border-b border-gray-100 dark:border-white/10">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "relative inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium transition-colors",
              tab === t.key
                ? "text-accent"
                : "text-gray-500 hover:text-gray-800 dark:text-white/50 dark:hover:text-white/80",
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            {t.key === "logs" && stats.failed > 0 && (
              <span className="rounded-full bg-red-500/15 px-1.5 text-[10px] font-semibold text-red-500">
                {stats.failed}
              </span>
            )}
            {tab === t.key && (
              <motion.span
                layoutId="sa-email-tab"
                className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-accent"
              />
            )}
          </button>
        ))}
      </div>

      <Panel show={tab === "templates"}>
        <EmailTemplateList
          templates={templates}
          groups={groups}
          loading={loading}
          error={error}
          onRetry={refresh}
          busyKeys={busyKeys}
          onToggle={toggle}
          onOpen={openTemplate}
          onSend={sendTemplate}
          filters={filters}
          onFilters={setFilters}
          showScope
          shortcuts={tab === "templates"}
          storageKey="sa-email-collapsed"
        />
      </Panel>

      {visited.has("layout") && (
        <Panel show={tab === "layout"}>
          <EmailLayoutPanel service={emailTemplatesService} />
        </Panel>
      )}

      {visited.has("logs") && (
        <Panel show={tab === "logs"}>
          <EmailLogsPanel service={emailTemplatesService} templates={templates} showTenant />
        </Panel>
      )}
    </div>
  );
}

/**
 * Hidden, not unmounted — so the send log keeps its page and filters. `hidden`
 * also takes the subtree out of the accessibility tree and the tab order, which
 * a plain wrapper would not.
 */
function Panel({ show, children }) {
  return (
    <div hidden={!show} aria-hidden={!show}>
      {children}
    </div>
  );
}

function Metric({ icon: Icon, label, value, onClick, active, tone }) {
  const shown = typeof value === "number" ? value.toLocaleString() : (value ?? "—");
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors",
        active ? "bg-white/25 ring-1 ring-white/40" : "bg-white/10 hover:bg-white/20",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          tone === "danger" ? "text-red-200" : tone === "warn" ? "text-amber-200" : "text-white/60",
        )}
      />
      <span>
        <span className="block text-sm font-bold leading-none">{shown}</span>
        <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.1em] text-white/55">
          {label}
        </span>
      </span>
    </button>
  );
}
