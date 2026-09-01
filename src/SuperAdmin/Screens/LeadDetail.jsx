import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  Globe,
  Mail,
  Phone,
  User as UserIcon,
  Loader2,
  Send,
  Lock,
  CornerUpLeft,
  Sparkles,
  Clock,
  MapPin,
  Users,
} from "lucide-react";
import { TabLoader } from "../../components/TabLoader";
import { RichTextEditor, sanitizeRichText } from "../../components/RichTextEditor";
import { cn } from "../../utils/cn";
import superadminService from "../../services/superadmin.service";
import SAErrorState from "../components/SAErrorState";
import { useAuth } from "../../context/AuthContext";
import { useLeadRecord, LeadHeader, card, fmtDateTime } from "./leadShared";
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

const isRichEmpty = (html) => !sanitizeRichText(html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;| /g, " ").trim();

/**
 * One intake field. The value WRAPS — it is never truncated.
 *
 * This panel is the operator's only view of what the lead actually typed, and a
 * clipped value is worse than a tall card: "https://www.hu…", "ayna.sulaiman+…"
 * and "TBC — awaiting…" are all indistinguishable from the next lead's. There is
 * nowhere else in the console to go and read the full string.
 *
 * `overflow-wrap: anywhere` rather than plain `break-words` because the values
 * that overflow are the ones with no spaces to break at — URLs and email
 * addresses — and `break-words` alone leaves those overflowing their column.
 */
function Meta({ icon: Icon, label, value, wide = false }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className={cn("min-w-0", wide && "col-span-full")}>
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
        {Icon ? <Icon className="h-3 w-3 shrink-0" /> : null} {label}
      </p>
      <p className="mt-0.5 text-sm text-gray-800 [overflow-wrap:anywhere] dark:text-white/85">{value}</p>
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

/**
 * Fields laid out by the width they ACTUALLY have, not by the viewport's.
 *
 * This was `grid-cols-2 sm:grid-cols-3`, which is measured against the window
 * while these cards live in a rail that is one third of it. Past `lg` the rail
 * gets NARROWER as the window gets wider, so on a large screen the breakpoint
 * confidently asked for three columns inside ~500px and every value was squeezed
 * into ~150px — which is what the truncation was hiding.
 *
 * auto-fit + minmax is the fix rather than more breakpoints: it reads the real
 * container, so the same card is 1-up in the narrow rail, 2-up when the rail has
 * room, and 3-up on a stacked mobile layout where the card spans the page. No
 * breakpoint can express that, because the rail's width is not a function of the
 * viewport's in one direction.
 *
 * Full-width children must use `col-span-full` — with a variable column count
 * there is no fixed number to span.
 */
function Section({ title, children }) {
  return (
    <div className={`${card} p-4`}>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">{title}</h3>
      <div className="grid gap-x-4 gap-y-3 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        {children}
      </div>
    </div>
  );
}

export default function LeadDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  // Loading, the socket subscription, the staff list and the open-task count
  // are identical on all three lead pages — see leadShared.
  const { lead, apply, loading, error, reload, staff, openTasks } = useLeadRecord(id);

  const myEmail = (user?.email || "").toLowerCase();
  const myId = user?._id || user?.id || null;
  const isMine = useCallback(
    (author) => !!author && ((myId && author._id === myId) || (author.email && author.email.toLowerCase() === myEmail)),
    [myId, myEmail],
  );

  const [composer, setComposer] = useState("");
  const [composerKind, setComposerKind] = useState("note");
  const [composerMentions, setComposerMentions] = useState([]);
  const [composerNonce, setComposerNonce] = useState(0);
  const [sending, setSending] = useState(false);

  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lead?.thread?.length]);

  const composerEmpty = useMemo(() => isRichEmpty(composer), [composer]);

  const handleSend = async () => {
    if (composerEmpty || sending) return;
    const body = sanitizeRichText(composer);
    setSending(true);
    try {
      const res = await superadminService.addLeadMessage(id, { kind: composerKind, body, mentions: composerKind === "note" ? composerMentions : [] });
      apply(res.data.lead);
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

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><TabLoader label="Loading lead…" /></div>;
  if (error) return <SAErrorState message={error} onRetry={() => reload({ force: true })} />;
  if (!lead) return null;

  return (
    <MotionConfig reducedMotion="user">
    <div className="[&_*]:!rounded-none">
      <LeadHeader lead={lead} apply={apply} staff={staff} openTasks={openTasks} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: intake details */}
        <div className="space-y-4 lg:col-span-1">
          <Section title="Organisation">
            <Meta icon={Globe} label="Website" value={lead.orgWebsite} wide />
            <Meta icon={Sparkles} label="Type" value={lead.verticalType === "muslim" ? "Muslim charity" : "General"} />
            <Meta icon={MapPin} label="Country" value={lead.country} />
            <div className="col-span-full">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">Cause areas</p>
              <Chips values={lead.causeAreas} labelFor={causeAreaLabel} />
            </div>
          </Section>

          <Section title="Contact">
            <Meta icon={UserIcon} label="Role" value={lead.contactRole} />
            <Meta icon={Mail} label="Email" value={lead.contactEmail} wide />
            <Meta icon={Phone} label="Phone" value={lead.contactPhone} />
          </Section>

          {/* Everyone else at the org who matters to the deal. Absent entirely
              when there are none — an empty "Other contacts" card is a card
              that only ever says no. */}
          {lead.contacts?.length ? (
            <div className={`${card} p-4`}>
              <h3 className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                <Users className="h-3.5 w-3.5" /> Other contacts
              </h3>
              <ul className="space-y-3">
                {lead.contacts.map((c, i) => (
                  <li key={c._id || i} className="border-l-2 border-gray-100 pl-3 dark:border-white/10">
                    <p className="text-sm font-medium text-gray-900 [overflow-wrap:anywhere] dark:text-white">{c.name}</p>
                    {c.role ? <p className="text-xs text-gray-500 dark:text-white/60">{c.role}</p> : null}
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="mt-0.5 block text-xs text-accent hover:underline [overflow-wrap:anywhere]">{c.email}</a>
                    ) : null}
                    {c.phone ? <p className="text-xs text-gray-500 dark:text-white/60">{c.phone}</p> : null}
                    {c.note ? <p className="mt-1 text-xs text-gray-500 dark:text-white/50">{c.note}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Section title="Size & budget">
            <Meta label="Staff size" value={staffSizeLabel(lead.staffSize)} />
            <Meta label="Annual budget" value={budgetRangeLabel(lead.annualBudgetRange)} />
            <Meta label="Donor database" value={donorDbSizeLabel(lead.donorDatabaseSize)} />
          </Section>

          <Section title="Current state">
            <div className="col-span-full">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">Tools in use</p>
              <Chips values={lead.currentTools} labelFor={currentToolLabel} />
              {lead.currentToolsOther ? <p className="mt-1.5 text-xs text-gray-500">{lead.currentToolsOther}</p> : null}
            </div>
            <div className="col-span-full">
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
              <div className="col-span-full">
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
