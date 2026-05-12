import React from "react";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import "jspdf-autotable";
import Navbar from "./pages/Components/navbar";
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
import Footer from "./pages/Components/footer";
import { CartProvider } from "./pages/Components/cart";
import Cart from "./pages/Components/cart";
import UnifiedCheckout from "./pages/Components/checkout";
import AdminLayout from "./Admin/Layout";
import AdminDashboard from "./Admin/Screens/dashboard";
import DonationsPage from "./Admin/Screens/donations";
import DonorsPage from "./Admin/Screens/donors";
import SubscriptionsPage from "./Admin/Screens/subscriptions";
import PreviousSubscriptions from "./User/Screens/previousSubs";
import EventsPage from "./Admin/Screens/events";
import UserLayout from "./User/UserLayout";
import UserDonations from "./User/Screens/donations";
import ActiveSubscriptions from "./User/Screens/activeSubs";
import PaymentMethods from "./User/Screens/payments";
import ProfileSettings from "./User/Screens/profile";
import { AuthProvider } from "./context/AuthContext";
import OrderConfirmation from "./pages/Components/OrderConfirmation";
import UserDashboard from "./User/Screens/dashboard";
import AdminLogin from "./pages/AdminLogin/login";
import ForgotPassword from "./pages/Login/forgot-password";
import ResetPassword from "./pages/Login/reset-password";
import JoinTeamAdmin from "./Admin/Screens/joinTeam";
import ContactRequestsAdmin from "./Admin/Screens/contacts";
import ProductsManagement from "./Admin/Screens/Products";
import NewsletterScreen from "./Admin/Screens/newsletter";
import CancellationRequests from "./Admin/Screens/CancellationRequests";
import ProfileSetting from "./Admin/Screens/AdminProfile";
import AdminInstallments from "./Admin/Screens/installments";
import DonationTypes from "./Admin/Screens/DonationTypes";

import DonatePage from "./pages/Donate/page";
import { Toaster } from "react-hot-toast";
import ProtectedRoute from "./components/ProtectedRoute";

const P2PCampaigns = () => <div className="p-8">P2P Campaigns Page</div>;

// Wrapper component to handle layout
const AppLayout = ({ children }) => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isUserRoute = location.pathname.startsWith("/user");
  const [activeOption, setActiveOption] = React.useState("");

  if (isAdminRoute || isUserRoute) {
    return children;
  }

  const isAuth = ["/login", "/signup", "/forgot-password", "/change-password", "/admin/login"].includes(location.pathname) || location.pathname.startsWith("/reset-password");
  const needsSpacer = ["/checkout", "/order-confirmation"].includes(location.pathname);

  if (isAuth) {
    return <>{children}</>;
  }

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

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          {/* PasswordChangeRequiredCheck removed in favor of ProtectedRoute */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 2000,
              style: {
                background: "#333",
                color: "#fff",
              },
              success: {
                style: {
                  background: "#22c55e",
                },
              },
              error: {
                style: {
                  background: "#ef4444",
                },
              },
            }}
          />
          <AppLayout>
            <div className="">
              <div className="mx-auto">
                <Routes>
                  {/* Public Routes */}

                  <Route path="/" element={<Home />} />
                  <Route path="/donate" element={<DonatePage />} />
                  <Route path="/ramadans" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route
                    path="/reset-password/:token"
                    element={<ResetPassword />}
                  />
                  <Route path="/change-password" element={<ChangePassword />} />
                  <Route path="/signup" element={<SignUp />} />
                  <Route path="/our-partners" element={<PartnersSection />} />
                  <Route path="/initiatives" element={<InitiativesSection />} />
                  <Route
                    path="/initiative-1"
                    element={<EducationInitiatives />}
                  />
                  <Route path="/initiative-2" element={<WaterInitiatives />} />
                  <Route path="/initiative-3" element={<FoodInitiatives />} />
                  <Route
                    path="/initiative-4"
                    element={<EmergenciesInitiatives />}
                  />
                  <Route path="/giving" element={<IslamicGiving />} />
                  <Route
                    path="/zakat/calculator"
                    element={<ZakatCalculator />}
                  />
                  <Route
                    path="/Ramadan"
                    element={<RamadanDonations />}
                  />
                  <Route path="/about" element={<AboutSection />} />
                  <Route path="/about-us" element={<AboutUsPage />} />
                  <Route path="/team-hope" element={<Hope />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/contact-us" element={<Contact />} />
                  <Route path="/p2p-campaigns" element={<P2PCampaigns />} />
                  <Route path="/checkout" element={<UnifiedCheckout />} />
                  <Route
                    path="/order-confirmation"
                    element={<OrderConfirmation />}
                  />

                  {/* Admin Routes */}
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="donations" element={<DonationsPage />} />
                    <Route path="donation-types" element={<DonationTypes />} />
                    <Route path="donors" element={<DonorsPage />} />
                    <Route
                      path="subscriptions"
                      element={<SubscriptionsPage />}
                    />
                    <Route path="installments" element={<AdminInstallments />} />
                    <Route path="events" element={<EventsPage />} />
                    <Route path="volunteers" element={<JoinTeamAdmin />} />
                    <Route path="contacts" element={<ContactRequestsAdmin />} />
                    <Route path="newsletter" element={<NewsletterScreen />} />
                    <Route path="profile" element={<ProfileSetting/>}/>
                    <Route path="cancellation-requests" element={<CancellationRequests />}/>
                    <Route path="products/*" element={<ProductsManagement />} />
                  </Route>

                  <Route path="/user" element={<ProtectedRoute><UserLayout /></ProtectedRoute>}>
                    <Route path="donations" element={<UserDonations />} />
                    <Route
                      path="subscriptions/active"
                      element={<ActiveSubscriptions />}
                    />
                    <Route path="dashboard" element={<UserDashboard />} />
                    <Route
                      path="subscriptions/previous"
                      element={<PreviousSubscriptions />}
                    />
                    <Route
                      path="settings/payment"
                      element={<PaymentMethods />}
                    />
                    <Route
                      path="settings/profile"
                      element={<ProfileSettings />}
                    />
                  </Route>
                </Routes>
              </div>
            </div>
          </AppLayout>
        </CartProvider>
      </AuthProvider>
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
};

export default App;
