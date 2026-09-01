import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Palette, ScrollText, Info, RefreshCw, PenLine } from "lucide-react";
import { tenantEmailTemplatesService } from "../../services/emailTemplates.service";
import EmailTemplateEditor from "../../components/email/EmailTemplateEditor";
import EmailTemplateList from "../../components/email/EmailTemplateList";
import EmailLayoutPanel from "../../components/email/EmailLayoutPanel";
import EmailLogsPanel from "../../components/email/EmailLogsPanel";
import SendEmailPage from "../../components/email/SendEmailPage";
import useEmailConsole from "../../components/email/useEmailConsole";
import { cn } from "../../utils/cn";

/**
 * A charity's own copy of the email console.
 *
 * They see only the emails that go out in THEIR name — receipts, volunteers,
 * events, partners. Platform mail (billing, operator invites, helpdesk) is
 * filtered out server-side and never appears here, which is why this list
 * doesn't bother marking scope: everything they can see, they can edit.
 *
 * Anything they haven't customised follows the platform default, and "Revert to
 * default" simply deletes their override. The list, editor, layout panel and
 * send log are the same components the SuperAdmin console uses, bound to the
 * tenant API mount — the backend decides the layer from the route, not from the
 * client.
 */

const TABS = [
  { key: "templates", label: "Emails", icon: Mail },
  { key: "layout", label: "Branding", icon: Palette },
  { key: "logs", label: "Send log", icon: ScrollText },
];

export default function EmailTemplateSettings() {
  const [tab, setTab] = useState("templates");
  const [editingKey, setEditingKey] = useState(null);
  // A template key, "" for the free-form composer, null when not sending.
  // This tab has no routes of its own, so it swaps its whole body the way the
  // editor does rather than opening a dialog over the list.
  const [composeKey, setComposeKey] = useState(null);
  const [filters, setFilters] = useState({ q: "", group: "all", status: "all" });

  const { templates, groups, stats, loading, refreshing, error, busyKeys, toggle, refresh, revalidate } =
    useEmailConsole(tenantEmailTemplatesService);

  // Closing the editor may have created or removed an override. If it didn't,
  // the service still holds the list and this costs nothing.
  useEffect(() => {
    if (!editingKey && composeKey === null) revalidate();
  }, [editingKey, composeKey, revalidate]);

  // Keep a tab alive once opened — the send log carries its own filters and page.
  const [visited, setVisited] = useState(() => new Set([tab]));
  useEffect(() => setVisited((s) => (s.has(tab) ? s : new Set(s).add(tab))), [tab]);

  const openTemplate = useCallback((t) => setEditingKey(t.key), []);

  if (editingKey) {
    return (
      <EmailTemplateEditor
        service={tenantEmailTemplatesService}
        templateKey={editingKey}
        backLabel="Back to emails"
        onBack={() => setEditingKey(null)}
        onSend={(k) => {
          setEditingKey(null);
          setComposeKey(k);
        }}
      />
    );
  }

  if (composeKey !== null) {
    return (
      <SendEmailPage
        service={tenantEmailTemplatesService}
        templateKey={composeKey || null}
        backLabel="Back to emails"
        onBack={() => setComposeKey(null)}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex gap-2 rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-white/10 dark:bg-white/[0.03]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] leading-relaxed text-gray-500 dark:text-white/50">
            These are the emails your supporters receive from you. Each one starts from a
            well-written default — edit only the ones you want to say differently, and the rest keep
            following the default automatically.
          </p>
          {stats.total > 0 && (
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-gray-400">
              {stats.customised} of {stats.total} edited by you
              {stats.sent > 0 && ` · ${stats.sent.toLocaleString()} sent in 30 days`}
              {stats.failed > 0 && (
                <span className="text-red-500"> · {stats.failed.toLocaleString()} failed</span>
              )}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 self-start">
          <button
            onClick={() => setComposeKey("")}
            title="Write a one-off email and send it in your charity's branding"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-medium text-gray-600 transition-colors hover:border-accent hover:text-accent dark:border-white/10 dark:text-white/65"
          >
            <PenLine className="h-3 w-3" />
            Compose
          </button>
          <button
            onClick={refresh}
            disabled={refreshing}
            title="Refresh"
            className="rounded-lg p-1 text-gray-400 transition-colors hover:text-accent disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-gray-100 dark:border-white/10">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "relative inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium transition-colors",
              tab === t.key
                ? "text-accent"
                : "text-gray-500 hover:text-gray-800 dark:text-white/50 dark:hover:text-white/80",
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            {t.key === "logs" && stats.failed > 0 && (
              <span className="rounded-full bg-red-500/15 px-1.5 text-[10px] font-semibold text-red-500">
                {stats.failed}
              </span>
            )}
            {tab === t.key && (
              <motion.span
                layoutId="tenant-email-tab"
                className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-accent"
              />
            )}
          </button>
        ))}
      </div>

      <div hidden={tab !== "templates"} aria-hidden={tab !== "templates"}>
        <EmailTemplateList
          templates={templates}
          groups={groups}
          loading={loading}
          error={error}
          onRetry={refresh}
          busyKeys={busyKeys}
          onToggle={toggle}
          onOpen={openTemplate}
          onSend={(t) => setComposeKey(t.key)}
          filters={filters}
          onFilters={setFilters}
          shortcuts={tab === "templates"}
          storageKey="tenant-email-collapsed"
          emptyHint="Only emails sent in your charity's name appear here."
        />
      </div>

      {visited.has("layout") && (
        <div hidden={tab !== "layout"} aria-hidden={tab !== "layout"}>
          <EmailLayoutPanel service={tenantEmailTemplatesService} />
        </div>
      )}

      {visited.has("logs") && (
        <div hidden={tab !== "logs"} aria-hidden={tab !== "logs"}>
          <EmailLogsPanel service={tenantEmailTemplatesService} templates={templates} />
        </div>
      )}

    </div>
  );
}
