import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  Loader2, Mailbox as MailboxIcon, CheckCircle2, Send, Trash2, Eye, EyeOff,
  Zap, Plus, Star, AlertTriangle, Clock, Gauge, X,
} from "lucide-react";
import mailboxService from "../../services/mailbox.service";
import { cn } from "../../utils/cn";

const labelCls = "mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500";
const inputCls =
  "w-full border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-accent focus:bg-white";

const PRESETS = [
  { label: "Gmail", host: "smtp.gmail.com", port: 587, secure: false },
  { label: "Outlook", host: "smtp-mail.outlook.com", port: 587, secure: false },
  { label: "SendGrid", host: "smtp.sendgrid.net", port: 587, secure: false },
  { label: "Mailgun", host: "smtp.mailgun.org", port: 587, secure: false },
  { label: "Zoho", host: "smtp.zoho.com", port: 465, secure: true },
];

function Switch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors", checked ? "bg-accent" : "bg-gray-300")}
    >
      <span className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform" style={{ transform: checked ? "translateX(18px)" : "translateX(2px)" }} />
    </button>
  );
}

const emptyForm = {
  label: "", host: "", port: 587, secure: false, username: "", password: "",
  fromName: "", fromEmail: "", replyTo: "", dailyLimit: 500, hourlyLimit: 20,
};

// Shared connect/edit form. `mode` = "create" | "edit".
function MailboxForm({ mode, initial, onSubmit, onCancel, busy }) {
  const [form, setForm] = useState(initial || emptyForm);
  const [showPass, setShowPass] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const applyPreset = (p) => setForm((f) => ({ ...f, host: p.host, port: p.port, secure: p.secure }));
  const isEdit = mode === "edit";

  return (
    <div className="space-y-5 border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary">{isEdit ? "Edit mailbox" : "Connect a mailbox"}</h3>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
        )}
      </div>

      <div>
        <p className={labelCls}>Quick fill</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" onClick={() => applyPreset(p)} className="inline-flex items-center gap-1.5 border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:border-accent hover:text-accent">
              <Zap className="h-3.5 w-3.5" /> {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-[1fr_auto_auto]">
        <div>
          <label className={labelCls}>SMTP host</label>
          <input value={form.host} onChange={(e) => set("host", e.target.value)} placeholder="smtp.gmail.com" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Port</label>
          <input type="number" value={form.port} onChange={(e) => set("port", e.target.value)} className={cn(inputCls, "w-24")} />
        </div>
        <div>
          <label className={labelCls}>SSL (465)</label>
          <div className="flex h-[42px] items-center"><Switch checked={form.secure} onChange={() => set("secure", !form.secure)} /></div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Username</label>
          <input value={form.username} onChange={(e) => set("username", e.target.value)} placeholder="you@yourdomain.org" autoComplete="off" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>App password {isEdit ? <span className="ml-1 text-[9px] normal-case tracking-normal text-green-600">leave blank to keep</span> : null}</label>
          <div className="flex items-center border border-gray-200 bg-gray-50 px-3 transition-colors focus-within:border-accent focus-within:bg-white">
            <input type={showPass ? "text" : "password"} value={form.password} onChange={(e) => set("password", e.target.value)} placeholder={isEdit ? "••••••••" : "App password or SMTP key"} autoComplete="new-password" className="w-full bg-transparent py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400" />
            <button type="button" onClick={() => setShowPass((s) => !s)} className="text-gray-400 hover:text-gray-600">{showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className={labelCls}>From name</label>
          <input value={form.fromName} onChange={(e) => set("fromName", e.target.value)} placeholder="Your Charity" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>From email</label>
          <input value={form.fromEmail} onChange={(e) => set("fromEmail", e.target.value)} placeholder="news@yourdomain.org" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Reply-to</label>
          <input value={form.replyTo} onChange={(e) => set("replyTo", e.target.value)} placeholder="(optional)" className={inputCls} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Daily limit</label>
          <input type="number" value={form.dailyLimit} onChange={(e) => set("dailyLimit", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Hourly limit</label>
          <input type="number" value={form.hourlyLimit} onChange={(e) => set("hourlyLimit", e.target.value)} className={inputCls} />
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
        <button
          onClick={() => onSubmit(form)}
          disabled={busy}
          className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {isEdit ? "Save changes" : "Verify & connect"}
        </button>
        <p className="text-xs text-text-muted">We test the connection before saving — bad credentials are rejected.</p>
      </div>
    </div>
  );
}

const HEALTH = {
  healthy: { label: "Healthy", cls: "bg-green-100 text-green-700", Icon: CheckCircle2 },
  cooldown: { label: "Cooling down", cls: "bg-amber-100 text-amber-700", Icon: Clock },
  unhealthy: { label: "Needs attention", cls: "bg-red-100 text-red-700", Icon: AlertTriangle },
};

function UsageBar({ used, limit }) {
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
      <div className={cn("h-full rounded-full", pct >= 100 ? "bg-red-400" : pct >= 80 ? "bg-amber-400" : "bg-accent")} style={{ width: `${pct}%` }} />
    </div>
  );
}

function MailboxCard({ box, onChanged }) {
  const [busy, setBusy] = useState("");
  const [editing, setEditing] = useState(false);
  const h = HEALTH[box.healthStatus] || HEALTH.healthy;

  const act = async (key, fn, okMsg) => {
    setBusy(key);
    try {
      await fn();
      if (okMsg) toast.success(okMsg);
      await onChanged();
    } catch (e) {
      toast.error(e.response?.data?.error || "Something went wrong");
    } finally {
      setBusy("");
    }
  };

  const saveEdit = async (form) => {
    await act("edit", async () => {
      await mailboxService.update(box._id, {
        label: form.label,
        host: form.host,
        port: form.port,
        secure: form.secure,
        username: form.username,
        password: form.password || undefined,
        fromName: form.fromName,
        fromEmail: form.fromEmail,
        replyTo: form.replyTo,
        quotaConfig: { dailyLimit: form.dailyLimit, hourlyLimit: form.hourlyLimit },
      });
      setEditing(false);
    }, "Mailbox updated");
  };

  if (editing) {
    return (
      <MailboxForm
        mode="edit"
        busy={busy === "edit"}
        initial={{
          label: box.label || "", host: box.smtp?.host || "", port: box.smtp?.port || 587, secure: !!box.smtp?.secure,
          username: box.smtp?.username || "", password: "", fromName: box.fromName || "", fromEmail: box.fromEmail || "",
          replyTo: box.replyTo || "", dailyLimit: box.quotaConfig?.dailyLimit ?? 500, hourlyLimit: box.quotaConfig?.hourlyLimit ?? 20,
        }}
        onSubmit={saveEdit}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className={cn("border bg-white p-4 shadow-sm", box.isActive ? "border-gray-100" : "border-gray-100 opacity-70")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent"><MailboxIcon className="h-4 w-4" /></span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-primary">
                {box.label || box.smtp?.username}
                {box.isDefault && <span title="Default mailbox" className="inline-flex items-center gap-0.5 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent"><Star className="h-3 w-3 fill-accent" /> Default</span>}
              </p>
              <p className="truncate text-xs text-text-muted">{box.fromEmail || box.smtp?.username} · {box.smtp?.host}</p>
            </div>
          </div>
        </div>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold", h.cls)}>
          <h.Icon className="h-3.5 w-3.5" /> {h.label}
        </span>
      </div>

      {box.lastError && box.healthStatus !== "healthy" && (
        <p className="mt-2 truncate text-xs text-red-500" title={box.lastError}>{box.lastError}</p>
      )}

      {/* Usage */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px] text-text-muted"><span className="inline-flex items-center gap-1"><Gauge className="h-3 w-3" /> Today</span><span>{box.usage?.sentToday ?? 0} / {box.quotaConfig?.dailyLimit ?? 500}</span></div>
          <UsageBar used={box.usage?.sentToday ?? 0} limit={box.quotaConfig?.dailyLimit ?? 500} />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px] text-text-muted"><span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> This hour</span><span>{box.usage?.sentThisHour ?? 0} / {box.quotaConfig?.hourlyLimit ?? 20}</span></div>
          <UsageBar used={box.usage?.sentThisHour ?? 0} limit={box.quotaConfig?.hourlyLimit ?? 20} />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-primary">
          <Switch checked={box.isActive} onChange={() => act("active", () => mailboxService.update(box._id, { isActive: !box.isActive }))} />
          {box.isActive ? "Active" : "Paused"}
        </label>
        <button onClick={() => act("test", () => mailboxService.test(box._id), "Test email sent")} disabled={busy === "test"} className="inline-flex items-center gap-1.5 border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:border-accent hover:text-accent disabled:opacity-50">
          {busy === "test" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Test
        </button>
        {!box.isDefault && (
          <button onClick={() => act("default", () => mailboxService.setDefault(box._id), "Default mailbox updated")} disabled={busy === "default"} className="inline-flex items-center gap-1.5 border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:border-accent hover:text-accent disabled:opacity-50">
            <Star className="h-3.5 w-3.5" /> Make default
          </button>
        )}
        <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:border-accent hover:text-accent">
          Edit
        </button>
        <button
          onClick={() => { if (window.confirm("Remove this mailbox? Campaigns will no longer send from it.")) act("delete", () => mailboxService.remove(box._id), "Mailbox removed"); }}
          className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> Remove
        </button>
      </div>
    </div>
  );
}

export default function MailboxSettings() {
  const [boxes, setBoxes] = useState(null);
  const [adding, setAdding] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const load = async () => {
    try {
      setBoxes(await mailboxService.list());
    } catch {
      toast.error("Failed to load mailboxes");
      setBoxes([]);
    }
  };

  useEffect(() => { load(); }, []);

  const connect = async (form) => {
    setConnecting(true);
    try {
      await mailboxService.create({
        label: form.label,
        host: form.host,
        port: form.port,
        secure: form.secure,
        username: form.username,
        password: form.password,
        fromName: form.fromName,
        fromEmail: form.fromEmail,
        replyTo: form.replyTo,
        quotaConfig: { dailyLimit: form.dailyLimit, hourlyLimit: form.hourlyLimit },
      });
      toast.success("Mailbox connected");
      setAdding(false);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.error || "Could not connect that mailbox");
    } finally {
      setConnecting(false);
    }
  };

  if (boxes === null) {
    return <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><MailboxIcon className="h-5 w-5" /></span>
          <div>
            <h2 className="text-lg font-semibold text-primary">Sending mailboxes</h2>
            <p className="mt-0.5 max-w-xl text-sm text-text-muted">
              Campaigns send from your own mailboxes (Gmail, Outlook, etc.) so they inherit that provider's reputation. Connect several and we rotate across them to spread the load and stay under each provider's limits.
            </p>
          </div>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 bg-accent px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light">
            <Plus className="h-4 w-4" /> Add mailbox
          </button>
        )}
      </div>

      {adding && <MailboxForm mode="create" busy={connecting} onSubmit={connect} onCancel={() => setAdding(false)} />}

      {boxes.length === 0 && !adding ? (
        <div className="border border-dashed border-gray-200 bg-gray-50/60 p-8 text-center">
          <MailboxIcon className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm font-medium text-primary">No mailboxes connected yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-text-muted">Until you add one, campaigns send from the platform email. Add your own mailbox to send from your domain and improve inbox placement.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {boxes.map((box) => <MailboxCard key={box._id} box={box} onChanged={load} />)}
        </div>
      )}

      <div className="flex items-start gap-3 border border-accent/15 bg-accent/5 p-4 text-sm text-text-muted">
        <MailboxIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <p>
          For the best deliverability, send from an address on a domain you've authenticated with <span className="font-medium text-primary">SPF, DKIM and DMARC</span>. Gmail and Outlook need an <span className="font-medium text-primary">app password</span> (not your login password).
        </p>
      </div>
    </div>
  );
}
