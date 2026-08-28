import { Plus, Trash2, GripVertical, Info } from "lucide-react";
import SASelect from "../../SuperAdmin/components/SASelect";
import { BLOCK_BY_TYPE, TONE_OPTIONS } from "./blockTypes";
import { cn } from "../../utils/cn";

/**
 * The property panel for the selected block.
 *
 * Every control is generated from the block type's `fields` schema (see
 * blockTypes.js) — there is no per-type form here, which is what keeps adding a
 * block type to a single edit in one file.
 *
 * `registerField` hands the parent a ref to whichever input was last focused so
 * the variable palette can insert at the caret rather than appending.
 */

const labelCls =
  "mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400";
const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5 dark:text-white/85";

function Field({ label, help, children, optional }) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {optional && <span className="ml-1 normal-case tracking-normal text-gray-300">optional</span>}
      </label>
      {children}
      {help && <p className="mt-1 text-[10px] leading-snug text-gray-400">{help}</p>}
    </div>
  );
}

function AlignPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {["left", "center", "right"].map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => onChange(a)}
          className={cn(
            "flex-1 rounded-lg border py-1.5 text-[11px] capitalize transition-colors",
            (value || "left") === a
              ? "border-accent bg-accent/10 text-accent"
              : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-white/10 dark:text-white/50",
          )}
        >
          {a}
        </button>
      ))}
    </div>
  );
}

function TonePicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TONE_OPTIONS.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors",
            value === t.value
              ? "border-transparent text-white"
              : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-white/10 dark:text-white/50",
          )}
          style={value === t.value ? { background: t.color } : undefined}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: value === t.value ? "#fff" : t.color }}
          />
          {t.label}
        </button>
      ))}
    </div>
  );
}

function ColorField({ value, onChange, placeholder = "Inherit" }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Pick a colour"
        className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-gray-200 bg-white p-1 dark:border-white/10 dark:bg-white/5"
      />
      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(inputCls, "min-w-0 flex-1 font-mono text-xs")}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          title="Use the layout's colour"
          className="shrink-0 text-[10px] text-gray-400 underline hover:text-gray-600"
        >
          reset
        </button>
      )}
    </div>
  );
}

/**
 * A repeater over pairs. One control serves the details panel (label / value),
 * the steps block (title / description) and the stats block (figure / caption) —
 * they are the same shape with different names, and `spec` supplies the names.
 */
function RowsField({ rows = [], onChange, registerField, spec = {} }) {
  const {
    a = "label",
    b = "value",
    aLabel = "Label",
    bLabel = "{{variable}} or plain text",
    showIf = true,
    strong = false,
    addLabel = "Add row",
  } = spec;
  const set = (i, patch) => onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div
          key={i}
          className="rounded-lg border border-gray-100 bg-gray-50/60 p-2 dark:border-white/10 dark:bg-white/[0.03]"
        >
          <div className="mb-1.5 flex items-center gap-1.5">
            <GripVertical className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-white/20" />
            <input
              value={row[a] || ""}
              onChange={(e) => set(i, { [a]: e.target.value })}
              placeholder={aLabel}
              className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-white/5 dark:text-white/85"
            />
            {strong && (
              <button
                type="button"
                onClick={() => set(i, { strong: !row.strong })}
                title="Emphasise this row — the figure the reader is looking for"
                className={cn(
                  "shrink-0 rounded px-1.5 py-1 text-[10px] font-bold transition-colors",
                  row.strong
                    ? "bg-accent/10 text-accent"
                    : "text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10",
                )}
              >
                A+
              </button>
            )}
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
              className="grid h-6 w-6 shrink-0 place-items-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          <input
            {...registerField(`row-${i}-${b}`)}
            value={row[b] || ""}
            onChange={(e) => set(i, { [b]: e.target.value })}
            placeholder={bLabel}
            className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 font-mono text-[11px] dark:border-white/10 dark:bg-white/5 dark:text-white/85"
          />
          {showIf && (
            <input
              value={row.showIf || ""}
              onChange={(e) => set(i, { showIf: e.target.value })}
              placeholder="Show only if… (a variable name)"
              className="mt-1 w-full rounded-md border border-transparent bg-transparent px-2 py-0.5 font-mono text-[10px] text-gray-500 outline-none placeholder:text-gray-300 focus:border-gray-200 dark:text-white/50 dark:focus:border-white/10"
            />
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, { [a]: "", [b]: "" }])}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
      >
        <Plus className="h-3 w-3" /> {addLabel}
      </button>
    </div>
  );
}

function ColumnsField({ columns = [], onChange, registerField }) {
  const set = (i, patch) => onChange(columns.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  return (
    <div className="space-y-2">
      {columns.map((col, i) => (
        <div
          key={i}
          className="rounded-lg border border-gray-100 bg-gray-50/60 p-2 dark:border-white/10 dark:bg-white/[0.03]"
        >
          <div className="mb-1.5 flex items-center gap-1.5">
            <input
              value={col.label || ""}
              onChange={(e) => set(i, { label: e.target.value })}
              placeholder="Column heading"
              className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-white/5 dark:text-white/85"
            />
            <select
              value={col.align || "left"}
              onChange={(e) => set(i, { align: e.target.value })}
              className="shrink-0 rounded-md border border-gray-200 bg-white px-1.5 py-1 text-[11px] dark:border-white/10 dark:bg-white/5 dark:text-white/85"
            >
              <option value="left">Left</option>
              <option value="center">Centre</option>
              <option value="right">Right</option>
            </select>
            <button
              type="button"
              onClick={() => onChange(columns.filter((_, idx) => idx !== i))}
              className="grid h-6 w-6 shrink-0 place-items-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          <input
            {...registerField(`col-${i}-value`)}
            value={col.value || ""}
            onChange={(e) => set(i, { value: e.target.value })}
            placeholder="{{this.label}}"
            className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 font-mono text-[11px] dark:border-white/10 dark:bg-white/5 dark:text-white/85"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...columns, { label: "", value: "", align: "left" }])}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
      >
        <Plus className="h-3 w-3" /> Add column
      </button>
    </div>
  );
}

function ItemsField({ items = [], onChange, registerField }) {
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            {...registerField(`item-${i}`)}
            value={typeof item === "string" ? item : item?.text || ""}
            onChange={(e) => onChange(items.map((x, idx) => (idx === i ? e.target.value : x)))}
            className={cn(inputCls, "min-w-0 flex-1 py-1.5 text-xs")}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="grid h-7 w-7 shrink-0 place-items-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
      >
        <Plus className="h-3 w-3" /> Add item
      </button>
    </div>
  );
}

export default function BlockInspector({ block, onChange, registerField }) {
  if (!block) {
    return (
      <div className="flex h-full items-center justify-center px-6 py-10 text-center">
        <div>
          <p className="text-sm text-gray-500 dark:text-white/60">No block selected</p>
          <p className="mt-1 text-xs text-gray-400">
            Pick a block above to edit it, or add a new one.
          </p>
        </div>
      </div>
    );
  }

  const def = BLOCK_BY_TYPE[block.type];
  if (!def) {
    return (
      <p className="px-4 py-6 text-sm text-gray-500">
        This block type ({block.type}) isn’t known to this version of the console.
      </p>
    );
  }

  const set = (key, value) => onChange({ ...block, [key]: value });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 border-b border-gray-100 pb-3 dark:border-white/10">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/60">
          <def.icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-white/85">{def.label}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-gray-400">{def.hint}</p>
        </div>
      </div>

      {def.fields
        .filter((f) => !f.showWhen || f.showWhen(block))
        .map((f) => {
          const value = block[f.key];
          return (
            <Field key={f.key} label={f.label} help={f.help} optional={f.optional}>
              {f.type === "rich" || f.type === "textarea" ? (
                <textarea
                  {...registerField(f.key)}
                  rows={f.rows || 3}
                  value={value || ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className={cn(inputCls, "resize-y leading-relaxed", f.mono && "font-mono text-xs")}
                />
              ) : f.type === "select" ? (
                <SASelect
                  fullWidth
                  value={value}
                  onChange={(v) => set(f.key, v)}
                  options={f.options}
                />
              ) : f.type === "align" ? (
                <AlignPicker value={value} onChange={(v) => set(f.key, v)} />
              ) : f.type === "tone" ? (
                <TonePicker value={value} onChange={(v) => set(f.key, v)} />
              ) : f.type === "color" ? (
                <ColorField value={value} onChange={(v) => set(f.key, v)} />
              ) : f.type === "number" ? (
                <input
                  type="number"
                  value={value ?? ""}
                  placeholder={f.placeholder}
                  onChange={(e) => set(f.key, e.target.value === "" ? "" : Number(e.target.value))}
                  className={inputCls}
                />
              ) : f.type === "toggle" ? (
                <button
                  type="button"
                  onClick={() => set(f.key, !value)}
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors",
                    value ? "bg-accent" : "bg-gray-200 dark:bg-white/15",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                      value ? "left-[22px]" : "left-0.5",
                    )}
                  />
                </button>
              ) : f.type === "rows" ? (
                <RowsField
                  rows={value}
                  spec={f.spec}
                  onChange={(v) => set(f.key, v)}
                  registerField={registerField}
                />
              ) : f.type === "columns" ? (
                <ColumnsField
                  columns={value}
                  onChange={(v) => set(f.key, v)}
                  registerField={registerField}
                />
              ) : f.type === "items" ? (
                <ItemsField
                  items={value}
                  onChange={(v) => set(f.key, v)}
                  registerField={registerField}
                />
              ) : (
                <input
                  {...registerField(f.key)}
                  value={value || ""}
                  placeholder={f.placeholder}
                  onChange={(e) => set(f.key, e.target.value)}
                  className={cn(inputCls, f.type === "url" && "font-mono text-xs")}
                />
              )}
            </Field>
          );
        })}

      {/* Conditional visibility applies to every block type, so it lives here
          rather than in each type's field list. */}
      <div className="border-t border-gray-100 pt-3 dark:border-white/10">
        <Field
          label="Show only if"
          optional
          help='A variable name — the block disappears when it is empty. Put "!" in front to invert it, e.g. !tenant.password.'
        >
          <input
            value={block.showIf || ""}
            onChange={(e) => set("showIf", e.target.value)}
            placeholder="donation.isRecurring"
            className={cn(inputCls, "font-mono text-xs")}
          />
        </Field>
      </div>

      {block.hidden && (
        <div className="flex gap-2 rounded-lg bg-amber-50 p-2.5 dark:bg-amber-400/10">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
            This block is hidden and won’t be sent. Use the eye icon on its card to bring it back.
          </p>
        </div>
      )}
    </div>
  );
}
