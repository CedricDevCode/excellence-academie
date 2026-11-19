import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AnimatePresence } from "framer-motion";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CartDrawer from "./components/CartDrawer";
import PageTransition from "./components/ui/PageTransition";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastProvider } from "./components/Toast";
import PwaInstallBanner from "./components/PwaInstallBanner";
import PushAutoSubscribe from "./components/PushAutoSubscribe";
import { CookieProvider } from "./components/CookieConsent";
import { trackPageview } from "./utils/analytics";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const StudentLogin = lazy(() => import("./pages/StudentLogin"));
const StudentRegister = lazy(() => import("./pages/StudentRegister"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const AccountantDashboard = lazy(() => import("./pages/AccountantDashboard"));
const SecretaryDashboard = lazy(() => import("./pages/SecretaryDashboard"));
const ParentDashboard = lazy(() => import("./pages/ParentDashboard"));
const CGU = lazy(() => import("./pages/CGU"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PreferencesCookies = lazy(() => import("./pages/PreferencesCookies"));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback"));
const Shop = lazy(() => import("./pages/Shop"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const ShopRegister = lazy(() => import("./pages/ShopRegister"));
const ShopCheckoutCallback = lazy(() => import("./pages/ShopCheckoutCallback"));
const BlogList = lazy(() => import("./pages/BlogList"));
const BlogDetail = lazy(() => import("./pages/BlogDetail"));
const BlogEditor = lazy(() => import("./pages/BlogEditor"));
const BlogSubmissions = lazy(() => import("./pages/BlogSubmissions"));
const Actualites = lazy(() => import("./pages/Actualites"));
const ActualiteDetail = lazy(() => import("./pages/ActualiteDetail"));
const Messages = lazy(() => import("./pages/Messages"));
const Bibliotheque = lazy(() => import("./pages/Bibliotheque"));
const MentionsLegales = lazy(() => import("./pages/MentionsLegales"));
const PolitiqueConfidentialite = lazy(() => import("./pages/PolitiqueConfidentialite"));
const Accessibilite = lazy(() => import("./pages/Accessibilite"));
const CataloguePage = lazy(() => import("./pages/CataloguePage"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-surface-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-surface-500 text-sm font-semibold">Chargement...</p>
      </div>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AnalyticsTracker() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    const timer = window.setTimeout(() => trackPageview(`${pathname}${search}`), 300);
    return () => window.clearTimeout(timer);
  }, [pathname, search]);
  return null;
}

const PRIVATE_PREFIXES = [
  "/admin",
  "/student/",
  "/teacher",
  "/accountant",
  "/secretary",
  "/parent",
  "/cart",
  "/checkout",
  "/my-orders",
  "/messages",
  "/bibliotheque",
  "/blog/new",
  "/blog/edit",
  "/blog/exercises",
  "/shop/register",
  "/shop/payment",
  "/payment",
  "/reset-password",
  "/forgot-password",
];

function RouteMeta() {
  const { pathname } = useLocation();
  const isPrivate = PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix.replace(/\/$/, "") || pathname.startsWith(prefix)
  );
  if (!isPrivate) return null;
  return (
    <Helmet>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
  );
}

function AppRoutes() {
  const location = useLocation();
  const hideNavFooter = [
    "/admin/dashboard",
    "/student/dashboard",
    "/teacher/dashboard",
    "/accountant/dashboard",
    "/secretary/dashboard",
    "/parent/dashboard",
    "/students/new",
    "/student/login",
    "/forgot-password",
    "/reset-password",
  ];
  const shouldHide = hideNavFooter.includes(location.pathname);

  return (
    <>
      {!shouldHide && <Navbar />}
      <AnimatePresence mode="wait">
        <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
            <Route path="/student/login" element={<PageTransition><StudentLogin /></PageTransition>} />
            <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
            <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
            <Route path="/students/new" element={<PageTransition><StudentRegister /></PageTransition>} />
            <Route path="/admin/dashboard" element={<PageTransition><AdminDashboard /></PageTransition>} />
            <Route path="/student/dashboard" element={<PageTransition><StudentDashboard /></PageTransition>} />
            <Route path="/teacher/dashboard" element={<PageTransition><TeacherDashboard /></PageTransition>} />
            <Route path="/accountant/dashboard" element={<PageTransition><AccountantDashboard /></PageTransition>} />
            <Route path="/secretary/dashboard" element={<PageTransition><SecretaryDashboard /></PageTransition>} />
            <Route path="/parent/dashboard" element={<PageTransition><ParentDashboard /></PageTransition>} />
            <Route path="/payment/success" element={<PageTransition><PaymentCallback /></PageTransition>} />
            <Route path="/payment/error" element={<PageTransition><PaymentCallback /></PageTransition>} />
            <Route path="/shop" element={<PageTransition><Shop /></PageTransition>} />
            <Route path="/shop/c/:type" element={<PageTransition><Shop /></PageTransition>} />
            <Route path="/shop/product/:id" element={<PageTransition><ProductDetail /></PageTransition>} />
            <Route path="/cart" element={<PageTransition><CartPage /></PageTransition>} />
            <Route path="/checkout" element={<PageTransition><CheckoutPage /></PageTransition>} />
            <Route path="/my-orders" element={<PageTransition><MyOrders /></PageTransition>} />
            <Route path="/shop/register" element={<PageTransition><ShopRegister /></PageTransition>} />
            <Route path="/shop/payment/success" element={<PageTransition><ShopCheckoutCallback /></PageTransition>} />
            <Route path="/shop/payment/error" element={<PageTransition><ShopCheckoutCallback /></PageTransition>} />
            <Route path="/actualites" element={<PageTransition><Actualites /></PageTransition>} />
        <Route path="/actualites/:slug" element={<PageTransition><ActualiteDetail /></PageTransition>} />
        <Route path="/messages" element={<PageTransition><Messages /></PageTransition>} />
        <Route path="/bibliotheque" element={<PageTransition><Bibliotheque /></PageTransition>} />
        <Route path="/blog" element={<PageTransition><BlogList /></PageTransition>} />
            <Route path="/blog/new" element={<PageTransition><BlogEditor /></PageTransition>} />
            <Route path="/blog/edit/:id" element={<PageTransition><BlogEditor /></PageTransition>} />
            <Route path="/blog/:slug" element={<PageTransition><BlogDetail /></PageTransition>} />
            <Route path="/blog/exercises/:exerciseId/submissions" element={<PageTransition><BlogSubmissions /></PageTransition>} />
            <Route path="/cgu" element={<PageTransition><CGU /></PageTransition>} />
            <Route path="/conditions-generales" element={<PageTransition><CGU /></PageTransition>} />
            <Route path="/preferences-cookies" element={<PageTransition><PreferencesCookies /></PageTransition>} />
            <Route path="/mentions-legales" element={<PageTransition><MentionsLegales /></PageTransition>} />
            <Route path="/politique-de-confidentialite" element={<PageTransition><PolitiqueConfidentialite /></PageTransition>} />
            <Route path="/accessibilite" element={<PageTransition><Accessibilite /></PageTransition>} />
            <Route path="/catalogue" element={<PageTransition><CataloguePage /></PageTransition>} />
            <Route path="/formation/:id" element={<PageTransition><CourseDetail /></PageTransition>} />
            <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </AnimatePresence>
      {!shouldHide && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AnalyticsTracker />
      <RouteMeta />
      <CookieProvider>
        <ToastProvider>
          <AppRoutes />
          <CartDrawer />
          <PwaInstallBanner />
          <PushAutoSubscribe />
        </ToastProvider>
      </CookieProvider>
    </BrowserRouter>
  );
}
