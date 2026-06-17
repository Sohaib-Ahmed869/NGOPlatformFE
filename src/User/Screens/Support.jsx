import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Portal from "../../components/Portal";
import { toast } from "react-hot-toast";
import { LifeBuoy, Plus, X, Send, Loader2, Inbox, Paperclip, Clock, FileText, Sparkles } from "lucide-react";
import { TabLoader } from "../../components/TabLoader";
import { cn } from "../../utils/cn";
import supportService from "../../services/support.service";
import { useAuth } from "../../context/AuthContext";
import { PUBLIC_SUPPORT_CATEGORIES, supportCategoryLabel } from "../../config/supportCategories";

const STATUS = {
  new: { label: "New", cls: "bg-accent/10 text-accent" },
  in_progress: { label: "In progress", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  on_hold: { label: "On hold", cls: "bg-gray-100 text-gray-600" },
  solved: { label: "Solved", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  declined: { label: "Closed", cls: "bg-gray-100 text-gray-500" },
};
const fmt = (d) => (d ? new Date(d).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");
const MAX_FILE_MB = 10;

const card = "rounded-token border border-gray-100 bg-white shadow-sm dark:border-white/10";
const inputCls = "w-full rounded-token border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5";
// Underline field — matches the public support form.
const fieldCls = "w-full border-b border-gray-200 bg-transparent py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-accent dark:border-white/10";

export default function Support() {
  const { user } = useAuth();
  const myId = user?._id || user?.id || null;

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ summary: "", description: "", category: "general" });
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [creating, setCreating] = useState(false);
  const fileRef = useRef(null);
  const [active, setActive] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const fetchTickets = async () => {
    try {
      const res = await supportService.myList();
      setTickets(res.data.tickets || []);
    } catch {
      toast.error("Failed to load your tickets");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchTickets(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [active?.comments?.length]);

  const openTicket = async (id) => {
    setLoadingDetail(true);
    setReply("");
    try {
      const res = await supportService.myGet(id);
      setActive(res.data.ticket);
    } catch {
      toast.error("Failed to open ticket");
    } finally {
      setLoadingDetail(false);
    }
  };

  const pickFile = (f) => {
    if (!f) return;
    if (!(f.type.startsWith("image/") || f.type === "application/pdf")) return toast.error("Please choose an image or PDF");
    if (f.size > MAX_FILE_MB * 1024 * 1024) return toast.error(`File must be under ${MAX_FILE_MB}MB`);
    setFile(f);
  };

  const create = async () => {
    if (!form.summary.trim()) return toast.error("Please add a short summary");
    setCreating(true);
    try {
      const fd = new FormData();
      fd.append("summary", form.summary);
      fd.append("description", form.description);
      fd.append("category", form.category);
      if (file) fd.append("attachment", file);
      const res = await supportService.myCreate(fd);
      toast.success("Ticket submitted — we'll be in touch");
      setCreateOpen(false);
      setForm({ summary: "", description: "", category: "general" });
      setFile(null);
      await fetchTickets();
      setActive(res.data.ticket);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to submit");
    } finally {
      setCreating(false);
    }
  };

  const send = async () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    try {
      const res = await supportService.myReply(active._id, { message: reply });
      setActive(res.data.ticket);
      setReply("");
      fetchTickets();
    } catch {
      toast.error("Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Help & support</p>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-primary"><LifeBuoy className="h-6 w-6" /> Support</h1>
          <p className="mt-1 text-sm text-text-muted">Raise a request and track our replies.</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-1.5 rounded-token bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light">
          <Plus className="h-4 w-4" /> New ticket
        </button>
      </div>

      {loading ? (
        <div className="flex h-[50vh] items-center justify-center"><TabLoader label="Loading your tickets…" /></div>
      ) : tickets.length === 0 ? (
        <div className={`${card} py-16 text-center`}>
          <Inbox className="mx-auto mb-3 h-10 w-10 text-text-muted" />
          <p className="text-sm font-medium text-primary">No support tickets yet</p>
          <p className="mt-1 text-xs text-text-muted">Have a question or a problem? Raise your first ticket.</p>
          <button onClick={() => setCreateOpen(true)} className="mx-auto mt-4 inline-flex items-center gap-1.5 rounded-token bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-light">
            <Plus className="h-4 w-4" /> New ticket
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {tickets.map((t) => {
            const s = STATUS[t.status] || STATUS.new;
            return (
              <button key={t._id} onClick={() => openTicket(t._id)} className={`${card} group p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md`}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className="font-mono text-[11px] text-text-muted">#{t.ticketNumber}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", s.cls)}>{s.label}</span>
                </div>
                <p className="line-clamp-2 text-sm font-semibold text-primary">{t.summary}</p>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-text-muted">
                  <span className="rounded-full bg-gray-100 px-1.5 py-0.5 dark:bg-white/10">{supportCategoryLabel(t.category)}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {fmt(t.updatedAt || t.createdAt)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* New ticket modal */}
      <Portal>
        <AnimatePresence>
          {createOpen && (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !creating && setCreateOpen(false)} />
              <motion.div className={`${card} relative max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-2xl sm:p-7`} initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}>
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <p className="mb-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">New request</p>
                    <h3 className="font-heading text-xl font-bold text-primary">How can we help?</h3>
                  </div>
                  <button onClick={() => setCreateOpen(false)} className="grid h-8 w-8 shrink-0 place-items-center rounded-token text-text-muted hover:bg-gray-100 dark:hover:bg-white/10"><X className="h-4 w-4" /></button>
                </div>

                {/* Category tiles — mirrors the public support form */}
                <div className="mb-6">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500"><Sparkles className="h-3.5 w-3.5 text-accent" /> What's this about?</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {PUBLIC_SUPPORT_CATEGORIES.map((c) => {
                      const on = form.category === c.value;
                      const Icon = c.icon;
                      return (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, category: c.value }))}
                          className={cn(
                            "flex items-center gap-2 rounded-token border px-3 py-2.5 text-left text-sm font-medium transition-all duration-200",
                            on ? "border-accent bg-accent text-white shadow-md shadow-accent/25" : "border-gray-200 bg-white text-gray-600 hover:-translate-y-0.5 hover:border-accent/60 hover:text-primary dark:border-white/10 dark:bg-white/5",
                          )}
                        >
                          <Icon className={cn("h-4 w-4 shrink-0", on ? "text-white" : "text-accent")} />
                          <span className="leading-tight">{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Summary */}
                <div className="mb-5">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Summary <span className="text-red-500">*</span></label>
                  <input value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} className={fieldCls} placeholder="Brief summary of your request" autoFocus />
                </div>

                {/* Details */}
                <div className="mb-5">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Details <span className="font-normal text-gray-400">(optional)</span></label>
                  <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={4} className={fieldCls} placeholder="Describe your request — steps, links, anything that helps…" />
                </div>

                {/* Attachment */}
                <div className="mb-6">
                  <p className="mb-1.5 block text-sm font-medium text-gray-700">Attachment <span className="font-normal text-gray-400">(optional · image or PDF, max {MAX_FILE_MB}MB)</span></p>
                  {file ? (
                    <div className="flex items-center gap-3 rounded-token border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent"><FileText className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-800 dark:text-white">{file.name}</p>
                        <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button type="button" onClick={() => setFile(null)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500" aria-label="Remove attachment"><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                      onDragLeave={() => setDrag(false)}
                      onDrop={(e) => { e.preventDefault(); setDrag(false); pickFile(e.dataTransfer.files?.[0]); }}
                      className={cn("flex w-full items-center justify-center gap-2 rounded-token border-2 border-dashed px-4 py-5 text-sm transition-colors", drag ? "border-accent bg-accent/5 text-accent" : "border-gray-300 text-gray-500 hover:border-accent/60 hover:text-primary dark:border-white/15")}
                    >
                      <Paperclip className="h-4 w-4" /> Click or drag &amp; drop a file
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); if (fileRef.current) fileRef.current.value = ""; }} />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setCreateOpen(false)} className="flex-1 rounded-token border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-white/80">Cancel</button>
                  <button onClick={create} disabled={creating} className="inline-flex flex-1 items-center justify-center gap-2 rounded-token bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent-light disabled:opacity-50">
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit request
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>

      {/* Ticket detail modal */}
      <Portal>
        <AnimatePresence>
          {active && (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setActive(null)} />
              <motion.div className={`${card} relative flex max-h-[88vh] w-full max-w-xl flex-col shadow-2xl`} initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}>
                <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-5 dark:border-white/10">
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-mono text-[11px] text-text-muted">#{active.ticketNumber}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", (STATUS[active.status] || STATUS.new).cls)}>{(STATUS[active.status] || STATUS.new).label}</span>
                    </div>
                    <h3 className="font-heading text-lg font-semibold text-primary">{active.summary}</h3>
                  </div>
                  <button onClick={() => setActive(null)} className="grid h-8 w-8 shrink-0 place-items-center rounded-token text-text-muted hover:bg-gray-100 dark:hover:bg-white/10"><X className="h-4 w-4" /></button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50/40 p-5 dark:bg-transparent">
                  {/* original message — from the customer */}
                  <Bubble mine label="You" time={active.createdAt}>{active.description || active.summary}</Bubble>
                  {(active.attachments || []).length > 0 && (
                    <div className="flex flex-wrap gap-2 pl-10">
                      {active.attachments.map((a, i) => (
                        <a key={i} href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-token border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5"><Paperclip className="h-3.5 w-3.5" /><span className="max-w-[160px] truncate">{a.name}</span></a>
                      ))}
                    </div>
                  )}

                  {loadingDetail ? (
                    <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
                  ) : (
                    (active.comments || []).map((cm, i) => {
                      const mine = cm.createdBy?._id === myId || cm.createdBy === myId;
                      return <Bubble key={cm._id || i} mine={mine} label={mine ? "You" : cm.createdBy?.name || "Support"} time={cm.createdAt}>{cm.message}</Bubble>;
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {active.status !== "declined" ? (
                  <div className="border-t border-gray-100 p-4 dark:border-white/10">
                    <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} placeholder="Add a reply…" className={`${inputCls} mb-2 resize-none`} />
                    <div className="flex justify-end">
                      <button onClick={send} disabled={sending || !reply.trim()} className="inline-flex items-center gap-1.5 rounded-token bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-light disabled:opacity-50">
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-gray-100 p-4 text-center text-xs text-text-muted dark:border-white/10">This ticket is closed. Raise a new one if you still need help.</div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </div>
  );
}

function Bubble({ mine, label, time, children }) {
  const rendered = /<[a-z][\s\S]*>/i.test(children || "");
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className="max-w-[86%]">
        <div className={cn("mb-1 flex items-center gap-2 text-[11px] text-text-muted", mine && "justify-end")}>
          <span className="font-medium text-primary">{label}</span>
          <span>· {fmt(time)}</span>
        </div>
        <div className={cn("rounded-2xl border px-3.5 py-2.5 text-sm", mine ? "rounded-tr-sm border-accent/30 bg-accent/5 text-gray-800" : "rounded-tl-sm border-gray-100 bg-white text-gray-800 dark:border-white/10")}>
          {rendered ? (
            <div className="prose prose-sm max-w-none break-words text-gray-800 dark:prose-invert [&_p]:my-0 [&_a]:text-accent" dangerouslySetInnerHTML={{ __html: children }} />
          ) : (
            <p className="whitespace-pre-wrap">{children}</p>
          )}
        </div>
      </div>
    </div>
  );
}
