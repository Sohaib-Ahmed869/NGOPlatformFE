import { useState } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { X, Heart, Loader2, CheckCircle, CreditCard } from "lucide-react";
import { toast } from "react-hot-toast";
import useTenantStripe from "../../hooks/useTenantStripe";
import { useTenant } from "../../context/TenantContext";
import { useAuth } from "../../context/AuthContext";
import GoFundMeService from "../../services/goFundMeService";

const PRESETS = [25, 50, 100, 250, 500];

/* ── Stripe card step (mounted once a PaymentIntent clientSecret exists) ── */
function StripeCardStep({ campaignId, paymentIntentId, onDone }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);

  const pay = async () => {
    if (!stripe || !elements) return;
    setPaying(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });
      if (error) {
        toast.error(error.message || "Payment failed");
        setPaying(false);
        return;
      }
      if (paymentIntent && paymentIntent.status === "succeeded") {
        const res = await GoFundMeService.processDonation(paymentIntent.id);
        onDone(res);
      } else {
        toast.error("Payment was not completed");
        setPaying(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment failed");
      setPaying(false);
    }
  };

  return (
    <div className="space-y-4">
      <PaymentElement />
      <button
        onClick={pay}
        disabled={paying || !stripe}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
      >
        {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Heart className="h-5 w-5" />} Confirm donation
      </button>
    </div>
  );
}

export default function GoFundMeCheckout({ campaign, onClose, onSuccess }) {
  const stripePromise = useTenantStripe();
  const { organisation } = useTenant();
  const { user } = useAuth();

  const [amount, setAmount] = useState("");
  const [custom, setCustom] = useState("");
  const [form, setForm] = useState({
    donorName: user?.name || "",
    donorEmail: user?.email || "",
    message: "",
    isAnonymous: false,
  });
  const [method, setMethod] = useState("card"); // card | paypal
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [preparing, setPreparing] = useState(false);
  const [done, setDone] = useState(null);

  const value = parseFloat(custom || amount) || 0;
  const paypalClientId = organisation?.paypal?.clientId || import.meta.env.VITE_PAYPAL_CLIENT_ID || "";

  const validBase = () => {
    if (value < 1) return toast.error("Enter a donation amount of at least $1"), false;
    if (!form.donorName.trim()) return toast.error("Please enter your name"), false;
    if (!/\S+@\S+\.\S+/.test(form.donorEmail)) return toast.error("Please enter a valid email"), false;
    return true;
  };

  const donorPayload = () => ({
    amount: value,
    donorName: form.donorName.trim(),
    donorEmail: form.donorEmail.trim(),
    message: form.message.trim(),
    isAnonymous: form.isAnonymous,
  });

  // Card: create the PaymentIntent, then reveal the PaymentElement.
  const startCard = async () => {
    if (!validBase()) return;
    if (!stripePromise) return toast.error("Card payments aren't configured for this organisation");
    setPreparing(true);
    try {
      const res = await GoFundMeService.createPaymentIntent(campaign._id, donorPayload());
      setClientSecret(res.clientSecret);
      setPaymentIntentId(res.paymentIntentId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not start the payment");
    } finally {
      setPreparing(false);
    }
  };

  const finish = (res) => {
    setDone(res);
    toast.success("Thank you for your donation!");
    onSuccess?.(res.donation, res.campaign);
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="font-heading text-lg font-bold text-primary">Donate to {campaign.title}</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center text-gray-400 hover:bg-gray-100 hover:text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {done ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-emerald-50">
                <CheckCircle className="h-7 w-7 text-emerald-600" />
              </div>
              <h4 className="text-lg font-bold text-primary">Donation complete</h4>
              <p className="mt-1 text-sm text-text-muted">
                You gave ${value.toFixed(2)} to {campaign.title}. A receipt is on its way.
              </p>
              <button onClick={onClose} className="mt-6 rounded-xl bg-accent px-6 py-2.5 font-semibold text-white hover:bg-accent/90">
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Amount */}
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">Amount</label>
              <div className="mb-3 grid grid-cols-3 gap-2">
                {PRESETS.map((a) => (
                  <button
                    key={a}
                    onClick={() => { setAmount(String(a)); setCustom(""); }}
                    disabled={!!clientSecret}
                    className={`rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-50 ${
                      amount === String(a) && !custom ? "bg-accent text-white" : "border border-gray-200 text-primary hover:border-accent/40"
                    }`}
                  >
                    ${a}
                  </button>
                ))}
              </div>
              <div className="relative mb-4">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-text-muted">$</span>
                <input
                  type="number"
                  min="1"
                  value={custom}
                  disabled={!!clientSecret}
                  onChange={(e) => { setCustom(e.target.value); setAmount(""); }}
                  placeholder="Other amount"
                  className="w-full rounded-xl border border-gray-200 py-2.5 pl-8 pr-3 text-sm outline-none focus:border-accent disabled:bg-gray-50"
                />
              </div>

              {/* Donor details */}
              <div className="space-y-3">
                <input
                  value={form.donorName}
                  disabled={!!clientSecret}
                  onChange={(e) => set("donorName", e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-accent disabled:bg-gray-50"
                />
                <input
                  type="email"
                  value={form.donorEmail}
                  disabled={!!clientSecret}
                  onChange={(e) => set("donorEmail", e.target.value)}
                  placeholder="Email (for your receipt)"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-accent disabled:bg-gray-50"
                />
                <textarea
                  value={form.message}
                  disabled={!!clientSecret}
                  onChange={(e) => set("message", e.target.value)}
                  rows={2}
                  placeholder="Leave a message of support (optional)"
                  className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-accent disabled:bg-gray-50"
                />
                <label className="flex cursor-pointer items-center gap-2 text-sm text-text-muted">
                  <input type="checkbox" checked={form.isAnonymous} disabled={!!clientSecret} onChange={(e) => set("isAnonymous", e.target.checked)} className="accent-accent" />
                  Donate anonymously
                </label>
              </div>

              {/* Method */}
              {!clientSecret && (
                <>
                  <div className="my-4 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setMethod("card")}
                      className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${method === "card" ? "bg-accent/10 text-accent ring-1 ring-accent/30" : "border border-gray-200 text-gray-600"}`}
                    >
                      <CreditCard className="h-4 w-4" /> Card
                    </button>
                    <button
                      onClick={() => setMethod("paypal")}
                      className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${method === "paypal" ? "bg-accent/10 text-accent ring-1 ring-accent/30" : "border border-gray-200 text-gray-600"}`}
                    >
                      PayPal
                    </button>
                  </div>

                  {method === "card" ? (
                    <button
                      onClick={startCard}
                      disabled={preparing}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
                    >
                      {preparing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Heart className="h-5 w-5" />}
                      {value >= 1 ? `Continue · $${value.toFixed(2)}` : "Continue"}
                    </button>
                  ) : paypalClientId ? (
                    <div className={value >= 1 && form.donorName && /\S+@\S+\.\S+/.test(form.donorEmail) ? "" : "pointer-events-none opacity-40"}>
                      <PayPalScriptProvider options={{ clientId: paypalClientId, currency: "AUD" }}>
                        <PayPalButtons
                          style={{ layout: "vertical", color: "gold", shape: "rect" }}
                          forceReRender={[value]}
                          createOrder={async () => {
                            if (!validBase()) throw new Error("invalid");
                            const res = await GoFundMeService.createPayPalOrder(campaign._id, { amount: value });
                            return res.id;
                          }}
                          onApprove={async (data) => {
                            try {
                              const res = await GoFundMeService.capturePayPalDonation(campaign._id, { orderID: data.orderID, ...donorPayload() });
                              finish(res);
                            } catch (err) {
                              toast.error(err.response?.data?.message || "PayPal capture failed");
                            }
                          }}
                          onError={() => toast.error("PayPal payment failed")}
                        />
                      </PayPalScriptProvider>
                    </div>
                  ) : (
                    <p className="rounded-xl bg-gray-50 p-3 text-center text-sm text-text-muted">PayPal isn't configured for this organisation.</p>
                  )}
                </>
              )}

              {/* Card payment element */}
              {clientSecret && stripePromise && (
                <div className="mt-4">
                  <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
                    <StripeCardStep campaignId={campaign._id} paymentIntentId={paymentIntentId} onDone={finish} />
                  </Elements>
                  <p className="mt-3 text-center text-[11px] text-text-muted">Secured by Stripe</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
