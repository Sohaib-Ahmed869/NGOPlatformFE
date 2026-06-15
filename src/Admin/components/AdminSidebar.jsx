import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'
import { useAdminUi } from '../../context/AdminUiContext'
import { useAdminRealtime } from '../../context/AdminRealtimeContext'
import { NAV_GROUPS } from '../navConfig'
import { cn } from '../../utils/cn'

// Present an org name nicely even when only a raw slug is available
// ("calcite" → "Calcite", "hope-fund" → "Hope Fund"). Real names that already
// contain capitals or spaces are respected and left untouched.
function prettifyName(raw) {
  if (!raw) return 'Admin Portal'
  if (/[A-Z]/.test(raw) || /\s/.test(raw)) return raw
  return raw.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// Longest-prefix active resolution — a child route like /admin/products/new
// keeps "Products" highlighted.
function findActivePath(pathname, items) {
  let best = null
  for (const item of items) {
    for (const p of [item.path, ...(item.match || [])]) {
      if (pathname === p || pathname.startsWith(`${p}/`)) {
        if (!best || p.length > best.len) best = { path: item.path, len: p.length }
      }
    }
  }
  return best?.path || null
}

// accent-tinted active state reads tenant CSS vars at runtime → inline style.
const activeItemStyle = {
  backgroundColor: 'rgba(var(--tenant-accent-rgb, 201, 168, 76), 0.18)',
  color: 'var(--tenant-accent, #C9A84C)',
}

export function AdminSidebar() {
  const { user, logout } = useAuth()
  const { organisation, branding, slug } = useTenant()
  const { sidebarCollapsed, mobileSidebarOpen, closeMobileSidebar, collapsedGroups, toggleGroup } = useAdminUi()
  const { unreadContacts, pendingVolunteers } = useAdminRealtime()

  // Per-path attention counts shown as a sidebar badge (unread contacts /
  // volunteer applications still awaiting review).
  const badgeFor = (path) => {
    if (path === '/admin/contacts') return unreadContacts
    if (path === '/admin/volunteers') return pendingVolunteers
    return 0
  }
  const location = useLocation()
  const navigate = useNavigate()

  const allItems = NAV_GROUPS.flatMap((g) => g.items)
  const activePath = findActivePath(location.pathname, allItems)

  const brandName = prettifyName(organisation?.name || slug)
  const brandSubtitle = 'Admin Portal'
  const brandInitial = (brandName || 'A').trim().charAt(0).toUpperCase()
  // The sidebar is a dark surface → prefer the light logo, fall back to the
  // dark variant. Collapsed → dedicated icon mark first, then the wordmark,
  // then a letter badge.
  const darkBgLogo = branding?.logo || branding?.logoDark
  const logo = sidebarCollapsed
    ? branding?.iconLogo || branding?.iconLogoDark || darkBgLogo
    : darkBgLogo

  const handleLogout = async () => {
    try { await logout() } catch { /* best-effort */ }
    toast.success('Logged out successfully')
    closeMobileSidebar()
    navigate('/admin/login')
  }

  return (
    <>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col text-white transition-[width,transform] duration-300 ease-in-out',
          sidebarCollapsed ? 'md:w-16' : 'md:w-64',
          'w-64',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
        style={{
          // Accent glow spreading in from the left edge (like the reference),
          // layered over the base vertical brand gradient. Both are background
          // layers so they paint behind the nav content. Driven by the tenant
          // accent → recolors per tenant.
          background: [
            'linear-gradient(to right, rgba(var(--tenant-accent-rgb, 201, 168, 76), 0.18), rgba(var(--tenant-accent-rgb, 201, 168, 76), 0.05) 45%, transparent 78%)',
            'linear-gradient(180deg, var(--tenant-sidebar-top, #4A3F30) 0%, var(--tenant-sidebar-bottom, #3D3226) 100%)',
          ].join(', '),
          // Soft right-edge shadow so the light content reads as nested under
          // the frame — replaces the hard border line.
          boxShadow: '4px 0 18px -10px rgba(0,0,0,0.6)',
        }}
      >
        {/* Brand — collapsed keeps the header height; expanded gets breathing
            room above the logo so it doesn't sit flush against the top edge. */}
        <div
          className={cn(
            'flex shrink-0 items-center',
            sidebarCollapsed ? 'h-16 justify-center px-3' : 'gap-2.5 px-4 pt-6 pb-4',
          )}
        >
          <Link to="/admin/dashboard" className="flex min-w-0 items-center gap-2.5" onClick={closeMobileSidebar}>
            {logo ? (
              // A logo image already carries the brand mark/wordmark, so show it
              // on its own. Collapsed → square icon; expanded → let a horizontal
              // wordmark breathe (auto width). No name/tagline alongside it.
              <img
                src={logo}
                alt={brandName}
                className={cn(
                  'shrink-0 object-contain',
                  sidebarCollapsed
                    ? 'h-9 w-9' // collapsed: just the icon, no ring/background
                    : // expanded: nudge left to offset typical logo whitespace
                      'object-left h-10 w-auto max-w-[170px] -ml-1.5',
                )}
              />
            ) : (
              // No logo → letter badge, plus the org name + "Admin Portal" label.
              <>
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[15px] font-extrabold leading-none text-white ring-1 ring-white/20"
                  style={{
                    background: 'linear-gradient(135deg, var(--tenant-accent, #C9A84C), var(--tenant-accent-light, #D4B85A))',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.25)',
                  }}
                >
                  {brandInitial}
                </span>
                {!sidebarCollapsed ? (
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate text-[15px] font-bold tracking-tight text-white">{brandName}</span>
                    <span className="truncate text-[9px] font-medium uppercase tracking-[0.18em] text-white/40">
                      {brandSubtitle}
                    </span>
                  </span>
                ) : null}
              </>
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav className="scrollbar-none flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => {
            const groupOpen = group.flat || sidebarCollapsed || !collapsedGroups[group.label]
            return (
              <div key={group.label}>
                {group.flat ? null : !sidebarCollapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    aria-expanded={groupOpen}
                    className="mb-1 flex w-full items-center justify-between gap-2 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 transition-colors hover:text-white/70"
                  >
                    <span className="truncate">{group.label}</span>
                    <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform duration-200', groupOpen ? 'rotate-0' : '-rotate-90')} />
                  </button>
                ) : (
                  <div className="mx-2 my-2 border-t border-white/10" />
                )}

                {groupOpen ? (
                  <ul
                    className={cn(
                      'space-y-1 transition-[margin,padding,border-color] duration-300 ease-in-out',
                      // Non-flat groups: indent under their label with a subtle
                      // guide line — fades/collapses away smoothly when collapsed.
                      !group.flat && 'border-l',
                      !group.flat && (sidebarCollapsed ? 'ml-0 border-transparent pl-0' : 'ml-3 border-white/10 pl-2.5'),
                    )}
                  >
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const active = item.path === activePath
                      const badge = badgeFor(item.path)
                      return (
                        <li key={item.path}>
                          <NavLink
                            to={item.path}
                            title={sidebarCollapsed ? item.label : undefined}
                            onClick={closeMobileSidebar}
                            style={active ? activeItemStyle : undefined}
                            className={cn(
                              'group relative flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors duration-200',
                              !active && 'text-white/70 hover:bg-white/5 hover:text-white',
                            )}
                          >
                            {/* Highlight the guide-line segment next to the active
                                item (sits exactly over the ul's left border). */}
                            {active && !sidebarCollapsed && !group.flat ? (
                              <span
                                className="absolute inset-y-1 -left-[11px] w-[3px] rounded-full"
                                style={{ backgroundColor: 'var(--tenant-accent, #C9A84C)' }}
                                aria-hidden="true"
                              />
                            ) : null}
                            <Icon className="h-[18px] w-[18px] shrink-0" />
                            <span className={cn('min-w-0 flex-1 truncate transition-opacity duration-200', sidebarCollapsed && 'opacity-0')}>{item.label}</span>
                            {/* Unread indicator: a pill when expanded, a dot over
                                the icon when collapsed. */}
                            {badge > 0 ? (
                              sidebarCollapsed ? (
                                <span
                                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500"
                                  style={{ boxShadow: '0 0 0 2px var(--tenant-sidebar-top, #4A3F30)' }}
                                  aria-label={`${badge} unread`}
                                />
                              ) : (
                                <span
                                  className="inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white"
                                  aria-label={`${badge} unread`}
                                >
                                  {badge > 99 ? '99+' : badge}
                                </span>
                              )
                            ) : null}
                          </NavLink>
                        </li>
                      )
                    })}
                  </ul>
                ) : null}
              </div>
            )
          })}
        </nav>

        {/* Logout — red-transparent button */}
        <div className="shrink-0 border-t border-white/10 p-3">
          <button
            type="button"
            onClick={handleLogout}
            title={sidebarCollapsed ? 'Logout' : undefined}
            aria-label="Logout"
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span className={cn('min-w-0 flex-1 truncate text-left transition-opacity duration-200', sidebarCollapsed && 'opacity-0')}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {mobileSidebarOpen ? (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={closeMobileSidebar}
        />
      ) : null}
    </>
  )
}

export default AdminSidebar
