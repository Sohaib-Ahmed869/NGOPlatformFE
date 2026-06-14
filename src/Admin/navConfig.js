// Single source of truth for the admin sidebar's information architecture.
// 18 flat routes regrouped into 6 logical sections. Each item carries its
// lucide icon component directly so the sidebar just renders `item.icon`.
//
// `match` (optional) lists extra path prefixes an item "owns" for active-state
// resolution — e.g. Products owns /admin/products/* so a product detail route
// keeps the Products item highlighted.
import {
  LayoutDashboard,
  Heart,
  HandCoins,
  RefreshCcw,
  Layers,
  XCircle,
  Users,
  HeartHandshake,
  Contact,
  Mail,
  Target,
  Megaphone,
  CalendarDays,
  ShoppingBag,
  FileText,
  Paintbrush,
  Settings,
  UserCog,
} from 'lucide-react'

export const NAV_GROUPS = [
  {
    // `flat` groups render their items as top-level entries — no section label
    // and no indentation/guide line. Used for the standalone Dashboard link.
    label: 'Overview',
    flat: true,
    items: [
      { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Fundraising',
    items: [
      { label: 'All Donations', path: '/admin/donations', icon: Heart },
      { label: 'Subscriptions', path: '/admin/subscriptions', icon: RefreshCcw },
      { label: 'Installments', path: '/admin/installments', icon: Layers },
      { label: 'Cancellation Requests', path: '/admin/cancellation-requests', icon: XCircle },
    ],
  },
  {
    label: 'Supporters',
    items: [
      { label: 'Donors', path: '/admin/donors', icon: Users },
      { label: 'Volunteers', path: '/admin/volunteers', icon: HeartHandshake },
      { label: 'Contacts', path: '/admin/contacts', icon: Contact },
      { label: 'Newsletter', path: '/admin/newsletter', icon: Mail },
    ],
  },
  {
    label: 'Programs & Store',
    items: [
      { label: 'Programs', path: '/admin/programs', icon: Target },
      { label: 'P2P Campaigns', path: '/admin/p2p-campaigns', icon: Megaphone },
      { label: 'Events', path: '/admin/events', icon: CalendarDays },
      { label: 'Products', path: '/admin/products', icon: ShoppingBag, match: ['/admin/products'] },
      { label: 'Donation Types', path: '/admin/donation-types', icon: HandCoins },
    ],
  },
  {
    label: 'Website',
    items: [
      { label: 'Website Pages', path: '/admin/pages', icon: FileText },
      { label: 'Portal Branding', path: '/admin/branding', icon: Paintbrush },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Organisation Settings', path: '/admin/settings', icon: Settings },
      { label: 'Profile', path: '/admin/profile', icon: UserCog },
    ],
  },
]

// path-segment → human label, used by the header breadcrumbs. Derived from the
// nav items above plus the route segments that differ from their nav label.
export const BREADCRUMB_LABELS = {
  dashboard: 'Dashboard',
  donations: 'All Donations',
  'donation-types': 'Donation Types',
  subscriptions: 'Subscriptions',
  installments: 'Installments',
  'cancellation-requests': 'Cancellation Requests',
  payments: 'Payments',
  donors: 'Donors',
  volunteers: 'Volunteers',
  contacts: 'Contacts',
  newsletter: 'Newsletter',
  programs: 'Programs',
  'p2p-campaigns': 'P2P Campaigns',
  events: 'Events',
  products: 'Products',
  pages: 'Website Pages',
  branding: 'Portal Branding',
  settings: 'Organisation Settings',
  profile: 'Profile',
}
