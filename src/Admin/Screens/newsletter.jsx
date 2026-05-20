import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Download, Mail, Users, Clock, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import axiosInstance from "../../services/axios";
import Loader from "../../components/Loader";
import KpiCard from "../../components/KpiCard";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.4 } }),
};

const NewsletterSubscribersScreen = () => {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredSubscribers, setFilteredSubscribers] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);
  const perPage = 10;

  useEffect(() => {
    const fetchSubscribers = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get("/newsletters");
        setSubscribers(response.data);
        setFilteredSubscribers(response.data);
      } catch { setError("Failed to fetch subscribers"); }
      finally { setLoading(false); }
    };
    fetchSubscribers();
  }, []);

  useEffect(() => {
    const results = subscribers.filter((s) =>
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSubscribers(results);
    setCurrentPage(1);
  }, [searchTerm, subscribers]);

  const totalPages = Math.ceil(filteredSubscribers.length / perPage);
  const pageSubscribers = filteredSubscribers.slice((currentPage - 1) * perPage, currentPage * perPage);

  const activeCount = subscribers.filter((s) => s.isActive !== false).length;
  const recentCount = subscribers.filter((s) => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return new Date(s.createdAt) >= oneMonthAgo;
  }).length;

  const exportToCSV = () => {
    try {
      setExportLoading(true);
      const header = "Email,Joined Date,Status";
      const csvData = filteredSubscribers.map((s) => {
        const date = s.createdAt ? new Date(s.createdAt).toISOString().split("T")[0] : "";
        const status = s.isActive === false ? "Unsubscribed" : "Active";
        return `"${s.email}","${date}","${status}"`;
      });
      const csv = [header, ...csvData].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `newsletter_subscribers_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch { /* ignore */ }
    finally { setExportLoading(false); }
  };

  if (loading) return <Loader label="Loading subscribers" />;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-500 mb-3">{error}</p>
          <button onClick={() => window.location.reload()}
            className="px-4 py-2 bg-accent text-white rounded-xl text-sm">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <motion.div className="lg:p-6 mt-20 lg:mt-0 space-y-6 bg-background/30 min-h-screen" initial="hidden" animate="visible">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-primary">Newsletter</h1>
          <p className="text-sm text-text-muted mt-0.5">{subscribers.length} subscribers</p>
        </div>
        <button onClick={exportToCSV} disabled={exportLoading}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50">
          {exportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export CSV
        </button>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard title="Total Subscribers" value={subscribers.length} icon={Users} color="#059669" animate={false} />
        <KpiCard title="Active" value={activeCount} icon={Mail} color="#8B5CF6" animate={false} />
        <KpiCard title="This Month" value={recentCount} icon={Clock} color="#06B6D4" animate={false} />
      </div>

      {/* Search */}
      <motion.div variants={fadeUp} custom={2} className="relative">
        <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by email..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none" />
      </motion.div>

      {/* Table */}
      {filteredSubscribers.length === 0 ? (
        <motion.div variants={fadeUp} custom={3}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Mail className="w-10 h-10 mx-auto mb-3 text-text-muted" />
          <p className="text-text-muted">{searchTerm ? `No results for "${searchTerm}"` : "No subscribers yet"}</p>
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} custom={3}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider">Email</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider">Joined</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {pageSubscribers.map((sub, i) => (
                  <tr key={sub._id || i} className="border-b border-gray-50 last:border-0 hover:bg-background/50 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium text-primary">{sub.email}</td>
                    <td className="px-5 py-3.5 text-sm text-text-muted">
                      {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        sub.isActive === false
                          ? "bg-red-50 text-red-600 ring-1 ring-red-200"
                          : "bg-green-50 text-green-700 ring-1 ring-green-200"
                      }`}>
                        {sub.isActive === false ? "Unsubscribed" : "Active"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted">
            {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, filteredSubscribers.length)} of {filteredSubscribers.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
              className="p-1.5 rounded-lg text-text-muted hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pg;
              if (totalPages <= 5) pg = i + 1;
              else if (currentPage <= 3) pg = i + 1;
              else if (currentPage >= totalPages - 2) pg = totalPages - (4 - i);
              else pg = currentPage - 2 + i;
              return (
                <button key={i} onClick={() => setCurrentPage(pg)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium ${currentPage === pg ? "bg-accent text-white" : "text-text-muted hover:bg-gray-100"}`}>
                  {pg}
                </button>
              );
            })}
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg text-text-muted hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default NewsletterSubscribersScreen;
