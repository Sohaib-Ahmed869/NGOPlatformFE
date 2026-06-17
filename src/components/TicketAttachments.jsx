import { Paperclip, FileText, Download } from "lucide-react";
import { cn } from "../utils/cn";

const IMAGE_RE = /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i;

const isImage = (a) => IMAGE_RE.test(a?.name || "") || IMAGE_RE.test((a?.url || "").split("?")[0]);

const prettySize = (bytes) => {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

/**
 * Renders a ticket's attachments. Images show as clickable thumbnails (so you
 * can actually SEE them, not just a filename); other files (PDFs, etc.) show as
 * a labelled chip. Used by both the tenant and platform ticket detail views.
 */
export default function TicketAttachments({ attachments, className }) {
  const list = Array.isArray(attachments) ? attachments.filter((a) => a?.url) : [];
  if (!list.length) return null;

  const images = list.filter(isImage);
  const files = list.filter((a) => !isImage(a));

  return (
    <div className={cn("space-y-2.5", className)}>
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
        <Paperclip className="h-3 w-3" /> Attachments ({list.length})
      </p>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2.5">
          {images.map((a, i) => (
            <a
              key={a.key || a.url || i}
              href={a.url}
              target="_blank"
              rel="noreferrer"
              title={a.name}
              className="group relative block h-24 w-24 overflow-hidden rounded-token border border-gray-200 bg-gray-50 transition-colors hover:border-accent dark:border-white/10 dark:bg-white/5"
            >
              <img src={a.url} alt={a.name || "attachment"} loading="lazy" className="h-full w-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <Download className="h-4 w-4" />
              </span>
            </a>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((a, i) => (
            <a
              key={a.key || a.url || i}
              href={a.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-token border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 transition-colors hover:border-accent hover:text-accent dark:border-white/10 dark:bg-white/5"
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="max-w-[180px] truncate font-medium">{a.name || "Attachment"}</span>
              {a.size ? <span className="text-gray-400">· {prettySize(a.size)}</span> : null}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
