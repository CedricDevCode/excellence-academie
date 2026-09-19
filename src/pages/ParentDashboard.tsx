import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home, CreditCard, Bell, LogOut, Menu, X, User,
  CheckCircle, Clock, AlertCircle, Loader2, Users,
  ChevronRight, Eye, Calendar
} from "lucide-react";
import { getMe, logout as apiLogout, fetchPaymentsByUser, fetchSubscriptionsByUser, fetchNotifications, markNotificationRead, markAllNotificationsRead } from "../utils/api";
import { useLiveNotifications } from "../hooks/useLiveNotifications";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  { icon: <Home size={18} />, label: "Tableau de bord", id: "dashboard" },
  { icon: <Users size={18} />, label: "Mes enfants", id: "children" },
  { icon: <CreditCard size={18} />, label: "Paiements", id: "payments" },
  { icon: <Bell size={18} />, label: "Notifications", id: "notifs" },
];

function formatPrice(amount: number) {
  return Number(amount).toLocaleString("fr-FR");
}

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [childPayments, setChildPayments] = useState<any[]>([]);
  const [childSubscriptions, setChildSubscriptions] = useState<any[]>([]);
  const [loadingChildData, setLoadingChildData] = useState(false);

  const { unreadCount } = useLiveNotifications(user?.id);

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      const me = await getMe();
      if (me.role !== 'PARENT') {
        navigate('/login');
        return;
      }
      setUser(me);
      if (me.parentLinks?.length > 0) {
        setSelectedChild(me.parentLinks[0].student);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { loadUser(); }, [loadUser]);

  useEffect(() => {
    if (!selectedChild) return;
    const loadChildData = async () => {
      setLoadingChildData(true);
      try {
        const [payments, subs] = await Promise.all([
          fetchPaymentsByUser(selectedChild.id),
          fetchSubscriptionsByUser(selectedChild.id),
        ]);
        setChildPayments(payments);
        setChildSubscriptions(subs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingChildData(false);
      }
    };
    loadChildData();
  }, [selectedChild]);

  useEffect(() => {
    if (activeTab === 'notifs') {
      fetchNotifications().then(setNotifications).catch(() => {});
    }
  }, [activeTab]);

  const handleLogout = async () => {
    await apiLogout();
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-accent-500" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 max-w-md w-full text-center shadow-sm">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-surface-900 mb-2">Erreur</h2>
          <p className="text-surface-600 mb-6">{error}</p>
          <button onClick={loadUser} className="bg-accent-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-accent-600">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const children = user?.parentLinks?.map((l: any) => l.student) || [];
  const paidPayments = childPayments.filter((p: any) => p.status === 'SUCCESS');
  const pendingPayments = childPayments.filter((p: any) => p.status === 'PENDING');
  const totalPaid = paidPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="bg-white border-b border-surface-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="lg:hidden p-1.5 rounded-lg hover:bg-surface-100">
              {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                <Users size={16} className="text-pink-600" />
              </div>
              <span className="font-bold text-surface-900 text-sm hidden sm:block">Espace Parent</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveTab('notifs')} className="relative p-1.5 rounded-lg hover:bg-surface-100">
              <Bell size={18} className="text-surface-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent-100 flex items-center justify-center text-xs font-bold text-accent-700">
                {user?.name?.split(' ').map((s: string) => s[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-surface-700 hidden sm:block">{user?.name}</span>
            </div>
            <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-red-500 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Mobile Nav */}
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="lg:hidden mb-4 bg-white rounded-xl border border-surface-200 overflow-hidden">
              <div className="p-2 space-y-1">
                {NAV_ITEMS.map(item => (
                  <button key={item.id} onClick={() => { setActiveTab(item.id); setMobileNavOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      activeTab === item.id ? 'bg-accent-50 text-accent-700' : 'text-surface-600 hover:bg-surface-50'
                    }`}>
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="hidden lg:block w-56 shrink-0">
            <nav className="bg-white rounded-xl border border-surface-200 p-2 sticky top-20 space-y-1">
              {NAV_ITEMS.map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    activeTab === item.id ? 'bg-accent-50 text-accent-700' : 'text-surface-600 hover:bg-surface-50'
                  }`}>
                  {item.icon} {item.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-xl font-bold text-surface-900">Bonjour, {user?.name?.split(' ')[0]} 👋</h1>
                  <p className="text-surface-500 text-sm mt-1">Voici le suivi de vos enfants inscrits</p>
                </div>

                {/* Children Cards */}
                {children.length === 0 ? (
                  <div className="bg-white rounded-xl border border-surface-200 p-8 text-center">
                    <Users className="mx-auto text-surface-300 mb-3" size={48} />
                    <p className="text-surface-500 font-semibold">Aucun enfant lié à votre compte</p>
                    <p className="text-surface-400 text-sm mt-1">Contactez l'administration pour associer vos enfants</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {children.map((child: any) => (
                      <button key={child.id} onClick={() => { setSelectedChild(child); setActiveTab('children'); }}
                        className={`bg-white rounded-xl border-2 p-5 text-left transition-all hover:shadow-md ${
                          selectedChild?.id === child.id ? 'border-accent-400 shadow-md' : 'border-surface-200 hover:border-surface-300'
                        }`}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-accent-100 flex items-center justify-center text-sm font-bold text-accent-700">
                            {child.name?.split(' ').map((s: string) => s[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-surface-900 text-sm">{child.name}</p>
                            <p className="text-xs text-surface-400">{child.matricule || '—'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-surface-500">
                          <span className="px-2 py-0.5 bg-surface-100 rounded-full">{child.ville || '—'}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Summary Stats */}
                {selectedChild && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-surface-200 p-4">
                      <p className="text-xs font-semibold text-surface-500 mb-1">Total payé</p>
                      <p className="text-lg font-bold text-green-600">{formatPrice(totalPaid)} <span className="text-xs font-normal">FCFA</span></p>
                    </div>
                    <div className="bg-white rounded-xl border border-surface-200 p-4">
                      <p className="text-xs font-semibold text-surface-500 mb-1">En attente</p>
                      <p className="text-lg font-bold text-amber-600">{pendingPayments.length}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-surface-200 p-4">
                      <p className="text-xs font-semibold text-surface-500 mb-1">Formations</p>
                      <p className="text-lg font-bold text-accent-600">{childSubscriptions.length}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-surface-200 p-4">
                      <p className="text-xs font-semibold text-surface-500 mb-1">Paiements</p>
                      <p className="text-lg font-bold text-surface-900">{childPayments.length}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Children Detail Tab */}
            {activeTab === 'children' && (
              <div className="space-y-6">
                <h1 className="text-xl font-bold text-surface-900">Mes enfants</h1>

                {children.length === 0 ? (
                  <div className="bg-white rounded-xl border border-surface-200 p-8 text-center">
                    <Users className="mx-auto text-surface-300 mb-3" size={48} />
                    <p className="text-surface-500 font-semibold">Aucun enfant lié</p>
                  </div>
                ) : (
                  <>
                    {/* Child Selector */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {children.map((child: any) => (
                        <button key={child.id} onClick={() => setSelectedChild(child)}
                          className={`shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                            selectedChild?.id === child.id
                              ? 'bg-accent-500 text-white'
                              : 'bg-white border border-surface-200 text-surface-600 hover:border-surface-300'
                          }`}>
                          {child.name}
                        </button>
                      ))}
                    </div>

                    {/* Child Detail */}
                    {selectedChild && (
                      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
                        <div className="p-5 border-b border-surface-100">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-accent-100 flex items-center justify-center text-lg font-bold text-accent-700">
                              {selectedChild.name?.split(' ').map((s: string) => s[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h2 className="text-lg font-bold text-surface-900">{selectedChild.name}</h2>
                              <p className="text-sm text-surface-500">{selectedChild.email}</p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-surface-400">
                                <span>Matricule: {selectedChild.matricule || '—'}</span>
                                <span>•</span>
                                <span>Ville: {selectedChild.ville || '—'}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Subscriptions */}
                        <div className="p-5 border-b border-surface-100">
                          <h3 className="text-sm font-bold text-surface-900 mb-3">Formations inscrites</h3>
                          {childSubscriptions.length === 0 ? (
                            <p className="text-sm text-surface-400">Aucune formation</p>
                          ) : (
                            <div className="space-y-2">
                              {childSubscriptions.map((sub: any) => (
                                <div key={sub.id} className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                                  <div>
                                    <p className="text-sm font-semibold text-surface-900">{sub.course?.title || '—'}</p>
                                    <p className="text-xs text-surface-400">{sub.mode || '—'}</p>
                                  </div>
                                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                    sub.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                    sub.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                    'bg-surface-100 text-surface-600'
                                  }`}>
                                    {sub.status === 'ACTIVE' ? 'Actif' : sub.status === 'PENDING' ? 'En attente' : sub.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Payments */}
                        <div className="p-5">
                          <h3 className="text-sm font-bold text-surface-900 mb-3">Derniers paiements</h3>
                          {loadingChildData ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="animate-spin text-surface-400" size={20} />
                            </div>
                          ) : childPayments.length === 0 ? (
                            <p className="text-sm text-surface-400">Aucun paiement</p>
                          ) : (
                            <div className="space-y-2">
                              {childPayments.slice(0, 5).map((p: any) => (
                                <div key={p.id} className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                      p.status === 'SUCCESS' ? 'bg-green-100' : p.status === 'PENDING' ? 'bg-amber-100' : 'bg-red-100'
                                    }`}>
                                      {p.status === 'SUCCESS' ? <CheckCircle size={14} className="text-green-600" /> :
                                       p.status === 'PENDING' ? <Clock size={14} className="text-amber-600" /> :
                                       <AlertCircle size={14} className="text-red-600" />}
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-surface-900">{formatPrice(Number(p.amount))} FCFA</p>
                                      <p className="text-xs text-surface-400">{p.course?.title || '—'}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-surface-400">{new Date(p.createdAt).toLocaleDateString('fr-FR')}</p>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                      p.status === 'SUCCESS' ? 'bg-green-100 text-green-700' :
                                      p.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>
                                      {p.status === 'SUCCESS' ? 'Payé' : p.status === 'PENDING' ? 'En attente' : 'Échoué'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div className="space-y-6">
                <h1 className="text-xl font-bold text-surface-900">Paiements</h1>

                {children.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {children.map((child: any) => (
                      <button key={child.id} onClick={() => setSelectedChild(child)}
                        className={`shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          selectedChild?.id === child.id
                            ? 'bg-accent-500 text-white'
                            : 'bg-white border border-surface-200 text-surface-600 hover:border-surface-300'
                        }`}>
                        {child.name}
                      </button>
                    ))}
                  </div>
                )}

                {selectedChild && (
                  <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
                    <div className="p-4 border-b border-surface-100 bg-surface-50">
                      <h3 className="font-bold text-surface-900 text-sm">Paiements de {selectedChild.name}</h3>
                    </div>
                    {loadingChildData ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="animate-spin text-surface-400" size={24} />
                      </div>
                    ) : childPayments.length === 0 ? (
                      <div className="p-8 text-center">
                        <CreditCard className="mx-auto text-surface-300 mb-2" size={40} />
                        <p className="text-surface-500 text-sm">Aucun paiement enregistré</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-surface-100">
                        {childPayments.map((p: any) => (
                          <div key={p.id} className="p-4 flex items-center justify-between hover:bg-surface-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                p.status === 'SUCCESS' ? 'bg-green-100' : p.status === 'PENDING' ? 'bg-amber-100' : 'bg-red-100'
                              }`}>
                                {p.status === 'SUCCESS' ? <CheckCircle size={16} className="text-green-600" /> :
                                 p.status === 'PENDING' ? <Clock size={16} className="text-amber-600" /> :
                                 <AlertCircle size={16} className="text-red-600" />}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-surface-900">{formatPrice(Number(p.amount))} FCFA</p>
                                <p className="text-xs text-surface-400">{p.course?.title || '—'} • {p.type === 'INSCRIPTION' ? 'Inscription' : 'Mensualité'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-surface-500">{new Date(p.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                p.status === 'SUCCESS' ? 'bg-green-100 text-green-700' :
                                p.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {p.status === 'SUCCESS' ? 'Payé' : p.status === 'PENDING' ? 'En attente' : 'Échoué'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifs' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-bold text-surface-900">Notifications</h1>
                  {notifications.some(n => !n.read) && (
                    <button onClick={handleMarkAllRead} className="text-xs text-accent-600 font-semibold hover:underline">
                      Tout marquer comme lu
                    </button>
                  )}
                </div>
                <div className="bg-white rounded-xl border border-surface-200 divide-y divide-surface-100">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="mx-auto text-surface-300 mb-2" size={40} />
                      <p className="text-surface-500 text-sm">Aucune notification</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`p-4 flex items-start gap-3 transition-colors ${!n.read ? 'bg-accent-50/50' : ''}`}>
                        <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!n.read ? 'bg-accent-500' : 'bg-transparent'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-surface-900">{n.title}</p>
                          <p className="text-xs text-surface-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-surface-400 mt-1">{new Date(n.createdAt).toLocaleDateString('fr-FR')}</p>
                        </div>
                        {!n.read && (
                          <button onClick={() => handleMarkRead(n.id)} className="text-xs text-accent-600 font-semibold hover:underline shrink-0">
                            Lu
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
