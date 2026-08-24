import { useState } from "react";
import { Loader2, Check, ShieldCheck, Smartphone, KeyRound } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "react-hot-toast";
import OtpInput from "../../components/OtpInput";
import AuthService from "../../services/auth.service";

/**
 * The "not enrolled yet" → QR-scan → verify flow for TOTP 2FA. Extracted out
 * of Settings.jsx's Security tab so the mandatory-MFA gate (MfaSetupRequired)
 * can reuse the exact same enrollment UI instead of a second copy.
 */
export default function MfaEnrollPanel({ onEnabled }) {
  const [mfaSetup, setMfaSetup] = useState(null); // { secret, otpauthUrl }
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);

  const startMfaSetup = async () => {
    if (mfaBusy) return;
    setMfaBusy(true);
    try {
      const d = await AuthService.mfaSetup();
      setMfaSetup(d);
      setMfaCode("");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to start 2FA setup");
    } finally {
      setMfaBusy(false);
    }
  };

  const enableMfa = async (codeArg) => {
    const code = codeArg || mfaCode;
    if (mfaBusy) return;
    if (code.length !== 6) return toast.error("Enter the 6-digit code");
    setMfaBusy(true);
    try {
      await AuthService.mfaEnable(code);
      setMfaSetup(null);
      setMfaCode("");
      toast.success("Two-factor authentication enabled");
      onEnabled?.();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Invalid code");
      setMfaCode("");
    } finally {
      setMfaBusy(false);
    }
  };

  if (!mfaSetup) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-8 text-center dark:border-white/10 dark:bg-white/5 sm:p-12">
        <div className="mx-auto max-w-md">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 text-accent">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <h4 className="text-base font-semibold text-gray-900 dark:text-white">Add an extra layer of security</h4>
          <p className="mt-1 text-sm text-gray-500">
            Protect your operator account with an authenticator app. You'll enter a rotating 6-digit code each time you sign in.
          </p>
          <button
            type="button"
            onClick={startMfaSetup}
            disabled={mfaBusy}
            className="mx-auto mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-light disabled:opacity-50"
          >
            {mfaBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Enable 2FA
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-white/10">
      {/* Step 1 — scan */}
      <div className="flex flex-col gap-5 border-b border-gray-100 p-6 dark:border-white/10 sm:flex-row sm:items-start">
        <div className="mx-auto shrink-0 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:mx-0">
          <QRCodeSVG value={mfaSetup.otpauthUrl} size={168} level="M" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 inline-flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-[11px] font-bold text-white">1</span>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
              <Smartphone className="h-4 w-4 text-accent" /> Scan with your authenticator app
            </span>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-gray-500">
            Open Google Authenticator, Authy, Microsoft Authenticator or 1Password and point your camera at this code.
          </p>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
              <KeyRound className="h-3 w-3" /> Can't scan? Enter this key
            </div>
            <p className="select-all break-all font-mono text-sm font-bold tracking-[0.16em] text-gray-900 dark:text-white">{mfaSetup.secret}</p>
          </div>
        </div>
      </div>
      {/* Step 2 — verify */}
      <div className="p-6">
        <div className="mb-3 inline-flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-[11px] font-bold text-white">2</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Enter the 6-digit code</span>
        </div>
        <OtpInput value={mfaCode} onChange={setMfaCode} disabled={mfaBusy} autoFocus onComplete={(c) => enableMfa(c)} />
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => { setMfaSetup(null); setMfaCode(""); }}
            className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:text-white/80"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => enableMfa()}
            disabled={mfaBusy || mfaCode.length !== 6}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-light disabled:opacity-50"
          >
            {mfaBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Verify &amp; Enable
          </button>
        </div>
      </div>
    </div>
  );
}
