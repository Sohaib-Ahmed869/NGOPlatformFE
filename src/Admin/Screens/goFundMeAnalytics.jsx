import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2, DollarSign, Users, TrendingUp, Receipt, BarChart3 } from "lucide-react";
import Portal from "../../components/Portal";

const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="border border-gray-100 bg-white p-3.5 shadow-sm">
      <div className="flex items-center gap-2 text-text-muted">
        <Icon className="h-4 w-4 text-accent" />
        <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 text-xl font-bold text-primary">{value}</p>
    </div>
  );
}

export default function GoFundMeAnalytics({ open, onClose, loading, data }) {
  const a = data?.analytics;
  const c = data?.campaign;
  const o = a?.overview || {};

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden border border-gray-100 bg-white shadow-2xl" initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}>
              <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-accent" />
                  <div>
                    <h3 className="text-base font-semibold text-primary">Campaign analytics</h3>
                    {c && <p className="text-xs text-text-muted">{c.title}</p>}
                  </div>
                </div>
                <button onClick={onClose} className="grid h-8 w-8 place-items-center text-text-muted hover:bg-gray-100"><X className="h-4 w-4" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loading || !a ? (
                  <div className="flex h-40 items-center justify-center text-text-muted"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  <div className="space-y-6">
                    {c && (
                      <div>
                        <div className="mb-1.5 flex items-end justify-between">
                          <span className="text-lg font-bold text-accent">{money(c.currentAmount)}</span>
                          <span className="text-sm text-text-muted">of {money(c.targetAmount)} · {Math.round(a.progressPercentage || 0)}%</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-gray-200">
                          <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light" style={{ width: `${Math.min(100, a.progressPercentage || 0)}%` }} />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <Stat icon={Users} label="Donations" value={o.totalDonations || 0} />
                      <Stat icon={DollarSign} label="Gross" value={money(o.totalAmount)} />
                      <Stat icon={TrendingUp} label="Net" value={money(o.totalNetAmount)} />
                      <Stat icon={Receipt} label="Fees" value={money(o.totalFees)} />
                      <Stat icon={DollarSign} label="Average" value={money(o.averageDonation)} />
                      <Stat icon={DollarSign} label="Largest" value={money(o.maxDonation)} />
                    </div>

                    <div>
                      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">By payment method</h4>
                      {(a.paymentMethods || []).length === 0 ? (
                        <p className="text-sm text-text-muted">No donations yet.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {a.paymentMethods.map((m) => (
                            <div key={m._id} className="flex items-center justify-between border border-gray-100 px-3 py-2 text-sm">
                              <span className="capitalize text-primary">{m._id || "unknown"}</span>
                              <span className="text-text-muted">{m.count} · {money(m.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">Anonymity</h4>
                      <div className="flex gap-3 text-sm">
                        {(a.anonymityStats || []).map((s) => (
                          <div key={String(s._id)} className="flex-1 border border-gray-100 px-3 py-2">
                            <p className="text-primary">{s._id ? "Anonymous" : "Named"}</p>
                            <p className="text-text-muted">{s.count} · {money(s.amount)}</p>
                          </div>
                        ))}
                        {(!a.anonymityStats || a.anonymityStats.length === 0) && <p className="text-text-muted">No donations yet.</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
