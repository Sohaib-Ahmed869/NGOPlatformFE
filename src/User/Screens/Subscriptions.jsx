import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { TabLoader } from "../../components/TabLoader";
import {
  Calendar,
  CreditCard,
  AlertCircle,
  PlayCircle,
  XCircle,
  X,
  RefreshCw,
  Repeat,
  Layers,
  HeartHandshake,
  CheckCircle,
  Ban,
  Receipt,
  ExternalLink,
  LayoutGrid,
  List,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import SubscriptionService from "../../services/subscription.service";
import DonationService from "../../services/donation.service.jsx";
import { withMinDelay } from "../../utils/minDelay";
import { cn } from "../../utils/cn";

const HEADER_GRADIENT = "linear-gradient(120deg, var(--tenant-primary, #2C2418), var(--tenant-accent, #C9A84C))";
const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const FREQ_MONTHLY = { weekly: 52 / 12, fortnightly: 26 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "—");
const formatDateForInput = (date) => date.toISOString().split("T")[0];

const STATUS_STYLE = {
  active: "bg-emerald-50 text-emerald-700",
  paused: "bg-amber-50 text-amber-700",
  past_due: "bg-red-50 text-red-700",
  pending_cancellation: "bg-orange-50 text-orange-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
  failed: "bg-red-50 text-red-700",
  ended: "bg-gray-100 text-gray-600",
};
const statusStyle = (s) => STATUS_STYLE[(s || "").toLowerCase()] || "bg-gray-100 text-gray-600";
const statusLabel = (s) =>
  (s || "").toLowerCase() === "pending_cancellation"
    ? "Cancellation pending"
    : (s || "").split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");

const ENDED = ["cancelled", "canceled", "failed", "ended"];

// Per-type colour, so each plan is scannable at a glance (icon anchor + chip).
const TYPE_STYLE = {
  recurring: "bg-blue-50 text-blue-600",
  installment: "bg-violet-50 text-violet-600",
  installments: "bg-violet-50 text-violet-600",
  single: "bg-accent/10 text-accent",
  one_time: "bg-accent/10 text-accent",
};
const typeChip = (t) => TYPE_STYLE[t] || TYPE_STYLE.single;

// Module-level "seen this session" gate. The donor's orders are cached globally
// in DonationService and are often already warm here (My Payments / My Donations
// populate the same cache), which would skip the brand loader entirely. This flag
// guarantees the Calcite TabLoader shows on the first Subscriptions visit of the
// session — then stays instant on revisit — mirroring My Donations' behaviour.
let _subsWarmed = false;

/* Split the donor's orders into active vs past recurring + installment plans. */
function deriveBuckets(orders = []) {
  const mapRecurring = (o) => ({
    kind: "recurring",
    id: o._id,
    cause: o.items?.[0]?.title || "Donation",
    amount: o.recurringDetails?.amount || o.totalAmount,
    frequency: o.recurringDetails?.frequency || "monthly",
    status: o.paymentStatus,
    nextPayment: o.recurringDetails?.nextPaymentDate,
    paymentMethod: o.paymentMethod || "Card",
    stripeSubscriptionId: o.transactionDetails?.stripeSubscriptionId,
    receiptUrl: o.stripeReceiptUrl || "",
    endDate: o.recurringDetails?.endDate,
    pauseEndDate: o.pauseEndDate,
    cancellationDate: o.cancellationDate,
    cancellationReason: o.cancellationReason,
  });
  const mapInst = (o) => {
    const total = o.installmentDetails?.numberOfInstallments || 0;
    const paid = o.installmentDetails?.installmentsPaid || 0;
    const complete = total > 0 && paid >= total && !ENDED.includes(o.paymentStatus);
    return {
      kind: "installment",
      id: o._id,
      cause: o.items?.[0]?.title || "Donation",
      amount: o.installmentDetails?.installmentAmount || (total ? o.totalAmount / total : o.totalAmount),
      status: complete ? "completed" : o.paymentStatus,
      // The installment schema uses `nextInstallmentDate` (recurring uses
      // `nextPaymentDate`); fall back just in case older records differ.
      nextPayment: o.installmentDetails?.nextInstallmentDate || o.installmentDetails?.nextPaymentDate,
      paymentMethod: o.paymentMethod || "Card",
      receiptUrl: o.stripeReceiptUrl || "",
      paidInstallments: paid,
      totalInstallments: total,
      remainingInstallments: total - paid,
      cancellationDate: o.cancellationDate,
      cancellationReason: o.cancellationReason,
    };
  };

  const recurring = orders.filter((o) => o.paymentType === "recurring");
  const inst = orders.filter((o) => o.paymentType === "installments");

  const activeRecurring = recurring
    .filter((o) => !ENDED.includes(o.paymentStatus) && (!o.recurringDetails?.endDate || new Date(o.recurringDetails.endDate) > new Date()))
    .map(mapRecurring);
  const pastRecurring = recurring
    .filter((o) => ENDED.includes(o.paymentStatus) || (o.recurringDetails?.endDate && new Date(o.recurringDetails.endDate) <= new Date()))
    .map(mapRecurring);

  const activeInst = inst
    .filter((o) => !ENDED.includes(o.paymentStatus) && o.installmentDetails?.installmentsPaid < o.installmentDetails?.numberOfInstallments)
    .map(mapInst);
  const pastInst = inst
    .filter((o) => ENDED.includes(o.paymentStatus) || o.installmentDetails?.installmentsPaid >= o.installmentDetails?.numberOfInstallments)
    .map(mapInst);

  return {
    active: [...activeRecurring, ...activeInst],
    past: [...pastRecurring, ...pastInst],
  };
}

/* ── Modal (straight-edged) ───────────────────────────────────────────── */
function Modal({ isOpen, onClose, title, description, icon: Icon, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md border border-gray-100 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {Icon && (
              <span className="grid h-11 w-11 shrink-0 place-items-center bg-accent/10 text-accent">
                <Icon className="h-5 w-5" />
              </span>
            )}
            <div>
              <h3 className="font-heading text-lg font-bold text-gray-900">{title}</h3>
              {description && <p className="mt-0.5 text-sm text-text-muted">{description}</p>}
            </div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function HeaderStat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
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

const btnGhost = "inline-flex items-center gap-1.5 border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-50";
const btnDanger = "inline-flex items-center gap-1.5 border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50";

const iconBtn = "grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:bg-accent/5 hover:text-accent disabled:opacity-50";
const iconBtnDanger = "grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50";

/* Next-payment / installment-progress cell content, shared by row + mobile. */
function NextOrProgress({ item, past }) {
  const st = (item.status || "").toLowerCase();
  const isInst = item.kind === "installment";
  if (isInst) {
    const pct = item.totalInstallments ? Math.round((item.paidInstallments / item.totalInstallments) * 100) : 0;
    return (
      <div className="min-w-[120px]">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-muted">{item.paidInstallments}/{item.totalInstallments} paid</span>
          <span className="font-semibold text-primary">{pct}%</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div className={cn("h-full rounded-full", st === "completed" ? "bg-emerald-500" : past ? "bg-gray-300" : "bg-accent")} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }
  if (past) {
    return <span className="text-sm text-text-muted">{item.cancellationDate ? `${item.status === "cancelled" ? "Cancelled" : "Ended"} ${fmtDate(item.cancellationDate)}` : "—"}</span>;
  }
  return <span className="text-sm text-text-muted">Next: {fmtDate(item.nextPayment)}</span>;
}

/* Active-plan actions (Extend / Resume / Cancel), shared by row + mobile. */
function PlanActions({ item, past, busy, onExtend, onResume, onCancel, compact }) {
  const st = (item.status || "").toLowerCase();
  const isInst = item.kind === "installment";
  if (past) return null;
  if (st === "pending_cancellation") {
    return (
      <span className="inline-flex items-center gap-1 bg-orange-50 px-2 py-1 text-[10px] font-semibold text-orange-700">
        <AlertCircle className="h-3 w-3" /> Pending
      </span>
    );
  }
  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {!isInst && <button onClick={() => onExtend(item)} disabled={busy} className={btnGhost}><Calendar className="h-4 w-4" /> Extend</button>}
        {!isInst && st === "paused" && <button onClick={() => onResume(item.id)} disabled={busy} className={btnGhost}><PlayCircle className="h-4 w-4" /> Resume</button>}
        <button onClick={() => onCancel(item)} disabled={busy} className={btnDanger}><XCircle className="h-4 w-4" /> Cancel</button>
      </div>
    );
  }
  return (
    <>
      {!isInst && <button onClick={() => onExtend(item)} disabled={busy} title="Extend" className={iconBtn}><Calendar className="h-4 w-4" /></button>}
      {!isInst && st === "paused" && <button onClick={() => onResume(item.id)} disabled={busy} title="Resume" className={iconBtn}><PlayCircle className="h-4 w-4" /></button>}
      <button onClick={() => onCancel(item)} disabled={busy} title="Cancel" className={iconBtnDanger}><XCircle className="h-4 w-4" /></button>
    </>
  );
}

/* ── One subscription / installment row (desktop table) ───────────────── */
function SubRow({ item, past, busy, onExtend, onResume, onCancel, index = 0 }) {
  const isInst = item.kind === "installment";
  const Icon = isInst ? Layers : Repeat;
  const chip = typeChip(item.kind);
  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut", delay: Math.min(index * 0.03, 0.3) }}
      className="group border-b border-gray-50 transition-colors last:border-0 hover:bg-accent/[0.035]"
    >
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <span className={cn("grid h-9 w-9 shrink-0 place-items-center", chip)}><Icon className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-primary">{item.cause}</p>
            <span className={cn("mt-0.5 inline-flex items-center px-2 py-0.5 text-[10px] font-medium", chip)}>{isInst ? "Installment" : "Recurring"}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <span className="font-heading text-base font-bold tabular-nums text-primary">{money(item.amount)}</span>
        <span className="text-xs font-normal text-text-muted">/{isInst ? "installment" : (item.frequency || "monthly").toLowerCase()}</span>
      </td>
      <td className="px-4 py-4">
        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold", statusStyle(item.status))}>
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
          {statusLabel(item.status)}
        </span>
      </td>
      <td className="px-4 py-4"><NextOrProgress item={item} past={past} /></td>
      <td className="px-4 py-4">
        <span className="text-sm capitalize text-text-muted">{item.paymentMethod}</span>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center justify-end gap-1">
          {item.receiptUrl && (
            <a href={item.receiptUrl} target="_blank" rel="noopener noreferrer" title="View receipt" className={iconBtn}>
              <Receipt className="h-4 w-4" />
            </a>
          )}
          <PlanActions item={item} past={past} busy={busy} onExtend={onExtend} onResume={onResume} onCancel={onCancel} />
          {past && !item.receiptUrl && <span className="text-xs text-gray-300">—</span>}
        </div>
      </td>
    </motion.tr>
  );
}

/* ── One subscription / installment card (mobile) ─────────────────────── */
function SubMobile({ item, past, busy, onExtend, onResume, onCancel, index = 0 }) {
  const isInst = item.kind === "installment";
  const Icon = isInst ? Layers : Repeat;
  const chip = typeChip(item.kind);
  const showActions = !past || item.receiptUrl;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut", delay: Math.min(index * 0.03, 0.3) }}
      className="p-4"
    >
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 grid h-9 w-9 shrink-0 place-items-center", chip)}><Icon className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-medium text-primary">{item.cause}</p>
            <span className="shrink-0 font-heading text-base font-bold tabular-nums text-primary">
              {money(item.amount)}
              <span className="text-xs font-normal text-text-muted">/{isInst ? "inst." : (item.frequency || "monthly").toLowerCase().slice(0, 3)}</span>
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-text-muted">
            <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold", statusStyle(item.status))}>
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
              {statusLabel(item.status)}
            </span>
            {isInst ? (
              <span>{item.paidInstallments}/{item.totalInstallments} paid</span>
            ) : !past ? (
              <span>Next {fmtDate(item.nextPayment)}</span>
            ) : item.cancellationDate ? (
              <span>{fmtDate(item.cancellationDate)}</span>
            ) : null}
          </div>
          {showActions && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {item.receiptUrl && (
                <a href={item.receiptUrl} target="_blank" rel="noopener noreferrer" className={btnGhost}>
                  <Receipt className="h-4 w-4" /> Receipt
                </a>
              )}
              <PlanActions item={item} past={past} busy={busy} onExtend={onExtend} onResume={onResume} onCancel={onCancel} compact />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── One subscription / installment card (grid view) ──────────────────── */
function SubCard({ item, past, busy, onExtend, onResume, onCancel, index = 0 }) {
  const st = (item.status || "").toLowerCase();
  const isInst = item.kind === "installment";
  const TIcon = isInst ? Layers : Repeat;
  const chip = typeChip(item.kind);
  const pct = isInst && item.totalInstallments ? Math.round((item.paidInstallments / item.totalInstallments) * 100) : 0;
  const endedWithDate = past && (item.status === "cancelled" || item.status === "ended") && item.cancellationDate;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: Math.min(index * 0.04, 0.32) }}
      className="group flex flex-col border border-gray-100 bg-white shadow-sm transition-all hover:border-accent/30 hover:shadow-md"
    >
      {/* Header band */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3">
        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide", chip)}>
          <TIcon className="h-3.5 w-3.5" /> {isInst ? "Installment" : "Recurring"}
        </span>
        <span className={cn("inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold", statusStyle(item.status))}>
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
          {statusLabel(item.status)}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        {/* Title + amount */}
        <h3 className="truncate font-heading text-base font-bold text-primary" title={item.cause}>{item.cause}</h3>
        <p className="mt-1 font-heading text-3xl font-bold leading-tight text-accent">
          {money(item.amount)}
          <span className="text-sm font-normal text-text-muted">/{isInst ? "installment" : (item.frequency || "monthly").toLowerCase()}</span>
        </p>

        {/* Installment progress */}
        {isInst && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs text-text-muted">
              <span>{item.paidInstallments} of {item.totalInstallments} paid</span>
              <span className="font-semibold text-primary">{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div className={cn("h-full rounded-full", st === "completed" ? "bg-emerald-500" : past ? "bg-gray-300" : "bg-gradient-to-r from-accent to-accent-light")} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* Meta — definition grid */}
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-100 pt-4 text-sm">
          {!past && (
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-text-muted/70">Next payment</dt>
              <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-gray-800">
                <Calendar className="h-4 w-4 shrink-0 text-accent" /> {fmtDate(item.nextPayment)}
              </dd>
            </div>
          )}
          {endedWithDate && (
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-text-muted/70">{item.status === "cancelled" ? "Cancelled" : "Ended"}</dt>
              <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-gray-800">
                <Ban className="h-4 w-4 shrink-0 text-gray-400" /> {fmtDate(item.cancellationDate)}
              </dd>
            </div>
          )}
          <div className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wide text-text-muted/70">Payment method</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 font-medium capitalize text-gray-800">
              <CreditCard className="h-4 w-4 shrink-0 text-accent" /> <span className="truncate">{item.paymentMethod}</span>
            </dd>
          </div>
        </dl>

        {/* Status messages */}
        {past && st === "completed" && (
          <p className="mt-3 flex items-center gap-2 text-sm text-emerald-600"><CheckCircle className="h-4 w-4 shrink-0" /> Fully paid — thank you!</p>
        )}
        {!past && st === "past_due" && (
          <p className="mt-3 flex items-center gap-2 text-sm text-red-600"><AlertCircle className="h-4 w-4 shrink-0" /> Payment failed — please check your card</p>
        )}

        {item.cancellationReason && (
          <p className="mt-3 border border-gray-100 bg-gray-50 p-2.5 text-xs text-gray-600"><span className="font-medium text-gray-700">Reason:</span> {item.cancellationReason}</p>
        )}

        {/* Footer: receipt + actions on a single line */}
        {(item.receiptUrl || !past) && (
          <div className="mt-auto pt-5">
            {!past && st === "pending_cancellation" ? (
              <div className="space-y-3">
                {item.receiptUrl && (
                  <a
                    href={item.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-accent/50 hover:text-accent"
                  >
                    <Receipt className="h-4 w-4" /> View receipt <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <div className="flex items-start gap-2 border border-orange-100 bg-orange-50 p-3 text-sm text-orange-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> Cancellation pending approval.
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {item.receiptUrl && (
                  <a
                    href={item.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-2 border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-accent/50 hover:text-accent"
                  >
                    <Receipt className="h-4 w-4" /> View receipt <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                {!past && <PlanActions item={item} past={past} busy={busy} onExtend={onExtend} onResume={onResume} onCancel={onCancel} compact />}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

const Subscriptions = () => {
  const cached = DonationService.getCachedUserDonations();
  const [orders, setOrders] = useState(cached?.orders || []);
  const [loading, setLoading] = useState(!_subsWarmed);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem("subsView") || "list";
    } catch {
      return "list";
    }
  });
  const changeView = (v) => {
    setView(v);
    try {
      localStorage.setItem("subsView", v);
    } catch {
      /* ignore */
    }
  };

  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "past" ? "past" : "active";
  const setTab = (t) => setParams(t === "past" ? { tab: "past" } : {}, { replace: true });

  const [selected, setSelected] = useState(null);
  const [showCancel, setShowCancel] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [currentEndDate, setCurrentEndDate] = useState("");
  const [additionalPayments, setAdditionalPayments] = useState(0);

  useEffect(() => {
    // First visit this session shows the Calcite TabLoader (even if the shared
    // orders cache is already warm); revisits hydrate instantly and revalidate
    // quietly in the background.
    fetchOrders({ force: true, cold: !_subsWarmed });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOrders = async ({ force = false, cold = false } = {}) => {
    try {
      const req = DonationService.getUserDonations({ force });
      const res = cold ? await withMinDelay(req) : await req;
      if (res?.status === "Success" && Array.isArray(res.orders)) setOrders(res.orders);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to load your subscriptions");
    } finally {
      _subsWarmed = true;
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refresh = () => {
    setRefreshing(true);
    fetchOrders({ force: true }).then(() => toast.success("Refreshed"));
  };

  const { active, past } = useMemo(() => deriveBuckets(orders), [orders]);
  const items = tab === "past" ? past : active;

  const monthlyGiving = active
    .filter((i) => i.kind === "recurring" && (i.status || "").toLowerCase() === "active")
    .reduce((acc, s) => acc + (s.amount || 0) * (FREQ_MONTHLY[(s.frequency || "monthly").toLowerCase()] || 1), 0);
  const recurringCount = active.filter((i) => i.kind === "recurring").length;
  const installmentCount = active.filter((i) => i.kind === "installment").length;

  const handleResume = async (id) => {
    setBusy(true);
    try {
      await SubscriptionService.resumeSubscription(id);
      toast.success("Subscription resumed");
      await fetchOrders({ force: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to resume");
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    setBusy(true);
    try {
      await SubscriptionService.cancelSubscription(selected.id, cancelReason);
      toast.success("Cancellation requested — pending admin approval.");
      setShowCancel(false);
      setCancelReason("");
      await fetchOrders({ force: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to submit cancellation");
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateEndDate = async () => {
    if (!newEndDate) return toast.error("Please select a valid end date");
    if (new Date(newEndDate) <= new Date()) return toast.error("End date must be in the future");
    setBusy(true);
    try {
      await SubscriptionService.updateSubscriptionEndDate(selected.id, newEndDate);
      toast.success("End date updated");
      setShowEdit(false);
      await fetchOrders({ force: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update end date");
    } finally {
      setBusy(false);
    }
  };

  const calcAdditional = (sub, date) => {
    if (!sub) return;
    const cur = new Date(sub.endDate || new Date());
    const f = (sub.frequency || "monthly").toLowerCase();
    let m = 0;
    if (f === "yearly") m = (date.getFullYear() - cur.getFullYear()) * 12;
    else if (f === "weekly") m = Math.floor((date - cur) / (7 * 24 * 3600 * 1000) / 4.33);
    else m = (date.getFullYear() - cur.getFullYear()) * 12 + date.getMonth() - cur.getMonth();
    setAdditionalPayments(Math.max(0, m));
  };

  const openExtend = (sub) => {
    setSelected(sub);
    setCurrentEndDate(sub.endDate);
    const d = sub.endDate ? new Date(sub.endDate) : new Date();
    setNewEndDate(formatDateForInput(d));
    calcAdditional(sub, d);
    setShowEdit(true);
  };
  const openCancel = (sub) => {
    setSelected(sub);
    setShowCancel(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <TabLoader label="Loading subscriptions…" />
      </div>
    );
  }

  const TABS = [
    { id: "active", label: "Active", count: active.length },
    { id: "past", label: "Past", count: past.length },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Header card with gradient band + integrated stats (My Payments style) */}
      <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-4 px-6 py-7 sm:px-8" style={{ background: HEADER_GRADIENT }}>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Recurring giving</p>
            <h1 className="mt-1 font-heading text-2xl font-bold text-white">My Subscriptions</h1>
            <p className="mt-1 text-sm text-white/80">Your recurring and installment donations, all in one place.</p>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex shrink-0 items-center gap-1.5 border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} /> Refresh
          </button>
        </div>
        <div className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <HeaderStat icon={Repeat} label="Recurring donations" value={recurringCount} />
          <HeaderStat icon={Layers} label="Installment plans" value={installmentCount} />
          <HeaderStat icon={HeartHandshake} label="Est. monthly giving" value={money(monthlyGiving)} />
        </div>
      </div>

      {/* Active / Past pills + view toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const activeTab = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative isolate inline-flex items-center gap-1.5 border px-3.5 py-1.5 text-sm font-medium transition-colors duration-200",
                  activeTab
                    ? "border-accent text-accent"
                    : "border-gray-200 bg-white text-text-muted hover:border-accent/40 hover:text-primary",
                )}
              >
                {activeTab && (
                  <motion.span
                    layoutId="subsTabActive"
                    className="absolute inset-0 -z-10 bg-accent/10"
                    transition={{ type: "spring", stiffness: 500, damping: 34 }}
                  />
                )}
                {t.label}
                <span className={cn("text-xs", activeTab ? "text-accent/70" : "text-gray-400")}>{t.count}</span>
              </button>
            );
          })}
        </div>
        <div className="inline-flex border border-gray-200">
          {[
            { id: "list", Icon: List, title: "List view" },
            { id: "grid", Icon: LayoutGrid, title: "Card view" },
          ].map((v, idx) => {
            const activeView = view === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => changeView(v.id)}
                title={v.title}
                className={cn(
                  "relative isolate grid h-9 w-9 place-items-center transition-colors duration-200",
                  idx > 0 && "border-l border-gray-200",
                  activeView ? "text-white" : "text-text-muted hover:text-accent",
                )}
              >
                {activeView && (
                  <motion.span
                    layoutId="subsViewActive"
                    className="absolute inset-0 -z-10 bg-accent"
                    transition={{ type: "spring", stiffness: 500, damping: 34 }}
                  />
                )}
                <v.Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <div className="border border-gray-100 bg-white p-12 text-center shadow-sm">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-accent/10 text-accent">
            {tab === "past" ? <CheckCircle className="h-6 w-6" /> : <HeartHandshake className="h-6 w-6" />}
          </span>
          <p className="font-semibold text-gray-800">{tab === "past" ? "Nothing here yet" : "No active subscriptions"}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
            {tab === "past"
              ? "Cancelled, ended or fully-paid plans will appear here."
              : "Set up a recurring gift or installment plan and it'll show here for you to manage."}
          </p>
        </div>
      ) : (
        <motion.div
          key={`${view}-${tab}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {view === "grid" ? (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
              {items.map((item, i) => (
                <SubCard key={item.id} item={item} past={tab === "past"} busy={busy} onExtend={openExtend} onResume={handleResume} onCancel={openCancel} index={i} />
              ))}
            </div>
          ) : (
            <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-accent/10 bg-accent/5 text-left text-[11px] font-semibold uppercase tracking-wider text-accent">
                      <th className="px-4 py-3.5">Plan</th>
                      <th className="px-4 py-3.5">Amount</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">{tab === "past" ? "Ended" : "Next / progress"}</th>
                      <th className="px-4 py-3.5">Method</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <SubRow key={item.id} item={item} past={tab === "past"} busy={busy} onExtend={openExtend} onResume={handleResume} onCancel={openCancel} index={i} />
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="divide-y divide-gray-50 md:hidden">
                {items.map((item, i) => (
                  <SubMobile key={item.id} item={item} past={tab === "past"} busy={busy} onExtend={openExtend} onResume={handleResume} onCancel={openCancel} index={i} />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Cancel modal */}
      <Modal isOpen={showCancel} onClose={() => !busy && setShowCancel(false)} title="Cancel this plan?" description="This sends a cancellation request to the team." icon={XCircle}>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Reason (optional)</label>
        <input type="text" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Let us know why (optional)" className="w-full border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-accent" />
        <div className="mt-4 flex items-start gap-2 border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> Future payments will stop once approved. This can't be undone.
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setShowCancel(false)} disabled={busy} className="border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">Keep it</button>
          <button onClick={handleCancel} disabled={busy} className="inline-flex items-center gap-2 bg-red-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50">
            {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : null} Request cancellation
          </button>
        </div>
      </Modal>

      {/* Extend modal */}
      <Modal isOpen={showEdit} onClose={() => !busy && setShowEdit(false)} title="Extend subscription" description="Choose a new end date for your recurring gift." icon={Calendar}>
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Current end date</label>
          <div className="border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">{currentEndDate ? fmtDate(currentEndDate) : "Open-ended"}</div>
        </div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">New end date</label>
        <input
          type="date"
          value={newEndDate}
          min={formatDateForInput(new Date())}
          onChange={(e) => { setNewEndDate(e.target.value); calcAdditional(selected, new Date(e.target.value)); }}
          className="w-full border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        {additionalPayments > 0 && (
          <div className="mt-4 flex items-start gap-2 border border-accent/20 bg-accent/5 p-3 text-sm text-primary">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>Adds about <strong>{additionalPayments}</strong> more {(selected?.frequency || "monthly").toLowerCase()} payment{additionalPayments === 1 ? "" : "s"} of {money(selected?.amount)} each.</span>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setShowEdit(false)} disabled={busy} className="border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
          <button onClick={handleUpdateEndDate} disabled={busy} className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-light disabled:opacity-50">
            {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : null} Update end date
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Subscriptions;
