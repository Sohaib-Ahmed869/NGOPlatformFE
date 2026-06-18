import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Building2, Star, Lock, Tag, Clock, CheckCircle2, Mail, MessageSquare, Inbox, Send,
} from "lucide-react";
import superadminService from "../../services/superadmin.service";
import { useSARealtime } from "../context/SARealtimeContext";
import SALoader from "../SALoader";
import TicketAttachments from "../../components/TicketAttachments";
import { supportCategoryLabel } from "../../config/supportCategories";
import { ticketSourceMeta } from "../../config/ticketSource";
import { cn } from "../../utils/cn";
import toast from "react-hot-toast";

const card = "rounded-xl border border-gray-100 bg-white shadow-sm";
const STATUS = { new: "bg-blue-50 text-blue-700", in_progress: "bg-amber-50 text-amber-700", on_hold: "bg-gray-100 text-gray-600", solved: "bg-emerald-50 text-emerald-700", declined: "bg-red-50 text-red-700" };
const STATUS_DOT = { new: "#3b82f6", in_progress: "#f59e0b", on_hold: "#9ca3af", solved: "#10b981", declined: "#ef4444" };
const PRIORITY = { low: "bg-gray-100 text-gray-600", medium: "bg-sky-50 text-sky-700", high: "bg-orange-50 text-orange-700", critical: "bg-red-50 text-red-700" };
const TRIAGE = { unclassified: "bg-gray-100 text-gray-500", bug: "bg-red-50 text-red-700", feature: "bg-violet-50 text-violet-700", invalid: "bg-gray-100 text-gray-500", duplicate: "bg-gray-100 text-gray-500" };
const label = (s) => String(s || "").replace(/_/g, " ");
const TRIAGE_OPTS = ["unclassified", "bug", "feature", "invalid", "duplicate"];
const KANBAN_OPTS = ["todo", "in_progress", "done"];

function timeAgo(d) {
  if (!d) return "—";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24); if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function initials(name) {
  if (!name) return "?";
  const p = name.trim().split(/\s+/);
  return (p[0][0] + (p[1]?.[0] || "")).toUpperCase();
}
function Badge({ className, children }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", className)}>{children}</span>;
}
function StatusPill({ status }) {
  return <Badge className={STATUS[status]}><span className="mr-1 h-1.5 w-1.5 rounded-full" style={{ background: STATUS_DOT[status] }} />{label(status)}</Badge>;
}
// "Who is this from" badge — tenant (NGO staff) vs tenant customer (donor) vs public.
function SourceBadge({ reporter }) {
  const m = ticketSourceMeta(reporter);
  const Icon = m.icon;
  return <Badge className={m.badge}><Icon className="mr-1 h-3 w-3" />{m.label}</Badge>;
}
function Stars({ n }) {
  return <span className="inline-flex items-center gap-0.5">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cn("h-4 w-4", i <= n ? "fill-amber-400 text-amber-400" : "text-gray-200")} />)}</span>;
}
function SectionTitle({ children }) {
  return <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{children}</p>;
}

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  // Hydrate instantly from the per-ticket cache if we've opened it this session.
  const cachedTicket = superadminService.getCachedTicket(id);
  const [t, setT] = useState(cachedTicket);
  const [loading, setLoading] = useState(!cachedTicket);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState(cachedTicket?.triageNotes || "");
  const [reply, setReply] = useState("");
  const [replyInternal, setReplyInternal] = useState(true);
  const [sending, setSending] = useState(false);
  const { socket } = useSARealtime();
  const [, setTick] = useState(0);

  const apply = useCallback((tk) => {
    setT(tk);
    setNotes(tk?.triageNotes || "");
  }, []);

  // Force a fresh fetch (socket update / explicit reload) and refresh the cache.
  const load = useCallback(async () => {
    try {
      apply(await superadminService.loadTicket(id, { force: true }));
    } catch {
      toast.error("Failed to load ticket");
    }
  }, [id, apply]);

  useEffect(() => {
    const cached = superadminService.getCachedTicket(id);
    if (cached) {
      apply(cached);
      setLoading(false);
      // Only re-hit the API when this ticket actually changed: a socket flagged
      // it, or the (fresh) list row shows a newer updatedAt than the cached copy.
      const listRow = (superadminService.getTicketsCached() || []).find((x) => String(x._id) === String(id));
      const fresh =
        !superadminService.isTicketStale(id) &&
        listRow &&
        new Date(listRow.updatedAt || 0) <= new Date(cached.updatedAt || 0);
      if (!fresh) superadminService.loadTicket(id, { force: true }).then(apply).catch(() => {});
    } else {
      setLoading(true);
      superadminService
        .loadTicket(id)
        .then(apply)
        .catch(() => { toast.error("Failed to load ticket"); setT(null); })
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Keep relative times ("6h ago") live.
  useEffect(() => {
    const i = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(i);
  }, []);

  // Real-time: reload when this ticket changes anywhere (reply, status, triage).
  useEffect(() => {
    if (!socket) return undefined;
    const onUpdate = (p) => { if (!p?.id || String(p.id) === String(id)) load(); };
    socket.on("ticket:update", onUpdate);
    return () => socket.off("ticket:update", onUpdate);
  }, [socket, id, load]);

  const sendComment = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await superadminService.commentTicket(id, { message: reply, isInternal: replyInternal });
      setT(res.data.ticket);
      superadminService.setTicketCache(res.data.ticket); // keep the detail cache fresh
      setReply("");
      toast.success(replyInternal ? "Internal note added" : "Reply sent");
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setSending(false);
    }
  };

  const patch = async (body) => {
    setBusy(true);
    try {
      const res = await superadminService.triageTicket(id, body);
      setT(res.data.ticket);
      superadminService.setTicketCache(res.data.ticket); // keep the detail cache fresh
      // The Tickets list & Kanban both force-revalidate on revisit, so they'll
      // reflect this triage/board change automatically — no need to invalidate.
      toast.success("Updated");
    } catch {
      toast.error("Failed to update");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <SALoader />;

  if (!t) {
    return (
      <div className={`${card} py-20 text-center`}>
        <Inbox className="mx-auto mb-3 h-10 w-10 text-gray-300" />
        <p className="text-gray-500">Ticket not found</p>
        <button onClick={() => navigate("/tickets")} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">Back to tickets</button>
      </div>
    );
  }

  const sla = [
    { label: "Opened", at: t.createdAt, done: true },
    { label: "First response", at: t.firstResponseAt, done: !!t.firstResponseAt },
    { label: "Resolved", at: t.resolution?.resolvedAt, done: !!t.resolution?.resolvedAt },
  ];

  return (
    <div className="pb-6">
      <button onClick={() => navigate("/tickets")} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800">
        <ArrowLeft className="h-4 w-4" /> Back to tickets
      </button>

      {/* Header */}
      <div className={`${card} relative mb-5 overflow-hidden`}>
        <span className="absolute inset-x-0 top-0 h-1" style={{ background: STATUS_DOT[t.status] }} />
        <div className="p-5">
          <p className="flex items-center gap-1.5 font-mono text-[11px] text-gray-400"><Building2 className="h-3 w-3" />{t.organisationId?.name} · #{t.ticketNumber}</p>
          <h1 className="mt-1 text-xl font-bold text-gray-900">{t.summary}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <StatusPill status={t.status} />
            <SourceBadge reporter={t.reporter} />
            <Badge className={PRIORITY[t.priority]}>{t.priority}</Badge>
            <Badge className="bg-gray-100 text-gray-600"><Tag className="mr-1 h-3 w-3" />{supportCategoryLabel(t.category)}</Badge>
            <Badge className={TRIAGE[t.triage]}>{t.triage}</Badge>
            <span className="ml-auto text-xs text-gray-400">Opened {timeAgo(t.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-5 lg:col-span-2">
          {t.description ? (
            <div className={`${card} p-5`}>
              <SectionTitle>Description</SectionTitle>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{t.description}</p>
            </div>
          ) : null}

          {t.attachments?.length ? (
            <div className={`${card} p-5`}>
              <TicketAttachments attachments={t.attachments} />
            </div>
          ) : null}

          <div className={`${card} p-5`}>
            <SectionTitle>Conversation ({t.comments?.length || 0})</SectionTitle>
            <div className="space-y-3">
              {t.comments?.length ? t.comments.map((c, i) => {
                const isReporter = c.authorName && t.reporter?.name && c.authorName === t.reporter.name;
                if (c.isInternal) {
                  return (
                    <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <div className="mb-1 flex items-center gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700"><Lock className="h-2.5 w-2.5" /> internal note</span>
                        <span className="font-medium text-amber-800">{c.authorName}</span>
                        <span className="ml-auto whitespace-nowrap text-amber-600/70">{fmtDate(c.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-amber-900">{c.message}</p>
                    </div>
                  );
                }
                return (
                  <div key={i} className={cn("flex gap-2.5", isReporter ? "justify-start" : "flex-row-reverse")}>
                    <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold", isReporter ? "bg-gray-200 text-gray-600" : "bg-accent/15 text-accent")}>{initials(c.authorName)}</span>
                    <div className={cn("max-w-[78%] rounded-2xl px-3.5 py-2.5", isReporter ? "rounded-tl-sm bg-gray-100 dark:bg-white/10" : "rounded-tr-sm bg-accent/10")}>
                      <div className="mb-0.5 flex items-center gap-2 text-[10px] text-gray-400">
                        <span className="font-semibold text-gray-600">{c.authorName || "—"}</span>
                        <span>{fmtDate(c.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-gray-700">{c.message}</p>
                    </div>
                  </div>
                );
              }) : <p className="text-sm text-gray-400">No replies yet.</p>}
            </div>

            {/* Composer — operator reply / internal note */}
            <div className="mt-4 border-t border-gray-100 pt-4 dark:border-white/10">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                placeholder={replyInternal ? "Add an internal note (hidden from the reporter)…" : "Write a reply to the reporter…"}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-accent dark:border-white/10 dark:bg-white/5"
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-gray-500">
                  <input type="checkbox" checked={replyInternal} onChange={(e) => setReplyInternal(e.target.checked)} className="h-3.5 w-3.5 rounded border-gray-300 text-accent focus:ring-accent" />
                  <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Internal note (hidden from reporter)</span>
                </label>
                <button onClick={sendComment} disabled={sending || !reply.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-40">
                  <Send className="h-3.5 w-3.5" /> {sending ? "Sending…" : replyInternal ? "Add note" : "Send reply"}
                </button>
              </div>
            </div>
          </div>

          {t.resolution?.notes ? (
            <div className={`${card} border-emerald-100 bg-emerald-50 p-5`}>
              <SectionTitle><span className="text-emerald-700">Resolution</span></SectionTitle>
              <p className="text-sm text-emerald-900">{t.resolution.notes}</p>
              {t.resolution.resolvedAt ? <p className="mt-1.5 text-xs text-emerald-700/70">Resolved {fmtDate(t.resolution.resolvedAt)}</p> : null}
            </div>
          ) : null}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* People + SLA */}
          <div className={`${card} p-5`}>
            <SectionTitle>Reporter</SectionTitle>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/10 text-xs font-bold text-accent">{initials(t.reporter?.name)}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-800">{t.reporter?.name || "—"}</p>
                <p className="flex items-center gap-1 truncate text-[11px] text-gray-400"><Mail className="h-3 w-3" />{t.reporter?.email || "—"}</p>
              </div>
            </div>
            {(() => {
              const src = ticketSourceMeta(t.reporter);
              const Icon = src.icon;
              return (
                <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-gray-50 p-2.5 dark:bg-white/5">
                  <span className={cn("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md", src.badge)}><Icon className="h-3.5 w-3.5" /></span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-700">{src.full}</p>
                    <p className="text-[11px] leading-snug text-gray-400">{src.description}</p>
                  </div>
                </div>
              );
            })()}

            <div className="my-4 border-t border-gray-100 dark:border-white/10" />
            <SectionTitle>Assignee</SectionTitle>
            <p className="text-sm font-medium text-gray-800">{t.assignee?.userId?.name || (t.assignee?.userId ? "Assigned" : "Unassigned")}</p>

            <div className="my-4 border-t border-gray-100 dark:border-white/10" />
            <SectionTitle>Timeline</SectionTitle>
            <ol className="relative space-y-3 pl-1">
              {sla.map((step, i) => (
                <li key={step.label} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full", step.done ? "bg-accent text-white" : "bg-gray-100 text-gray-300 dark:bg-white/10")}>
                      {step.done ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    </span>
                    {i < sla.length - 1 ? <span className={cn("mt-1 w-0.5 flex-1", step.done ? "bg-accent/30" : "bg-gray-100 dark:bg-white/10")} style={{ minHeight: 14 }} /> : null}
                  </div>
                  <div className="-mt-0.5">
                    <p className="text-sm font-medium text-gray-700">{step.label}</p>
                    <p className="text-[11px] text-gray-400">{step.at ? fmtDate(step.at) : "Pending"}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* CSAT */}
          {t.satisfactionRating ? (
            <div className={`${card} border-amber-100 bg-amber-50 p-5`}>
              <SectionTitle><span className="text-amber-700">Satisfaction</span></SectionTitle>
              <div className="flex items-center gap-2"><Stars n={t.satisfactionRating} /><span className="text-sm font-semibold text-amber-700">{t.satisfactionRating}/5</span></div>
              {t.satisfactionFeedback ? <p className="mt-1.5 text-sm italic text-amber-800">“{t.satisfactionFeedback}”</p> : null}
            </div>
          ) : null}

          {/* Triage actions */}
          <div className={`${card} p-5`}>
            <SectionTitle>Triage</SectionTitle>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">Classify</p>
            <div className="flex flex-wrap gap-1.5">
              {TRIAGE_OPTS.map((tr) => (
                <button key={tr} onClick={() => patch({ triage: tr })} disabled={busy} className={cn("rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors", t.triage === tr ? "bg-accent text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10")}>{tr}</button>
              ))}
            </div>

            {(t.triage === "bug" || t.triage === "feature") && (
              <>
                <p className="mb-1.5 mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">Board column</p>
                <div className="flex flex-wrap gap-1.5">
                  {KANBAN_OPTS.map((k) => (
                    <button key={k} onClick={() => patch({ kanbanStatus: k })} disabled={busy} className={cn("rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors", t.kanbanStatus === k ? "bg-accent text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10")}>{label(k)}</button>
                  ))}
                </div>
              </>
            )}

            <p className="mb-1.5 mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">Triage notes</p>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Internal triage note for the product team…" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-accent dark:border-white/10 dark:bg-white/5" />
            <div className="mt-2 flex justify-end">
              <button onClick={() => patch({ triageNotes: notes })} disabled={busy || notes === (t.triageNotes || "")} className="rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-40">Save notes</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
