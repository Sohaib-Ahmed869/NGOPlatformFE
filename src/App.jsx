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

// Public pages
import Home from "./pages/Home/Home";
import Hope from "./pages/Hope/page";
import Contact from "./pages/Contact/page";
import Login from "./pages/Login/page";
import SignUp from "./pages/Signup/page";
import ChangePassword from "./pages/Login/change-password";
import InitiativesSection from "./pages/Initiatives/page";
import Events from "./pages/Events/page";
import IslamicGiving from "./pages/IslamicGivings/page";
import ZakatCalculator from "./pages/ZakatCalculator/page";
import RamadanDonations from "./pages/Home/RamdanDonations/page";
import AboutSection from "./pages/About/page";
import PartnersSection from "./pages/OurPartners/page";
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
import DonorsPage from "./Admin/Screens/donors";
import SubscriptionsPage from "./Admin/Screens/subscriptions";
import EventsPage from "./Admin/Screens/events";
import AdminLogin from "./pages/AdminLogin/login";
import JoinTeamAdmin from "./Admin/Screens/joinTeam";
import ContactRequestsAdmin from "./Admin/Screens/contacts";
import ProductsManagement from "./Admin/Screens/Products";
import NewsletterScreen from "./Admin/Screens/newsletter";
import CancellationRequests from "./Admin/Screens/CancellationRequests";
import ProfileSetting from "./Admin/Screens/AdminProfile";
import AdminInstallments from "./Admin/Screens/installments";
import DonationTypes from "./Admin/Screens/DonationTypes";
import BrandingScreen from "./Admin/Screens/Branding";
import OrganisationSettings from "./Admin/Screens/OrganisationSettings";

// User
import UserLayout from "./User/UserLayout";
import UserDonations from "./User/Screens/donations";
import ActiveSubscriptions from "./User/Screens/activeSubs";
import PreviousSubscriptions from "./User/Screens/previousSubs";
import PaymentMethods from "./User/Screens/payments";
import ProfileSettings from "./User/Screens/profile";
import UserDashboard from "./User/Screens/dashboard";
import MyPrograms from "./User/Screens/MyPrograms";
import ProtectedRoute from "./components/ProtectedRoute";

// Program pages
import ProgramsPage from "./pages/Programs/ProgramsPage";
import ProgramDetailPage from "./pages/Programs/ProgramDetail";
import ProgramCheckout from "./pages/Programs/ProgramCheckout";
import AdminPrograms from "./Admin/Screens/Programs";

// SaaS pages
import SaaSHome from "./pages/SaaS/SaaSHome";
import PlansPage from "./pages/SaaS/PlansPage";
import SaaSNavbar from "./pages/SaaS/SaaSNavbar";
import SaaSFooter from "./pages/SaaS/SaaSFooter";
import RegistrationFlow from "./pages/Registration/RegistrationFlow";
import RegistrationSuccess from "./pages/Registration/RegistrationSuccess";
import ContactPage from "./pages/SaaS/ContactPage";

// Super Admin
import SuperAdminLayout from "./SuperAdmin/Layout";
import SADashboard from "./SuperAdmin/Screens/Dashboard";
import Organisations from "./SuperAdmin/Screens/Organisations";
import Billing from "./SuperAdmin/Screens/Billing";
import BrandingRequests from "./SuperAdmin/Screens/BrandingRequests";
import ContactQueries from "./SuperAdmin/Screens/ContactQueries";
import ProtectedSuperAdminRoute from "./components/ProtectedSuperAdminRoute";
import TenantLoader from "./components/TenantLoader";

import { Toaster } from "react-hot-toast";

const P2PCampaigns = () => <div className="p-8">P2P Campaigns Page</div>;

// ============================================================
// TENANT ROUTES — existing charity portal (runs on org subdomains)
// ============================================================
const TenantRoutes = () => (
  <Routes>
    {/* Public Routes */}
    <Route path="/" element={<Home />} />
    <Route path="/donate" element={<DonatePage />} />
    <Route path="/ramadans" element={<Home />} />
    <Route path="/login" element={<Login />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password/:token" element={<ResetPassword />} />
    <Route path="/change-password" element={<ChangePassword />} />
    <Route path="/signup" element={<SignUp />} />
    <Route path="/our-partners" element={<PartnersSection />} />
    <Route path="/initiatives" element={<InitiativesSection />} />
    <Route path="/initiative-1" element={<EducationInitiatives />} />
    <Route path="/initiative-2" element={<WaterInitiatives />} />
    <Route path="/initiative-3" element={<FoodInitiatives />} />
    <Route path="/initiative-4" element={<EmergenciesInitiatives />} />
    <Route path="/giving" element={<IslamicGiving />} />
    <Route path="/zakat/calculator" element={<ZakatCalculator />} />
    <Route path="/Ramadan" element={<RamadanDonations />} />
    <Route path="/about" element={<AboutSection />} />
    <Route path="/about-us" element={<AboutUsPage />} />
    <Route path="/team-hope" element={<Hope />} />
    <Route path="/events" element={<Events />} />
    <Route path="/contact-us" element={<Contact />} />
    <Route path="/p2p-campaigns" element={<P2PCampaigns />} />
    <Route path="/checkout" element={<UnifiedCheckout />} />
    <Route path="/order-confirmation" element={<OrderConfirmation />} />
    <Route path="/programs" element={<ProgramsPage />} />
    <Route path="/programs/:id" element={<ProgramDetailPage />} />
    <Route path="/program-checkout" element={<ProgramCheckout />} />

    {/* Admin Routes */}
    <Route path="/admin/login" element={<AdminLogin />} />
    <Route path="/admin" element={<AdminLayout />}>
      <Route path="dashboard" element={<AdminDashboard />} />
      <Route path="donations" element={<DonationsPage />} />
      <Route path="donation-types" element={<DonationTypes />} />
      <Route path="donors" element={<DonorsPage />} />
      <Route path="subscriptions" element={<SubscriptionsPage />} />
      <Route path="installments" element={<AdminInstallments />} />
      <Route path="events" element={<EventsPage />} />
      <Route path="volunteers" element={<JoinTeamAdmin />} />
      <Route path="contacts" element={<ContactRequestsAdmin />} />
      <Route path="newsletter" element={<NewsletterScreen />} />
      <Route path="profile" element={<ProfileSetting />} />
      <Route
        path="cancellation-requests"
        element={<CancellationRequests />}
      />
      <Route path="products/*" element={<ProductsManagement />} />
      <Route path="programs" element={<AdminPrograms />} />
      <Route path="branding" element={<BrandingScreen />} />
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
      <Route path="programs" element={<MyPrograms />} />
      <Route path="subscriptions/active" element={<ActiveSubscriptions />} />
      <Route path="dashboard" element={<UserDashboard />} />
      <Route
        path="subscriptions/previous"
        element={<PreviousSubscriptions />}
      />
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
      <Route path="billing" element={<Billing />} />
      <Route path="branding-requests" element={<BrandingRequests />} />
      <Route path="contact-queries" element={<ContactQueries />} />
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

const AppLayout = ({ children }) => {
  const location = useLocation();
  const { tenantMode, loading } = useTenant();
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

  const isAuth =
    [
      "/login",
      "/signup",
      "/forgot-password",
      "/change-password",
      "/admin/login",
    ].includes(location.pathname) ||
    location.pathname.startsWith("/reset-password") ||
    location.pathname.startsWith("/register");
  const needsSpacer = ["/checkout", "/order-confirmation", "/program-checkout"].includes(
    location.pathname
  );

  if (isAuth) {
    return <>{children}</>;
  }

  // Public SaaS mode gets SaaS navbar/footer
  if (tenantMode === "public") {
    return (
      <>
        <SaaSNavbar />
        {children}
        <SaaSFooter />
      </>
    );
  }

  // Tenant mode gets the original charity navbar/footer
  return (
    <>
      <Navbar />
      <Cart />
      {needsSpacer && <div className="h-16" />}
      {children}
      <Footer />
    </>
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
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 2000,
          style: { background: "#333", color: "#fff" },
          success: { style: { background: "#22c55e" } },
          error: { style: { background: "#ef4444" } },
        }}
      />
      <AppLayout>
        <div className="">
          <div className="mx-auto">
            <RouteSelector loaderDone={loaderDone} setLoaderDone={setLoaderDone} />
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
