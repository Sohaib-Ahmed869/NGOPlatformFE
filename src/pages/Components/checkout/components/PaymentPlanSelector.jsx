import { Check, Info, Minus, Plus } from "lucide-react";
import CustomSelect from "../../../../components/CustomSelect";
import { PAYMENT_TYPES, FREQ_OPTIONS, BILLING_DAY_OPTIONS, labelCls, inputCls, selectTrigger, tileBase, accentGlow } from "../constants";
import { money, tileState, TILE_GLOW } from "../utils";
import { useCheckout } from "../CheckoutContext";

export default function PaymentPlanSelector() {
  const {
    paymentType, setPaymentType, typeAmount, hasRamadanRecurringItems,
    recurringFrequency, setRecurringFrequency, billingDay, setBillingDay,
    recurringAmount, recurringEndDate, setRecurringEndDate, totalRecurringPayments,
    installmentMonths, setInstallmentMonths, grandTotal,
    adminCostPercentage, setAdminCostPercentage,
  } = useCheckout();

  return (
    <>
      {/* Frequency — each tile previews its own amount */}
      <div className="mt-8">
        <h3 className="mb-3 text-sm font-semibold text-primary">How often would you like to give?</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {PAYMENT_TYPES.map((t) => {
            const active = paymentType === t.id;
            return (
              <button
                key={t.id}
                type="button"
                disabled={hasRamadanRecurringItems}
                onClick={() => !hasRamadanRecurringItems && setPaymentType(t.id)}
                className={`${tileBase} p-4 disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none ${tileState(active)}`}
              >
                <span aria-hidden className={TILE_GLOW} />
                <span className="relative flex flex-col gap-2">
                  <span className="flex items-center justify-between">
                    <span className={`grid h-9 w-9 place-items-center transition-colors ${active ? `bg-accent text-white ${accentGlow}` : "bg-accent/10 text-accent"}`}><t.icon className="h-4 w-4" /></span>
                    {active ? <Check className="h-4 w-4 text-accent" /> : null}
                  </span>
                  <span className="text-sm font-semibold text-primary">{t.label}</span>
                  <span className="text-xs text-text-muted">{t.desc}</span>
                  <span className="mt-1 font-heading text-sm font-bold text-accent">{typeAmount[t.id]}</span>
                </span>
              </button>
            );
          })}
        </div>
        {hasRamadanRecurringItems && (
          <p className="mt-2 flex items-center gap-2 text-sm text-accent"><Info className="h-4 w-4" /> Set to recurring for your Ramadan last-10-nights donation.</p>
        )}
      </div>

      {/* Recurring panel */}
      {paymentType === "recurring" && (
        <div className="mt-5 space-y-5 border-token border-gray-100 bg-gray-50 rounded-token p-5">
          <h4 className="text-sm font-semibold text-primary">Recurring details</h4>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Frequency</label>
              <CustomSelect className="w-full" triggerClassName={selectTrigger} value={recurringFrequency} onChange={setRecurringFrequency} options={FREQ_OPTIONS} disabled={hasRamadanRecurringItems} />
            </div>
            {recurringFrequency === "monthly" && (
              <div>
                <label className={labelCls}>Monthly billing day</label>
                <CustomSelect className="w-full" triggerClassName={selectTrigger} value={billingDay} onChange={(v) => setBillingDay(parseInt(v))} options={BILLING_DAY_OPTIONS} disabled={hasRamadanRecurringItems} />
              </div>
            )}
            <div>
              <label className={labelCls}>Amount charged {recurringFrequency}</label>
              <div className={`${inputCls} bg-gray-100 font-semibold`}>${money(recurringAmount)}</div>
            </div>
            <div>
              <label className={labelCls}>End date</label>
              <input
                type="date"
                value={recurringEndDate}
                onChange={(e) => setRecurringEndDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                disabled={hasRamadanRecurringItems}
                className={inputCls}
              />
            </div>
          </div>
          <p className="flex items-center gap-2 text-sm text-text-muted">
            <Info className="h-4 w-4 text-accent" />
            {totalRecurringPayments > 0
              ? `Your card will be charged $${money(recurringAmount)} ${recurringFrequency} for ${totalRecurringPayments} payments.`
              : `Your card will be charged $${money(recurringAmount)} ${recurringFrequency} until you choose an end date.`}
          </p>
        </div>
      )}

      {/* Installments panel */}
      {paymentType === "installments" && (
        <div className="mt-5 space-y-5 border-token border-gray-100 bg-gray-50 rounded-token p-5">
          <h4 className="text-sm font-semibold text-primary">Installment details</h4>
          <div>
            <label className={labelCls}>Number of monthly installments</label>
            <div className="flex items-center gap-4">
              <input type="range" min="1" max="12" value={installmentMonths} onChange={(e) => setInstallmentMonths(parseInt(e.target.value))} className="h-1.5 flex-1 cursor-pointer appearance-none bg-accent/20 accent-accent" />
              <span className="w-8 text-center font-semibold text-primary">{installmentMonths}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="border-token border-gray-200 bg-white rounded-token p-3">
              <p className="text-xs text-text-muted">Total amount</p>
              <p className="mt-0.5 font-semibold text-primary">${money(grandTotal)}</p>
            </div>
            <div className="border-token border-gray-200 bg-white rounded-token p-3">
              <p className="text-xs text-text-muted">Monthly payment</p>
              <p className="mt-0.5 font-semibold text-primary">${money(grandTotal / installmentMonths)}</p>
            </div>
          </div>
          <p className="flex items-center gap-2 text-sm text-text-muted">
            <Info className="h-4 w-4 text-accent" /> First payment today, then every 30 days for {installmentMonths - 1} more month{installmentMonths > 2 ? "s" : ""}.
          </p>
        </div>
      )}

      {/* Admin cost */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-token border-gray-100 bg-gray-50 rounded-token p-5">
        <div>
          <h3 className="text-sm font-semibold text-primary">Contribute to admin costs?</h3>
          <p className="text-sm text-text-muted">Helps us maintain our 100% donation policy.</p>
        </div>
        <div className="inline-flex items-center border border-gray-200 bg-white">
          <button onClick={() => setAdminCostPercentage(Math.max(0, adminCostPercentage - 1))} className="grid h-9 w-9 place-items-center text-text-muted transition-colors hover:bg-accent/10 hover:text-accent"><Minus className="h-3.5 w-3.5" /></button>
          <span className="w-12 text-center text-sm font-semibold text-primary">{adminCostPercentage}%</span>
          <button onClick={() => setAdminCostPercentage(Math.min(20, adminCostPercentage + 1))} className="grid h-9 w-9 place-items-center text-text-muted transition-colors hover:bg-accent/10 hover:text-accent"><Plus className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </>
  );
}
