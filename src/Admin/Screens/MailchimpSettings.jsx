import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import {
  Loader2,
  CheckCircle2,
  Link2,
  RefreshCw,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Info,
  Mail,
} from "lucide-react";
import { CustomSelect } from "../../components/CustomSelect";
import { cn } from "../../utils/cn";
import mailchimpService from "../../services/mailchimp.service";

const labelCls = "mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500";
const lineInput =
  "w-full border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-colors focus:border-accent focus:bg-white dark:border-white/10 dark:bg-white/5";

// The deliverability checklist the user asked to be explained, surfaced in-app.
function DeliverabilityNote() {
  return (
    <div className="border border-gray-100 bg-gray-50/70 p-4 text-xs text-text-muted dark:border-white/10 dark:bg-white/5">
      <p className="mb-2 inline-flex items-center gap-1.5 font-semibold text-primary">
        <ShieldCheck className="h-4 w-4 text-accent" /> Land in the inbox, not spam
      </p>
      <p className="mb-2">
        Mailchimp handles sending reputation, bounces and one-click unsubscribe — but inbox placement still depends on
        authenticating <span className="font-medium text-primary">your own sending domain</span>:
      </p>
      <ol className="ml-4 list-decimal space-y-1">
        <li>Use a From address on a real domain you own (e.g. <code>news@yourngo.org</code>) — not gmail/outlook.</li>
        <li>In Mailchimp → <span className="font-medium">Account &amp; billing → Domains</span>, verify &amp; authenticate that domain. Mailchimp gives you <span className="font-medium">CNAME/TXT records (DKIM + SPF)</span> to add to your DNS.</li>
        <li>Add a <span className="font-medium">DMARC</span> TXT record on the domain: <code>v=DMARC1; p=none; rua=mailto:you@yourngo.org</code>.</li>
        <li>Only email people who opted in; Mailchimp auto-removes bounces &amp; unsubscribes.</li>
      </ol>
      <a
        href="https://mailchimp.com/help/verify-a-domain/"
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
      >
        <ExternalLink className="h-3.5 w-3.5" /> Mailchimp domain authentication guide
      </a>
    </div>
  );
}

const MailchimpSettings = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [audiences, setAudiences] = useState([]);

  const [apiKey, setApiKey] = useState("");
  const [connecting, setConnecting] = useState(false);

  const [audienceId, setAudienceId] = useState("");
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const applyStatus = useCallback((s) => {
    setStatus(s);
    setAudiences(s.audiences || []);
    setAudienceId(s.audienceId || "");
    setFromName(s.fromName || "");
    setFromEmail(s.fromEmail || "");
  }, []);

  const load = useCallback(async () => {
    try {
      applyStatus(await mailchimpService.status());
    } catch {
      toast.error("Failed to load Mailchimp settings");
    } finally {
      setLoading(false);
    }
  }, [applyStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const handleConnect = async () => {
    if (!apiKey.trim()) return toast.error("Paste your Mailchimp API key");
    setConnecting(true);
    try {
      await mailchimpService.connect(apiKey.trim());
      setApiKey("");
      toast.success("Mailchimp connected");
      await load();
    } catch (e) {
      toast.error(e.response?.data?.error || "Could not connect");
    } finally {
      setConnecting(false);
    }
  };

  const handleSave = async () => {
    if (!audienceId) return toast.error("Choose an audience");
    if (!/^\S+@\S+\.\S+$/.test(fromEmail)) return toast.error("Enter a valid from email");
    setSaving(true);
    try {
      const audienceName = audiences.find((a) => a.id === audienceId)?.name || "";
      const res = await mailchimpService.configure({ audienceId, audienceName, fromName, fromEmail });
      applyStatus({ ...res.status, audiences });
      toast.success("Delivery settings saved");
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const r = await mailchimpService.sync();
      toast.success(`Synced ${r.total} subscriber${r.total === 1 ? "" : "s"} (${r.created} new, ${r.updated} updated${r.errors ? `, ${r.errors} skipped` : ""})`);
    } catch (e) {
      toast.error(e.response?.data?.error || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await mailchimpService.disconnect();
      toast.success("Mailchimp disconnected");
      await load();
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  const connected = status?.connected;
  const ready = status?.ready;

  // Prefer the server-built URL (uses PUBLIC_API_URL); otherwise build it from
  // the public API base so it's always shown for manual setup in Mailchimp.
  const webhookUrl =
    status?.webhookUrl ||
    (status?.webhookSecret
      ? `${import.meta.env.VITE_API_BASE_URL || ""}/api/newsletter/mailchimp-webhook?org=${status.orgId}&secret=${status.webhookSecret}`
      : "");

  return (
    <div className="max-w-2xl space-y-5">
      {/* Connection state header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border border-gray-100 bg-white p-4 shadow-sm dark:border-white/10">
        <div className="flex items-center gap-3">
          <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", connected ? "bg-green-50 text-green-600 dark:bg-green-500/15" : "bg-gray-100 text-gray-400 dark:bg-white/10")}>
            <Mail className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-primary">
              {connected ? "Mailchimp connected" : "Connect Mailchimp"}
              {ready ? <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-green-600"><CheckCircle2 className="h-3.5 w-3.5" /> ready to send</span> : null}
            </p>
            <p className="text-xs text-text-muted">
              {connected ? status.accountLabel || "Account linked" : "Send campaigns through your own Mailchimp account."}
            </p>
          </div>
        </div>
        {connected ? (
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="inline-flex items-center gap-2 border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5"
          >
            {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Disconnect
          </button>
        ) : null}
      </div>

      {!connected ? (
        <div className="space-y-4 border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10">
          <div>
            <label className={labelCls}>Mailchimp API key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="e.g. 0a1b2c3d4e5f6g7h8i9j-us21"
              className={lineInput}
              autoComplete="off"
            />
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-text-muted">
              <Info className="h-3.5 w-3.5" />
              In Mailchimp: <span className="font-medium">Account → Extras → API keys</span>. The key ends with your datacenter (e.g. <code>-us21</code>).
            </p>
          </div>
          <button
            type="button"
            onClick={handleConnect}
            disabled={connecting}
            className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"
          >
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Connect
          </button>
        </div>
      ) : (
        <div className="space-y-5 border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10">
          <div>
            <label className={labelCls}>Audience</label>
            <CustomSelect
              value={audienceId}
              onChange={setAudienceId}
              options={[
                { value: "", label: "Select an audience…" },
                ...audiences.map((a) => ({ value: a.id, label: `${a.name} (${a.memberCount})` })),
              ]}
              className="w-full"
              triggerClassName="w-full border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/10 dark:bg-[var(--admin-card)]"
            />
            {status?.audienceError ? (
              <p className="mt-1.5 text-xs text-red-500">{status.audienceError}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>From name</label>
              <input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Your organisation" className={lineInput} />
            </div>
            <div>
              <label className={labelCls}>From email (verified)</label>
              <input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="news@yourngo.org" className={lineInput} />
            </div>
          </div>
          <p className="-mt-2 text-xs text-text-muted">
            The from email must be on a domain you've authenticated in Mailchimp (see below) for best inbox placement.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Save settings
            </button>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing || !status?.audienceId}
              title={!status?.audienceId ? "Save an audience first" : "Push your active subscribers into Mailchimp"}
              className="inline-flex items-center gap-2 border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync subscribers
            </button>
          </div>

          <p className="text-xs text-text-muted">
            Once ready, campaigns you send from the <span className="font-medium text-primary">Campaigns</span> tab are
            delivered through Mailchimp to this audience.
          </p>

          {/* Two-way sync — manual webhook setup */}
          <div className="border-t border-gray-100 pt-4 dark:border-white/10">
            <p className="mb-1 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              <RefreshCw className="h-4 w-4 text-accent" /> Two-way sync (webhook)
            </p>
            <p className="text-xs text-text-muted">
              Subscribes, unsubscribes and deletes here push to Mailchimp automatically. To also flow Mailchimp-side
              unsubscribes &amp; cleans back to us, add this webhook in Mailchimp → Audience →{" "}
              <span className="font-medium">Settings → Webhooks</span>:
            </p>
            {webhookUrl ? (
              <>
                <div className="mt-2 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate border border-gray-200 bg-gray-50 px-2 py-1.5 text-[11px] text-gray-600 dark:border-white/10 dark:bg-white/5">
                    {webhookUrl}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(webhookUrl);
                      toast.success("Copied");
                    }}
                    className="shrink-0 border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5"
                  >
                    Copy
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-text-muted">
                  Enable the <span className="font-medium">unsubscribes</span> and <span className="font-medium">cleaned</span> events.
                  The URL must be a public HTTPS address (it won't work from localhost).
                </p>
              </>
            ) : (
              <p className="mt-1.5 text-[11px] text-amber-600">Connect Mailchimp to generate your webhook URL.</p>
            )}
          </div>
        </div>
      )}

      <DeliverabilityNote />
    </div>
  );
};

export default MailchimpSettings;
