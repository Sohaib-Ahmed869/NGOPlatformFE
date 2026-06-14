import { motion } from 'framer-motion'
import { BREADCRUMB_LABELS } from '../navConfig'

function humanize(segment) {
  if (!segment) return ''
  return segment
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// Path segments that are group prefixes, not real pages — kept in the URL but
// omitted from the breadcrumb. `/admin/donations` → "Home / All Donations".
const NON_ROUTE_SEGMENTS = new Set(['admin'])

// Build a clickable breadcrumb trail from a pathname. Exported so the topbar
// renders breadcrumbs straight from the current route (single source of truth).
export function deriveCrumbs(pathname) {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs = []
  let acc = ''
  for (const seg of segments) {
    acc += `/${seg}`
    if (NON_ROUTE_SEGMENTS.has(seg)) continue
    const isObjectId = /^[a-f\d]{24}$/i.test(seg)
    const label = BREADCRUMB_LABELS[seg] || (isObjectId ? 'Details' : humanize(seg))
    crumbs.push({ label, path: acc })
  }
  return crumbs
}

// Shared page header — title, optional mono eyebrow, subtitle, and right-aligned
// actions. Breadcrumbs live in the topbar, so this only owns the title block.
export function PageHeader({ title, subtitle, eyebrow, actions }) {
  return (
    <motion.div
      className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-text-muted">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-bold text-primary">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </motion.div>
  )
}

export default PageHeader
