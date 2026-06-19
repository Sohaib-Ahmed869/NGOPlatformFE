import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";
import Portal from "../../components/Portal";
import { cn } from "../../utils/cn";

/**
 * Console-wide confirmation dialog. Mounted once (in the SuperAdmin Layout) and
 * consumed imperatively via `useConfirm()` — no per-screen modal boilerplate, no
 * native `window.confirm`. Promise-based:
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title, message, tone: "danger", confirmText: "Delete" }))) return;
 *   // …do the destructive thing
 *
 * Pass an async `onConfirm` to run the action INSIDE the dialog (the confirm
 * button spins, the dialog closes on success and stays open on a thrown error —
 * the caller's onConfirm is expected to surface its own toast in that case):
 *
 *   await confirm({ title, tone: "danger", onConfirm: () => api.delete(id) });
 *
 * Options: { title, message, confirmText, cancelText, tone: "danger"|"default", icon, onConfirm }.
 */
const ConfirmContext = createContext(null);

const TONES = {
  danger: {
    iconWrap: "bg-red-50 text-red-500 ring-1 ring-red-100 dark:bg-red-500/10 dark:ring-red-500/20",
    confirm: "bg-red-600 hover:bg-red-700",
  },
  default: {
    iconWrap: "bg-accent/10 text-accent ring-1 ring-accent/15",
    confirm: "bg-accent hover:bg-accent-light",
  },
};

export function ConfirmProvider({ children }) {
  const [opts, setOpts] = useState(null);
  const [busy, setBusy] = useState(false);
  const resolverRef = useRef(null);

  const confirm = useCallback(
    (options = {}) =>
      new Promise((resolve) => {
        resolverRef.current = resolve;
        setBusy(false);
        setOpts(options);
      }),
    [],
  );

  const settle = useCallback((result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOpts(null);
    setBusy(false);
  }, []);

  const cancel = useCallback(() => {
    if (!busy) settle(false);
  }, [busy, settle]);

  const accept = useCallback(async () => {
    if (typeof opts?.onConfirm === "function") {
      setBusy(true);
      try {
        await opts.onConfirm();
        settle(true);
      } catch {
        // Keep the dialog open; the caller's onConfirm surfaces its own error.
        setBusy(false);
      }
    } else {
      settle(true);
    }
  }, [opts, settle]);

  // Esc cancels (when not mid-action), regardless of focus.
  useEffect(() => {
    if (!opts) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") cancel();
      else if (e.key === "Enter") accept();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [opts, cancel, accept]);

  const tone = TONES[opts?.tone] || TONES.default;
  const Icon = opts?.icon || AlertTriangle;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Portal>
        <AnimatePresence>
          {opts && (
            <motion.div
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 [&_*]:!rounded-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={cancel} />
              <motion.div
                role="alertdialog"
                aria-modal="true"
                className="relative w-full max-w-sm border border-gray-100 bg-white p-6 text-center shadow-2xl dark:border-white/10 dark:bg-[var(--admin-elevated)]"
                initial={{ scale: 0.96, y: 16 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: 16 }}
              >
                <div className={cn("mx-auto mb-3 grid h-12 w-12 place-items-center", tone.iconWrap)}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{opts.title || "Are you sure?"}</h3>
                {opts.message ? (
                  <p className="mt-1.5 break-words text-sm text-gray-500 dark:text-white/70">{opts.message}</p>
                ) : null}
                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={cancel}
                    disabled={busy}
                    autoFocus
                    className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5"
                  >
                    {opts.cancelText || "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={accept}
                    disabled={busy}
                    className={cn(
                      "inline-flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50",
                      tone.confirm,
                    )}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {opts.confirmText || "Confirm"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}
