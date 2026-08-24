import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, MotionConfig } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Building2,
  Globe,
  Mail,
  Phone,
  User as UserIcon,
  Loader2,
  Send,
  Lock,
  CornerUpLeft,
  Trash2,
  CheckCircle2,
  XCircle,
  Sparkles,
  ExternalLink,
  Clock,
  MapPin,
} from "lucide-react";
import { TabLoader } from "../../components/TabLoader";
import { CustomSelect } from "../../components/CustomSelect";
import { RichTextEditor, sanitizeRichText } from "../../components/RichTextEditor";
import { cn } from "../../utils/cn";
import superadminService from "../../services/superadmin.service";
import SAErrorState from "../components/SAErrorState";
import { useAuth } from "../../context/AuthContext";
import { useSARealtime } from "../context/SARealtimeContext";
import { useConfirm } from "../components/ConfirmProvider";
import LostReasonModal from "../components/LostReasonModal";
import {
  causeAreaLabel,
  staffSizeLabel,
  budgetRangeLabel,
  donorDbSizeLabel,
  currentToolLabel,
  challengeLabel,
  timelineLabel,
  decisionRoleLabel,
} from "../../config/leadOptions";

const STAGES = [
  { key: "new", label: "New", color: "#f59e0b" },
  { key: "contacted", label: "Contacted", color: "#0ea5e9" },
  { key: "qualified", label: "Qualified", color: "#8b5cf6" },
  { key: "demo_scheduled", label: "Demo Scheduled", color: "#6366f1" },
  { key: "proposal_sent", label: "Proposal Sent", color: "#ec4899" },
];
const stageMeta = (key) => STAGES.find((s) => s.key === key) || { key, label: key, color: "#94a3b8" };

const fmtDateTime = (d) => (d ? new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—");
const card = "border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-[var(--admin-card)]";

const isRichEmpty = (html) => !sanitizeRichText(html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;| /g, " ").trim();

function Meta({ icon: Icon, label, value }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
        {Icon ? <Icon className="h-3 w-3" /> : null} {label}
      </p>
      <p className="mt-0.5 truncate text-sm text-gray-800 dark:text-white/85">{value}</p>
    </div>
  );
}

function Chips({ values, labelFor }) {
  if (!values?.length) return <p className="text-sm text-gray-300">—</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <span key={v} className="border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
          {labelFor(v)}
        </span>
      ))}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className={`${card} p-4`}>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">{title}</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">{children}</div>
    </div>
  );
}

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const confirm = useConfirm();
  const { socket } = useSARealtime();

  const myEmail = (user?.email || "").toLowerCase();
  const myId = user?._id || user?.id || null;
  const isMine = useCallback(
    (author) => !!author && ((myId && author._id === myId) || (author.email && author.email.toLowerCase() === myEmail)),
    [myId, myEmail],
  );

  const cached = superadminService.getCachedLead(id);
  const [lead, setLead] = useState(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);
  const [staff, setStaff] = useState([]);

  const [composer, setComposer] = useState("");
  const [composerKind, setComposerKind] = useState("note");
  const [composerMentions, setComposerMentions] = useState([]);
  const [composerNonce, setComposerNonce] = useState(0);
  const [sending, setSending] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [stageBusy, setStageBusy] = useState(false);

  const bottomRef = useRef(null);

  useEffect(() => {
    superadminService.loadLeadStaff().then(setStaff).catch(() => {});
  }, []);

  const load = useCallback(async ({ force = false } = {}) => {
    try {
      setLead(await superadminService.loadLead(id, { force }));
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't load this lead.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const c = superadminService.getCachedLead(id);
    if (c && !superadminService.isLeadStale(id)) {
      setLead(c);
      setLoading(false);
      return;
    }
    setLoading(!c);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!socket) return undefined;
    const onChange = (p) => { if (p?.id === id) load({ force: true }); };
    socket.on("lead:message", onChange);
    socket.on("lead:updated", onChange);
    socket.on("lead:converted", onChange);
    const onDeleted = (p) => { if (p?.id === id) navigate("/leads"); };
    socket.on("lead:deleted", onDeleted);
    return () => {
      socket.off("lead:message", onChange);
      socket.off("lead:updated", onChange);
      socket.off("lead:converted", onChange);
      socket.off("lead:deleted", onDeleted);
    };
  }, [socket, id, load, navigate]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lead?.thread?.length]);

  const composerEmpty = useMemo(() => isRichEmpty(composer), [composer]);

  const handleSend = async () => {
    if (composerEmpty || sending) return;
    const body = sanitizeRichText(composer);
    setSending(true);
    try {
      const res = await superadminService.addLeadMessage(id, { kind: composerKind, body, mentions: composerKind === "note" ? composerMentions : [] });
      setLead(res.data.lead);
      superadminService.setLeadCache(res.data.lead);
      setComposer("");
      setComposerMentions([]);
      setComposerNonce((n) => n + 1);
      if (composerKind === "reply") {
        if (res.data.emailStatus === "failed") toast.error("Note saved, but the email failed to send.");
        else toast.success("Reply sent");
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleAssign = async (val) => {
    try {
      const res = await superadminService.assignLead(id, val || null);
      setLead(res.data.lead);
      superadminService.setLeadCache(res.data.lead);
    } catch {
      toast.error("Failed to assign");
    }
  };

  const jumpStage = async (targetStage) => {
    if (!lead || lead.stage === targetStage || stageBusy) return;
    setStageBusy(true);
    try {
      const res = await superadminService.changeLeadStage(id, { stage: targetStage });
      setLead(res.data.lead);
      superadminService.setLeadCache(res.data.lead);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to change stage");
    } finally {
      setStageBusy(false);
    }
  };

  const handleLostConfirm = async (reason, note) => {
    setStageBusy(true);
    try {
      const res = await superadminService.changeLeadStage(id, { stage: "lost", lostReason: reason, lostReasonNote: note });
      setLead(res.data.lead);
      superadminService.setLeadCache(res.data.lead);
      setLostOpen(false);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to mark lost");
    } finally {
      setStageBusy(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete this lead",
      message: `The record for ${lead.orgName} and its entire note thread will be permanently removed.`,
      tone: "danger",
      confirmText: "Delete",
      icon: Trash2,
      onConfirm: async () => {
        await superadminService.deleteLead(id);
        superadminService.removeLeadCache(id);
      },
    });
    if (ok) { toast.success("Lead deleted"); navigate("/leads"); }
  };

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><TabLoader label="Loading lead…" /></div>;
  if (error) return <SAErrorState message={error} onRetry={() => load({ force: true })} />;
  if (!lead) return null;

  const closed = lead.stage === "won" || lead.stage === "lost";
  const teamOptions = [{ value: "", label: "Unassigned" }, ...staff.map((s) => ({ value: s._id, label: s.name || s.email }))];
  const currentIdx = STAGES.findIndex((s) => s.key === lead.stage);

  return (
    <MotionConfig reducedMotion="user">
    <div className="[&_*]:!rounded-none">
      <button type="button" onClick={() => navigate("/leads")} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-accent">
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </button>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className={`${card} mb-4 p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center bg-accent/10 text-accent"><Building2 className="h-5 w-5" /></span>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-gray-900 dark:text-white">{lead.orgName}</h1>
              <p className="truncate text-sm text-gray-500 dark:text-white/60">{lead.contactName} · <a href={`mailto:${lead.contactEmail}`} className="text-accent hover:underline">{lead.contactEmail}</a></p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!closed ? (
              <>
                <button type="button" onClick={() => setLostOpen(true)} disabled={stageBusy} className="inline-flex items-center gap-1.5 border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5">
                  <XCircle className="h-3.5 w-3.5" /> Mark lost
                </button>
                <button type="button" onClick={() => navigate(`/leads/${id}/convert`)} className="inline-flex items-center gap-1.5 bg-accent px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-light">
                  <Sparkles className="h-3.5 w-3.5" /> Convert
                </button>
              </>
            ) : null}
            <button type="button" onClick={handleDelete} title="Delete lead" className="grid h-9 w-9 place-items-center text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Outcome banner */}
        {lead.stage === "won" ? (
          <div className="mt-4 flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Converted{lead.convertedAt ? ` on ${fmtDateTime(lead.convertedAt)}` : ""}{lead.conversionMode ? ` via ${lead.conversionMode === "manual_provision" ? "manual provisioning" : "activation link"}` : ""}.</span>
            {lead.convertedOrgId?._id ? (
              <Link to={`/organisations/${lead.convertedOrgId._id}`} className="ml-auto inline-flex shrink-0 items-center gap-1 font-semibold hover:underline">View org <ExternalLink className="h-3.5 w-3.5" /></Link>
            ) : null}
          </div>
        ) : lead.stage === "lost" ? (
          <div className="mt-4 flex items-center gap-2 border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
            <XCircle className="h-4 w-4 shrink-0" />
            <span>Marked lost{lead.lostReason ? ` — ${lead.lostReason.replace(/_/g, " ")}` : ""}{lead.lostReasonNote ? `: ${lead.lostReasonNote}` : ""}</span>
          </div>
        ) : (
          <div className="mt-5 flex items-center gap-1 overflow-x-auto pb-1">
            {STAGES.map((s, i) => {
              const done = i <= currentIdx;
              return (
                <button
                  key={s.key}
                  type="button"
                  disabled={stageBusy}
                  onClick={() => jumpStage(s.key)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                    done ? "text-white" : "border-gray-200 bg-white text-gray-400 hover:border-gray-300 dark:border-white/10 dark:bg-white/5",
                  )}
                  style={done ? { background: s.color, borderColor: s.color } : undefined}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Assignment */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Assignee</span>
          <CustomSelect value={lead.assignee?.userId?._id || lead.assignee?.userId || ""} onChange={handleAssign} options={teamOptions} searchable searchPlaceholder="Search operators…" placeholder="Unassigned" className="min-w-[180px]" triggerClassName="border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-accent dark:border-white/10 dark:bg-[var(--admin-card)]" />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: intake details */}
        <div className="space-y-4 lg:col-span-1">
          <Section title="Organisation">
            <Meta icon={Globe} label="Website" value={lead.orgWebsite} />
            <Meta icon={Sparkles} label="Type" value={lead.verticalType === "muslim" ? "Muslim charity" : "General"} />
            <Meta icon={MapPin} label="Country" value={lead.country} />
            <div className="col-span-2 sm:col-span-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">Cause areas</p>
              <Chips values={lead.causeAreas} labelFor={causeAreaLabel} />
            </div>
          </Section>

          <Section title="Contact">
            <Meta icon={UserIcon} label="Role" value={lead.contactRole} />
            <Meta icon={Mail} label="Email" value={lead.contactEmail} />
            <Meta icon={Phone} label="Phone" value={lead.contactPhone} />
          </Section>

          <Section title="Size & budget">
            <Meta label="Staff size" value={staffSizeLabel(lead.staffSize)} />
            <Meta label="Annual budget" value={budgetRangeLabel(lead.annualBudgetRange)} />
            <Meta label="Donor database" value={donorDbSizeLabel(lead.donorDatabaseSize)} />
          </Section>

          <Section title="Current state">
            <div className="col-span-2 sm:col-span-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">Tools in use</p>
              <Chips values={lead.currentTools} labelFor={currentToolLabel} />
              {lead.currentToolsOther ? <p className="mt-1.5 text-xs text-gray-500">{lead.currentToolsOther}</p> : null}
            </div>
            <div className="col-span-2 sm:col-span-3">
              <p className="mb-1 mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">Challenges</p>
              <Chips values={lead.challenges} labelFor={challengeLabel} />
              {lead.challengesOther ? <p className="mt-1.5 text-xs text-gray-500">{lead.challengesOther}</p> : null}
            </div>
          </Section>

          <Section title="Intent">
            <Meta label="Interested plan" value={lead.interestedPlan} />
            <Meta label="Billing" value={lead.interestedBillingCycle} />
            <Meta label="Timeline" value={timelineLabel(lead.timeline)} />
            <Meta label="Decision role" value={decisionRoleLabel(lead.decisionRole)} />
            {lead.message ? (
              <div className="col-span-2 sm:col-span-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">Message</p>
                <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-white/80">{lead.message}</p>
              </div>
            ) : null}
          </Section>

          <Section title="Source">
            <Meta icon={Clock} label="Submitted" value={fmtDateTime(lead.createdAt)} />
            <Meta label="Source" value={(lead.source || "").replace(/_/g, " ")} />
            {lead.utm?.campaign ? <Meta label="Campaign" value={lead.utm.campaign} /> : null}
          </Section>
        </div>

        {/* Right: notes / thread */}
        <div className="flex min-h-[520px] flex-col overflow-hidden lg:col-span-2">
          <div className={`${card} flex flex-1 flex-col overflow-hidden`}>
            <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50/40 p-4 dark:bg-transparent">
              {(lead.thread || []).length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-16 text-center text-gray-400">
                  <p className="text-sm">No notes yet</p>
                  <p className="mt-1 text-xs">Leave an internal note or reply to {lead.contactName.split(" ")[0]} below.</p>
                </div>
              ) : (
                lead.thread.map((m, i) => <ThreadMessage key={m._id || i} m={m} mine={isMine(m.author)} />)
              )}
              <div ref={bottomRef} />
            </div>

            <div className="shrink-0 border-t border-gray-100 p-3 dark:border-white/10">
              <div className="mb-2 inline-flex overflow-hidden border border-gray-200 text-xs dark:border-white/10">
                <button type="button" onClick={() => setComposerKind("note")} className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors", composerKind === "note" ? "bg-accent text-white" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5")}>
                  <Lock className="h-3.5 w-3.5" /> Internal note
                </button>
                <button type="button" onClick={() => setComposerKind("reply")} className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors", composerKind === "reply" ? "bg-accent text-white" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5")}>
                  <CornerUpLeft className="h-3.5 w-3.5" /> Reply to lead
                </button>
              </div>
              <RichTextEditor
                key={`${id}-${composerNonce}`}
                value={composer}
                onChange={setComposer}
                mentionItems={composerKind === "note" ? staff : null}
                onMentions={setComposerMentions}
                placeholder={composerKind === "reply" ? `Reply — this emails ${lead.contactEmail}` : "Write an internal note… use @ to mention an operator"}
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="inline-flex items-center gap-1.5 text-[11px] text-gray-400">
                  {composerKind === "reply" ? (<><Mail className="h-3.5 w-3.5" /> Sent by email</>) : (<><Lock className="h-3.5 w-3.5" /> Visible to operators only</>)}
                </p>
                <button type="button" onClick={handleSend} disabled={composerEmpty || sending} className="inline-flex items-center gap-2 bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {composerKind === "reply" ? "Send reply" : "Add note"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {lostOpen ? <LostReasonModal lead={lead} onClose={() => setLostOpen(false)} onConfirm={handleLostConfirm} /> : null}
    </div>
    </MotionConfig>
  );
}

function ThreadMessage({ m, mine }) {
  const isReply = m.kind === "reply";
  const author = m.author || {};
  return (
    <div className="flex justify-end">
      <div className="max-w-[88%]">
        <div className="mb-1 flex items-center justify-end gap-2 text-[11px] text-gray-400">
          <span className="font-medium text-gray-700 dark:text-white/80">{mine ? "You" : author.name || m.authorName || "Operator"}</span>
          <span>· {fmtDateTime(m.createdAt)}</span>
        </div>
        <div className={cn("rounded-tr-sm border px-3.5 py-2.5 text-sm", isReply ? "border-accent/30 bg-accent/5 text-gray-800" : "border-gray-200 bg-gray-50 text-gray-800 dark:border-white/10 dark:bg-white/5")}>
          <div className={cn("mb-1.5 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]", isReply ? "text-accent" : "text-amber-600 dark:text-amber-400")}>
            {isReply ? (
              <>
                <Mail className="h-3 w-3" /> Replied to {m.emailedTo || "lead"}
                {m.emailStatus === "failed" ? <span className="ml-1 bg-red-100 px-1 text-red-600 dark:bg-red-500/15">email failed</span> : null}
              </>
            ) : (
              <><Lock className="h-3 w-3" /> Internal note</>
            )}
          </div>
          <div className="prose prose-sm max-w-none break-words text-gray-800 dark:prose-invert [&_p]:my-0 [&_a]:text-accent" dangerouslySetInnerHTML={{ __html: sanitizeRichText(m.body) }} />
        </div>
      </div>
    </div>
  );
}
