import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Eye, EyeOff, ArrowRight, Loader2, Check, ShieldCheck, Lock } from "lucide-react";
import superadminUsersService from "../../services/superadminUsers.service";
import { useTenant } from "../../context/TenantContext";
import {
  AuthCanvas, BrandLockup, NudgeIcon, ShimmerButton, GlassField,
  ACCENT, ACCENT_LIGHT, HAIRLINE,
} from "./PlatformAuthChrome";

/**
 * Public "set your password" landing page for a platform-team invite link
 * (emailed from SuperAdmin → Team → Invite operator). Lives outside
 * ProtectedSuperAdminRoute — the token itself is the credential, same shape
 * as /reset-password/:token.
 *
 * Laid out as a full-bleed split: the left side states what this account is
 * (which address, which role, what that role can open), the right side is the
 * only thing there is to do. They are divided by a single hairline, not by a
 * card floating in space — a card centred on a 1700px screen leaves two thirds
 * of the page as empty decoration, and pushed the button below the fold on a
 * laptop.
 *
 * Everything on the left aligns to one spine: a fixed label column, values in
 * the second. The account facts and the role's access list use the SAME grid,
 * so the whole panel reads as one table rather than three unrelated widgets.
 */

// What each capability group unlocks in the nav, in the operator's own words.
// Mirrors ROLE_CAPABILITIES in config/platformRoles.js: the server sends the
// keys, this only names them.
const CAPABILITY_COPY = {
  tenants: ["Organisations", "Tenants, branding requests and leads"],
  billing: ["Billing", "Plans, features, coupons and invoices"],
  support: ["Support", "Tickets, contact queries and support sessions"],
  ops: ["Operations", "Audit log, platform settings and the team"],
};

// Advice, not a gate. The server's rule is six characters and that stays true;
// this only tells someone about to hold platform-wide access that six is the
// floor rather than the target.
const STRENGTH = [
  { label: "", colour: "rgba(255,255,255,.18)" },
  { label: "Weak", colour: "#c96a5f" },
  { label: "Fair", colour: "#c9a24c" },
  { label: "Good", colour: ACCENT_LIGHT },
  { label: "Strong", colour: ACCENT_LIGHT },
];

function strengthOf(pw) {
  if (!pw) return { score: 0, ...STRENGTH[0] };
  let score = 1;
  if (pw.length >= 12) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw) && /[^\w\s]/.test(pw)) score += 1;
  return { score, ...STRENGTH[score] };
}

/** One row of the left panel's shared two-column grid. */
function Row({ label, children, first = false }) {
  return (
    <div
      className="grid grid-cols-[92px_minmax(0,1fr)] gap-4 py-3 sm:grid-cols-[104px_minmax(0,1fr)]"
      style={first ? undefined : { borderTop: `1px solid ${HAIRLINE}` }}
    >
      <dt className="pt-px text-[12px] leading-5 text-white/35">{label}</dt>
      <dd className="min-w-0 text-[13.5px] leading-5 text-white/80">{children}</dd>
    </div>
  );
}

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { platform } = useTenant();
  // { name, email, roleLabel, roleDescription, capabilities, invitedByName, mfaRequired }
  const [invite, setInvite] = useState(null);
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

  const lengthOk = password.length >= 6;
  const matchOk = password.length > 0 && password === confirm;
  const canSubmit = lengthOk && matchOk && !submitting;
  const strength = useMemo(() => strengthOf(password), [password]);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!lengthOk) return toast.error("Password must be at least 6 characters");
    if (!matchOk) return toast.error("Passwords don't match");
    setSubmitting(true);
    try {
      await superadminUsersService.acceptInvite(token, password);
      setDone(true);
      toast.success("Account activated");
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to activate account");
    } finally {
      setSubmitting(false);
    }
  };

  const brandName = platform?.name || "Donexus";
  const firstName = invite?.name ? invite.name.trim().split(" ")[0] : "";
  const capabilities = (invite?.capabilities || []).filter((c) => CAPABILITY_COPY[c]);

  // Loading and a dead link have no account to describe, so they don't get the
  // split — an empty context panel beside a one-line message is worse than no
  // panel at all.
  if (loading || loadError) {
    return (
      <div className="relative flex min-h-screen flex-col" data-admin-theme="light">
        <AuthCanvas />
        <div className="relative z-10 px-6 py-8 sm:px-10 lg:px-14">
          <BrandLockup name={brandName} />
        </div>
        <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-24">
          {loading ? (
            <p className="flex items-center gap-2.5 text-[13.5px] text-white/40">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking your invite
            </p>
          ) : (
            <div className="w-full max-w-[380px]">
              <h1 className="text-[22px] font-semibold tracking-tight text-white">
                This invite is no longer valid
              </h1>
              <p className="mt-2.5 text-[14px] leading-relaxed text-white/45">{loadError}</p>
              <p className="mt-5 border-t pt-5 text-[13px] leading-relaxed text-white/35" style={{ borderColor: HAIRLINE }}>
                Invites expire seven days after they are sent. Ask whoever invited you to issue a
                new one from Team → Invite operator.
              </p>
              <Link
                to="/login"
                className="group mt-6 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-white/70 hover:text-white"
              >
                Back to sign in <NudgeIcon><ArrowRight className="h-3.5 w-3.5" /></NudgeIcon>
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen" data-admin-theme="light">
      <AuthCanvas />

      <div className="relative z-10 min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,42%)] xl:grid-cols-[minmax(0,1fr)_520px]">
        {/* ── Left: what this account is ─────────────────────────────────── */}
        <section className="flex flex-col justify-between gap-14 px-6 py-8 sm:px-10 lg:px-14 lg:py-10">
          <BrandLockup name={brandName} />

          <div className="max-w-[520px]">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/30">
              Platform team invite
            </p>
            <h1 className="mt-5 text-[30px] font-semibold leading-[1.14] tracking-[-0.02em] text-white sm:text-[36px]">
              {firstName
                ? `${firstName}, you’ve been invited to the ${brandName} team.`
                : `You’ve been invited to the ${brandName} team.`}
            </h1>
            <p className="mt-4 max-w-[440px] text-[14.5px] leading-relaxed text-white/45">
              Operators run every tenant, subscription and support conversation on the platform from
              a single console.
            </p>

            <dl className="mt-9">
              <Row label="Account" first>
                <span className="block truncate font-mono text-[13px] text-white/85">{invite.email}</span>
              </Row>
              <Row label="Role">
                <span className="text-white/85">{invite.roleLabel}</span>
                {invite.roleDescription && (
                  <span className="mt-1 block text-[13px] leading-snug text-white/35">
                    {invite.roleDescription}
                  </span>
                )}
              </Row>
              {invite.invitedByName && <Row label="Invited by">{invite.invitedByName}</Row>}
            </dl>

            {capabilities.length > 0 && (
              <>
                <p className="mt-10 text-[12px] uppercase tracking-[0.14em] text-white/30">
                  Sections you can open
                </p>
                <dl className="mt-1">
                  {capabilities.map((key, i) => (
                    <Row key={key} label={CAPABILITY_COPY[key][0]} first={i === 0}>
                      <span className="text-white/45">{CAPABILITY_COPY[key][1]}</span>
                    </Row>
                  ))}
                </dl>
              </>
            )}
          </div>

          <p className="hidden text-[12px] text-white/25 lg:block">
            This link expires seven days after it was sent.
          </p>
        </section>

        {/* ── Right: the only thing to do here ───────────────────────────── */}
        <section
          className="flex items-center border-t px-6 py-12 sm:px-10 lg:border-l lg:border-t-0 lg:px-14"
          style={{ borderColor: HAIRLINE, background: "rgba(255,255,255,.018)" }}
        >
          <div className="mx-auto w-full max-w-[368px]">
            {done ? (
              <div>
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ background: `${ACCENT}2e` }}
                >
                  <Check className="h-4 w-4" style={{ color: ACCENT_LIGHT }} strokeWidth={2.5} />
                </span>
                <h2 className="mt-5 text-[19px] font-semibold tracking-tight text-white">
                  Your account is active
                </h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-white/45">
                  Taking you to sign in.
                </p>
                <Link
                  to="/login"
                  className="group mt-6 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-white/70 hover:text-white"
                >
                  Sign in now <NudgeIcon><ArrowRight className="h-3.5 w-3.5" /></NudgeIcon>
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-[19px] font-semibold tracking-tight text-white">Set a password</h2>
                <p className="mt-2 truncate text-[13px] text-white/40">
                  for <span className="font-mono text-white/60">{invite.email}</span>
                </p>

                <form onSubmit={submit} className="mt-8 space-y-5">
                  {/* Not decoration and not visible: a password manager looks for a
                      username field in the FORM before it offers to fill or save.
                      Without one Chrome floats an unrelated saved operator login over
                      the fields below and saves this password against the wrong
                      account. `sr-only` keeps it findable; `display:none` would not. */}
                  <input
                    className="sr-only"
                    type="email"
                    name="username"
                    autoComplete="username"
                    tabIndex={-1}
                    aria-hidden="true"
                    value={invite.email || ""}
                    readOnly
                  />

                  <div>
                    <GlassField
                      label="New password"
                      icon={Lock}
                      accent={ACCENT}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={submitting}
                      autoFocus
                      hint={
                        password ? (
                          <span className="text-[11px] font-medium" style={{ color: strength.colour }}>
                            {strength.label}
                          </span>
                        ) : null
                      }
                      trailing={
                        <button
                          type="button"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/70"
                          onClick={() => setShowPassword((v) => !v)}
                        >
                          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      }
                    />

                    {/* One hairline track that fills, rather than four segments in
                        three colours. It reads as the field's own underline, not as
                        a scoreboard, and it is paired with the word beside the
                        label rather than repeating it. */}
                    <div className="mt-1.5 h-px w-full" style={{ background: "rgba(255,255,255,.08)" }}>
                      <div
                        className="h-px transition-all duration-300"
                        style={{ width: `${(strength.score / 4) * 100}%`, background: strength.colour }}
                      />
                    </div>
                  </div>

                  <GlassField
                    label="Confirm password"
                    icon={Lock}
                    accent={ACCENT}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={submitting}
                  />

                  {/* Live checklist — replaces the old "find out on submit" toast. */}
                  <ul className="space-y-1.5 text-[12.5px]">
                    {[
                      { ok: lengthOk, text: "At least 6 characters" },
                      { ok: matchOk, text: "Both entries match" },
                    ].map((rule) => (
                      <li
                        key={rule.text}
                        className="flex items-center gap-2 transition-colors"
                        style={{ color: rule.ok ? "rgba(255,255,255,.7)" : "rgba(255,255,255,.3)" }}
                      >
                        <Check
                          className="h-3.5 w-3.5 shrink-0 transition-colors"
                          strokeWidth={2.5}
                          style={{ color: rule.ok ? ACCENT_LIGHT : "rgba(255,255,255,.2)" }}
                        />
                        {rule.text}
                      </li>
                    ))}
                  </ul>

                  <ShimmerButton
                    type="submit"
                    accent={ACCENT}
                    disabled={!canSubmit}
                    className="h-11 w-full rounded-lg text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Activate account
                        <NudgeIcon><ArrowRight size={16} /></NudgeIcon>
                      </>
                    )}
                  </ShimmerButton>
                </form>

                {invite.mfaRequired && (
                  <p
                    className="mt-7 flex gap-2.5 border-t pt-5 text-[12.5px] leading-relaxed text-white/40"
                    style={{ borderColor: HAIRLINE }}
                  >
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-white/30" />
                    <span>
                      <span className="text-white/60">{invite.roleLabel}s enrol in two-factor
                      authentication</span> the first time they sign in. Have an authenticator app
                      to hand.
                    </span>
                  </p>
                )}

                <p className="mt-8 text-[12px] text-white/25 lg:hidden">
                  This link expires seven days after it was sent.
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
