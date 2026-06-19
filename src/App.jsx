import React from "react";
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
import Login from "./pages/Login/page";
import SignUp from "./pages/Signup/page";
import ChangePassword from "./pages/Login/change-password";
import InitiativesSection from "./pages/Initiatives/page";
import GetInvolved from "./pages/GetInvolved/page";
import Events from "./pages/Events/page";
import EventDetailPage from "./pages/Events/EventDetail";
import EventRegisterPage from "./pages/Events/EventRegister";
import IslamicGiving from "./pages/IslamicGivings/page";
import ZakatCalculator from "./pages/ZakatCalculator/page";
import RamadanDonations from "./pages/Home/RamdanDonations/page";
import AboutSection from "./pages/About/page";
import PartnersSection from "./pages/OurPartners/page";
import BecomePartner from "./pages/OurPartners/BecomePartner";
import AboutUsPage from "./pages/About/page2";
import EducationInitiatives from "./pages/EducationInitiatives/page";
import EmergenciesInitiatives from "./pages/Emergencies/page";
import WaterInitiatives from "./pages/Water/page";
import FoodInitiatives from "./pages/Food/page";
import UnifiedCheckout from "./pages/Components/checkout";
import OrderConfirmation from "./pages/Components/OrderConfirmation";
import DonatePage from "./pages/Donate/page";
import ForgotPassword from "./pages/Login/forgot-password";
import ResetPassword from "./pages/Login/reset-password";

// Admin
import AdminLayout from "./Admin/Layout";
import AdminDashboard from "./Admin/Screens/dashboard";
import DonationsPage from "./Admin/Screens/donations";
import DonationDetail from "./Admin/Screens/DonationDetail";
import DonorsPage from "./Admin/Screens/donors";
import DonorDetail from "./Admin/Screens/DonorDetail";
import SubscriptionsPage from "./Admin/Screens/subscriptions";
import SubscriptionDetail from "./Admin/Screens/SubscriptionDetail";
import EventsManagement from "./Admin/Screens/Events";
import EventPaymentsPage from "./Admin/Screens/EventPayments";
import CampaignPaymentsPage from "./Admin/Screens/CampaignPayments";
import ProgramPaymentsPage from "./Admin/Screens/ProgramPayments";
import AdminLogin from "./pages/AdminLogin/login";
import SupportHandoff from "./pages/SupportHandoff";
import SupportForm from "./pages/SupportForm";
import SupportFeedback from "./pages/SupportFeedback";
import Unsubscribe from "./pages/Unsubscribe";
import JoinTeamAdmin from "./Admin/Screens/joinTeam";
import PartnersAdmin from "./Admin/Screens/Partners";
import VolunteerProfile from "./Admin/Screens/VolunteerProfile";
import ContactRequestsAdmin from "./Admin/Screens/contacts";
import ProductsManagement from "./Admin/Screens/Products";
import NewsletterScreen from "./Admin/Screens/newsletter";
import CancellationRequests from "./Admin/Screens/CancellationRequests";
import ProfileSetting from "./Admin/Screens/AdminProfile";
import AdminInstallments from "./Admin/Screens/installments";
import InstallmentDetail from "./Admin/Screens/InstallmentDetail";
import DonationTypes from "./Admin/Screens/DonationTypes";
import BrandingScreen from "./Admin/Screens/Branding";
import AdminDesign from "./Admin/Screens/Design";
import OrganisationSettings from "./Admin/Screens/OrganisationSettings";
import AdminPages from "./Admin/Screens/Pages";
import SupportTickets from "./Admin/Screens/SupportTickets";

// User
import UserLayout from "./User/UserLayout";
import UserDonations from "./User/Screens/donations";
import UserPayments from "./User/Screens/UserPayments";
import MyFundraisers from "./User/Screens/MyFundraisers";
import Subscriptions from "./User/Screens/Subscriptions";
import PaymentMethods from "./User/Screens/payments";
import ProfileSettings from "./User/Screens/profile";
import UserDashboard from "./User/Screens/dashboard";
import MyPrograms from "./User/Screens/MyPrograms";
import UserSupport from "./User/Screens/Support";
import ProtectedRoute from "./components/ProtectedRoute";

// Program pages
import ProgramsPage from "./pages/Programs/ProgramsPage";
import ProgramDetailPage from "./pages/Programs/ProgramDetail";
import ProgramCheckout from "./pages/Programs/ProgramCheckout";
import AdminPrograms from "./Admin/Screens/Programs";
import CampaignsPage from "./pages/P2PCampaigns/CampaignsPage";
import CampaignDetail from "./pages/P2PCampaigns/CampaignDetail";
import GoFundMeDonate from "./pages/P2PCampaigns/GoFundMeDonate";
import StartFundraiser from "./pages/P2PCampaigns/StartFundraiser";
import GoFundMeAdmin from "./Admin/Screens/GoFundMe";

// SaaS pages
import SaaSHome from "./pages/SaaS/SaaSHome";
import PlansPage from "./pages/SaaS/PlansPage";
import SaaSNavbar from "./pages/SaaS/SaaSNavbar";
import SaaSFooter from "./pages/SaaS/SaaSFooter";
import RegistrationFlow from "./pages/Registration/RegistrationFlow";
import RegistrationSuccess from "./pages/Registration/RegistrationSuccess";
import ContactPage from "./pages/SaaS/ContactPage";
import { PrivacyPage, TermsPage } from "./pages/SaaS/LegalPage";

// Super Admin
import SuperAdminLayout from "./SuperAdmin/Layout";
import SADashboard from "./SuperAdmin/Screens/Dashboard";
import Organisations from "./SuperAdmin/Screens/Organisations";
import OrganisationDetail from "./SuperAdmin/Screens/OrganisationDetail";
import Plans from "./SuperAdmin/Screens/Plans";
import PlanEditor from "./SuperAdmin/Screens/PlanEditor";
import Features from "./SuperAdmin/Screens/Features";
import Tickets from "./SuperAdmin/Screens/Tickets";
import TicketDetail from "./SuperAdmin/Screens/TicketDetail";
import KanbanBoard from "./SuperAdmin/Screens/KanbanBoard";
import Billing from "./SuperAdmin/Screens/Billing";
import Invoices from "./SuperAdmin/Screens/Invoices";
import Coupons from "./SuperAdmin/Screens/Coupons";
import BrandingRequests from "./SuperAdmin/Screens/BrandingRequests";
import ContactQueries from "./SuperAdmin/Screens/ContactQueries";
import SASettings from "./SuperAdmin/Screens/Settings";
import PlatformSettings from "./SuperAdmin/Screens/PlatformSettings";
import SupportSessions from "./SuperAdmin/Screens/SupportSessions";
import SupportSessionDetail from "./SuperAdmin/Screens/SupportSessionDetail";
import AuditLog from "./SuperAdmin/Screens/AuditLog";
import SupportSessionBanner from "./Admin/components/SupportSessionBanner";
import ProtectedSuperAdminRoute from "./components/ProtectedSuperAdminRoute";
import TenantLoader from "./components/TenantLoader";

import { Toaster } from "react-hot-toast";


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
    <Route path="/contact" element={<ContactPage />} />
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
    <Route
      path="/"
      element={
        <ProtectedSuperAdminRoute>
          <SuperAdminLayout />
        </ProtectedSuperAdminRoute>
      }
    >
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
      <Route path="support-sessions" element={<SupportSessions />} />
      <Route path="support-sessions/:sessionId" element={<SupportSessionDetail />} />
      <Route path="audit" element={<AuditLog />} />
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
  "--tenant-bg": "#F3F8F5",
  "--tenant-bg-rgb": "243, 248, 245",
  "--tenant-sidebar-top": "#0D241E",
  "--tenant-sidebar-bottom": "#081712",
  "--pf-accent-2": "#065F46",
  "--pf-gold": "#F59E0B",
  "--pf-gold-soft": "#FEF3C7",
  "--radius-card": "16px",
  "--radius-btn": "10px",
  "--radius-input": "10px",
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

  // While tenant loader is active, don't render layout chrome
  if (tenantMode === "tenant" && !loaderDone) {
    return children;
  }

  const isAdminRoute = location.pathname.startsWith("/admin");
  const isUserRoute = location.pathname.startsWith("/user");

  if (isAdminRoute || isUserRoute) {
    return children;
  }

  const isRegister = location.pathname.startsWith("/register");
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

  // Register: the signup flow gets the platform theme tokens (so it's dynamic)
  // + the shared footer, but keeps its own brand-panel layout (no marketing nav).
  if (isRegister) {
    return (
      <div data-public-site style={buildPlatformVars(platform)}>
        {children}
        <SaaSFooter />
      </div>
    );
  }

  if (isAuth) {
    return <>{children}</>;
  }

  // Public SaaS mode gets SaaS navbar/footer. The data-public-site wrapper +
  // PLATFORM_VARS scope the platform brand and design-shape tokens to the
  // marketing site so its navbar, cards, forms and footer theme consistently.
  if (tenantMode === "public") {
    return (
      <div data-public-site style={buildPlatformVars(platform)}>
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
              <RouteSelector loaderDone={loaderDone} setLoaderDone={setLoaderDone} />
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
