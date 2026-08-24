import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Lock, Smartphone, Clock } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import AuthService from "../../services/auth.service";
import MfaEnrollPanel from "../components/MfaEnrollPanel";
import SAPageHeader from "../components/SAPageHeader";
import { ROLE_LABELS } from "../utils/platformRoles";

const card = "rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-[var(--admin-card)]";
// Same brand gradient the rest of the console's hero banners use (Support
// Sessions, Organisations) — keeps a forced-gate page from feeling bolted on.
const HERO_GRADIENT = "linear-gradient(145deg, var(--tenant-primary, #102A23) 0%, var(--tenant-accent, #047857) 100%)";

const REASONS = [
  { icon: Lock, text: "Your role can touch billing, tenant data, support sessions and other operator accounts." },
  { icon: Smartphone, text: "Any authenticator app works — Google Authenticator, Authy, Microsoft Authenticator, 1Password…" },
  { icon: Clock, text: "Takes about a minute, and you'll only ever need to do this once." },
];

/**
 * Forced enrollment gate for Owner/Admin operators — routed here by
 * ProtectedSuperAdminRoute whenever the cached user carries
 * mfaSetupRequired:true. Nothing else in the console is reachable until this
 * completes.
 */
export default function MfaSetupRequired() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const onEnabled = () => {
    const updated = AuthService.updateStoredUser({ mfaSetupRequired: false });
    setUser(updated || { ...user, mfaSetupRequired: false });
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="[&_*]:!rounded-none">
      <SAPageHeader
        eyebrow="Security"
        title="Two-factor authentication required"
        subtitle="Finish setting this up to continue into the console — nothing else is reachable until it's done."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* Left — why, styled like the console's other gradient heroes */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className={`${card} overflow-hidden lg:sticky lg:top-24`}
        >
          <div className="relative overflow-hidden px-6 py-8 text-white" style={{ background: HERO_GRADIENT }}>
            <svg aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 text-white" viewBox="0 0 128 128" fill="none">
              <circle cx="64" cy="64" r="46" fill="currentColor" fillOpacity="0.06" />
              <circle cx="64" cy="64" r="46" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" />
            </svg>
            <span className="relative z-10 mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <h2 className="relative z-10 text-lg font-bold leading-snug">Locked to your account until this is done</h2>
            <p className="relative z-10 mt-3 flex flex-wrap items-center gap-2 text-sm text-white/75">
              <span className="font-medium text-white">{user?.name || user?.email}</span>
              <span className="inline-flex items-center gap-1 bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white ring-1 ring-white/25">
                {ROLE_LABELS[user?.platformRole] || "Operator"}
              </span>
            </p>
          </div>
          <div className="space-y-4 p-6">
            {REASONS.map((r, i) => {
              const Icon = r.icon;
              return (
                <div key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center bg-accent/10 text-accent">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="text-sm text-gray-600 dark:text-white/70">{r.text}</p>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Right — the actual enrollment flow */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.06, ease: "easeOut" }}>
          <MfaEnrollPanel onEnabled={onEnabled} />
        </motion.div>
      </div>
    </div>
  );
}
