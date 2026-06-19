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
  Handshake,
  Contact,
  Mail,
  LifeBuoy,
  Target,
  Megaphone,
  CalendarDays,
  Banknote,
  Wallet,
  Coins,
  ShoppingBag,
  FileText,
  Paintbrush,
  Type,
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
    // `feature` (optional) = config/featureCatalog flag key; the item is hidden
    // when the tenant's plan doesn't allow that feature. Items with no `feature`
    // are always shown (core).
    label: 'Fundraising',
    items: [
      { label: 'All Donations', path: '/admin/donations', icon: Heart },
      { label: 'Subscriptions', path: '/admin/subscriptions', icon: RefreshCcw, feature: 'recurringGiving' },
      { label: 'Installments', path: '/admin/installments', icon: Layers, feature: 'recurringGiving' },
      { label: 'Cancellation Requests', path: '/admin/cancellation-requests', icon: XCircle, feature: 'recurringGiving' },
    ],
  },
  {
    label: 'Supporters',
    items: [
      { label: 'Donors', path: '/admin/donors', icon: Users },
      { label: 'Volunteers', path: '/admin/volunteers', icon: HeartHandshake, feature: 'volunteers' },
      { label: 'Partners', path: '/admin/partners', icon: Handshake, feature: 'partners' },
      { label: 'Contacts', path: '/admin/contacts', icon: Contact },
      { label: 'Support Tickets', path: '/admin/support', icon: LifeBuoy, feature: 'supportTickets' },
      { label: 'Newsletter', path: '/admin/newsletter', icon: Mail, feature: 'newsletter' },
    ],
  },
  {
    label: 'Programs & Store',
    items: [
      { label: 'Programs', path: '/admin/programs', icon: Target, feature: 'programs' },
      { label: 'Program Payments', path: '/admin/program-payments', icon: Coins, feature: 'programs' },
      { label: 'P2P Campaigns', path: '/admin/p2p-campaigns', icon: Megaphone, feature: 'p2pCampaigns' },
      { label: 'Campaign Payments', path: '/admin/campaign-payments', icon: Wallet, feature: 'p2pCampaigns' },
      { label: 'Events', path: '/admin/events', icon: CalendarDays, feature: 'events' },
      { label: 'Event Payments', path: '/admin/event-payments', icon: Banknote, feature: 'events' },
      { label: 'Products', path: '/admin/products', icon: ShoppingBag, match: ['/admin/products'], feature: 'store' },
      { label: 'Donation Types', path: '/admin/donation-types', icon: HandCoins, feature: 'programs' },
    ],
  },
  {
    label: 'Website',
    items: [
      { label: 'Website Pages', path: '/admin/pages', icon: FileText },
      { label: 'Portal Branding', path: '/admin/branding', icon: Paintbrush },
      { label: 'Design', path: '/admin/design', icon: Type, feature: 'designSystem' },
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
  partners: 'Partners',
  contacts: 'Contacts',
  support: 'Support Tickets',
  newsletter: 'Newsletter',
  programs: 'Programs',
  'program-payments': 'Program Payments',
  'p2p-campaigns': 'P2P Campaigns',
  'campaign-payments': 'Campaign Payments',
  events: 'Events',
  'event-payments': 'Event Payments',
  products: 'Products',
  pages: 'Website Pages',
  branding: 'Portal Branding',
  design: 'Design',
  settings: 'Organisation Settings',
  profile: 'Profile',
}
