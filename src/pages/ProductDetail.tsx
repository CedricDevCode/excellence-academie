import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Star, Truck, Shield, Clock, X, Package, ChevronLeft, ChevronRight, Menu as MenuIcon, User } from 'lucide-react';
import api, { fetchProductById } from '../utils/api';
import { addProductToCart, getCartCount, readCart, writeCart, type CartItem } from '../utils/cart';
import { openCartDrawer } from '../components/CartDrawer';
import type { Product } from './Shop';

const TYPE_LABELS: Record<string, string> = {
  DOCUMENT: 'Document',
  LIVRE: 'Livre',
  AUTRE: 'Autre',
};

interface ReviewData {
  id: string;
  rating: number;
  comment: string | null;
  user: { name: string | null };
  createdAt: string;
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>(() => readCart<CartItem>());
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  // Synchronisation du panier
  useEffect(() => {
    const syncCart = () => setCartItems(readCart<CartItem>());
    syncCart();

    window.addEventListener('shopCartUpdated', syncCart);
    return () => window.removeEventListener('shopCartUpdated', syncCart);
  }, []);

  const cartCount = getCartCount(cartItems);

  // Charger le produit
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchProductById(id)
      .then((p) => {
        setProduct(p);
        return api.get('/shop/products');
      })
      .then((res) => {
        const all: Product[] = res.data;
        setRelatedProducts(all.filter((p: Product) => p.id !== id).slice(0, 4));
      })
      .catch(() => navigate('/shop'))
      .finally(() => setLoading(false));
    api.get(`/shop/products/${id}/reviews`).then(res => {
      setReviews(res.data.reviews);
      setAvgRating(res.data.average);
      setReviewCount(res.data.count);
    }).catch(() => {});
  }, [id, navigate]);

  // Ajouter au panier
  const addToCart = () => {
    if (!product) return;

    const cartItem: CartItem = {
      ...product,
      quantity: 1
    };

    const nextCart = addProductToCart(cartItems, cartItem);
    writeCart(nextCart);
    setCartItems(nextCart);
    setAddedToCart(true);
    openCartDrawer();
    setTimeout(() => setAddedToCart(false), 2000);
  };

  // Récupérer les images du produit
  const getImgs = (): string[] => {
    if (!product?.imageUrl) return [];
    try {
      const parsed = JSON.parse(product.imageUrl);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
      return [product.imageUrl];
    } catch {
      return [product.imageUrl];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) return null;

  const imgs = getImgs();

  return (
    <div className="min-h-screen bg-gray-100 pb-12 animate-fadeIn">
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
            <Link to="/shop" className="text-xs font-semibold text-[#FF6B00] uppercase tracking-wide transition-colors">Boutique</Link>
          </div>
          <div className="hidden lg:flex items-center gap-4">
            <button onClick={openCartDrawer} className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer" title="Mon panier">
              <ShoppingCart size={22} className="text-[#002855]" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#FF6B00] text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full">{cartCount}</span>
              )}
            </button>
            <div className="text-right hidden xl:block">
              <div className="text-[9px] text-gray-400 uppercase font-bold">Appeler</div>
              <a href="tel:0747439443" className="text-[#FF6B00] font-bold text-xs">07 47 43 94 43</a>
            </div>
            <Link to="/student/login" className="px-3 py-1.5 text-xs font-bold rounded border border-[#002855] text-[#002855] hover:bg-[#002855] hover:text-white transition-colors">Espace Étudiant</Link>
            <Link to="/students/new" className="px-3 py-1.5 text-xs font-bold rounded bg-[#FF6B00] text-white hover:bg-[#e65c00] transition-colors">S'inscrire</Link>
          </div>
          <div className="flex items-center gap-1 lg:hidden">
            <button onClick={openCartDrawer} className="relative p-2 text-gray-700 hover:text-[#FF6B00] cursor-pointer" title="Mon panier">
              <ShoppingCart size={22} className="text-[#002855]" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#FF6B00] text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full">{cartCount}</span>
              )}
            </button>
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

      {/* Back link */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 mb-4">
        <Link to="/shop" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#FF6B00] transition-colors">
          <ChevronLeft size={16} /> Retour à la boutique
        </Link>
      </div>

      {/* Product Detail */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {/* Left: Images */}
              <div className="bg-gray-50 p-6 md:p-10">
                <div className="aspect-square rounded-xl overflow-hidden bg-white mb-4 flex items-center justify-center shadow-sm border border-gray-100">
                  {imgs[selectedImageIdx] ? (
                    <img src={imgs[selectedImageIdx]} alt={product.title} className="w-full h-full object-contain p-6" />
                  ) : (
                    <Package size={100} className="text-gray-200" />
                  )}
                </div>
                {imgs.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {imgs.map((img, i) => (
                      <button key={i} onClick={() => setSelectedImageIdx(i)}
                        className={`shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-all ${selectedImageIdx === i ? 'border-[#FF6B00] shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Details */}
              <div className="p-6 md:p-10 flex flex-col">
                {/* Breadcrumb */}
                <div className="text-xs text-gray-400 mb-4 flex items-center gap-1.5 flex-wrap">
                  <Link to="/" className="hover:text-[#FF6B00]">Accueil</Link>
                  <span>/</span>
                  <Link to="/shop" className="hover:text-[#FF6B00]">Boutique</Link>
                  <span>/</span>
                  <span className="text-gray-600">{TYPE_LABELS[product.type] || product.type}</span>
                </div>

                {/* Title */}
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug mb-3">
                  {product.title}
                </h1>

                {/* Rating */}
                <div className="flex items-center gap-1.5 mb-4">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} size={15} className={i <= Math.round(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">
                    {reviewCount > 0 ? `${avgRating.toFixed(1)} (${reviewCount} avis)` : '(0 avis)'}
                  </span>
                </div>

                {/* Price */}
                <div className="bg-orange-50 rounded-xl p-5 mb-5">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <div className="text-3xl md:text-4xl font-black text-[#FF6B00]">
                      {product.price.toLocaleString()} <span className="text-base font-normal">FCFA</span>
                    </div>
                    {product.originalPrice != null && product.originalPrice > product.price && (
                      <>
                        <span className="text-lg text-gray-400 line-through">
                          {product.originalPrice.toLocaleString()} FCFA
                        </span>
                        <span className="text-sm font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded">
                          -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                        </span>
                      </>
                    )}
                  </div>
                  {product.stock !== null && (
                    <div className="text-sm text-gray-500 mt-1.5">
                      {product.stock > 0 ? (
                        <span className="text-green-600 font-medium">{product.stock} disponible{product.stock > 1 ? 's' : ''}</span>
                      ) : (
                        <span className="text-red-500 font-medium">Rupture de stock</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Delivery info */}
                <div className="space-y-2.5 mb-6">
                  <div className="flex items-center gap-2.5 text-green-600">
                    <Truck size={18} />
                    <span className="font-medium text-sm">Livraison disponible dans toute la Côte d'Ivoire</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-gray-500">
                    <Shield size={18} />
                    <span className="text-sm">Paiement sécurisé via Mobile Money / Carte</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-gray-500">
                    <Clock size={18} />
                    <span className="text-sm">Retour gratuit sous 10 jours</span>
                  </div>
                </div>

                {/* Add to cart */}
                <button
                  onClick={addToCart}
                  className="w-full py-4 bg-[#FF6B00] text-white font-bold text-base rounded-xl hover:bg-[#e65c00] transition-colors shadow-lg shadow-orange-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingCart size={20} /> Ajouter au panier
                </button>

                {/* Toast confirmation */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${addedToCart ? 'max-h-12 opacity-100 mt-3' : 'max-h-0 opacity-0'
                    }`}
                >
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm font-medium">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Ajouté au panier
                  </div>
                </div>

                {/* Description */}
                {product.description && (
                  <div className="mt-8">
                    <h3 className="font-bold text-base text-gray-800 mb-3">Description du produit</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{product.description}</p>
                  </div>
                )}

                {/* Specs */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="font-bold text-base text-gray-800 mb-3">Caractéristiques</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-400">Type</span>
                      <p className="font-medium text-gray-700 text-sm">{TYPE_LABELS[product.type] || product.type}</p>
                    </div>
                    {product.originalPrice != null && product.originalPrice > product.price && (
                      <div>
                        <span className="text-xs text-gray-400">Réduction</span>
                        <p className="font-medium text-green-600 text-sm">-{Math.round((1 - product.price / product.originalPrice) * 100)}%</p>
                      </div>
                    )}
                    {product.stock !== null && (
                      <div>
                        <span className="text-xs text-gray-400">Stock</span>
                        <p className="font-medium text-gray-700 text-sm">{product.stock > 0 ? `${product.stock} unité(s)` : 'Épuisé'}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
      </div>

      {/* Reviews Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-[#002855]">Commentaires clients vérifiés</h2>
            {reviewCount > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} size={14} className={i <= Math.round(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} />
                  ))}
                </div>
                <span className="text-sm font-semibold text-gray-700">{avgRating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-8">
              <Star size={36} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm text-gray-500">Les clients ayant acheté ce produit n'ont pas encore émis d'avis.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map(r => (
                <div key={r.id} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                      <User size={14} className="text-gray-400" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{r.user?.name || 'Client'}</span>
                    <span className="text-[11px] text-gray-400">{new Date(r.createdAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div className="flex items-center gap-0.5 ml-9 mb-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} size={13} className={i <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} />
                    ))}
                  </div>
                  {r.comment && <p className="text-sm text-gray-600 ml-9">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-xl font-black text-[#002855]">Les clients ayant consulté cet article ont également regardé</h2>
              <p className="text-sm text-gray-500 mt-1">Découvrez d’autres produits qui pourraient vous plaire.</p>
            </div>
            <Link to="/shop" className="text-sm font-semibold text-[#FF6B00] hover:text-[#e65c00] flex items-center gap-1">
              Voir tout <ChevronRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {relatedProducts.map((rp) => {
              const img = (() => {
                if (!rp.imageUrl) return '';
                try { const p = JSON.parse(rp.imageUrl); return Array.isArray(p) ? p[0] || '' : rp.imageUrl; }
                catch { return rp.imageUrl; }
              })();
              return (
                <Link key={rp.id} to={`/shop/product/${rp.id}`} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow group">
                  <div className="aspect-square rounded-lg bg-gray-50 mb-3 flex items-center justify-center overflow-hidden">
                    {img ? (
                      <img src={img} alt={rp.title} className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform" />
                    ) : (
                      <Package size={40} className="text-gray-200" />
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-2">{rp.title}</h3>
                  <div className="text-[#FF6B00] font-black">{rp.price.toLocaleString()} <span className="text-xs font-normal">FCFA</span></div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}