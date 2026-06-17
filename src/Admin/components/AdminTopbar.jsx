import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Sun,
  Moon,
  Bell,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useAdminUi } from '../../context/AdminUiContext'
import { cn } from '../../utils/cn'
import { deriveCrumbs } from './PageHeader'

function getInitials(name) {
  if (!name) return 'A'
  const parts = name.trim().split(/\s+/)
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

// Resolve a stored profile image to a usable URL. Tolerates full S3 URLs,
// data URLs, legacy relative paths, and the old "/api/placeholder" sentinel
// (treated as "no image").
function resolveAvatar(path) {
  if (!path || path.includes('/api/placeholder')) return ''
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path
  return `${API_BASE}/${String(path).replace(/\\/g, '/').replace(/^\/+/, '')}`
}

function useClickOutside(ref, onOutside) {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onOutside?.()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, onOutside])
}

// The header bar is always dark (matches the sidebar), so its direct controls
// use light-on-dark styling in both content themes.
const iconBtn =
  'inline-flex h-9 w-9 items-center justify-center text-white/70 transition-colors hover:bg-white/10 hover:text-white'

function Breadcrumbs() {
  const location = useLocation()
  const crumbs = deriveCrumbs(location.pathname)
  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 items-center gap-1.5 text-sm md:flex">
      <Link to="/admin/dashboard" className="inline-flex items-center gap-1 text-white/55 transition-colors hover:text-white">
        <Home className="h-3.5 w-3.5" /> Home
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={`${crumb.label}-${i}`} className="inline-flex min-w-0 items-center gap-1.5">
          <span className="text-white/25">/</span>
          {crumb.path && i < crumbs.length - 1 ? (
            <Link to={crumb.path} className="truncate text-white/55 transition-colors hover:text-white">{crumb.label}</Link>
          ) : (
            <span className="truncate font-medium text-white">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

function ThemeToggle() {
  const { theme, toggleTheme } = useAdminUi()
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={iconBtn}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}

function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useClickOutside(ref, () => setOpen(false))

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
        className={iconBtn}
      >
        <Bell className="h-5 w-5" />
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-token border border-gray-100 bg-white text-text-dark shadow-lg dark:border-white/10 dark:bg-[var(--admin-elevated)] dark:text-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-white/10">
            <p className="text-sm font-semibold text-primary dark:text-white">Notifications</p>
          </div>
          <div className="px-4 py-8 text-center">
            <Bell className="mx-auto mb-2 h-6 w-6 text-text-muted dark:text-white/40" />
            <p className="text-sm text-text-muted dark:text-white/55">No new notifications</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function UserMenu() {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const menuRef = useRef(null)
  useClickOutside(menuRef, () => setOpen(false))

  const email = user?.email || ''
  const displayName =
    user?.name ||
    (email ? email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Admin')
  const roleLabel = user?.role?.includes('admin') ? 'Administrator' : user?.role || 'Member'
  const avatar = resolveAvatar(user?.profileImage)

  const handleLogout = async () => {
    try { await logout() } catch { /* best-effort */ }
    toast.success('Logged out successfully')
    setOpen(false)
    navigate('/admin/login')
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 p-1 pr-1.5 transition-colors hover:bg-white/5"
      >
        {avatar ? (
          <img
            src={avatar}
            alt={displayName}
            className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-white/15"
          />
        ) : (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, var(--tenant-accent, #C9A84C), var(--tenant-accent-light, #D4B85A))' }}
          >
            {getInitials(displayName)}
          </span>
        )}
        <div className="hidden min-w-0 text-left leading-tight sm:block">
          <p className="max-w-[150px] truncate text-[13px] font-semibold text-white">{displayName}</p>
          <p className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-white/40">{roleLabel}</p>
        </div>
        <ChevronDown className={cn('hidden h-4 w-4 shrink-0 text-white/40 transition-transform duration-200 sm:block', open && 'rotate-180')} />
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-token border border-gray-100 bg-white shadow-lg dark:border-white/10 dark:bg-[var(--admin-elevated)]">
          <div className="border-b border-gray-100 px-4 py-3 dark:border-white/10">
            <p className="truncate text-sm font-semibold text-primary dark:text-white">{displayName}</p>
            <p className="truncate text-[12px] text-text-muted dark:text-white/55">{user?.email}</p>
          </div>
          <Link to="/admin/profile" className="flex items-center gap-2 px-3 py-2 text-sm text-text-dark hover:bg-background dark:text-white/80 dark:hover:bg-white/5" onClick={() => setOpen(false)}>
            <User className="h-4 w-4 text-text-muted dark:text-white/50" /> Profile
          </Link>
          <Link to="/admin/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-text-dark hover:bg-background dark:text-white/80 dark:hover:bg-white/5" onClick={() => setOpen(false)}>
            <Settings className="h-4 w-4 text-text-muted dark:text-white/50" /> Organisation settings
          </Link>
          <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-sm text-danger hover:bg-background dark:border-white/10 dark:hover:bg-white/5">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function AdminTopbar() {
  const { openMobileSidebar, toggleSidebar, sidebarCollapsed } = useAdminUi()

  return (
    <header
      className={cn(
        'fixed top-0 right-0 left-0 z-30 flex h-16 items-center text-white transition-[left] duration-300 ease-in-out',
        sidebarCollapsed ? 'md:left-16' : 'md:left-64',
      )}
      // Soft drop shadow gives the bar depth over the content — replaces the
      // hard border line.
      style={{ background: 'var(--tenant-sidebar-top, #4A3F30)', boxShadow: '0 4px 18px -10px rgba(0,0,0,0.6)' }}
    >
      <div className="flex h-full w-full items-center gap-3 px-3 lg:px-4">
        {/* Mobile: open drawer. Desktop: collapse/expand the rail. */}
        <button type="button" className={cn(iconBtn, 'md:hidden')} onClick={openMobileSidebar} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <button
          type="button"
          className={cn(iconBtn, 'hidden md:inline-flex')}
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>

        <Breadcrumbs />

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <NotificationsBell />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

export default AdminTopbar
