import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Loader from "../../components/Loader";
import {
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  Filter,
  Loader2,
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
import KpiCard from "../../components/KpiCard";

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
      <Loader />
    );
  }

  const statusStyle = (s) => ({ active: "bg-green-50 text-green-700", completed: "bg-green-50 text-green-700", pending: "bg-yellow-50 text-yellow-700", failed: "bg-red-50 text-red-700", cancelled: "bg-gray-100 text-gray-600", ended: "bg-gray-100 text-gray-600" }[s] || "bg-gray-100 text-gray-600");

  // Donut data from Chart.js getStatusDistribution
  const donutData = (() => {
    const COLORS = ["#34D399", "#FB923C", "#818CF8", "#F472B6"];
    const dist = getStatusDistribution();
    return (dist.labels || []).map((label, i) => ({
      name: label, value: dist.datasets?.[0]?.data?.[i] || 0, color: COLORS[i % COLORS.length],
    }));
  })();
  const donutTotal = donutData.reduce((s, d) => s + d.value, 0);

  return (
    <motion.div className="lg:p-6 mt-20 lg:mt-0 space-y-6 bg-background/30 min-h-screen"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div>
        <h1 className="text-2xl font-heading font-bold text-primary">Installments</h1>
        <p className="text-sm text-text-muted mt-0.5">{filteredDonations.length} installment plans</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard title="Total Amount" value={`$${stats.totalAmount.toLocaleString()}`} icon={DollarSign} color="#F59E0B" animate={false} />
        <KpiCard title="Active" value={stats.activeInstallments} icon={Layers} color="#059669" animate={false} />
        <KpiCard title="Total Plans" value={stats.totalInstallments} icon={CheckCircle} color="#8B5CF6" animate={false} />
        <KpiCard title="Average" value={`$${stats.averageInstallment.toLocaleString()}`} icon={Info} color="#06B6D4" animate={false} />
      </div>

      {/* Status Donut */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center">
        <h2 className="text-sm font-semibold text-primary mb-4 self-start">Status Distribution</h2>
        {(() => {
          const r = 58, c = 2 * Math.PI * r, gap = 8;
          let offset = 0;
          return (
            <>
              <svg width={160} height={160} viewBox="0 0 140 140">
                <circle cx="70" cy="70" r={r} fill="none" stroke="#f1f5f9" strokeWidth="16" />
                {donutTotal > 0 && donutData.filter(s => s.value > 0).map((seg, i) => {
                  const pct = seg.value / donutTotal;
                  const dashLen = Math.max(0, pct * c - gap);
                  const el = <circle key={i} cx="70" cy="70" r={r} fill="none" stroke={seg.color} strokeWidth="16"
                    strokeLinecap="round" strokeDasharray={`${dashLen} ${c - dashLen}`}
                    strokeDashoffset={-offset} transform="rotate(-90 70 70)" />;
                  offset += pct * c;
                  return el;
                })}
                <text x="70" y="66" textAnchor="middle" fontSize="20" fontWeight="700" fill="currentColor" className="text-primary">{donutTotal}</text>
                <text x="70" y="82" textAnchor="middle" fontSize="10" fill="#94a3b8">plans</text>
              </svg>
              <div className="flex gap-4 mt-4 flex-wrap justify-center">
                {donutData.filter(s => s.value > 0).map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="text-[11px] text-text-muted">{s.name} ({s.value})</span>
                  </div>
                ))}
              </div>
            </>
          );
        })()}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search installments..."
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none w-56" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {filteredDonations.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="w-10 h-10 mx-auto mb-3 text-text-muted" />
            <p className="text-primary font-medium mb-1">No installment donations found</p>
            <p className="text-sm text-text-muted">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Donation ID", "Donor", "Amount", "Cause", "Progress", "Status", "Date"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDonations.map((d) => {
                  const paid = d.installmentDetails?.installmentsPaid || 0;
                  const total = d.installmentDetails?.numberOfInstallments || 0;
                  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
                  return (
                    <tr key={d.id} className="border-b border-gray-50 last:border-0 hover:bg-background/50 transition-colors">
                      <td className="px-4 py-3.5 text-sm font-medium text-primary">{d.donationId}</td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-primary">{d.donor}</p>
                        <p className="text-xs text-text-muted">{d.email}</p>
                      </td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-primary">${d.amount.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-sm text-text-muted">{d.cause}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[80px]">
                            <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[11px] text-text-muted font-medium">{paid}/{total}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${statusStyle(d.status)}`}>{d.status}</span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-text-muted">{new Date(d.date).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AdminInstallments; 