import React, { useState, useEffect } from 'react';
import { ShoppingCart, X, Plus, Minus, Trash2, ArrowRight, BookOpen, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { readCart, writeCart, type CartItem } from '../utils/cart';
import { cn } from '@/utils/cn';

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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setIsOpen(false)}
          />

          {/* Slide-over panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-surface-50 z-50 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-surface-200 flex items-center justify-between bg-surface-100/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded bg-primary-500/10 text-primary-500 flex items-center justify-center">
                  <ShoppingCart size={18} />
                </div>
                <div className="flex items-center gap-2">
                  <div>
                    <h3 className="font-bold text-surface-900 text-base leading-tight">Mon Panier</h3>
                    <p className="text-xs text-surface-500">{totalCount} {totalCount > 1 ? 'articles' : 'article'}</p>
                  </div>
                  <motion.span
                    key={totalCount}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary-500 text-[#3a2600] text-[10px] font-bold"
                  >
                    {totalCount}
                  </motion.span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-200/70 flex items-center justify-center text-surface-500 transition-colors"
                aria-label="Fermer le panier"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-primary-500/10 text-primary-500 flex items-center justify-center mb-4">
                    <ShoppingCart size={28} />
                  </div>
                  <p className="text-surface-900 font-semibold text-base mb-1">Votre panier est vide</p>
                  <p className="text-surface-500 text-xs max-w-xs mb-6">
                    Explorez nos livres, manuels et supports pédagogiques pour préparer vos concours.
                  </p>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      navigate('/shop');
                    }}
                    className="px-5 py-2.5 rounded bg-primary-500 text-[#3a2600] text-xs font-bold hover:bg-primary-400 transition-colors"
                  >
                    Découvrir la boutique
                  </button>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 100, transition: { duration: 0.2 } }}
                      transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                      className="flex items-center gap-3 p-3 rounded border border-surface-200 hover:border-surface-300 transition-colors bg-white shadow-xs"
                    >
                      {/* Thumbnail */}
                      <div className="w-14 h-16 rounded-lg bg-surface-100 overflow-hidden shrink-0 flex items-center justify-center border border-surface-200">
                        {item.imageUrl ? (
                          <img
                            src={(() => { try { return item.imageUrl.startsWith('[') ? JSON.parse(item.imageUrl)[0] : item.imageUrl; } catch { return item.imageUrl; } })()}
                            alt={item.title || 'Produit'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <BookOpen size={20} className="text-surface-400" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-surface-900 truncate leading-tight">
                          {item.title || 'Support de cours'}
                        </h4>
                        <div className="text-[11px] font-bold text-accent-500 mt-0.5">
                          {((item.price || 0) * (item.quantity || 1)).toLocaleString('fr-FR')} FCFA
                        </div>

                        {/* Quantity controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center border border-surface-200 rounded-lg overflow-hidden bg-surface-50">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-6 h-6 flex items-center justify-center text-surface-600 hover:bg-surface-200 transition-colors"
                              aria-label="Diminuer la quantité"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-7 text-center text-xs font-semibold text-surface-800">
                              {item.quantity || 1}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-6 h-6 flex items-center justify-center text-surface-600 hover:bg-surface-200 transition-colors"
                              aria-label="Augmenter la quantité"
                            >
                              <Plus size={12} />
                            </button>
                          </div>

                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-surface-400 hover:text-red-500 p-1 transition-colors"
                            aria-label="Supprimer du panier"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer with subtotal and checkout */}
            {items.length > 0 && (
              <div className="p-4 sm:p-5 border-t border-surface-200 bg-surface-100/50 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-surface-600 font-medium">Sous-total :</span>
                  <span className="text-lg font-black text-primary-700">
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
                    className="w-full py-3 px-4 rounded bg-accent-500 hover:bg-accent-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-primary-500/20 transition-all hover:translate-y-[-1px]"
                  >
                    <span>Commander maintenant</span>
                    <ArrowRight size={14} />
                  </button>

                  <button
                    onClick={handleViewCart}
                    className="w-full py-2 px-4 rounded border border-surface-300 text-surface-700 font-semibold text-xs hover:bg-white transition-colors text-center"
                  >
                    Voir le panier complet
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
