import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserPlus, Search, Mail, LogOut, ShieldOff, ShieldCheck, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import superadminUsersService from "../../services/superadminUsers.service";
import SAPageHeader from "../components/SAPageHeader";
import SAErrorState from "../components/SAErrorState";
import SASelect from "../components/SASelect";
import SALoader from "../SALoader";
import { useConfirm } from "../components/ConfirmProvider";
import { useAuth } from "../../context/AuthContext";
import { RoleBadge, StatusBadge } from "./teamUsersShared";
import { ALL_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS } from "../utils/platformRoles";

const card = "rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-[var(--admin-card)]";
const ROLE_OPTIONS = ALL_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

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

  const changeRole = async (u, role) => {
    if (role === u.platformRole) return;
    markBusy(u._id, true);
    try {
      await superadminUsersService.changeRole(u._id, role);
      setUsers((prev) => prev.map((x) => (x._id === u._id ? { ...x, platformRole: role } : x)));
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

  const resendInvite = async (u) => {
    markBusy(u._id, true);
    try {
      await superadminUsersService.resendInvite(u._id);
      toast.success("Invite resent");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to resend invite");
    } finally {
      markBusy(u._id, false);
    }
  };

  const forceLogout = (u) =>
    confirm({
      title: "Sign out everywhere",
      icon: LogOut,
      confirmText: "Sign out",
      message: (
        <>
          Ends every active session for <strong className="text-gray-800 dark:text-white">{u.name || u.email}</strong>.
          They'll need to log in again.
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

          {filtered.length === 0 ? (
            <div className={`${card} py-20 text-center`}>
              <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-gray-500 dark:text-white/60">{search ? "No one matches that search" : "No operators yet"}</p>
            </div>
          ) : (
            <div className={`${card} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr
                      className="border-b border-gray-100 text-left dark:border-white/10"
                      style={{ backgroundColor: "rgba(var(--tenant-accent-rgb, 4, 120, 87), 0.14)" }}
                    >
                      {["Name", "Role", "Status", "2FA", "Last login", ""].map((h, i) => (
                        <th key={h || `spacer-${i}`} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-white/60">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u) => {
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
                          <td className="px-4 py-3 text-xs text-gray-500 dark:text-white/60">{u.twoFactorEnabled ? "On" : "Off"}</td>
                          <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(u.lastLogin)}</td>
                          <td className="px-4 py-3 text-right">
                            {canManage && (
                              <div className="flex justify-end gap-2">
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
                                <button
                                  type="button"
                                  onClick={() => forceLogout(u)}
                                  disabled={busy}
                                  title="Sign out everywhere"
                                  className="inline-flex items-center gap-1 border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
                                >
                                  <LogOut className="h-3 w-3" />
                                </button>
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
            </div>
          )}
        </>
      )}

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={(u) => setUsers((prev) => [...prev, u])}
      />
    </div>
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
