import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Loader2, Save, RotateCcw, Plus, Trash2, Info } from "lucide-react";
import EmailPreview from "./EmailPreview";
import TabLoader from "../TabLoader";
import SASelect from "../../SuperAdmin/components/SASelect";
import SAErrorState from "../../SuperAdmin/components/SAErrorState";
import { cn } from "../../utils/cn";
import toast from "react-hot-toast";

/**
 * The shared wrapper every transactional email renders inside: logo header,
 * card, footer, colours and type.
 *
 * This replaces the six divergent ad-hoc "shells" that used to live inline in
 * controllers — each styling the same email furniture slightly differently.
 * Editing here changes every email at once, which is exactly why it gets its
 * own tab and its own live preview rather than hiding inside one template.
 *
 * Shared by the platform console and a tenant's own portal via `service`.
 */

const card =
  "rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-[var(--admin-card)]";
const labelCls =
  "mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400";
const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-accent dark:border-white/10 dark:bg-white/5 dark:text-white/85";

// Only the colours worth exposing. The rest of the theme (font stack, radius,
// widths) has sensible defaults and rarely needs touching.
const COLOR_FIELDS = [
  ["brandColor", "Header band"],
  ["accentColor", "Accent / buttons"],
  ["headingColor", "Headings"],
  ["textColor", "Body text"],
  ["mutedColor", "Muted text"],
  ["pageBg", "Page background"],
  ["cardBg", "Card background"],
  ["panelBg", "Details panel"],
  ["borderColor", "Borders"],
];

// Tiling textures for the header band and the footer panel. They render as CSS
// background-images, which Gmail and desktop Outlook drop — so this is styling
// on top of the solid colour, never load-bearing.
const PATTERN_OPTIONS = [
  ["mark", "Platform mark — the Donexus rosette, watermarked"],
  ["rings", "Rings — overlapping circles"],
  ["dots", "Dots"],
  ["grid", "Grid"],
  ["weave", "Weave — diagonals"],
  ["waves", "Waves"],
  ["none", "None — flat colour"],
];

const NUMBER_FIELDS = [
  ["contentWidth", "Content width (px)", 600],
  ["radius", "Corner radius (px)", 10],
  ["fontSize", "Base font size (px)", 15],
];

const FONT_OPTIONS = [
  ["", "System default"],
  [
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    "System sans",
  ],
  ["Georgia, 'Times New Roman', serif", "Serif"],
  ["'Helvetica Neue', Helvetica, Arial, sans-serif", "Helvetica"],
  ["Verdana, Geneva, sans-serif", "Verdana"],
  ["'Trebuchet MS', Tahoma, sans-serif", "Trebuchet"],
];

// Which template to render behind the layout while editing it. A receipt
// exercises nearly every block type, so it's the honest stress test.
const PREVIEW_KEY_ORDER = ["donation.receipt", "event.registrationConfirmed", "tenant.welcome"];

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export default function EmailLayoutPanel({ service, previewKeys }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [customised, setCustomised] = useState(false);
  // A failed load used to leave `loading` false and `form` null, and the render
  // guard below read that as "still loading" — so the tab spun forever behind a
  // toast that had already faded. Failure is now a state, not a gap.
  const [loadError, setLoadError] = useState("");
  const [reloadNonce, setReloadNonce] = useState(0);

  const [preview, setPreview] = useState({ html: "", subject: "", text: "" });
  const [previewLoading, setPreviewLoading] = useState(false);

  const previewKey = (previewKeys || PREVIEW_KEY_ORDER)[0];

  // The layout is one document that both tabs of this console read, and it
  // changes when someone saves it — which drops the cache. So a plain get is
  // already the right freshness, and forcing one only meant that opening this
  // tab twice cost two round trips for the same bytes.
  const dirtyRef = useRef(false);
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    setLoadError("");
    service
      .getLayout({ force: reloadNonce > 0, signal: controller.signal })
      .then((res) => {
        // Never overwrite a layout being edited — the tab stays mounted while
        // you're on another one, so this can land behind your back.
        if (!alive || dirtyRef.current) return;
        const merged = { ...res.defaults, ...(res.resolved || {}) };
        setForm(merged);
        setBaseline(merged);
        setCustomised(!!res.current);
      })
      .catch((err) => {
        if (!alive || axios.isCancel(err)) return;
        setLoadError(err?.response?.data?.error || "Couldn't load the shared layout");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
      controller.abort();
    };
  }, [service, reloadNonce]);

  // The layout only shows up wrapped around real content, so the preview
  // renders a representative template with the in-progress layout applied.
  useEffect(() => {
    if (!form) return undefined;
    let alive = true;
    const controller = new AbortController();
    const draft = { layout: form };
    // Already rendered this exact layout — dragging a colour back to where it
    // was, or flipping a pattern and flipping it back. Nothing to ask for.
    const instant = service.hasPreview?.(previewKey, draft);

    const render = () => {
      // Inside the timer, not outside it: setting this up front made the
      // "Rendering" pill strobe continuously while you dragged a colour picker.
      if (!instant) setPreviewLoading(true);
      service
        .preview(previewKey, draft, { signal: controller.signal })
        .then((res) => alive && setPreview(res))
        .catch(() => {})
        .finally(() => alive && setPreviewLoading(false));
    };

    if (instant) {
      render();
      return () => {
        alive = false;
      };
    }

    const t = setTimeout(render, 450);
    return () => {
      alive = false;
      clearTimeout(t);
      controller.abort();
    };
  }, [form, service, previewKey]);

  // `same` serialises the whole layout document; memoised so it runs when the
  // form changes rather than on every render the preview triggers.
  const dirty = useMemo(() => !!form && !!baseline && !same(form, baseline), [form, baseline]);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  const theme = form?.theme || {};

  const set = useCallback((patch) => setForm((f) => ({ ...f, ...patch })), []);
  const setTheme = useCallback(
    (patch) => setForm((f) => ({ ...f, theme: { ...f.theme, ...patch } })),
    [],
  );

  const links = useMemo(() => form?.footerLinks || [], [form]);
  const setLinks = useCallback((next) => set({ footerLinks: next }), [set]);

  const save = async () => {
    setSaving(true);
    try {
      await service.saveLayout(form);
      setBaseline(form);
      setCustomised(true);
      toast.success("Layout saved — every email now uses it");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Couldn't save the layout");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!window.confirm("Revert the shared layout to the default? Every email will follow it.")) return;
    try {
      const res = await service.resetLayout();
      const merged = { ...(res.resolved || {}) };
      setForm(merged);
      setBaseline(merged);
      setCustomised(false);
      toast.success("Layout reverted");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Couldn't reset the layout");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <TabLoader label="Loading layout" />
      </div>
    );
  }

  if (loadError || !form) {
    return (
      <SAErrorState
        message={loadError || "The shared layout couldn't be loaded."}
        onRetry={() => setReloadNonce((k) => k + 1)}
        className="rounded-2xl"
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <div className="space-y-4">
        <div className={cn(card, "flex flex-wrap items-center justify-between gap-3 p-4")}>
          <div className="flex gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <p className="max-w-md text-[11px] leading-relaxed text-gray-500 dark:text-white/50">
              This wrapper surrounds <strong>every</strong> transactional email. It already uses the
              logo and colours from <strong>Branding</strong> — fields left blank inherit those, so
              you only need to set what you want to differ.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {customised && (
              <button
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:border-red-200 hover:text-red-600 dark:border-white/10 dark:text-white/65"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Revert
              </button>
            )}
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white transition-opacity disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {dirty ? "Save layout" : "Saved"}
            </button>
          </div>
        </div>

        {/* Header */}
        <Section title="Header">
          <ToggleRow
            label="Show the header"
            value={form.showHeader !== false}
            onChange={(v) => set({ showHeader: v })}
          />
          {form.showHeader !== false && (
            <>
              <ToggleRow
                label="Show the logo"
                hint="Falls back to a monogram in the accent colour, then the name."
                value={form.showLogo !== false}
                onChange={(v) => set({ showLogo: v })}
              />
              <ToggleRow
                label="Show the name in text"
                hint="Set beside the logo. Leave on unless your logo is already a wordmark — many clients block images."
                value={form.showBrandName !== false}
                onChange={(v) => set({ showBrandName: v })}
              />
              <div>
                <label className={labelCls}>Header style</label>
                <SASelect
                  fullWidth
                  value={form.headerStyle || "band"}
                  onChange={(v) => set({ headerStyle: v })}
                  options={[
                    ["band", "Branded band — the primary colour"],
                    ["plain", "Plain — logo on the page background"],
                  ]}
                />
                <p className="mt-1 text-[10px] leading-snug text-gray-400">
                  The band uses the light logo variant; a plain header uses the dark one.
                </p>
              </div>
              {(form.headerStyle || "band") !== "plain" && (
                <div>
                  <label className={labelCls}>Band pattern</label>
                  <SASelect
                    fullWidth
                    value={form.headerPattern || "rings"}
                    onChange={(v) => set({ headerPattern: v })}
                    options={PATTERN_OPTIONS}
                  />
                  <p className="mt-1 text-[10px] leading-snug text-gray-400">
                    Drawn in the band’s own text colour. Gmail and desktop Outlook show the flat colour instead.
                  </p>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>
                    Logo URL <span className="ml-1 normal-case tracking-normal text-gray-300">dark, on light</span>
                  </label>
                  <input
                    value={form.logoUrl || ""}
                    onChange={(e) => set({ logoUrl: e.target.value })}
                    placeholder="{{org.logo}}"
                    className={cn(inputCls, "font-mono text-xs")}
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    Logo URL <span className="ml-1 normal-case tracking-normal text-gray-300">light, on the band</span>
                  </label>
                  <input
                    value={form.logoUrlOnDark || ""}
                    onChange={(e) => set({ logoUrlOnDark: e.target.value })}
                    placeholder="{{org.logoLight}}"
                    className={cn(inputCls, "font-mono text-xs")}
                  />
                </div>
                <div>
                  <label className={labelCls}>Logo height (px)</label>
                  <input
                    type="number"
                    value={form.logoHeight ?? ""}
                    onChange={(e) => set({ logoHeight: Number(e.target.value) || 0 })}
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Header alignment</label>
                <SASelect
                  fullWidth
                  value={form.headerAlign || "left"}
                  onChange={(v) => set({ headerAlign: v })}
                  options={[["left", "Left"], ["center", "Centre"], ["right", "Right"]]}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Tagline <span className="ml-1 normal-case tracking-normal text-gray-300">optional</span>
                </label>
                <input
                  value={form.headerTagline || ""}
                  onChange={(e) => set({ headerTagline: e.target.value })}
                  placeholder="Clean water for every family"
                  className={inputCls}
                />
              </div>
            </>
          )}
        </Section>

        {/* Footer */}
        <Section title="Footer">
          <div>
            <label className={labelCls}>Footer style</label>
            <SASelect
              fullWidth
              value={form.footerStyle || "band"}
              onChange={(v) => set({ footerStyle: v })}
              options={[
                ["band", "Band — joined to the card, in the brand colour"],
                ["panel", "Panel — joined, in a pale tint"],
                ["plain", "Plain — detached text under the message"],
              ]}
            />
            <p className="mt-1 text-[10px] leading-snug text-gray-400">
              Band and panel join the footer to the message so the email reads as one card.
            </p>
          </div>
          {(form.footerStyle || "band") !== "plain" && (
            <div>
              <label className={labelCls}>Footer pattern</label>
              <SASelect
                fullWidth
                value={form.footerPattern || "rings"}
                onChange={(v) => set({ footerPattern: v })}
                options={PATTERN_OPTIONS}
              />
            </div>
          )}
          <div>
            <label className={labelCls}>Footer line</label>
            <input
              value={form.footerText || ""}
              onChange={(e) => set({ footerText: e.target.value })}
              placeholder="{{org.footer}}"
              className={cn(inputCls, "font-mono text-xs")}
            />
          </div>
          <div>
            <label className={labelCls}>Small print</label>
            <input
              value={form.legalText || ""}
              onChange={(e) => set({ legalText: e.target.value })}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Footer links</label>
            <div className="space-y-2">
              {links.map((l, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    value={l.label || ""}
                    onChange={(e) =>
                      setLinks(links.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))
                    }
                    placeholder="Label"
                    className={cn(inputCls, "w-1/3 py-1.5 text-xs")}
                  />
                  <input
                    value={l.url || ""}
                    onChange={(e) =>
                      setLinks(links.map((x, idx) => (idx === i ? { ...x, url: e.target.value } : x)))
                    }
                    placeholder="https://…"
                    className={cn(inputCls, "py-1.5 font-mono text-[11px]")}
                  />
                  <button
                    onClick={() => setLinks(links.filter((_, idx) => idx !== i))}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {links.length < 6 && (
                <button
                  onClick={() => setLinks([...links, { label: "", url: "" }])}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
                >
                  <Plus className="h-3 w-3" /> Add link
                </button>
              )}
            </div>
          </div>

          <ToggleRow
            label="Show platform credit"
            hint="Adds a “Powered by …” line. Off by default so a charity's mail looks like theirs."
            value={!!form.showPlatformCredit}
            onChange={(v) => set({ showPlatformCredit: v })}
          />
          {form.showPlatformCredit && (
            <div>
              <label className={labelCls}>Credit line</label>
              <input
                value={form.platformCreditText || ""}
                onChange={(e) => set({ platformCreditText: e.target.value })}
                className={cn(inputCls, "font-mono text-xs")}
              />
            </div>
          )}
        </Section>

        {/* Colours + type */}
        <Section title="Colours & type">
          <div>
            <label className={labelCls}>Font</label>
            <SASelect
              fullWidth
              value={theme.fontFamily || ""}
              onChange={(v) => setTheme({ fontFamily: v })}
              options={FONT_OPTIONS}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {COLOR_FIELDS.map(([key, label]) => (
              <div key={key}>
                <label className={labelCls}>{label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={theme[key] || "#ffffff"}
                    onChange={(e) => setTheme({ [key]: e.target.value })}
                    className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-gray-200 bg-white p-1 dark:border-white/10 dark:bg-white/5"
                  />
                  <input
                    value={theme[key] || ""}
                    onChange={(e) => setTheme({ [key]: e.target.value })}
                    placeholder="Default"
                    className={cn(inputCls, "py-1.5 font-mono text-[11px]")}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {NUMBER_FIELDS.map(([key, label, placeholder]) => (
              <div key={key}>
                <label className={labelCls}>{label}</label>
                <input
                  type="number"
                  value={theme[key] ?? ""}
                  placeholder={String(placeholder)}
                  onChange={(e) =>
                    setTheme({ [key]: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  className={inputCls}
                />
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Bounded and pinned so the preview stays beside the form instead of
          sitting a full page below it — and so the iframe has a definite
          height to fill. */}
      <div
        className={cn(
          card,
          "flex min-h-[65vh] flex-col p-3 sm:p-4 lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)] lg:min-h-0",
        )}
      >
        <EmailPreview
          html={preview.html}
          subject={preview.subject}
          text={preview.text}
          loading={previewLoading}
        />
        <p className="mt-3 text-[10px] leading-snug text-gray-400">
          Shown wrapped around a sample <strong>{previewKey}</strong> so you can see the layout doing
          its real job.
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className={cn(card, "p-4")}>
      <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/85">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ToggleRow({ label, hint, value, onChange }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-gray-700 dark:text-white/80">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] leading-snug text-gray-400">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors",
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
    </div>
  );
}
