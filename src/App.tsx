import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation, Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CartDrawer from "./components/CartDrawer";
import PageTransition from "./components/ui/PageTransition";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastProvider } from "./components/Toast";
import PwaInstallBanner from "./components/PwaInstallBanner";
import PushAutoSubscribe from "./components/PushAutoSubscribe";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const StudentLogin = lazy(() => import("./pages/StudentLogin"));
const StudentRegister = lazy(() => import("./pages/StudentRegister"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const AccountantDashboard = lazy(() => import("./pages/AccountantDashboard"));
const SecretaryDashboard = lazy(() => import("./pages/SecretaryDashboard"));
const CGU = lazy(() => import("./pages/CGU"));
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

function AppRoutes() {
  const location = useLocation();
  const hideNavFooter = [
    "/admin/dashboard",
    "/student/dashboard",
    "/teacher/dashboard",
    "/accountant/dashboard",
    "/secretary/dashboard",
    "/students/new",
    "/student/login",
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
            <Route path="/students/new" element={<PageTransition><StudentRegister /></PageTransition>} />
            <Route path="/admin/dashboard" element={<PageTransition><AdminDashboard /></PageTransition>} />
            <Route path="/student/dashboard" element={<PageTransition><StudentDashboard /></PageTransition>} />
            <Route path="/teacher/dashboard" element={<PageTransition><TeacherDashboard /></PageTransition>} />
            <Route path="/accountant/dashboard" element={<PageTransition><AccountantDashboard /></PageTransition>} />
            <Route path="/secretary/dashboard" element={<PageTransition><SecretaryDashboard /></PageTransition>} />
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
            <Route path="/blog" element={<PageTransition><BlogList /></PageTransition>} />
            <Route path="/blog/new" element={<PageTransition><BlogEditor /></PageTransition>} />
            <Route path="/blog/edit/:id" element={<PageTransition><BlogEditor /></PageTransition>} />
            <Route path="/blog/:slug" element={<PageTransition><BlogDetail /></PageTransition>} />
            <Route path="/blog/exercises/:exerciseId/submissions" element={<PageTransition><BlogSubmissions /></PageTransition>} />
            <Route path="/cgu" element={<PageTransition><CGU /></PageTransition>} />
            <Route path="*" element={
              <PageTransition>
                <div className="min-h-[70vh] flex items-center justify-center p-8">
                  <div className="text-center">
                    <h1 className="text-6xl font-black text-primary-900 mb-4">404</h1>
                    <p className="text-lg text-gray-500 mb-6">Page introuvable</p>
                    <Link to="/" className="px-6 py-3 bg-primary-500 text-white font-bold rounded-lg hover:bg-primary-600 transition-colors">
                      Retour à l'accueil
                    </Link>
                  </div>
                </div>
              </PageTransition>
            } />
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
      <ToastProvider>
        <AppRoutes />
        <CartDrawer />
        <PwaInstallBanner />
        <PushAutoSubscribe />
      </ToastProvider>
    </BrowserRouter>
  );
}
