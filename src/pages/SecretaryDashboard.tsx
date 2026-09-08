import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Menu, X, Clock, DollarSign, Bell, User, PanelLeftClose, PanelLeftOpen, Home, Loader2, ChevronRight, ShoppingCart } from "lucide-react";
import { getMe, logout as apiLogout, fetchNotifications, markNotificationRead } from "../utils/api";
import TeacherSessionsView from "../components/TeacherSessionsView";
import TeacherSalariesView from "../components/TeacherSalariesView";
import ShopProductsView from "../components/ShopProductsView";
import ShopOrdersView from "../components/ShopOrdersView";
import { useToast } from "../components/Toast";

const NAV_ITEMS = [
  { icon: <Clock size={18} />, label: "Séances & Salaires", id: "sessions" },
  { icon: <Bell size={18} />, label: "Notifications", id: "notifs" },
  { icon: <ShoppingCart size={18} />, label: "Boutique (Produits)", id: "shop_products" },
  { icon: <ShoppingCart size={18} />, label: "Boutique (Commandes)", id: "shop_orders" },
];

export default function SecretaryDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("sessions");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('secSidebar') === 'collapsed');
  const [secSessionsTab, setSecSessionsTab] = useState(() => localStorage.getItem('secSessionsTab') || 'sessions');
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    getMe().then(u => {
      if (!u || u.role !== 'SECRETARY') { navigate('/'); return; }
      setCurrentUser(u);
    }).catch(() => navigate('/')).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem('secSidebar', sidebarCollapsed ? 'collapsed' : '');
  }, [sidebarCollapsed]);
  useEffect(() => {
    localStorage.setItem('secSessionsTab', secSessionsTab);
  }, [secSessionsTab]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    setProfileOpen(false);
    await apiLogout();
    navigate('/');
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <Loader2 size={32} className="animate-spin text-[#0056B3] mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Chargement...</p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'sessions':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1 flex gap-1 w-fit">
              <button onClick={() => setSecSessionsTab('sessions')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${secSessionsTab === 'sessions' ? 'bg-[#0056B3] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
                <Clock size={16} /> Séances
              </button>
              <button onClick={() => setSecSessionsTab('salaries')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${secSessionsTab === 'salaries' ? 'bg-[#0056B3] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
                <DollarSign size={16} /> Salaires
              </button>
            </div>
            {secSessionsTab === 'salaries' ? <TeacherSalariesView /> : <TeacherSessionsView />}
          </div>
        );
      case 'notifs': return <NotifsView />;
      case 'shop_products': return <ShopProductsView />;
      case 'shop_orders': return <ShopOrdersView />;
      default: return <TeacherSessionsView />;
    }
  };

  const initials = currentUser?.name?.split(' ').map((s: string) => s[0]).join('').toUpperCase() || 'S';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-[#0056B3] text-white transform transition-all duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} ${sidebarCollapsed ? "w-16" : "w-64"}`}>
        <div className={`flex items-center justify-between border-b border-blue-400/30 ${sidebarCollapsed ? "p-3 justify-center" : "p-5"}`}>
          {sidebarCollapsed ? (
            <img src="/images/logo exacademy.jpeg" alt="Logo" className="w-9 h-9 rounded-full object-cover bg-white shrink-0" />
          ) : (
            <div className="flex items-center gap-3">
              <img src="/images/logo exacademy.jpeg" alt="Logo" className="w-9 h-9 rounded-full object-cover bg-white shrink-0" />
              <span className="font-black text-sm">Secrétariat</span>
            </div>
          )}
        </div>
        <nav className={`space-y-1 ${sidebarCollapsed ? "p-2" : "p-4"}`}>
          {NAV_ITEMS.map((item) => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all ${sidebarCollapsed ? "justify-center p-3" : "px-4 py-3"} ${activeTab === item.id ? "bg-white/20 text-white font-bold" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}
              title={sidebarCollapsed ? item.label : undefined}>
              {item.icon}
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              {!sidebarCollapsed && activeTab === item.id && <ChevronRight size={16} className="ml-auto shrink-0" />}
            </button>
          ))}
        </nav>
        <div className={`absolute bottom-0 left-0 right-0 border-t border-blue-400/30 ${sidebarCollapsed ? "p-2" : "p-4"}`}>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`w-full flex items-center gap-3 text-blue-200 hover:text-white text-sm rounded-xl hover:bg-white/10 transition-all ${sidebarCollapsed ? "justify-center p-3" : "px-4 py-3"}`}
            title={sidebarCollapsed ? "Agrandir" : "Réduire"}>
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            {!sidebarCollapsed && <span>Réduire</span>}
          </button>
          <button onClick={handleLogout}
            className={`w-full flex items-center gap-3 text-blue-200 hover:text-white text-sm rounded-xl hover:bg-white/10 transition-all ${sidebarCollapsed ? "justify-center p-3" : "px-4 py-3"}`}
            title="Déconnexion">
            <LogOut size={18} />
            {!sidebarCollapsed && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-600"><Menu size={20} /></button>
            <h1 className="font-black text-gray-900 text-sm lg:text-base">Secrétariat - Excellence Académie</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative" ref={profileRef}>
              <button onClick={(e) => { e.stopPropagation(); setProfileOpen(!profileOpen); }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-xs hover:opacity-90 transition-opacity cursor-pointer overflow-hidden">
                {currentUser?.image ? (
                  <img src={currentUser.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#0056B3] flex items-center justify-center">{initials}</div>
                )}
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <div className="font-bold text-gray-900 text-sm truncate">{currentUser?.name || 'Secrétaire'}</div>
                    <div className="text-gray-400 text-xs truncate">{currentUser?.email || ''}</div>
                  </div>
                  <div className="p-2">
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors">
                      <LogOut size={16} /> Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="bg-linear-to-r from-[#0056B3] to-[#003375] rounded-2xl p-6 text-white mb-6">
            <h2 className="font-black text-xl mb-1">Bon retour parmi nous, {currentUser?.name?.split(" ")[0] || "Secrétaire"} !</h2>
          </div>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

function NotifsView() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications().then(setNotifs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifs(notifs.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch { toast('error', 'Erreur'); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-[#0056B3]" /></div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <h2 className="font-black text-gray-900 flex items-center gap-2"><Bell size={18} className="text-[#0056B3]" /> Notifications</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {notifs.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">Aucune notification</div>
        ) : (
          notifs.map((n: any) => (
            <div key={n.id} className={`p-4 flex items-start justify-between gap-4 ${!n.isRead ? 'bg-blue-50/50' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.isRead ? 'font-bold text-gray-900' : 'text-gray-600'}`}>{n.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{n.message}</p>
                <p className="text-xs text-gray-300 mt-1">{new Date(n.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>
              {!n.isRead && (
                <button onClick={() => handleMarkRead(n.id)} className="text-xs text-[#0056B3] font-semibold hover:underline shrink-0">Marquer lue</button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

