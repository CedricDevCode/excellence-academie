import { lazy, Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Bell, Settings, LogOut, BarChart3, BookOpen, Menu, X,
  Home, CreditCard, FileText, GraduationCap, ChevronRight, ChevronDown,
  CheckCircle, ShoppingCart, Layers, Award, Sparkles, PanelLeftClose, PanelLeftOpen, User, LayoutTemplate,
  Globe, HelpCircle, ShieldCheck, BarChart2, Megaphone, PhoneCall
} from "lucide-react";
import {
  fetchStats, getMe, logout as apiLogout,
  fetchNotifications, markNotificationRead, markAllNotificationsRead
} from "../utils/api";
import { useLiveNotifications } from "../hooks/useLiveNotifications";
import Skeleton from "../components/ui/Skeleton";

const DashboardView = lazy(() => import("./DashboardView"));
const FormationsView = lazy(() => import("../components/admin/FormationsView"));
const CategoriesView = lazy(() => import("../components/admin/CategoriesView"));
const StudentsView = lazy(() => import("../components/admin/StudentsView"));
const PaymentsView = lazy(() => import("./PaymentsView"));
const ContractsView = lazy(() => import("../components/admin/ContractsView"));
const ComptaView = lazy(() => import("../components/admin/ComptaView"));
const NotifsView = lazy(() => import("../components/admin/NotifsView"));
const UsersView = lazy(() => import("../components/admin/UsersView"));
const ReportsView = lazy(() => import("../components/admin/ReportsView"));
const TestimonialsView = lazy(() => import("../components/admin/TestimonialsView"));
const ShopProductsView = lazy(() => import("../components/ShopProductsView"));
const ShopOrdersView = lazy(() => import("../components/ShopOrdersView"));
const BannersView = lazy(() => import("../components/BannersView"));
const TeacherSessionsView = lazy(() => import("../components/TeacherSessionsView"));
const BlogAdminView = lazy(() => import("../components/admin/BlogAdminView"));
const SettingsView = lazy(() => import("../components/admin/SettingsView"));
const SiteConfigView = lazy(() => import("../components/admin/SiteConfigView"));

const NAV_GROUPS = [
  {
    category: "Administration",
    items: [
      { icon: <Home size={18} />, label: "Tableau de bord", id: "dashboard" },
      { icon: <GraduationCap size={18} />, label: "Formations", id: "courses" },
      { icon: <Layers size={18} />, label: "Catégories", id: "categories" },
      { icon: <Users size={18} />, label: "Étudiants", id: "students" },
      { icon: <FileText size={18} />, label: "Séances", id: "sessions" },
      { icon: <FileText size={18} />, label: "Contrats", id: "contracts" },
    ]
  },
  {
    category: "Paramètres du site",
    items: [
      { icon: <LayoutTemplate size={18} />, label: "Vue d'ensemble", id: "site_config" },
      { icon: <Megaphone size={18} />, label: "Bannières À la une", id: "home_featured" },
      { icon: <Award size={18} />, label: "Lauréats & Avis", id: "testimonials" },
    ]
  },
  {
    category: "Finances",
    items: [
      { icon: <BarChart3 size={18} />, label: "Comptabilité", id: "compta" },
      { icon: <CreditCard size={18} />, label: "Paiements reçus", id: "payments" },
    ]
  },
  {
    category: "Blog",
    items: [
      { icon: <BookOpen size={18} />, label: "Articles", id: "blog" },
    ]
  },
  {
    category: "Boutique",
    items: [
      { icon: <ShoppingCart size={18} />, label: "Produits", id: "shop_products" },
      { icon: <ShoppingCart size={18} />, label: "Commandes", id: "shop_orders" },
      { icon: <ShoppingCart size={18} />, label: "Bannières boutique", id: "shop_banners" },
    ]
  },
  {
    category: "Système",
    items: [
      { icon: <Users size={18} />, label: "Utilisateurs", id: "users" },
      { icon: <Bell size={18} />, label: "Notifications", id: "notifs" },
      { icon: <FileText size={18} />, label: "Rapports", id: "reports" },
      { icon: <Settings size={18} />, label: "Paramètres généraux", id: "settings" },
    ]
  }
];

const TAB_TITLES: Record<string, string> = {
  dashboard: "Tableau de bord",
  courses: "Formations",
  categories: "Catégories",
  students: "Étudiants",
  payments: "Paiements",
  contracts: "Contrats",
  compta: "Comptabilité",
  sessions: "Séances",
  notifs: "Notifications",
  users: "Utilisateurs",
  reports: "Rapports",
  testimonials: "Lauréats & Avis",
  shop_products: "Produits",
  shop_orders: "Commandes",
  shop_banners: "Bannières boutique",
  home_featured: "Bannières À la une",
  blog: "Blog",
  settings: "Paramètres généraux",
  site_config: "Paramètres du site",
  "site_config:hero": "Hero & En-tête (Accueil)",
  "site_config:stats": "Statistiques (Accueil)",
  "site_config:how": "Comment ça marche (Accueil)",
  "site_config:atouts": "Pourquoi nous ? (Accueil)",
  "site_config:admis": "Lauréats & Admis (Accueil)",
  "site_config:catalogue": "Catalogue & Formations (Accueil)",
  "site_config:testimonials": "Témoignages (Accueil)",
  "site_config:cta": "Appel à l'action (Accueil)",
};

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('adminSidebar') === 'collapsed');
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('adminTab') || 'dashboard');
  const [openCategories, setOpenCategories] = useState<string[]>(['Administration']);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      setShowWelcome(true);
      const timer = setTimeout(() => setShowWelcome(false), 4000);
      return () => clearTimeout(timer);
    } else {
      setShowWelcome(false);
    }
  }, [activeTab]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [apiStats, setApiStats] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getMe()
      .then(user => {
        setCurrentUser(user);
        localStorage.setItem("user", JSON.stringify(user));
        if (user.role !== 'ADMIN') {
          navigate('/student/login');
          return;
        }
        setAuthChecked(true);
      })
      .catch(() => {
        navigate('/student/login');
      });
  }, [navigate]);

  const loadStats = () => {
    fetchStats()
      .then(data => setApiStats(data))
      .catch(err => console.error("Erreur de chargement des stats", err));
  };

  useEffect(() => {
    if (!authChecked) return;
    localStorage.setItem('adminTab', activeTab);
    if (activeTab === 'dashboard') loadStats();
  }, [authChecked, activeTab]);

  useEffect(() => { localStorage.setItem('adminSidebar', sidebarCollapsed ? 'collapsed' : ''); }, [sidebarCollapsed]);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useLiveNotifications((newNotif) => {
    setNotifications(prev => [newNotif, ...prev]);
  });

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Erreur marquage notifications lues :', err);
    }
  };

  const handleMarkSingleRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Erreur marquage notification lue :', err);
    }
  };

  useEffect(() => { fetchNotifications().then(setNotifications).catch(() => { }); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const toggleSidebar = () => setSidebarCollapsed(prev => !prev);

  const handleLogout = async () => {
    localStorage.removeItem("user");
    try {
      await apiLogout();
    } catch (e) { /* ignore */ }
    navigate('/student/login');
  };

  if (!authChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-50">
        <div className="w-full max-w-sm space-y-4 p-6">
          <div className="flex items-center gap-4">
            <Skeleton variant="circular" className="w-12 h-12 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" className="h-4 w-3/4" />
              <Skeleton variant="text" className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton variant="card" className="h-32" />
          <div className="flex gap-4">
            <Skeleton variant="text" className="h-8 w-1/3" />
            <Skeleton variant="text" className="h-8 w-1/3" />
            <Skeleton variant="text" className="h-8 w-1/3" />
          </div>
          <p className="text-gray-500 text-sm text-center">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView apiStats={apiStats} />;
      case 'courses': return <FormationsView />;
      case 'categories': return <CategoriesView />;
      case 'students': return <StudentsView />;
      case 'payments': return <PaymentsView />;
      case 'contracts': return <ContractsView />;
      case 'compta': return <ComptaView />;
      case 'sessions': return <TeacherSessionsView />;
      case 'notifs': return <NotifsView />;
      case 'users': return <UsersView />;
      case 'reports': return <ReportsView apiStats={apiStats} />;
      case 'testimonials': return <TestimonialsView />;
      case 'shop_products': return <ShopProductsView />;
      case 'shop_orders': return <ShopOrdersView />;
      case 'shop_banners': return <BannersView mode="shop" />;
      case 'home_featured': return <BannersView mode="homepage" />;
      case 'blog': return <BlogAdminView />;
      case 'site_config': return <SiteConfigView />;
      case 'settings': return <SettingsView currentUser={currentUser} onRefresh={() => getMe().then(setCurrentUser)} />;
      default:
        if (activeTab.startsWith('site_config:')) {
          const subTab = activeTab.replace('site_config:', '');
          return <SiteConfigView initialTab={subTab} />;
        }
        return <DashboardView apiStats={apiStats} />;
    }
  };

  return (
    <div className="flex h-screen bg-surface-50 font-[Inter,sans-serif] overflow-hidden">
      <aside className={`fixed inset-y-0 left-0 z-50 bg-gradient-hero text-white flex flex-col h-screen transform transition-all duration-300 lg:relative lg:translate-x-0 shadow-2xl ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} ${sidebarCollapsed ? "w-16" : "w-64"}`}>
        <div className={`shrink-0 flex items-center justify-between border-b border-white/15 ${sidebarCollapsed ? "p-3 justify-center" : "p-5"}`}>
          {sidebarCollapsed ? (
            <img src="/images/logo exacademy.jpeg" alt="Logo" className="w-9 h-9 rounded-full object-cover bg-white shrink-0 shadow-sm" />
          ) : (
            <div className="flex items-center gap-3 overflow-hidden">
              <img src="/images/logo exacademy.jpeg" alt="Logo" className="w-9 h-9 rounded-full object-cover bg-white shrink-0 shadow-sm" />
              <div className="min-w-0">
                <div className="font-black text-sm truncate tracking-tight">Excellence Académie</div>
                <div className="text-amber-200/90 text-xs truncate">Panneau Administration</div>
              </div>
            </div>
          )}
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-amber-200/90 hover:text-white shrink-0 p-1">
            <X size={20} />
          </button>
        </div>

        <nav className={`flex-1 min-h-0 overflow-y-auto space-y-3 ${sidebarCollapsed ? "p-2" : "p-3.5"} select-none`}>
          {NAV_GROUPS.map((group) => {
            const isOpen = openCategories.includes(group.category);
            return (
              <div key={group.category} className="space-y-1">
                {!sidebarCollapsed && (
                  <button
                    type="button"
                    onClick={() => setOpenCategories(prev =>
                      prev.includes(group.category)
                        ? []
                        : [group.category]
                    )}
                    className="w-full flex items-center justify-between text-amber-200/90 hover:text-white px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg hover:bg-white/5 transition-all"
                  >
                    <span>{group.category}</span>
                    <span className="shrink-0 transition-transform duration-200">
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                  </button>
                )}

                <div className={`space-y-1 transition-all duration-300 overflow-hidden ${!sidebarCollapsed && !isOpen ? 'max-h-0 opacity-0' : 'max-h-[600px] opacity-100'}`}>
                  {group.items.map(item => {
                    const isActive = activeTab === item.id;
                    return (
                      <motion.button
                        key={item.id}
                        type="button"
                        onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                        whileHover={{ scale: 1.02, x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full flex items-center gap-3 rounded text-sm font-medium transition-all ${sidebarCollapsed ? "justify-center p-3" : "px-3.5 py-2.5"} ${isActive ? "bg-white/20 text-white font-bold shadow-sm" : "text-amber-100 hover:bg-white/10 hover:text-white"}`}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        <span className="shrink-0">{item.icon}</span>
                        {!sidebarCollapsed && <span className="truncate text-left">{item.label}</span>}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className={`shrink-0 border-t border-white/15 bg-primary-900/50 space-y-1 z-10 shadow-lg ${sidebarCollapsed ? "p-2" : "p-3"}`}>
          <button
            type="button"
            onClick={toggleSidebar}
            className={`w-full flex items-center gap-3 text-amber-200/90 hover:text-white text-sm rounded hover:bg-white/10 transition-all ${sidebarCollapsed ? "justify-center p-2.5" : "px-3 py-2.5"}`}
            title={sidebarCollapsed ? "Agrandir le menu" : "Réduire le menu"}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            {!sidebarCollapsed && <span className="text-xs font-semibold">Réduire le menu</span>}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 text-red-200 hover:text-white text-sm rounded hover:bg-red-500/20 transition-all ${sidebarCollapsed ? "justify-center p-2.5" : "px-3 py-2.5"}`}
            title="Déconnexion"
          >
            <LogOut size={18} className="text-red-300" />
            {!sidebarCollapsed && <span className="text-xs font-bold text-red-100">Déconnexion</span>}
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700">
              <Menu size={22} />
            </button>
            <div>
              <h1 className="font-black text-gray-900">{TAB_TITLES[activeTab] || "Tableau de bord"} – Administrateur</h1>
              <p className="text-gray-400 text-xs">Excellence Académie • {currentUser?.name || 'Admin'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:text-primary-700 hover:bg-gray-50 text-xs font-bold transition-all shadow-2xs"
              title="Accéder à la page d'accueil sans se déconnecter"
            >
              <Globe size={14} className="text-primary-600" />
              <span className="hidden sm:inline">Voir le site public</span>
            </Link>
            <div className="relative" ref={notifRef}>
              <button onClick={(e) => { e.stopPropagation(); setNotifOpen(!notifOpen); }} className="relative p-2 text-gray-500 hover:text-gray-700 transition-colors">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.span>
                )}
              </button>
              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-84 bg-white rounded shadow-xl border border-gray-100 z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button onClick={handleMarkAllRead} className="text-[11px] text-primary-500 hover:underline font-semibold">
                            Tout lire
                          </button>
                        )}
                        <button onClick={() => { setActiveTab('notifs'); setNotifOpen(false); }} className="text-[11px] text-gray-500 hover:text-gray-800">
                          Voir tout
                        </button>
                      </div>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-400 text-sm">
                          <Bell size={24} className="mx-auto text-gray-300 mb-2 opacity-50" />
                          Aucune notification
                        </div>
                      ) : (
                        notifications.slice(0, 6).map((n: any) => (
                          <div
                            key={n.id}
                            onClick={() => { if (!n.isRead) handleMarkSingleRead(n.id); }}
                            className={`px-4 py-3 text-sm cursor-pointer transition-colors hover:bg-gray-50 ${!n.isRead ? 'bg-primary-50/70' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-semibold text-gray-900 text-xs flex items-center gap-1.5">
                                {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />}
                                <span>{n.title}</span>
                              </div>
                              <span className="text-[10px] text-gray-400 shrink-0">
                                {n.createdAt ? new Date(n.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                            <div className="text-gray-500 text-xs mt-1 line-clamp-2">{n.message}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="relative" ref={profileRef}>
              <button onClick={(e) => { e.stopPropagation(); setProfileOpen(!profileOpen); }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-xs hover:opacity-90 transition-opacity cursor-pointer overflow-hidden">
                {currentUser?.image ? (
                  <img src={currentUser.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary-500 flex items-center justify-center">{currentUser?.name?.[0]?.toUpperCase() || 'A'}</div>
                )}
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded shadow-xl border border-gray-100 z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-gray-100">
                      <div className="font-bold text-gray-900 text-sm truncate">{currentUser?.name || 'Administrateur'}</div>
                      <div className="text-gray-400 text-xs truncate">{currentUser?.email || ''}</div>
                    </div>
                    <div className="p-2">
                      <button onClick={() => { localStorage.setItem('adminSettingsTab', 'account'); setActiveTab('settings'); setProfileOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <User size={16} className="text-gray-400" /> Profil
                      </button>
                      <button onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm text-red-600 hover:bg-red-50 transition-colors">
                        <LogOut size={16} /> Déconnexion
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 relative">
          <AnimatePresence>
            {showWelcome && activeTab === 'dashboard' && (
              <motion.div
                initial={{ opacity: 0, y: -20, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto', marginBottom: 24 }}
                exit={{ opacity: 0, y: -20, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="bg-linear-to-r from-primary-500 to-primary-600 rounded text-white overflow-hidden p-6"
              >
                <h2 className="font-black text-xl mb-1">Bon retour parmi nous, {currentUser?.name?.split(" ")[0] || "Admin"} !</h2>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-gray-200 border-t-primary-500 rounded-full animate-spin" /></div>}>
              {renderContent()}
            </Suspense>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
