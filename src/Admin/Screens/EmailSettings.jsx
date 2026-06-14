import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Loader2, Mail, CheckCircle2, Send, Trash2, Eye, EyeOff, Server, Zap } from "lucide-react";
import emailService from "../../services/email.service";
import { cn } from "../../utils/cn";

const labelCls = "mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500";
const inputCls =
  "w-full border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-accent focus:bg-white";

// Quick-fill presets for common SMTP providers.
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

const syncForm = (d) => ({
  host: d.host || "",
  port: d.port || 587,
  secure: !!d.secure,
  username: d.username || "",
  password: "",
  fromName: d.fromName || "",
  fromEmail: d.fromEmail || "",
  replyTo: d.replyTo || "",
});

export default function EmailSettings() {
  const cached = emailService.getCachedConfig();
  const [cfg, setCfg] = useState(cached || null);
  const [loading, setLoading] = useState(!cached);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState(cached ? syncForm(cached) : syncForm({}));

  useEffect(() => {
    if (!cached) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const d = await emailService.getConfig();
      setCfg(d);
      setForm(syncForm(d));
    } catch {
      toast.error("Failed to load email settings");
    } finally {
      setLoading(false);
    }
  };

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const applyPreset = (p) => setForm((f) => ({ ...f, host: p.host, port: p.port, secure: p.secure }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await emailService.updateConfig({
        host: form.host,
        port: form.port,
        secure: form.secure,
        username: form.username,
        password: form.password || undefined, // blank → keep existing
        fromName: form.fromName,
        fromEmail: form.fromEmail,
        replyTo: form.replyTo,
      });
      setCfg(res.data.config);
      setForm((f) => ({ ...f, password: "" }));
      toast.success("Email settings saved");
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      const res = await emailService.testConnection({
        host: form.host,
        port: form.port,
        secure: form.secure,
        username: form.username,
        password: form.password || undefined,
      });
      if (res.data?.ok) {
        toast.success(res.data.delivered ? `Connected! Test email sent to ${res.data.sentTo}` : "Connected! (couldn't send a test email, but SMTP works)");
        setCfg((c) => ({ ...(c || {}), lastVerifiedAt: new Date().toISOString(), accountLabel: res.data.accountLabel }));
      }
    } catch (e) {
      toast.error(e.response?.data?.error || "Could not connect with those settings");
    } finally {
      setTesting(false);
    }
  };

  const toggleEnabled = async () => {
    setToggling(true);
    try {
      const res = await emailService.updateConfig({ enabled: !cfg.enabled });
      setCfg(res.data.config);
      toast.success(res.data.config.enabled ? "Your email is now active" : "Switched back to the platform email");
    } catch (e) {
      toast.error(e.response?.data?.error || "Couldn't change the status");
    } finally {
      setToggling(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm("Remove your SMTP settings and fall back to the platform email?")) return;
    try {
      await emailService.clearConfig();
      const d = await emailService.getConfig({ force: true });
      setCfg(d);
      setForm(syncForm(d));
      toast.success("Email settings cleared");
    } catch {
      toast.error("Failed to clear settings");
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  const enabled = !!cfg?.enabled;
  const configured = !!cfg?.hasPassword;

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-100 pb-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
          <Mail className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-primary">Email (SMTP)</h2>
          <p className="mt-0.5 text-sm text-text-muted">
            Send receipts, welcome and notification emails from your own mailbox. Your password is encrypted and never shown again after saving.
          </p>
        </div>
      </div>

      {/* Status */}
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 border p-4",
          enabled ? "border-green-200 bg-green-50/60" : configured ? "border-amber-200 bg-amber-50/60" : "border-gray-100 bg-gray-50/60"
        )}
      >
        <div className="flex items-center gap-3">
          <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", enabled ? "bg-green-100 text-green-600" : configured ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-400")}>
            {enabled ? <CheckCircle2 className="h-5 w-5" /> : <Server className="h-5 w-5" />}
          </span>
          <div className="text-sm">
            {enabled ? (
              <>
                <p className="font-semibold text-primary">Active — sending from your SMTP</p>
                <p className="text-text-muted">{cfg.accountLabel || cfg.username}{cfg.lastVerifiedAt ? ` · verified ${new Date(cfg.lastVerifiedAt).toLocaleDateString()}` : ""}</p>
              </>
            ) : configured ? (
              <>
                <p className="font-semibold text-primary">Configured — using platform email</p>
                <p className="text-text-muted">Turn it on to start sending from your own account.</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-primary">Using the platform email</p>
                <p className="text-text-muted">Add your SMTP details below to send from your own mailbox.</p>
              </>
            )}
          </div>
        </div>
        {configured && (
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-primary">
            <Switch checked={enabled} onChange={toggleEnabled} />
            {toggling ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : enabled ? "On" : "Off"}
          </label>
        )}
      </div>

      {/* Presets */}
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

      {/* Form */}
      <div className="space-y-5 border border-gray-100 bg-white p-5 shadow-sm">
        <div className="grid gap-5 sm:grid-cols-[1fr_auto_auto]">
          <div>
            <label className={labelCls}>SMTP host</label>
            <input value={form.host} onChange={(e) => set("host", e.target.value)} placeholder="smtp.yourprovider.com" className={inputCls} />
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
            <label className={labelCls}>Password {cfg?.hasPassword ? <span className="ml-1 text-[9px] normal-case tracking-normal text-green-600">saved · leave blank to keep</span> : null}</label>
            <div className="flex items-center border border-gray-200 bg-gray-50 px-3 transition-colors focus-within:border-accent focus-within:bg-white">
              <input type={showPass ? "text" : "password"} value={form.password} onChange={(e) => set("password", e.target.value)} placeholder={cfg?.hasPassword ? "••••••••" : "App password or SMTP key"} autoComplete="new-password" className="w-full bg-transparent py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400" />
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
            <input value={form.fromEmail} onChange={(e) => set("fromEmail", e.target.value)} placeholder="hello@yourdomain.org" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Reply-to</label>
            <input value={form.replyTo} onChange={(e) => set("replyTo", e.target.value)} placeholder="(optional)" className={inputCls} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Save
          </button>
          <button onClick={test} disabled={testing} className="inline-flex items-center gap-2 border border-gray-200 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:border-accent hover:text-accent disabled:opacity-50">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Test connection
          </button>
          {configured && (
            <button onClick={disconnect} className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50">
              <Trash2 className="h-4 w-4" /> Disconnect
            </button>
          )}
        </div>
      </div>

      <div className="flex items-start gap-3 border border-accent/15 bg-accent/5 p-4 text-sm text-text-muted">
        <Mail className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <p>
          Until you enable your own email, messages keep sending from the platform account — nothing breaks. Tip: Gmail and Outlook need an
          <span className="font-medium text-primary"> app password</span> (not your login password); SendGrid uses the username
          <span className="font-mono text-primary"> apikey</span>.
        </p>
      </div>
    </div>
  );
}
