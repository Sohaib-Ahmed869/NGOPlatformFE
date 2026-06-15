import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Upload, File, X, FileCheck, AlertCircle, Eye, Trash2,
  Heart, Copy, ArrowRight, Landmark, Mail, ShieldCheck, Receipt, Loader2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTenant } from "../../context/TenantContext";
import { OrderService } from "../../services/order.service";
import Celebration from "../../components/Celebration";
import { toast } from "react-hot-toast";

// ── Animated Checkmark ──────────────────────────────────
const AnimatedCheck = () => (
  <div className="relative mx-auto mb-6 h-24 w-24">
    <motion.div
      className="absolute inset-0 rounded-full bg-white/25"
      initial={{ scale: 0 }}
      animate={{ scale: [0, 1.4, 1] }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    />
    <motion.div
      className="absolute inset-0 flex items-center justify-center rounded-full bg-white text-accent shadow-lg"
      initial={{ scale: 0, rotate: -90 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ delay: 0.2, duration: 0.5, type: "spring", stiffness: 200 }}
    >
      <motion.svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <motion.path d="M5 13l4 4L19 7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.6, duration: 0.4, ease: "easeOut" }} />
      </motion.svg>
    </motion.div>
    {[...Array(6)].map((_, i) => {
      const angle = (i / 6) * Math.PI * 2;
      return (
        <motion.div
          key={i}
          className="absolute h-2 w-2 rounded-full bg-white"
          style={{ left: "50%", top: "50%", marginLeft: -4, marginTop: -4 }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: Math.cos(angle) * 60, y: Math.sin(angle) * 60, opacity: 0, scale: 0 }}
          transition={{ delay: 0.7, duration: 0.6, ease: "easeOut" }}
        />
      );
    })}
  </div>
);

/* A labelled value row with an optional copy button. */
function CopyField({ label, value, mono }) {
  const copy = () => {
    navigator.clipboard.writeText(value || "");
    toast.success(`${label} copied`);
  };
  return (
    <div className="flex items-center justify-between gap-3 border border-gray-100 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{label}</p>
        <p className={`mt-0.5 truncate text-sm font-medium text-primary ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
      <button onClick={copy} title={`Copy ${label}`} className="grid h-8 w-8 shrink-0 place-items-center text-gray-400 transition-colors hover:bg-accent/10 hover:text-accent">
        <Copy className="h-4 w-4" />
      </button>
    </div>
  );
}

const OrderConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderDetails, paymentMethod } = location.state || {};
  const { user } = useAuth();
  const { organisation } = useTenant();

  const [receiptFile, setReceiptFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploadedReceipt, setUploadedReceipt] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (orderDetails?.donationId) checkExistingReceipt();
    window.scrollTo(0, 0);
  }, [orderDetails]);

  const checkExistingReceipt = async () => {
    try {
      const response = await OrderService.getReceiptInfo(orderDetails.donationId);
      if (response?.success && response.receipt) {
        setUploadedReceipt(response.receipt);
        setUploadSuccess(true);
      }
    } catch { /* ignore */ }
  };

  const handleFileChange = (e) => { if (e.target.files?.[0]) handleNewFile(e.target.files[0]); };
  const handleNewFile = (file) => { setReceiptFile(file); setUploadSuccess(false); setUploadError(""); };
  const removeFile = () => { setReceiptFile(null); setUploadSuccess(false); setUploadError(""); };

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleNewFile(e.dataTransfer.files[0]);
  };

  const handleReceiptUpload = async () => {
    if (!receiptFile) return;
    setUploading(true); setUploadError("");
    try {
      if (receiptFile.size > 5 * 1024 * 1024) { setUploadError("File must be under 5MB"); return; }
      if (!["image/jpeg", "image/jpg", "image/png", "image/gif"].includes(receiptFile.type)) {
        setUploadError("Only JPG, PNG, GIF allowed"); return;
      }
      const formData = new FormData();
      formData.append("receipt", receiptFile);
      formData.append("donationId", orderDetails.donationId);
      if (user?.id || user?._id) formData.append("userId", user.id || user._id);
      const data = await OrderService.uploadReceipt(formData);
      if (data?.success) { setUploadSuccess(true); if (data.receipt) setUploadedReceipt(data.receipt); }
      else setUploadError(data?.message || "Upload failed");
    } catch (err) { setUploadError(err?.message || "Upload failed"); }
    finally { setUploading(false); }
  };

  const handleViewReceipt = async () => {
    if (!uploadedReceipt?.fileUrl) return;
    try {
      const response = await OrderService.getReceiptViewUrl(orderDetails.donationId);
      const blob = new Blob([response.data], { type: response.headers["content-type"] || "application/octet-stream" });
      window.open(URL.createObjectURL(blob), "_blank", "noopener,noreferrer");
    } catch { toast.error("Failed to view receipt"); }
  };

  const handleDeleteReceipt = async () => {
    if (!confirm("Delete this receipt?")) return;
    setDeleting(true); setDeleteError("");
    try {
      const response = await OrderService.deleteReceipt(orderDetails.donationId);
      if (response?.success) { setUploadedReceipt(null); setUploadSuccess(false); toast.success("Receipt deleted"); }
      else setDeleteError("Delete failed");
    } catch { setDeleteError("Delete failed"); }
    finally { setDeleting(false); }
  };

  const copyDonationId = () => {
    navigator.clipboard.writeText(orderDetails?.donationId || "");
    toast.success("Donation ID copied");
  };

  if (!orderDetails) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="border border-gray-100 bg-white p-10 text-center shadow-sm">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-gray-100 text-gray-400">
            <Receipt className="h-6 w-6" />
          </span>
          <p className="font-semibold text-primary">No order details found</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-text-muted">This confirmation link has expired or was opened directly.</p>
          <button onClick={() => navigate("/")} className="mt-5 inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light">
            Go home
          </button>
        </div>
      </div>
    );
  }

  const isBankTransfer = paymentMethod === "bank";
  const today = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const orgName = organisation?.name || "us";

  return (
    <div className="min-h-screen bg-background px-4 pb-20 pt-24 lg:pt-28">
      {!isBankTransfer && <Celebration />}

      <div className="mx-auto max-w-2xl space-y-6">
        {/* ── Success card ───────────────────────────────────────────── */}
        <motion.div
          className="overflow-hidden border border-gray-100 bg-white shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Gradient success header */}
          <div
            className="relative overflow-hidden px-6 py-10 text-center text-white"
            style={{ background: "linear-gradient(135deg, var(--tenant-primary, #2C2418), var(--tenant-accent, #C9A84C))" }}
          >
            <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
            <span aria-hidden className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
            <div className="relative">
              <AnimatedCheck />
              <motion.h1
                className="font-heading text-2xl font-bold md:text-3xl"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              >
                Thank you for your generosity!
              </motion.h1>
              <motion.p
                className="mx-auto mt-2 max-w-md text-sm text-white/80"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              >
                Your donation has been {isBankTransfer ? "registered" : "processed"} successfully.
              </motion.p>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 sm:p-8">
            {/* Amount + status */}
            <div className="border-b border-gray-100 pb-6 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">Your donation</p>
              <p className="mt-1 font-heading text-4xl font-bold text-primary">${orderDetails.totalAmount.toFixed(2)}</p>
              <span
                className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold ${
                  isBankTransfer ? "bg-yellow-50 text-yellow-700" : "bg-green-50 text-green-700"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isBankTransfer ? "bg-yellow-500" : "bg-green-500"}`} />
                {isBankTransfer ? "Pending transfer" : "Completed"}
              </span>
            </div>

            {/* Details */}
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Donation ID</span>
                <button onClick={copyDonationId} className="flex items-center gap-1.5 font-mono text-xs font-medium text-primary transition-colors hover:text-accent">
                  {orderDetails.donationId}
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Payment method</span>
                <span className="font-medium capitalize text-primary">{paymentMethod}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Date</span>
                <span className="font-medium text-primary">{today}</span>
              </div>
            </div>

            {/* Reassurance (card payments) */}
            {!isBankTransfer && (
              <div className="mt-6 flex items-start gap-2.5 border border-accent/20 bg-accent/5 px-4 py-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <p className="text-sm text-gray-600">
                  A receipt is on its way to your inbox. You can track this gift anytime from your dashboard.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <motion.div
              className="mt-7 flex flex-col gap-3 sm:flex-row"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            >
              <button
                onClick={() => navigate(user ? "/user/dashboard" : "/login")}
                className="flex flex-1 items-center justify-center gap-2 bg-accent py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-light"
              >
                <Heart className="h-4 w-4" />
                {user ? "View my donations" : "Log in to track"}
              </button>
              <button
                onClick={() => navigate("/donate")}
                className="flex flex-1 items-center justify-center gap-2 border border-gray-200 py-3 text-sm font-semibold text-primary transition-colors hover:border-accent/50 hover:text-accent"
              >
                Make another donation
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          </div>
        </motion.div>

        {/* ── Bank transfer card ─────────────────────────────────────── */}
        {isBankTransfer && (
          <motion.div
            className="border border-gray-100 bg-white p-6 shadow-sm sm:p-8"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          >
            <div className="mb-5 flex items-center gap-3 border-b border-gray-100 pb-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center bg-accent/10 text-accent">
                <Landmark className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-heading text-lg font-bold text-primary">Complete your bank transfer</h3>
                <p className="mt-0.5 text-sm text-text-muted">Use these details and include the reference below.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <CopyField label="Bank" value={organisation?.bankDetails?.bankName || "Contact us"} />
              <CopyField label="BSB" value={organisation?.bankDetails?.bsb || "N/A"} mono />
              <CopyField label="Account number" value={organisation?.bankDetails?.accountNumber || "N/A"} mono />
              <CopyField label="Reference" value={orderDetails.donationId} mono />
            </div>

            {/* Receipt upload */}
            <div className="mt-7 border-t border-gray-100 pt-6">
              <h4 className="font-heading text-base font-bold text-primary">Upload payment proof</h4>
              <p className="mt-0.5 text-sm text-text-muted">
                {uploadSuccess ? "Your receipt has been uploaded." : "Upload a screenshot of your transfer so we can confirm it faster."}
              </p>

              <div className="mt-4">
                {uploadSuccess && uploadedReceipt ? (
                  <div className="border border-gray-100 bg-background/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center bg-accent/10 text-accent">
                          <FileCheck className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-primary">{uploadedReceipt.fileName || "Receipt"}</p>
                          <p className="text-[11px] text-text-muted">
                            {uploadedReceipt.uploadDate ? new Date(uploadedReceipt.uploadDate).toLocaleString() : "Uploaded"}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button onClick={handleViewReceipt} className="inline-flex items-center gap-1 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20">
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                        <button onClick={handleDeleteReceipt} disabled={deleting} className="inline-flex items-center gap-1 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50">
                          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Delete
                        </button>
                      </div>
                    </div>
                    {deleteError && (
                      <div className="mt-3 flex items-center gap-2 bg-red-50 p-3 text-xs text-red-600">
                        <AlertCircle className="h-4 w-4" /> {deleteError}
                      </div>
                    )}
                  </div>
                ) : !receiptFile ? (
                  <div
                    className={`cursor-pointer border-2 border-dashed p-8 text-center transition-colors ${
                      dragActive ? "border-accent bg-accent/5" : "border-gray-200 hover:border-accent/40"
                    }`}
                    onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                    onClick={() => document.getElementById("file-upload").click()}
                  >
                    <input type="file" id="file-upload" className="hidden" onChange={handleFileChange} accept="image/*" />
                    <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-accent/10 text-accent">
                      <Upload className="h-6 w-6" />
                    </span>
                    <p className="text-sm font-medium text-primary">Drag &amp; drop or <span className="text-accent">browse</span></p>
                    <p className="mt-1 text-[11px] text-text-muted">JPG, PNG or GIF — max 5MB</p>
                  </div>
                ) : (
                  <div className="border border-gray-100 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center bg-accent/10 text-accent">
                          <File className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-primary">{receiptFile.name}</p>
                          <p className="text-[11px] text-text-muted">{(receiptFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button onClick={removeFile} className="grid h-8 w-8 shrink-0 place-items-center text-text-muted transition-colors hover:text-red-500">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <button onClick={handleReceiptUpload} disabled={uploading} className="flex w-full items-center justify-center gap-2 bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploading ? "Uploading…" : "Upload receipt"}
                    </button>
                  </div>
                )}

                {uploadError && (
                  <div className="mt-3 flex items-center gap-2 bg-red-50 p-3 text-xs text-red-600">
                    <AlertCircle className="h-4 w-4" /> {uploadError}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Trust footer */}
        <motion.div
          className="flex items-center justify-center gap-2 text-center text-xs text-text-muted"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
        >
          <ShieldCheck className="h-4 w-4 text-accent" />
          Securely processed · 100% of your gift supports {orgName}.
        </motion.div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
