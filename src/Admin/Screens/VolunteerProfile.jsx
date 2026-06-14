import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Mail,
  Phone,
  Trash2,
  Loader2,
  Send,
  CalendarPlus,
  CalendarDays,
  Clock4,
  Briefcase,
  StickyNote,
  Check,
  UserRound,
  History,
  MapPin,
  X,
  Users,
} from "lucide-react";
import { TabLoader } from "../../components/TabLoader";
import { CustomSelect } from "../../components/CustomSelect";
import Portal from "../../components/Portal";
import { cn } from "../../utils/cn";
import joinTeamService from "../../services/joinTeam.service";
import eventsService from "../../services/events.service";
import { getSocket } from "../../services/socket";
import { useAdminRealtime } from "../../context/AdminRealtimeContext";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";

const fullName = (a) => `${a?.firstName || ""} ${a?.lastName || ""}`.trim() || "Volunteer";
const initials = (a) =>
  `${(a?.firstName || "").charAt(0)}${(a?.lastName || "").charAt(0)}`.toUpperCase() || "?";

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Reviewed" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];
const EMAILABLE = new Set(["shortlisted", "approved", "rejected"]);
const STATUS_BADGE = {
  pending: "bg-amber-50 text-amber-700",
  reviewed: "bg-accent/10 text-accent",
  shortlisted: "bg-primary/10 text-primary",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-600",
};
const ASSIGNMENT_STATUS = [
  { value: "assigned", label: "Assigned" },
  { value: "confirmed", label: "Confirmed" },
  { value: "attended", label: "Attended" },
  { value: "no-show", label: "No-show" },
];

function StatusBadge({ status }) {
  const s = status || "pending";
  return (
    <span className={cn("inline-flex items-center px-2.5 py-1 text-xs font-semibold capitalize", STATUS_BADGE[s])}>
      {s}
    </span>
  );
}

function Stat({ icon: Icon, label, value, tone = "accent" }) {
  const tones = {
    accent: "bg-accent/10 text-accent",
    green: "bg-emerald-100 text-emerald-600",
    gray: "bg-gray-100 text-gray-500",
  };
  return (
    <div className="flex items-center gap-3 border border-gray-100 bg-white p-3.5 shadow-sm">
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center", tones[tone])}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold leading-tight text-primary">{value}</p>
        <p className="mt-0.5 text-[11px] text-text-muted">{label}</p>
      </div>
    </div>
  );
}

function Card({ icon: Icon, title, right, children, className }) {
  return (
    <div className={cn("border border-gray-100 bg-white p-5 shadow-sm", className)}>
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
          {Icon ? <Icon className="h-4 w-4 text-accent" /> : null}
          {title}
        </h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, full }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">{label}</p>
      <p className="mt-1 break-words text-sm text-gray-800">{value || value === 0 ? value : "—"}</p>
    </div>
  );
}

const VolunteerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshVolunteers } = useAdminRealtime();

  const [v, setV] = useState(null);
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState([]);
  const [events, setEvents] = useState([]);
  const [questions, setQuestions] = useState([]);

  const [notify, setNotify] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [eventToAdd, setEventToAdd] = useState("");
  const [linking, setLinking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await joinTeamService.getById(id);
      setV(data);
    } catch {
      toast.error("Could not load this volunteer");
      navigate("/admin/volunteers");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    joinTeamService.team().then(setTeam).catch(() => {});
    joinTeamService.getForm().then(setQuestions).catch(() => {});
    eventsService
      .getAll()
      .then((res) => setEvents(res?.events || res || []))
      .catch(() => {});
  }, []);

  // Stay in sync if someone else edits this volunteer.
  useEffect(() => {
    const socket = getSocket();
    const onUpdated = ({ volunteer }) => {
      if (volunteer && volunteer._id === id) setV(volunteer);
    };
    const onRemoved = (payload) => {
      if (payload?.id === id) navigate("/admin/volunteers");
    };
    socket.on("volunteer:updated", onUpdated);
    socket.on("volunteer:deleted", onRemoved);
    return () => {
      socket.off("volunteer:updated", onUpdated);
      socket.off("volunteer:deleted", onRemoved);
    };
  }, [id, navigate]);

  const apply = (updated) => {
    setV(updated);
    refreshVolunteers();
  };

  const setStatus = async (status) => {
    setSavingStatus(true);
    try {
      const willNotify = notify && EMAILABLE.has(status);
      const updated = await joinTeamService.setStatus(id, status, willNotify);
      apply(updated);
      toast.success(updated.emailed ? "Status updated · applicant emailed" : "Status updated");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update status");
    } finally {
      setSavingStatus(false);
    }
  };

  const assign = async (userId) => {
    try {
      apply(await joinTeamService.assign(id, userId || null));
      toast.success(userId ? "Assigned" : "Unassigned");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to assign");
    }
  };

  const addNote = async () => {
    const body = noteInput.trim();
    if (!body) return;
    setSavingNote(true);
    try {
      apply(await joinTeamService.addNote(id, body));
      setNoteInput("");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add note");
    } finally {
      setSavingNote(false);
    }
  };

  const removeNote = async (noteId) => {
    try {
      apply(await joinTeamService.deleteNote(id, noteId));
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to remove note");
    }
  };

  const linkEvent = async () => {
    if (!eventToAdd) return;
    setLinking(true);
    try {
      apply(await joinTeamService.linkEvent(id, { eventId: eventToAdd }));
      setEventToAdd("");
      toast.success("Linked to event");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to link event");
    } finally {
      setLinking(false);
    }
  };

  const updateAssignment = async (assignmentId, payload) => {
    try {
      apply(await joinTeamService.updateAssignment(id, assignmentId, payload));
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update");
    }
  };

  const unlink = async (assignmentId) => {
    try {
      apply(await joinTeamService.unlinkEvent(id, assignmentId));
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to remove");
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await joinTeamService.remove(id);
      toast.success("Application deleted");
      refreshVolunteers();
      navigate("/admin/volunteers");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <TabLoader label="Loading volunteer…" />
      </div>
    );
  }
  if (!v) return null;

  const assignments = v.assignments || [];
  const notes = v.notes || [];
  const history = [...(v.statusHistory || [])].reverse();
  const answers = v.answers || {};
  const qLabel = Object.fromEntries(questions.map((q) => [q.key, q.label]));
  const answerEntries = Object.entries(answers).filter(
    ([, val]) => val !== "" && val != null && !(Array.isArray(val) && !val.length),
  );
  const totalHours = assignments.reduce((s, a) => s + (a.hours || 0), 0);
  const attendedCount = assignments.filter((a) => a.status === "attended").length;
  const linkedIds = new Set(assignments.map((a) => String(a.event?._id || a.event)));
  const availableEvents = events.filter((e) => !linkedIds.has(String(e._id)));
  const teamOptions = [
    { value: "", label: "Unassigned" },
    ...team.map((m) => ({ value: m._id, label: m.name || m.email })),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full space-y-5"
    >
      {/* Back */}
      <Link
        to="/admin/volunteers"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to volunteers
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent/10 text-lg font-bold uppercase text-accent">
            {initials(v)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold text-primary">{fullName(v)}</h1>
              <StatusBadge status={v.status} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted">
              <a href={`mailto:${v.email}`} className="inline-flex items-center gap-1.5 hover:text-accent">
                <Mail className="h-3.5 w-3.5" /> {v.email}
              </a>
              {v.phoneNumber && (
                <a href={`tel:${v.phoneNumber}`} className="inline-flex items-center gap-1.5 hover:text-accent">
                  <Phone className="h-3.5 w-3.5" /> {v.phoneNumber}
                </a>
              )}
              <span>Applied {fmtDate(v.createdAt)}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="inline-flex items-center gap-2 border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Check} label="Current status" value={<span className="capitalize">{v.status || "pending"}</span>} />
        <Stat icon={CalendarDays} label="Events" value={assignments.length} />
        <Stat icon={Clock4} label="Hours logged" value={`${totalHours}h`} tone="green" />
        <Stat icon={Users} label="Attended" value={attendedCount} tone="gray" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left: management */}
        <div className="space-y-5">
          <Card icon={Check} title="Status & owner">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Status</p>
            <CustomSelect
              value={v.status || "pending"}
              onChange={setStatus}
              disabled={savingStatus}
              options={STATUSES}
              triggerClassName="w-full border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <label className="mt-2 flex cursor-pointer items-start gap-2 text-xs text-text-muted">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="mt-0.5 accent-accent" />
              <span>Email applicant on shortlist / approve / reject.</span>
            </label>

            <p className="mb-1.5 mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Assigned to</p>
            <CustomSelect
              value={v.assignedTo?._id || ""}
              onChange={assign}
              options={teamOptions}
              triggerClassName="w-full border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </Card>

          <Card icon={History} title="Status history">
            {history.length === 0 ? (
              <p className="text-sm text-text-muted">No status changes recorded yet.</p>
            ) : (
              <ol className="space-y-3">
                {history.map((h, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={cn("mt-1 h-2.5 w-2.5 rounded-full", i === 0 ? "bg-accent" : "bg-gray-300")} />
                      {i < history.length - 1 && <span className="w-px flex-1 bg-gray-200" />}
                    </div>
                    <div className="pb-1">
                      <p className="text-sm font-medium capitalize text-primary">{h.status}</p>
                      <p className="text-xs text-text-muted">{fmtDateTime(h.at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        {/* Middle + right: events, notes, details */}
        <div className="space-y-5 lg:col-span-2">
          {/* Events */}
          <Card
            icon={CalendarDays}
            title={`Events (${assignments.length})`}
            right={
              totalHours > 0 ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-accent">
                  <Clock4 className="h-3.5 w-3.5" /> {totalHours}h total
                </span>
              ) : null
            }
          >
            <div className="space-y-2">
              {assignments.length === 0 && <p className="text-sm text-text-muted">Not assigned to any events yet.</p>}
              {assignments.map((a) => (
                <div key={a._id} className="flex flex-wrap items-center gap-2 border border-gray-100 p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-primary">{a.event?.title || "Event"}</p>
                    <p className="flex items-center gap-1 text-xs text-text-muted">
                      {a.event?.date ? fmtDate(a.event.date) : "—"}
                      {a.event?.location?.city ? (
                        <>
                          <span>·</span>
                          <MapPin className="h-3 w-3" /> {a.event.location.city}
                        </>
                      ) : null}
                    </p>
                  </div>
                  <CustomSelect
                    value={a.status}
                    onChange={(val) => updateAssignment(a._id, { status: val })}
                    options={ASSIGNMENT_STATUS}
                    triggerClassName="border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-accent"
                    className="w-[120px]"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      defaultValue={a.hours || 0}
                      onBlur={(e) => {
                        const hrs = Math.max(0, Number(e.target.value) || 0);
                        if (hrs !== (a.hours || 0)) updateAssignment(a._id, { hours: hrs });
                      }}
                      className="w-14 border border-gray-200 px-2 py-1 text-xs outline-none focus:border-accent"
                      title="Hours"
                    />
                    <span className="text-xs text-text-muted">h</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => unlink(a._id)}
                    title="Remove from event"
                    className="grid h-7 w-7 place-items-center text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            {availableEvents.length > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <CustomSelect
                  value={eventToAdd}
                  onChange={setEventToAdd}
                  options={[
                    { value: "", label: "Add to an event…" },
                    ...availableEvents.map((e) => ({ value: e._id, label: `${e.title} · ${fmtDate(e.date)}` })),
                  ]}
                  triggerClassName="w-full border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={linkEvent}
                  disabled={!eventToAdd || linking}
                  className="inline-flex items-center gap-1.5 bg-accent px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"
                >
                  {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />} Add
                </button>
              </div>
            )}
          </Card>

          {/* Notes */}
          <Card icon={StickyNote} title={`Internal notes (${notes.length})`}>
            <div className="space-y-2">
              {notes.length === 0 && (
                <p className="text-sm text-text-muted">No notes yet — capture anything the team should know.</p>
              )}
              {notes.map((n) => (
                <div key={n._id} className="group border border-gray-100 bg-gray-50/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-primary">{n.author?.name || n.author?.email || "Team member"}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-text-muted">{fmtDateTime(n.createdAt)}</span>
                      <button
                        type="button"
                        onClick={() => removeNote(n._id)}
                        className="text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                        title="Delete note"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-700">{n.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-start gap-2">
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") addNote();
                }}
                rows={2}
                placeholder="Add an internal note… (⌘/Ctrl + Enter)"
                className="flex-1 resize-none border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-colors focus:border-accent focus:bg-white"
              />
              <button
                type="button"
                onClick={addNote}
                disabled={!noteInput.trim() || savingNote}
                className="inline-flex h-9 items-center gap-1.5 bg-accent px-3 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"
              >
                {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </Card>

          {/* Application details */}
          <Card icon={UserRound} title="Application details">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="Age" value={v.age} />
              <Field label="Gender" value={v.gender} />
              <Field full label="Address" value={v.address} />
              <Field full label="Skills & experience" value={v.skills} />
              <div className="sm:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Available days</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {v.availableDays?.length ? (
                    v.availableDays.map((d, idx) => (
                      <span key={idx} className="bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                        {d}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-800">—</span>
                  )}
                </div>
              </div>
              {answerEntries.map(([key, val]) => (
                <Field key={key} full label={qLabel[key] || key} value={Array.isArray(val) ? val.join(", ") : String(val)} />
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Delete confirm */}
      <Portal>
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !deleting && setConfirmDelete(false)} />
            <div className="relative w-full max-w-sm border border-gray-100 bg-white p-6 text-center shadow-2xl">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-red-50">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-base font-semibold text-primary">Delete this application?</h3>
              <p className="mt-1 break-words text-sm text-text-muted">
                {fullName(v)}'s record will be permanently removed. This can't be undone.
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex flex-1 items-center justify-center gap-2 bg-red-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </Portal>
    </motion.div>
  );
};

export default VolunteerProfile;
