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
  TrendingUp,
  Hash,
  AlertCircle,
  Receipt,
  ExternalLink,
  Layers,
} from "lucide-react";
import { TabLoader } from "../../components/TabLoader";
import { withMinDelay } from "../../utils/minDelay";
import { cn } from "../../utils/cn";
import AdminDonationService from "../../services/adminDonation.service";
import { HEADER_GRADIENT, money, fmtDate, mapInstallmentDoc, buildSchedule } from "./installmentUtils";
import { HeaderStat, StatusBadge, TypeChip, Avatar, ProgressBar } from "./installmentShared";

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

const InstallmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Navigated from the list → render instantly from the passed-in plan. On a
  // direct visit / refresh there's no state, so fetch the full record by id.
  const passed = location.state?.item || null;
  const [item, setItem] = useState(passed);
  const [loading, setLoading] = useState(!passed);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (passed) return;
    let alive = true;
    (async () => {
      try {
        const res = await withMinDelay(AdminDonationService.getDonationById(id));
        const doc = res?.donation;
        if (!alive) return;
        if (!doc || doc.paymentType !== "installments") {
          setNotFound(true);
        } else {
          setItem(mapInstallmentDoc(doc));
        }
      } catch (err) {
        if (!alive) return;
        toast.error(err?.response?.data?.message || err.message || "Failed to load installment");
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

  const back = () => navigate("/admin/installments");

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <TabLoader label="Loading installment…" />
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
          <ArrowLeft className="h-4 w-4" /> Back to installments
        </button>
        <div className="border border-gray-100 bg-white p-12 text-center shadow-sm">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-accent/10 text-accent">
            <Layers className="h-6 w-6" />
          </span>
          <p className="font-semibold text-gray-800">Installment not found</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
            This plan may have been removed, or it isn’t an installment donation.
          </p>
        </div>
      </div>
    );
  }

  const isComplete = item.status === "completed";
  const remaining = Math.max(0, item.total - item.paid) * item.installmentAmount;

  // Full plan timeline: processed installments + projected upcoming ones.
  const schedule = buildSchedule(item);

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
        <ArrowLeft className="h-4 w-4" /> Back to installments
      </button>

      {/* Header card with gradient band + integrated stats (My Subscriptions style) */}
      <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-7 sm:px-8" style={{ background: HEADER_GRADIENT }}>
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={item.donor} onGradient />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Installment plan</p>
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
          <HeaderStat icon={DollarSign} label="Per installment" value={money(item.installmentAmount)} />
          <HeaderStat icon={CheckCircle} label="Collected" value={money(item.collected)} />
          <HeaderStat icon={TrendingUp} label="Remaining" value={money(remaining)} />
          <HeaderStat icon={Layers} label="Installments paid" value={`${item.paid} / ${item.total}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Plan summary */}
        <div className="flex flex-col border border-gray-100 bg-white shadow-sm lg:col-span-1">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3">
            <TypeChip />
          </div>
          <div className="flex flex-1 flex-col p-5">
            <p className="font-heading text-3xl font-bold leading-tight text-accent">
              {money(item.installmentAmount)}
              <span className="text-sm font-normal text-text-muted">/installment</span>
            </p>
            <p className="mt-0.5 text-sm text-text-muted">{item.cause}</p>

            <div className="mt-4">
              <ProgressBar paid={item.paid} total={item.total} status={item.status} />
            </div>
            {isComplete && (
              <p className="mt-2 flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle className="h-4 w-4 shrink-0" /> Fully paid
              </p>
            )}

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-gray-100 pt-4 text-sm">
              <SummaryItem icon={DollarSign} label="Total plan" value={money(item.amount)} />
              <SummaryItem icon={Calendar} label="Started" value={fmtDate(item.startDate)} />
              <SummaryItem
                icon={Clock}
                label={isComplete ? "Last payment" : "Next payment"}
                value={fmtDate(isComplete ? item.date : item.nextPayment)}
              />
              <SummaryItem icon={CreditCard} label="Method" value={<span className="capitalize">{item.paymentMethod}</span>} />
            </dl>

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

        {/* Payment schedule */}
        <div className="overflow-hidden border border-gray-100 bg-white shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-primary">Payment schedule</h2>
            <span className="text-xs text-text-muted">{schedule.length} installments</span>
          </div>
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
                    className={cn(
                      "border-b border-gray-50 last:border-0",
                      s.status === "upcoming" && "text-text-muted",
                    )}
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
          </div>
          {schedule.some((s) => s.projected) && (
            <p className="border-t border-gray-100 px-4 py-2.5 text-[11px] text-text-muted">
              <span className="text-gray-400">~</span> Projected date — estimated from the plan schedule.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default InstallmentDetail;
