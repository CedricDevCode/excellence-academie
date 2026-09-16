import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, X, ChevronLeft, MapPin, Phone, User, Lock, CreditCard, Shield, Package, AlertCircle, Bell, LogOut } from 'lucide-react';
import { Skeleton } from '@/components/ui';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Container from '@/components/ui/Container';
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
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const all = readCart<CartItem>();
    try {
      const selectedIds = JSON.parse(localStorage.getItem('shopSelectedItems') || '[]') as string[];
      if (selectedIds.length > 0) {
        return all.filter(item => selectedIds.includes(item.id));
      }
    } catch {}
    return all;
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
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
        localStorage.removeItem('shopSelectedItems');
        window.location.href = response.data.checkoutUrl;
      } else if (response.data.success && !response.data.checkoutUrl) {
        writeCart([]);
        localStorage.removeItem('shopSelectedItems');
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
      <div className="min-h-screen bg-surface-50">
        <div className="h-[80px]" />
        <Container size="narrow">
          <div className="py-6 space-y-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-56" />
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-40 w-full rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-96 w-full rounded-xl" />
            </div>
          </div>
        </Container>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <Card padding="lg" className="text-center max-w-md">
          <ShoppingCart size={48} className="mx-auto text-gray-200 mb-4" />
          <h2 className="text-lg font-bold text-gray-700 mb-2">Votre panier est vide</h2>
          <p className="text-gray-400 mb-6 text-sm">Ajoutez des produits depuis la boutique.</p>
          <Link to="/shop">
            <Button variant="accent" size="md">Retour à la boutique</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const handleLogout = async () => {
    await apiLogout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="h-[80px]" />

      <Container size="narrow">
        <div className="py-6">
          <Link to="/cart" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-accent-500 mb-4 transition-colors">
            <ChevronLeft size={16} /> Retour au panier
          </Link>

          <h1 className="text-2xl font-black text-primary-900 mb-6">Finaliser la commande</h1>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
              <div className="space-y-5">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <Card padding="md">
                    <h2 className="font-bold text-base text-gray-900 flex items-center gap-2 mb-4">
                      <MapPin size={18} className="text-accent-500" />
                      Adresse de livraison
                    </h2>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Ville *</label>
                        <input type="text" value={ville} onChange={e => setVille(e.target.value)} required placeholder="Ex: Abidjan"
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 transition-colors" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Adresse complète</label>
                        <input type="text" value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="Quartier, rue, numéro..."
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 transition-colors" />
                      </div>
                    </div>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <Card padding="md">
                    <h2 className="font-bold text-base text-gray-900 flex items-center gap-2 mb-4">
                      <Phone size={18} className="text-accent-500" />
                      Contact
                    </h2>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Téléphone *</label>
                        <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)} required placeholder="Ex: 07 01 02 03 04"
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 transition-colors" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Numéro WhatsApp (urgence)</label>
                        <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="Numéro à contacter en cas d'urgence"
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 transition-colors" />
                        <p className="text-[11px] text-gray-400 mt-1">Ce numéro sera utilisé pour vous contacter en cas de besoin</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <Card padding="md">
                    <h2 className="font-bold text-base text-gray-900 flex items-center gap-2 mb-4">
                      <CreditCard size={18} className="text-accent-500" />
                      Moyen de paiement
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {paymentMethods.map(m => (
                        <button key={m.id} type="button" onClick={() => setPaymentMethod(m.id)}
                          className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl border-2 text-xs font-semibold transition-all cursor-pointer ${paymentMethod === m.id ? 'border-accent-500 bg-accent-50 text-accent-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                          {m.image ? (
                            <img src={m.image} alt={m.name} className="h-8 w-auto object-contain mb-1" />
                          ) : (
                            <span className="text-lg mb-1">{m.name === 'Mobile Money' ? '📱' : '💳'}</span>
                          )}
                          <span>{m.name}</span>
                          {paymentMethod === m.id && (
                            <Badge variant="accent" size="sm" className="mt-1">Sélectionné</Badge>
                          )}
                        </button>
                      ))}
                    </div>
                  </Card>
                </motion.div>
              </div>

              <div className="lg:sticky lg:top-24">
                <Card padding="md" className="space-y-4">
                  <h2 className="font-bold text-base text-gray-900 flex items-center gap-2">
                    <ShoppingCart size={18} className="text-accent-500" />
                    Récapitulatif
                  </h2>

                  <div className="space-y-3">
                    {cartItems.map(item => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-surface-100 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-surface-200">
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
                      <span className="text-2xl font-black text-accent-500">{total.toLocaleString()} FCFA</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1"><Shield size={12} /> Paiement sécurisé</span>
                    <span className="flex items-center gap-1"><Lock size={12} /> Données cryptées</span>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-start gap-2 text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                    >
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    variant="accent"
                    size="lg"
                    className="w-full"
                    loading={submitting}
                    icon={submitting ? undefined : <Lock size={16} />}
                  >
                    {submitting ? 'Traitement...' : `Confirmer et payer ${total.toLocaleString()} FCFA`}
                  </Button>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </Container>
    </div>
  );
}
