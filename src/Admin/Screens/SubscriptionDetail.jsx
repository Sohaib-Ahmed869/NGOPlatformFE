import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CreditCard,
  DollarSign,
  CheckCircle,
  Repeat,
  Hash,
  AlertCircle,
  Ban,
  Receipt,
  ExternalLink,
} from "lucide-react";
import { TabLoader } from "../../components/TabLoader";
import { withMinDelay } from "../../utils/minDelay";
import { cn } from "../../utils/cn";
import SubscriptionService from "../../services/subscription.service";
import {
  HEADER_GRADIENT,
  money,
  fmtDate,
  ENDED,
  mapSubscriptionDoc,
  buildPaymentHistory,
} from "./subscriptionUtils";
import { HeaderStat, StatusBadge, FrequencyChip, Avatar } from "./subscriptionShared";

/* Definition cell used in the plan-summary card. */
function SummaryItem({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-text-muted/70">{label}</dt>
      <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-gray-800">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-accent" />}
        <span className="truncate">{value}</span>
      </dd>
    </div>
  );
}

const SubscriptionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // The list row is only a light projection (no payment history / collected),
  // so we always fetch the full record before rendering. Arriving from the list
  // skips the artificial min-delay (snappy); a direct visit keeps it (polished).
  const cameFromList = !!location.state?.item;
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const req = SubscriptionService.getAdminSubscriptionById(id);
        const res = await (cameFromList ? req : withMinDelay(req));
        const doc = res?.data?.subscription;
        if (!alive) return;
        if (!doc) setNotFound(true);
        else setItem(mapSubscriptionDoc(doc));
      } catch (err) {
        if (!alive) return;
        toast.error(err?.message || "Failed to load subscription");
        setNotFound(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const back = () => navigate("/admin/subscriptions");

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <TabLoader label="Loading subscription…" />
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="w-full space-y-6">
        <button
          type="button"
          onClick={back}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" /> Back to subscriptions
        </button>
        <div className="border border-gray-100 bg-white p-12 text-center shadow-sm">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-accent/10 text-accent">
            <Repeat className="h-6 w-6" />
          </span>
          <p className="font-semibold text-gray-800">Subscription not found</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
            This plan may have been removed, or it isn’t a recurring donation.
          </p>
        </div>
      </div>
    );
  }

  const st = (item.status || "").toLowerCase();
  const ended = ENDED.includes(st);
  const freq = (item.frequency || "monthly").toLowerCase();
  const schedule = buildPaymentHistory(item);

  return (
    <motion.div
      className="w-full space-y-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {/* Back */}
      <button
        type="button"
        onClick={back}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" /> Back to subscriptions
      </button>

      {/* Header card with gradient band + integrated stats */}
      <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-7 sm:px-8" style={{ background: HEADER_GRADIENT }}>
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={item.donor} onGradient />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Recurring plan</p>
              <h1 className="mt-0.5 truncate font-heading text-2xl font-bold text-white">{item.donor}</h1>
              <p className="mt-0.5 truncate text-sm text-white/80">{item.email}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={item.status} />
            {item.donationId && (
              <span className="inline-flex items-center gap-1 font-mono text-xs text-white/70" title={item.donationId}>
                <Hash className="h-3.5 w-3.5" /> {item.donationId}
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 divide-y divide-gray-100 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <HeaderStat icon={DollarSign} label={`Per ${freq}`} value={money(item.amount)} />
          <HeaderStat icon={CheckCircle} label="Collected" value={money(item.collected)} />
          <HeaderStat icon={Repeat} label="Payments made" value={item.totalPayments ?? 0} />
          <HeaderStat icon={Clock} label="Next payment" value={ended ? "—" : fmtDate(item.nextPayment)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Plan summary */}
        <div className="flex flex-col border border-gray-100 bg-white shadow-sm lg:col-span-1">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3">
            <FrequencyChip frequency={item.frequency} />
          </div>
          <div className="flex flex-1 flex-col p-5">
            <p className="font-heading text-3xl font-bold leading-tight text-accent">
              {money(item.amount)}
              <span className="text-sm font-normal text-text-muted">/{freq}</span>
            </p>
            <p className="mt-0.5 text-sm text-text-muted">{item.cause || "Recurring donation"}</p>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-gray-100 pt-4 text-sm">
              <SummaryItem icon={CheckCircle} label="Total collected" value={money(item.collected)} />
              <SummaryItem icon={Calendar} label="Started" value={fmtDate(item.startDate)} />
              <SummaryItem
                icon={ended ? Ban : Clock}
                label={ended ? "Ended" : "Next payment"}
                value={fmtDate(ended ? item.cancellationDate || item.endDate : item.nextPayment)}
              />
              <SummaryItem icon={CreditCard} label="Method" value={<span className="capitalize">{item.paymentMethod}</span>} />
              <SummaryItem icon={Calendar} label="End date" value={item.endDate ? fmtDate(item.endDate) : "Open-ended"} />
            </dl>

            {st === "active" && (
              <p className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle className="h-4 w-4 shrink-0" /> Active &amp; billing
              </p>
            )}
            {st === "past_due" && (
              <p className="mt-3 flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" /> Payment failed — card needs attention
              </p>
            )}
            {item.cancellationReason && (
              <p className="mt-3 border border-gray-100 bg-gray-50 p-2.5 text-xs text-gray-600">
                <span className="font-medium text-gray-700">Cancellation reason:</span> {item.cancellationReason}
              </p>
            )}

            {item.receiptUrl && (
              <div className="mt-auto pt-5">
                <a
                  href={item.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-accent/50 hover:text-accent"
                >
                  <Receipt className="h-4 w-4" /> Latest receipt <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Payment history */}
        <div className="overflow-hidden border border-gray-100 bg-white shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-primary">Payment history</h2>
            <span className="text-xs text-text-muted">{item.history.length} charges</span>
          </div>
          {schedule.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-text-muted">No payments recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-accent/10 bg-accent/5 text-left text-[11px] font-semibold uppercase tracking-wider text-accent">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((s) => (
                    <tr
                      key={s.n}
                      className={cn("border-b border-gray-50 last:border-0", s.status === "upcoming" && "text-text-muted")}
                    >
                      <td className="px-4 py-3 font-medium text-primary">{s.n}</td>
                      <td className="px-4 py-3 text-text-muted">
                        {s.date ? (
                          <span className="inline-flex items-center gap-1" title={s.projected ? "Projected date" : undefined}>
                            {s.projected && <span className="text-gray-300">~</span>}
                            {fmtDate(s.date)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-primary">{money(s.amount)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={s.status} />
                        {s.failureReason && (
                          <span className="mt-1 flex items-center gap-1 text-[11px] text-red-500">
                            <AlertCircle className="h-3 w-3 shrink-0" /> {s.failureReason}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {s.receiptUrl ? (
                          <a
                            href={s.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="View receipt"
                            className="inline-grid h-8 w-8 place-items-center text-gray-400 transition-colors hover:bg-accent/5 hover:text-accent"
                          >
                            <Receipt className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {schedule.some((s) => s.projected) && (
                <p className="border-t border-gray-100 px-4 py-2.5 text-[11px] text-text-muted">
                  <span className="text-gray-400">~</span> Projected date — the next scheduled payment.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SubscriptionDetail;
