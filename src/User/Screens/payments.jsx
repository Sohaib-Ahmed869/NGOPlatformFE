import { useState, useEffect } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { CreditCard, Trash2, Plus, Loader2, ShieldCheck, Check, Lock } from "lucide-react";
import { TabLoader } from "../../components/TabLoader";
import PaymentMethodService from "../../services/paymentMethod.service";
import useTenantStripe from "../../hooks/useTenantStripe";
import { PageHeader } from "../../Admin/components/PageHeader";
import { cn } from "../../utils/cn";
import { toast } from "react-hot-toast";

const BRAND_LABEL = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  unionpay: "UnionPay",
};
const brandLabel = (b) => BRAND_LABEL[(b || "").toLowerCase()] || "Card";

function SectionHead({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-100 pb-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center bg-accent/10 text-accent">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <p className="mt-0.5 text-sm text-gray-500">{desc}</p>
      </div>
    </div>
  );
}

/* ── Stripe Elements card form (mounted once a SetupIntent clientSecret exists).
   The card is tokenised by Stripe in the browser — it never touches our server. */
function SetupForm({ onSaved, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [makeDefault, setMakeDefault] = useState(true);

  const submit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSaving(true);
    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: "if_required",
      });
      if (error) {
        toast.error(error.message || "Couldn't save your card");
        setSaving(false);
        return;
      }
      if (setupIntent && setupIntent.status === "succeeded") {
        const saved = await PaymentMethodService.addPaymentMethod({
          paymentMethodId: setupIntent.payment_method,
          isDefault: makeDefault,
        });
        onSaved(saved);
      } else {
        toast.error("Card setup wasn't completed");
        setSaving(false);
      }
    } catch (err) {
      toast.error(err.message || "Couldn't save your card");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <PaymentElement options={{ layout: "tabs" }} />

      <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
        <input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} className="accent-accent" />
        Set as my default card
      </label>

      <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !stripe}
          className="inline-flex items-center gap-2 bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-light disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          Save card
        </button>
      </div>
      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-gray-400">
        <Lock className="h-3.5 w-3.5" /> Secured by Stripe — your card never touches our servers.
      </p>
    </form>
  );
}

const PaymentMethods = () => {
  const stripePromise = useTenantStripe();
  // Hydrate from the session cache so revisits render instantly (no loader
  // flash) — like the Profile screen. Only a genuine cold load shows the loader.
  const [paymentMethods, setPaymentMethods] = useState(() => PaymentMethodService.getCached() || []);
  const [loading, setLoading] = useState(() => !PaymentMethodService.getCached());
  const [showAddForm, setShowAddForm] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [preparing, setPreparing] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [confirmCard, setConfirmCard] = useState(null); // card pending delete (modal)

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  // Always revalidate in the background; the loader only shows on a cold load.
  const fetchPaymentMethods = async () => {
    try {
      const methods = await PaymentMethodService.getAllPaymentMethods({ force: true });
      setPaymentMethods(methods || []);
    } catch (error) {
      toast.error(error.message || "Failed to fetch payment methods");
    } finally {
      setLoading(false);
    }
  };

  // "Add card" → create a SetupIntent, then reveal the Stripe Elements form.
  const startAdd = async () => {
    if (!stripePromise) {
      toast.error("Card payments aren't set up for this organisation yet");
      return;
    }
    setPreparing(true);
    try {
      const cs = await PaymentMethodService.createSetupIntent();
      setClientSecret(cs);
      setShowAddForm(true);
    } catch (error) {
      toast.error(error.message || "Couldn't start adding a card");
    } finally {
      setPreparing(false);
    }
  };

  const cancelAdd = () => {
    setShowAddForm(false);
    setClientSecret(null);
  };

  const onSaved = () => {
    cancelAdd();
    fetchPaymentMethods();
    toast.success("Card saved");
  };

  const handleDeleteCard = async (id) => {
    setBusyId(id);
    try {
      await PaymentMethodService.deletePaymentMethod(id);
      setPaymentMethods((prev) => prev.filter((m) => m._id !== id));
      toast.success("Card removed");
      setConfirmCard(null);
    } catch (error) {
      toast.error(error.message || "Failed to remove card");
    } finally {
      setBusyId(null);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await PaymentMethodService.setDefaultPaymentMethod(id);
      setPaymentMethods((prev) => prev.map((m) => ({ ...m, isDefault: m._id === id })));
      toast.success("Default card updated");
    } catch (error) {
      toast.error(error.message || "Failed to update default card");
    }
  };

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Payment Methods"
        subtitle="Save a card to give faster next time — reused securely at checkout."
        actions={
          <button
            onClick={startAdd}
            disabled={showAddForm || preparing}
            className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-light disabled:opacity-50"
          >
            {preparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add New Card
          </button>
        }
      />

      {/* Add card — Stripe Elements (SetupIntent) */}
      {showAddForm && clientSecret && stripePromise && (
        <div className="border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
          <SectionHead icon={CreditCard} title="Add a new card" desc="Enter your card details — saved securely with Stripe for future donations." />
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
            <SetupForm onSaved={onSaved} onCancel={cancelAdd} />
          </Elements>
        </div>
      )}

      {/* Saved cards */}
      {loading ? (
        <TabLoader label="Loading payment methods…" />
      ) : paymentMethods.length === 0 ? (
        <div className="border border-gray-100 bg-white p-12 text-center shadow-sm">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-accent/10">
            <CreditCard className="h-6 w-6 text-accent" />
          </span>
          <p className="font-semibold text-gray-800">No saved cards yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">Add a card to make giving faster next time — it'll be ready to use at checkout.</p>
          {!showAddForm && (
            <button
              onClick={startAdd}
              disabled={preparing}
              className="mt-5 inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-light disabled:opacity-50"
            >
              {preparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add a card
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <div key={method._id} className="flex items-center justify-between gap-4 border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex min-w-0 items-center gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center bg-accent/10 text-accent">
                  <CreditCard className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-800">
                      {brandLabel(method.brand)}
                      {method.cardNumber ? ` •••• ${method.cardNumber}` : ""}
                    </h3>
                    {method.isDefault && (
                      <span className="inline-flex items-center gap-1 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                        <Check className="h-3 w-3" /> Default
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {method.expiryMonth && method.expiryYear
                      ? `Expires ${String(method.expiryMonth).padStart(2, "0")}/${method.expiryYear}`
                      : "Saved card"}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {!method.isDefault && (
                  <button
                    onClick={() => handleSetDefault(method._id)}
                    className="border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-accent/50 hover:text-accent"
                  >
                    Set default
                  </button>
                )}
                <button
                  onClick={() => setConfirmCard(method)}
                  className="grid h-8 w-8 place-items-center text-red-500 transition-colors hover:bg-red-50"
                  title="Remove card"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Security note */}
      <div className="flex items-start gap-3 border border-accent/20 bg-accent/5 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <p className="text-sm text-gray-600">
          Cards are tokenised and vaulted by <span className="font-medium text-gray-800">Stripe</span> — we only store the brand, last 4 digits and expiry. Your full card number and CVV never reach our servers.
        </p>
      </div>

      {/* Remove-card confirmation modal */}
      {confirmCard && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => busyId !== confirmCard._id && setConfirmCard(null)}
          />
          <div className="relative w-full max-w-sm border border-gray-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-50 text-red-500">
                <Trash2 className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="font-heading text-lg font-bold text-gray-900">Remove card?</h3>
                <p className="mt-0.5 truncate text-sm text-text-muted">
                  {brandLabel(confirmCard.brand)}
                  {confirmCard.cardNumber ? ` •••• ${confirmCard.cardNumber}` : ""}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              This card will be removed from your saved methods and detached from Stripe. You can add it again anytime.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmCard(null)}
                disabled={busyId === confirmCard._id}
                className="border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCard(confirmCard._id)}
                disabled={busyId === confirmCard._id}
                className="inline-flex items-center gap-2 bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                {busyId === confirmCard._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Remove card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentMethods;
