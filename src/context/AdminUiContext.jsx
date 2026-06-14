import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

// Lightweight UI state for the admin shell — sidebar collapse, mobile drawer,
// and per-group accordion state. Persisted to localStorage so the operator's
// layout preferences survive reloads. Context (not zustand) to match the rest
// of this project's state approach (AuthContext / TenantContext).
const AdminUiContext = createContext(null)

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

const COLLAPSED_KEY = 'admin.sidebarCollapsed'
const GROUPS_KEY = 'admin.collapsedGroups'
const THEME_KEY = 'admin.theme'

export function AdminUiProvider({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => read(COLLAPSED_KEY, false))
  const [collapsedGroups, setCollapsedGroups] = useState(() => read(GROUPS_KEY, {}))
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [theme, setTheme] = useState(() => (read(THEME_KEY, 'light') === 'dark' ? 'dark' : 'light'))

  useEffect(() => {
    try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify(sidebarCollapsed)) } catch { /* ignore */ }
  }, [sidebarCollapsed])

  useEffect(() => {
    try { localStorage.setItem(GROUPS_KEY, JSON.stringify(collapsedGroups)) } catch { /* ignore */ }
  }, [collapsedGroups])

  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, JSON.stringify(theme)) } catch { /* ignore */ }
  }, [theme])

  const toggleSidebar = useCallback(() => setSidebarCollapsed((v) => !v), [])
  const openMobileSidebar = useCallback(() => setMobileSidebarOpen(true), [])
  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), [])
  const toggleGroup = useCallback(
    (label) => setCollapsedGroups((g) => ({ ...g, [label]: !g[label] })),
    [],
  )
  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])

  const value = {
    sidebarCollapsed,
    collapsedGroups,
    mobileSidebarOpen,
    theme,
    toggleSidebar,
    setSidebarCollapsed,
    openMobileSidebar,
    closeMobileSidebar,
    toggleGroup,
    toggleTheme,
  }

  return <AdminUiContext.Provider value={value}>{children}</AdminUiContext.Provider>
}

export function useAdminUi() {
  const ctx = useContext(AdminUiContext)
  if (!ctx) throw new Error('useAdminUi must be used within an AdminUiProvider')
  return ctx
}

export default AdminUiContext
