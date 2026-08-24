import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Shield, Eye, EyeOff, ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import superadminUsersService from "../../services/superadminUsers.service";

const PRIMARY = "#102A23";
const ACCENT = "#047857";

/**
 * Public "set your password" landing page for a platform-team invite link
 * (emailed from Team → Invite operator). Lives outside ProtectedSuperAdminRoute
 * — the token itself is the credential, same shape as /reset-password/:token.
 */
export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null); // { name, email, roleLabel }
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    superadminUsersService
      .getInvite(token)
      .then(setInvite)
      .catch((err) => setLoadError(err?.response?.data?.error || "This invite link is invalid or has expired."))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!password || password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirm) return toast.error("Passwords don't match");
    setSubmitting(true);
    try {
      await superadminUsersService.acceptInvite(token, password);
      setDone(true);
      toast.success("Account activated");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to activate account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12" style={{ backgroundColor: "#F3F8F5" }}>
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${ACCENT}18` }}>
            <Shield className="h-7 w-7" style={{ color: ACCENT }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>Join the platform team</h1>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: ACCENT }} />
            </div>
          ) : loadError ? (
            <div className="text-center">
              <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-300" />
              <p className="text-sm text-gray-600">{loadError}</p>
              <Link to="/login" className="mt-4 inline-block text-sm font-medium hover:underline" style={{ color: ACCENT }}>
                Back to sign in
              </Link>
            </div>
          ) : done ? (
            <div className="text-center">
              <p className="text-sm text-gray-600">Your account is set up — taking you to sign in…</p>
            </div>
          ) : (
            <>
              <p className="mb-6 text-sm text-gray-500">
                You've been invited as <strong className="text-gray-800">{invite.roleLabel}</strong> ({invite.email}). Set a
                password to activate your account.
              </p>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium" style={{ color: PRIMARY }}>Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 pr-12 outline-none transition-all focus:border-accent"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={submitting}
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowPassword((v) => !v)}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium" style={{ color: PRIMARY }}>Confirm password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 outline-none transition-all focus:border-accent"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold text-white transition-all hover:scale-[1.01] disabled:opacity-50"
                  style={{ background: `linear-gradient(180deg, #0f9d6d, ${ACCENT})`, boxShadow: `0 2px 12px ${ACCENT}40` }}
                >
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><span>Activate account</span><ArrowRight size={18} /></>}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
