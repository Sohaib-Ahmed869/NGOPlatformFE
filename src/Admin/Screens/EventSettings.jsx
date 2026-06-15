import React, { useState, useEffect } from "react";
import { Loader2, Check, Plus, Trash2, Users, GripVertical } from "lucide-react";
import { toast } from "react-hot-toast";
import settingsService from "../../services/settings.service";
import { cn } from "../../utils/cn";

// Quick-add presets — one click to seed a common audience with a sensible colour.
const PRESETS = [
  { label: "Open to all", color: "#C9A84C" },
  { label: "Brothers only", color: "#1F4D3A" },
  { label: "Sisters only", color: "#A855F7" },
  { label: "Youth", color: "#2563EB" },
  { label: "Children", color: "#F97316" },
  { label: "Families", color: "#0EA5E9" },
  { label: "Members only", color: "#DC2626" },
];

// Default colours cycled through when adding a blank row.
const SWATCHES = ["#C9A84C", "#1F4D3A", "#A855F7", "#2563EB", "#F97316", "#0EA5E9", "#DC2626", "#16A34A"];

function SectionHead({ icon: Icon, title, desc }) {
  return (
    <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center bg-accent/10 text-accent">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        <p className="mt-0.5 text-sm text-text-muted">{desc}</p>
      </div>
    </div>
  );
}

export default function EventSettings() {
  const cached = settingsService.getCached();
  const [rows, setRows] = useState(() => cached?.eventAudiences || []);
  const [loading, setLoading] = useState(!cached);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (cached) return;
    settingsService
      .getSettings()
      .then((d) => setRows(d?.eventAudiences || []))
      .catch(() => toast.error("Failed to load event settings"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (i, patch) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i) => setRows((prev) => prev.filter((_, idx) => idx !== i));
  const addRow = (preset) =>
    setRows((prev) => [
      ...prev,
      {
        key: "",
        label: preset?.label || "",
        color: preset?.color || SWATCHES[prev.length % SWATCHES.length],
      },
    ]);

  const save = async () => {
    // Drop empty rows; the backend slugs keys + de-dupes.
    const clean = rows
      .map((r) => ({ key: r.key || "", label: (r.label || "").trim(), color: r.color || "#C9A84C" }))
      .filter((r) => r.label);
    setSaving(true);
    try {
      const res = await settingsService.updateSettings({ eventAudiences: clean });
      const saved = res?.data?.settings?.eventAudiences || clean;
      setRows(saved);
      toast.success("Audiences saved");
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  // Presets not already present (by label, case-insensitive).
  const existingLabels = new Set(rows.map((r) => (r.label || "").trim().toLowerCase()));
  const availablePresets = PRESETS.filter((p) => !existingLabels.has(p.label.toLowerCase()));

  return (
    <>
      <SectionHead
        icon={Users}
        title="Event audiences"
        desc="Define who your events are for. Each audience gets a colour that's used on the public events calendar — filter pills, colour-coded sessions and the legend."
      />

      {/* Quick add */}
      {availablePresets.length > 0 && (
        <div className="mb-6">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Quick add</p>
          <div className="flex flex-wrap gap-2">
            {availablePresets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => addRow(p)}
                className="inline-flex items-center gap-1.5 border border-gray-200 px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-accent/50 hover:text-primary"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rows */}
      {rows.length === 0 ? (
        <div className="border border-dashed border-gray-200 bg-gray-50/60 px-6 py-10 text-center">
          <p className="text-sm font-medium text-primary">No audiences yet</p>
          <p className="mt-1 text-xs text-text-muted">Add one above, or create a custom one below. With none set, the audience filter is hidden and events show in your accent colour.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-3 border border-gray-100 bg-white p-2.5 shadow-sm">
              <GripVertical className="h-4 w-4 shrink-0 text-gray-300" />
              {/* Colour */}
              <label className="relative inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-gray-200" style={{ backgroundColor: r.color }}>
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(r.color) ? r.color : "#C9A84C"}
                  onChange={(e) => update(i, { color: e.target.value })}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Audience colour"
                />
              </label>
              {/* Label */}
              <input
                type="text"
                value={r.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder="e.g. Sisters only"
                className="min-w-0 flex-1 border-b border-transparent bg-transparent py-1.5 text-sm text-gray-800 outline-none transition-colors focus:border-accent"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Remove audience"
                className="grid h-8 w-8 shrink-0 place-items-center text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add custom + Save */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => addRow()}
          className="inline-flex items-center gap-2 border border-gray-200 px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:border-accent/50 hover:text-primary"
        >
          <Plus className="h-4 w-4" /> Add custom audience
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className={cn(
            "inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saving ? "Saving…" : "Save audiences"}
        </button>
      </div>

      <div className="mt-6 flex items-start gap-3 border border-accent/15 bg-accent/5 p-4">
        <Users className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <p className="text-sm text-text-muted">
          Renaming an audience keeps events linked to it (they reference a stable id). Deleting one leaves its events with no audience — they'll show neutrally on the calendar until you reassign them.
        </p>
      </div>
    </>
  );
}
