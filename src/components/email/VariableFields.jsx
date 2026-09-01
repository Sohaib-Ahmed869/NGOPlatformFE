import { memo, useMemo, useState } from "react";
import { ChevronDown, Wand2, Info } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * The form an operator fills in before sending a catalogued email by hand.
 *
 * It is generated from `catalog.variablesFor(key)` — the same declaration the
 * variable palette in the editor reads — so it can never fall behind the
 * template. Add a variable to the catalog and a field for it appears here.
 *
 * ── Two decisions worth keeping ───────────────────────────────────────────
 *
 * Identity is NOT editable. `org.*` and `platform.*` are excluded, because
 * services/emailTemplates.js only fills `ctx.org` when the call site didn't
 * supply one — so a form that posted them would let a typo in a modal restyle
 * the email, replace the logo and rewrite the footer. They're resolved from the
 * organisation on every send and shown here as a note instead of as inputs.
 *
 * Empty means empty. The sample value is the PLACEHOLDER, never the value: the
 * send renders exactly what was typed, so a field left alone has to look like
 * the blank it will be. "Fill from samples" exists for when you want them, and
 * says so.
 */

// Namespaces the server resolves for itself. `currency` is injected per send.
const AUTO_PREFIXES = new Set(["org", "platform", "currency"]);

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T|$)/;
const LONG_TEXT_HINT = /(message|note|body|description|summary|reason|comment|address)/i;

/** Human label for a namespace: "donor" → "Donor", "p2p" → "P2P". */
function groupLabel(prefix) {
  if (!prefix) return "Other";
  if (prefix.length <= 3) return prefix.toUpperCase();
  return prefix.charAt(0).toUpperCase() + prefix.slice(1).replace(/([A-Z])/g, " $1");
}

/**
 * What kind of input a variable wants, inferred from its sample value.
 * The catalog declares samples so the preview looks realistic; they double as
 * a type declaration, which is why no second one had to be invented.
 */
function fieldKind(variable) {
  const s = variable.sample;
  if (typeof s === "boolean") return "boolean";
  if (typeof s === "number") return "number";
  if (Array.isArray(s) || (s && typeof s === "object")) return "json";
  if (typeof s === "string" && ISO_DATE_RE.test(s)) return "date";
  if (LONG_TEXT_HINT.test(variable.key) || String(s || "").length > 90) return "text";
  return "string";
}

/* -- nested get/set on `a.b.c` paths --------------------------------------- */

function readPath(obj, path) {
  return path.split(".").reduce((cur, part) => (cur == null ? undefined : cur[part]), obj);
}

/**
 * Immutably set `a.b.c`. Returns a new object so React sees the change, and
 * deletes rather than storing `""` — an empty field must not become an empty
 * string in the payload, or `{{#if donor.phone}}` would render its branch for
 * a phone number nobody entered.
 */
function writePath(obj, path, value) {
  const parts = path.split(".");
  const next = { ...obj };
  let cur = next;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const k = parts[i];
    cur[k] = cur[k] && typeof cur[k] === "object" && !Array.isArray(cur[k]) ? { ...cur[k] } : {};
    cur = cur[k];
  }
  const leaf = parts[parts.length - 1];
  const empty = value === "" || value === undefined || value === null;
  if (empty) delete cur[leaf];
  else cur[leaf] = value;
  return next;
}

/** ISO string → the `YYYY-MM-DDTHH:mm` a datetime-local input wants. */
function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5 dark:text-white/85";

export default function VariableFields({ variables = [], values = {}, onChange, disabled }) {
  // Namespaces, in the order the catalog declares them, minus the ones the
  // server owns. A flat list of forty inputs is unusable; the namespaces are
  // already the right grouping, so they become the sections.
  const groups = useMemo(() => {
    const byPrefix = new Map();
    for (const v of variables) {
      const prefix = v.key.includes(".") ? v.key.split(".")[0] : "";
      if (AUTO_PREFIXES.has(prefix) || AUTO_PREFIXES.has(v.key)) continue;
      if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
      byPrefix.get(prefix).push(v);
    }
    return [...byPrefix.entries()].map(([prefix, items]) => ({ prefix, items }));
  }, [variables]);

  // The first section open, the rest folded: the fields that matter are almost
  // always the recipient's, and they're declared first.
  const [open, setOpen] = useState(() => new Set(groups.slice(0, 1).map((g) => g.prefix)));

  const set = (key, value) => onChange(writePath(values, key, value));

  const fillGroup = (items) => {
    let next = values;
    for (const v of items) {
      if (v.sample === "" || v.sample === undefined || v.sample === null) continue;
      next = writePath(next, v.key, v.sample);
    }
    onChange(next);
  };

  if (!groups.length) {
    return (
      <p className="flex gap-2 rounded-lg border border-gray-100 bg-gray-50/70 p-3 text-[11px] leading-relaxed text-gray-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/50">
        <Info className="mt-px h-3.5 w-3.5 shrink-0 text-gray-400" />
        This email has nothing to fill in — everything it says comes from your organisation’s own
        details, which are added automatically.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="flex gap-2 rounded-lg border border-gray-100 bg-gray-50/70 p-2.5 text-[11px] leading-relaxed text-gray-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/50">
        <Info className="mt-px h-3.5 w-3.5 shrink-0 text-gray-400" />
        Anything you leave blank is sent blank. Your organisation’s name, logo, colours and links
        are filled in for you.
      </p>

      {groups.map(({ prefix, items }) => {
        const isOpen = open.has(prefix);
        const filled = items.filter((v) => readPath(values, v.key) !== undefined).length;
        return (
          <div
            key={prefix || "other"}
            className="overflow-hidden rounded-xl border border-gray-100 dark:border-white/10"
          >
            <div className="flex items-center gap-2 bg-gray-50/70 px-3 py-2 dark:bg-white/[0.03]">
              <button
                type="button"
                onClick={() =>
                  setOpen((s) => {
                    const next = new Set(s);
                    if (next.has(prefix)) next.delete(prefix);
                    else next.add(prefix);
                    return next;
                  })
                }
                className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
              >
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform",
                    !isOpen && "-rotate-90",
                  )}
                />
                <span className="truncate text-xs font-medium text-gray-700 dark:text-white/80">
                  {groupLabel(prefix)}
                </span>
                <span className="font-mono text-[10px] text-gray-400">
                  {filled}/{items.length}
                </span>
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => fillGroup(items)}
                title="Copy the catalogue's example values into these fields — for a rehearsal, not a real send"
                className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium text-gray-400 transition-colors hover:text-accent disabled:opacity-40"
              >
                <Wand2 className="h-3 w-3" />
                Samples
              </button>
            </div>

            {isOpen && (
              <div className="space-y-2.5 p-3">
                {items.map((v) => (
                  <Field
                    key={v.key}
                    variable={v}
                    value={readPath(values, v.key)}
                    onChange={(val) => set(v.key, val)}
                    disabled={disabled}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const Field = memo(function Field({ variable, value, onChange, disabled }) {
  const kind = fieldKind(variable);

  const label = (
    <label htmlFor={`var-${variable.key}`} className="mb-1 flex items-baseline gap-1.5">
      <span className="text-[11px] font-medium text-gray-600 dark:text-white/70">
        {variable.label}
      </span>
      <span className="truncate font-mono text-[9px] text-gray-300 dark:text-white/25">
        {variable.key}
      </span>
    </label>
  );

  if (kind === "boolean") {
    return (
      <div className="flex items-center gap-2.5">
        <input
          id={`var-${variable.key}`}
          type="checkbox"
          disabled={disabled}
          checked={value === true}
          onChange={(e) => onChange(e.target.checked ? true : undefined)}
          className="h-4 w-4 shrink-0 rounded border-gray-300 text-accent focus:ring-accent dark:border-white/20 dark:bg-white/5"
        />
        <label
          htmlFor={`var-${variable.key}`}
          className="min-w-0 text-[11px] font-medium text-gray-600 dark:text-white/70"
        >
          {variable.label}
          <span className="ml-1.5 font-mono text-[9px] text-gray-300 dark:text-white/25">
            {variable.key}
          </span>
        </label>
      </div>
    );
  }

  if (kind === "json") {
    // A list (the line items on a receipt, say). Rare enough that a bounded
    // repeater would be more UI than it earns — the shape is already visible in
    // the sample, so it's edited as the JSON it is, and bad JSON is refused
    // here rather than silently dropped on the server.
    const text = value === undefined ? "" : JSON.stringify(value, null, 2);
    return (
      <div>
        {label}
        <textarea
          id={`var-${variable.key}`}
          rows={4}
          disabled={disabled}
          defaultValue={text}
          onBlur={(e) => {
            const raw = e.target.value.trim();
            if (!raw) return onChange(undefined);
            try {
              onChange(JSON.parse(raw));
              e.target.setCustomValidity("");
            } catch {
              e.target.setCustomValidity("This isn't valid JSON");
              e.target.reportValidity();
            }
          }}
          placeholder={JSON.stringify(variable.sample, null, 2)}
          className={cn(inputCls, "font-mono text-[11px]")}
        />
      </div>
    );
  }

  if (kind === "date") {
    return (
      <div>
        {label}
        <input
          id={`var-${variable.key}`}
          type="datetime-local"
          disabled={disabled}
          value={toLocalInput(value)}
          // Stored as an ISO string, which is what every date filter in
          // services/emailRender.js parses.
          onChange={(e) =>
            onChange(e.target.value ? new Date(e.target.value).toISOString() : undefined)
          }
          className={inputCls}
        />
      </div>
    );
  }

  if (kind === "number") {
    return (
      <div>
        {label}
        <input
          id={`var-${variable.key}`}
          type="number"
          step="any"
          disabled={disabled}
          value={value === undefined ? "" : value}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          placeholder={String(variable.sample ?? "")}
          className={inputCls}
        />
      </div>
    );
  }

  if (kind === "text") {
    return (
      <div>
        {label}
        <textarea
          id={`var-${variable.key}`}
          rows={3}
          disabled={disabled}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder={String(variable.sample ?? "")}
          className={inputCls}
        />
      </div>
    );
  }

  return (
    <div>
      {label}
      <input
        id={`var-${variable.key}`}
        type="text"
        disabled={disabled}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder={String(variable.sample ?? "")}
        className={inputCls}
      />
    </div>
  );
});
