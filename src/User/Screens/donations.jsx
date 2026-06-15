import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  FileText,
  DollarSign,
  AlertCircle,
  Bell,
  CheckCircle2,
  MessageSquare,
  CreditCard,
  Repeat,
  Layers,
  HeartHandshake,
  Wallet,
  ArrowUpDown,
  LayoutGrid,
  List as ListIcon,
  ArrowLeft,
  ShieldCheck,
  ExternalLink,
  Receipt,
} from "lucide-react";
import { toast } from "react-hot-toast";
import DonationService from "../../services/donation.service";
import logo from "../../assets/logo.png";
import footer2 from "../../assets/footer3.png";
import { downloadReceipt, downloadPaidPaymentsReceipt } from "./recieptDownloader";
import { formatEndDate } from "./formatEndDate";
import { generateAnnualStatement, getAvailableFinancialYears } from "./AnnualDonation";
import { TabLoader } from "../../components/TabLoader";
import { useTenant } from "../../context/TenantContext";
import { cn } from "../../utils/cn";

const ITEMS_PER_PAGE = 9;
const money = (n) => `$${Number(n || 0).toLocaleString()}`;
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "—";

const titleCase = (s) =>
  (s || "").toString().replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const STATUS_STYLE = {
  completed: "bg-emerald-50 text-emerald-700",
  active: "bg-emerald-50 text-emerald-700",
  succeeded: "bg-emerald-50 text-emerald-700",
  processing: "bg-amber-50 text-amber-700",
  pending: "bg-blue-50 text-blue-700",
  failed: "bg-red-50 text-red-700",
  cancelled: "bg-red-50 text-red-700",
};
const statusStyle = (s) => STATUS_STYLE[(s || "").toLowerCase()] || "bg-gray-100 text-gray-600";

const TYPE_META = {
  recurring: { label: "Recurring", icon: Repeat },
  installments: { label: "Installments", icon: Layers },
  single: { label: "One-time", icon: HeartHandshake },
  one_time: { label: "One-time", icon: HeartHandshake },
};
const typeMeta = (t) => TYPE_META[t] || TYPE_META.single;

function paymentMethodLabel(d) {
  const pm = d.paymentMethod;
  if (pm?.type === "card" && pm?.card)
    return `${titleCase(pm.card.brand || "Card")}${pm.card.last4 ? ` •••• ${pm.card.last4}` : ""}`;
  if (pm?.type === "bank_transfer" || pm?.type === "bank_account")
    return `Bank Transfer${pm?.bank_name ? ` (${pm.bank_name})` : ""}`;
  if (pm?.type === "paypal") return "PayPal";
  if (pm?.type) return titleCase(pm.type);
  if (pm) return typeof pm === "string" ? titleCase(pm) : "—";
  return "—";
}

// Gradient header band shared with the My Payments / Subscriptions screens.
const HEADER_GRADIENT = "linear-gradient(120deg, var(--tenant-primary, #2C2418), var(--tenant-accent, #C9A84C))";

/* ── Stat tile integrated into the gradient header strip ──────────────── */
function HeaderStat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 bg-white px-5 py-4 sm:px-6">
      <span className="grid h-9 w-9 shrink-0 place-items-center bg-accent/10 text-accent">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate font-heading text-lg font-bold leading-none text-primary">{value}</p>
        <p className="mt-1 text-xs text-text-muted">{label}</p>
      </div>
    </div>
  );
}

/* ── Summary stat tile ────────────────────────────────────────────────── */
function StatTile({ icon: Icon, label, value, hint }) {
  return (
    <div className="flex items-center gap-3 border border-gray-100 bg-white p-4 shadow-sm">
      <span className="grid h-11 w-11 shrink-0 place-items-center bg-accent/10 text-accent">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="font-heading text-xl font-bold leading-none text-primary">{value}</p>
        <p className="mt-1 text-xs text-text-muted">{label}</p>
        {hint && <p className="text-[11px] text-text-muted/70">{hint}</p>}
      </div>
    </div>
  );
}

/* ── One donation card ────────────────────────────────────────────────── */
function DonationCard({ donation, orgInfo, onView }) {
  const { label: tLabel, icon: TIcon } = typeMeta(donation.paymentType);
  const inst = donation.paymentType === "installments" ? donation.installmentDetails : null;
  const paid = inst?.installmentsPaid || 0;
  const total = inst?.numberOfInstallments || 0;
  const pct = total ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const extra = (donation.items?.length || 1) - 1;
  const closedOff = donation.donorUpdates?.some((u) => u.type === "close-off");
  const hasUpdates = donation.donorUpdates?.length > 0;
  const canReceipt = !["pending", "failed", "cancelled"].includes(donation.paymentStatus);
  const isOneTime =
    donation.paymentType === "single" || donation.paymentType === "one_time" || !donation.paymentType;

  const nextPayment =
    donation.nextPaymentDate ||
    donation.recurringDetails?.nextPaymentDate ||
    donation.installmentDetails?.nextInstallmentDate;

  const handleReceipt = () => {
    if (isOneTime) downloadReceipt(donation, { logoUrl: logo, charityLogoUrl: footer2 }, orgInfo);
    else downloadPaidPaymentsReceipt(donation, orgInfo);
  };

  const methodWide = !isOneTime && nextPayment;

  return (
    <div className="group flex flex-col border border-gray-100 bg-white shadow-sm transition-all hover:border-accent/30 hover:shadow-md">
      {/* Header band */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3">
        <span className="inline-flex items-center gap-1.5 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
          <TIcon className="h-3.5 w-3.5" /> {tLabel}
        </span>
        <span className={cn("shrink-0 px-2.5 py-1 text-[11px] font-semibold capitalize", statusStyle(donation.paymentStatus))}>
          {donation.paymentStatus || "—"}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        {/* Title */}
        <h3 className="truncate font-heading text-base font-bold text-primary" title={donation.items?.[0]?.title}>
          {donation.items?.[0]?.title || "Donation"}
          {extra > 0 && <span className="ml-1.5 text-xs font-normal text-accent">+{extra} more</span>}
        </h3>

        {/* Amount */}
        <p className="mt-1 font-heading text-3xl font-bold leading-tight text-accent">
          {money(donation.totalAmount)}
          {donation.paymentType === "recurring" && donation.recurringDetails?.frequency && (
            <span className="text-sm font-normal text-text-muted">/{donation.recurringDetails.frequency}</span>
          )}
        </p>

        {/* Installment progress */}
        {inst && total > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs text-text-muted">
              <span>{paid} of {total} paid</span>
              <span className="font-semibold text-primary">{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* Meta — definition grid */}
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-100 pt-4 text-sm">
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-text-muted/70">Date</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-gray-800">
              <Calendar className="h-4 w-4 shrink-0 text-accent" /> {fmtDate(donation.createdAt)}
            </dd>
          </div>
          {!isOneTime && nextPayment && (
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-text-muted/70">Next payment</dt>
              <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-gray-800">
                <Repeat className="h-4 w-4 shrink-0 text-accent" /> {fmtDate(nextPayment)}
              </dd>
            </div>
          )}
          <div className={cn("min-w-0", methodWide && "col-span-2")}>
            <dt className="text-[11px] uppercase tracking-wide text-text-muted/70">Payment method</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-gray-800">
              <CreditCard className="h-4 w-4 shrink-0 text-accent" /> <span className="truncate">{paymentMethodLabel(donation)}</span>
            </dd>
          </div>
        </dl>

        {/* Badges */}
        {(closedOff || hasUpdates) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {closedOff && (
              <span className="inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> Closed off
              </span>
            )}
            {hasUpdates && !closedOff && (
              <span className="inline-flex items-center gap-1 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                <Bell className="h-3 w-3" /> {donation.donorUpdates.length} update{donation.donorUpdates.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto flex items-center gap-2 pt-5">
          <button
            onClick={() => onView(donation)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:border-accent/50 hover:text-accent"
          >
            <FileText className="h-3.5 w-3.5" /> Details
          </button>
          {canReceipt && (
            <button
              onClick={handleReceipt}
              className="inline-flex flex-1 items-center justify-center gap-1.5 bg-accent px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-light"
            >
              <Download className="h-3.5 w-3.5" /> Receipt
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── One donation row (list view) ─────────────────────────────────────── */
function DonationRow({ donation, orgInfo, onView, showNextPayment = true }) {
  const { label: tLabel, icon: TIcon } = typeMeta(donation.paymentType);
  const inst = donation.paymentType === "installments" ? donation.installmentDetails : null;
  const extra = (donation.items?.length || 1) - 1;
  const closedOff = donation.donorUpdates?.some((u) => u.type === "close-off");
  const canReceipt = !["pending", "failed", "cancelled"].includes(donation.paymentStatus);
  const isOneTime =
    donation.paymentType === "single" || donation.paymentType === "one_time" || !donation.paymentType;
  const nextPayment =
    donation.nextPaymentDate ||
    donation.recurringDetails?.nextPaymentDate ||
    donation.installmentDetails?.nextInstallmentDate;

  const handleReceipt = () => {
    if (isOneTime) downloadReceipt(donation, { logoUrl: logo, charityLogoUrl: footer2 }, orgInfo);
    else downloadPaidPaymentsReceipt(donation, orgInfo);
  };

  return (
    <tr className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/60">
      {/* Cause */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900" title={donation.items?.[0]?.title}>
            {donation.items?.[0]?.title || "Donation"}
          </span>
          {extra > 0 && <span className="text-xs text-accent">+{extra}</span>}
          {closedOff && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> Closed
            </span>
          )}
        </div>
      </td>
      {/* Type */}
      <td className="whitespace-nowrap px-4 py-3">
        <span className="inline-flex items-center gap-1 text-sm text-text-muted">
          <TIcon className="h-3.5 w-3.5" /> {tLabel}
        </span>
      </td>
      {/* Amount */}
      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-900">
        {money(donation.totalAmount)}
        {inst?.numberOfInstallments ? (
          <span className="block text-[11px] font-normal text-text-muted">
            {inst.installmentsPaid || 0}/{inst.numberOfInstallments} paid
          </span>
        ) : null}
      </td>
      {/* Date */}
      <td className="whitespace-nowrap px-4 py-3 text-sm text-text-muted">{fmtDate(donation.createdAt)}</td>
      {/* Next payment */}
      {showNextPayment && (
        <td className="whitespace-nowrap px-4 py-3 text-sm text-text-muted">{!isOneTime && nextPayment ? fmtDate(nextPayment) : "—"}</td>
      )}
      {/* Status */}
      <td className="whitespace-nowrap px-4 py-3">
        <span className={cn("inline-flex px-2.5 py-0.5 text-[11px] font-semibold capitalize", statusStyle(donation.paymentStatus))}>
          {donation.paymentStatus || "—"}
        </span>
      </td>
      {/* Actions */}
      <td className="whitespace-nowrap px-4 py-3">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => onView(donation)}
            title="View details"
            className="inline-flex items-center gap-1.5 border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-accent/50 hover:text-accent"
          >
            <FileText className="h-3.5 w-3.5" /> Details
          </button>
          {canReceipt && (
            <button
              onClick={handleReceipt}
              title="Download receipt"
              className="inline-flex items-center gap-1.5 bg-accent/10 px-2.5 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
            >
              <Download className="h-3.5 w-3.5" /> Receipt
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ── Detail PAGE (in-place, mirrors My Payments PaymentDetail) ────────── */
function Section({ title, icon: Icon, children }) {
  return (
    <div className="border-t border-gray-100 pt-5">
      <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wide text-primary">
        {Icon && <Icon className="h-4 w-4 text-accent" />} {title}
      </h3>
      {children}
    </div>
  );
}
function Field({ label, value, mono }) {
  return (
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <p className={cn("text-sm font-medium text-gray-900", mono && "break-all font-mono text-xs")}>{value}</p>
    </div>
  );
}

/* At-a-glance fact tile shown in the detail hero strip. */
function QuickFact({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center bg-accent/10 text-accent">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted/70">{label}</p>
        <p className="truncate text-sm font-semibold capitalize text-primary">{value}</p>
      </div>
    </div>
  );
}

function DonationDetailPage({ donation, orgInfo, onBack }) {
  const { label: tLabel, icon: TIcon } = typeMeta(donation.paymentType);
  const isOneTime =
    donation.paymentType === "single" || donation.paymentType === "one_time" || !donation.paymentType;
  const canReceipt = !["pending", "failed", "cancelled"].includes(donation.paymentStatus);
  const rec = donation.recurringDetails;
  const inst = donation.installmentDetails;

  const instPaid = inst?.installmentsPaid || 0;
  const instTotal = inst?.numberOfInstallments || 0;
  const instPct = instTotal ? Math.min(100, Math.round((instPaid / instTotal) * 100)) : 0;
  const itemsTotal = donation.items.reduce((s, it) => s + (it.price || 0) * (it.quantity || 1), 0);
  const typeFact = isOneTime
    ? "One-time gift"
    : donation.paymentType === "recurring"
      ? `${cap(rec?.frequency || "monthly")} recurring`
      : `${instTotal} installments`;

  const handleReceipt = () => {
    if (isOneTime) downloadReceipt(donation, { logoUrl: logo, charityLogoUrl: footer2 }, orgInfo);
    else downloadPaidPaymentsReceipt(donation, orgInfo);
    toast.success("Receipt download initiated");
  };

  return (
    <div className="w-full space-y-6 lg:p-6">
      <button onClick={onBack} className="group inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-accent">
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to donations
      </button>

      {/* Hero band — full width across both columns */}
      <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
        <div className="relative px-6 py-7 sm:px-8" style={{ background: HEADER_GRADIENT }}>
          {/* decorative depth */}
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-20 right-28 h-48 w-48 rounded-full bg-white/5" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                <TIcon className="h-3.5 w-3.5" /> {tLabel}
              </span>
              <p className="mt-3 truncate text-sm font-medium text-white/85">{donation.items?.[0]?.title || "Donation"}</p>
              <p className="font-heading text-4xl font-bold leading-tight text-white sm:text-5xl">{money(donation.totalAmount)}</p>
              <p className="mt-1.5 text-xs text-white/70">
                Donation {donation.donationId ? `#${donation.donationId}` : ""} · {fmtDate(donation.createdAt)}
              </p>
            </div>
            <span className={cn("inline-flex shrink-0 px-2.5 py-1 text-[11px] font-semibold capitalize", statusStyle(donation.paymentStatus))}>
              {donation.paymentStatus || "—"}
            </span>
          </div>

          {/* Installment progress in the hero */}
          {donation.paymentType === "installments" && instTotal > 0 && (
            <div className="relative mt-5 max-w-md">
              <div className="mb-1.5 flex items-center justify-between text-xs text-white/85">
                <span>{instPaid} of {instTotal} installments paid</span>
                <span className="font-semibold">{instPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-white" style={{ width: `${instPct}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Quick-facts strip */}
        <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 sm:grid-cols-4 sm:divide-y-0">
          <QuickFact icon={Calendar} label="Date" value={fmtDate(donation.createdAt)} />
          <QuickFact icon={CreditCard} label="Method" value={paymentMethodLabel(donation)} />
          <QuickFact icon={TIcon} label="Plan" value={typeFact} />
          <QuickFact icon={DollarSign} label="Amount" value={money(donation.totalAmount)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-6 lg:col-span-2">
          {/* Items */}
          <div className="border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center bg-accent/10 text-accent">
                <HeartHandshake className="h-[18px] w-[18px]" />
              </span>
              <h3 className="font-heading text-base font-bold text-primary">
                Items <span className="ml-1 text-sm font-normal text-text-muted">({donation.items.length})</span>
              </h3>
            </div>
            <div className="space-y-2">
              {donation.items.map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-3 border border-gray-100 p-3.5 transition-colors hover:border-accent/30">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{item.title}</p>
                    {item.onBehalfOf && <p className="mt-0.5 text-xs text-text-muted">On behalf of: {item.onBehalfOf}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-gray-900">{money(item.price)}</p>
                    <p className="text-xs text-text-muted">Qty: {item.quantity || 1}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
              <span className="text-sm font-medium text-text-muted">Total</span>
              <span className="font-heading text-lg font-bold text-accent">{money(itemsTotal)}</span>
            </div>
          </div>

          {/* Payment + breakdown */}
          <div className="border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3 border-b border-gray-100 pb-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center bg-accent/10 text-accent">
                <Wallet className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-primary">Payment details</h2>
                <p className="mt-0.5 text-sm text-text-muted">{tLabel} donation</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Payment grid */}
              <div className="grid grid-cols-2 gap-4 border border-gray-100 bg-gray-50/60 p-4 md:grid-cols-3">
                <Field label="Total amount" value={money(donation.totalAmount)} />
                <Field label="Type" value={cap(donation.paymentType || "single")} />
                <Field label="Method" value={paymentMethodLabel(donation)} />
                <div>
                  <p className="text-xs text-text-muted">Status</p>
                  <span className={cn("mt-0.5 inline-flex px-2 py-0.5 text-xs font-semibold capitalize", statusStyle(donation.paymentStatus))}>
                    {donation.paymentStatus}
                  </span>
                </div>
                {!isOneTime && (
                  <Field
                    label="End date"
                    value={rec?.endDate ? fmtDate(rec.endDate) : inst?.endDate ? fmtDate(inst.endDate) : formatEndDate(donation) || "Ongoing"}
                  />
                )}
              </div>

              {donation.adminCostContribution?.included && (
                <Section title="Admin contribution">
                  <div className="border border-gray-100 bg-gray-50/60 p-4 text-sm text-gray-700">
                    You contributed an additional {money(donation.adminCostContribution.amount)} towards administrative costs.
                  </div>
                </Section>
              )}

              {donation.paymentType === "recurring" && rec && (
                <Section title="Recurring details" icon={Repeat}>
                  <div className="grid grid-cols-2 gap-4 border border-gray-100 bg-gray-50/60 p-4 md:grid-cols-3">
                    <Field label="Frequency" value={cap(rec.frequency)} />
                    <Field label="Amount / payment" value={money(rec.amount)} />
                    <Field label="Status" value={cap(rec.status)} />
                    <Field label="Start date" value={fmtDate(rec.startDate)} />
                    <Field label="Next payment" value={fmtDate(rec.nextPaymentDate)} />
                    <Field label="Payments so far" value={rec.totalPayments || 0} />
                  </div>
                  {rec.paymentHistory?.length > 0 && <HistoryTable rows={rec.paymentHistory} kind="recurring" />}
                </Section>
              )}

              {donation.paymentType === "installments" && inst && (
                <Section title="Installment details" icon={Layers}>
                  <div className="grid grid-cols-2 gap-4 border border-gray-100 bg-gray-50/60 p-4 md:grid-cols-3">
                    <Field label="Installments" value={inst.numberOfInstallments} />
                    <Field label="Amount each" value={money(inst.installmentAmount)} />
                    <Field label="Paid" value={`${inst.installmentsPaid} of ${inst.numberOfInstallments}`} />
                    <Field label="Next installment" value={fmtDate(inst.nextInstallmentDate)} />
                  </div>
                  {inst.installmentHistory?.length > 0 && <HistoryTable rows={inst.installmentHistory} kind="installments" />}
                </Section>
              )}

              {donation.donorDetails && (
                <Section title="Donor information">
                  <div className="grid grid-cols-1 gap-4 border border-gray-100 bg-gray-50/60 p-4 md:grid-cols-2">
                    <Field label="Name" value={donation.donorDetails.name} />
                    <Field label="Email" value={donation.donorDetails.email} />
                    {donation.donorDetails.phone && <Field label="Phone" value={donation.donorDetails.phone} />}
                    {donation.donorDetails.address && (
                      <Field
                        label="Address"
                        value={[
                          donation.donorDetails.address.street,
                          donation.donorDetails.address.city,
                          donation.donorDetails.address.state,
                          donation.donorDetails.address.postcode,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      />
                    )}
                  </div>
                </Section>
              )}

            </div>
          </div>

          {/* Updates */}
          {donation.donorUpdates?.length > 0 && (
            <div className="border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wide text-primary">
                <Bell className="h-4 w-4 text-accent" /> Updates on your donation
              </h3>
              <div className="space-y-3">
                {[...donation.donorUpdates]
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  .map((u, idx) => (
                    <div
                      key={u._id || idx}
                      className={cn("border p-4", u.type === "close-off" ? "border-emerald-200 bg-emerald-50/60" : "border-blue-200 bg-blue-50/60")}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium",
                            u.type === "close-off" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800",
                          )}
                        >
                          {u.type === "close-off" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
                          {u.type === "close-off" ? "Completed" : "Progress update"}
                        </span>
                        <span className="text-xs text-text-muted">{fmtDate(u.createdAt)}</span>
                      </div>
                      {u.comment && <p className="whitespace-pre-line text-sm text-gray-700">{u.comment}</p>}
                      {u.images?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {u.images.map((img, i) => (
                            <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                              <img src={img} alt={`Update ${i + 1}`} className="h-20 w-20 border border-gray-200 object-cover hover:opacity-80" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — receipt */}
        <div className="lg:col-span-1">
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
                <Receipt className="h-4 w-4 text-accent" />
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Receipt</p>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3 bg-accent/5 p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center bg-accent/15 text-accent">
                    <DollarSign className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-heading text-xl font-bold text-primary">{money(donation.totalAmount)}</p>
                    <p className="text-xs text-text-muted">{fmtDate(donation.createdAt)}</p>
                  </div>
                </div>
                {canReceipt ? (
                  <>
                    <button
                      onClick={handleReceipt}
                      className="mt-4 flex w-full items-center justify-center gap-2 bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light"
                    >
                      <Download className="h-4 w-4" /> Download receipt
                    </button>
                    {donation.stripeReceiptUrl && (
                      <a
                        href={donation.stripeReceiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex w-full items-center justify-center gap-2 border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-accent/50 hover:text-accent"
                      >
                        <Receipt className="h-4 w-4" /> Stripe receipt <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </>
                ) : (
                  <p className="mt-4 bg-gray-50 px-3 py-2.5 text-center text-xs text-text-muted">No receipt available for this donation yet.</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 border border-emerald-100 bg-emerald-50/50 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <p className="text-xs leading-relaxed text-emerald-800">Thank you for your generosity — your contribution goes directly to the cause.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryTable({ rows, kind }) {
  return (
    <div className="mt-4 overflow-hidden border border-gray-100">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">No.</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">Date</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">Amount</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((p, idx) => (
            <tr key={idx}>
              <td className="px-3 py-2 text-text-muted">{kind === "installments" ? p.installmentNumber : idx + 1}</td>
              <td className="px-3 py-2 text-text-muted">{p.date ? fmtDate(p.date) : "—"}</td>
              <td className="px-3 py-2 text-gray-700">{money(p.amount)}</td>
              <td className="px-3 py-2">
                <span className={cn("inline-flex px-2 py-0.5 text-xs font-medium capitalize", statusStyle(p.status))}>{p.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Type filter pills ────────────────────────────────────────────────── */
const FILTERS = [
  { id: "All", label: "All" },
  { id: "single", label: "One-time" },
  { id: "recurring", label: "Recurring" },
  { id: "installments", label: "Installments" },
];
const matchesType = (d, f) => {
  if (f === "All") return true;
  if (f === "single") return d.paymentType === "single" || d.paymentType === "one_time" || !d.paymentType;
  return d.paymentType === f;
};

const SORTS = [
  { id: "date-desc", label: "Newest first" },
  { id: "date-asc", label: "Oldest first" },
  { id: "amount-desc", label: "Amount: high to low" },
  { id: "amount-asc", label: "Amount: low to high" },
];

const UserDonations = () => {
  const { organisation } = useTenant();
  const orgInfo = {
    name: organisation?.name,
    email: organisation?.contactEmail,
    phone: organisation?.contactPhone,
    website: organisation?.website,
  };

  const cachedOrders = DonationService.getCachedUserDonations();
  const cachedStats = DonationService.getCachedDonationStats();
  const [donations, setDonations] = useState(cachedOrders?.orders || []);
  const [stats, setStats] = useState(
    cachedStats?.stats || { totalDonated: 0, paidDonated: 0, activeRecurring: 0, pendingAmount: 0 },
  );
  const [loading, setLoading] = useState(!(cachedOrders && cachedStats));
  const [refreshing, setRefreshing] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [sort, setSort] = useState("date-desc");
  const [view, setView] = useState(() => localStorage.getItem("donationsView") || "card");
  const [selectedDonation, setSelectedDonation] = useState(null);

  const changeView = (v) => {
    setView(v);
    localStorage.setItem("donationsView", v);
  };

  // Annual statement
  const [showStatement, setShowStatement] = useState(false);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [generatingStatement, setGeneratingStatement] = useState(false);

  const fetchDonations = async ({ force = false } = {}) => {
    try {
      const [donationsRes, statsRes] = await Promise.all([
        DonationService.getUserDonations({ force }),
        DonationService.getDonationStats({ force }),
      ]);
      if (donationsRes?.status === "Success") setDonations(donationsRes.orders || []);
      if (statsRes?.stats) setStats(statsRes.stats);
    } catch (error) {
      toast.error(error?.message || "Failed to fetch donations");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDonations({ force: true });
  }, []);

  useEffect(() => {
    if (donations.length > 0) {
      const years = getAvailableFinancialYears(donations);
      setAvailableYears(years);
      if (years.length > 0) setSelectedYear((prev) => prev || years[0]);
    }
  }, [donations]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedType, sort]);

  const refresh = () => {
    setRefreshing(true);
    fetchDonations({ force: true }).then(() => toast.success("Refreshed"));
  };

  const handleGenerateStatement = async () => {
    if (!selectedYear) return toast.error("Please select a financial year");
    setGeneratingStatement(true);
    try {
      toast.loading("Generating your annual statement...");
      const result = generateAnnualStatement(
        donations,
        selectedYear,
        { id: donations[0]?.userId, name: donations[0]?.donorDetails?.name, email: donations[0]?.donorDetails?.email },
        { logoUrl: logo, charityLogoUrl: footer2, orgName: orgInfo.name, orgEmail: orgInfo.email, orgPhone: orgInfo.phone, orgWebsite: orgInfo.website },
      );
      toast.dismiss();
      if (result.success) {
        toast.success(result.message);
        setShowStatement(false);
      } else {
        toast.error(result.message || "Failed to generate statement");
      }
    } catch (error) {
      console.error("Error generating statement:", error);
      toast.dismiss();
      toast.error("Failed to generate statement. Please try again.");
    } finally {
      setGeneratingStatement(false);
    }
  };

  const filtered = useMemo(
    () =>
      donations.filter(
        (d) =>
          (d.items?.[0]?.title || "").toLowerCase().includes(searchTerm.toLowerCase()) && matchesType(d, selectedType),
      ),
    [donations, searchTerm, selectedType],
  );

  const sorted = useMemo(() => {
    const [key, dir] = sort.split("-");
    return [...filtered].sort((a, b) => {
      const av = key === "date" ? new Date(a.createdAt).getTime() : a.totalAmount || 0;
      const bv = key === "date" ? new Date(b.createdAt).getTime() : b.totalAmount || 0;
      return dir === "asc" ? av - bv : bv - av;
    });
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const paginated = sorted.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // giving progress (paid vs pending share of total)
  const total = stats.totalDonated || 0;
  const paidPct = total > 0 ? Math.round(((stats.paidDonated || 0) / total) * 100) : 0;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <TabLoader label="Loading donations…" />
      </div>
    );
  }

  // Detail opens as a full in-place page (not a modal), mirroring My Payments.
  if (selectedDonation) {
    return <DonationDetailPage donation={selectedDonation} orgInfo={orgInfo} onBack={() => setSelectedDonation(null)} />;
  }

  return (
    <div className="w-full space-y-6 lg:p-6">
      {/* Header card with gradient band + integrated stats (My Payments style) */}
      <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-7 sm:px-8" style={{ background: HEADER_GRADIENT }}>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Your giving</p>
            <h1 className="mt-1 font-heading text-2xl font-bold text-white">My Donations</h1>
            <p className="mt-1 text-sm text-white/80">Every gift you've made — receipts, history and your annual statement.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} /> Refresh
            </button>
            <button
              onClick={() => setShowStatement(true)}
              className="inline-flex items-center gap-1.5 bg-white px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-white/90"
            >
              <FileText className="h-4 w-4" /> Annual statement
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-4">
          <HeaderStat icon={DollarSign} label="Total donated" value={money(stats.totalDonated)} />
          <HeaderStat icon={CheckCircle2} label="Paid" value={money(stats.paidDonated)} />
          <HeaderStat icon={AlertCircle} label="Pending" value={money(stats.pendingAmount)} />
          <HeaderStat icon={RefreshCw} label="Active plans" value={stats.activeRecurring || 0} />
        </div>
      </div>

      {/* Giving progress */}
      {total > 0 && (
        <div className="border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-heading text-sm font-bold text-primary">Giving progress</p>
            <p className="text-xs text-text-muted">
              <span className="font-semibold text-emerald-600">{paidPct}%</span> paid
            </p>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full bg-emerald-500" style={{ width: `${paidPct}%` }} />
            <div className="h-full bg-amber-400" style={{ width: `${100 - paidPct}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-text-muted">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Paid {money(stats.paidDonated)}</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Pending {money(stats.pendingAmount)}</span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedType(f.id)}
              className={cn(
                "border px-3 py-1.5 text-sm font-medium transition-colors",
                selectedType === f.id
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-gray-200 text-text-muted hover:border-accent/40 hover:text-primary",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by cause…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-accent lg:w-56"
            />
          </div>
          <div className="relative">
            <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none border border-gray-200 py-2 pl-9 pr-8 text-sm outline-none focus:border-accent"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* View toggle */}
          <div className="flex border border-gray-200">
            <button
              onClick={() => changeView("card")}
              title="Card view"
              className={cn(
                "grid h-9 w-9 place-items-center transition-colors",
                view === "card" ? "bg-accent text-white" : "text-gray-500 hover:text-accent",
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => changeView("list")}
              title="List view"
              className={cn(
                "grid h-9 w-9 place-items-center border-l border-gray-200 transition-colors",
                view === "list" ? "bg-accent text-white" : "text-gray-500 hover:text-accent",
              )}
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <div className="border border-gray-100 bg-white p-12 text-center shadow-sm">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-accent/10 text-accent">
            <HeartHandshake className="h-6 w-6" />
          </span>
          <p className="font-semibold text-gray-800">No donations found</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
            {searchTerm || selectedType !== "All"
              ? "Try adjusting your search or filter."
              : "You haven't made any donations yet."}
          </p>
        </div>
      ) : (
        <>
          {view === "card" ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {paginated.map((donation) => (
                <DonationCard key={donation._id} donation={donation} orgInfo={orgInfo} onView={setSelectedDonation} />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-100 bg-white shadow-sm">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Cause</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Type</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-text-muted">Amount</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Date</th>
                    {selectedType !== "single" && (
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Next payment</th>
                    )}
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Status</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((donation) => (
                    <DonationRow
                      key={donation._id}
                      donation={donation}
                      orgInfo={orgInfo}
                      onView={setSelectedDonation}
                      showNextPayment={selectedType !== "single"}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-text-muted">
                Showing {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, sorted.length)} of {sorted.length}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="grid h-9 w-9 place-items-center border border-gray-200 text-gray-600 transition-colors hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let n;
                  if (totalPages <= 5) n = i + 1;
                  else if (page <= 3) n = i + 1;
                  else if (page >= totalPages - 2) n = totalPages - (4 - i);
                  else n = page - 2 + i;
                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(n)}
                      className={cn(
                        "h-9 min-w-9 px-2 text-sm font-medium transition-colors",
                        page === n ? "bg-accent text-white" : "border border-gray-200 text-gray-600 hover:border-accent/50 hover:text-accent",
                      )}
                    >
                      {n}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="grid h-9 w-9 place-items-center border border-gray-200 text-gray-600 transition-colors hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Annual statement modal */}
      {showStatement &&
        createPortal(
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowStatement(false)} />
            <div className="relative w-full max-w-md border border-gray-100 bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center bg-accent/10 text-accent">
                  <FileText className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-heading text-lg font-bold text-gray-900">Annual donation statement</h3>
                  <p className="mt-0.5 text-sm text-text-muted">A tax-ready summary of all your donations for a financial year.</p>
                </div>
              </div>

              {availableYears.length === 0 ? (
                <p className="border border-gray-100 bg-gray-50 p-4 text-sm text-text-muted">
                  No donations available to generate a statement yet.
                </p>
              ) : (
                <>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Financial year</label>
                  <select
                    value={selectedYear || ""}
                    onChange={(e) => setSelectedYear(Number.parseInt(e.target.value))}
                    className="w-full border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
                  >
                    <option value="" disabled>Select a financial year</option>
                    {availableYears.map((year) => (
                      <option key={year} value={year}>FY {year - 1}–{year}</option>
                    ))}
                  </select>
                </>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowStatement(false)}
                  className="border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={handleGenerateStatement}
                  disabled={generatingStatement || !selectedYear || availableYears.length === 0}
                  className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"
                >
                  {generatingStatement ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Generate
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default UserDonations;
