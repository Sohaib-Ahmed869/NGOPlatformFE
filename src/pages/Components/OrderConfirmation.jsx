import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Check, Upload, File, X, FileCheck, AlertCircle, Eye, Trash2,
  Heart, Copy, ArrowRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTenant } from "../../context/TenantContext";
import { OrderService } from "../../services/order.service";
import { toast } from "react-hot-toast";

// ── Animated Checkmark ──────────────────────────────────
const AnimatedCheck = () => (
  <div className="relative w-24 h-24 mx-auto mb-6">
    {/* Pulsing glow */}
    <motion.div
      className="absolute inset-0 rounded-full bg-accent/20"
      initial={{ scale: 0 }}
      animate={{ scale: [0, 1.4, 1] }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    />
    {/* Circle */}
    <motion.div
      className="absolute inset-0 rounded-full bg-gradient-to-br from-accent to-accent-light flex items-center justify-center"
      initial={{ scale: 0, rotate: -90 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ delay: 0.2, duration: 0.5, type: "spring", stiffness: 200 }}
    >
      {/* SVG tick with draw animation */}
      <motion.svg
        viewBox="0 0 24 24"
        className="w-12 h-12 text-white"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.path
          d="M5 13l4 4L19 7"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.6, duration: 0.4, ease: "easeOut" }}
        />
      </motion.svg>
    </motion.div>
    {/* Confetti dots */}
    {[...Array(6)].map((_, i) => {
      const angle = (i / 6) * Math.PI * 2;
      return (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-accent"
          style={{ left: "50%", top: "50%", marginLeft: -4, marginTop: -4 }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos(angle) * 60,
            y: Math.sin(angle) * 60,
            opacity: 0,
            scale: 0,
          }}
          transition={{ delay: 0.7, duration: 0.6, ease: "easeOut" }}
        />
      );
    })}
  </div>
);

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-muted mb-4">No order details found</p>
          <button onClick={() => navigate("/")} className="px-4 py-2 bg-accent text-white rounded-xl text-sm">Go Home</button>
        </div>
      </div>
    );
  }

  const isBankTransfer = paymentMethod === "bank";

  return (
    <div className="min-h-screen bg-background py-24 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Main Card */}
        <motion.div
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="p-8 md:p-10">
            {/* Animated checkmark */}
            <AnimatedCheck />

            {/* Heading */}
            <motion.div className="text-center mb-8"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <h1 className="text-2xl md:text-3xl font-heading font-bold text-primary mb-2">
                Thank You for Your Generosity!
              </h1>
              <p className="text-text-muted font-body">
                Your donation has been {isBankTransfer ? "registered" : "processed"} successfully.
              </p>
            </motion.div>

            {/* Donation Details */}
            <motion.div
              className="bg-background rounded-xl p-5 mb-6"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase tracking-widest text-text-muted font-semibold">Donation Summary</span>
                <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${
                  isBankTransfer ? "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200" : "bg-green-50 text-green-700 ring-1 ring-green-200"
                }`}>
                  {isBankTransfer ? "Pending Transfer" : "Completed"}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-muted">Donation ID</span>
                  <button onClick={copyDonationId}
                    className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-accent transition-colors">
                    {orderDetails.donationId}
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-muted">Amount</span>
                  <span className="text-xl font-bold text-accent">${orderDetails.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-muted">Payment</span>
                  <span className="text-sm font-medium text-primary capitalize">{paymentMethod}</span>
                </div>
              </div>
            </motion.div>

            {/* Bank transfer section */}
            {isBankTransfer && (
              <motion.div
                className="mb-6"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
              >
                <div className="border border-accent/20 rounded-xl p-5 bg-accent/5 mb-5">
                  <h3 className="font-semibold text-primary text-sm mb-3">Bank Transfer Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Bank", value: organisation?.bankDetails?.bankName || "Contact us" },
                      { label: "BSB", value: organisation?.bankDetails?.bsb || "N/A" },
                      { label: "Account", value: organisation?.bankDetails?.accountNumber || "N/A" },
                      { label: "Reference", value: orderDetails.donationId },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-[11px] text-text-muted">{label}</p>
                        <p className="text-sm font-medium text-primary">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Receipt upload */}
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-2">Upload Payment Proof</h4>
                  <p className="text-xs text-text-muted mb-3">
                    {uploadSuccess ? "Receipt uploaded successfully." : "Upload a screenshot of your bank transfer."}
                  </p>

                  {uploadSuccess && uploadedReceipt ? (
                    <div className="border border-gray-200 rounded-xl p-4 bg-background">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                            <FileCheck className="w-5 h-5 text-accent" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-primary">{uploadedReceipt.fileName || "Receipt"}</p>
                            <p className="text-[11px] text-text-muted">
                              {uploadedReceipt.uploadDate ? new Date(uploadedReceipt.uploadDate).toLocaleString() : "Uploaded"}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleViewReceipt}
                            className="px-3 py-1.5 bg-accent/10 text-accent rounded-lg text-xs font-medium hover:bg-accent/20 flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          <button onClick={handleDeleteReceipt} disabled={deleting}
                            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 flex items-center gap-1">
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                      {deleteError && (
                        <div className="mt-3 bg-red-50 text-red-600 p-3 rounded-lg text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" /> {deleteError}
                        </div>
                      )}
                    </div>
                  ) : !receiptFile ? (
                    <div
                      className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                        dragActive ? "border-accent bg-accent/5" : "border-gray-300 hover:border-accent/40"
                      }`}
                      onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                      onClick={() => document.getElementById("file-upload").click()}>
                      <input type="file" id="file-upload" className="hidden" onChange={handleFileChange} accept="image/*" />
                      <Upload className="w-8 h-8 text-text-muted mx-auto mb-2" />
                      <p className="text-sm text-primary font-medium">Drag & drop or <span className="text-accent">browse</span></p>
                      <p className="text-[11px] text-text-muted mt-1">JPG, PNG, GIF — max 5MB</p>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                            <File className="w-5 h-5 text-accent" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-primary">{receiptFile.name}</p>
                            <p className="text-[11px] text-text-muted">{(receiptFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button onClick={removeFile} className="text-text-muted hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <button onClick={handleReceiptUpload} disabled={uploading}
                        className="w-full py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 disabled:opacity-50 flex items-center justify-center gap-2">
                        {uploading ? "Uploading..." : <><Upload className="w-4 h-4" /> Upload Receipt</>}
                      </button>
                    </div>
                  )}

                  {uploadError && (
                    <div className="mt-3 bg-red-50 text-red-600 p-3 rounded-lg text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> {uploadError}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            <motion.div
              className="flex flex-col sm:flex-row gap-3"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
            >
              <button
                onClick={() => navigate(user ? "/user/dashboard" : "/login")}
                className="flex-1 py-3 bg-accent text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-accent/90 transition-all hover:shadow-md">
                <Heart className="w-4 h-4" />
                {user ? "View My Donations" : "Log In to Track"}
              </button>
              <button
                onClick={() => navigate("/donate")}
                className="flex-1 py-3 border border-gray-200 text-primary rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-all">
                Make Another Donation
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
