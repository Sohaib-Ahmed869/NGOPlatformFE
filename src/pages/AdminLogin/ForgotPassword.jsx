import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Loader2, CheckCircle2, Check, KeyRound } from "lucide-react";
import superadminUsersService from "../../services/superadminUsers.service";
import { useTenant } from "../../context/TenantContext";
import { AuthCanvas, BrandLockup, GlassCard, NudgeIcon, ShimmerButton, GlassField, ACCENT, ACCENT_LIGHT } from "./PlatformAuthChrome";
import OtpInput from "../../components/OtpInput";

// Matches the server's per-account resend cooldown (RESET_RESEND_COOLDOWN_MS
// in superAdminUserController.js) — this is a UX countdown only, the server
// enforces the real limit regardless of what the client does.
const RESEND_COOLDOWN_S = 45;

/**
 * Platform-operator "forgot password" — email -> 6-digit code -> verify ->
 * new password. Shares the console's pre-auth visual language (AuthCanvas,
 * GlassCard, the same field/button primitives) with /login and
 * /accept-invite, so this reads as the same place, not a bolted-on flow.
 *
 * The server never confirms or denies whether an email belongs to a real
 * account — this page always advances to "check your code" after a request,
 * regardless of what actually happened server-side. That's deliberate: it's
 * what makes the flow enumeration-safe.
 */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const { platform } = useTenant();
  const brandName = platform?.name || "Donexus";

  const [step, setStep] = useState("email"); // "email" | "code" | "password" | "done"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [ticket, setTicket] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const codeRequestedAt = useRef(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const sendCode = async (e) => {
    if (e) e.preventDefault();
    if (submitting) return;
    if (!/\S+@\S+\.\S+/.test(email)) return toast.error("Enter a valid email address");
    // Resending while a code is still fresh just re-enters the same step —
    // no need to hit the server again inside the cooldown window.
    if (step === "code" && Date.now() - codeRequestedAt.current < RESEND_COOLDOWN_S * 1000) return;
    setSubmitting(true);
    try {
      await superadminUsersService.requestPasswordReset(email.trim().toLowerCase());
      codeRequestedAt.current = Date.now();
      setCooldown(RESEND_COOLDOWN_S);
      setCode("");
      setAttemptsRemaining(null);
      setStep("code");
      toast.success(step === "code" ? "Code resent" : "Code sent — check your inbox");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Couldn't send the code. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const verifyCode = async (codeOverride) => {
    const value = codeOverride || code;
    if (submitting || value.length !== 6) return;
    setSubmitting(true);
    try {
      const res = await superadminUsersService.verifyResetCode(email.trim().toLowerCase(), value);
      setTicket(res.ticket);
      setStep("password");
    } catch (err) {
      const data = err?.response?.data;
      toast.error(data?.error || "Invalid code");
      setAttemptsRemaining(typeof data?.attemptsRemaining === "number" ? data.attemptsRemaining : null);
      setCode("");
    } finally {
      setSubmitting(false);
    }
  };

  const lengthOk = password.length >= 6;
  const matchOk = password.length > 0 && password === confirm;

  const submitNewPassword = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!lengthOk) return toast.error("Password must be at least 6 characters");
    if (!matchOk) return toast.error("Passwords don't match");
    setSubmitting(true);
    try {
      await superadminUsersService.resetPasswordWithCode(email.trim().toLowerCase(), ticket, password);
      setStep("done");
      toast.success("Password updated");
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to reset password");
      // A stale/expired ticket can't be retried — send them back for a fresh code.
      if (err?.response?.status === 400) setStep("email");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen" data-admin-theme="light">
      <AuthCanvas />

      <div className="relative z-10 px-6 pt-8 sm:px-10 lg:px-14 lg:pt-10">
        <BrandLockup name={brandName} />
      </div>

      <div className="relative z-10 flex min-h-[calc(100vh-88px)] items-center justify-center px-6 py-10">
        <div className="w-full max-w-[420px]">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}>
            <h1 className="text-[28px] font-semibold leading-[1.16] tracking-[-0.02em] text-white">
              Reset your password
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-white/45">
              {step === "email" && "Enter your email and we'll send a 6-digit code to verify it's you."}
              {step === "code" && "Enter the code we sent — it's valid for 10 minutes."}
              {step === "password" && "Choose a new password for your account."}
              {step === "done" && "You're all set."}
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.12, ease: [0.2, 0.7, 0.2, 1] }} className="mt-8">
            <GlassCard>
              <AnimatePresence mode="wait">
                {step === "email" && (
                  <motion.div key="email" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                    <form onSubmit={sendCode} className="space-y-4">
                      <GlassField
                        label="Email"
                        icon={Mail}
                        accent={ACCENT}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        disabled={submitting}
                        autoFocus
                      />
                      <ShimmerButton type="submit" accent={ACCENT} disabled={submitting} className="mt-2 h-11 w-full rounded-lg text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
                        {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><span>Send code</span><NudgeIcon><ArrowRight size={18} /></NudgeIcon></>}
                      </ShimmerButton>
                    </form>
                  </motion.div>
                )}

                {step === "code" && (
                  <motion.div key="code" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                    <p className="mb-4 text-sm text-white/55">
                      Sent to <strong className="text-white/85">{email}</strong>
                    </p>
                    <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-white/40">Verification code</label>
                    <OtpInput value={code} onChange={setCode} disabled={submitting} autoFocus accent={ACCENT} variant="glass" onComplete={(c) => verifyCode(c)} />
                    {attemptsRemaining != null && (
                      <p className="mt-2 text-xs text-amber-300/80">{attemptsRemaining > 0 ? `${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} remaining.` : "Request a new code to keep trying."}</p>
                    )}

                    <ShimmerButton
                      type="button"
                      onClick={() => verifyCode()}
                      accent={ACCENT}
                      disabled={submitting || code.length !== 6}
                      className="mt-5 h-11 w-full rounded-lg text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><span>Verify code</span><NudgeIcon><ArrowRight size={18} /></NudgeIcon></>}
                    </ShimmerButton>

                    <div className="mt-4 flex items-center justify-between text-xs">
                      <button type="button" onClick={() => { setStep("email"); setCode(""); setAttemptsRemaining(null); }} className="inline-flex items-center gap-1 text-white/40 hover:text-white/70">
                        <ArrowLeft className="h-3 w-3" /> Use a different email
                      </button>
                      <button
                        type="button"
                        onClick={sendCode}
                        disabled={cooldown > 0 || submitting}
                        className="font-medium disabled:cursor-not-allowed disabled:text-white/25"
                        style={{ color: cooldown > 0 ? undefined : ACCENT_LIGHT }}
                      >
                        {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                      </button>
                    </div>

                    {/* The server never confirms whether an email is a real
                        operator account (avoids turning this into an
                        enumeration tool), so a mistyped address fails silently
                        server-side. This is the honest way to help without
                        that trade-off: point at the two things actually
                        within the visitor's control. */}
                    <p className="mt-4 border-t pt-4 text-[11px] leading-relaxed text-white/30" style={{ borderColor: "rgba(255,255,255,.08)" }}>
                      Nothing arriving? Double-check the email above, or ask your platform Owner/Admin to confirm your account.
                    </p>
                  </motion.div>
                )}

                {step === "password" && (
                  <motion.div key="password" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                    <div className="mb-4 flex items-center gap-2 text-sm text-white/55">
                      <CheckCircle2 className="h-4 w-4" style={{ color: ACCENT_LIGHT }} />
                      Code verified — set your new password.
                    </div>
                    <form onSubmit={submitNewPassword} className="space-y-4">
                      <GlassField
                        label="New password"
                        icon={Lock}
                        accent={ACCENT}
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={submitting}
                        autoFocus
                        trailing={
                          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60" onClick={() => setShowPassword((v) => !v)}>
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        }
                      />
                      <GlassField
                        label="Confirm password"
                        icon={Lock}
                        accent={ACCENT}
                        type={showPassword ? "text" : "password"}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        disabled={submitting}
                      />
                      <div className="flex flex-col gap-1 pt-1 text-xs">
                        <span className="flex items-center gap-1.5" style={{ color: lengthOk ? ACCENT_LIGHT : "rgba(255,255,255,.35)" }}>
                          <Check className={`h-3.5 w-3.5 ${lengthOk ? "opacity-100" : "opacity-40"}`} /> At least 6 characters
                        </span>
                        <span className="flex items-center gap-1.5" style={{ color: matchOk ? ACCENT_LIGHT : "rgba(255,255,255,.35)" }}>
                          <Check className={`h-3.5 w-3.5 ${matchOk ? "opacity-100" : "opacity-40"}`} /> Passwords match
                        </span>
                      </div>
                      <ShimmerButton
                        type="submit"
                        accent={ACCENT}
                        disabled={submitting || !lengthOk || !matchOk}
                        className="mt-2 h-11 w-full rounded-lg text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><span>Reset password</span><NudgeIcon><KeyRound size={18} /></NudgeIcon></>}
                      </ShimmerButton>
                    </form>
                  </motion.div>
                )}

                {step === "done" && (
                  <motion.div key="done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="py-2 text-center">
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 16 }}
                      className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${ACCENT}25` }}
                    >
                      <CheckCircle2 className="h-7 w-7" style={{ color: ACCENT_LIGHT }} />
                    </motion.div>
                    <h2 className="text-lg font-semibold text-white">Password updated</h2>
                    <p className="mt-1.5 text-sm text-white/45">Taking you to sign in…</p>
                    <Link to="/login" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold hover:underline" style={{ color: ACCENT_LIGHT }}>
                      Sign in now <NudgeIcon><ArrowRight className="h-3.5 w-3.5" /></NudgeIcon>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          </motion.div>

          {step !== "done" && (
            <p className="mt-6 text-center text-xs text-white/25">
              Remembered it?{" "}
              <Link to="/login" className="font-medium text-white/40 hover:text-white/70">Back to sign in</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
