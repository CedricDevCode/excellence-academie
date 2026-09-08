import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import StudentLogin from "./pages/StudentLogin";
import StudentRegister from "./pages/StudentRegister";
import AdminDashboard from "./pages/AdminDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import AccountantDashboard from "./pages/AccountantDashboard";
import SecretaryDashboard from "./pages/SecretaryDashboard";
import CGU from "./pages/CGU";
import PaymentCallback from "./pages/PaymentCallback";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import MyOrders from "./pages/MyOrders";
import ShopRegister from "./pages/ShopRegister";
import ShopCheckoutCallback from "./pages/ShopCheckoutCallback";
import BlogList from "./pages/BlogList";
import BlogDetail from "./pages/BlogDetail";
import BlogEditor from "./pages/BlogEditor";
import BlogSubmissions from "./pages/BlogSubmissions";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CartDrawer from "./components/CartDrawer";
import { ToastProvider } from "./components/Toast";

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
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/students/new" element={<StudentRegister />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
        <Route path="/accountant/dashboard" element={<AccountantDashboard />} />
        <Route path="/secretary/dashboard" element={<SecretaryDashboard />} />
        <Route path="/payment/success" element={<PaymentCallback />} />
        <Route path="/payment/error" element={<PaymentCallback />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/shop/c/:type" element={<Shop />} />
          <Route path="/shop/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/my-orders" element={<MyOrders />} />
        <Route path="/shop/register" element={<ShopRegister />} />
        <Route path="/shop/payment/success" element={<ShopCheckoutCallback />} />
        <Route path="/shop/payment/error" element={<ShopCheckoutCallback />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/new" element={<BlogEditor />} />
        <Route path="/blog/edit/:id" element={<BlogEditor />} />
        <Route path="/blog/:slug" element={<BlogDetail />} />
        <Route path="/blog/exercises/:exerciseId/submissions" element={<BlogSubmissions />} />
        <Route path="/cgu" element={<CGU />} />
      </Routes>
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
      </ToastProvider>
    </BrowserRouter>
  );
}
