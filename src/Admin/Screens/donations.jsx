import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Loader from "../../components/Loader";
import { useTenant } from "../../context/TenantContext";
import {
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  Download,
  Filter,
  Loader2,
  Eye,
  X,
  CheckCircle,
  Info,
  FileText
} from "lucide-react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { ResponsiveContainer, PieChart, Pie as RechartsPie, Cell } from 'recharts';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

import logo from "../../assets/logo.png";
import footer2 from "../../assets/footer3.png";
import AdminDonationService from "../../services/adminDonation.service";
import { OrderService } from "../../services/order.service";
import { toast } from "react-hot-toast";
import { downloadReceipt, downloadPaidPaymentsReceipt } from "../../User/Screens/recieptDownloader";
import DonationDetailsModal from "./DonationsModal"; 
import axiosInstance from "../../services/axios";
import Modal from "../../components/Modal";
import KpiCard from "../../components/KpiCard";

const ITEMS_PER_PAGE = 10;

// Theme-aware chart colors
function getChartColors() {
  const s = getComputedStyle(document.documentElement);
  const a = s.getPropertyValue("--tenant-accent").trim() || "#C9A84C";
  const p = s.getPropertyValue("--tenant-primary").trim() || "#2C2418";
  const al = s.getPropertyValue("--tenant-accent-light").trim() || "#D4B85A";
  return [a, p, al, "#8B7E6A"];
}

const AdminDonationsList = () => {
  const navigate = useNavigate();
  const { organisation } = useTenant();
  const orgInfo = { name: organisation?.name, email: organisation?.contactEmail, phone: organisation?.contactPhone, website: organisation?.website };
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const [stats, setStats] = useState({
    totalAmount: 0,
    averageDonation: 0,
    recurringDonations: 0,
    successRate: 0,
    singleCount: 0,
    recurringCount: 0,
    installmentsCount: 0,
    totalDonationsCount: 0,
  });

  // Add donor stats state to match dashboard component
  const [donorStats, setDonorStats] = useState({
    totalDonors: 0,
    totalAmount: 0,
    averageDonation: 0,
    recurringDonations: 0
  });

  const [topDonors, setTopDonors] = useState([]);
  const [donations, setDonations] = useState([]);
  const [allDonations, setAllDonations] = useState([]);

  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
    currentPage: 1,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });
  const [fullDetailModalOpen, setFullDetailModalOpen] = useState(false);
  const [fullDonationDetails, setFullDonationDetails] = useState(null);
  const [showCancelRequestDialog, setShowCancelRequestDialog] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);

  useEffect(() => {
    if (initialLoad) {
      Promise.all([fetchDashboardData(), fetchAllDonations()]).then(() => {
        setInitialLoad(false);
      });
    }
  }, []);
  
  useEffect(() => {
    if (!initialLoad) {
      fetchDonations();
    }
  }, [currentPage, searchTerm, selectedStatus, selectedType, sortConfig, initialLoad]);
  
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, topDonorsData, donorStatsData] = await Promise.all([
        AdminDonationService.getDashboardStats(),
        AdminDonationService.getTopDonors(),
        axiosInstance.get("/admin/donors/dashboard/stats")
      ]);

      setStats(statsData);
      setTopDonors(topDonorsData);
      setDonorStats(donorStatsData.data.data.stats || {
        totalDonors: 0,
        totalAmount: 0,
        averageDonation: 0,
        recurringDonations: 0
      });
      
      // Calculate donation type counts from all donations (excluding failed status)
      const donationTypeCounts = await fetchDonationTypeCounts();
      setStats(prevStats => ({
        ...prevStats,
        ...donationTypeCounts
      }));
    } catch (error) {
      toast.error("Failed to load dashboard data");
      console.error("Dashboard data error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDonations = async () => {
    try {
      setLoading(true);
      const response = await AdminDonationService.getDonations({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: searchTerm,
        status: selectedStatus !== "All" ? selectedStatus : undefined,
        type: selectedType !== "All" ? selectedType : undefined,
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction,
      });
  
      // Map the raw donations data to the format needed for display
      const mappedDonations = response.donations.map(donation => ({
        id: donation._id,
        donationId: donation.donationId,
        donor: donation.donorDetails?.name || "Anonymous",
        email: donation.donorDetails?.email || "-",
        amount: donation.totalAmount,
        cause: donation.items && donation.items.length > 0 
          ? donation.items.length === 1 
            ? donation.items[0].title 
            : "Multiple Items" 
          : "-",
        type: donation.paymentType,
        paymentMethod: donation.paymentMethod || "-",
        date: donation.createdAt,
        status: donation.paymentStatus,
        recurringDetails: donation.recurringDetails,
        installmentDetails: donation.installmentDetails,
        adminCostContribution: donation.adminCostContribution, 
        items: donation.items || [],
        receiptUrl: donation.receiptUrl || null
      }));
  
      setDonations(mappedDonations);
      setPagination(response.pagination);
    } catch (error) {
      toast.error("Failed to load donations");
      console.error("Donations fetch error:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAllDonations = async () => {
    try {
      const response = await AdminDonationService.getAllDonations({
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction,
      });
      
      // Store the complete donation objects for export
      setAllDonations(response.donations);
    } catch (error) {
      toast.error("Failed to load all donations for export");
      console.error("All Donations fetch error:", error);
    }
  };
  
  // Function to calculate donation type counts using the same data source as the table
  const fetchDonationTypeCounts = async () => {
    try {
      // Use the same data source as the table view
      const response = await AdminDonationService.getDonations({
        page: 1,
        limit: 10000, // Large limit to get all donations
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction
      });

      // Map the donations to match the table format
      const mappedDonations = response.donations.map(donation => ({
        id: donation._id,
        donationId: donation.donationId,
        donor: donation.donorDetails?.name || "Anonymous",
        email: donation.donorDetails?.email || "-",
        amount: donation.totalAmount,
        cause: donation.items && donation.items.length > 0 
          ? donation.items.length === 1 
            ? donation.items[0].title 
            : "Multiple Items" 
          : "-",
        type: donation.paymentType,
        date: donation.createdAt,
        status: donation.paymentStatus,
        recurringDetails: donation.recurringDetails,
        installmentDetails: donation.installmentDetails,
        adminCostContribution: donation.adminCostContribution, 
        items: donation.items || [],
        receiptUrl: donation.receiptUrl || null
      }));

      // Get current date for filtering recurring donations
      const currentDate = new Date();

      // Count all donations by type using the mapped data
      const singleCount = mappedDonations.filter(
        donation => !donation.installmentDetails && donation.type !== "recurring"
      ).length;

      const recurringCount = mappedDonations.filter(
        donation => donation.type === "recurring"
      ).length;

      const installmentsCount = mappedDonations.filter(
        donation => donation.installmentDetails
      ).length;

      // Calculate total count using the same data as the table
      const totalDonationsCount = mappedDonations.length;

      // Calculate active donations (excluding failed status)
      const activeDonations = mappedDonations.filter(donation => donation.status !== "failed");

      const activeSingleCount = activeDonations.filter(
        donation => donation.type === "single"
      ).length;

      const activeRecurringCount = activeDonations.filter(
        donation => donation.type === "recurring" && 
        (!donation.recurringDetails?.endDate || new Date(donation.recurringDetails.endDate) >= currentDate)
      ).length;

      const activeInstallmentsCount = activeDonations.filter(
        donation => donation.type === "installment"
      ).length;

      return {
        singleCount,
        recurringCount,
        installmentsCount,
        totalDonationsCount,
        activeSingleCount,
        activeRecurringCount,
        activeInstallmentsCount
      };
    } catch (error) {
      console.error("Error fetching donation type counts:", error);
      return {
        singleCount: 0,
        recurringCount: 0,
        installmentsCount: 0,
        totalDonationsCount: 0
      };
    }
  };

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction:
        sortConfig.key === key && sortConfig.direction === "asc"
          ? "desc"
          : "asc",
    });
  };

  // Function to export donations to CSV
  const handleExportDonations = async () => {
    try {
      setExportLoading(true);

      if (!allDonations || allDonations.length === 0) {
        toast.error("No donations to export");
        setExportLoading(false);
        return;
      }

      const headers = [
        "Donation ID",
        "Donor Name",
        "Email",
        "Phone",
        "Amount",
        "Project/Cause",
        "Donation Type",
        "On Behalf Of",
        "Payment Type",
        "Payment Method",
        "Status",
        "Date",
        "Next Payment Date",
        "Next Installment Date",
        "Frequency",
        "Admin Cost",
        "Receipt Available"
      ].join(",");

      const rows = allDonations.map((donation) => {
        // Function to escape fields containing commas
        const escapeCsvField = (field) => {
          if (field === null || field === undefined) return "";
          const str = String(field);
          return str.includes(",") ? `"${str}"` : str;
        };

        // Extract items information
        const itemsText = donation.items ? 
          escapeCsvField(donation.items.map(item => item.title).join("; ")) : 
          "";
        
        // Extract donation types
        const donationTypes = donation.items ? 
          escapeCsvField(donation.items.map(item => item.donationType || "Sadaqah").join("; ")) : 
          "Sadaqah";
        
        // Extract on behalf of information
        const onBehalfOfText = donation.items ? 
          escapeCsvField(donation.items.filter(item => item.onBehalfOf).map(item => item.onBehalfOf).join("; ")) : 
          "";

        // Extract admin cost
        const adminCost = donation.adminCostContribution && donation.adminCostContribution.included ? 
          donation.adminCostContribution.amount : 
          0;

        // Extract frequency for recurring donations
        const frequency = donation.recurringDetails ? donation.recurringDetails.frequency : "";

        // Add receipt availability
        const hasReceipt = donation.receiptUrl ? "Yes" : "No";

        return [
          escapeCsvField(donation.donationId),
          escapeCsvField(donation.donorDetails?.name || ""),
          escapeCsvField(donation.donorDetails?.email || ""),
          escapeCsvField(donation.donorDetails?.phone || ""),
          donation.totalAmount,
          itemsText,
          donationTypes,
          onBehalfOfText,
          escapeCsvField(donation.paymentType),
          escapeCsvField(donation.paymentMethod),
          escapeCsvField(donation.paymentStatus),
          escapeCsvField(new Date(donation.createdAt).toLocaleDateString()),
          escapeCsvField(
            donation.paymentType === "recurring" && donation.recurringDetails?.nextPaymentDate
              ? new Date(donation.recurringDetails.nextPaymentDate).toLocaleDateString()
              : ""
          ),
          escapeCsvField(
            donation.paymentType === "installments" && donation.installmentDetails?.nextInstallmentDate
              ? new Date(donation.installmentDetails.nextInstallmentDate).toLocaleDateString()
              : ""
          ),
          escapeCsvField(frequency),
          adminCost,
          hasReceipt
        ].join(",");
      });

      const csvContent = [headers, ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      
      link.setAttribute("href", url);
      link.setAttribute("download", `donations_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success("Export completed successfully");
    } catch (error) {
      toast.error("Failed to export donations");
      console.error("Export error:", error);
    } finally {
      setExportLoading(false);
    }
  };

  const handleViewReceipt = async (donationId) => {
    try {
      const loadingToast = toast.loading("Fetching receipt...");
      // Call the proxy endpoint to get binary data for the receipt
      const response = await OrderService.getReceiptViewUrl(donationId);
      toast.dismiss(loadingToast);
      
      // Extract the content type from response headers
      const contentType = response.headers["content-type"] || "application/octet-stream";
      
      // Create a Blob from the binary data
      const blob = new Blob([response.data], { type: contentType });
      
      // Create a temporary URL for the Blob and open it inline in a new tab
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Error viewing receipt:", error);
      toast.error("Failed to view receipt");
    }
  };
  
  const openFullDetailModal = async (donationId) => {
    try {
      setLoading(true);
      const response = await AdminDonationService.getDonationById(donationId);
      if (response && response.donation) {
        setFullDonationDetails(response.donation);
        setFullDetailModalOpen(true);
      }
    } catch (error) {
      toast.error("Failed to load full donation details");
      console.error("Full donation details error:", error);
    } finally {
      setLoading(false);
    }
  };

  const closeFullDetailModal = () => {
    setFullDetailModalOpen(false);
    setFullDonationDetails(null);
  };

  // Updated function to handle donation receipts based on payment type
  const updateDonationStatus = async (donationId, statusData, cancellationReason) => {
    try {
      // Find the donation to get its details
      const donation = donations.find(d => d._id === donationId || d.id === donationId);
      const isRecurring = donation?.paymentType === 'recurring';
      
      let requestData = { 
        paymentStatus: typeof statusData === 'string' ? statusData : statusData.paymentStatus || statusData.status,
        isRecurring,
        paymentType: donation?.paymentType, // Include payment type
        ...(cancellationReason && { cancellationReason })
      };
      
      // Add cancellation reason if applicable
      if (requestData.paymentStatus === "cancelled" && !cancellationReason) {
        const reason = prompt("Please provide a reason for cancellation:", "Cancelled by admin");
        if (!reason) return; // User canceled the prompt
        requestData.cancellationReason = reason;
      }
      
      // Make the API call with the correct data format
      const response = await AdminDonationService.updateDonationStatus(donationId, requestData);
      
      if (response && (response.status === "Success" || response.status === "success")) {
        // Show success message
        const status = requestData.paymentStatus;
        if (status === "cancelled") {
          toast.success(`Donation cancelled${requestData.cancellationReason ? ': ' + requestData.cancellationReason : ''}`);
        } else {
          toast.success(`Status updated to ${status}`);
        }

        // Update donation in the list
        const updatedDonations = donations.map((donation) =>
          donation.id === donationId || donation._id === donationId
            ? { 
                ...donation, 
                status: requestData.paymentStatus,
                paymentStatus: requestData.paymentStatus,
                ...(requestData.recurringStatus && { 
                  recurringDetails: {
                    ...(donation.recurringDetails || {}),
                    status: requestData.recurringStatus 
                  }
                })
              }
            : donation
        );
        setDonations(updatedDonations);

        // Close modal if open
        if (
          fullDetailModalOpen &&
          fullDonationDetails &&
          fullDonationDetails._id === donationId
        ) {
          closeFullDetailModal();
        }
        
        // Refresh donations after status update
        fetchDonations();
      } else {
        toast.error("Failed to update status: " + (response?.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Status update error:", error);
      
      // Extract error message from response if available
      let errorMessage = "Failed to update status";
      if (error.response?.data?.message) {
        errorMessage += `: ${error.response.data.message}`;
      }
      
      toast.error(errorMessage);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };
  
  // Updated receipt download handler to handle different payment types
  const handleDownloadReceipt = (donation) => {
    // For recurring donations, check if there are successful payments
    if (donation.paymentType === "recurring" && donation.recurringDetails?.paymentHistory) {
      const successfulPayments = donation.recurringDetails.paymentHistory.filter(
        payment => payment.status === "succeeded" || payment.status === "completed"
      );
      
      if (successfulPayments.length > 0) {
        // Download receipt for paid payments only
        downloadPaidPaymentsReceipt(donation, orgInfo);
      } else {
        // Download standard receipt (original setup)
        downloadReceipt(donation, {
          logoUrl: logo,
          charityLogoUrl: footer2,
        }, orgInfo);
      }
    } else {
      // For single and installment donations, download standard receipt
      downloadReceipt(donation, {
        logoUrl: logo,
        charityLogoUrl: footer2,
      }, orgInfo);
    }
  };

  const handleDownloadImage = (donation) => {
    if (!donation.receiptUrl) {
      toast.error("No image available for download.");
      return;
    }
    const link = document.createElement("a");
    link.href = donation.receiptUrl;
    // Use the filename from the URL (or set a custom one)
    link.download = donation.receiptUrl.split("/").pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleAddDonorUpdate = async (donationId, updateData) => {
    try {
      await AdminDonationService.addDonorUpdate(donationId, updateData);
      toast.success(
        updateData.type === "close-off"
          ? "Close-off sent — donation marked complete"
          : "Follow-up update shared with the donor"
      );
      // Refresh the modal details so the new update appears
      const response = await AdminDonationService.getDonationById(donationId);
      if (response && response.donation) {
        setFullDonationDetails(response.donation);
      }
      fetchDonations();
    } catch (error) {
      console.error("Add donor update error:", error);
      toast.error(
        error?.response?.data?.message || "Failed to send update to donor"
      );
      throw error;
    }
  };

  const handleProcessCancellationRequest = async (action) => {
    try {
      if (!selectedDonation) return;

      await axiosInstance.post(
        `/admin/orders/${selectedDonation.id}/process-cancellation`,
        { action }
      );

      toast.success(
        `Cancellation request ${action === "approve" ? "approved" : "rejected"} successfully`
      );
      setShowCancelRequestDialog(false);
      fetchDonations();
    } catch (error) {
      console.error("Process cancellation error:", error);
      toast.error(
        error?.response?.data?.message || "Failed to process cancellation request"
      );
    }
  };

  if (loading && initialLoad) {
    return (
      <Loader />
    );
  }

  const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.4 } }) };

  const statusStyle = (s) => {
    const m = { completed: "bg-green-50 text-green-700", ended: "bg-green-50 text-green-700", pending: "bg-yellow-50 text-yellow-700", processing: "bg-blue-50 text-blue-700", failed: "bg-red-50 text-red-700", active: "bg-green-50 text-green-700", cancelled: "bg-gray-100 text-gray-600" };
    return m[s] || "bg-gray-100 text-gray-600";
  };
  const typeStyle = (t) => {
    const m = { "one-time": "bg-emerald-50 text-emerald-700", single: "bg-emerald-50 text-emerald-700", recurring: "bg-violet-50 text-violet-700", installments: "bg-amber-50 text-amber-700" };
    return m[t] || "bg-gray-100 text-gray-600";
  };

  return (
<motion.div className="lg:p-6 mt-20 lg:mt-0 space-y-6 bg-background/30 min-h-screen" initial="hidden" animate="visible">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-primary">All Donations</h1>
          <p className="text-sm text-text-muted mt-0.5">{pagination.total || 0} total donations</p>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard title="Total Amount" value={formatCurrency(stats.totalAmount)} icon={TrendingUp} color="#059669" animate={false} />
        <KpiCard title="Total Donations" value={stats.totalDonationsCount} icon={CheckCircle} color="#10B981" animate={false} />
        <KpiCard title="Average" value={stats.totalDonationsCount > 0 ? formatCurrency(stats.totalAmount / stats.totalDonationsCount) : formatCurrency(0)} icon={Info} color="#06B6D4" animate={false} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="One-Time" value={stats.singleCount} icon={FileText} color="#059669" animate={false} />
        <KpiCard title="Recurring" value={stats.recurringCount} icon={Calendar} color="#EC4899" animate={false} />
        <KpiCard title="Installments" value={stats.installmentsCount} icon={TrendingUp} color="#F59E0B" animate={false} />
      </div>

      {/* Donut Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By Count */}
        <motion.div variants={fadeUp} custom={1}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center">
          <h2 className="text-sm font-semibold text-primary mb-4 self-start">By Type (Count)</h2>
          {(() => {
            const segments = [
              { name: "One-Time", value: stats.singleCount || 0, color: "#34D399" },
              { name: "Recurring", value: stats.recurringCount || 0, color: "#818CF8" },
              { name: "Installments", value: stats.installmentsCount || 0, color: "#FB923C" },
            ];
            const total = segments.reduce((s, seg) => s + seg.value, 0);
            const r = 58, c = 2 * Math.PI * r, gap = 8;
            let offset = 0;
            return (
              <>
                <svg width={160} height={160} viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r={r} fill="none" stroke="#f1f5f9" strokeWidth="16" />
                  {total > 0 && segments.filter(s => s.value > 0).map((seg, i) => {
                    const pct = seg.value / total;
                    const dashLen = Math.max(0, pct * c - gap);
                    const el = (
                      <circle key={i} cx="70" cy="70" r={r} fill="none"
                        stroke={seg.color} strokeWidth="16" strokeLinecap="round"
                        strokeDasharray={`${dashLen} ${c - dashLen}`}
                        strokeDashoffset={-offset} transform="rotate(-90 70 70)" />
                    );
                    offset += pct * c;
                    return el;
                  })}
                  <text x="70" y="66" textAnchor="middle" fontSize="20" fontWeight="700" fill="currentColor" className="text-primary">{total}</text>
                  <text x="70" y="82" textAnchor="middle" fontSize="10" fill="#94a3b8">donations</text>
                </svg>
                <div className="flex gap-4 mt-4">
                  {segments.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                      <span className="text-[11px] text-text-muted">{item.name} ({item.value})</span>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </motion.div>

        {/* By Amount */}
        <motion.div variants={fadeUp} custom={1.5}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center">
          <h2 className="text-sm font-semibold text-primary mb-4 self-start">By Type (Amount)</h2>
          {(() => {
            const singleAmt = donations.filter(d => d.type === "one-time" || d.type === "single").reduce((s, d) => s + (d.amount || 0), 0);
            const recurAmt = donations.filter(d => d.type === "recurring").reduce((s, d) => s + (d.amount || 0), 0);
            const instAmt = donations.filter(d => d.type === "installments").reduce((s, d) => s + (d.amount || 0), 0);
            const segments = [
              { name: "One-Time", value: singleAmt, color: "#34D399" },
              { name: "Recurring", value: recurAmt, color: "#818CF8" },
              { name: "Installments", value: instAmt, color: "#FB923C" },
            ];
            const total = segments.reduce((s, seg) => s + seg.value, 0);
            const r = 58, c = 2 * Math.PI * r, gap = 8;
            let offset = 0;
            return (
              <>
                <svg width={160} height={160} viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r={r} fill="none" stroke="#f1f5f9" strokeWidth="16" />
                  {total > 0 && segments.filter(s => s.value > 0).map((seg, i) => {
                    const pct = seg.value / total;
                    const dashLen = Math.max(0, pct * c - gap);
                    const el = (
                      <circle key={i} cx="70" cy="70" r={r} fill="none"
                        stroke={seg.color} strokeWidth="16" strokeLinecap="round"
                        strokeDasharray={`${dashLen} ${c - dashLen}`}
                        strokeDashoffset={-offset} transform="rotate(-90 70 70)" />
                    );
                    offset += pct * c;
                    return el;
                  })}
                  <text x="70" y="66" textAnchor="middle" fontSize="18" fontWeight="700" fill="currentColor" className="text-primary">${Math.round(total).toLocaleString()}</text>
                  <text x="70" y="82" textAnchor="middle" fontSize="10" fill="#94a3b8">total</text>
                </svg>
                <div className="flex gap-4 mt-4">
                  {segments.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                      <span className="text-[11px] text-text-muted">{item.name} (${Math.round(item.value).toLocaleString()})</span>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </motion.div>
      </div>

      {/* Search, Filters & Table */}
      <motion.div variants={fadeUp} custom={2} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search donations..."
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none w-52" />
            </div>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none">
              <option value="All">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
              <option value="ended">Ended</option>
            </select>
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none">
              <option value="All">All Types</option>
              <option value="one-time">One Time</option>
              <option value="recurring">Recurring</option>
              <option value="installments">Installments</option>
            </select>
          </div>
          <button onClick={handleExportDonations} disabled={exportLoading}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 disabled:opacity-50">
            {exportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export
          </button>
        </div>

        {/* Table with loading overlay */}
        <div className="relative">
          {loading && !initialLoad && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-10 flex items-center justify-center">
              <div className="flex items-center gap-2 text-accent text-sm font-medium">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </div>
            </div>
          )}

          {donations.length === 0 && !loading ? (
            <div className="p-12 text-center">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-text-muted" />
              <p className="text-primary font-medium mb-1">No donations found</p>
              <p className="text-sm text-text-muted">
                {searchTerm || selectedStatus !== "All" || selectedType !== "All" ? "Try adjusting your filters" : "No donations in the system yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Donation ID", "Donor", "Amount", "Project", "Type", "Payment", "Method", "Date", "Status", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {donations.map((donation) => (
                    <tr key={donation.id} className="border-b border-gray-50 last:border-0 hover:bg-background/50 transition-colors">
                      <td className="px-4 py-3.5 text-sm font-medium text-primary">{donation.donationId}</td>
                      <td className="px-4 py-3.5 text-sm text-primary">{donation.donor}</td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-primary">${donation.amount.toFixed(2)}</td>
                      <td className="px-4 py-3.5 text-sm text-text-muted">{donation.cause}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${typeStyle(donation.type)}`}>{donation.type}</span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-text-muted capitalize">{donation.paymentMethod}</td>
                      <td className="px-4 py-3.5 text-sm text-text-muted">{donation.items?.[0]?.donationType || "Sadaqah"}</td>
                      <td className="px-4 py-3.5 text-sm text-text-muted">{formatDate(donation.date)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${statusStyle(donation.status)}`}>{donation.status}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        {donation.paymentStatus === "pending_cancellation" ? (
                          <button onClick={() => { setSelectedDonation(donation); setShowCancelRequestDialog(true); }}
                            className="text-xs text-orange-600 hover:text-orange-800 font-medium">Process</button>
                        ) : (
                          <button onClick={() => openFullDetailModal(donation.id)}
                            className="text-xs text-accent hover:text-primary font-medium">Details</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-text-muted">
              {pagination.total ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}–{Math.min(currentPage * ITEMS_PER_PAGE, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}
                className="p-1.5 rounded-lg text-text-muted hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                let pg;
                if (pagination.pages <= 5) pg = i + 1;
                else if (currentPage <= 3) pg = i + 1;
                else if (currentPage >= pagination.pages - 2) pg = pagination.pages - (4 - i);
                else pg = currentPage - 2 + i;
                return (
                  <button key={i} onClick={() => setCurrentPage(pg)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium ${currentPage === pg ? "bg-accent text-white" : "text-text-muted hover:bg-gray-100"}`}>{pg}</button>
                );
              })}
              <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === pagination.pages}
                className="p-1.5 rounded-lg text-text-muted hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Donation Details Modal */}
      {fullDetailModalOpen && fullDonationDetails && (
        <DonationDetailsModal
          donation={fullDonationDetails}
          onClose={closeFullDetailModal}
          onDownloadReceipt={() => handleDownloadReceipt(fullDonationDetails)}
          onUpdateStatus={updateDonationStatus}
          onAddUpdate={handleAddDonorUpdate}
        />
      )}

      {/* Cancellation Request Dialog */}
      <Modal
        isOpen={showCancelRequestDialog}
        onClose={() => setShowCancelRequestDialog(false)}
        title="Process Cancellation Request"
        description="Review the cancellation request and choose to approve or reject it."
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900">Donation Details</h4>
            <div className="mt-2 space-y-2 text-sm text-gray-600">
              <p>
                <span className="font-medium">Donor:</span>{" "}
                {selectedDonation?.donor}
              </p>
              <p>
                <span className="font-medium">Amount:</span> $
                {selectedDonation?.amount}
              </p>
              <p>
                <span className="font-medium">Type:</span>{" "}
                {selectedDonation?.type}
              </p>
              <p>
                <span className="font-medium">Reason:</span>{" "}
                {selectedDonation?.cancelReason}
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowCancelRequestDialog(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
            >
              Cancel
            </button>
            <button
              onClick={() => handleProcessCancellationRequest("reject")}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Reject
            </button>
            <button
              onClick={() => handleProcessCancellationRequest("approve")}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Approve
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default AdminDonationsList;