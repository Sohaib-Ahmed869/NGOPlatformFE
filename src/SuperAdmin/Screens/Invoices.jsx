import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Receipt, ExternalLink, FileText, Building2, DollarSign } from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SAPageHeader from "../components/SAPageHeader";
import SASelect from "../components/SASelect";
import SALoader from "../SALoader";
import toast from "react-hot-toast";

const card = "rounded-xl border border-gray-100 bg-white shadow-sm";
const inputCls =
  "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-accent dark:border-white/10 dark:bg-white/5";

const STATUS = {
  paid: "bg-emerald-50 text-emerald-700",
  open: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-700",
  void: "bg-gray-100 text-gray-500",
  uncollectible: "bg-red-50 text-red-700",
};
const money = (v, ccy) => `${(ccy || "usd").toUpperCase() === "USD" ? "$" : ""}${Number(v || 0).toLocaleString()} ${(ccy || "usd").toUpperCase()}`;

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [collected, setCollected] = useState(0);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 30 };
      if (status !== "all") params.status = status;
      const res = await superadminService.getInvoices(params);
      setInvoices(res.data.invoices || []);
      setCollected(res.data.totalCollected || 0);
      setPagination(res.data.pagination || {});
    } catch {
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return (
    <div>
      <SAPageHeader
        eyebrow="Revenue"
        title="Invoices"
        subtitle="SaaS subscription invoices mirrored from Stripe."
        actions={
          <SASelect
            value={status}
            onChange={(v) => { setPage(1); setStatus(v); }}
            capitalize
            align="right"
            options={[
              { value: "all", label: "All statuses" },
              { value: "paid", label: "Paid" },
              { value: "open", label: "Open" },
              { value: "failed", label: "Failed" },
              { value: "void", label: "Void" },
            ]}
          />
        }
      />

      <motion.div className={`${card} mb-6 flex items-center gap-4 p-5`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><DollarSign className="h-5 w-5" /></span>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400">Total collected</p>
          <p className="text-2xl font-bold text-gray-900">${Number(collected).toLocaleString()}</p>
        </div>
      </motion.div>

      {loading ? (
        <SALoader />
      ) : invoices.length === 0 ? (
        <div className={`${card} py-20 text-center`}>
          <Receipt className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">No invoices yet</p>
        </div>
      ) : (
        <div className={`${card} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 text-left">
                  {["Tenant", "Invoice", "Amount", "Status", "Date", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv._id} className="border-t border-gray-100 transition-colors hover:bg-gray-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600"><Building2 className="h-3 w-3 text-gray-400" />{inv.organisationId?.name || "—"}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-500">{inv.number || inv.stripeInvoiceId?.slice(-8)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{money(inv.amountPaid || inv.amountDue, inv.currency)}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${STATUS[inv.status] || "bg-gray-100 text-gray-500"}`}>{inv.status}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {inv.hostedInvoiceUrl && <a href={inv.hostedInvoiceUrl} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-accent" title="View invoice"><ExternalLink className="h-4 w-4" /></a>}
                        {inv.invoicePdf && <a href={inv.invoicePdf} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-accent" title="PDF"><FileText className="h-4 w-4" /></a>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="mt-6 flex items-center justify-between px-1">
          <span className="font-mono text-xs text-gray-400">Page {pagination.page} of {pagination.pages} · {pagination.total} total</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-white/10">Previous</button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page >= pagination.pages} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-white/10">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
