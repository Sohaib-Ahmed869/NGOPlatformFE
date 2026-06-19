import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  X,
  Paintbrush,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Layers,
  Calendar,
  User as UserIcon,
  Globe,
  Inbox,
} from "lucide-react";
import superadminService from "../../services/superadmin.service";
import SALoader from "../SALoader";
import toast from "react-hot-toast";
import { useSARealtime } from "../context/SARealtimeContext";

const card = "border border-gray-100 bg-white shadow-sm";
const ACCENT = "var(--tenant-accent, #047857)";
const accentTint = (a) => `rgba(var(--tenant-accent-rgb, 4, 120, 87), ${a})`;
const HERO_GRADIENT = "linear-gradient(120deg, var(--tenant-primary, #102A23), var(--tenant-accent, #047857))";

const STATUS = {
  pending: { dot: "#f59e0b", cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-200", icon: Clock },
  approved: { dot: "#10b981", cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", icon: CheckCircle2 },
  rejected: { dot: "#ef4444", cls: "bg-red-50 text-red-700 ring-1 ring-red-200", icon: XCircle },
};

const FILTERS = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "approved", label: "Approved", icon: CheckCircle2 },
  { key: "rejected", label: "Rejected", icon: XCircle },
  { key: "all", label: "All", icon: Layers },
];

const orgLogo = (org) =>
  org?.branding?.iconLogoDark || org?.branding?.iconLogo || org?.branding?.logoDark || org?.branding?.logo || "";
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "—");

// Merge the requested (changed) fields over the current branding → the full
// resulting brand, for the "after" preview.
const mergeBrand = (cur, req) => {
  const out = { ...(cur || {}) };
  Object.entries(req || {}).forEach(([k, v]) => {
    if (v) out[k] = v;
  });
  return out;
};

// Pick a readable text colour (dark or white) for a given background hex, so
// the mock copy stays legible over any brand colour.
const readableOn = (hex) => {
  const h = String(hex || "").replace("#", "");
  if (h.length < 6) return "#111827";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#111827" : "#ffffff";
};

// A realistic mini landing-page mockup of how the tenant's site will look with a
// branding set: a navbar in the primary colour (logo + nav + accent "Donate"),
// then a hero on the background colour with a heading, subtitle, accent CTA and
// a brand-gradient image block. Auto-contrasts the copy; falls back to the org's
// real logo and hides gracefully if the image fails to load.
function BrandPreview({ label, branding, fallbackLogo, highlight }) {
  const [imgError, setImgError] = useState(false);
  const primary = branding?.primaryColor || "#1f2937";
  const accent = branding?.accentColor || "#9ca3af";
  const bg = branding?.backgroundColor || "#ffffff";
  const logoSrc = imgError ? "" : branding?.logo || branding?.logoDark || fallbackLogo || "";

  const navText = readableOn(primary);
  const navMuted = navText === "#ffffff" ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)";
  const heroText = readableOn(bg);
  const heroMuted = heroText === "#111827" ? "#6b7280" : "rgba(255,255,255,0.75)";

  return (
    <div className="min-w-0 flex-1">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: highlight ? ACCENT : "#9ca3af" }}>{label}</p>
      <div className="overflow-hidden border shadow-sm" style={{ borderColor: highlight ? accentTint(0.4) : "#e5e7eb" }}>
        {/* navbar */}
        <div className="flex h-8 items-center justify-between gap-2 px-2.5" style={{ background: primary }}>
          {logoSrc ? (
            <span className="inline-flex h-5 items-center bg-white px-1">
              <img src={logoSrc} alt="" onError={() => setImgError(true)} className="h-3.5 w-auto max-w-[64px] object-contain" />
            </span>
          ) : (
            <span className="h-2 w-9" style={{ background: navMuted }} />
          )}
          <div className="flex items-center gap-1.5">
            <span className="hidden h-1.5 w-5 sm:block" style={{ background: navMuted }} />
            <span className="hidden h-1.5 w-5 sm:block" style={{ background: navMuted }} />
            <span className="px-1.5 py-0.5 text-[7px] font-bold text-white" style={{ background: accent }}>Donate</span>
          </div>
        </div>
        {/* hero */}
        <div className="flex items-center gap-3 p-3" style={{ background: bg }}>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-[11px] font-bold leading-tight" style={{ color: heroText }}>Together we create change</p>
            <p className="text-[8px] leading-snug" style={{ color: heroMuted }}>Support our programs and help communities thrive.</p>
            <span className="mt-0.5 inline-block px-2.5 py-1 text-[8px] font-semibold text-white" style={{ background: accent }}>Donate now</span>
          </div>
          <div className="hidden h-12 w-14 shrink-0 sm:block" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }} />
        </div>
      </div>
      {branding?.theme ? <p className="mt-1 truncate text-[10px] capitalize text-gray-400">Theme: {branding.theme}</p> : null}
    </div>
  );
}

// One "what changed" row — colour swatch pair, or text old→new.
function ChangeRow({ label, type, current, requested }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5 text-xs">
      <span className="w-24 shrink-0 text-gray-400">{label}</span>
      {type === "color" ? (
        <span className="flex items-center gap-2">
          <span className="h-5 w-5 ring-1 ring-gray-200" style={{ background: current || "#e5e7eb" }} title={current} />
          <ArrowRight className="h-3 w-3 text-gray-300" />
          <span className="h-5 w-5 ring-1 ring-gray-200" style={{ background: requested }} title={requested} />
          <span className="font-mono text-gray-600">{requested}</span>
        </span>
      ) : type === "logo" ? (
        <span className="flex items-center gap-2">
          {current ? <img src={current} alt="" className="h-6 w-auto max-w-[60px] bg-gray-50 object-contain p-0.5" /> : <span className="text-gray-300">—</span>}
          <ArrowRight className="h-3 w-3 text-gray-300" />
          {requested ? <img src={requested} alt="" className="h-6 w-auto max-w-[60px] bg-gray-50 object-contain p-0.5" /> : <span className="text-gray-300">—</span>}
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <span className="text-gray-400 line-through">{current || "—"}</span>
          <ArrowRight className="h-3 w-3 text-gray-300" />
          <span className="font-medium capitalize text-gray-800">{requested}</span>
        </span>
      )}
    </div>
  );
}

const CHANGE_FIELDS = [
  { key: "primaryColor", label: "Primary", type: "color" },
  { key: "accentColor", label: "Accent", type: "color" },
  { key: "backgroundColor", label: "Background", type: "color" },
  { key: "theme", label: "Theme", type: "text" },
  { key: "tagline", label: "Tagline", type: "text" },
  { key: "logo", label: "Logo", type: "logo" },
];

export default function BrandingRequests() {
  const { refreshBrandingPending } = useSARealtime();
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewAction, setReviewAction] = useState("approve");
  const [reviewNote, setReviewNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Fetch ALL once and filter client-side → accurate per-status counts for free.
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await superadminService.getBrandingRequests("all");
      setAllRequests(res.data || []);
    } catch (err) {
      console.error("Failed to fetch branding requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, all: allRequests.length };
    allRequests.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [allRequests]);

  const requests = useMemo(
    () => (filter === "all" ? allRequests : allRequests.filter((r) => r.status === filter)),
    [allRequests, filter],
  );

  const decide = async () => {
    if (!reviewModal) return;
    setBusy(true);
    try {
      if (reviewAction === "approve") {
        await superadminService.approveBrandingRequest(reviewModal._id, reviewNote);
        toast.success("Approved — branding applied");
      } else {
        await superadminService.rejectBrandingRequest(reviewModal._id, reviewNote);
        toast.success("Request rejected");
      }
      setReviewModal(null);
      setReviewNote("");
      fetchRequests();
      refreshBrandingPending();
    } catch {
      toast.error(`Failed to ${reviewAction}`);
    } finally {
      setBusy(false);
    }
  };

  const openReview = (req, action) => {
    setReviewModal(req);
    setReviewAction(action);
    setReviewNote("");
  };

  return (
    <div className="[&_*]:!rounded-none">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mb-6 overflow-hidden border border-gray-100 bg-white shadow-sm"
      >
        <div className="relative overflow-hidden px-6 py-7 sm:px-8" style={{ background: HERO_GRADIENT }}>
          <svg aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 text-white" viewBox="0 0 128 128" fill="none">
            <circle cx="64" cy="64" r="46" fill="currentColor" fillOpacity="0.06" />
            <circle cx="64" cy="64" r="46" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" />
          </svg>
          <div aria-hidden className="pointer-events-none absolute bottom-4 right-12 h-10 w-24 opacity-[.18]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.95) 1.5px, transparent 1.5px)", backgroundSize: "12px 12px" }} />
          <div className="relative flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center bg-white/15 text-white ring-1 ring-white/25"><Paintbrush className="h-6 w-6" /></span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Theming</p>
              <h1 className="mt-0.5 flex items-center gap-2.5 text-2xl font-bold text-white">
                Branding Requests
                {counts.pending > 0 && (
                  <span className="inline-flex items-center gap-1.5 bg-white/15 px-2 py-0.5 text-xs font-semibold text-white ring-1 ring-white/25">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-300" /> {counts.pending} pending
                  </span>
                )}
              </h1>
              <p className="mt-1 text-sm text-white/80">Review and approve organisations' branding change requests.</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filter strip with counts */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium transition-colors ${active ? "text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
              style={active ? { background: ACCENT } : undefined}
            >
              <Icon className="h-4 w-4" />
              {f.label}
              <span className={`px-1.5 py-0.5 text-[10px] font-bold leading-none ${active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>{counts[f.key] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <SALoader />
      ) : requests.length === 0 ? (
        <div className={`${card} p-16 text-center`}>
          <Inbox className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-gray-500">No {filter === "all" ? "" : filter} branding requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req, i) => {
            const st = STATUS[req.status] || STATUS.pending;
            const logo = orgLogo(req.organisationId);
            const after = mergeBrand(req.currentBranding, req.requestedBranding);
            const changed = CHANGE_FIELDS.filter((f) => req.requestedBranding?.[f.key]);
            return (
              <motion.div
                key={req._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
                className={`${card} overflow-hidden transition-shadow hover:shadow-lg hover:shadow-black/5`}
              >
                {/* header */}
                <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-5">
                  <div className="flex min-w-0 items-center gap-3">
                    {logo ? (
                      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden bg-gray-50 p-1"><img src={logo} alt="" className="h-full w-full object-contain" /></span>
                    ) : (
                      <span className="grid h-11 w-11 shrink-0 place-items-center text-sm font-bold uppercase text-white" style={{ background: accentTint(1) }}>{req.organisationId?.name?.charAt(0) || "?"}</span>
                    )}
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-gray-900">{req.organisationId?.name || "Unknown organisation"}</h3>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 truncate font-mono text-[11px] text-gray-400">
                        <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" />{req.organisationId?.slug}</span>
                        <span className="inline-flex items-center gap-1"><UserIcon className="h-3 w-3" />{req.requestedBy?.name || req.requestedBy?.email || "—"}</span>
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(req.createdAt)}</span>
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold capitalize ${st.cls}`}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.dot }} />
                    {req.status}
                  </span>
                </div>

                <div className="p-5">
                  {/* before → after preview */}
                  <div className="flex items-stretch gap-3">
                    <BrandPreview label="Current" branding={req.currentBranding} fallbackLogo={logo} />
                    <div className="flex items-center px-1 pt-5"><ArrowRight className="h-5 w-5 text-gray-300" /></div>
                    <BrandPreview label="Requested" branding={after} fallbackLogo={logo} highlight />
                  </div>

                  {/* changes */}
                  {changed.length > 0 && (
                    <div className="mt-4 border border-gray-100 bg-gray-50 p-4">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">What changes</p>
                      {changed.map((f) => (
                        <ChangeRow key={f.key} label={f.label} type={f.type} current={req.currentBranding?.[f.key]} requested={req.requestedBranding[f.key]} />
                      ))}
                    </div>
                  )}

                  {req.message && <p className="mt-4 border-l-2 px-3 py-2 text-sm italic text-gray-600" style={{ borderColor: accentTint(0.4), background: accentTint(0.05) }}>"{req.message}"</p>}

                  {req.status !== "pending" && (req.reviewNote || req.reviewedBy) && (
                    <p className="mt-3 text-xs text-gray-400">
                      {req.status === "approved" ? "Approved" : "Rejected"} by {req.reviewedBy?.name || req.reviewedBy?.email || "operator"}
                      {req.reviewedAt ? ` · ${fmtDate(req.reviewedAt)}` : ""}
                      {req.reviewNote ? ` — "${req.reviewNote}"` : ""}
                    </p>
                  )}

                  {req.status === "pending" && (
                    <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4">
                      <button type="button" onClick={() => openReview(req, "approve")} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light" style={{ background: ACCENT }}>
                        <Check className="h-4 w-4" /> Approve
                      </button>
                      <button type="button" onClick={() => openReview(req, "reject")} className="inline-flex items-center gap-1.5 border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100">
                        <X className="h-4 w-4" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Review modal */}
      <AnimatePresence>
        {reviewModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setReviewModal(null)} />
            <motion.div className={`${card} relative w-full max-w-md p-6 shadow-xl`} initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}>
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center" style={reviewAction === "approve" ? { background: accentTint(0.12), color: ACCENT } : { background: "#fef2f2", color: "#dc2626" }}>
                {reviewAction === "approve" ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
              </div>
              <h3 className="mb-1 text-center text-lg font-semibold text-gray-900">{reviewAction === "approve" ? "Approve request" : "Reject request"}</h3>
              <p className="mb-4 text-center text-sm text-gray-500">
                {reviewAction === "approve" ? "Applies the requested branding to " : "Declines the branding change for "}
                <strong className="text-gray-800">{reviewModal.organisationId?.name}</strong>.
              </p>
              <div className="mb-4 flex items-stretch gap-2">
                <BrandPreview label="Current" branding={reviewModal.currentBranding} fallbackLogo={orgLogo(reviewModal.organisationId)} />
                <div className="flex items-center"><ArrowRight className="h-4 w-4 text-gray-300" /></div>
                <BrandPreview label="Requested" branding={mergeBrand(reviewModal.currentBranding, reviewModal.requestedBranding)} fallbackLogo={orgLogo(reviewModal.organisationId)} highlight />
              </div>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Add a note (optional)…"
                rows={3}
                className="mb-4 w-full resize-none border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5"
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setReviewModal(null)} className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10">Cancel</button>
                {reviewAction === "approve" ? (
                  <button type="button" onClick={decide} disabled={busy} className="flex-1 bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50">{busy ? "Approving…" : "Approve"}</button>
                ) : (
                  <button type="button" onClick={decide} disabled={busy} className="flex-1 bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50">{busy ? "Rejecting…" : "Reject"}</button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
