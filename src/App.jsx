import React, { lazy, Suspense } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import "jspdf-autotable";

// Context
import { TenantProvider, useTenant } from "./context/TenantContext";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./pages/Components/cart";

// Public components
import Navbar from "./pages/Components/navbar";
import Footer from "./pages/Components/footer";
import Cart from "./pages/Components/cart";
import BackToTop from "./components/BackToTop";
import ScrollToTop from "./components/ScrollToTop";
import PageTransition from "./components/PageTransition";

// Public pages
import Home from "./pages/Home/Home";
import Hope from "./pages/Hope/page";
import Contact from "./pages/Contact/page";
const Login = lazy(() => import("./pages/Login/page"));
const SignUp = lazy(() => import("./pages/Signup/page"));
const ChangePassword = lazy(() => import("./pages/Login/change-password"));
import InitiativesSection from "./pages/Initiatives/page";
import GetInvolved from "./pages/GetInvolved/page";
import FAQPage from "./pages/FAQ/page";
import Events from "./pages/Events/page";
const EventDetailPage = lazy(() => import("./pages/Events/EventDetail"));
const EventRegisterPage = lazy(() => import("./pages/Events/EventRegister"));
import IslamicGiving from "./pages/IslamicGivings/page";
import ZakatCalculator from "./pages/ZakatCalculator/page";
import RamadanDonations from "./pages/Home/RamdanDonations/page";
import AboutSection from "./pages/About/page";
import PartnersSection from "./pages/OurPartners/page";
const BecomePartner = lazy(() => import("./pages/OurPartners/BecomePartner"));
import AboutUsPage from "./pages/About/page2";
import EducationInitiatives from "./pages/EducationInitiatives/page";
import EmergenciesInitiatives from "./pages/Emergencies/page";
import WaterInitiatives from "./pages/Water/page";
import FoodInitiatives from "./pages/Food/page";
const UnifiedCheckout = lazy(() => import("./pages/Components/checkout"));
const OrderConfirmation = lazy(() => import("./pages/Components/OrderConfirmation"));
import DonatePage from "./pages/Donate/page";
const ForgotPassword = lazy(() => import("./pages/Login/forgot-password"));
const ResetPassword = lazy(() => import("./pages/Login/reset-password"));

// Admin
const AdminLayout = lazy(() => import("./Admin/Layout"));
const AdminDashboard = lazy(() => import("./Admin/Screens/dashboard"));
const DonationsPage = lazy(() => import("./Admin/Screens/donations"));
const DonationDetail = lazy(() => import("./Admin/Screens/DonationDetail"));
const DonorsPage = lazy(() => import("./Admin/Screens/donors"));
const DonorDetail = lazy(() => import("./Admin/Screens/DonorDetail"));
const SubscriptionsPage = lazy(() => import("./Admin/Screens/subscriptions"));
const SubscriptionDetail = lazy(() => import("./Admin/Screens/SubscriptionDetail"));
const EventsManagement = lazy(() => import("./Admin/Screens/Events"));
const EventPaymentsPage = lazy(() => import("./Admin/Screens/EventPayments"));
const CampaignPaymentsPage = lazy(() => import("./Admin/Screens/CampaignPayments"));
const ProgramPaymentsPage = lazy(() => import("./Admin/Screens/ProgramPayments"));
const AdminLogin = lazy(() => import("./pages/AdminLogin/login"));
import SupportHandoff from "./pages/SupportHandoff";
const SupportForm = lazy(() => import("./pages/SupportForm"));
const SupportFeedback = lazy(() => import("./pages/SupportFeedback"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const JoinTeamAdmin = lazy(() => import("./Admin/Screens/joinTeam"));
const PartnersAdmin = lazy(() => import("./Admin/Screens/Partners"));
const VolunteerProfile = lazy(() => import("./Admin/Screens/VolunteerProfile"));
const ContactRequestsAdmin = lazy(() => import("./Admin/Screens/contacts"));
const ProductsManagement = lazy(() => import("./Admin/Screens/Products"));
const NewsletterScreen = lazy(() => import("./Admin/Screens/newsletter"));
const CancellationRequests = lazy(() => import("./Admin/Screens/CancellationRequests"));
const ProfileSetting = lazy(() => import("./Admin/Screens/AdminProfile"));
const AdminInstallments = lazy(() => import("./Admin/Screens/installments"));
const InstallmentDetail = lazy(() => import("./Admin/Screens/InstallmentDetail"));
const DonationTypes = lazy(() => import("./Admin/Screens/DonationTypes"));
const BrandingScreen = lazy(() => import("./Admin/Screens/Branding"));
const AdminDesign = lazy(() => import("./Admin/Screens/Design"));
const OrganisationSettings = lazy(() => import("./Admin/Screens/OrganisationSettings"));
const AdminPages = lazy(() => import("./Admin/Screens/Pages"));
const SupportTickets = lazy(() => import("./Admin/Screens/SupportTickets"));

// User
const UserLayout = lazy(() => import("./User/UserLayout"));
const UserDonations = lazy(() => import("./User/Screens/donations"));
const UserPayments = lazy(() => import("./User/Screens/UserPayments"));
const MyFundraisers = lazy(() => import("./User/Screens/MyFundraisers"));
const Subscriptions = lazy(() => import("./User/Screens/Subscriptions"));
const PaymentMethods = lazy(() => import("./User/Screens/payments"));
const ProfileSettings = lazy(() => import("./User/Screens/profile"));
const UserDashboard = lazy(() => import("./User/Screens/dashboard"));
const MyPrograms = lazy(() => import("./User/Screens/MyPrograms"));
const UserSupport = lazy(() => import("./User/Screens/Support"));
import ProtectedRoute from "./components/ProtectedRoute";

// Program pages
import ProgramsPage from "./pages/Programs/ProgramsPage";
const ProgramDetailPage = lazy(() => import("./pages/Programs/ProgramDetail"));
const ProgramCheckout = lazy(() => import("./pages/Programs/ProgramCheckout"));
const AdminPrograms = lazy(() => import("./Admin/Screens/Programs"));
import CampaignsPage from "./pages/P2PCampaigns/CampaignsPage";
const CampaignDetail = lazy(() => import("./pages/P2PCampaigns/CampaignDetail"));
const GoFundMeDonate = lazy(() => import("./pages/P2PCampaigns/GoFundMeDonate"));
import StartFundraiser from "./pages/P2PCampaigns/StartFundraiser";
const GoFundMeAdmin = lazy(() => import("./Admin/Screens/GoFundMe"));

// SaaS pages
const SaaSHome = lazy(() => import("./pages/SaaS/SaaSHome"));
const PlansPage = lazy(() => import("./pages/SaaS/PlansPage"));
import SaaSNavbar from "./pages/SaaS/SaaSNavbar";
import SaaSFooter from "./pages/SaaS/SaaSFooter";
const RegistrationFlow = lazy(() => import("./pages/Registration/RegistrationFlow"));
const RegistrationSuccess = lazy(() => import("./pages/Registration/RegistrationSuccess"));
const ContactPage = lazy(() => import("./pages/SaaS/ContactPage"));
const SaaSFAQPage = lazy(() => import("./pages/SaaS/FAQPage"));
const GetStarted = lazy(() => import("./pages/SaaS/GetStarted"));
const PrivacyPage = lazy(() => import("./pages/SaaS/LegalPage").then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import("./pages/SaaS/LegalPage").then((m) => ({ default: m.TermsPage })));

// Super Admin
const SuperAdminLayout = lazy(() => import("./SuperAdmin/Layout"));
const SADashboard = lazy(() => import("./SuperAdmin/Screens/Dashboard"));
const Organisations = lazy(() => import("./SuperAdmin/Screens/Organisations"));
const OrganisationDetail = lazy(() => import("./SuperAdmin/Screens/OrganisationDetail"));
const Plans = lazy(() => import("./SuperAdmin/Screens/Plans"));
const PlanEditor = lazy(() => import("./SuperAdmin/Screens/PlanEditor"));
const Features = lazy(() => import("./SuperAdmin/Screens/Features"));
const Tickets = lazy(() => import("./SuperAdmin/Screens/Tickets"));
const TicketDetail = lazy(() => import("./SuperAdmin/Screens/TicketDetail"));
const KanbanBoard = lazy(() => import("./SuperAdmin/Screens/KanbanBoard"));
const Billing = lazy(() => import("./SuperAdmin/Screens/Billing"));
const Invoices = lazy(() => import("./SuperAdmin/Screens/Invoices"));
const Coupons = lazy(() => import("./SuperAdmin/Screens/Coupons"));
const BrandingRequests = lazy(() => import("./SuperAdmin/Screens/BrandingRequests"));
const ContactQueries = lazy(() => import("./SuperAdmin/Screens/ContactQueries"));
const Leads = lazy(() => import("./SuperAdmin/Screens/Leads"));
const LeadDetail = lazy(() => import("./SuperAdmin/Screens/LeadDetail"));
const LeadConvert = lazy(() => import("./SuperAdmin/Screens/LeadConvert"));
const SASettings = lazy(() => import("./SuperAdmin/Screens/Settings"));
const PlatformSettings = lazy(() => import("./SuperAdmin/Screens/PlatformSettings"));
const SupportSessions = lazy(() => import("./SuperAdmin/Screens/SupportSessions"));
const SupportSessionDetail = lazy(() => import("./SuperAdmin/Screens/SupportSessionDetail"));
const AuditLog = lazy(() => import("./SuperAdmin/Screens/AuditLog"));
const TeamUsers = lazy(() => import("./SuperAdmin/Screens/TeamUsers"));
const MfaSetupRequired = lazy(() => import("./SuperAdmin/Screens/MfaSetupRequired"));
const SAEmailTemplates = lazy(() => import("./SuperAdmin/Screens/EmailTemplates"));
const SAEmailTemplateEdit = lazy(() => import("./SuperAdmin/Screens/EmailTemplateEdit"));
const SAEmailSend = lazy(() => import("./SuperAdmin/Screens/EmailSend"));
const AcceptInvite = lazy(() => import("./pages/AdminLogin/AcceptInvite"));
const SAForgotPassword = lazy(() => import("./pages/AdminLogin/ForgotPassword"));
import SupportSessionBanner from "./Admin/components/SupportSessionBanner";
import ProtectedSuperAdminRoute from "./components/ProtectedSuperAdminRoute";
import TenantLoader from "./components/TenantLoader";
import { onAuthGround, GROUND_GRADIENT } from "./utils/authTransition";
import { onColor, gradientStop } from "./utils/contrast";

import { Toaster } from "react-hot-toast";


// Shown while a lazily-loaded route chunk is downloading. Deliberately plain
// (no framer/lucide) so it can't pull anything extra into the entry chunk.
const RouteFallback = () => {
  // On the console's dark pre-auth pages this fallback IS the whole screen --
  // it is what shows between the document painting and the lazy /login chunk
  // arriving, which is most of what a full-page sign-out looks like. A
  // light-grey ring floating a third of the way down a near-black page was the
  // flash people saw; on the ground colour, full height, it reads as the page
  // still settling rather than as a different screen.
  const onGround = onAuthGround();
  return (
    <div
      className={`flex items-center justify-center ${onGround ? "min-h-screen" : "min-h-[60vh]"}`}
      style={onGround ? { background: GROUND_GRADIENT } : undefined}
    >
      <span
        className="h-7 w-7 animate-spin rounded-full"
        style={{
          borderWidth: 2,
          borderStyle: "solid",
          borderColor: onGround ? "rgba(255,255,255,.12)" : "#e5e7eb",
          borderTopColor: onGround ? "#34d399" : "var(--tenant-accent, #047857)",
        }}
        role="status"
        aria-label="Loading"
      />
    </div>
  );
};

// Redirect to Home if a CMS-managed page has been disabled by the tenant.
// Paths not managed by the CMS always render (isPathEnabled returns true).
const PageGate = ({ path, children }) => {
  const { isPathEnabled } = useTenant();
  // In the admin live-preview iframe (?preview=1), always render — even disabled
  // pages — so the editor can preview them.
  const isPreview = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "1";
  if (!isPreview && !isPathEnabled(path)) return <Navigate to="/" replace />;
  return children;
};

// ============================================================
// TENANT ROUTES — existing charity portal (runs on org subdomains)
// ============================================================
const TenantRoutes = () => (
  <Routes>
    {/* Public Routes */}
    <Route path="/" element={<Home />} />
    <Route path="/donate" element={<PageGate path="/donate"><DonatePage /></PageGate>} />
    <Route path="/ramadans" element={<Home />} />
    <Route path="/login" element={<Login />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password/:token" element={<ResetPassword />} />
    <Route path="/change-password" element={<ChangePassword />} />
    <Route path="/signup" element={<SignUp />} />
    <Route path="/our-partners" element={<PageGate path="/our-partners"><PartnersSection /></PageGate>} />
    <Route path="/become-a-partner" element={<BecomePartner />} />
    <Route path="/initiatives" element={<PageGate path="/initiatives"><InitiativesSection /></PageGate>} />
    <Route path="/get-involved" element={<PageGate path="/get-involved"><GetInvolved /></PageGate>} />
    <Route path="/initiative-1" element={<PageGate path="/initiative-1"><EducationInitiatives /></PageGate>} />
    <Route path="/initiative-2" element={<PageGate path="/initiative-2"><WaterInitiatives /></PageGate>} />
    <Route path="/initiative-3" element={<PageGate path="/initiative-3"><FoodInitiatives /></PageGate>} />
    <Route path="/initiative-4" element={<PageGate path="/initiative-4"><EmergenciesInitiatives /></PageGate>} />
    <Route path="/giving" element={<PageGate path="/giving"><IslamicGiving /></PageGate>} />
    <Route path="/zakat/calculator" element={<PageGate path="/zakat/calculator"><ZakatCalculator /></PageGate>} />
    <Route path="/Ramadan" element={<PageGate path="/Ramadan"><RamadanDonations /></PageGate>} />
    <Route path="/about" element={<PageGate path="/about"><AboutSection /></PageGate>} />
    <Route path="/about-us" element={<PageGate path="/about-us"><AboutUsPage /></PageGate>} />
    <Route path="/team-hope" element={<PageGate path="/team-hope"><Hope /></PageGate>} />
    <Route path="/events" element={<PageGate path="/events"><Events /></PageGate>} />
    <Route path="/events/:id" element={<EventDetailPage />} />
    <Route path="/events/:id/register" element={<EventRegisterPage />} />
    <Route path="/contact-us" element={<PageGate path="/contact-us"><Contact /></PageGate>} />
    <Route path="/faq" element={<PageGate path="/faq"><FAQPage /></PageGate>} />
    <Route path="/p2p-campaigns" element={<PageGate path="/p2p-campaigns"><CampaignsPage /></PageGate>} />
    <Route path="/p2p-campaigns/start" element={<ProtectedRoute><StartFundraiser /></ProtectedRoute>} />
    <Route path="/p2p-campaigns/:slug" element={<CampaignDetail />} />
    <Route path="/p2p-campaigns/:slug/donate" element={<GoFundMeDonate />} />
    <Route path="/checkout" element={<UnifiedCheckout />} />
    <Route path="/order-confirmation" element={<OrderConfirmation />} />
    <Route path="/programs" element={<PageGate path="/programs"><ProgramsPage /></PageGate>} />
    <Route path="/programs/:id" element={<ProgramDetailPage />} />
    <Route path="/program-checkout" element={<ProgramCheckout />} />
    <Route path="/unsubscribe" element={<Unsubscribe />} />

    {/* Platform-support impersonation handoff (token arrives via URL hash) */}
    <Route path="/support-handoff" element={<SupportHandoff />} />

    {/* Public support: submission form + post-resolution satisfaction rating */}
    <Route path="/support/new" element={<SupportForm />} />
    <Route path="/support/feedback/:id" element={<SupportFeedback />} />

    {/* Admin Routes */}
    <Route path="/admin/login" element={<AdminLogin />} />
    <Route path="/admin" element={<AdminLayout />}>
      <Route path="dashboard" element={<AdminDashboard />} />
      <Route path="donations" element={<DonationsPage />} />
      <Route path="donations/:id" element={<DonationDetail />} />
      <Route path="donation-types" element={<DonationTypes />} />
      <Route path="donors" element={<DonorsPage />} />
      <Route path="donors/:id" element={<DonorDetail />} />
      <Route path="subscriptions" element={<SubscriptionsPage />} />
      <Route path="subscriptions/:id" element={<SubscriptionDetail />} />
      <Route path="installments" element={<AdminInstallments />} />
      <Route path="installments/:id" element={<InstallmentDetail />} />
      <Route path="events/*" element={<EventsManagement />} />
      <Route path="event-payments" element={<EventPaymentsPage />} />
      <Route path="campaign-payments" element={<CampaignPaymentsPage />} />
      <Route path="program-payments" element={<ProgramPaymentsPage />} />
      <Route path="volunteers" element={<JoinTeamAdmin />} />
      <Route path="volunteers/:id" element={<VolunteerProfile />} />
      <Route path="contacts" element={<ContactRequestsAdmin />} />
      <Route path="support" element={<SupportTickets />} />
      <Route path="partners" element={<PartnersAdmin />} />
      <Route path="newsletter" element={<NewsletterScreen />} />
      <Route path="profile" element={<ProfileSetting />} />
      <Route
        path="cancellation-requests"
        element={<CancellationRequests />}
      />
      <Route path="products/*" element={<ProductsManagement />} />
      <Route path="programs" element={<AdminPrograms />} />
      <Route path="p2p-campaigns" element={<GoFundMeAdmin />} />
      <Route path="pages" element={<AdminPages />} />
      {/* Payments moved into Organisation Settings → Payments tab */}
      <Route path="payments" element={<Navigate to="/admin/settings?tab=payments" replace />} />
      <Route path="branding" element={<BrandingScreen />} />
      <Route path="design" element={<AdminDesign />} />
      <Route path="settings" element={<OrganisationSettings />} />
    </Route>

    {/* User Routes */}
    <Route
      path="/user"
      element={
        <ProtectedRoute>
          <UserLayout />
        </ProtectedRoute>
      }
    >
      <Route path="donations" element={<UserDonations />} />
      <Route path="payments" element={<UserPayments />} />
      <Route path="fundraisers" element={<MyFundraisers />} />
      <Route path="programs" element={<MyPrograms />} />
      <Route path="support" element={<UserSupport />} />
      <Route path="dashboard" element={<UserDashboard />} />
      {/* Unified subscriptions page (Active / Past tabs). Old split routes redirect in. */}
      <Route path="subscriptions" element={<Subscriptions />} />
      <Route path="subscriptions/active" element={<Navigate to="/user/subscriptions" replace />} />
      <Route path="subscriptions/previous" element={<Navigate to="/user/subscriptions?tab=past" replace />} />
      <Route path="settings/payment" element={<PaymentMethods />} />
      <Route path="settings/profile" element={<ProfileSettings />} />
    </Route>
  </Routes>
);

// ============================================================
// PUBLIC SAAS ROUTES — marketing site (runs on bare domain)
// ============================================================
const PublicSaaSRoutes = () => (
  <Routes>
    <Route path="/" element={<SaaSHome />} />
    <Route path="/plans" element={<PlansPage />} />
    <Route path="/register" element={<RegistrationFlow />} />
    <Route path="/register/success" element={<RegistrationSuccess />} />
    <Route path="/get-started" element={<GetStarted />} />
    <Route path="/contact" element={<ContactPage />} />
    <Route path="/faq" element={<SaaSFAQPage />} />
    <Route path="/privacy" element={<PrivacyPage />} />
    <Route path="/terms" element={<TermsPage />} />
    <Route path="/login" element={<Login />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password/:token" element={<ResetPassword />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

// ============================================================
// SUPER ADMIN ROUTES — platform management (runs on admin.*)
// ============================================================
const SuperAdminRoutes = () => (
  <Routes>
    <Route path="/login" element={<AdminLogin />} />
    <Route path="/accept-invite/:token" element={<AcceptInvite />} />
    <Route path="/forgot-password" element={<SAForgotPassword />} />
    {/* Full-bleed, no sidebar/topbar — same escape-the-chrome treatment as
        /register, since converting a lead is a focused, register-like task. */}
    <Route
      path="/leads/:id/convert"
      element={
        <ProtectedSuperAdminRoute>
          <LeadConvert />
        </ProtectedSuperAdminRoute>
      }
    />
    <Route
      path="/"
      element={
        <ProtectedSuperAdminRoute>
          <SuperAdminLayout />
        </ProtectedSuperAdminRoute>
      }
    >
      <Route path="mfa-setup" element={<MfaSetupRequired />} />
      <Route path="team" element={<TeamUsers />} />
      <Route path="dashboard" element={<SADashboard />} />
      <Route path="organisations" element={<Organisations />} />
      <Route path="organisations/:id" element={<OrganisationDetail />} />
      <Route path="plans" element={<Plans />} />
      <Route path="plans/new" element={<PlanEditor />} />
      <Route path="plans/:code/edit" element={<PlanEditor />} />
      <Route path="features" element={<Features />} />
      <Route path="tickets" element={<Tickets />} />
      <Route path="tickets/:id" element={<TicketDetail />} />
      <Route path="kanban" element={<KanbanBoard />} />
      <Route path="billing" element={<Billing />} />
      <Route path="invoices" element={<Invoices />} />
      <Route path="coupons" element={<Coupons />} />
      <Route path="branding-requests" element={<BrandingRequests />} />
      <Route path="contact-queries" element={<ContactQueries />} />
      <Route path="leads" element={<Leads />} />
      <Route path="leads/:id" element={<LeadDetail />} />
      <Route path="support-sessions" element={<SupportSessions />} />
      <Route path="support-sessions/:sessionId" element={<SupportSessionDetail />} />
      <Route path="audit" element={<AuditLog />} />
      <Route path="emails" element={<SAEmailTemplates />} />
      {/* Sending one by hand. Both are ahead of "/emails/:key" — a static
          segment outranks a dynamic one, and catalogue keys are dotted, so
          neither can ever be read as a template. */}
      <Route path="emails/compose" element={<SAEmailSend />} />
      <Route path="emails/send/:key" element={<SAEmailSend />} />
      {/* Encoded so a dotted key like "donation.receipt" survives the URL. */}
      <Route path="emails/:key" element={<SAEmailTemplateEdit />} />
      <Route path="platform" element={<PlatformSettings />} />
      <Route path="settings" element={<SASettings />} />
      <Route path="profile" element={<SASettings />} />
      <Route index element={<Navigate to="dashboard" replace />} />
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

// ============================================================
// APP LAYOUT — conditional navbar/footer based on tenant mode
// ============================================================
// Shared state for loader completion — prevents footer flash
const LoaderContext = React.createContext({ loaderDone: true });

// Platform marketing-site brand, expressed through the shared design tokens so
// the SaaS site (navbar, cards, forms, footer) themes consistently — emerald +
// amber identity, rounded edges, modern Outfit type. The data-public-site scope
// (see index.css) applies the shape tokens to every border/shadow/input/button.
// Scoped to the public branch ONLY — tenant/admin/superadmin are untouched.
const PLATFORM_VARS = {
  "--tenant-primary": "#102A23",
  "--tenant-primary-light": "#1C453A",
  "--tenant-primary-rgb": "16, 42, 35",
  "--tenant-accent": "#047857",
  "--tenant-accent-light": "#059669",
  "--tenant-accent-rgb": "4, 120, 87",
  "--tenant-accent-contrast": "#FFFFFF", // emerald is dark → white labels read fine
  "--tenant-accent-grad": "#047857",
  "--tenant-bg": "#F3F8F5",
  "--tenant-bg-rgb": "243, 248, 245",
  "--tenant-sidebar-top": "#0D241E",
  "--tenant-sidebar-bottom": "#081712",
  "--pf-accent-2": "#065F46",
  "--pf-gold": "#F59E0B",
  "--pf-gold-soft": "#FEF3C7",
  // Shape for the whole marketing site, navbar and footer included. The
  // illustrated redesign runs fully round with pill controls; these tokens are
  // what carry that into every legacy button, input and card via the
  // [data-public-site] rules in index.css.
  "--radius-card": "24px",
  "--radius-btn": "9999px",
  "--radius-input": "14px",
  "--radius-pill": "9999px",
  "--border-width": "1px",
  "--card-shadow": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  "--font-heading":
    '"Outfit", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  "--font-body":
    '"Outfit", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  "--font-nav":
    '"Outfit", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

// hex → "r, g, b"; positive percent darkens, negative lightens (mirrors TenantContext).
const _hexToRgb = (hex) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || ""));
  return m ? `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}` : "0, 0, 0";
};
const _shiftHex = (hex, percent) => {
  const num = parseInt(String(hex || "").replace("#", ""), 16);
  if (Number.isNaN(num)) return hex;
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max((num >> 16) - amt, 0));
  const G = Math.min(255, Math.max(((num >> 8) & 0x00ff) - amt, 0));
  const B = Math.min(255, Math.max((num & 0x0000ff) - amt, 0));
  return "#" + ((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1);
};

// Merge the DB-driven platform brand colours (from SuperAdmin → Platform) over
// the static PLATFORM_VARS defaults, deriving the sidebar/light/rgb variants the
// same way TenantContext does — so editing the platform branding recolours the
// whole marketing site. Falls back to the emerald defaults until settings load.
function buildPlatformVars(platform) {
  if (!platform || !platform.primaryColor || !platform.accentColor || !platform.backgroundColor) {
    return PLATFORM_VARS;
  }
  const pr = platform.primaryColor;
  const ac = platform.accentColor;
  const bg = platform.backgroundColor;
  return {
    ...PLATFORM_VARS,
    "--tenant-primary": pr,
    "--tenant-primary-light": _shiftHex(pr, -15),
    "--tenant-primary-rgb": _hexToRgb(pr),
    "--tenant-accent": ac,
    "--tenant-accent-light": _shiftHex(ac, -15),
    "--tenant-accent-rgb": _hexToRgb(ac),
    "--tenant-accent-contrast": onColor(ac, pr),
    "--tenant-accent-grad": gradientStop(ac, _shiftHex(pr, -15)),
    "--tenant-bg": bg,
    "--tenant-bg-rgb": _hexToRgb(bg),
    "--tenant-sidebar-top": _shiftHex(pr, 10),
    "--tenant-sidebar-bottom": _shiftHex(pr, 20),
    "--pf-accent-2": _shiftHex(ac, 12),
  };
}

const AppLayout = ({ children }) => {
  const location = useLocation();
  const { tenantMode, loading, platform } = useTenant();
  const { loaderDone } = React.useContext(LoaderContext);

  // SuperAdmin routes handle their own layout
  if (tenantMode === "superadmin") {
    return children;
  }

  // Support handoff is a transient redirect screen — render it bare (no chrome).
  if (location.pathname === "/support-handoff") {
    return children;
  }

  // While tenant loader is active, don't render layout chrome
  if (tenantMode === "tenant" && !loaderDone) {
    return children;
  }

  const isAdminRoute = location.pathname.startsWith("/admin");
  const isUserRoute = location.pathname.startsWith("/user");

  if (isAdminRoute || isUserRoute) {
    return children;
  }

  // /get-started (the "express interest" lead form) shares the same standalone
  // brand-panel shell as /register — same treatment, same layout family.
  const isRegister =
    location.pathname.startsWith("/register") || location.pathname.startsWith("/get-started");
  const isAuth =
    [
      "/login",
      "/signup",
      "/forgot-password",
      "/change-password",
      "/admin/login",
    ].includes(location.pathname) ||
    location.pathname.startsWith("/reset-password");
  // Note: /program-checkout and /checkout have their own themed hero region
  // (data-hero), so they must NOT get the spacer — the themed background sits
  // under the transparent navbar and the bar collapses on scroll.
  const needsSpacer = ["/order-confirmation"].includes(location.pathname);

  // Register / Get started: both flows get the platform theme tokens (so
  // they're dynamic) but keep their own brand-panel layout (no marketing
  // nav, no footer/CTA — meant to stand alone with nothing pulling focus away).
  if (isRegister) {
    return (
      <div data-public-site data-saas-site style={buildPlatformVars(platform)}>
        {children}
      </div>
    );
  }

  if (isAuth) {
    return <>{children}</>;
  }

  // Public SaaS mode gets SaaS navbar/footer. The data-public-site wrapper +
  // PLATFORM_VARS scope the platform brand and design-shape tokens to the
  // marketing site so its navbar, cards, forms and footer theme consistently.
  //
  // data-saas-site is the narrower of the two markers and exists because
  // data-public-site does NOT identify this site — tenant mode below sets it
  // too. It is what the "no hard corners" floor in index.css keys off, and it
  // sits out here rather than on the page so it also covers the navbar, the
  // footer and /register/success, none of which are inside a .saas-page.
  if (tenantMode === "public") {
    return (
      <div data-public-site data-saas-site style={buildPlatformVars(platform)}>
        <SaaSNavbar />
        {children}
        <SaaSFooter />
        <BackToTop />
      </div>
    );
  }

  // Tenant mode gets the original charity navbar/footer. The data-public-site
  // wrapper scopes the per-tenant design shape CSS (corners/borders/shadows) to
  // the public site only — the admin + donor portals are never affected.
  return (
    <div data-public-site>
      <Navbar />
      <Cart />
      {needsSpacer && <div className="h-16" />}
      {children}
      <Footer />
      <BackToTop />
    </div>
  );
};

// ============================================================
// ROUTE SELECTOR — picks route set based on tenant mode
// ============================================================
const RouteSelector = ({ loaderDone, setLoaderDone }) => {
  const { tenantMode, slug, loading, error, branding } = useTenant();

  // Platform-support impersonation handoff: must run on ANY surface, BEFORE the
  // tenant-mode gating or the loader can route us to the public site instead.
  // It decodes the token, stores the session and self-redirects to the chosen
  // surface (admin portal or public website).
  if (typeof window !== "undefined" && window.location.pathname === "/support-handoff") {
    return <SupportHandoff />;
  }

  // For tenant mode: show loader while fetching, then play exit animation
  if (tenantMode === "tenant" && !loaderDone) {
    return (
      <TenantLoader
        slug={slug}
        ready={!loading}
        branding={branding}
        onComplete={() => setLoaderDone(true)}
      />
    );
  }

  if (tenantMode === "tenant" && error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-heading font-bold text-primary mb-2">
            Organisation Not Found
          </h1>
          <p className="text-text-muted">
            The organisation you're looking for doesn't exist or is inactive.
          </p>
        </div>
      </div>
    );
  }

  switch (tenantMode) {
    case "public":
      return <PublicSaaSRoutes />;
    case "superadmin":
      return <SuperAdminRoutes />;
    case "tenant":
      return <TenantRoutes />;
    default:
      return <PublicSaaSRoutes />;
  }
};

// ============================================================
// MAIN APP
// ============================================================
function AppInner() {
  const [loaderDone, setLoaderDone] = React.useState(false);

  return (
    <LoaderContext.Provider value={{ loaderDone }}>
      <ScrollToTop />
      {/* Platform-support impersonation banner — self-hides unless a support
          session is active; rendered once here so it shows on the public site,
          the admin portal and the donor portal alike. */}
      <SupportSessionBanner />
      <Toaster
        position="top-right"
        gutter={10}
        toastOptions={{
          duration: 3000,
          // Clean surface card with a thin status accent-bar on the left and a
          // coloured status icon (Sonner/Linear style). The default/info bar
          // follows the tenant accent; success/error keep the universal colours.
          style: {
            background: "#ffffff",
            color: "#1f2937",
            borderRadius: "12px",
            borderLeft: "4px solid var(--tenant-accent, #C9A84C)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06)",
            padding: "12px 16px",
            fontSize: "14px",
            fontWeight: 500,
            maxWidth: "400px",
          },
          success: {
            iconTheme: { primary: "#16a34a", secondary: "#ffffff" },
            style: { borderLeft: "4px solid #16a34a" },
          },
          error: {
            iconTheme: { primary: "#ef4444", secondary: "#ffffff" },
            style: { borderLeft: "4px solid #ef4444" },
          },
          loading: {
            iconTheme: { primary: "var(--tenant-accent, #C9A84C)", secondary: "#ffffff" },
            style: { borderLeft: "4px solid var(--tenant-accent, #C9A84C)" },
          },
        }}
      />
      <AppLayout>
        <div className="">
          <div className="mx-auto">
            <PageTransition>
              {/* Route components are code-split (React.lazy) — this boundary
                  covers every tree, so the entry chunk no longer carries the
                  operator console, the tenant admin and the donor portal. */}
              <Suspense fallback={<RouteFallback />}>
                <RouteSelector loaderDone={loaderDone} setLoaderDone={setLoaderDone} />
              </Suspense>
            </PageTransition>
          </div>
        </div>
      </AppLayout>
    </LoaderContext.Provider>
  );
}

function App() {
  return (
    <Router>
      <TenantProvider>
        <AuthProvider>
          <CartProvider>
            <AppInner />
          </CartProvider>
        </AuthProvider>
      </TenantProvider>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </Router>
  );
}

export default App;
