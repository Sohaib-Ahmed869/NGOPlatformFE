import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { motion, MotionConfig } from "framer-motion";
import {
  Gauge,
  RefreshCw,
  Plus,
  TrendingUp,
  AlarmClock,
  CheckCircle2,
  Trophy,
  ArrowRight,
  Building2,
  AlertTriangle,
  CalendarClock,
  Moon,
  ListChecks,
  Users,
  Target,
} from "lucide-react";
import superadminService from "../../services/superadmin.service";
import { useSARealtime } from "../context/SARealtimeContext";
import SAErrorState from "../components/SAErrorState";
import SALoader from "../SALoader";
import AnimatedNumberBase from "../components/AnimatedNumber";
import { cn } from "../../utils/cn";
import { typeMeta, dueMeta, DUE_TONE_CLASS } from "../../config/taskOptions";
import { card, HEADER_GRADIENT, HeaderStat, PriorityTag } from "../components/taskShared";
import { stageMeta, fmtMoney, fmtDate } from "./leadShared";

const AnimatedNumber = (props) => <AnimatedNumberBase duration={0.6} {...props} />;

const sectionTitle = "text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400";

function Panel({ title, icon: Icon, action, children, className }) {
  return (
    <div className={cn(card, "flex flex-col overflow-hidden", className)}>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/10">
        <h2 className={cn(sectionTitle, "flex items-center gap-1.5")}>
          {Icon ? <Icon className="h-3.5 w-3.5" /> : null} {title}
        </h2>
        {action}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

function Empty({ children }) {
  return <p className="px-4 py-8 text-center text-xs text-gray-400">{children}</p>;
}

/**
 * One lead in a list. Deliberately identical everywhere on this screen — the
 * three "needs attention" lists differ only in why the lead is in them, and
 * three different card designs would imply three different kinds of thing.
 */
function LeadRow({ lead, right, onClick }) {
  const m = stageMeta(lead.stage);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-gray-50 px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-gray-50/70 dark:border-white/5 dark:hover:bg-white/5"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center bg-accent/10 text-accent">
        <Building2 className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{lead.orgName}</span>
        <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: m.color }} />
          {m.label}
          {lead.assignee?.name ? <span className="truncate">· {lead.assignee.name.split(" ")[0]}</span> : <span>· Unassigned</span>}
        </span>
      </span>
      {right}
    </button>
  );
}

/**
 * The pipeline as a stacked bar plus a legend.
 *
 * Bars are proportional to VALUE, not count, with the count on the legend row.
 * A funnel drawn by count says a stage with twelve $500 leads matters more than
 * one with two $40k leads, which is the opposite of the truth — and the whole
 * reason to record a deal value is so this chart can tell them apart. Stages
 * with no value fall back to a hairline so they stay visible.
 */
function PipelineBar({ stages }) {
  const live = stages.filter((s) => s.stage !== "won" && s.stage !== "lost");
  const total = live.reduce((n, s) => n + s.value, 0);
  const anyValue = total > 0;

  return (
    <div className="p-4">
      <div className="mb-3 flex h-3 w-full overflow-hidden bg-gray-100 dark:bg-white/10">
        {live.map((s) => {
          const m = stageMeta(s.stage);
          const pct = anyValue ? (s.value / total) * 100 : s.count ? 100 / live.filter((x) => x.count).length : 0;
          if (!pct) return null;
          return (
            <div
              key={s.stage}
              className="h-full transition-[width] duration-500"
              style={{ width: `${pct}%`, background: m.color }}
              title={`${m.label}: ${s.count} lead(s), ${fmtMoney(s.value)}`}
            />
          );
        })}
      </div>
      <ul className="space-y-1.5">
        {live.map((s) => {
          const m = stageMeta(s.stage);
          return (
            <li key={s.stage} className="flex items-center gap-2 text-xs">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: m.color }} />
              <span className="min-w-0 flex-1 truncate text-gray-600 dark:text-white/70">{m.label}</span>
              <span className="shrink-0 tabular-nums text-gray-400">{s.count}</span>
              <span className="w-20 shrink-0 text-right tabular-nums font-medium text-gray-700 dark:text-white/80">
                {s.value ? fmtMoney(s.value) : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * The CRM's front page.
 *
 * Answers, in this order: what do I personally owe today, what is falling
 * through the cracks, and what is the pipeline worth. That order is the point —
 * a dashboard that opens with a revenue chart is a dashboard for looking at,
 * and this one is meant to be worked from.
 */
export default function CrmOverview() {
  const navigate = useNavigate();
  const { tasksVersion, leadsVersion } = useSARealtime();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [attentionTab, setAttentionTab] = useState("overdue");

  const load = useCallback(async (signal) => {
    try {
      const next = await superadminService.loadCrmOverview({ signal });
      setData(next);
      setError(null);
    } catch (err) {
      if (axios.isCancel(err)) return;
      setError(err?.response?.data?.error || "Couldn't load the CRM overview.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load, tasksVersion, leadsVersion]);

  const refresh = () => {
    setRefreshing(true);
    load();
  };

  const attentionLists = useMemo(
    () => ({
      overdue: data?.attention?.overdue || [],
      noFollowUp: data?.attention?.noFollowUp || [],
      stale: data?.attention?.stale || [],
    }),
    [data],
  );

  if (loading) return <SALoader />;
  if (error) return <SAErrorState message={error} onRetry={refresh} />;
  if (!data) return null;

  const { pipeline, tasks, attention, deals, recentLeads } = data;

  const statTiles = [
    {
      label: "Open pipeline",
      value: <AnimatedNumber value={pipeline.openLeads} />,
      sub: pipeline.pipelineValue ? `${fmtMoney(pipeline.pipelineValue)} a year` : "no value recorded yet",
      icon: TrendingUp,
      color: "#0ea5e9",
    },
    {
      label: "Overdue follow-ups",
      value: <AnimatedNumber value={tasks.overdue} />,
      sub: tasks.overdue ? "someone is waiting" : "nothing late",
      icon: AlarmClock,
      color: tasks.overdue > 0 ? "#ef4444" : "#9ca3af",
    },
    {
      label: "On your plate today",
      value: <AnimatedNumber value={tasks.myDay?.length || 0} />,
      sub: `${tasks.mineOpen} open in total`,
      icon: CheckCircle2,
      color: "#f59e0b",
    },
    {
      label: "Won this month",
      value: <AnimatedNumber value={pipeline.wonThisMonth} />,
      sub: pipeline.wonValueThisMonth ? fmtMoney(pipeline.wonValueThisMonth) : `${pipeline.newThisMonth} new leads in`,
      icon: Trophy,
      color: "#10b981",
    },
  ];

  const ATTENTION_TABS = [
    { key: "overdue", label: "Overdue", count: attention.counts.overdue, icon: AlarmClock, blurb: "A follow-up on these has already slipped." },
    { key: "noFollowUp", label: "No follow-up", count: attention.counts.noFollowUp, icon: AlertTriangle, blurb: "Live leads with nothing scheduled — nobody has the next move." },
    { key: "stale", label: "Gone quiet", count: attention.counts.stale, icon: Moon, blurb: `Nothing scheduled and no contact for ${attention.staleDays}+ days.` },
  ];
  const activeTab = ATTENTION_TABS.find((t) => t.key === attentionTab) || ATTENTION_TABS[0];
  const activeList = attentionLists[attentionTab] || [];

  return (
    <MotionConfig reducedMotion="user">
    <div className="[&_*]:!rounded-none">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }} className={`${card} mb-6 overflow-hidden`}>
        <div className="relative flex flex-wrap items-start justify-between gap-4 overflow-hidden px-6 py-7 sm:px-8" style={{ background: HEADER_GRADIENT }}>
          <svg aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 text-white" viewBox="0 0 128 128" fill="none">
            <circle cx="64" cy="64" r="46" fill="currentColor" fillOpacity="0.06" />
            <circle cx="64" cy="64" r="46" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" />
          </svg>
          <div aria-hidden className="pointer-events-none absolute bottom-4 right-12 h-10 w-24 opacity-[.20]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.95) 1.5px, transparent 1.5px)", backgroundSize: "12px 12px" }} />
          <div className="relative z-10 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Sales</p>
            <h1 className="mt-1 text-2xl font-bold text-white">CRM</h1>
            <p className="mt-1 text-sm text-white/80">Where the pipeline stands, what’s slipping, and what you owe today.</p>
          </div>
          <div className="relative z-10 flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              title="Refresh"
              className="grid h-10 w-10 place-items-center bg-white/15 text-white transition-colors hover:bg-white/25 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </button>
            <button
              type="button"
              onClick={() => navigate("/tasks/new")}
              className="inline-flex items-center gap-2 bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/25"
            >
              <ListChecks className="h-4 w-4" /> New task
            </button>
            <button
              type="button"
              onClick={() => navigate("/leads/new")}
              className="inline-flex items-center gap-2 bg-white/95 px-4 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-white"
            >
              <Plus className="h-4 w-4" /> New lead
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 dark:divide-white/10 sm:grid-cols-4 sm:divide-y-0">
          {statTiles.map((t, i) => (
            <motion.div key={t.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.06, duration: 0.4, ease: "easeOut" }}>
              <HeaderStat {...t} />
            </motion.div>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* My day — first, because it is the only list that is about the reader. */}
        <Panel
          title="Your day"
          icon={CheckCircle2}
          className="lg:col-span-1"
          action={
            <Link to="/tasks?assignee=me&due=today" className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline">
              All mine <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {tasks.myDay?.length ? (
            <ul>
              {tasks.myDay.map((t) => {
                const Icon = typeMeta(t.type).icon;
                const due = dueMeta(t.dueAt, t.status);
                return (
                  <li key={t._id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/tasks/${t._id}`)}
                      className="flex w-full items-start gap-2.5 border-b border-gray-50 px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-gray-50/70 dark:border-white/5 dark:hover:bg-white/5"
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-gray-900 dark:text-white">{t.title}</span>
                        <span className={cn("text-[11px]", DUE_TONE_CLASS[due.tone])}>
                          {due.text}
                          {t.leadRef?.orgName ? <span className="text-gray-400"> · {t.leadRef.orgName}</span> : null}
                        </span>
                      </span>
                      <PriorityTag priority={t.priority} />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty>Nothing due today. {tasks.mineOpen ? `${tasks.mineOpen} open further out.` : "Your list is clear."}</Empty>
          )}
        </Panel>

        {/* Needs attention */}
        <Panel title="Needs attention" icon={AlertTriangle} className="lg:col-span-2">
          <div className="flex flex-wrap gap-1.5 border-b border-gray-50 px-4 py-3 dark:border-white/5">
            {ATTENTION_TABS.map((t) => {
              const Icon = t.icon;
              const active = attentionTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setAttentionTab(t.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-accent bg-accent text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-white/10 dark:bg-white/5 dark:text-white/70",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                  <span className={cn("tabular-nums", active ? "text-white/80" : t.count ? "text-gray-400" : "text-gray-300")}>{t.count}</span>
                </button>
              );
            })}
          </div>
          <p className="px-4 pt-2.5 text-[11px] text-gray-400">{activeTab.blurb}</p>
          {activeList.length ? (
            <ul className="mt-1.5">
              {activeList.map((l) => (
                <li key={l._id}>
                  <LeadRow
                    lead={l}
                    onClick={() => navigate(`/leads/${l._id}/tasks`)}
                    right={
                      <span className="shrink-0 text-right">
                        {attentionTab === "overdue" ? (
                          <span className="text-xs font-medium text-red-600 dark:text-red-400">{l.overdueCount} overdue</span>
                        ) : attentionTab === "stale" ? (
                          <span className="text-xs text-gray-400">quiet since {fmtDate(l.lastMessageAt)}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-accent">
                            <Plus className="h-3 w-3" /> Add a task
                          </span>
                        )}
                      </span>
                    }
                  />
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nothing here — {activeTab.label.toLowerCase()} is clear.</Empty>
          )}
        </Panel>

        {/* Pipeline */}
        <Panel
          title="Pipeline by stage"
          icon={Gauge}
          className="lg:col-span-1"
          action={
            <Link to="/leads?view=pipeline" className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline">
              Board <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          <PipelineBar stages={pipeline.stages} />
          <div className="grid grid-cols-2 divide-x divide-gray-50 border-t border-gray-50 dark:divide-white/5 dark:border-white/5">
            <Link to="/leads?stage=new" className="px-4 py-3 transition-colors hover:bg-gray-50/70 dark:hover:bg-white/5">
              <p className="text-lg font-bold leading-none text-gray-900 dark:text-white">{pipeline.untriaged}</p>
              <p className="mt-1 text-[11px] text-gray-400">Not yet triaged</p>
            </Link>
            <Link to="/leads?assignee=unassigned" className="px-4 py-3 transition-colors hover:bg-gray-50/70 dark:hover:bg-white/5">
              <p className="text-lg font-bold leading-none text-gray-900 dark:text-white">{pipeline.unassigned}</p>
              <p className="mt-1 text-[11px] text-gray-400">Unassigned</p>
            </Link>
          </div>
        </Panel>

        {/* Top deals */}
        <Panel title="Biggest live deals" icon={Trophy} className="lg:col-span-1">
          {deals.top?.length ? (
            <ul>
              {deals.top.map((l) => (
                <li key={l._id}>
                  <LeadRow
                    lead={l}
                    onClick={() => navigate(`/leads/${l._id}`)}
                    right={<span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{fmtMoney(l.dealValue, l.currency)}</span>}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No deal values recorded yet. Add one when you edit a lead and this ranks your pipeline.</Empty>
          )}
        </Panel>

        {/* Closing soon */}
        <Panel title="Closing in the next 30 days" icon={CalendarClock} className="lg:col-span-1">
          {deals.closingSoon?.length ? (
            <ul>
              {deals.closingSoon.map((l) => (
                <li key={l._id}>
                  <LeadRow
                    lead={l}
                    onClick={() => navigate(`/leads/${l._id}`)}
                    right={
                      <span className="shrink-0 text-right">
                        <span className="block text-xs font-medium text-gray-700 dark:text-white/80">{fmtDate(l.expectedCloseAt)}</span>
                        {l.dealValue > 0 ? <span className="block text-[11px] tabular-nums text-gray-400">{fmtMoney(l.dealValue, l.currency)}</span> : null}
                      </span>
                    }
                  />
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nothing has an expected close date inside a month.</Empty>
          )}
        </Panel>

        {/* Workload */}
        <Panel
          title="Who's carrying what"
          icon={Users}
          className="lg:col-span-1"
          action={
            <Link to="/tasks" className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline">
              Tasks <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {tasks.byAssignee?.length ? (
            <ul className="p-4">
              {tasks.byAssignee.map((a) => {
                const most = Math.max(...tasks.byAssignee.map((x) => x.open), 1);
                return (
                  <li key={a._id} className="mb-3 last:mb-0">
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate text-gray-700 dark:text-white/80">{a.name || "Operator"}</span>
                      <span className="shrink-0 tabular-nums text-gray-400">
                        {a.open}
                        {a.overdue ? <span className="ml-1.5 text-red-500">{a.overdue} late</span> : null}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 dark:bg-white/10">
                      {/* Two segments: the late share is drawn inside the bar
                          rather than beside it, so a short-but-red bar reads as
                          "behind" and a long green one as "busy". */}
                      <div className="flex h-full" style={{ width: `${(a.open / most) * 100}%` }}>
                        {a.overdue ? <div className="h-full bg-red-500" style={{ width: `${(a.overdue / a.open) * 100}%` }} /> : null}
                        <div className="h-full flex-1 bg-accent" />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty>No open tasks are assigned to anyone.</Empty>
          )}
        </Panel>

        {/* Newest leads */}
        <Panel
          title="Newest leads"
          icon={Target}
          className="lg:col-span-2"
          action={
            <Link to="/leads" className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline">
              All leads <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {recentLeads?.length ? (
            <ul>
              {recentLeads.map((l) => (
                <li key={l._id}>
                  <LeadRow
                    lead={l}
                    onClick={() => navigate(`/leads/${l._id}`)}
                    right={<span className="shrink-0 text-[11px] text-gray-400">{fmtDate(l.createdAt)}</span>}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No leads yet.</Empty>
          )}
        </Panel>
      </div>
    </div>
    </MotionConfig>
  );
}
