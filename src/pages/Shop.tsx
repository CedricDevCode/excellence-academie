import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, X, Search, Star, Package, Menu as MenuIcon, Zap, ChevronRight, ChevronLeft, Phone, Store, BookOpen, FileText } from 'lucide-react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../utils/api';
import { addProductToCart, getCartCount, readCart, writeCart } from '../utils/cart';
import { openCartDrawer } from '../components/CartDrawer';

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number | null;
  type: string;
  imageUrl: string;
  stock: number | null;
}

interface ShopCartItem extends Product {
  quantity: number;
}

interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  backgroundColor: string;
  badgeText?: string;
  featured: boolean;
  displayOrder: number;
  product?: Product | null;
}

const TYPE_LABELS: Record<string, string> = {
  DOCUMENT: 'Document',
  LIVRE: 'Livre',
  AUTRE: 'Autre',
};

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

function getAllImgs(imageUrl: string | null | undefined): string[] {
  if (!imageUrl) return [];
  try {
    const p = JSON.parse(imageUrl);
    if (Array.isArray(p)) return p.filter(Boolean);
    return [imageUrl];
  } catch {
    return [imageUrl];
  }
}

export default function Shop() {
  const navigate = useNavigate();
  const location = useLocation();
  const { type: urlCategory } = useParams<{ type?: string }>();
  const isCategoryView = !!urlCategory;
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [cart, setCart] = useState<ShopCartItem[]>(() => readCart<ShopCartItem>());
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState<string>(urlCategory?.toUpperCase() || 'ALL');
  const [bannerIdx, setBannerIdx] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const [showVendorPopup, setShowVendorPopup] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchProducts(),
      !isCategoryView && fetchBanners()
    ]).finally(() => setLoading(false));

    const syncCart = () => setCart(readCart<ShopCartItem>());
    syncCart();

    window.addEventListener('shopCartUpdated', syncCart);

    return () => window.removeEventListener('shopCartUpdated', syncCart);
  }, []);

  useEffect(() => {
    setActiveType(urlCategory ? urlCategory.toUpperCase() : 'ALL');
  }, [urlCategory]);

  useEffect(() => {
    writeCart(cart);
  }, [cart]);

  useEffect(() => {
    if (banners.length === 0) return;
    const t = setInterval(() => {
      setBannerIdx(i => (i + 1) % Math.max(1, banners.length));
    }, 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/shop/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products', error);
    }
  };

  const fetchBanners = async () => {
    try {
      const response = await api.get('/banners/public');
      setBanners(response.data);
    } catch (error) {
      console.error('Failed to fetch banners', error);
    }
  };

  const types = useMemo(() => {
    const set = new Set(products.map(p => p.type));
    return ['ALL', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = activeType === 'ALL' || p.type === activeType;
      return matchesSearch && matchesType;
    });
  }, [products, searchQuery, activeType]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const next = addProductToCart(prev, { ...product, quantity: 1 } as ShopCartItem);
      writeCart(next);
      return next;
    });
    openCartDrawer();
  };

  const cartCount = getCartCount(cart);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 pt-20 pb-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Chargement de la boutique...</p>
      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-gray-100 pb-12 animate-fadeIn">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeInUp 0.5s ease-out forwards; }
        .animate-fadeIn-cart { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Navbar */}
      <nav className="fixed w-full top-0 z-50 bg-white shadow-md py-2 border-b border-gray-100">
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
          </div>
          <div className="hidden lg:flex items-center gap-4">
            <div className="text-right hidden xl:block">
              <div className="text-[9px] text-gray-400 uppercase font-bold">Appeler</div>
              <a href="tel:0747439443" className="text-[#FF6B00] font-bold text-xs">07 47 43 94 43</a>
            </div>
            <Link to="/student/login" className="px-3 py-1.5 text-xs font-bold rounded border border-[#002855] text-[#002855] hover:bg-[#002855] hover:text-white transition-colors">Espace Étudiant</Link>
            <Link to="/students/new" className="px-3 py-1.5 text-xs font-bold rounded bg-[#FF6B00] text-white hover:bg-[#e65c00] transition-colors">S'inscrire</Link>
          </div>
          <button className="lg:hidden text-gray-600" onClick={() => setNavOpen(!navOpen)}>
            {navOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>
        {navOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
            <Link to="/" onClick={() => setNavOpen(false)} className="block text-sm font-semibold text-gray-600 hover:text-[#FF6B00]">Accueil</Link>
            <a href="/#actualite" onClick={() => setNavOpen(false)} className="block text-sm font-semibold text-gray-600 hover:text-[#FF6B00]">Actualité</a>
            <a href="/#atouts" onClick={() => setNavOpen(false)} className="block text-sm font-semibold text-gray-600 hover:text-[#FF6B00]">L'École</a>
            <a href="/#formations" onClick={() => setNavOpen(false)} className="block text-sm font-semibold text-gray-600 hover:text-[#FF6B00]">Formations</a>
            <a href="/#tarifs" onClick={() => setNavOpen(false)} className="block text-sm font-semibold text-gray-600 hover:text-[#FF6B00]">Tarifs</a>
            <hr className="border-gray-100" />
            <Link to="/student/login" onClick={() => setNavOpen(false)} className="block text-sm font-bold text-center py-2 rounded border border-[#002855] text-[#002855]">Espace Étudiant</Link>
            <Link to="/students/new" onClick={() => setNavOpen(false)} className="block text-sm font-bold text-center py-2 rounded bg-[#FF6B00] text-white">S'inscrire</Link>
          </div>
        )}
      </nav>

      <div className="h-[60px]" />

      {/* Search bar - TOP (always visible) */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher un produit..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent" />
            </div>
            <Link to="/cart" className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ShoppingCart size={22} className="text-[#002855]" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#FF6B00] text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full">{cartCount}</span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {!isCategoryView && (
        <>
          {/* Main hero row: Categories | Carousel | Quick links */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-3">
            <div className="flex gap-3">

              {/* LEFT - Categories block */}
              <div className="hidden lg:block w-[200px] shrink-0">
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="px-4 py-3 bg-[#002855] text-white font-bold text-sm flex items-center gap-2">
                    <MenuIcon size={16} /> Catégories
                  </div>
                  <div className="divide-y divide-gray-100">
                    {[
                      { key: 'ALL', icon: Zap, label: 'Tous les produits', path: '/shop' },
                      { key: 'PACK', icon: Package, label: 'Packs', path: '/shop/c/pack' },
                      { key: 'DOCUMENT', icon: FileText, label: 'Documents', path: '/shop/c/document' },
                      { key: 'LIVRE', icon: BookOpen, label: 'Livres', path: '/shop/c/livre' },
                      { key: 'AUTRE', icon: ShoppingCart, label: 'Autres', path: '/shop/c/autre' },
                    ].map(({ key, icon: Icon, label, path }) => (
                      <button key={key} onClick={() => navigate(path)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors text-left ${
                          activeType === key
                            ? 'bg-[#FFF0E6] text-[#FF6B00] font-bold'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}>
                        <Icon size={16} className={activeType === key ? 'text-[#FF6B00]' : 'text-gray-400'} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* CENTER - Carousel */}
              <div className="flex-1 min-w-0">
                {banners.length > 0 && (
                  <div className="relative overflow-hidden rounded-lg shadow-md group/carousel">
                    <div className="relative min-h-[300px] md:min-h-[340px]">
                      {banners.map((banner, idx) => {
                        const imgSrc = banner.imageUrl || getProductImg(banner.product?.imageUrl);
                        return (
                          <div key={banner.id}
                            className={`absolute inset-0 bg-linear-to-r ${banner.backgroundColor} text-white transition-all duration-1000 ease-in-out ${
                              idx === bannerIdx ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
                            }`}>
                            <div className="h-full px-6 md:px-10">
                              <div className="grid grid-cols-1 md:grid-cols-2 items-center min-h-[300px] md:min-h-[340px] gap-4 py-6">
                                <div className="space-y-3 z-10">
                                  <div>
                                    <span className="inline-block px-3 py-1 bg-yellow-300/30 backdrop-blur-sm rounded-full text-xs font-bold uppercase tracking-wide text-yellow-300">
                                      {banner.badgeText || 'Promotion'}
                                    </span>
                                  </div>
                                  <h2 className="text-xl md:text-3xl font-black leading-tight">{banner.title}</h2>
                                  {banner.subtitle && <p className="text-sm md:text-lg font-semibold text-white/90">{banner.subtitle}</p>}
                                  {banner.description && <p className="text-xs md:text-sm text-white/80 leading-relaxed max-w-md">{banner.description}</p>}
                                  {banner.product && (
                                    <div className="flex items-baseline gap-3 flex-wrap">
                                      <span className="text-xl md:text-2xl font-black text-yellow-300">{banner.product.price.toLocaleString()} FCFA</span>
                                      {banner.product.originalPrice && (
                                        <span className="text-xs md:text-sm text-white/60 line-through">{banner.product.originalPrice.toLocaleString()} FCFA</span>
                                      )}
                                    </div>
                                  )}
                                  <button onClick={() => banner.product ? navigate(`/shop/product/${banner.product.id}`) : window.scrollTo(0, 400)}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#FF6B00] font-bold rounded-lg hover:bg-gray-50 transition-all hover:scale-105 text-xs md:text-sm shadow-lg">
                                    {banner.product ? 'Voir le produit' : 'Découvrir'} <ChevronRight size={16} />
                                  </button>
                                </div>
                                <div className="flex justify-center md:justify-end items-center">
                                  {imgSrc ? (
                                    <img src={imgSrc} alt={banner.title}
                                      className={`max-w-full max-h-48 md:max-h-64 object-contain drop-shadow-2xl transition-all duration-1000 delay-200 ${
                                        idx === bannerIdx ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                                      }`} />
                                  ) : (
                                    <div className="w-36 h-36 bg-white/10 rounded-2xl flex items-center justify-center">
                                      <Package size={60} className="text-white/30" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Arrows */}
                    {banners.length > 1 && (
                      <>
                        <button onClick={() => setBannerIdx(i => (i - 1 + banners.length) % banners.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/30 text-white flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 hover:bg-black/50 transition-all duration-300 backdrop-blur-sm">
                          <ChevronLeft size={20} />
                        </button>
                        <button onClick={() => setBannerIdx(i => (i + 1) % banners.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/30 text-white flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 hover:bg-black/50 transition-all duration-300 backdrop-blur-sm">
                          <ChevronRight size={20} />
                        </button>
                      </>
                    )}

                    {/* Dots */}
                    {banners.length > 1 && (
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
                        {banners.map((_, idx) => (
                          <button key={idx} onClick={() => setBannerIdx(idx)}
                            className={`rounded-full transition-all duration-300 ${
                              idx === bannerIdx
                                ? 'bg-white w-5 h-2'
                                : 'bg-white/50 w-2 h-2 hover:bg-white/70'
                            }`} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT - Quick links */}
              <div className="hidden lg:flex flex-col gap-3 w-[200px] shrink-0">
                <a href="tel:0747439443"
                  className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center justify-center gap-2 hover:shadow-lg transition-shadow group">
                  <div className="w-12 h-12 rounded-full bg-[#FFF0E6] flex items-center justify-center group-hover:bg-[#FF6B00] transition-colors">
                    <Phone size={22} className="text-[#FF6B00] group-hover:text-white transition-colors" />
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-sm text-[#002855]">Appeler pour commander</div>
                    <div className="text-xs text-gray-500 mt-0.5">07 47 43 94 43</div>
                  </div>
                </a>
                <button onClick={() => setShowVendorPopup(true)}
                  className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center justify-center gap-2 hover:shadow-lg transition-shadow group">
                  <div className="w-12 h-12 rounded-full bg-[#FFF0E6] flex items-center justify-center group-hover:bg-[#FF6B00] transition-colors">
                    <Store size={22} className="text-[#FF6B00] group-hover:text-white transition-colors" />
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-sm text-[#002855]">Vendre sur Exacademy</div>
                    <div className="text-xs text-gray-500 mt-0.5">Devenez partenaire</div>
                  </div>
                </button>
              </div>

            </div>
          </div>
        </>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">

        {/* Category header (only in category view) */}
        {isCategoryView && (
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
            <button onClick={() => navigate('/shop')}
              className="text-sm text-gray-500 hover:text-[#FF6B00] transition-colors flex items-center gap-1">
              <ChevronLeft size={16} /> Boutique
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-bold text-[#002855]">
              {TYPE_LABELS[urlCategory!.toUpperCase()] || urlCategory}
            </span>
          </div>
        )}

        {/* Product Grid - with smooth animate on filter */}
        {filteredProducts.length === 0 ? (
          <div key={activeType + searchQuery} className="text-center py-16 bg-white rounded-xl shadow-sm animate-fadeIn">
            <Package size={48} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">Aucun produit trouvé</p>
            <p className="text-gray-400 text-sm mt-1">Essayez de modifier vos filtres</p>
          </div>
        ) : (
          <div key={activeType + searchQuery}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
              {filteredProducts.map((product, index) => {
                const imgs = getAllImgs(product.imageUrl);
                const hasDiscount = product.originalPrice != null && product.originalPrice > product.price;
                const discountPercent = hasDiscount ? Math.round((1 - product.price / product.originalPrice!) * 100) : 0;
                const maxStock = Math.max(...products.map(p => p.stock ?? 0), 1);
                const stockRatio = product.stock !== null ? Math.min(1, product.stock / maxStock) : null;
                const itemDelay = index * 60;
                return (
                <div key={product.id} onClick={() => navigate(`/shop/product/${product.id}`)}
                  className="bg-white rounded-lg border border-gray-100 overflow-hidden flex flex-col hover:shadow-md group cursor-pointer transition-all duration-200"
                  style={{ animation: `fadeInUp 0.5s ease-out ${itemDelay}ms both` }}>
                  {/* Image */}
                  <div className="relative w-full aspect-square bg-gray-50 overflow-hidden">
                    {imgs[0] ? (
                      <img src={imgs[0]} alt={product.title} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package size={36} className="text-gray-200" /></div>
                    )}
                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {hasDiscount && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-sm bg-[#FF6B00] text-white shadow-sm">
                          -{discountPercent}%
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-white/90 text-gray-700 shadow-sm border border-gray-100">
                        {TYPE_LABELS[product.type] || product.type}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-2.5 flex flex-col flex-1 gap-1">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
                      {product.title}
                    </h3>
                    {/* Price */}
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-black text-base text-[#FF6B00]">
                        {product.price.toLocaleString()} <span className="text-xs font-medium">FCFA</span>
                      </span>
                      {hasDiscount && (
                        <span className="text-xs text-gray-400 line-through">
                          {product.originalPrice!.toLocaleString()} FCFA
                        </span>
                      )}
                    </div>
                    {/* Stock bar */}
                    {product.stock !== null && product.stock > 0 && (
                      <div className="mt-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#FF6B00] mb-0.5">
                          <span>{product.stock} disponible{product.stock > 1 ? 's' : ''}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#FF6B00] rounded-full transition-all" style={{ width: `${stockRatio! * 100}%` }} />
                        </div>
                      </div>
                    )}
                    {/* Add to cart button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                      className="w-full mt-1.5 py-1.5 bg-[#FF6B00] hover:bg-[#e65c00] text-white font-bold text-xs rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ShoppingCart size={13} className="text-white" /> Ajouter
                    </button>
                  </div>
                </div>
                );
              })}
          </div>
          </div>
        )}
      </div>

      {/* Vendor popup */}
      {showVendorPopup && (
        <div className="fixed inset-0 z-70 flex items-center justify-center animate-fadeIn-cart">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowVendorPopup(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 mx-4 max-w-sm w-full text-center">
            <button onClick={() => setShowVendorPopup(false)}
              className="absolute top-3 right-3 p-1 hover:bg-gray-100 rounded-full transition-colors">
              <X size={18} />
            </button>
            <div className="w-16 h-16 rounded-full bg-[#FFF0E6] flex items-center justify-center mx-auto mb-4">
              <Store size={28} className="text-[#FF6B00]" />
            </div>
            <h3 className="text-lg font-black text-[#002855] mb-2">Bientôt disponible</h3>
            <p className="text-sm text-gray-500 mb-6">La fonction "Vendre sur Exacademy" sera bientôt disponible. Restez à l'écoute !</p>
            <button onClick={() => setShowVendorPopup(false)}
              className="px-6 py-2.5 bg-[#FF6B00] text-white font-bold rounded-lg hover:bg-[#e65c00] transition-colors text-sm">
              D'accord
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

