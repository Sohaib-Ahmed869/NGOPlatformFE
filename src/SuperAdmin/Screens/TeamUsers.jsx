import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserPlus, Search, Mail, LogOut, ShieldOff, ShieldCheck, X, Loader2, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import superadminUsersService from "../../services/superadminUsers.service";
import SAPageHeader from "../components/SAPageHeader";
import SAErrorState from "../components/SAErrorState";
import SATableHead from "../components/SATableHead";
import SAPagination from "../components/SAPagination";
import { useTableSort } from "../utils/tableSort";
import { DEFAULT_PAGE_SIZE } from "../utils/paging";
import SASelect from "../components/SASelect";
import SALoader from "../SALoader";
import { scrollToTopOf } from "../utils/scrollTo";
import { useConfirm } from "../components/ConfirmProvider";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../utils/cn";
import { RoleBadge, StatusBadge } from "./teamUsersShared";
import { ALL_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS } from "../utils/platformRoles";

const card = "rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-[var(--admin-card)]";
const ROLE_OPTIONS = ALL_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));
/**
 * Table columns, and how to read each one off a row.
 *
 * Sorting here is CLIENT-side, unlike the other list screens — the operator
 * team is loaded whole (there are a handful of them), so there is no page
 * beyond the one on screen for a sort to be wrong about.
 *
 * "Name" falls back to the email: an invited operator has no name yet, and
 * sorting those to the bottom as blanks would hide exactly the rows someone
 * scanning this table is usually looking for.
 */
const TEAM_COLUMNS = [
  { label: "Name", key: "name" },
  { label: "Role", key: "role" },
  { label: "Status", key: "status" },
  { label: "MFA", key: "mfa" },
  { label: "Last login", key: "lastLogin", defaultDir: "desc" },
  { label: "" },
];

const TEAM_SORT_ACCESSORS = {
  name: (u) => u.name || u.email,
  role: (u) => u.platformRole,
  status: (u) => u.platformStatus,
  // Ordered by how protected the account is, not alphabetically by a label:
  // enrolled > required-but-not-yet > optional.
  mfa: (u) => (u.twoFactorEnabled ? 2 : u.mfaRequired ? 1 : 0),
  lastLogin: (u) => u.lastLogin,
};

// Per-operator MFA requirement. "Follows role" is the default — Owner and Admin
// must enrol, everyone else needn't — and the other two override it either way.
const MFA_POLICY_OPTIONS = [
  { value: "default", label: "Follows role" },
  { value: "required", label: "Required" },
  { value: "exempt", label: "Not required" },
];
const MFA_POLICY_LABELS = Object.fromEntries(MFA_POLICY_OPTIONS.map((o) => [o.value, o.label]));

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "Never";

export default function TeamUsers() {
  const { user: me } = useAuth();
  const confirm = useConfirm();
  const cached = superadminUsersService.getUsersCached();
  const [users, setUsers] = useState(cached?.users || []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [busyIds, setBusyIds] = useState(() => new Set());
  const [inviteOpen, setInviteOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const [editTarget, setEditTarget] = useState(null); // pending invite being corrected

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await superadminUsersService.loadUsers();
      setUsers(data.users || []);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't load the team.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cached) return;
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Publish confirmed changes back to the session cache, so coming back to this
  // screen after editing a role/status/MFA costs no request. Mutations used to
  // drop the cache instead, which made every edit pay for a full refetch on the
  // next visit even though the updated row was already in hand.
  useEffect(() => {
    superadminUsersService.setUsersCache(users);
  }, [users]);

  const markBusy = (id, on) =>
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  }, [users, search]);

  // Paged so the table stays one screenful however many operators there are.
  // Searching resets to page 1 — otherwise a search that matches 3 people while
  // you're on page 4 shows an empty table.
  const sorted = useTableSort(filtered, sort, TEAM_SORT_ACCESSORS);
  const pageCount = Math.max(1, Math.ceil(sorted.length / limit));
  const safePage = Math.min(page, pageCount);
  const pageRows = useMemo(
    () => sorted.slice((safePage - 1) * limit, safePage * limit),
    [sorted, safePage, limit],
  );
  useEffect(() => { setPage(1); }, [search]);
  // Re-ordering and re-sizing both move the rows, so start again at the top.
  const changeSort = useCallback((next) => { setSort(next); setPage(1); }, []);
  const changeLimit = useCallback((next) => {
    setLimit((cur) => (cur === next ? cur : next));
    setPage(1);
  }, []);
  // Paging from the bottom of a long page otherwise drops you at the bottom of
  // the next one, reading its last rows first.
  const resultsTopRef = useRef(null);
  const lastPageRef = useRef(safePage);
  useEffect(() => {
    if (lastPageRef.current === safePage) return;
    lastPageRef.current = safePage;
    scrollToTopOf(resultsTopRef.current);
  }, [safePage]);


  const changeRole = async (u, role) => {
    if (role === u.platformRole) return;
    markBusy(u._id, true);
    try {
      const { data } = await superadminUsersService.changeRole(u._id, role);
      // Merge the whole row back: the role decides the default MFA requirement,
      // so `mfaRequired` can flip with it.
      setUsers((prev) => prev.map((x) => (x._id === u._id ? { ...x, ...(data?.user || { platformRole: role }) } : x)));
      toast.success(`${u.name || u.email} is now ${ROLE_LABELS[role]}`);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to change role");
    } finally {
      markBusy(u._id, false);
    }
  };

  const toggleStatus = (u) => {
    const next = u.platformStatus === "suspended" ? "active" : "suspended";
    const suspending = next === "suspended";
    confirm({
      title: suspending ? "Suspend operator" : "Reactivate operator",
      tone: suspending ? "danger" : "default",
      icon: suspending ? ShieldOff : ShieldCheck,
      confirmText: suspending ? "Suspend" : "Reactivate",
      message: suspending ? (
        <>
          Cut off <strong className="text-gray-800 dark:text-white">{u.name || u.email}</strong> immediately — any
          session they're currently using is killed on its next request.
        </>
      ) : (
        <>
          Restore console access for <strong className="text-gray-800 dark:text-white">{u.name || u.email}</strong>.
        </>
      ),
      onConfirm: async () => {
        markBusy(u._id, true);
        try {
          await superadminUsersService.changeStatus(u._id, next);
          setUsers((prev) => prev.map((x) => (x._id === u._id ? { ...x, platformStatus: next } : x)));
          toast.success(suspending ? "Operator suspended" : "Operator reactivated");
        } catch (err) {
          toast.error(err?.response?.data?.error || "Failed to update status");
          throw err;
        } finally {
          markBusy(u._id, false);
        }
      },
    });
  };

  // Making MFA mandatory is a tightening — just do it. Exempting someone is the
  // one direction that weakens the console's security, so that one asks first.
  const changeMfaPolicy = (u, policy) => {
    if (policy === (u.mfaPolicy || "default")) return undefined;
    const apply = async () => {
      markBusy(u._id, true);
      try {
        const { data } = await superadminUsersService.setMfaPolicy(u._id, policy);
        setUsers((prev) => prev.map((x) => (x._id === u._id ? { ...x, ...data.user } : x)));
        toast.success(
          policy === "required" ? "MFA is now mandatory for this operator"
            : policy === "exempt" ? "Operator exempted from MFA"
            : "MFA requirement now follows their role",
        );
      } catch (err) {
        toast.error(err?.response?.data?.error || "Failed to update the MFA requirement");
        throw err;
      } finally {
        markBusy(u._id, false);
      }
    };
    if (policy !== "exempt") return apply();
    return confirm({
      title: "Exempt from MFA",
      tone: "danger",
      icon: ShieldOff,
      confirmText: "Exempt",
      message: (
        <>
          <strong className="text-gray-800 dark:text-white">{u.name || u.email}</strong> will be able to use the console
          with a password alone, even though their role would normally require MFA. Reserve this for shared or
          machine accounts.
        </>
      ),
      onConfirm: apply,
    });
  };

  // Resend sends a real email to a real person and invalidates the previous
  // invite link — a misfire is someone else's confusing inbox, so it asks first.
  const resendInvite = (u) =>
    confirm({
      title: "Resend invitation",
      icon: Mail,
      confirmText: "Resend invite",
      message: (
        <>
          Emails a fresh invitation to <strong className="text-gray-800 dark:text-white">{u.email}</strong>. Any link
          from the previous invite stops working.
        </>
      ),
      onConfirm: async () => {
        markBusy(u._id, true);
        try {
          await superadminUsersService.resendInvite(u._id);
          toast.success("Invite resent");
        } catch (err) {
          toast.error(err?.response?.data?.error || "Failed to resend invite");
          throw err; // keep the dialog open so the error is seen in context
        } finally {
          markBusy(u._id, false);
        }
      },
    });

  const forceLogout = (u) =>
    confirm({
      title: "Sign out everywhere",
      tone: "danger", // it interrupts whatever they're in the middle of
      icon: LogOut,
      confirmText: "Sign out everywhere",
      message: (
        <>
          Ends every active session for <strong className="text-gray-800 dark:text-white">{u.name || u.email}</strong>,
          on every device. They'll need to log in again — anything unsaved in the console is lost.
        </>
      ),
      onConfirm: async () => {
        markBusy(u._id, true);
        try {
          await superadminUsersService.forceLogout(u._id);
          toast.success("Signed out of all sessions");
        } catch (err) {
          toast.error(err?.response?.data?.error || "Failed to sign out");
          throw err;
        } finally {
          markBusy(u._id, false);
        }
      },
    });

  if (loading) return <SALoader />;

  return (
    <div className="[&_*]:!rounded-none">
      <SAPageHeader
        eyebrow="Configuration"
        title="Team"
        subtitle="Platform operators and what each of them can access."
        actions={
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="inline-flex items-center gap-2 bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-light"
          >
            <UserPlus className="h-4 w-4" /> Invite operator
          </button>
        }
      />

      {error ? (
        <SAErrorState message={error} onRetry={fetchUsers} />
      ) : (
        <>
          <div className="relative mb-6 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email…"
              className="w-full border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5 dark:text-white/90"
            />
          </div>

          <div ref={resultsTopRef} aria-hidden />
          {filtered.length === 0 ? (
            <div className={`${card} py-20 text-center`}>
              <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-gray-500 dark:text-white/60">{search ? "No one matches that search" : "No operators yet"}</p>
            </div>
          ) : (
            <div className={`${card} overflow-hidden`}>
              <div className="scroll-slim overflow-x-auto">
                <table className="w-full min-w-[960px]">
                  <SATableHead
                    columns={TEAM_COLUMNS}
                    sort={sort}
                    onSort={changeSort}
                    rowStyle={{ backgroundColor: "rgba(var(--tenant-accent-rgb, 4, 120, 87), 0.14)" }}
                  />
                  <tbody>
                    {pageRows.map((u) => {
                      const isMe = String(u._id) === String(me?._id);
                      // Admin has Owner's reach everywhere except touching another Owner.
                      const canManage = !isMe && !(u.platformRole === "owner" && me?.platformRole !== "owner");
                      const busy = busyIds.has(u._id);
                      return (
                        <tr key={u._id} className="border-t border-gray-100 dark:border-white/10">
                          <td className="px-4 py-3">
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
                                {u.name || u.email}
                                {isMe && <span className="text-[10px] font-semibold text-gray-400">(you)</span>}
                              </p>
                              <p className="truncate text-xs text-gray-400">{u.email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {canManage ? (
                              <SASelect value={u.platformRole} onChange={(v) => changeRole(u, v)} options={ROLE_OPTIONS} disabled={busy} />
                            ) : (
                              <RoleBadge role={u.platformRole} />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={u.platformStatus} />
                          </td>
                          {/* MFA: where they stand today (enrolled or not) and
                              whether it's mandatory for them. The two together
                              are what tells you if someone is a gap. */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col items-start gap-1.5">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold",
                                  u.twoFactorEnabled
                                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"
                                    : u.mfaRequired
                                      ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10"
                                      : "bg-gray-100 text-gray-500 dark:bg-white/10",
                                )}
                              >
                                {u.twoFactorEnabled ? <ShieldCheck className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
                                {u.twoFactorEnabled ? "Enrolled" : "Not set up"}
                              </span>
                              {canManage ? (
                                <SASelect
                                  value={u.mfaPolicy || "default"}
                                  onChange={(v) => changeMfaPolicy(u, v)}
                                  options={MFA_POLICY_OPTIONS}
                                  disabled={busy}
                                  className="!min-w-[142px] !py-1 !text-xs"
                                />
                              ) : (
                                <span className="text-[11px] text-gray-400">{MFA_POLICY_LABELS[u.mfaPolicy || "default"]}</span>
                              )}
                              {u.mfaRequired && !u.twoFactorEnabled ? (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400">Must enrol at next sign-in</span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(u.lastLogin)}</td>
                          <td className="px-4 py-3 text-right">
                            {canManage && (
                              <div className="flex justify-end gap-2">
                                {/* Only a pending invite can be corrected — once
                                    accepted, the email is their login. */}
                                {u.platformStatus === "invited" && (
                                  <button
                                    type="button"
                                    onClick={() => setEditTarget(u)}
                                    disabled={busy}
                                    aria-label={`Edit invite for ${u.email}`}
                                    title="Edit name / email"
                                    className="inline-flex items-center gap-1 border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
                                  >
                                    <Pencil className="h-3 w-3" /> Edit
                                  </button>
                                )}
                                {u.platformStatus === "invited" && (
                                  <button
                                    type="button"
                                    onClick={() => resendInvite(u)}
                                    disabled={busy}
                                    title="Resend invite"
                                    className="inline-flex items-center gap-1 border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
                                  >
                                    <Mail className="h-3 w-3" /> Resend
                                  </button>
                                )}
                                {/* Nothing to sign out of until they've accepted. */}
                                {u.platformStatus !== "invited" && (
                                <button
                                  type="button"
                                  onClick={() => forceLogout(u)}
                                  disabled={busy}
                                  aria-label={`Sign ${u.name || u.email} out everywhere`}
                                  title="Sign out everywhere"
                                  className="inline-flex items-center gap-1 border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
                                >
                                  <LogOut className="h-3 w-3" /> <span className="hidden lg:inline">Sign out</span>
                                </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => toggleStatus(u)}
                                  disabled={busy}
                                  className={`inline-flex items-center gap-1 border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${
                                    u.platformStatus === "suspended"
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                                      : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10"
                                  }`}
                                >
                                  {u.platformStatus === "suspended" ? "Reactivate" : "Suspend"}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination — only once there's more than a page to show, so a
                  team of four doesn't carry controls it never needs. The count
                  line stays either way: knowing "8 of 8" is the answer to "is
                  this everyone?". */}
              {/* Shared footer: same count, same rows control, same wording as
                  every other list screen. */}
              <div className="border-t border-gray-100 px-4 py-3 dark:border-white/10">
                <SAPagination
                  page={safePage}
                  pages={pageCount}
                  total={sorted.length}
                  limit={limit}
                  shown={pageRows.length}
                  onPage={setPage}
                  onLimit={changeLimit}
                />
              </div>
            </div>
          )}
        </>
      )}

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={(u) => setUsers((prev) => [...prev, u])}
      />

      <EditInviteModal
        user={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={(u) => setUsers((prev) => prev.map((x) => (x._id === u._id ? { ...x, ...u } : x)))}
      />
    </div>
  );
}

/**
 * Fix a typo in a pending invite. Only reachable while the account is still
 * `invited` — after that the email is the person's login, not ours to rewrite.
 * Saving kills the link already in their inbox and sends a fresh one, which the
 * dialog says plainly, because it's not what "edit" usually implies.
 */
function EditInviteModal({ user, onClose, onSaved }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const dirty = !!user && (name.trim() !== (user.name || "") || email.trim().toLowerCase() !== (user.email || ""));

  const submit = async (e) => {
    e.preventDefault();
    if (busy || !user) return;
    if (!name.trim() || !email.trim()) return toast.error("Name and email are required");
    setBusy(true);
    try {
      const { data } = await superadminUsersService.updateInvite(user._id, { name: name.trim(), email: email.trim() });
      onSaved(data.user);
      toast.success(`Invite updated — a new link was sent to ${data.user.email}`);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to update the invite");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {user && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !busy && onClose()} />
          <motion.div className={`${card} relative w-full max-w-md p-6 shadow-xl`} initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit pending invite</h3>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5 dark:text-white/90"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5 dark:text-white/90"
                />
              </div>
              <p className="flex items-start gap-2 border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10">
                <ShieldOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Saving expires the invite link they already have and emails a new one to the address above.
              </p>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose} disabled={busy} className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-white/80">
                  Cancel
                </button>
                <button type="submit" disabled={busy || !dirty} className="inline-flex flex-1 items-center justify-center gap-2 bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Save &amp; resend
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function InviteModal({ open, onClose, onInvited }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("support");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setRole("support");
    }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!name.trim() || !email.trim()) return toast.error("Name and email are required");
    setBusy(true);
    try {
      const res = await superadminUsersService.inviteUser({ name: name.trim(), email: email.trim(), platformRole: role });
      toast.success(`Invite sent to ${email.trim()}`);
      onInvited({ ...res.data.user, twoFactorEnabled: false, lastLogin: null });
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to send invite");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div className={`${card} relative w-full max-w-md p-6 shadow-xl`} initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Invite a team member</h3>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5 dark:text-white/90"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5 dark:text-white/90"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Role</label>
                <SASelect fullWidth value={role} onChange={setRole} options={ROLE_OPTIONS} />
                <p className="mt-1.5 text-xs text-gray-400">{ROLE_DESCRIPTIONS[role]}</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-white/80">
                  Cancel
                </button>
                <button type="submit" disabled={busy} className="inline-flex flex-1 items-center justify-center gap-2 bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Send invite
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
