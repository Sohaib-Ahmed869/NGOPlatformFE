import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  Filter,
  Loader,
  CheckCircle,
  Info,
  FileText,
  DollarSign,
  AlertCircle,
  Layers
} from "lucide-react";
import AdminDonationService from "../../services/adminDonation.service";
import { toast } from "react-hot-toast";
import logo from "../../assets/logo.png";
import footer2 from "../../assets/footer3.png";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const AdminInstallments = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [donations, setDonations] = useState([]);
  const [filteredDonations, setFilteredDonations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [stats, setStats] = useState({
    totalAmount: 0,
    activeInstallments: 0,
    totalInstallments: 0,
    averageInstallment: 0,
  });

  useEffect(() => {
    fetchInstallments();
  }, []);

  const fetchInstallments = async () => {
    try {
      setLoading(true);
      const response = await AdminDonationService.getDonations({
        page: 1,
        limit: 10000, // Large limit to get all donations
      });

      // Filter for installment donations
      const installmentDonations = response.donations.filter(
        donation => donation.paymentType === "installments"
      );

      // Calculate stats
      const totalAmount = installmentDonations.reduce(
        (sum, donation) => sum + donation.totalAmount,
        0
      );

      const activeInstallments = installmentDonations.filter(
        donation => 
          donation.paymentStatus !== "cancelled" &&
          donation.paymentStatus !== "failed" &&
          donation.paymentStatus !== "ended" &&
          donation.installmentDetails?.installmentsPaid < donation.installmentDetails?.numberOfInstallments
      ).length;

      const totalInstallments = installmentDonations.length;

      const averageInstallment = totalInstallments > 0 
        ? totalAmount / totalInstallments 
        : 0;

      setStats({
        totalAmount,
        activeInstallments,
        totalInstallments,
        averageInstallment,
      });

      // Map donations for display
      const mappedDonations = installmentDonations.map(donation => ({
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
        installmentDetails: donation.installmentDetails,
        adminCostContribution: donation.adminCostContribution,
        items: donation.items || [],
        receiptUrl: donation.receiptUrl || null
      }));

      setDonations(mappedDonations);
    } catch (error) {
      toast.error(error.message || "Failed to fetch installments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Filter donations based on search term and status
    const filtered = donations.filter(donation => {
      const matchesSearch = 
        donation.donationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        donation.donor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        donation.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        donation.cause.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || donation.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    setFilteredDonations(filtered);
  }, [donations, searchTerm, statusFilter]);

  const getStatusDistribution = () => {
    const statusCounts = {
      active: 0,
      failed: 0,
      ended: 0,
      cancelled: 0
    };

    donations.forEach(donation => {
      if (donation.status === "pending" || 
          (donation.status !== "cancelled" && 
           donation.status !== "failed" && 
           donation.status !== "ended" &&
           donation.installmentDetails?.installmentsPaid < donation.installmentDetails?.numberOfInstallments)) {
        statusCounts.active++;
      } else if (donation.status === "failed") {
        statusCounts.failed++;
      } else if (donation.status === "ended") {
        statusCounts.ended++;
      } else if (donation.status === "cancelled") {
        statusCounts.cancelled++;
      }
    });

    return {
      labels: ['Active', 'Failed', 'Ended', 'Cancelled'],
      datasets: [{
        data: [
          statusCounts.active,
          statusCounts.failed,
          statusCounts.ended,
          statusCounts.cancelled
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',   // Bright green for Active
          'rgba(22, 163, 74, 0.8)',   // Dark green for Failed
          'rgba(21, 128, 61, 0.8)',   // Forest green for Ended
          'rgba(20, 83, 45, 0.8)'     // Deep green for Cancelled
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(22, 163, 74, 1)',
          'rgba(21, 128, 61, 1)',
          'rgba(20, 83, 45, 1)'
        ],
        borderWidth: 1
      }]
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-8 h-8 animate-spin text-[#C9A84C]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#C9A84C]/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Installment Amount</p>
              <p className="text-2xl font-bold text-[#2C2418]">
                ${stats.totalAmount.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">Total amount of all installment donations</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-full">
              <DollarSign className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#C9A84C]/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Installments</p>
              <p className="text-2xl font-bold text-[#2C2418]">
                {stats.activeInstallments}
              </p>
              <p className="text-xs text-gray-500">Number of active installment plans</p>
            </div>
            <div className="p-3 bg-[#FAF7F2] rounded-full">
              <Layers className="w-6 h-6 text-[#C9A84C]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#C9A84C]/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Installments</p>
              <p className="text-2xl font-bold text-[#2C2418]">
                {stats.totalInstallments}
              </p>
              <p className="text-xs text-gray-500">Total number of installment plans</p>
            </div>
            <div className="p-3 bg-[#FAF7F2] rounded-full">
              <CheckCircle className="w-6 h-6 text-[#C9A84C]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#C9A84C]/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Installment</p>
              <p className="text-2xl font-bold text-[#2C2418]">
                ${stats.averageInstallment.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">Average amount per installment plan</p>
            </div>
            <div className="p-3 bg-[#FAF7F2] rounded-full">
              <Info className="w-6 h-6 text-[#C9A84C]" />
            </div>
          </div>
        </div>
      </div>

      {/* Status Distribution Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-[#C9A84C]/10 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Installment Status Distribution</h2>
        <div className="w-full max-w-md mx-auto">
          <Pie data={getStatusDistribution()} options={chartOptions} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#C9A84C]/10">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Installment Donations</h2>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent"
                />
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <Filter className="w-4 h-4" />
                  Filter
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showFilterMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <div className="p-2">
                      <div className="text-xs font-medium text-gray-500 px-2 py-1">Status</div>
                      <button
                        onClick={() => {
                          setStatusFilter("all");
                          setShowFilterMenu(false);
                        }}
                        className={`w-full text-left px-2 py-1 text-sm rounded ${
                          statusFilter === "all" ? "bg-[#FAF7F2] text-[#B8952F]" : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => {
                          setStatusFilter("completed");
                          setShowFilterMenu(false);
                        }}
                        className={`w-full text-left px-2 py-1 text-sm rounded ${
                          statusFilter === "completed" ? "bg-[#FAF7F2] text-[#B8952F]" : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        Completed
                      </button>
                      <button
                        onClick={() => {
                          setStatusFilter("pending");
                          setShowFilterMenu(false);
                        }}
                        className={`w-full text-left px-2 py-1 text-sm rounded ${
                          statusFilter === "pending" ? "bg-[#FAF7F2] text-[#B8952F]" : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        Pending
                      </button>
                      <button
                        onClick={() => {
                          setStatusFilter("cancelled");
                          setShowFilterMenu(false);
                        }}
                        className={`w-full text-left px-2 py-1 text-sm rounded ${
                          statusFilter === "cancelled" ? "bg-[#FAF7F2] text-[#B8952F]" : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        Cancelled
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
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
                    Cause
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Installments
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDonations.map((donation) => (
                  <tr key={donation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {donation.donationId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{donation.donor}</div>
                        <div className="text-sm text-gray-500">{donation.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${donation.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {donation.cause}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {donation.installmentDetails?.installmentsPaid || 0} / {donation.installmentDetails?.numberOfInstallments || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        donation.status === "completed" ? "bg-[#C9A84C]/10 text-[#2C2418]" :
                        donation.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                        donation.status === "cancelled" ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {donation.status.charAt(0).toUpperCase() + donation.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(donation.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredDonations.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No installment donations found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminInstallments; 