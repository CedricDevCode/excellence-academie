import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X, Plus, Minus, Trash2, Package, ChevronRight, ChevronLeft, Truck, CreditCard, Lock, Shield } from 'lucide-react';
import { Skeleton } from '@/components/ui';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Container from '@/components/ui/Container';
import { getMe } from '../utils/api';
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

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: 'easeOut' as const },
  }),
  exit: { opacity: 0, x: -60, transition: { duration: 0.25 } },
};

export default function CartPage() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>(() => readCart<CartItem>());
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(cartItems.map(i => i.id)));
  const [suggested, setSuggested] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  useEffect(() => {
    getMe()
      .then(user => setCurrentUser(user))
      .catch(() => setCurrentUser(null))
      .finally(() => setLoading(false));

    api.get('/shop/products').then(res => {
      setSuggested(res.data.sort(() => Math.random() - 0.5));
    }).catch(() => {});
  }, []);

  const updateQuantity = (id: string, delta: number) => {
    setCartItems(prev => {
      const next = prev.map(item =>
        item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
      );
      writeCart(next);
      return next;
    });
  };

  const removeItem = (id: string) => {
    setCartItems(prev => {
      const next = prev.filter(item => item.id !== id);
      writeCart(next);
      return next;
    });
    setSelectedItems(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === cartItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(cartItems.map(i => i.id)));
    }
  };

  const selectedList = useMemo(() => cartItems.filter(i => selectedItems.has(i.id)), [cartItems, selectedItems]);
  const total = selectedList.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0);
  const count = cartItems.reduce((s, i) => s + i.quantity, 0);

  const handleCommander = () => {
    if (selectedList.length === 0) return;
    localStorage.setItem('shopSelectedItems', JSON.stringify(Array.from(selectedItems)));
    if (currentUser) {
      navigate('/checkout');
    } else {
      navigate('/student/login?redirect=/checkout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50">
        <div className="h-[80px]" />
        <Container>
          <div className="py-6 space-y-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-32 w-full rounded" />
                ))}
              </div>
              <Skeleton className="h-80 w-full rounded" />
            </div>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="h-[80px]" />

      <Container>
        <div className="py-6">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
            <Link to="/" className="hover:text-accent-500">Accueil</Link>
            <span>/</span>
            <Link to="/shop" className="hover:text-accent-500">Boutique</Link>
            <span>/</span>
            <span className="text-gray-600 font-medium">Panier</span>
          </div>

          <h1 className="text-2xl font-black text-primary-900 mb-6">Mon Panier ({count})</h1>

          {cartItems.length === 0 ? (
            <Card padding="lg">
              <div className="text-center py-12">
                <ShoppingCart size={64} className="mx-auto text-gray-200 mb-4" />
                <h2 className="text-xl font-bold text-gray-700 mb-2">Votre panier est vide</h2>
                <p className="text-gray-400 mb-6">Parcourez notre boutique et ajoutez des produits à votre panier.</p>
                <Link to="/shop">
                  <Button variant="accent" size="lg">Découvrir la boutique</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
              <div className="space-y-3">
                <Card padding="sm" className="flex items-center gap-3">
                  <input type="checkbox" checked={selectedItems.size === cartItems.length && cartItems.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 accent-accent-500 rounded cursor-pointer" />
                  <span className="text-sm font-medium text-gray-700">Tout sélectionner ({cartItems.length} article{cartItems.length > 1 ? 's' : ''})</span>
                  <button onClick={() => { cartItems.forEach(i => removeItem(i.id)); }}
                    className="ml-auto text-sm text-red-500 hover:text-red-700 font-medium px-3 py-1 hover:bg-red-50 rounded-lg transition-colors">
                    Supprimer tout
                  </button>
                </Card>

                <AnimatePresence mode="popLayout">
                  {cartItems.map((item, index) => {
                    const itemTotal = (item.price ?? 0) * item.quantity;
                    const isSelected = selectedItems.has(item.id);
                    return (
                      <motion.div
                        key={item.id}
                        custom={index}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                      >
                        <Card
                          padding="md"
                          className={`flex items-center gap-4 transition-all ${isSelected ? 'border-accent-500 ring-1 ring-accent-500/20' : ''}`}
                        >
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(item.id)}
                            className="w-4 h-4 accent-accent-500 rounded cursor-pointer shrink-0" />
                          <div className="w-24 h-24 bg-surface-100 rounded overflow-hidden flex items-center justify-center shrink-0 border border-surface-200">
                            {getProductImg(item.imageUrl) ? (
                              <img src={getProductImg(item.imageUrl)} alt={item.title} className="w-full h-full object-contain p-1" />
                            ) : (
                              <Package size={36} className="text-gray-200" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link to={`/shop/product/${item.id}`}
                              className="font-semibold text-gray-900 text-sm hover:text-accent-500 transition-colors line-clamp-2 leading-snug">
                              {item.title}
                            </Link>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-lg font-black text-accent-500">{(item.price ?? 0).toLocaleString()} FCFA</span>
                              {item.originalPrice && item.originalPrice > (item.price ?? 0) && (
                                <span className="text-xs text-gray-400 line-through">{item.originalPrice.toLocaleString()} FCFA</span>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              <div className="inline-flex items-center border border-gray-200 rounded-lg overflow-hidden">
                                <button onClick={() => updateQuantity(item.id, -1)}
                                  className="px-2.5 py-1.5 text-gray-500 hover:bg-surface-50 hover:text-gray-700 transition-colors">
                                  <Minus size={14} />
                                </button>
                                <span className="px-4 py-1.5 text-sm font-semibold min-w-[32px] text-center bg-surface-50 border-x border-gray-200">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1)}
                                  className="px-2.5 py-1.5 text-gray-500 hover:bg-surface-50 hover:text-gray-700 transition-colors">
                                  <Plus size={14} />
                                </button>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-gray-900">{itemTotal.toLocaleString()} FCFA</span>
                                <button onClick={() => removeItem(item.id)}
                                  className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              <div className="lg:sticky lg:top-24">
                <Card padding="md" className="space-y-4">
                  <h2 className="font-bold text-base text-gray-900 flex items-center gap-2">
                    <CreditCard size={18} className="text-accent-500" />
                    RÉSUMÉ DU PANIER
                  </h2>

                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Sous-total ({selectedList.length} article{selectedList.length > 1 ? 's' : ''})</span>
                    <span className="font-semibold text-gray-900">{total.toLocaleString()} FCFA</span>
                  </div>

                  <div className="border-t border-gray-100 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <span className="text-2xl font-black text-accent-500">{total.toLocaleString()} FCFA</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {paymentMethods.map(m => (
                      <Badge key={m.id} variant="gray" size="sm">
                        {m.image ? (
                          <img src={m.image} alt={m.name} className="h-4 w-auto object-contain" />
                        ) : (
                          <span className="text-xs">{m.name === 'Mobile Money' ? '📱' : '💳'}</span>
                        )}
                        {m.name}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1"><Shield size={12} /> Paiement sécurisé</span>
                    <span className="flex items-center gap-1"><Lock size={12} /> Données cryptées</span>
                  </div>

                  <Button
                    variant="accent"
                    size="lg"
                    className="w-full"
                    onClick={handleCommander}
                    disabled={selectedList.length === 0}
                  >
                    Commander ({total.toLocaleString()} FCFA)
                  </Button>

                  {!currentUser && (
                    <p className="text-[11px] text-gray-400 text-center">
                      Vous serez invité à vous connecter ou créer un compte
                    </p>
                  )}
                </Card>
              </div>
            </div>
          )}

          {suggested.length > 0 && (
            <div className="mt-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-primary-900">Les clients ayant consulté cet article ont également regardé</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => scroll('left')}
                    className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-accent-500 hover:text-accent-500 transition-colors">
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={() => scroll('right')}
                    className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-accent-500 hover:text-accent-500 transition-colors">
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
              <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {suggested.map((product: any) => {
                  const img = getProductImg(product.imageUrl);
                  return (
                    <div key={product.id} onClick={() => navigate(`/shop/product/${product.id}`)}
                      className="min-w-[160px] max-w-[160px] bg-white rounded border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group shrink-0">
                      <div className="aspect-square bg-surface-100 flex items-center justify-center p-3">
                        {img ? (
                          <img src={img} alt={product.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                        ) : (
                          <Package size={36} className="text-gray-200" />
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{product.title}</h3>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-sm font-black text-accent-500">{product.price?.toLocaleString()} FCFA</span>
                          {product.originalPrice && product.originalPrice > product.price ? (
                            <span className="text-[11px] text-gray-400 line-through">{product.originalPrice.toLocaleString()} FCFA</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
