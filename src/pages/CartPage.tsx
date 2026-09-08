import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, X, Plus, Minus, Trash2, Package, ChevronRight, ChevronLeft, Loader2, Truck, Menu as MenuIcon, CreditCard, Lock, Shield } from 'lucide-react';
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

export default function CartPage() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>(() => readCart<CartItem>());
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [navOpen, setNavOpen] = useState(false);
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
    if (currentUser) {
      navigate('/checkout');
    } else {
      navigate('/student/login?redirect=/checkout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
            <div className="text-right hidden xl:block">
              <div className="text-[9px] text-gray-400 uppercase font-bold">Appeler</div>
              <a href="tel:0747439443" className="text-[#FF6B00] font-bold text-xs">07 47 43 94 43</a>
            </div>
            <Link to="/student/login" className="px-3 py-1.5 text-xs font-bold rounded border border-[#002855] text-[#002855] hover:bg-[#002855] hover:text-white transition-colors">Espace Étudiant</Link>
            <Link to="/students/new" className="px-3 py-1.5 text-xs font-bold rounded bg-[#FF6B00] text-white hover:bg-[#e65c00] transition-colors">S'inscrire</Link>
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
            <Link to="/student/login" onClick={() => setNavOpen(false)} className="block text-sm font-bold text-center py-2 rounded border border-[#002855] text-[#002855]">Espace Étudiant</Link>
            <Link to="/students/new" onClick={() => setNavOpen(false)} className="block text-sm font-bold text-center py-2 rounded bg-[#FF6B00] text-white">S'inscrire</Link>
          </div>
        )}
      </nav>
      <div className="h-[60px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
          <Link to="/" className="hover:text-[#FF6B00]">Accueil</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-[#FF6B00]">Boutique</Link>
          <span>/</span>
          <span className="text-gray-600 font-medium">Panier</span>
        </div>

        <h1 className="text-2xl font-black text-[#002855] mb-6">Mon Panier ({count})</h1>

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
            <ShoppingCart size={64} className="mx-auto text-gray-200 mb-4" />
            <h2 className="text-xl font-bold text-gray-700 mb-2">Votre panier est vide</h2>
            <p className="text-gray-400 mb-6">Parcourez notre boutique et ajoutez des produits à votre panier.</p>
            <Link to="/shop" className="inline-block px-6 py-3 bg-[#FF6B00] text-white font-bold rounded-lg hover:bg-[#e65c00] transition-colors">
              Découvrir la boutique
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
            {/* Left: Cart Items */}
            <div className="space-y-3">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
                <input type="checkbox" checked={selectedItems.size === cartItems.length && cartItems.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 accent-[#FF6B00] rounded cursor-pointer" />
                <span className="text-sm font-medium text-gray-700">Tout sélectionner ({cartItems.length} article{cartItems.length > 1 ? 's' : ''})</span>
                <button onClick={() => { cartItems.forEach(i => removeItem(i.id)); }}
                  className="ml-auto text-sm text-red-500 hover:text-red-700 font-medium px-3 py-1 hover:bg-red-50 rounded-lg transition-colors">
                  Supprimer tout
                </button>
              </div>

              {cartItems.map(item => {
                const itemTotal = (item.price ?? 0) * item.quantity;
                const isSelected = selectedItems.has(item.id);
                return (
                  <div key={item.id}
                    className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 transition-all ${isSelected ? 'border-[#FF6B00] ring-1 ring-[#FF6B00]/20' : 'border-gray-100'}`}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(item.id)}
                      className="w-4 h-4 accent-[#FF6B00] rounded cursor-pointer shrink-0" />
                    <div className="w-24 h-24 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-gray-50">
                      {getProductImg(item.imageUrl) ? (
                        <img src={getProductImg(item.imageUrl)} alt={item.title} className="w-full h-full object-contain p-1" />
                      ) : (
                        <Package size={36} className="text-gray-200" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link to={`/shop/product/${item.id}`}
                        className="font-semibold text-gray-900 text-sm hover:text-[#FF6B00] transition-colors line-clamp-2 leading-snug">
                        {item.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg font-black text-[#FF6B00]">{(item.price ?? 0).toLocaleString()} FCFA</span>
                        {item.originalPrice && item.originalPrice > (item.price ?? 0) && (
                          <span className="text-xs text-gray-400 line-through">{item.originalPrice.toLocaleString()} FCFA</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="inline-flex items-center border border-gray-200 rounded-lg overflow-hidden">
                          <button onClick={() => updateQuantity(item.id, -1)}
                            className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                            <Minus size={14} />
                          </button>
                          <span className="px-4 py-1.5 text-sm font-semibold min-w-[32px] text-center bg-gray-50/50 border-x border-gray-200">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)}
                            className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
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
                  </div>
                );
              })}
            </div>

            {/* Right: Order Summary */}
            <div className="lg:sticky lg:top-24">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
                <h2 className="font-bold text-base text-gray-900 flex items-center gap-2">
                  <CreditCard size={18} className="text-[#FF6B00]" />
                  RÉSUMÉ DU PANIER
                </h2>

                <div className="flex justify-between text-sm text-gray-600">
                  <span>Sous-total ({selectedList.length} article{selectedList.length > 1 ? 's' : ''})</span>
                  <span className="font-semibold text-gray-900">{total.toLocaleString()} FCFA</span>
                </div>

                <div className="border-t border-gray-100 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-black text-[#FF6B00]">{total.toLocaleString()} FCFA</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {paymentMethods.map(m => (
                    <div key={m.id} className="flex items-center gap-1 px-2 py-1 rounded border border-gray-100 bg-gray-50">
                      {m.image ? (
                        <img src={m.image} alt={m.name} className="h-4 w-auto object-contain" />
                      ) : (
                        <span className="text-xs">{m.name === 'Mobile Money' ? '📱' : '💳'}</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1"><Shield size={12} /> Paiement sécurisé</span>
                  <span className="flex items-center gap-1"><Lock size={12} /> Données cryptées</span>
                </div>

                <button onClick={handleCommander} disabled={selectedList.length === 0}
                  className="w-full py-3.5 bg-[#FF6B00] text-white font-bold text-base rounded-xl hover:bg-[#e65c00] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-orange-200/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                  Commander ({total.toLocaleString()} FCFA)
                </button>

                {!currentUser && (
                  <p className="text-[11px] text-gray-400 text-center">
                    Vous serez invité à vous connecter ou créer un compte
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {suggested.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-[#002855]">Les clients ayant consulté cet article ont également regardé</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => scroll('left')}
                  className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-[#FF6B00] hover:text-[#FF6B00] transition-colors">
                  <ChevronLeft size={18} />
                </button>
                <button onClick={() => scroll('right')}
                  className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-[#FF6B00] hover:text-[#FF6B00] transition-colors">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
            <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {suggested.map((product: any) => {
                const img = getProductImg(product.imageUrl);
                return (
                  <div key={product.id} onClick={() => navigate(`/shop/product/${product.id}`)}
                    className="min-w-[160px] max-w-[160px] bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group shrink-0">
                    <div className="aspect-square bg-gray-50 flex items-center justify-center p-3">
                      {img ? (
                        <img src={img} alt={product.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                      ) : (
                        <Package size={36} className="text-gray-200" />
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{product.title}</h3>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm font-black text-[#FF6B00]">{product.price?.toLocaleString()} FCFA</span>
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
    </div>
  );
}
