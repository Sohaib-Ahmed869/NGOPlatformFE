import { useState } from "react";
import Portal from "../../components/Portal";
import { AnimatePresence, motion } from "framer-motion";
import { XCircle, Loader2 } from "lucide-react";
import { CustomSelect } from "../../components/CustomSelect";

const LOST_REASONS = [
  { value: "budget", label: "Budget" },
  { value: "timing", label: "Bad timing" },
  { value: "chose_competitor", label: "Chose a competitor" },
  { value: "no_response", label: "Stopped responding" },
  { value: "not_a_fit", label: "Not a fit" },
  { value: "other", label: "Other" },
];

/** Blocks a stage change to "lost" until a reason is picked — the API requires it. */
export default function LostReasonModal({ lead, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      await onConfirm(reason, note);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        <motion.div className="fixed inset-0 z-[90] flex items-center justify-center p-4 [&_*]:!rounded-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !submitting && onClose?.()} />
          <motion.div
            className="relative w-full max-w-sm border border-gray-100 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[var(--admin-elevated)]"
            initial={{ scale: 0.96, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 16 }}
          >
            <div className="mb-3 flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/70">
                <XCircle className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Mark {lead.orgName} as lost</h3>
                <p className="text-xs text-gray-500 dark:text-white/60">A reason is required.</p>
              </div>
            </div>

            <label className="mb-1 mt-3 block text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">Reason</label>
            <CustomSelect value={reason} onChange={setReason} options={LOST_REASONS} placeholder="Choose a reason" className="w-full" triggerClassName="w-full border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/10 dark:bg-white/5" />

            <label className="mb-1 mt-3 block text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full resize-none border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/10 dark:bg-white/5"
              placeholder="Anything worth remembering…"
            />

            <div className="mt-5 flex gap-3">
              <button type="button" onClick={onClose} disabled={submitting} className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5">
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting || !reason}
                className="inline-flex flex-1 items-center justify-center gap-2 bg-gray-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Mark lost
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
}
