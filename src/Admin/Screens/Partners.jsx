import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  Handshake,
  Search,
  Mail,
  Phone,
  Globe,
  Trash2,
  Loader2,
  Calendar,
  Building2,
  Inbox,
  RefreshCw,
  ArrowLeft,
  Check,
  ImagePlus,
  Image as ImageIcon,
} from "lucide-react";
import { TabLoader } from "../../components/TabLoader";
import { CustomSelect } from "../../components/CustomSelect";
import { cn } from "../../utils/cn";
import partnersService from "../../services/partners.service";

const STATUS = [
  { value: "new", label: "New", badge: "bg-accent/10 text-accent" },
  { value: "in_review", label: "In review", badge: "bg-blue-100 text-blue-700" },
  { value: "contacted", label: "Contacted", badge: "bg-indigo-100 text-indigo-700" },
  { value: "approved", label: "Approved", badge: "bg-green-100 text-green-700" },
  { value: "declined", label: "Declined", badge: "bg-red-100 text-red-700" },
];
const STATUS_MAP = STATUS.reduce((a, s) => ((a[s.value] = s), a), {});

const TYPE_LABELS = {
  corporate: "Corporate",
  community: "Community",
  "in-kind": "In-kind",
  ambassador: "Ambassador",
  other: "Other",
};

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

function timeAgo(d) {
  if (!d) return "";
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.new;
  return <span className={cn("inline-flex items-center px-2 py-0.5 text-[11px] font-semibold", s.badge)}>{s.label}</span>;
}

// Logo thumbnail, or an initial-letter fallback.
function LogoAvatar({ item, size = "md" }) {
  const dim = size === "sm" ? "h-9 w-9" : "h-10 w-10";
  if (item.logoUrl) {
    return <img src={item.logoUrl} alt="" className={cn(dim, "shrink-0 border border-gray-100 bg-gray-50 object-contain dark:border-white/10")} />;
  }
  return (
    <span className={cn(dim, "grid shrink-0 place-items-center bg-accent/10 text-sm font-semibold text-accent")}>
      {(item.name || "?").trim().charAt(0).toUpperCase()}
    </span>
  );
}

function Meta({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <div className="mt-0.5 break-words text-sm text-gray-800 dark:text-white/80">{value || "—"}</div>
    </div>
  );
}

/* Small on/off switch. */
function Toggle({ checked, disabled, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        checked ? "bg-accent" : "bg-gray-300 dark:bg-white/20",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

/* ── detail pane (right) ──────────────────────────────────────────────── */
function DetailPane({ item, onChange, onDelete, onClose }) {
  const [notes, setNotes] = useState(item.adminNotes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Website-listing controls
  const [publicName, setPublicName] = useState(item.publicName || "");
  const [order, setOrder] = useState(item.displayOrder ?? 0);
  const [savingWeb, setSavingWeb] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef(null);

  const publicLogo = item.publicLogoUrl || item.logoUrl || "";
  const canPublish = !!publicLogo && !!item.consentToList && item.status !== "declined";

  const patch = async (data) => {
    const updated = await partnersService.update(item._id, data);
    onChange(updated);
    return updated;
  };

  const setShow = async (val) => {
    setSavingWeb(true);
    try {
      await patch({ showOnWebsite: val });
      toast.success(val ? "Now showing on the website" : "Hidden from the website");
    } catch (e) {
      toast.error(e.response?.data?.error || "Couldn't update");
    } finally {
      setSavingWeb(false);
    }
  };

  const setConsent = async (val) => {
    setSavingWeb(true);
    try {
      await patch({ consentToList: val });
    } catch {
      toast.error("Couldn't save consent");
    } finally {
      setSavingWeb(false);
    }
  };

  const savePublicName = async () => {
    if (publicName === (item.publicName || "")) return;
    try {
      await patch({ publicName });
      toast.success("Display name saved");
    } catch {
      toast.error("Couldn't save name");
    }
  };

  const saveOrder = async () => {
    const n = Number(order);
    if (Number.isNaN(n) || n === (item.displayOrder ?? 0)) return;
    try {
      await patch({ displayOrder: n });
      toast.success("Order saved");
    } catch {
      toast.error("Couldn't save order");
    }
  };

  const pickLogo = async (file) => {
    if (logoInputRef.current) logoInputRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > 2 * 1024 * 1024) return toast.error("Logo must be under 2MB");
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const updated = await partnersService.replaceLogo(item._id, fd);
      onChange(updated);
      toast.success("Logo updated");
    } catch (e) {
      toast.error(e.response?.data?.error || "Couldn't upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const saveStatus = async (status) => {
    setSavingStatus(true);
    try {
      const updated = await partnersService.update(item._id, { status });
      onChange(updated);
      toast.success("Status updated");
    } catch {
      toast.error("Couldn't update status");
    } finally {
      setSavingStatus(false);
    }
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      const updated = await partnersService.update(item._id, { adminNotes: notes });
      onChange(updated);
      toast.success("Notes saved");
    } catch {
      toast.error("Couldn't save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  const del = async () => {
    if (!window.confirm("Delete this enquiry? This can't be undone.")) return;
    setDeleting(true);
    try {
      await partnersService.remove(item._id);
      onDelete(item._id);
      toast.success("Enquiry deleted");
    } catch {
      toast.error("Couldn't delete");
      setDeleting(false);
    }
  };

  return (
    <motion.div
      key={item._id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex h-full flex-col overflow-hidden rounded-token border border-gray-100 bg-white shadow-sm dark:border-white/10"
    >
      {/* header */}
      <div className="shrink-0 border-b border-gray-100 p-4 dark:border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center text-text-muted transition-colors hover:bg-gray-100 hover:text-primary lg:hidden dark:hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <LogoAvatar item={item} />
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-primary">{item.name}</h2>
              <a href={`mailto:${item.email}`} className="block truncate text-xs text-accent hover:underline">{item.email}</a>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="relative">
              <CustomSelect
                value={item.status}
                onChange={saveStatus}
                options={STATUS.map((s) => ({ value: s.value, label: s.label }))}
                className="min-w-[136px]"
                triggerClassName="border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-accent dark:border-white/10 dark:bg-[var(--admin-card)]"
              />
              {savingStatus && <Loader2 className="absolute -right-6 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />}
            </div>
            <button
              type="button"
              onClick={del}
              disabled={deleting}
              title="Delete enquiry"
              className="grid h-9 w-9 place-items-center text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-500/10"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="mt-3"><StatusBadge status={item.status} /></div>
      </div>

      {/* body */}
      <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50/40 p-4 dark:bg-transparent">
        {/* meta */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-token border border-gray-100 bg-white p-4 dark:border-white/10 dark:bg-[var(--admin-card)]">
          <Meta icon={Building2} label="Organisation" value={item.organisationName} />
          <Meta icon={Handshake} label="Type" value={TYPE_LABELS[item.partnershipType] || item.partnershipType} />
          <Meta icon={Phone} label="Phone" value={item.phone ? <a href={`tel:${item.phone}`} className="text-accent hover:underline">{item.phone}</a> : null} />
          <Meta icon={Calendar} label="Submitted" value={fmtDate(item.createdAt)} />
          <Meta icon={Globe} label="Website" value={item.website ? <a href={item.website} target="_blank" rel="noreferrer" className="break-all text-accent hover:underline">{item.website}</a> : null} />
          <Meta icon={Mail} label="Email" value={<a href={`mailto:${item.email}`} className="break-all text-accent hover:underline">{item.email}</a>} />
        </div>

        {/* on the website */}
        <div className="rounded-token border border-gray-100 bg-white p-4 dark:border-white/10 dark:bg-[var(--admin-card)]">
          <div className="mb-1 flex items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              <Globe className="h-3.5 w-3.5" /> On the website
            </p>
            {savingWeb && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          </div>

          {/* publish toggle */}
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 py-3 dark:border-white/10">
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary">Show on partners page</p>
              <p className="text-xs text-text-muted">
                {!publicLogo
                  ? "Add a logo first."
                  : !item.consentToList
                  ? "Tick consent below first."
                  : item.status === "declined"
                  ? "Declined enquiries can't be shown."
                  : "Appears on the public partner wall."}
              </p>
            </div>
            <Toggle
              checked={!!item.showOnWebsite}
              disabled={savingWeb || (!item.showOnWebsite && !canPublish)}
              onChange={setShow}
            />
          </div>

          {/* consent */}
          <label className="flex cursor-pointer items-start gap-2.5 border-b border-gray-100 py-3 dark:border-white/10">
            <input
              type="checkbox"
              checked={!!item.consentToList}
              disabled={savingWeb}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--tenant-accent,#C9A84C)]"
            />
            <span className="text-sm text-gray-700 dark:text-white/80">
              Authorised to be listed publicly
              <span className="mt-0.5 block text-xs text-text-muted">Pre-ticked if the applicant consented on the form.</span>
            </span>
          </label>

          {/* public display name */}
          <div className="border-b border-gray-100 py-3 dark:border-white/10">
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-white/70">Public display name</label>
            <input
              value={publicName}
              onChange={(e) => setPublicName(e.target.value)}
              onBlur={savePublicName}
              placeholder={item.organisationName || item.name}
              className="w-full border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
            <p className="mt-1 text-xs text-text-muted">Shown on the wall — defaults to the organisation name.</p>
          </div>

          {/* wall logo + replace */}
          <div className="flex items-center gap-3 border-b border-gray-100 py-3 dark:border-white/10">
            {publicLogo ? (
              <img src={publicLogo} alt="" className="h-12 w-12 shrink-0 border border-gray-100 bg-gray-50 object-contain dark:border-white/10" />
            ) : (
              <span className="grid h-12 w-12 shrink-0 place-items-center bg-gray-100 text-gray-400 dark:bg-white/5">
                <ImageIcon className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-primary">Wall logo</p>
              <p className="text-xs text-text-muted">
                {item.publicLogoUrl ? "Custom logo" : item.logoUrl ? "Using submitted logo" : "No logo yet"}
              </p>
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickLogo(e.target.files?.[0])} />
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              className="inline-flex items-center gap-1.5 border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-accent hover:text-accent disabled:opacity-50 dark:border-white/10 dark:text-white/80"
            >
              {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />} Replace
            </button>
          </div>

          {/* display order */}
          <div className="flex items-center justify-between gap-3 pt-3">
            <div>
              <p className="text-sm font-medium text-primary">Display order</p>
              <p className="text-xs text-text-muted">Lower numbers show first.</p>
            </div>
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              onBlur={saveOrder}
              className="w-20 border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-accent dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
        </div>

        {/* logo */}
        {item.logoUrl && (
          <a href={item.logoUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center rounded-token border border-gray-100 bg-white p-4 dark:border-white/10 dark:bg-[var(--admin-card)]">
            <img src={item.logoUrl} alt={`${item.organisationName || item.name} logo`} className="max-h-28 max-w-[16rem] object-contain" />
          </a>
        )}

        {/* message */}
        {item.message && (
          <div className="rounded-token border border-gray-100 bg-white p-4 dark:border-white/10 dark:bg-[var(--admin-card)]">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Message</p>
            <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-white/80">{item.message}</p>
          </div>
        )}

        {/* internal notes */}
        <div className="rounded-token border border-gray-100 bg-white p-4 dark:border-white/10 dark:bg-[var(--admin-card)]">
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Internal notes</label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Private notes for your team…"
            className="w-full resize-none border border-gray-200 bg-white p-3 text-sm text-gray-800 outline-none focus:border-accent dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <button
            type="button"
            onClick={saveNotes}
            disabled={savingNotes || notes === (item.adminNotes || "")}
            className="mt-2 inline-flex items-center gap-2 bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-40"
          >
            {savingNotes ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save notes
          </button>
        </div>
      </div>

      {/* footer */}
      <div className="shrink-0 border-t border-gray-100 p-4 dark:border-white/10">
        <a href={`mailto:${item.email}`} className="flex w-full items-center justify-center gap-2 bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light">
          <Mail className="h-4 w-4" /> Reply by email
        </a>
      </div>
    </motion.div>
  );
}

/* ── screen ───────────────────────────────────────────────────────────── */
export default function Partners() {
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ all: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [websiteOnly, setWebsiteOnly] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async ({ force = false } = {}) => {
    if (force) setRefreshing(true);
    try {
      const res = await partnersService.list();
      setItems(res.items || []);
      setCounts(res.counts || { all: 0 });
    } catch {
      toast.error("Failed to load partner enquiries");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = items.filter((it) => {
      if (websiteOnly && !it.showOnWebsite) return false;
      if (statusFilter !== "all" && it.status !== statusFilter) return false;
      if (!q) return true;
      return [it.name, it.organisationName, it.email].filter(Boolean).some((s) => s.toLowerCase().includes(q));
    });
    // When viewing the live wall, sort by the order it actually renders in.
    if (websiteOnly) {
      return [...list].sort(
        (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || new Date(a.createdAt) - new Date(b.createdAt),
      );
    }
    return list;
  }, [items, statusFilter, search, websiteOnly]);

  const sel = useMemo(() => items.find((i) => i._id === selectedId) || null, [items, selectedId]);

  const applyUpdate = (updated) => {
    setItems((prev) => {
      const prevItem = prev.find((p) => p._id === updated._id);
      if (prevItem && prevItem.status !== updated.status) {
        setCounts((c) => ({
          ...c,
          [prevItem.status]: Math.max(0, (c[prevItem.status] || 0) - 1),
          [updated.status]: (c[updated.status] || 0) + 1,
        }));
      }
      return prev.map((p) => (p._id === updated._id ? updated : p));
    });
  };

  const applyDelete = (id) => {
    setItems((prev) => {
      const removed = prev.find((p) => p._id === id);
      if (removed) {
        setCounts((c) => ({ ...c, all: Math.max(0, (c.all || 0) - 1), [removed.status]: Math.max(0, (c[removed.status] || 0) - 1) }));
      }
      return prev.filter((p) => p._id !== id);
    });
    setSelectedId(null);
  };

  const statusOptions = [
    { value: "all", label: `All status (${counts.all || 0})` },
    ...STATUS.map((s) => ({ value: s.value, label: `${s.label} (${counts[s.value] || 0})` })),
  ];

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <TabLoader label="Loading partner enquiries…" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[540px] gap-4">
      {/* ── Left: inbox list ── */}
      <div
        className={cn(
          "flex w-full flex-col overflow-hidden rounded-token border border-gray-100 bg-white shadow-sm dark:border-white/10 lg:w-[360px] lg:shrink-0",
          selectedId && "hidden lg:flex",
        )}
      >
        <div className="shrink-0 border-b border-gray-100 p-4 dark:border-white/10">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="flex items-center gap-2 text-lg font-bold text-primary">
                <Handshake className="h-5 w-5 text-accent" /> Partners
              </h1>
              <p className="text-[11px] text-text-muted">{counts.all || 0} total</p>
            </div>
            <button
              type="button"
              onClick={() => load({ force: true })}
              disabled={refreshing}
              title="Refresh"
              className="grid h-9 w-9 place-items-center text-text-muted transition-colors hover:bg-gray-100 hover:text-primary disabled:opacity-50 dark:hover:bg-white/10"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </button>
          </div>

          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, org or email…"
              className="w-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-accent focus:bg-white dark:border-white/10 dark:bg-white/5"
            />
          </div>
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            className="mt-2 w-full"
            triggerClassName="w-full border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/10 dark:bg-[var(--admin-card)]"
          />
          <button
            type="button"
            onClick={() => setWebsiteOnly((v) => !v)}
            className={cn(
              "mt-2 flex w-full items-center justify-center gap-1.5 border px-3 py-2 text-xs font-medium transition-colors",
              websiteOnly
                ? "border-accent bg-accent/10 text-accent"
                : "border-gray-200 text-text-muted hover:border-accent hover:text-accent dark:border-white/10",
            )}
          >
            <Globe className="h-3.5 w-3.5" /> {websiteOnly ? "Showing live partners — by order" : "Live on site only"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <Inbox className="mb-3 h-9 w-9 text-text-muted" />
              <p className="text-sm text-text-muted">
                {items.length === 0 ? "No partnership enquiries yet." : "Nothing matches your filters."}
              </p>
            </div>
          ) : (
            visible.map((c) => (
              <button
                key={c._id}
                type="button"
                onClick={() => setSelectedId(c._id)}
                style={
                  selectedId === c._id
                    ? { backgroundColor: "rgba(var(--tenant-accent-rgb, 201, 168, 76), 0.16)" }
                    : undefined
                }
                className={cn(
                  "relative flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left transition-colors dark:border-white/5",
                  selectedId !== c._id && "hover:bg-gray-50/70 dark:hover:bg-white/5",
                )}
              >
                {selectedId === c._id && (
                  <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: "var(--tenant-accent, #C9A84C)" }} aria-hidden="true" />
                )}
                <LogoAvatar item={c} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("truncate text-sm font-semibold", selectedId === c._id ? "text-accent" : "text-primary")}>{c.name}</p>
                    <span className="shrink-0 text-[10px] text-text-muted">{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="truncate text-xs text-text-muted">{c.organisationName || c.email}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <StatusBadge status={c.status} />
                    {c.showOnWebsite && (
                      <span className="inline-flex items-center gap-0.5 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                        <Globe className="h-2.5 w-2.5" /> Live
                      </span>
                    )}
                    <span className="text-[10px] text-text-muted">{TYPE_LABELS[c.partnershipType] || c.partnershipType}</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right: detail ── */}
      <div className={cn("min-w-0 flex-1 flex-col", selectedId ? "flex" : "hidden lg:flex")}>
        <AnimatePresence mode="wait">
          {!sel ? (
            <div className="flex h-full flex-col items-center justify-center rounded-token border border-dashed border-gray-200 bg-white/40 text-center dark:border-white/10 dark:bg-white/5">
              <Handshake className="mb-3 h-10 w-10 text-text-muted" />
              <p className="text-sm font-medium text-primary">Select an enquiry</p>
              <p className="mt-1 max-w-xs text-xs text-text-muted">
                Open a partnership enquiry to read it, leave internal notes, set its status and reply by email.
              </p>
            </div>
          ) : (
            <DetailPane
              key={sel._id}
              item={sel}
              onChange={applyUpdate}
              onDelete={applyDelete}
              onClose={() => setSelectedId(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
