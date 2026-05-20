import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageLoader from "../../components/PageLoader";
import {
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  Download,
  Filter,
  Loader,
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
      fetchDashboardData();
      fetchAllDonations();
      setInitialLoad(false);
    }
  }, [initialLoad]);
  
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
        downloadPaidPaymentsReceipt(donation, {
          logoUrl: logo,
          charityLogoUrl: footer2,
        });
      } else {
        // Download standard receipt (original setup)
        downloadReceipt(donation, {
          logoUrl: logo,
          charityLogoUrl: footer2,
        });
      }
    } else {
      // For single and installment donations, download standard receipt
      downloadReceipt(donation, {
        logoUrl: logo,
        charityLogoUrl: footer2,
      });
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
      <PageLoader />
    );
  }

  return (
<div className="lg:p-6 mt-20 lg:mt-0 space-y-6 bg-background/30 min-h-screen">
      {/* Top Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4 text-primary">All Donations</h2>
        
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-accent">Total Donations Amount</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(stats.totalAmount)}
              </p>
                <p className="text-xs text-accent">
              Amount of all donations made by all donors
              </p>
            </div>
            <div className="p-3 bg-background rounded-full">
              <TrendingUp className="w-6 h-6 text-accent" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-accent">Total number of Donations </p>
              <p className="text-2xl font-bold text-primary">
                {stats.totalDonationsCount}
              </p>
              <p className="text-xs text-accent">
                Number of all donations made by all donors
              </p>
            </div>
            <div className="p-3 bg-background rounded-full">
              <CheckCircle className="w-6 h-6 text-accent" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-accent">Average Donation Amount</p>
              <p className="text-2xl font-bold text-primary">
                {stats.totalDonationsCount > 0 ? formatCurrency(stats.totalAmount / stats.totalDonationsCount) : formatCurrency(0)}
              </p>
              <p className="text-xs text-accent">
                Total amount divided by number of donations
              </p>
            </div>
            <div className="p-3 bg-background rounded-full">
              <Info className="w-6 h-6 text-accent" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Donation Type Counts KPIs - Updated to include total count */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-accent">One-Time Donations</p>
              <p className="text-2xl font-bold text-primary">
                {stats.singleCount}
              </p>
              <p className="text-xs text-accent">
                All single donations
              </p>
            </div>
            <div className="p-3 bg-background rounded-full">
              <FileText className="w-6 h-6 text-accent" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-accent">Recurring Donations</p>
              <p className="text-2xl font-bold text-primary">
                {stats.recurringCount}
              </p>
              <p className="text-xs text-accent">
                All recurring donations
              </p>
            </div>
            <div className="p-3 bg-background rounded-full">
              <Calendar className="w-6 h-6 text-accent" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-accent">Installment Donations</p>
              <p className="text-2xl font-bold text-primary">
                {stats.installmentsCount}
              </p>
              <p className="text-xs text-accent">
                All installment donations
              </p>
            </div>
            <div className="p-3 bg-background rounded-full">
              <TrendingUp className="w-6 h-6 text-accent" />
            </div>
          </div>
        </div>
      </div>

      {/* Donation Type Distribution Pie Chart */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-green-100">
        <h3 className="text-lg font-semibold mb-4">Donation Type Distribution</h3>
        <div className="relative h-64">
          <Pie
            data={{
              labels: ['One-Time', 'Recurring', 'Installments'],
              datasets: [{
                data: [stats.singleCount, stats.recurringCount, stats.installmentsCount],
                backgroundColor: getChartColors(),
                borderWidth: 1
              }]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom'
                }
              }
            }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search donations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                <option value="All">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
                <option value="ended">Ended</option>
              </select>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                <option value="All">All Types</option>
                <option value="one-time">One Time</option>
                <option value="recurring">Recurring</option>
                <option value="installments">Installments</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleExportDonations}
            disabled={exportLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-light focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportLoading ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            <span>{exportLoading ? "Exporting..." : "Export "}</span>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Donation ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Donor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project/Cause
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Donation Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  On Behalf Of
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {donations.map((donation) => (
                <tr key={donation.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {donation.donationId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {donation.donor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${donation.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {donation.cause}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {donation.items?.[0]?.donationType || "Sadaqah"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {donation.items?.map(item => item.onBehalfOf).filter(Boolean).join(", ") || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${donation.type === 'one-time' ? 'bg-accent/10 text-primary' : donation.type === 'recurring' ? 'bg-accent/10 text-emerald-800' : donation.type === 'installments' ? 'bg-cyan-100 text-cyan-800' : 'bg-gray-100 text-gray-800'}`}>
                      {donation.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {donation.paymentMethod}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(donation.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      donation.status === 'completed' ? 'bg-accent/10 text-primary' : 
                      donation.status === 'ended' ? 'bg-accent/10 text-primary' : 
                      donation.status === 'failed' ? 'bg-red-100 text-red-800' : 
                      donation.status === 'cancelled' ? 'bg-gray-200 text-gray-800' : 
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {donation.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {donation.paymentStatus === "pending_cancellation" ? (
                      <button
                        onClick={() => {
                          setSelectedDonation(donation);
                          setShowCancelRequestDialog(true);
                        }}
                        className="text-text-muted hover:text-orange-900"
                      >
                        Process Request
                      </button>
                    ) : (
                      <button
                        onClick={() => openFullDetailModal(donation.id)}
                        className="text-accent hover:text-primary"
                      >
                        View Details
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-6">
        <div className="text-sm text-gray-700">
          Showing{" "}
          {pagination.total ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} to{" "}
          {Math.min(currentPage * ITEMS_PER_PAGE, pagination.total)} of{" "}
          {pagination.total} entries
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className={`p-2 rounded-lg ${
              currentPage === 1
                ? "text-gray-400 cursor-not-allowed"
                : "text-accent hover:bg-background"
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
            let pageNumber;
            if (pagination.pages <= 5) {
              pageNumber = i + 1;
            } else if (currentPage <= 3) {
              pageNumber = i + 1;
            } else if (currentPage >= pagination.pages - 2) {
              pageNumber = pagination.pages - (4 - i);
            } else {
              pageNumber = currentPage - 2 + i;
            }

            return (
              <button
                key={i}
                onClick={() => setCurrentPage(pageNumber)}
                className={`px-3 py-1 rounded-lg ${
                  currentPage === pageNumber
                    ? "bg-accent text-white"
                    : "text-gray-600 hover:bg-background"
                }`}
              >
                {pageNumber}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === pagination.pages}
            className={`p-2 rounded-lg ${
              currentPage === pagination.pages
                ? "text-gray-400 cursor-not-allowed"
                : "text-accent hover:bg-background"
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Donation Details Modal */}
      {fullDetailModalOpen && fullDonationDetails && (
        <DonationDetailsModal
          donation={fullDonationDetails}
          onClose={closeFullDetailModal}
          onDownloadReceipt={() => handleDownloadReceipt(fullDonationDetails)}
          onUpdateStatus={updateDonationStatus}
        />
      )}

      {/* No donations message */}
      {donations.length === 0 && !loading && (
        <div className="bg-white rounded-xl p-8 text-center shadow-lg border border-gray-100">
          <div className="mx-auto w-16 h-16 bg-background rounded-full flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-accent" />
          </div>
          <h3 className="text-lg font-medium text-primary mb-1">
            No donations found
          </h3>
          <p className="text-accent">
            {searchTerm || selectedStatus !== "All" || selectedType !== "All"
              ? "Try adjusting your search or filter settings"
              : "There are no donations in the system yet"}
          </p>
        </div>
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
    </div>
  );
};

export default AdminDonationsList;