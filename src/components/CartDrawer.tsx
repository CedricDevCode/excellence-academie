import React, { useState, useEffect } from 'react';
import { ShoppingCart, X, Plus, Minus, Trash2, ArrowRight, BookOpen, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { readCart, writeCart, type CartItem } from '../utils/cart';

export const openCartDrawer = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('openCartDrawer'));
  }
};

export default function CartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<CartItem[]>(() => readCart<CartItem>());
  const navigate = useNavigate();

  useEffect(() => {
    const handleCartUpdate = () => {
      setItems(readCart<CartItem>());
    };

    const handleOpen = () => {
      setItems(readCart<CartItem>());
      setIsOpen(true);
    };

    window.addEventListener('shopCartUpdated', handleCartUpdate);
    window.addEventListener('openCartDrawer', handleOpen);

    return () => {
      window.removeEventListener('shopCartUpdated', handleCartUpdate);
      window.removeEventListener('openCartDrawer', handleOpen);
    };
  }, []);

  const totalAmount = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
  const totalCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

  const updateQuantity = (id: string, delta: number) => {
    const updated = items
      .map(item => {
        if (item.id === id) {
          const newQty = (item.quantity || 1) + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      })
      .filter(Boolean) as CartItem[];

    setItems(updated);
    writeCart(updated);
  };

  const removeItem = (id: string) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    writeCart(updated);
  };

  const handleCheckout = () => {
    setIsOpen(false);
    navigate('/checkout');
  };

  const handleViewCart = () => {
    setIsOpen(false);
    navigate('/cart');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Slide-over panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0056B3]/10 text-[#0056B3] flex items-center justify-center">
              <ShoppingCart size={18} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base leading-tight">Mon Panier</h3>
              <p className="text-xs text-gray-500">{totalCount} {totalCount > 1 ? 'articles' : 'article'}</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-full hover:bg-gray-200/70 flex items-center justify-center text-gray-500 transition-colors"
            aria-label="Fermer le panier"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-[#0056B3] flex items-center justify-center mb-4">
                <ShoppingCart size={28} />
              </div>
              <p className="text-gray-800 font-semibold text-base mb-1">Votre panier est vide</p>
              <p className="text-gray-500 text-xs max-w-xs mb-6">
                Explorez nos livres, manuels et supports pédagogiques pour préparer vos concours.
              </p>
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/shop');
                }}
                className="px-5 py-2.5 rounded-xl bg-[#0056B3] text-white text-xs font-bold hover:bg-[#004494] transition-colors shadow-sm"
              >
                Découvrir la boutique
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors bg-white shadow-xs"
              >
                {/* Thumbnail */}
                <div className="w-14 h-16 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center border border-gray-100">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl.startsWith('[') ? JSON.parse(item.imageUrl)[0] : item.imageUrl}
                      alt={item.title || 'Produit'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <BookOpen size={20} className="text-gray-400" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-gray-900 truncate leading-tight">
                    {item.title || 'Support de cours'}
                  </h4>
                  <div className="text-[11px] font-bold text-[#FF6B00] mt-0.5">
                    {((item.price || 0) * (item.quantity || 1)).toLocaleString('fr-FR')} FCFA
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                        aria-label="Diminuer la quantité"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-7 text-center text-xs font-semibold text-gray-800">
                        {item.quantity || 1}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                        aria-label="Augmenter la quantité"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with subtotal and checkout */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/50 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 font-medium">Sous-total :</span>
              <span className="text-lg font-black text-[#002855]">
                {totalAmount.toLocaleString('fr-FR')} FCFA
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-green-700 bg-green-50 p-2 rounded-lg">
              <ShieldCheck size={14} className="shrink-0" />
              <span>Livraison disponible partout en Côte d'Ivoire</span>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={handleCheckout}
                className="w-full py-3 px-4 rounded-xl bg-[#FF6B00] hover:bg-[#e65c00] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 transition-all hover:translate-y-[-1px]"
              >
                <span>Commander maintenant</span>
                <ArrowRight size={14} />
              </button>

              <button
                onClick={handleViewCart}
                className="w-full py-2 px-4 rounded-xl border border-gray-300 text-gray-700 font-semibold text-xs hover:bg-white transition-colors text-center"
              >
                Voir le panier complet
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
