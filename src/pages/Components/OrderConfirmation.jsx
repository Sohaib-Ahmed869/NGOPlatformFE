import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Check,
  Upload,
  File,
  X,
  FileCheck,
  AlertCircle,
  Eye,
  Trash2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { OrderService } from "../../services/order.service";

const OrderConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // These come from whatever route led us here (e.g., after donation)
  const { orderDetails, paymentMethod } = location.state || {};

  // Using your AuthContext; note: your user object may have an "id" or "_id"
  const { user } = useAuth();

  // State for receipt file upload
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  // Receipt info after successful upload
  const [uploadedReceipt, setUploadedReceipt] = useState(null);

  // Deletion state
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Check if receipt already exists
  useEffect(() => {
    if (orderDetails?.donationId) {
      checkExistingReceipt();
    }
    window.scrollTo(0, 0);
  }, [orderDetails]);

  // Function to check if a receipt already exists for this donation
  const checkExistingReceipt = async () => {
    try {
      const response = await OrderService.getReceiptInfo(orderDetails.donationId);
      if (response && response.success && response.receipt) {
        setUploadedReceipt(response.receipt);
        setUploadSuccess(true);
      }
    } catch (err) {
      console.error("Error checking for existing receipt:", err);
      // Not setting an error here as this is just a check
    }
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleNewFile(file);
    }
  };

  const handleNewFile = (file) => {
    setReceiptFile(file);
    setUploadSuccess(false);
    setUploadError("");
  };

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleNewFile(e.dataTransfer.files[0]);
    }
  };

  // Remove the selected file (from local state only)
  const removeFile = () => {
    setReceiptFile(null);
    setUploadSuccess(false);
    setUploadError("");
  };

  // Upload the file to S3 + DB
  const handleReceiptUpload = async () => {
    if (!receiptFile) return; // Do nothing if no file selected

    setUploading(true);
    setUploadError("");
    try {
      // Check file size before uploading (5MB limit)
      if (receiptFile.size > 5 * 1024 * 1024) {
        setUploadError("File size must be less than 5MB");
        return;
      }

      // Check file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(receiptFile.type)) {
        setUploadError("Only JPG, PNG, and GIF files are allowed");
        return;
      }

      const formData = new FormData();
      formData.append("receipt", receiptFile);
      formData.append("donationId", orderDetails.donationId);
      // Use either user.id or user._id depending on your AuthService
      if (user?.id || user?._id) {
        formData.append("userId", user.id || user._id);
      }

      const data = await OrderService.uploadReceipt(formData);
      if (data && data.success) {
        setUploadSuccess(true);
        if (data.receipt) {
          setUploadedReceipt(data.receipt);
        }
      } else {
        setUploadError(data?.message || "Upload failed. Please try again.");
      }
    } catch (err) {
      console.error("Error uploading receipt:", err);
      setUploadError(err?.message || "Failed to upload receipt. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // // View the uploaded receipt in a new tab
  // const handleViewReceipt = () => {
  //   console.log("Uploaded Receipt:", uploadedReceipt);
  //   if (uploadedReceipt && uploadedReceipt.fileUrl) {
  //     window.open(uploadedReceipt.fileUrl, "_blank", "noopener,noreferrer");
  //   } else {
  //     alert("No receipt available to view.");
  //   }
  // };

  // Replace the existing handleViewReceipt function with this updated one

// View the uploaded receipt in a new tab with proper viewing
// In OrderConfirmation.jsx
const handleViewReceipt = async () => {
  if (!uploadedReceipt || !uploadedReceipt.fileUrl) {
    alert("No receipt available to view.");
    return;
  }

  try {
    // 1. Get the binary data from your backend
    const response = await OrderService.getReceiptViewUrl(orderDetails.donationId);

    // 2. Determine content type from response headers
    const contentType = response.headers["content-type"] || "application/octet-stream";

    // 3. Create a Blob from the array buffer
    const blob = new Blob([response.data], { type: contentType });

    // 4. Generate a Blob URL and open it in a new tab
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank", "noopener,noreferrer");
  } catch (error) {
    console.error("Error viewing receipt:", error);
    alert("Failed to view the receipt. Please try again.");
  }
};


  // Delete the receipt from S3 & DB
  const handleDeleteReceipt = async () => {
    if (!uploadedReceipt || !uploadedReceipt.fileUrl) {
      alert("No receipt to delete.");
      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this receipt?"
    );
    if (!confirmDelete) return;

    try {
      setDeleting(true);
      setDeleteError("");

      // Call our new deleteReceipt method in the OrderService
      const response = await OrderService.deleteReceipt(orderDetails.donationId);
      if (response && response.success) {
        // Clear front-end state
        setUploadedReceipt(null);
        setUploadSuccess(false);
        alert("Receipt deleted successfully.");
      } else {
        setDeleteError("Failed to delete receipt. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting receipt:", error);
      setDeleteError("Failed to delete receipt. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-primary" />
          </div>

          <h1 className="text-3xl font-bold mb-4">Thank You for Your Donation!</h1>
          <p className="text-gray-600 mb-8">
            Your donation has been{" "}
            {paymentMethod === "bank" ? "registered" : "processed"} successfully.
          </p>

          <div className="mb-8 p-6 bg-gray-50 rounded-2xl">
            <h2 className="font-bold mb-4">Donation Details</h2>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Donation ID:</span>{" "}
                {orderDetails.donationId}
              </p>
              <p>
                <span className="font-medium">Amount:</span> $
                {orderDetails.totalAmount.toFixed(2)}
              </p>
              {paymentMethod === "bank" && (
                <div className="mt-6 p-6 border border-gray-200 rounded-2xl bg-white shadow-sm">
                  <h3 className="font-bold text-lg mb-4 text-left">
                    Bank Transfer Instructions
                  </h3>

                  <div className="bg-blue-50 p-4 rounded-2xl mb-6 text-left">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Bank Name</p>
                        <p className="font-medium">Westpac</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">BSB</p>
                        <p className="font-medium">032075</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">
                          Account Number
                        </p>
                        <p className="font-medium">841783</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Reference</p>
                        <p className="font-medium">{orderDetails.donationId}</p>
                      </div>
                    </div>
                  </div>

                  {/* Modern File Upload Section */}
                  <div className="mt-8 text-left">
                    <h4 className="font-semibold text-lg mb-2">Payment Proof</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      {uploadSuccess
                        ? "Your payment proof has been uploaded. You can view it below."
                        : "Please upload a screenshot or PDF of your payment confirmation"}
                    </p>

                    {uploadSuccess && uploadedReceipt ? (
                      <div className="border rounded-2xl p-4 bg-background">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center mr-3">
                              <FileCheck className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {uploadedReceipt.fileName || "Receipt uploaded"}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {uploadedReceipt.uploadDate
                                  ? new Date(uploadedReceipt.uploadDate).toLocaleString()
                                  : "Successfully uploaded"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={handleViewReceipt}
                              className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors flex items-center"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </button>
                            <button
                              onClick={handleDeleteReceipt}
                              disabled={deleting}
                              className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors flex items-center"
                            >
                              {deleting ? (
                                <svg
                                  className="animate-spin h-4 w-4 mr-1"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v4l-4 4-4-4v-4H4z"
                                  />
                                </svg>
                              ) : (
                                <Trash2 className="h-4 w-4 mr-1" />
                              )}
                              Delete
                            </button>
                          </div>
                        </div>

                        {deleteError && (
                          <div className="mt-4 bg-red-50 text-red-700 p-4 rounded-md flex items-center">
                            <AlertCircle className="h-5 w-5 mr-2" />
                            {deleteError}
                          </div>
                        )}
                      </div>
                    ) : !receiptFile ? (
                      <div
                        className={`relative border-2 border-dashed rounded-2xl p-6 ${
                          dragActive
                            ? "border-primary bg-background"
                            : "border-gray-300 hover:border-gray-400"
                        } transition-all cursor-pointer`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById("file-upload").click()}
                      >
                        <input
                          type="file"
                          id="file-upload"
                          className="hidden"
                          onChange={handleFileChange}
                          accept="image/*,application/pdf"
                        />
                        <div className="text-center py-8">
                          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-lg text-gray-700 font-medium">
                            Drag & drop your file here
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            or <span className="text-blue-500">browse files</span>
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            Supports: JPG, PNG, PDF (Max 10MB)
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="border rounded-2xl p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start">
                            <div className="h-10 w-10 rounded-md bg-blue-100 flex items-center justify-center mr-3">
                              <File className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {receiptFile.name}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {(receiptFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={removeFile}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>

                        <button
                          onClick={handleReceiptUpload}
                          disabled={uploading}
                          className="mt-4 w-full py-3 px-4 bg-primary hover:bg-primary-light text-white font-medium rounded-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {uploading ? (
                            <>
                              <svg
                                className="animate-spin h-5 w-5 mr-2"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-5 w-5 mr-2" />
                              Upload Receipt
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {uploadError && (
                      <div className="mt-4 bg-red-50 text-red-700 p-4 rounded-md flex items-center">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        {uploadError}
                      </div>
                    )}

                    <p className="mt-6 text-sm text-gray-500">
                      You can also email your payment proof to:{" "}
                      <a
                        href="mailto:info@hopegive.org"
                        className="text-blue-600 hover:underline"
                      >
                        info@hopegive.org
                      </a>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="gap-2 flex items-center justify-center flex-col sm:flex-row">
            {user ? (
              <button
                onClick={() => navigate("/user/dashboard")}
                className="w-full sm:w-auto px-6 py-2 bg-primary text-white rounded hover:bg-primary-light"
              >
                View My Donations
              </button>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="w-full sm:w-auto px-6 py-2 bg-primary text-white rounded hover:bg-primary-light"
              >
                Log In to View Your Donations
              </button>
            )}

            <button
              onClick={() => navigate("/")}
              className="w-full sm:w-auto px-6 py-2 border border-primary text-primary rounded hover:bg-background"
            >
              Make Another Donation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
