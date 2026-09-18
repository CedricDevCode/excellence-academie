import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, X, Search, Star, Package, Menu as MenuIcon, Zap, ChevronRight, ChevronLeft, Phone, Store, BookOpen, FileText } from 'lucide-react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton, Card, Badge, Button, Container } from '@/components/ui';
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
      <div className="min-h-screen bg-surface-50 pt-20 pb-12">
        <div className="h-[80px]" />
        <Container>
          <div className="mb-6">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded border border-gray-100 overflow-hidden">
                <Skeleton className="aspect-square rounded-none" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-full rounded" />
                </div>
              </div>
            ))}
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 pb-12">
      <style>{`
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="h-[80px]" />

      {/* Search bar */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <Container>
          <div className="flex items-center gap-4 py-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher un produit..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all" />
            </div>
            <Link to="/cart" className="relative p-2 hover:bg-surface-50 rounded transition-colors">
              <ShoppingCart size={22} className="text-primary-600" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full">{cartCount}</span>
              )}
            </Link>
          </div>
        </Container>
      </div>

      {!isCategoryView && (
        <>
          {/* Main hero row: Categories | Carousel | Quick links */}
          <Container className="mt-3">
            <div className="flex gap-3">

              {/* LEFT - Categories block */}
              <div className="hidden lg:block w-[200px] shrink-0">
                <Card padding="none" className="overflow-hidden">
                  <div className="px-4 py-3 bg-primary-800 text-white font-bold text-sm flex items-center gap-2">
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
                            ? 'bg-primary-50 text-primary-600 font-bold'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}>
                        <Icon size={16} className={activeType === key ? 'text-primary-500' : 'text-gray-400'} />
                        {label}
                      </button>
                    ))}
                  </div>
                </Card>
              </div>

              {/* CENTER - Carousel */}
              <div className="flex-1 min-w-0">
                {banners.length > 0 && (
                  <div className="relative overflow-hidden rounded shadow-card group/carousel">
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
                                    <Badge variant="warning" size="md" className="backdrop-blur-sm">
                                      {banner.badgeText || 'Promotion'}
                                    </Badge>
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
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-accent-600 font-bold rounded hover:bg-gray-50 transition-all hover:scale-105 text-xs md:text-sm shadow-lg">
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
                                    <div className="w-36 h-36 bg-white/10 rounded flex items-center justify-center">
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
                          aria-label="Bannière précédente"
                          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/30 text-white flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 hover:bg-black/50 transition-all duration-300 backdrop-blur-sm">
                          <ChevronLeft size={20} />
                        </button>
                        <button onClick={() => setBannerIdx(i => (i + 1) % banners.length)}
                          aria-label="Bannière suivante"
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
                            aria-label={`Aller à la bannière ${idx + 1}`}
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
                  className="bg-white rounded shadow-card p-4 flex flex-col items-center justify-center gap-2 hover:shadow-card-hover transition-all group border border-gray-100">
                  <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center group-hover:bg-primary-500 transition-colors">
                    <Phone size={22} className="text-primary-500 group-hover:text-white transition-colors" />
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-sm text-primary-700">Appeler pour commander</div>
                    <div className="text-xs text-gray-500 mt-0.5">07 47 43 94 43</div>
                  </div>
                </a>
                <button onClick={() => setShowVendorPopup(true)}
                  className="bg-white rounded shadow-card p-4 flex flex-col items-center justify-center gap-2 hover:shadow-card-hover transition-all group border border-gray-100">
                  <div className="w-12 h-12 rounded-full bg-accent-50 flex items-center justify-center group-hover:bg-accent-500 transition-colors">
                    <Store size={22} className="text-accent-500 group-hover:text-white transition-colors" />
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-sm text-primary-700">Vendre sur Exacademy</div>
                    <div className="text-xs text-gray-500 mt-0.5">Devenez partenaire</div>
                  </div>
                </button>
              </div>

            </div>
          </Container>
        </>
      )}

      <Container className="mt-4">

        {/* Category header (only in category view) */}
        {isCategoryView && (
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
            <button onClick={() => navigate('/shop')}
              className="text-sm text-gray-500 hover:text-primary-500 transition-colors flex items-center gap-1">
              <ChevronLeft size={16} /> Boutique
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-bold text-primary-700">
              {TYPE_LABELS[urlCategory!.toUpperCase()] || urlCategory}
            </span>
          </div>
        )}

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div key={activeType + searchQuery} className="text-center py-16 bg-white rounded shadow-card">
            <Package size={48} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">Aucun produit trouvé</p>
            <p className="text-gray-400 text-sm mt-1">Essayez de modifier vos filtres</p>
          </div>
        ) : (
          <div key={activeType + searchQuery}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
              <AnimatePresence mode="popLayout">
                {filteredProducts.map((product, index) => {
                  const imgs = getAllImgs(product.imageUrl);
                  const hasDiscount = product.originalPrice != null && product.originalPrice > product.price;
                  const discountPercent = hasDiscount ? Math.round((1 - product.price / product.originalPrice!) * 100) : 0;
                  const maxStock = Math.max(...products.map(p => p.stock ?? 0), 1);
                  const stockRatio = product.stock !== null ? Math.min(1, product.stock / maxStock) : null;
                  return (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <motion.div
                        whileHover={{ y: -4, scale: 1.02 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        onClick={() => navigate(`/shop/product/${product.id}`)}
                        className="bg-white rounded border border-gray-100 overflow-hidden flex flex-col shadow-card hover:shadow-card-hover cursor-pointer transition-shadow duration-300 h-full"
                      >
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
                              <Badge variant="accent" size="sm">
                                -{discountPercent}%
                              </Badge>
                            )}
                            <Badge variant="gray" size="sm">
                              {TYPE_LABELS[product.type] || product.type}
                            </Badge>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-2.5 flex flex-col flex-1 gap-1">
                          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
                            {product.title}
                          </h3>
                          {/* Price */}
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="font-black text-base text-surface-900">
                              {product.price.toLocaleString()} <span className="text-xs font-medium text-surface-500">FCFA</span>
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
                              <div className="flex items-center gap-1.5 text-xs font-bold text-accent-500 mb-0.5">
                                <span>{product.stock} disponible{product.stock > 1 ? 's' : ''}</span>
                              </div>
                              <div className="w-full h-2 bg-surface-50 rounded-full overflow-hidden">
                                <div className="h-full bg-accent-500 rounded-full transition-all" style={{ width: `${stockRatio! * 100}%` }} />
                              </div>
                            </div>
                          )}
                          {/* Add to cart button */}
                          <Button
                            variant="accent"
                            size="sm"
                            icon={<ShoppingCart size={13} />}
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); addToCart(product); }}
                            className="w-full mt-1.5"
                          >
                            Ajouter
                          </Button>
                        </div>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
          </div>
          </div>
        )}
      </Container>

      {/* Vendor popup */}
      <AnimatePresence>
        {showVendorPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-70 flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowVendorPopup(false)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative bg-white rounded shadow-2xl p-8 mx-4 max-w-sm w-full text-center"
            >
              <button onClick={() => setShowVendorPopup(false)}
                className="absolute top-3 right-3 p-1 hover:bg-surface-50 rounded-full transition-colors">
                <X size={18} />
              </button>
              <div className="w-16 h-16 rounded-full bg-accent-50 flex items-center justify-center mx-auto mb-4">
                <Store size={28} className="text-accent-500" />
              </div>
              <h3 className="text-lg font-black text-primary-700 mb-2">Bientôt disponible</h3>
              <p className="text-sm text-gray-500 mb-6">La fonction "Vendre sur Exacademy" sera bientôt disponible. Restez à l'écoute !</p>
              <Button variant="accent" onClick={() => setShowVendorPopup(false)}>
                D'accord
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
