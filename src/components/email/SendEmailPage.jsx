import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Send,
  Loader2,
  Paperclip,
  Trash2,
  Users,
  PenLine,
  Sparkles,
  Code2,
  Blocks,
  Eye,
  Mail,
  Lock,
} from "lucide-react";
import EmailPreview from "./EmailPreview";
import VariableFields from "./VariableFields";
import TabLoader from "../TabLoader";
import SAErrorState from "../../SuperAdmin/components/SAErrorState";
import { cn } from "../../utils/cn";
import toast from "react-hot-toast";

/**
 * Send an email by hand.
 *
 * The console could already say what an email *would* look like; it could not
 * make one happen. Every one of the 43 templates waited on the event that
 * normally triggers it, so a receipt that bounced, a volunteer who applied over
 * the phone, or a partner pack for an address that never went through the form
 * had no route out of this product at all.
 *
 * Two things it is, and one it deliberately isn't:
 *
 *   A dispatcher for the catalogue. Pick an email, fill in the variables it
 *   declares, attach a file, choose who gets it, send. It goes down exactly the
 *   path the automatic send uses — same resolution, same layout, same SMTP
 *   identity, same log row — so what arrives is the real email, not a facsimile.
 *
 *   A composer for everything else. `templateKey: null` opens the same envelope
 *   around a subject and a message you write here. It still wears the branded
 *   layout and still lands in the send log, because "a note we sent by hand" is
 *   the hardest thing to find later if it went out some other way.
 *
 *   NOT a mailing list. The server caps a send at 25 addresses. Newsletter
 *   campaigns already do audiences, unsubscribe headers, per-recipient retries
 *   and progress — none of which is here, and all of which a broadcast needs.
 *
 * ── Why this is a page and not a modal ────────────────────────────────────
 * It is the same job as the editor beside it, at the same size: a long form on
 * the left, checked against a live render on the right. A dialog gave the
 * preview a third of a viewport and put the recipient field, the variables and
 * the attachments in the same scroller, so the thing you are approving was
 * never on screen with the thing you were typing. As a route it also survives a
 * refresh and can be linked to — and, as in the editor, the preview pins beside
 * the form from `xl` up and becomes a tab below it.
 *
 * The preview renders the values actually typed, with no sample fallback: a
 * preview that quietly filled the blanks would be showing an email that is not
 * the one about to be sent, which is the most expensive way this screen could
 * be wrong.
 */

/* Mirrors middleware/emailAttachments.js. Duplicated rather than fetched: these
   are the numbers a caption has to state before a file is chosen. */
const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const MAX_RECIPIENTS = 25;

const PREVIEW_DEBOUNCE_MS = 500;

const card =
  "rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-[var(--admin-card)]";
const labelCls =
  "mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400";
const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5 dark:text-white/85";

const EMAIL_RE = /^[^\s@,;<>()]+@[^\s@,;<>()]+\.[a-z]{2,}$/i;

const PANES = [
  { key: "compose", label: "Compose", icon: PenLine },
  { key: "preview", label: "Preview", icon: Eye },
];

/** Split a typed recipient field the way people actually paste addresses. */
const splitAddresses = (raw) =>
  String(raw || "")
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

const prettyBytes = (n) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`;

/** Stable-enough identity for the preview debounce. */
const sig = (v) => JSON.stringify(v ?? null);

export default function SendEmailPage({
  service,
  templateKey = null,
  onBack,
  backLabel = "All emails",
  onSent,
}) {
  const custom = !templateKey;

  const [meta, setMeta] = useState(null); // catalogue detail, template mode only
  const [loading, setLoading] = useState(!custom);
  const [loadError, setLoadError] = useState("");
  const [reloadNonce, setReloadNonce] = useState(0);

  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [values, setValues] = useState({});
  const [files, setFiles] = useState([]);
  const [force, setForce] = useState(false);
  // The list row knows the EFFECTIVE switch (tenant AND platform layer); the
  // detail document only carries this layer's own row, so a tenant looking at
  // an email the platform switched off sees `current: null` and no warning.
  // Rather than reconstruct that here, the server's 409 turns the override on.
  const [offDetected, setOffDetected] = useState(false);

  // Free-form composition. `mode` maps 1:1 onto the server's blocks|html.
  const [mode, setMode] = useState("blocks");
  const [subject, setSubject] = useState("");
  const [heading, setHeading] = useState("");
  const [eyebrow, setEyebrow] = useState("");
  const [message, setMessage] = useState("");
  const [btnLabel, setBtnLabel] = useState("");
  const [btnUrl, setBtnUrl] = useState("");
  const [signOff, setSignOff] = useState(true);
  const [rawHtml, setRawHtml] = useState("");

  const [preview, setPreview] = useState({ html: "", subject: "", text: "" });
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState(null);

  // Which pane is visible below xl. Above it, both are.
  const [pane, setPane] = useState("compose");

  /* ── load the catalogue entry ─────────────────────────────────────────── */

  useEffect(() => {
    if (custom) return undefined;
    const ac = new AbortController();
    setLoading(true);
    setLoadError("");
    service
      .get(templateKey, { signal: ac.signal })
      .then((res) => {
        setMeta(res);
        setLoading(false);
      })
      .catch((err) => {
        if (ac.signal.aborted) return;
        setLoadError(err?.response?.data?.error || "Couldn't load this email");
        setLoading(false);
      });
    return () => ac.abort();
  }, [custom, service, templateKey, reloadNonce]);

  /* ── the free-form body, as the server's block document ───────────────── */

  const customBody = useMemo(() => {
    if (!custom) return null;
    const blocks = [];
    let n = 0;
    const id = () => `c${(n += 1)}`;

    if (heading.trim()) {
      blocks.push({
        id: id(),
        type: "heading",
        level: 2,
        text: heading.trim(),
        ...(eyebrow.trim() ? { eyebrow: eyebrow.trim() } : {}),
      });
    }
    // A blank line is how people separate paragraphs when they write; treating
    // it as one is the difference between an email and a wall of text.
    for (const para of message.split(/\n{2,}/)) {
      const text = para.trim();
      if (text) blocks.push({ id: id(), type: "paragraph", text });
    }
    if (btnLabel.trim() && btnUrl.trim()) {
      blocks.push({ id: id(), type: "button", label: btnLabel.trim(), url: btnUrl.trim(), align: "center" });
    }
    if (signOff) {
      blocks.push({ id: id(), type: "signature", note: "With thanks,", name: "{{org.name}}" });
    }

    // `written` excludes the sign-off, which is appended for you. Counting it as
    // content would let "Add some content" pass on an email whose entire body is
    // "With thanks, Hope Trust".
    const written = mode === "html" ? !!rawHtml.trim() : blocks.some((b) => b.type !== "signature");

    return { subject: subject.trim(), mode, blocks, html: rawHtml, written };
  }, [custom, subject, mode, heading, eyebrow, message, btnLabel, btnUrl, signOff, rawHtml]);

  /* ── live preview ─────────────────────────────────────────────────────── */

  // Signature rather than the objects themselves: `values` and `customBody` are
  // rebuilt on every keystroke, so an effect keyed on them would refire even
  // when nothing about the render changed.
  const previewKey = custom ? sig(customBody) : sig(values);
  const firstPreview = useRef(true);

  useEffect(() => {
    if (loading || loadError) return undefined;
    if (custom && !customBody.subject && !customBody.written) {
      setPreview({ html: "", subject: "", text: "" });
      return undefined;
    }

    const ac = new AbortController();
    // The very first render shouldn't sit behind half a second of nothing.
    const delay = firstPreview.current ? 0 : PREVIEW_DEBOUNCE_MS;
    firstPreview.current = false;

    const timer = setTimeout(() => {
      setPreviewLoading(true);
      const req = custom
        ? service.previewCustom(customBody, { signal: ac.signal })
        : service.preview(templateKey, undefined, { data: values, signal: ac.signal });

      req
        .then((res) => {
          setPreview(res);
          setPreviewError("");
        })
        .catch((err) => {
          if (ac.signal.aborted || err?.code === "ERR_CANCELED") return;
          setPreviewError(err?.response?.data?.error || "Couldn't render the preview");
        })
        .finally(() => {
          if (!ac.signal.aborted) setPreviewLoading(false);
        });
    }, delay);

    return () => {
      clearTimeout(timer);
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey, loading, loadError, custom, service, templateKey]);

  /* ── attachments ──────────────────────────────────────────────────────── */

  const addFiles = useCallback((picked) => {
    const incoming = Array.from(picked || []);
    if (!incoming.length) return;

    setFiles((prev) => {
      const next = [...prev];
      for (const f of incoming) {
        if (next.length >= MAX_FILES) {
          toast.error(`You can attach at most ${MAX_FILES} files.`);
          break;
        }
        if (f.size > MAX_FILE_BYTES) {
          toast.error(`"${f.name}" is ${prettyBytes(f.size)} — the limit is 10MB per file.`);
          continue;
        }
        // Same name AND same size is the same file picked twice, which is the
        // usual result of reopening the picker rather than a deliberate act.
        if (next.some((x) => x.name === f.name && x.size === f.size)) continue;
        next.push(f);
      }
      const total = next.reduce((sum, f) => sum + f.size, 0);
      if (total > MAX_TOTAL_BYTES) {
        toast.error(`Attachments come to ${prettyBytes(total)} — the limit is 20MB in total.`);
        return prev;
      }
      return next;
    });
  }, []);

  const removeFile = (i) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  /* ── validation ───────────────────────────────────────────────────────── */

  const recipients = useMemo(() => splitAddresses(to), [to]);
  const badAddress = useMemo(
    () => [...recipients, ...splitAddresses(cc)].find((a) => !EMAIL_RE.test(a)) || "",
    [recipients, cc],
  );

  const disabledTemplate = !custom && (meta?.current?.enabled === false || offDetected);

  const problem = useMemo(() => {
    if (!recipients.length) return "Add at least one recipient.";
    if (badAddress) return `"${badAddress}" doesn't look like an email address.`;
    if (recipients.length > MAX_RECIPIENTS) {
      return `${recipients.length} recipients — the limit is ${MAX_RECIPIENTS}. Use a newsletter campaign for a larger send.`;
    }
    if (replyTo.trim() && !EMAIL_RE.test(replyTo.trim())) return "That reply-to address isn't valid.";
    if (custom) {
      if (!customBody.subject) return "Add a subject.";
      if (!customBody.written) return "Add some content to the message.";
    }
    if (disabledTemplate && !force) return "This email is switched off. Tick “send anyway” to override.";
    return "";
  }, [recipients, badAddress, replyTo, custom, customBody, disabledTemplate, force]);

  /* ── send ─────────────────────────────────────────────────────────────── */

  const send = useCallback(async () => {
    if (problem || sending) return;
    setSending(true);
    try {
      const envelope = {
        to: recipients.join(", "),
        cc: splitAddresses(cc).join(", "),
        replyTo: replyTo.trim(),
        files,
      };
      const res = custom
        ? await service.sendCustom({
            ...envelope,
            subject: customBody.subject,
            mode: customBody.mode,
            blocks: customBody.blocks,
            html: customBody.html,
          })
        : await service.sendManual(templateKey, {
            ...envelope,
            data: values,
            force: force ? "1" : "",
          });

      toast.success(res.message || "Sent");
      // The page stays put and reports what happened rather than snapping back
      // to the list: after a send the question is "did that go?", and an
      // instant navigation answers it with a view of something else.
      setSentTo(res.to || recipients);
      setConfirming(false);
      onSent?.(res);
    } catch (err) {
      const data = err?.response?.data;
      // Reveal the override rather than just reporting the refusal — the
      // operator asked for this email by name and the next thing they need is
      // the checkbox, not a second attempt that fails the same way.
      if (data?.reason === "template_disabled") setOffDetected(true);
      toast.error(data?.detail ? `${data.error} (${data.detail})` : data?.error || "Couldn't send the email");
      setConfirming(false);
    } finally {
      setSending(false);
    }
  }, [
    problem, sending, recipients, cc, replyTo, files, custom, service, customBody,
    templateKey, values, force, onSent,
  ]);

  /* ── chrome ───────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!confirming) return undefined;
    // Escape backs out of the confirmation. It does NOT leave the page: the
    // half-typed email behind it is the expensive thing to lose.
    const onKey = (e) => e.key === "Escape" && setConfirming(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirming]);

  // A composed email that hasn't been sent is unrecoverable — attachments are
  // held in memory and nothing here is drafted server-side.
  const dirty = !sentTo && (recipients.length > 0 || files.length > 0 ||
    (custom ? !!customBody?.subject || !!customBody?.written : Object.keys(values).length > 0));

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const leave = useCallback(() => {
    if (dirty && !window.confirm("This email hasn't been sent. Leave and lose it?")) return;
    onBack?.();
  }, [dirty, onBack]);

  /* ── render ───────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <TabLoader label="Loading email" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <BackLink onClick={onBack} label={backLabel} />
        <SAErrorState message={loadError} onRetry={() => setReloadNonce((n) => n + 1)} />
      </div>
    );
  }

  const t = meta?.template;
  const paneCls = (key, shown = "block", xlDisplay = "xl:block") =>
    cn(pane === key ? shown : "hidden", xlDisplay);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {/* ── header ── */}
      <div className="mb-4">
        <BackLink onClick={leave} label={backLabel} />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl dark:text-white/90">
              {custom ? "Compose an email" : t?.label}
            </h1>
            {!custom && t?.required && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-white/10 dark:text-white/50">
                <Lock className="h-2.5 w-2.5" /> Always on
              </span>
            )}
            {!custom && t?.audience && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-white/10 dark:text-white/50">
                Normally to: {t.audience}
              </span>
            )}
          </div>
          <p className="mt-1.5 max-w-2xl text-sm text-gray-500 dark:text-white/55">
            {custom
              ? "A one-off email in your branding. It goes out through the same mail settings as everything else and lands in the send log."
              : t?.description}
          </p>
          {!custom && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-500 dark:text-white/50">
              <Send className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span>
                Sending this by hand uses the saved template — the same one the system sends
                automatically.
              </span>
              <span className="font-mono text-[10px] text-gray-300 dark:text-white/25">
                · {templateKey}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── sticky action bar ──
          The pane tabs and the send button share one strip, so both stay
          reachable from anywhere down a long form. */}
      <div
        className="sticky top-16 z-20 -mx-2 mb-4 flex flex-wrap items-center gap-2 px-2 py-2"
        style={{ backgroundColor: "var(--tenant-bg, #fff)" }}
      >
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5 xl:hidden dark:border-white/10">
          {PANES.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPane(p.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                pane === p.key
                  ? "bg-accent/10 text-accent"
                  : "text-gray-500 hover:text-gray-800 dark:text-white/45 dark:hover:text-white/80",
              )}
            >
              <p.icon className="h-3.5 w-3.5" />
              {p.label}
            </button>
          ))}
        </div>

        <span
          className={cn(
            "hidden min-w-0 items-center gap-1.5 text-[11px] xl:inline-flex",
            problem ? "text-amber-600 dark:text-amber-400" : "text-gray-400",
          )}
        >
          <span
            className={cn("h-1.5 w-1.5 shrink-0 rounded-full", problem ? "bg-amber-500" : "bg-emerald-500")}
          />
          <span className="truncate">{problem || "Ready to send"}</span>
        </span>

        <div className="ml-auto flex items-center gap-2">
          {confirming ? (
            <>
              <span className="hidden max-w-sm text-[11px] leading-snug text-gray-600 sm:inline dark:text-white/70">
                This sends a real email now to{" "}
                {recipients.length === 1 ? recipients[0] : `${recipients.length} people`}
                {files.length > 0 && ` with ${files.length} attachment${files.length === 1 ? "" : "s"}`}.
              </span>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={sending}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 disabled:opacity-50 dark:border-white/10 dark:text-white/65"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={send}
                disabled={sending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white transition-opacity disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {sending ? "Sending…" : "Send now"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={!!problem}
              title={problem || "Review, then send"}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white transition-opacity disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              {recipients.length > 1 ? `Send to ${recipients.length} people` : "Send"}
            </button>
          )}
        </div>
      </div>

      {sentTo && (
        <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-[12px] text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/5 dark:text-emerald-300">
          <Mail className="h-3.5 w-3.5 shrink-0" />
          <span>
            <strong className="font-semibold">Sent</strong> to {sentTo.join(", ")}. It’s in the send
            log, filed under “Sent by hand”.
          </span>
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="ml-auto font-medium underline-offset-2 hover:underline"
          >
            Send another
          </button>
        </div>
      )}

      {/* ── workspace ── */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,440px)] xl:items-start 2xl:grid-cols-[minmax(0,1.25fr)_minmax(0,500px)]">
        {/* compose */}
        <div className={cn(paneCls("compose"), "space-y-4")}>
          <section className={cn(card, "p-4")}>
            <div>
              <label className={labelCls} htmlFor="send-to">
                To
              </label>
              <textarea
                id="send-to"
                rows={2}
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="sarah@example.com, dan@example.com"
                className={inputCls}
              />
              <p className="mt-1 flex items-center gap-1 text-[10px] text-gray-400">
                <Users className="h-3 w-3" />
                {recipients.length
                  ? `${recipients.length} recipient${recipients.length === 1 ? "" : "s"} · limit ${MAX_RECIPIENTS}`
                  : `Separate addresses with commas. Up to ${MAX_RECIPIENTS} — use a newsletter campaign for more.`}
              </p>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="send-cc">
                  Cc <span className="normal-case tracking-normal">(optional)</span>
                </label>
                <input id="send-cc" value={cc} onChange={(e) => setCc(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="send-reply">
                  Reply to <span className="normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  id="send-reply"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  placeholder="Defaults to your organisation's address"
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          {custom ? (
            <CustomComposer
              {...{
                mode, setMode, subject, setSubject, eyebrow, setEyebrow, heading, setHeading,
                message, setMessage, btnLabel, setBtnLabel, btnUrl, setBtnUrl,
                signOff, setSignOff, rawHtml, setRawHtml,
              }}
            />
          ) : (
            <section className={cn(card, "overflow-hidden")}>
              <div className="border-b border-gray-100 px-4 py-2.5 dark:border-white/10">
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400">
                  What this email says
                </span>
              </div>
              <div className="p-4">
                <VariableFields
                  variables={meta?.variables || []}
                  values={values}
                  onChange={setValues}
                  disabled={sending}
                />
              </div>
            </section>
          )}

          <section className={cn(card, "overflow-hidden")}>
            <div className="border-b border-gray-100 px-4 py-2.5 dark:border-white/10">
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400">
                Attachments
              </span>
            </div>
            <div className="p-4">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-200 px-3 py-5 text-xs text-gray-500 transition-colors hover:border-accent hover:text-accent dark:border-white/15 dark:text-white/50">
                <Paperclip className="h-3.5 w-3.5" />
                Choose files
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    // Reset, or picking the same file twice in a row is a no-op.
                    e.target.value = "";
                  }}
                />
              </label>
              <p className="mt-1.5 text-[10px] leading-relaxed text-gray-400">
                Up to {MAX_FILES} files, 10MB each and 20MB in total. PDFs, images, Office documents,
                CSV and text. Files are attached and then discarded — they aren’t stored, so the send
                log can’t offer them back later.
              </p>

              {files.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {files.map((f, i) => (
                    <li
                      key={`${f.name}-${f.size}`}
                      className="flex items-center gap-2 rounded-lg border border-gray-100 px-2.5 py-1.5 dark:border-white/10"
                    >
                      <Paperclip className="h-3 w-3 shrink-0 text-gray-400" />
                      <span className="min-w-0 flex-1 truncate text-[11px] text-gray-700 dark:text-white/75">
                        {f.name}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-gray-400">
                        {prettyBytes(f.size)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        aria-label={`Remove ${f.name}`}
                        className="shrink-0 rounded p-1 text-gray-300 transition-colors hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {disabledTemplate && (
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 dark:border-amber-500/25 dark:bg-amber-500/5">
              <input
                type="checkbox"
                checked={force}
                onChange={(e) => setForce(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-300 text-accent focus:ring-accent"
              />
              <span className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300/90">
                <strong className="font-semibold">This email is switched off.</strong> The system
                won’t send it automatically. Send it anyway, just this once — the switch stays off.
              </span>
            </label>
          )}
        </div>

        {/* preview — pinned beside the form from xl up, a tab below it */}
        <div className="contents xl:sticky xl:top-[7.5rem] xl:flex xl:h-[calc(100vh-8.5rem)] xl:flex-col">
          <div
            className={cn(
              paneCls("preview", "flex", "xl:flex"),
              card,
              "min-h-[65vh] flex-col p-3 sm:p-4 xl:min-h-0 xl:flex-1",
            )}
          >
            <EmailPreview
              html={preview.html}
              subject={preview.subject}
              text={preview.text}
              loading={previewLoading}
              error={previewError}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BackLink({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-accent"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

/* -- free-form composition ------------------------------------------------- */

/**
 * Subject and body for an email that isn't in the catalogue.
 *
 * "Simple" is not a reduced block builder — it is a heading, some paragraphs
 * and at most one button, which is the shape of essentially every one-off email
 * anyone actually sends. The full builder lives in the editor, where the job is
 * authoring a template that will go out thousands of times; here the job is
 * writing one message and sending it.
 *
 * HTML mode is the same escape hatch the template editor offers, and the same
 * warning applies: mail clients ignore <style> and don't do flexbox.
 */
function CustomComposer({
  mode, setMode, subject, setSubject, eyebrow, setEyebrow, heading, setHeading,
  message, setMessage, btnLabel, setBtnLabel, btnUrl, setBtnUrl, signOff, setSignOff,
  rawHtml, setRawHtml,
}) {
  return (
    <section className={cn(card, "overflow-hidden")}>
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-2.5 dark:border-white/10">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400">
          Message
        </span>
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-white/5">
          {[
            ["blocks", "Simple", Blocks],
            ["html", "HTML", Code2],
          ].map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                mode === key
                  ? "bg-white text-gray-800 shadow-sm dark:bg-white/10 dark:text-white/90"
                  : "text-gray-500 hover:text-gray-800 dark:text-white/45",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <label className={labelCls} htmlFor="cx-subject">
            Subject
          </label>
          <input
            id="cx-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="A quick update from {{org.name}}"
            className={inputCls}
          />
        </div>

        {mode === "blocks" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,150px)_minmax(0,1fr)]">
              <div>
                <label className={labelCls} htmlFor="cx-eyebrow">
                  Eyebrow
                </label>
                <input
                  id="cx-eyebrow"
                  value={eyebrow}
                  onChange={(e) => setEyebrow(e.target.value)}
                  placeholder="A NOTE"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="cx-heading">
                  Heading
                </label>
                <input
                  id="cx-heading"
                  value={heading}
                  onChange={(e) => setHeading(e.target.value)}
                  placeholder="Thank you, {{recipient.firstName}}"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls} htmlFor="cx-message">
                Message
              </label>
              <textarea
                id="cx-message"
                rows={10}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={"Write the email here.\n\nLeave a blank line between paragraphs."}
                className={inputCls}
              />
              <p className="mt-1 flex items-center gap-1 text-[10px] text-gray-400">
                <PenLine className="h-3 w-3" />
                Blank lines become paragraphs. <code className="font-mono">{"{{org.name}}"}</code> and
                the other variables work here too.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="cx-btn-label">
                  Button label <span className="normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  id="cx-btn-label"
                  value={btnLabel}
                  onChange={(e) => setBtnLabel(e.target.value)}
                  placeholder="View your donations"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="cx-btn-url">
                  Button link
                </label>
                <input
                  id="cx-btn-url"
                  value={btnUrl}
                  onChange={(e) => setBtnUrl(e.target.value)}
                  placeholder="https://…"
                  className={inputCls}
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={signOff}
                onChange={(e) => setSignOff(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent dark:border-white/20 dark:bg-white/5"
              />
              <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-white/70">
                <Sparkles className="h-3 w-3 text-gray-400" />
                End with a sign-off from your organisation
              </span>
            </label>
          </>
        ) : (
          <div>
            <label className={labelCls} htmlFor="cx-html">
              HTML body
            </label>
            <p className="mb-2 text-[11px] leading-relaxed text-gray-400">
              Your header, footer and branding still wrap this. Use table-based, inline-styled markup
              — mail clients ignore <code className="font-mono">&lt;style&gt;</code> and don’t support
              flexbox.
            </p>
            <textarea
              id="cx-html"
              rows={16}
              value={rawHtml}
              onChange={(e) => setRawHtml(e.target.value)}
              placeholder="<p>Hi {{recipient.firstName}},</p>"
              className={cn(inputCls, "font-mono text-xs")}
            />
          </div>
        )}
      </div>
    </section>
  );
}
