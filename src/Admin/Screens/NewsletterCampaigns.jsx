import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Portal from "../../components/Portal";
import { toast } from "react-hot-toast";
import {
  Plus,
  Send,
  Clock,
  Users,
  Loader2,
  Trash2,
  X,
  CalendarClock,
  Eye,
  Pencil,
  FlaskConical,
  AlertTriangle,
  CheckCircle2,
  Inbox,
} from "lucide-react";
import { RichTextEditor, sanitizeRichText } from "../../components/RichTextEditor";
import { CustomSelect } from "../../components/CustomSelect";
import { TabLoader } from "../../components/TabLoader";
import { cn } from "../../utils/cn";
import service from "../../services/newsletterCampaigns.service";
import { getSocket } from "../../services/socket";

// Friendly labels for the per-recipient failure reasons.
const FAILURE_LABEL = {
  invalid_address: "Invalid address",
  hard_bounce: "Bounced",
  soft_bounce: "Temporary failure",
  rate_limit: "Rate limited",
  auth: "Mailbox auth failed",
  quota_exhausted: "Quota reached",
  unknown: "Failed",
};

const AUDIENCE_TYPES = [
  { value: "all_active", label: "All active subscribers" },
  { value: "recent", label: "Subscribed recently" },
  { value: "source", label: "By source" },
];

const STATUS_STYLE = {
  draft: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/70",
  scheduled: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
  sending: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  sent: "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-300",
  failed: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300",
};

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

const audienceLabel = (a) =>
  a?.type === "recent"
    ? `Subscribed in last ${a.days || 30} days`
    : a?.type === "source"
    ? `Source: ${a.source || "—"}`
    : "All active subscribers";

const isEmptyHtml = (html) =>
  !sanitizeRichText(html || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();

function StatusBadge({ status }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 text-[10px] font-semibold capitalize", STATUS_STYLE[status] || STATUS_STYLE.draft)}>
      {status}
    </span>
  );
}

const NewsletterCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  // composer
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [readOnly, setReadOnly] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audType, setAudType] = useState("all_active");
  const [audDays, setAudDays] = useState(30);
  const [audSource, setAudSource] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [recipients, setRecipients] = useState(null);

  const [busy, setBusy] = useState(""); // "" | save | send | schedule | test
  const [loadingCampaign, setLoadingCampaign] = useState(false); // opening an existing one
  const [confirmSend, setConfirmSend] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // failure list modal
  const [failuresFor, setFailuresFor] = useState(null);
  const [failures, setFailures] = useState([]);
  const [loadingFailures, setLoadingFailures] = useState(false);

  const load = useCallback(async () => {
    try {
      setCampaigns(await service.list());
    } catch {
      toast.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Live send progress over the shared admin socket (the backend emits
  // `campaign:progress` after every batch). The poll below stays as a fallback.
  useEffect(() => {
    const socket = getSocket();
    const onProgress = (p) => {
      setCampaigns((prev) => prev.map((c) => (c._id === p.campaignId ? { ...c, status: p.status, stats: p.stats } : c)));
    };
    socket.on("campaign:progress", onProgress);
    return () => socket.off("campaign:progress", onProgress);
  }, []);

  // Refresh while anything is mid-send so the counters/status settle even if a
  // socket event is missed (e.g. the screen was opened mid-send).
  useEffect(() => {
    if (!campaigns.some((c) => c.status === "sending")) return undefined;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [campaigns, load]);

  const openFailures = async (c) => {
    setFailuresFor(c);
    setFailures([]);
    setLoadingFailures(true);
    try {
      setFailures(await service.failures(c._id));
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to load the failure list");
    } finally {
      setLoadingFailures(false);
    }
  };

  const audience = useMemo(
    () => ({ type: audType, days: Number(audDays) || 30, source: audSource.trim() }),
    [audType, audDays, audSource],
  );

  // Live recipient preview whenever the audience changes (composer open only).
  useEffect(() => {
    if (!open || readOnly) return undefined;
    let cancelled = false;
    setRecipients(null);
    service
      .recipientCount(audience)
      .then((n) => !cancelled && setRecipients(n))
      .catch(() => !cancelled && setRecipients(null));
    return () => {
      cancelled = true;
    };
  }, [open, readOnly, audience]);

  const resetComposer = () => {
    setEditId(null);
    setReadOnly(false);
    setSubject("");
    setBody("");
    setAudType("all_active");
    setAudDays(30);
    setAudSource("");
    setScheduledAt("");
    setRecipients(null);
    setLoadingCampaign(false);
  };

  const openNew = () => {
    resetComposer();
    setOpen(true);
  };

  const openCampaign = async (c) => {
    // Open immediately with a loader, then fetch the full campaign.
    setEditId(c._id);
    setReadOnly(["sent", "sending"].includes(c.status));
    setSubject(c.subject || "");
    setBody("");
    setScheduledAt("");
    setRecipients(null);
    setOpen(true);
    setLoadingCampaign(true);
    try {
      const fresh = await service.get(c._id);
      setReadOnly(["sent", "sending"].includes(fresh.status));
      setSubject(fresh.subject || "");
      setBody(fresh.body || "");
      setAudType(fresh.audience?.type || "all_active");
      setAudDays(fresh.audience?.days || 30);
      setAudSource(fresh.audience?.source || "");
    } catch {
      toast.error("Failed to load campaign");
    } finally {
      setLoadingCampaign(false);
    }
  };

  const closeComposer = () => {
    setOpen(false);
    setConfirmSend(false);
  };

  const validate = () => {
    if (!subject.trim()) {
      toast.error("Add a subject");
      return false;
    }
    if (isEmptyHtml(body)) {
      toast.error("Write a message");
      return false;
    }
    return true;
  };

  // Persist the current composer state and return the campaign id.
  const persist = async () => {
    const payload = { subject: subject.trim(), body: sanitizeRichText(body), audience };
    if (editId) {
      const updated = await service.update(editId, payload);
      setCampaigns((prev) => prev.map((c) => (c._id === editId ? { ...c, ...updated } : c)));
      return editId;
    }
    const created = await service.create(payload);
    setCampaigns((prev) => [created, ...prev]);
    setEditId(created._id);
    return created._id;
  };

  const saveDraft = async () => {
    if (!subject.trim() && isEmptyHtml(body)) return closeComposer();
    setBusy("save");
    try {
      await persist();
      toast.success("Draft saved");
      closeComposer();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to save");
    } finally {
      setBusy("");
    }
  };

  const handleTest = async () => {
    if (!validate()) return;
    setBusy("test");
    try {
      const res = await service.test({ subject: subject.trim(), body: sanitizeRichText(body) });
      toast.success(res?.ok ? `Test sent to ${res.to}` : "Test send failed");
    } catch (e) {
      toast.error(e.response?.data?.error || "Test failed");
    } finally {
      setBusy("");
    }
  };

  const doSendNow = async () => {
    if (!validate()) return;
    setBusy("send");
    try {
      const id = await persist();
      const updated = await service.sendNow(id);
      setCampaigns((prev) => prev.map((c) => (c._id === id ? { ...c, ...updated } : c)));
      toast.success("Sending started");
      setConfirmSend(false);
      closeComposer();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to send");
    } finally {
      setBusy("");
    }
  };

  const handleSchedule = async () => {
    if (!validate()) return;
    if (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now()) {
      toast.error("Pick a future date and time");
      return;
    }
    setBusy("schedule");
    try {
      const id = await persist();
      const updated = await service.schedule(id, scheduledAt);
      setCampaigns((prev) => prev.map((c) => (c._id === id ? { ...c, ...updated } : c)));
      toast.success("Campaign scheduled");
      closeComposer();
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to schedule");
    } finally {
      setBusy("");
    }
  };

  const handleCancelSchedule = async (c) => {
    try {
      const updated = await service.cancelSchedule(c._id);
      setCampaigns((prev) => prev.map((x) => (x._id === c._id ? { ...x, ...updated } : x)));
      toast.success("Schedule cancelled");
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to cancel");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await service.remove(deleteTarget._id);
      setCampaigns((prev) => prev.filter((c) => c._id !== deleteTarget._id));
      if (editId === deleteTarget._id) closeComposer();
      toast.success("Campaign deleted");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <TabLoader label="Loading campaigns…" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-muted">Compose and send email campaigns to your subscribers.</p>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
        >
          <Plus className="h-4 w-4" /> New campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="border border-gray-100 bg-white p-12 text-center shadow-sm dark:border-white/10">
          <Inbox className="mx-auto mb-3 h-10 w-10 text-text-muted" />
          <p className="text-text-muted">No campaigns yet. Create your first one.</p>
        </div>
      ) : (
        <div className="overflow-hidden border border-gray-100 bg-white shadow-sm dark:border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-accent/10 bg-accent/5 text-left text-[11px] font-semibold uppercase tracking-wider text-accent dark:border-white/10">
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Audience</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Sent / When</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 dark:border-white/5 dark:hover:bg-white/5">
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => openCampaign(c)} className="text-left font-medium text-primary hover:text-accent">
                        {c.subject || <span className="italic text-text-muted">Untitled</span>}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{audienceLabel(c.audience)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {c.status === "sent" ? (
                        <span>
                          {c.stats?.sent ?? 0}/{c.stats?.recipients ?? 0}
                          {c.stats?.failed ? (
                            <>
                              {" · "}
                              <button type="button" onClick={() => openFailures(c)} className="text-red-500 underline-offset-2 hover:underline">
                                {c.stats.failed} failed
                              </button>
                            </>
                          ) : null}{" "}
                          · {fmtDateTime(c.sentAt)}
                        </span>
                      ) : c.status === "sending" ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {c.stats?.sent ?? 0}/{c.stats?.recipients ?? 0}
                        </span>
                      ) : c.status === "scheduled" ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" /> {fmtDateTime(c.scheduledAt)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        {c.status === "scheduled" ? (
                          <button
                            type="button"
                            onClick={() => handleCancelSchedule(c)}
                            title="Cancel schedule"
                            className="grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary dark:hover:bg-white/10"
                          >
                            <Clock className="h-4 w-4" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => openCampaign(c)}
                          title={["sent", "sending"].includes(c.status) ? "View" : "Edit"}
                          className="grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:bg-accent/5 hover:text-accent"
                        >
                          {["sent", "sending"].includes(c.status) ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(c)}
                          title="Delete"
                          className="grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Composer */}
      <Portal>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeComposer} />
            <motion.div
              className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden border border-gray-100 bg-white shadow-2xl dark:border-white/10 dark:bg-[var(--admin-elevated)]"
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-white/10">
                <h3 className="text-base font-semibold text-primary">
                  {readOnly ? "Campaign" : editId ? "Edit campaign" : "New campaign"}
                </h3>
                <button onClick={closeComposer} className="grid h-8 w-8 place-items-center text-text-muted transition-colors hover:bg-gray-100 hover:text-primary dark:hover:bg-white/10">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto p-6">
                {loadingCampaign ? (
                  <div className="flex h-64 items-center justify-center">
                    <TabLoader label="Loading campaign…" />
                  </div>
                ) : (
                  <>
                {/* Subject */}
                <div>
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Subject</label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={readOnly}
                    placeholder="Your newsletter subject…"
                    className="w-full border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-colors focus:border-accent focus:bg-white disabled:opacity-70 dark:border-white/10 dark:bg-white/5"
                  />
                </div>

                {/* Audience */}
                <div>
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Audience</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <CustomSelect
                      value={audType}
                      onChange={setAudType}
                      options={AUDIENCE_TYPES}
                      disabled={readOnly}
                      className="min-w-[200px]"
                      triggerClassName="border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/10 dark:bg-[var(--admin-card)]"
                    />
                    {audType === "recent" ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-text-muted">
                        last
                        <input
                          type="number"
                          min={1}
                          value={audDays}
                          onChange={(e) => setAudDays(e.target.value)}
                          disabled={readOnly}
                          className="w-16 border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm outline-none focus:border-accent dark:border-white/10 dark:bg-white/5"
                        />
                        days
                      </span>
                    ) : null}
                    {audType === "source" ? (
                      <input
                        value={audSource}
                        onChange={(e) => setAudSource(e.target.value)}
                        disabled={readOnly}
                        placeholder="e.g. website"
                        className="w-40 border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm outline-none focus:border-accent dark:border-white/10 dark:bg-white/5"
                      />
                    ) : null}
                  </div>
                  {!readOnly ? (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-text-muted">
                      <Users className="h-3.5 w-3.5" />
                      {recipients == null ? "Counting recipients…" : `Will send to ${recipients} subscriber${recipients === 1 ? "" : "s"}`}
                    </p>
                  ) : null}
                </div>

                {/* Body */}
                <div>
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Message</label>
                  {readOnly ? (
                    <div
                      className="prose prose-sm max-w-none rounded border border-gray-100 p-3 dark:prose-invert dark:border-white/10"
                      dangerouslySetInnerHTML={{ __html: sanitizeRichText(body) }}
                    />
                  ) : (
                    <RichTextEditor value={body} onChange={setBody} placeholder="Write your newsletter…" />
                  )}
                </div>

                {/* Schedule picker */}
                {!readOnly ? (
                  <div>
                    <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                      Schedule (optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/10 dark:bg-white/5"
                    />
                  </div>
                ) : null}
                  </>
                )}
              </div>

              {/* Footer actions */}
              {loadingCampaign ? null : !readOnly ? (
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTest}
                      disabled={!!busy}
                      className="inline-flex items-center gap-2 border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5"
                    >
                      {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />} Test
                    </button>
                    <button
                      type="button"
                      onClick={saveDraft}
                      disabled={!!busy}
                      className="inline-flex items-center gap-2 border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5"
                    >
                      {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save draft
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {scheduledAt ? (
                      <button
                        type="button"
                        onClick={handleSchedule}
                        disabled={!!busy}
                        className="inline-flex items-center gap-2 border border-accent px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/5 disabled:opacity-50"
                      >
                        {busy === "schedule" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />} Schedule
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => (validate() ? setConfirmSend(true) : null)}
                        disabled={!!busy}
                        className="inline-flex items-center gap-2 bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" /> Send now
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="shrink-0 border-t border-gray-100 px-6 py-4 dark:border-white/10">
                  <p className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    Sent to {editId && campaigns.find((c) => c._id === editId)?.stats?.sent} recipients · {fmtDateTime(campaigns.find((c) => c._id === editId)?.sentAt)}
                  </p>
                </div>
              )}

              {/* Send confirmation */}
              <AnimatePresence>
                {confirmSend && (
                  <motion.div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="w-full max-w-sm border border-gray-100 bg-white p-6 text-center shadow-2xl dark:border-white/10 dark:bg-[var(--admin-elevated)]">
                      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-accent/10">
                        <Send className="h-5 w-5 text-accent" />
                      </div>
                      <h3 className="text-base font-semibold text-primary">Send this campaign?</h3>
                      <p className="mt-1 text-sm text-text-muted">
                        It will be emailed to {recipients == null ? "your" : recipients} {recipients === 1 ? "subscriber" : "subscribers"}. This can't be undone.
                      </p>
                      <div className="mt-5 flex gap-3">
                        <button
                          type="button"
                          onClick={() => setConfirmSend(false)}
                          disabled={busy === "send"}
                          className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={doSendNow}
                          disabled={busy === "send"}
                          className="inline-flex flex-1 items-center justify-center gap-2 bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"
                        >
                          {busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </Portal>

      {/* Delete confirmation */}
      <Portal>
      <AnimatePresence>
        {deleteTarget && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !deleting && setDeleteTarget(null)} />
            <motion.div
              className="relative w-full max-w-sm border border-gray-100 bg-white p-6 text-center shadow-2xl dark:border-white/10 dark:bg-[var(--admin-elevated)]"
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
            >
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-red-50 dark:bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-base font-semibold text-primary">Delete campaign?</h3>
              <p className="mt-1 break-words text-sm text-text-muted">
                <span className="font-medium text-primary">{deleteTarget.subject || "Untitled"}</span> will be permanently removed.
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex flex-1 items-center justify-center gap-2 bg-red-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </Portal>

      {/* Failure list */}
      <Portal>
      <AnimatePresence>
        {failuresFor && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setFailuresFor(null)} />
            <motion.div
              className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden border border-gray-100 bg-white shadow-2xl dark:border-white/10 dark:bg-[var(--admin-elevated)]"
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-white/10">
                <div>
                  <h3 className="text-base font-semibold text-primary">Didn't deliver</h3>
                  <p className="truncate text-xs text-text-muted">{failuresFor.subject || "Untitled"}</p>
                </div>
                <button onClick={() => setFailuresFor(null)} className="grid h-8 w-8 place-items-center text-text-muted transition-colors hover:bg-gray-100 hover:text-primary dark:hover:bg-white/10">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {loadingFailures ? (
                  <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
                ) : failures.length === 0 ? (
                  <p className="py-10 text-center text-sm text-text-muted">No delivery failures recorded.</p>
                ) : (
                  <ul className="divide-y divide-gray-50 dark:divide-white/5">
                    {failures.map((r) => (
                      <li key={r.email} className="flex items-center justify-between gap-3 py-2.5">
                        <span className="min-w-0 truncate text-sm text-primary">{r.email}</span>
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center px-2 py-0.5 text-[10px] font-semibold",
                            r.status === "skipped" ? "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300" : "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300",
                          )}
                          title={r.failureReason || ""}
                        >
                          {FAILURE_LABEL[r.failureCode] || FAILURE_LABEL.unknown}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="shrink-0 border-t border-gray-100 px-6 py-3 dark:border-white/10">
                <p className="text-xs text-text-muted">{failures.length ? `${failures.length} recipient${failures.length === 1 ? "" : "s"} shown (max 1000).` : ""}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </Portal>
    </div>
  );
};

export default NewsletterCampaigns;
