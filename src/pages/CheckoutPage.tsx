import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, X, ChevronLeft, Loader2, MapPin, Phone, User, Lock, CreditCard, Shield, Truck, Menu as MenuIcon, Bell, LogOut, Package, AlertCircle, CheckCircle } from 'lucide-react';
import { getMe, logout as apiLogout } from '../utils/api';
import api from '../utils/api';
import { readCart, writeCart, type CartItem } from '../utils/cart';
import { paymentMethods } from '../utils/payment';

function getProductImg(imageUrl: string | null | undefined): string {
  if (!imageUrl) return '';
  try {
    const p = JSON.parse(imageUrl);
    if (Array.isArray(p)) return p[0] || '';
    return imageUrl;
  } catch {
    return imageUrl;
  }
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>(() => readCart<CartItem>());
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const [ville, setVille] = useState('');
  const [adresse, setAdresse] = useState('');
  const [telephone, setTelephone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  useEffect(() => {
    getMe()
      .then(user => {
        setUser(user);
        setVille(user.ville || '');
        setTelephone(user.telephone || '');
      })
      .catch(() => {
        navigate('/student/login?redirect=/checkout');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const total = cartItems.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0);
  const count = cartItems.reduce((s, i) => s + i.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!ville.trim()) { setError('Veuillez entrer votre ville.'); return; }
    if (!telephone.trim()) { setError('Veuillez entrer votre téléphone.'); return; }
    if (!paymentMethod) { setError('Veuillez sélectionner votre moyen de paiement.'); return; }

    setSubmitting(true);
    try {
      const response = await api.post('/shop/orders', {
        customerName: user?.name || '',
        customerEmail: user?.email || '',
        customerPhone: telephone,
        city: ville,
        adresse,
        whatsapp,
        paymentMethod,
        userId: user?.id,
        items: cartItems.map(item => ({ productId: item.id, quantity: item.quantity }))
      });

      if (response.data.success && response.data.checkoutUrl) {
        writeCart([]);
        window.location.href = response.data.checkoutUrl;
      } else if (response.data.success && !response.data.checkoutUrl) {
        writeCart([]);
        navigate('/my-orders');
      } else {
        setError('Erreur lors de la création de la commande.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center max-w-md">
          <ShoppingCart size={48} className="mx-auto text-gray-200 mb-4" />
          <h2 className="text-lg font-bold text-gray-700 mb-2">Votre panier est vide</h2>
          <p className="text-gray-400 mb-6 text-sm">Ajoutez des produits depuis la boutique.</p>
          <Link to="/shop" className="inline-block px-6 py-3 bg-[#FF6B00] text-white font-bold rounded-lg hover:bg-[#e65c00] transition-colors">
            Retour à la boutique
          </Link>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await apiLogout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="fixed w-full top-0 z-50 bg-white shadow-sm py-2 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/images/logo exacademy.jpeg" alt="Logo" className="w-10 h-10 object-contain rounded-md border border-gray-100" />
            <div>
              <div className="font-bold text-[#002855] leading-none text-sm md:text-base">EXCELLENCE ACADÉMIE</div>
              <div className="text-[10px] text-gray-500 uppercase font-semibold">Formation Concours</div>
            </div>
          </Link>
          <div className="hidden lg:flex items-center gap-6">
            <Link to="/" className="text-xs font-semibold text-gray-600 hover:text-[#FF6B00] uppercase tracking-wide transition-colors">Accueil</Link>
            <a href="/#actualite" className="text-xs font-semibold text-gray-600 hover:text-[#FF6B00] uppercase tracking-wide transition-colors">Actualité</a>
            <a href="/#atouts" className="text-xs font-semibold text-gray-600 hover:text-[#FF6B00] uppercase tracking-wide transition-colors">L'École</a>
            <a href="/#formations" className="text-xs font-semibold text-gray-600 hover:text-[#FF6B00] uppercase tracking-wide transition-colors">Formations</a>
            <a href="/#tarifs" className="text-xs font-semibold text-gray-600 hover:text-[#FF6B00] uppercase tracking-wide transition-colors">Tarifs</a>
            <Link to="/shop" className="text-xs font-semibold text-[#FF6B00] uppercase tracking-wide transition-colors">Boutique</Link>
          </div>
          <div className="hidden lg:flex items-center gap-4">
            <Link to="/cart" className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ShoppingCart size={22} className="text-[#002855]" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#FF6B00] text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full">{count}</span>
              )}
            </Link>
            <span className="text-gray-200">|</span>
            <div ref={notifRef} className="relative">
              <button type="button" onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 cursor-pointer">
                <Bell size={20} />
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 py-3 z-50">
                  <div className="px-4 pb-2 border-b border-gray-100">
                    <p className="text-sm font-bold text-gray-900">Notifications</p>
                  </div>
                  <div className="px-4 py-6 text-center">
                    <Bell size={28} className="mx-auto text-gray-200 mb-2" />
                    <p className="text-xs text-gray-400">Aucune notification</p>
                  </div>
                </div>
              )}
            </div>
            <span className="text-gray-200">|</span>
            <div className="text-right hidden xl:block">
              <div className="text-[9px] text-gray-400 uppercase font-bold">Appeler</div>
              <a href="tel:0747439443" className="text-[#FF6B00] font-bold text-xs">07 47 43 94 43</a>
            </div>
            <div ref={userMenuRef} className="relative">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-9 h-9 rounded-full bg-[#FF6B00] text-white font-bold text-sm flex items-center justify-center hover:bg-[#e65c00] transition-colors cursor-pointer">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || user?.email}</p>
                    <p className="text-[11px] text-gray-400">{user?.email}</p>
                  </div>
                  <Link to="/student/dashboard" onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <User size={16} className="text-gray-400" /> Mon profil
                  </Link>
                  <Link to="/my-orders" onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <Package size={16} className="text-gray-400" /> Mes commandes
                  </Link>
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left cursor-pointer">
                      <LogOut size={16} /> Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 lg:hidden">
            <Link to="/cart" className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ShoppingCart size={22} className="text-[#002855]" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#FF6B00] text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full">{count}</span>
              )}
            </Link>
            <button className="text-gray-600" onClick={() => setNavOpen(!navOpen)}>
              {navOpen ? <X size={24} /> : <MenuIcon size={24} />}
            </button>
          </div>
        </div>
        {navOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
            <Link to="/" onClick={() => setNavOpen(false)} className="block text-sm font-semibold text-gray-600 hover:text-[#FF6B00]">Accueil</Link>
            <a href="/#actualite" onClick={() => setNavOpen(false)} className="block text-sm font-semibold text-gray-600 hover:text-[#FF6B00]">Actualité</a>
            <a href="/#atouts" onClick={() => setNavOpen(false)} className="block text-sm font-semibold text-gray-600 hover:text-[#FF6B00]">L'École</a>
            <a href="/#formations" onClick={() => setNavOpen(false)} className="block text-sm font-semibold text-gray-600 hover:text-[#FF6B00]">Formations</a>
            <a href="/#tarifs" onClick={() => setNavOpen(false)} className="block text-sm font-semibold text-gray-600 hover:text-[#FF6B00]">Tarifs</a>
            <Link to="/shop" onClick={() => setNavOpen(false)} className="block text-sm font-semibold text-[#FF6B00]">Boutique</Link>
            <hr className="border-gray-100" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#FF6B00] text-white font-bold text-xs flex items-center justify-center">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="text-sm">
                <p className="font-semibold text-gray-900 truncate">{user?.name || 'Utilisateur'}</p>
                <Link to="/student/dashboard" className="text-[#FF6B00] text-xs font-medium">Mon profil</Link>
              </div>
            </div>
            <Link to="/student/login" onClick={() => setNavOpen(false)} className="block text-sm font-bold text-center py-2 rounded border border-[#002855] text-[#002855]">Espace Étudiant</Link>
            <Link to="/students/new" onClick={() => setNavOpen(false)} className="block text-sm font-bold text-center py-2 rounded bg-[#FF6B00] text-white">S'inscrire</Link>
          </div>
        )}
      </nav>
      <div className="h-[60px]" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <Link to="/cart" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#FF6B00] mb-4 transition-colors">
          <ChevronLeft size={16} /> Retour au panier
        </Link>

        <h1 className="text-2xl font-black text-[#002855] mb-6">Finaliser la commande</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
            {/* Left: Delivery form */}
            <div className="space-y-5">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-bold text-base text-gray-900 flex items-center gap-2 mb-4">
                  <MapPin size={18} className="text-[#FF6B00]" />
                  Adresse de livraison
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Ville *</label>
                    <input type="text" value={ville} onChange={e => setVille(e.target.value)} required placeholder="Ex: Abidjan"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30 focus:border-[#FF6B00]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Adresse complète</label>
                    <input type="text" value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="Quartier, rue, numéro..."
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30 focus:border-[#FF6B00]" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-bold text-base text-gray-900 flex items-center gap-2 mb-4">
                  <Phone size={18} className="text-[#FF6B00]" />
                  Contact
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Téléphone *</label>
                    <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)} required placeholder="Ex: 07 01 02 03 04"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30 focus:border-[#FF6B00]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Numéro WhatsApp (urgence)</label>
                    <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="Numéro à contacter en cas d'urgence"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30 focus:border-[#FF6B00]" />
                    <p className="text-[11px] text-gray-400 mt-1">Ce numéro sera utilisé pour vous contacter en cas de besoin</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-bold text-base text-gray-900 flex items-center gap-2 mb-4">
                  <CreditCard size={18} className="text-[#FF6B00]" />
                  Moyen de paiement
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {paymentMethods.map(m => (
                    <button key={m.id} type="button" onClick={() => setPaymentMethod(m.id)}
                      className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl border-2 text-xs font-semibold transition-all cursor-pointer ${paymentMethod === m.id ? 'border-[#FF6B00] bg-orange-50 text-[#FF6B00]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      {m.image ? (
                        <img src={m.image} alt={m.name} className="h-8 w-auto object-contain mb-1" />
                      ) : (
                        <span className="text-lg mb-1">{m.name === 'Mobile Money' ? '📱' : '💳'}</span>
                      )}
                      <span>{m.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Order Summary */}
            <div className="lg:sticky lg:top-24">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
                <h2 className="font-bold text-base text-gray-900 flex items-center gap-2">
                  <ShoppingCart size={18} className="text-[#FF6B00]" />
                  Récapitulatif
                </h2>

                <div className="space-y-3">
                  {cartItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-gray-50">
                        {getProductImg(item.imageUrl) ? (
                          <img src={getProductImg(item.imageUrl)} alt={item.title} className="w-full h-full object-contain" />
                        ) : (
                          <ShoppingCart size={18} className="text-gray-200" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 line-clamp-1">{item.title}</p>
                        <p className="text-[11px] text-gray-400">x{item.quantity}</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 shrink-0">{((item.price ?? 0) * item.quantity).toLocaleString()} F</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Sous-total</span>
                    <span className="font-semibold text-gray-900">{total.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Livraison</span>
                    <span className={total >= 30000 ? 'text-green-600 font-semibold' : 'text-gray-900'}>
                      {total >= 30000 ? 'Gratuite' : 'À calculer'}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-black text-[#FF6B00]">{total.toLocaleString()} FCFA</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1"><Shield size={12} /> Paiement sécurisé</span>
                  <span className="flex items-center gap-1"><Lock size={12} /> Données cryptées</span>
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button type="submit" disabled={submitting}
                  className="w-full py-3.5 bg-[#FF6B00] text-white font-bold text-base rounded-xl hover:bg-[#e65c00] transition-colors shadow-lg shadow-orange-200/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2">
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Lock size={16} />}
                  {submitting ? 'Traitement...' : `Confirmer et payer ${total.toLocaleString()} FCFA`}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
