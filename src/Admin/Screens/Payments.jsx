import React, { useEffect, useState } from "react";
import {
  CreditCard,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Trash2,
  PlugZap,
} from "lucide-react";
import toast from "react-hot-toast";
import paymentService from "../../services/payment.service";
import { useTenant } from "../../context/TenantContext";
import { TabLoader } from "../../components/TabLoader";
import { withMinDelay } from "../../utils/minDelay";

export default function Payments() {
  const { slug } = useTenant();
  const webhookUrl = `${import.meta.env.VITE_API_BASE_URL}/api/webhooks/stripe/${slug || ""}`;
  // If the config is already cached (e.g. from an earlier visit), start from it
  // instantly — the loader only shows on the very first, uncached open.
  const cachedConfig = paymentService.getCachedConfig();
  const [config, setConfig] = useState(cachedConfig);
  const [loading, setLoading] = useState(!cachedConfig);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Editable fields. Secret fields are write-only — blank means "leave unchanged".
  const [publishableKey, setPublishableKey] = useState(cachedConfig?.publishableKey || "");
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  const load = async ({ force = false } = {}) => {
    setLoading(true);
    try {
      const data = await withMinDelay(paymentService.getConfig({ force }));
      setConfig(data);
      setPublishableKey(data.publishableKey || "");
    } catch {
      toast.error("Failed to load payment settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only hit the API when we don't already have the config cached.
    if (!paymentService.getCachedConfig()) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await paymentService.updateConfig({
        publishableKey,
        secretKey: secretKey || undefined,
        webhookSecret: webhookSecret || undefined,
      });
      setConfig(res.data.config);
      setSecretKey("");
      setWebhookSecret("");
      toast.success("Saved");
    } catch (e) {
      toast.error(e.response?.data?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      const res = await paymentService.testConnection({ secretKey: secretKey || undefined });
      toast.success(`Connected: ${res.data.accountLabel}`);
      load({ force: true });
    } catch (e) {
      toast.error(e.response?.data?.error || "Connection failed");
    } finally {
      setTesting(false);
    }
  };

  const toggleEnabled = async () => {
    try {
      const res = await paymentService.updateConfig({ enabled: !config.enabled });
      setConfig(res.data.config);
      toast.success(res.data.config.enabled ? "Payments enabled" : "Payments disabled");
    } catch (e) {
      toast.error(e.response?.data?.error || "Update failed");
    }
  };

  const clear = async () => {
    if (!window.confirm("Remove your Stripe keys and disable payments?")) return;
    try {
      await paymentService.clearConfig();
      toast.success("Cleared");
      setSecretKey("");
      setWebhookSecret("");
      load({ force: true });
    } catch {
      toast.error("Failed to clear");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <TabLoader />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-primary" /> Payments
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Connect your own Stripe account so donations are collected directly into it. Your secret key is
          encrypted and never shown again after saving.
        </p>
      </div>

      {/* Status banner */}
      <div
        className={`rounded-token border p-4 mb-6 flex items-center gap-3 ${
          config.enabled ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"
        }`}
      >
        {config.enabled ? (
          <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
        ) : (
          <PlugZap className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
        <div className="flex-1 text-sm">
          <div className="font-medium text-gray-800">
            {config.enabled ? "Payments enabled — using your Stripe account" : "Payments not enabled"}
          </div>
          <div className="text-gray-500">
            {config.accountLabel ? `Account: ${config.accountLabel}` : "No account verified yet"}
            {config.lastVerifiedAt
              ? ` · verified ${new Date(config.lastVerifiedAt).toLocaleDateString()}`
              : ""}
          </div>
        </div>
        <button
          onClick={toggleEnabled}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
            config.enabled ? "bg-green-500" : "bg-gray-300"
          }`}
          title={config.enabled ? "Disable payments" : "Enable payments"}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
              config.enabled ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>

      {/* Keys form */}
      <div className="bg-white rounded-token border border-gray-100 shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Publishable key</label>
          <input
            type="text"
            value={publishableKey}
            onChange={(e) => setPublishableKey(e.target.value)}
            placeholder="pk_live_…"
            className="w-full text-sm border border-gray-300 rounded-token-input p-2.5 font-mono focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Secret key {config.hasSecretKey && <CheckCircle2 className="inline w-4 h-4 text-green-500 ml-1" />}
          </label>
          <input
            type="password"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder={config.hasSecretKey ? "•••••••• (saved — leave blank to keep)" : "sk_live_…"}
            className="w-full text-sm border border-gray-300 rounded-token-input p-2.5 font-mono focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Webhook signing secret{" "}
            {config.hasWebhookSecret && <CheckCircle2 className="inline w-4 h-4 text-green-500 ml-1" />}
          </label>
          <input
            type="password"
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            placeholder={config.hasWebhookSecret ? "•••••••• (saved — leave blank to keep)" : "whsec_…"}
            className="w-full text-sm border border-gray-300 rounded-token-input p-2.5 font-mono focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            From your Stripe Dashboard → Developers → Webhooks. Used to verify donation events.
          </p>
        </div>

        {/* Webhook endpoint to register in Stripe */}
        <div className="rounded-token bg-primary/5 border border-primary/10 p-4">
          <p className="text-sm font-medium text-gray-700 mb-1">Your webhook endpoint URL</p>
          <p className="text-xs text-gray-500 mb-2">
            In Stripe → Developers → Webhooks, add an endpoint with this URL, then paste its signing
            secret (whsec_…) above. Recommended events: <code>invoice.payment_succeeded</code>,{" "}
            <code>invoice.payment_failed</code>, <code>customer.subscription.updated</code>,{" "}
            <code>customer.subscription.deleted</code>, <code>payment_intent.succeeded</code>.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white border border-gray-200 rounded-token-input p-2 break-all">
              {webhookUrl}
            </code>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(webhookUrl);
                toast.success("Copied");
              }}
              className="text-xs font-medium text-primary px-3 py-2 hover:bg-primary/10 flex-shrink-0"
            >
              Copy
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 text-sm font-semibold hover:bg-primary-light transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save keys
          </button>
          <button
            onClick={test}
            disabled={testing}
            className="inline-flex items-center gap-2 border border-primary/30 text-primary px-5 py-2.5 text-sm font-semibold hover:bg-primary/5 transition-colors disabled:opacity-60"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlugZap className="w-4 h-4" />}
            Test connection
          </button>
          {(config.hasSecretKey || config.publishableKey) && (
            <button
              onClick={clear}
              className="inline-flex items-center gap-2 text-red-500 px-3 py-2.5 text-sm font-medium hover:bg-red-50 transition-colors ml-auto"
            >
              <Trash2 className="w-4 h-4" /> Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
