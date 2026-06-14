import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Loader2, CheckCircle2, Trash2, Eye, EyeOff, Plug, ExternalLink, Copy } from "lucide-react";
import paypalService from "../../services/paypal.service";
import { useTenant } from "../../context/TenantContext";
import { cn } from "../../utils/cn";

const labelCls = "mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500";
const inputCls =
  "w-full border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-accent focus:bg-white";

// PayPal "logo" wordmark in brand blue.
function PaypalMark() {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#003087]/10 text-[#003087]">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M7.4 21.5H4.3c-.3 0-.5-.3-.4-.6L6.6 3.3c.1-.4.4-.6.8-.6h6.3c2.8 0 4.7 1.4 4.3 4.3-.5 3.4-3 4.9-6 4.9H9.8c-.4 0-.7.3-.8.6l-1 6.9c0 .3-.3.6-.6.6z" />
      </svg>
    </span>
  );
}

function Switch({ checked, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={onChange} className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors", checked ? "bg-accent" : "bg-gray-300")}>
      <span className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform" style={{ transform: checked ? "translateX(18px)" : "translateX(2px)" }} />
    </button>
  );
}

const sync = (d) => ({ mode: d.mode || "sandbox", clientId: d.clientId || "", clientSecret: "", webhookId: d.webhookId || "" });

export default function PaypalSettings() {
  const { slug } = useTenant();
  const cached = paypalService.getCachedConfig();
  const [cfg, setCfg] = useState(cached || null);
  const [loading, setLoading] = useState(!cached);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [form, setForm] = useState(cached ? sync(cached) : sync({}));

  useEffect(() => {
    if (!cached) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const d = await paypalService.getConfig();
      setCfg(d);
      setForm(sync(d));
    } catch {
      toast.error("Failed to load PayPal settings");
    } finally {
      setLoading(false);
    }
  };

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await paypalService.updateConfig({
        mode: form.mode,
        clientId: form.clientId,
        clientSecret: form.clientSecret || undefined,
        webhookId: form.webhookId,
      });
      setCfg(res.data.config);
      setForm((f) => ({ ...f, clientSecret: "" }));
      toast.success("PayPal settings saved");
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      const res = await paypalService.testConnection({ mode: form.mode, clientId: form.clientId, clientSecret: form.clientSecret || undefined });
      if (res.data?.ok) {
        toast.success(`Connected to PayPal (${res.data.mode})`);
        setCfg((c) => ({ ...(c || {}), accountLabel: res.data.accountLabel, lastVerifiedAt: new Date().toISOString() }));
      }
    } catch (e) {
      toast.error(e.response?.data?.error || "Could not authenticate with PayPal");
    } finally {
      setTesting(false);
    }
  };

  const toggleEnabled = async () => {
    setToggling(true);
    try {
      const res = await paypalService.updateConfig({ enabled: !cfg.enabled });
      setCfg(res.data.config);
      toast.success(res.data.config.enabled ? "PayPal is now live for donors" : "PayPal turned off");
    } catch (e) {
      toast.error(e.response?.data?.error || "Couldn't change the status");
    } finally {
      setToggling(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm("Remove your PayPal credentials and turn it off?")) return;
    try {
      await paypalService.clearConfig();
      const d = await paypalService.getConfig({ force: true });
      setCfg(d);
      setForm(sync(d));
      toast.success("PayPal settings cleared");
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
  const configured = !!cfg?.hasClientSecret;
  const rootDomain = import.meta.env.VITE_ROOT_DOMAIN || "yourdomain.com";
  const webhookUrl = `${import.meta.env.VITE_API_BASE_URL || ""}/api/webhooks/paypal/${slug || "<slug>"}`;

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-100 pb-5">
        <PaypalMark />
        <div>
          <h2 className="text-lg font-semibold text-primary">PayPal</h2>
          <p className="mt-0.5 text-sm text-text-muted">
            Connect your own PayPal app so PayPal donations land directly in your account. Your client secret is encrypted and never shown again after saving.
          </p>
        </div>
      </div>

      {/* Status */}
      <div className={cn("flex flex-wrap items-center justify-between gap-3 border p-4", enabled ? "border-green-200 bg-green-50/60" : configured ? "border-amber-200 bg-amber-50/60" : "border-gray-100 bg-gray-50/60")}>
        <div className="flex items-center gap-3">
          <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", enabled ? "bg-green-100 text-green-600" : configured ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-400")}>
            {enabled ? <CheckCircle2 className="h-5 w-5" /> : <Plug className="h-5 w-5" />}
          </span>
          <div className="text-sm">
            {enabled ? (
              <>
                <p className="font-semibold text-primary">Live — donors can pay with PayPal</p>
                <p className="text-text-muted">{cfg.accountLabel || `PayPal (${cfg.mode})`}{cfg.lastVerifiedAt ? ` · verified ${new Date(cfg.lastVerifiedAt).toLocaleDateString()}` : ""}</p>
              </>
            ) : configured ? (
              <>
                <p className="font-semibold text-primary">Configured — not live yet</p>
                <p className="text-text-muted">Turn it on to show the PayPal button at checkout.</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-primary">Not connected</p>
                <p className="text-text-muted">Add your PayPal app credentials below.</p>
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

      {/* Form */}
      <div className="space-y-5 border border-gray-100 bg-white p-5 shadow-sm">
        <div>
          <label className={labelCls}>Environment</label>
          <div className="inline-flex border border-gray-200">
            {["sandbox", "live"].map((m) => (
              <button key={m} type="button" onClick={() => set("mode", m)} className={cn("px-4 py-2 text-sm font-medium capitalize transition-colors", form.mode === m ? "bg-accent text-white" : "text-text-muted hover:bg-gray-50")}>
                {m}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-text-muted">Use <span className="font-medium">Sandbox</span> to test, <span className="font-medium">Live</span> to accept real donations.</p>
        </div>

        <div>
          <label className={labelCls}>Client ID</label>
          <input value={form.clientId} onChange={(e) => set("clientId", e.target.value)} placeholder="From your PayPal app credentials" autoComplete="off" className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Client secret {cfg?.hasClientSecret ? <span className="ml-1 text-[9px] normal-case tracking-normal text-green-600">saved · leave blank to keep</span> : null}</label>
          <div className="flex items-center border border-gray-200 bg-gray-50 px-3 transition-colors focus-within:border-accent focus-within:bg-white">
            <input type={showSecret ? "text" : "password"} value={form.clientSecret} onChange={(e) => set("clientSecret", e.target.value)} placeholder={cfg?.hasClientSecret ? "••••••••" : "Client secret"} autoComplete="new-password" className="w-full bg-transparent py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400" />
            <button type="button" onClick={() => setShowSecret((s) => !s)} className="text-gray-400 hover:text-gray-600">{showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
          </div>
        </div>

        <div>
          <label className={labelCls}>Webhook ID <span className="normal-case tracking-normal text-gray-400">(optional)</span></label>
          <input value={form.webhookId} onChange={(e) => set("webhookId", e.target.value)} placeholder="For verifying webhook events" className={inputCls} />
          <div className="mt-2 flex items-center gap-2 border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-text-muted">
            <span className="shrink-0 font-medium text-gray-500">Webhook URL:</span>
            <code className="truncate font-mono text-[11px] text-gray-700">{webhookUrl}</code>
            <button type="button" onClick={() => { navigator.clipboard?.writeText(webhookUrl); toast.success("Copied"); }} className="ml-auto shrink-0 text-gray-400 hover:text-accent" title="Copy">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Save
          </button>
          <button onClick={test} disabled={testing} className="inline-flex items-center gap-2 border border-gray-200 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:border-accent hover:text-accent disabled:opacity-50">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />} Test connection
          </button>
          {configured && (
            <button onClick={disconnect} className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50">
              <Trash2 className="h-4 w-4" /> Disconnect
            </button>
          )}
        </div>
      </div>

      <div className="flex items-start gap-3 border border-accent/15 bg-accent/5 p-4 text-sm text-text-muted">
        <Plug className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <p>
          Create an app at{" "}
          <a href="https://developer.paypal.com/dashboard/applications" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-accent hover:underline">
            developer.paypal.com <ExternalLink className="h-3 w-3" />
          </a>{" "}
          to get your Client ID & Secret. Until you turn this on, the PayPal button stays hidden at checkout.
        </p>
      </div>
    </div>
  );
}
