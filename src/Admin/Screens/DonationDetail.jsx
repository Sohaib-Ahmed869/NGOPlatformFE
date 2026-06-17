import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  CreditCard,
  Calendar,
  DollarSign,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  MessageSquarePlus,
  Image as ImageIcon,
  Send,
  Loader2,
  Bell,
  Check,
  X,
  Receipt as ReceiptIcon,
  Hash,
  Phone,
  Mail,
  MapPin,
  User,
  Ban,
} from "lucide-react";
import { TabLoader } from "../../components/TabLoader";
import { withMinDelay } from "../../utils/minDelay";
import { useTenant } from "../../context/TenantContext";
import { cn } from "../../utils/cn";
import logo from "../../assets/logo.png";
import footer2 from "../../assets/footer3.png";
import AdminDonationService from "../../services/adminDonation.service";
import { downloadReceipt, downloadPaidPaymentsReceipt } from "../../User/Screens/recieptDownloader";
import {
  HEADER_GRADIENT,
  money,
  fmtDate,
  fmtDateTime,
  formatAddress,
  statusStyle,
  statusLabel,
  categoryOf,
  TYPE_LABEL,
} from "./donationUtils";
import { HeaderStat, StatusBadge, TypeChip, Avatar } from "./donationShared";

/* ── Section card ────────────────────────────────────────────────────────── */
function SectionCard({ title, icon: Icon, right, className, children }) {
  return (
    <div className={cn("overflow-hidden border border-gray-100 bg-white shadow-sm", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-primary">
          {Icon && <Icon className="h-4 w-4 text-accent" />} {title}
        </h2>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-text-muted/70" />}
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-text-muted/70">{label}</p>
        <p className="font-medium text-gray-800 break-words">{value}</p>
      </div>
    </div>
  );
}

const SUCCEEDED = ["succeeded", "completed"];

const DonationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { organisation } = useTenant();
  const orgInfo = {
    name: organisation?.name,
    email: organisation?.contactEmail,
    phone: organisation?.contactPhone,
    website: organisation?.website,
  };

  const cameFromList = !!location.state?.item;
  const [donation, setDonation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);

  // Add-update form state (individual donations)
  const [updateType, setUpdateType] = useState("follow-up");
  const [updateComment, setUpdateComment] = useState("");
  const [updateImages, setUpdateImages] = useState([]);
  const [submittingUpdate, setSubmittingUpdate] = useState(false);

  const fetchDonation = async ({ initial = false } = {}) => {
    try {
      const req = AdminDonationService.getDonationById(id);
      const res = await (initial && !cameFromList ? withMinDelay(req) : req);
      if (res?.donation) setDonation(res.donation);
      else if (initial) setNotFound(true);
    } catch (err) {
      console.error("Donation detail error:", err);
      if (initial) setNotFound(true);
      else toast.error("Failed to refresh donation");
    } finally {
      if (initial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonation({ initial: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const back = () => navigate("/admin/donations");

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <TabLoader label="Loading donation…" />
      </div>
    );
  }

  if (notFound || !donation) {
    return (
      <div className="w-full space-y-6">
        <button
          type="button"
          onClick={back}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" /> Back to donations
        </button>
        <div className="border border-gray-100 bg-white p-12 text-center shadow-sm">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-accent/10 text-accent">
            <FileText className="h-6 w-6" />
          </span>
          <p className="font-semibold text-gray-800">Donation not found</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">This donation may have been removed.</p>
        </div>
      </div>
    );
  }

  /* ── Derived ───────────────────────────────────────────────────────────── */
  const category = categoryOf(donation);
  const isIndividual =
    ["single", "one-time", "one_time"].includes(donation.paymentType) || !donation.paymentType;
  const donorUpdates = donation.donorUpdates || [];
  const recurring = donation.recurringDetails || null;
  const installments = donation.installmentDetails || null;
  const paymentHistory = recurring?.paymentHistory || [];

  const subtotal = (donation.items || []).reduce((sum, it) => sum + (it.price || 0) * (it.quantity || 1), 0);
  const adminContribution =
    donation.adminCostContribution && donation.adminCostContribution.included ? donation.adminCostContribution.amount : 0;
  const totalPaid =
    donation.paymentType === "recurring"
      ? paymentHistory.filter((p) => SUCCEEDED.includes((p.status || "").toLowerCase())).reduce((s, p) => s + (p.amount || 0), 0)
      : donation.totalAmount || 0;
  const receiptAvailable =
    donation.paymentType === "installments" && installments
      ? (installments.installmentsPaid || 0) > 0
      : ["completed", "processing", "ended"].includes(donation.paymentStatus);

  /* ── Actions ───────────────────────────────────────────────────────────── */
  const handleDownloadReceipt = () => {
    if (donation.paymentType === "recurring" && paymentHistory.length) {
      const succeeded = paymentHistory.filter((p) => p.status === "succeeded" || p.status === "completed");
      if (succeeded.length > 0) {
        downloadPaidPaymentsReceipt(donation, orgInfo);
        return;
      }
    }
    downloadReceipt(donation, { logoUrl: logo, charityLogoUrl: footer2 }, orgInfo);
  };

  const updateStatus = async (paymentStatus) => {
    try {
      setBusy(true);
      const requestData = { paymentStatus, isRecurring: donation.paymentType === "recurring", paymentType: donation.paymentType };
      if (paymentStatus === "cancelled") {
        const reason = prompt("Please provide a reason for cancellation:", "Cancelled by admin");
        if (!reason) {
          setBusy(false);
          return;
        }
        requestData.cancellationReason = reason;
      }
      const res = await AdminDonationService.updateDonationStatus(donation._id, requestData);
      if (res && (res.status === "Success" || res.status === "success")) {
        toast.success(paymentStatus === "cancelled" ? "Donation cancelled" : `Status updated to ${paymentStatus}`);
        AdminDonationService.invalidateDonationsCache();
        await fetchDonation();
      } else {
        toast.error("Failed to update status: " + (res?.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Status update error:", error);
      toast.error("Failed to update status" + (error.response?.data?.message ? `: ${error.response.data.message}` : ""));
    } finally {
      setBusy(false);
    }
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setUpdateImages((prev) => [...prev, ...files].slice(0, 5));
    e.target.value = "";
  };
  const removeImage = (idx) => setUpdateImages((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmitUpdate = async () => {
    if (!updateComment.trim() && updateImages.length === 0) {
      toast.error("Add a comment or at least one image");
      return;
    }
    try {
      setSubmittingUpdate(true);
      await AdminDonationService.addDonorUpdate(donation._id, {
        type: updateType,
        comment: updateComment.trim(),
        images: updateImages,
      });
      toast.success(
        updateType === "close-off" ? "Close-off sent — donation marked complete" : "Follow-up update shared with the donor",
      );
      setUpdateComment("");
      setUpdateImages([]);
      setUpdateType("follow-up");
      AdminDonationService.invalidateDonationsCache();
      await fetchDonation();
    } catch (error) {
      console.error("Add donor update error:", error);
      toast.error(error?.response?.data?.message || "Failed to send update to donor");
    } finally {
      setSubmittingUpdate(false);
    }
  };

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
        <ArrowLeft className="h-4 w-4" /> Back to donations
      </button>

      {/* Header card with gradient band + integrated stats */}
      <div className="overflow-hidden border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-7 sm:px-8" style={{ background: HEADER_GRADIENT }}>
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={donation.donorDetails?.name} onGradient />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Donation</p>
              <h1 className="mt-0.5 truncate font-heading text-2xl font-bold text-white">
                {donation.donorDetails?.name || "Anonymous"}
              </h1>
              <p className="mt-0.5 truncate text-sm text-white/80">{donation.donorDetails?.email || "—"}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {receiptAvailable && (
              <button
                type="button"
                onClick={handleDownloadReceipt}
                className="inline-flex items-center gap-1.5 border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <Download className="h-4 w-4" /> Download receipt
              </button>
            )}
            <div className="flex items-center gap-2">
              <TypeChip category={category} />
              <StatusBadge status={donation.paymentStatus} />
            </div>
            {donation.donationId && (
              <span className="inline-flex items-center gap-1 font-mono text-xs text-white/70" title={donation.donationId}>
                <Hash className="h-3.5 w-3.5" /> {donation.donationId}
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 divide-y divide-gray-100 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <HeaderStat icon={DollarSign} label="Amount" value={money(donation.totalAmount)} />
          <HeaderStat icon={CheckCircle} label="Total paid" value={money(totalPaid)} />
          <HeaderStat icon={CreditCard} label="Method" value={<span className="capitalize">{donation.paymentMethod || "—"}</span>} />
          <HeaderStat icon={Calendar} label="Date" value={fmtDate(donation.createdAt)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-1">
          <SectionCard title="Donor information" icon={User}>
            <div className="space-y-4">
              <InfoRow icon={User} label="Name" value={donation.donorDetails?.name || "Anonymous"} />
              <InfoRow icon={Mail} label="Email" value={donation.donorDetails?.email || "—"} />
              {donation.donorDetails?.phone && <InfoRow icon={Phone} label="Phone" value={donation.donorDetails.phone} />}
              {donation.donorDetails?.address && (
                <InfoRow icon={MapPin} label="Address" value={formatAddress(donation.donorDetails.address)} />
              )}
            </div>
          </SectionCard>

          <SectionCard title="Payment information" icon={CreditCard}>
            <div className="space-y-4">
              <InfoRow icon={CreditCard} label="Payment method" value={<span className="capitalize">{donation.paymentMethod || "—"}</span>} />
              <InfoRow label="Payment type" value={TYPE_LABEL[category]} />

              {category === "installments" && installments && (
                <>
                  <InfoRow
                    label="Installments"
                    value={`${installments.installmentsPaid || 0} of ${installments.numberOfInstallments || 0} paid`}
                  />
                  <InfoRow icon={Calendar} label="Next installment" value={fmtDate(installments.nextInstallmentDate)} />
                </>
              )}

              {category === "recurring" && recurring && (
                <>
                  <InfoRow label="Frequency" value={<span className="capitalize">{recurring.frequency}</span>} />
                  <InfoRow icon={Calendar} label="Start date" value={fmtDate(recurring.startDate)} />
                  <InfoRow icon={Calendar} label="End date" value={recurring.endDate ? fmtDate(recurring.endDate) : "Open-ended"} />
                  <InfoRow
                    label="Total payments"
                    value={`${paymentHistory.length || 0} of ${recurring.totalPayments || 0}`}
                  />
                  {recurring.status && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-text-muted/70">Subscription status</p>
                      <span className={cn("mt-1 inline-flex items-center px-2.5 py-1 text-[11px] font-semibold", statusStyle(recurring.status))}>
                        {statusLabel(recurring.status)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </SectionCard>

          {receiptAvailable && (
            <SectionCard title="Tax receipt" icon={FileText}>
              <div className="space-y-1.5 text-sm text-gray-600">
                <p>
                  <span className="font-medium text-gray-700">Receipt #:</span>{" "}
                  {donation.receiptNumber || "Generated on download"}
                </p>
                {donation.taxReceiptDetails?.dateIssued && (
                  <p>
                    <span className="font-medium text-gray-700">Issued:</span> {fmtDate(donation.taxReceiptDetails.dateIssued)}
                  </p>
                )}
                {donation.taxReceiptDetails?.taxDeductibleAmount != null && (
                  <p>
                    <span className="font-medium text-gray-700">Tax-deductible:</span>{" "}
                    {money(donation.taxReceiptDetails.taxDeductibleAmount)}
                  </p>
                )}
                <p className="pt-1 text-xs italic text-text-muted">
                  {donation.paymentType === "recurring"
                    ? "Recurring donations get a separate receipt for each successful payment."
                    : "This donation may be tax-deductible."}
                </p>
              </div>
            </SectionCard>
          )}

          {donation.paymentStatus === "cancelled" && donation.cancellationDetails && (
            <SectionCard title="Cancellation" icon={Ban}>
              <div className="space-y-1.5 text-sm">
                <p className="text-gray-600">
                  <span className="font-medium text-gray-700">Reason:</span> {donation.cancellationDetails.reason || "—"}
                </p>
                <p className="text-gray-600">
                  <span className="font-medium text-gray-700">Date:</span> {fmtDate(donation.cancellationDetails.date)}
                </p>
              </div>
            </SectionCard>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Items + summary */}
          <SectionCard title="Donation items">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-accent/10 bg-accent/5 text-left text-[11px] font-semibold uppercase tracking-wider text-accent">
                    <th className="py-2.5 pr-4">Item</th>
                    <th className="px-4 py-2.5">Price</th>
                    <th className="px-4 py-2.5">Qty</th>
                    <th className="px-4 py-2.5">On behalf of</th>
                    <th className="py-2.5 pl-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(donation.items || []).map((it, idx) => (
                    <tr key={idx} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-primary">{it.title}</p>
                        {it.description && <p className="mt-0.5 text-xs text-text-muted">{it.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-text-muted">{money(it.price || 0)}</td>
                      <td className="px-4 py-3 text-text-muted">{it.quantity || 1}</td>
                      <td className="px-4 py-3 text-text-muted">{it.onBehalfOf || "—"}</td>
                      <td className="py-3 pl-4 text-right font-medium text-primary">
                        {money((it.price || 0) * (it.quantity || 1))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-muted">Subtotal</dt>
                <dd className="font-medium text-gray-800">{money(subtotal)}</dd>
              </div>
              {adminContribution > 0 && (
                <div className="flex justify-between">
                  <dt className="text-text-muted">Admin cost contribution</dt>
                  <dd className="font-medium text-gray-800">{money(adminContribution)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-100 pt-2">
                <dt className="font-semibold text-primary">Total per payment</dt>
                <dd className="font-heading text-base font-bold text-accent">{money(donation.totalAmount || 0)}</dd>
              </div>
              {donation.paymentType === "recurring" && (
                <div className="flex justify-between">
                  <dt className="font-semibold text-primary">Total paid to date</dt>
                  <dd className="font-heading text-base font-bold text-accent">{money(totalPaid)}</dd>
                </div>
              )}
            </dl>
          </SectionCard>

          {/* Recurring payment history */}
          {category === "recurring" && paymentHistory.length > 0 && (
            <SectionCard
              title="Payment history"
              icon={CreditCard}
              right={<span className="text-xs text-text-muted">{paymentHistory.length} payments</span>}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-accent/10 bg-accent/5 text-left text-[11px] font-semibold uppercase tracking-wider text-accent">
                      <th className="py-2.5 pr-4">Date</th>
                      <th className="px-4 py-2.5">Amount</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="py-2.5 pl-4">Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...paymentHistory]
                      .sort((a, b) => new Date(a.date) - new Date(b.date))
                      .map((p, idx) => (
                        <tr key={idx} className="border-b border-gray-50 last:border-0">
                          <td className="py-3 pr-4 text-text-muted">{fmtDateTime(p.date)}</td>
                          <td className="px-4 py-3 font-medium text-primary">{money(p.amount)}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={p.status} />
                          </td>
                          <td className="py-3 pl-4 font-mono text-xs text-text-muted">{p.invoiceId || "—"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* Bank transfer proof + approve / cancel */}
          {donation.paymentMethod === "bank" && (
            <SectionCard title="Payment proof" icon={FileText}>
              {donation.receiptUrl ? (
                <div className="flex items-center justify-between border border-gray-100 bg-gray-50 p-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <FileText className="h-4 w-4 text-accent" /> Proof of payment
                  </span>
                  <button
                    type="button"
                    onClick={() => window.open(donation.receiptUrl, "_blank", "noopener,noreferrer")}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                  >
                    <Eye className="h-4 w-4" /> View proof
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-2 border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>No proof of payment uploaded yet. The donor has been notified to upload it.</span>
                </div>
              )}

              {donation.paymentStatus === "pending" && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => updateStatus("completed")}
                    disabled={busy}
                    className="inline-flex items-center gap-2 bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve donation
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus("cancelled")}
                    disabled={busy}
                    className="inline-flex items-center gap-2 border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" /> Cancel donation
                  </button>
                </div>
              )}
            </SectionCard>
          )}

          {/* Donor updates — follow-up / close-off (individual donations) */}
          {isIndividual && (
            <SectionCard title="Donor updates" icon={Bell}>
              {/* Timeline */}
              {donorUpdates.length > 0 ? (
                <div className="mb-5 space-y-3">
                  {[...donorUpdates]
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .map((u, idx) => (
                      <div
                        key={u._id || idx}
                        className={cn(
                          "border p-4",
                          u.type === "close-off" ? "border-emerald-200 bg-emerald-50" : "border-blue-200 bg-blue-50",
                        )}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium",
                              u.type === "close-off" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800",
                            )}
                          >
                            {u.type === "close-off" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <MessageSquarePlus className="h-3.5 w-3.5" />}
                            {u.type === "close-off" ? "Close-off" : "Follow-up"}
                          </span>
                          <span className="text-xs text-text-muted">{fmtDateTime(u.createdAt)}</span>
                        </div>
                        {u.comment && <p className="whitespace-pre-line text-sm text-gray-700">{u.comment}</p>}
                        {u.images && u.images.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {u.images.map((img, i) => (
                              <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={img}
                                  alt={`Update ${i + 1}`}
                                  className="h-20 w-20 border border-gray-200 object-cover hover:opacity-80"
                                />
                              </a>
                            ))}
                          </div>
                        )}
                        {u.createdByName && <p className="mt-2 text-xs text-text-muted/70">by {u.createdByName}</p>}
                      </div>
                    ))}
                </div>
              ) : (
                <p className="mb-5 text-sm text-text-muted">No updates shared with the donor yet.</p>
              )}

              {/* Add update form */}
              <div className="border border-gray-200 bg-gray-50 p-4">
                <h4 className="mb-3 text-sm font-semibold text-gray-800">Send an update to the donor</h4>
                <div className="mb-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUpdateType("follow-up")}
                    className={cn(
                      "inline-flex items-center gap-1.5 border px-3 py-1.5 text-sm font-medium transition-colors",
                      updateType === "follow-up"
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    <MessageSquarePlus className="h-4 w-4" /> Follow-up
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdateType("close-off")}
                    className={cn(
                      "inline-flex items-center gap-1.5 border px-3 py-1.5 text-sm font-medium transition-colors",
                      updateType === "close-off"
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Close-off
                  </button>
                </div>

                {updateType === "close-off" && (
                  <p className="mb-3 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    A close-off marks this donation as completed and lets the donor know their contribution was delivered.
                  </p>
                )}

                <textarea
                  value={updateComment}
                  onChange={(e) => setUpdateComment(e.target.value)}
                  rows={3}
                  placeholder={
                    updateType === "close-off"
                      ? "Describe how the donation was used / delivered…"
                      : "Share a progress update with the donor…"
                  }
                  className="w-full resize-none border border-gray-300 px-3 py-2 text-sm outline-none focus:border-accent"
                />

                {updateImages.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {updateImages.map((file, idx) => (
                      <div key={idx} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Selected ${idx + 1}`}
                          className="h-20 w-20 border border-gray-200 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-white hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
                    <ImageIcon className="h-4 w-4" /> Add images
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                      disabled={updateImages.length >= 5}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleSubmitUpdate}
                    disabled={submittingUpdate}
                    className="inline-flex items-center gap-2 bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-light disabled:opacity-50"
                  >
                    {submittingUpdate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {updateType === "close-off" ? "Send close-off" : "Send update"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-text-muted/70">Up to 5 images. The donor will be notified by email.</p>
              </div>
            </SectionCard>
          )}

          {/* Receipt unavailable hint */}
          {!receiptAvailable && (
            <div className="flex items-center gap-2 border border-gray-100 bg-white p-4 text-sm text-text-muted shadow-sm">
              <ReceiptIcon className="h-4 w-4 shrink-0" />
              {donation.paymentStatus === "pending"
                ? "Receipt will be available once the payment completes."
                : "A tax receipt isn't available for this donation."}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default DonationDetail;
