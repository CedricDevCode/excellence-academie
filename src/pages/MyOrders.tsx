import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Loader2, Clock, ChevronDown, X, Star } from 'lucide-react';
import api, { getMe } from '../utils/api';

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

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  PAID: 'Payée',
  PROCESSING: 'En cours',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'text-amber-600 bg-amber-50 border-amber-200',
  PAID: 'text-green-600 bg-green-50 border-green-200',
  PROCESSING: 'text-primary-600 bg-primary-50 border-primary-200',
  SHIPPED: 'text-accent-700 bg-accent-50 border-accent-200',
  DELIVERED: 'text-green-700 bg-green-100 border-green-300',
  CANCELLED: 'text-red-600 bg-red-50 border-red-200',
};

export default function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [reviewModal, setReviewModal] = useState<{ productId: string; productTitle: string } | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const redirecting = useRef(false);

  useEffect(() => {
    if (redirecting.current) return;
    getMe()
      .then(() => api.get('/shop/my-orders'))
      .then(res => setOrders(res.data))
      .catch(() => {
        if (!redirecting.current) {
          redirecting.current = true;
          navigate('/student/login?redirect=/my-orders');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const submitReview = async () => {
    if (!reviewModal || reviewRating < 1) return;
    setSubmittingReview(true);
    try {
      await api.post(`/shop/products/${reviewModal.productId}/reviews`, {
        rating: reviewRating,
        comment: reviewComment.trim() || undefined
      });
      setReviewModal(null);
      setReviewRating(0);
      setReviewComment('');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erreur lors de l\'envoi de l\'avis');
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter.toUpperCase());

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
          <Link to="/" className="hover:text-primary-600">Accueil</Link>
          <span>/</span>
          <span className="text-gray-600 font-medium">Mes commandes</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-[#7a4b00]">Mes commandes</h1>
            <p className="text-sm text-gray-500">{orders.length} commande{orders.length > 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { val: 'all', label: 'Toutes' },
              { val: 'PENDING', label: 'En attente' },
              { val: 'PAID', label: 'Payées' },
              { val: 'SHIPPED', label: 'Expédiées' },
              { val: 'DELIVERED', label: 'Livrées' },
            ].map(f => (
              <button key={f.val} onClick={() => setFilter(f.val)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${filter === f.val ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-600'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded border border-gray-100 shadow-sm p-12 text-center">
            <Package size={48} className="mx-auto text-gray-200 mb-4" />
            <h2 className="text-lg font-bold text-gray-700 mb-2">Aucune commande</h2>
            <p className="text-gray-400 mb-6 text-sm">Vous n'avez pas encore passé de commande.</p>
            <Link to="/shop" className="inline-block px-6 py-3 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 transition-colors">
              Découvrir la boutique
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map(order => (
              <div key={order.id} className="bg-white rounded border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 font-mono">#{order.id.slice(0, 8)}</span>
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[order.status] || 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-black text-primary-600">{order.totalAmount?.toLocaleString()} FCFA</span>
                      <button onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                        className="text-gray-400 hover:text-primary-600 transition-colors cursor-pointer">
                        <ChevronDown size={18} className={`transition-transform ${expandedOrder === order.id ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Clock size={12} /> {new Date(order.createdAt).toLocaleDateString('fr-FR')}</span>
                    <span>{order.items?.length || 0} article{(order.items?.length || 0) > 1 ? 's' : ''}</span>
                    <span>{order.paymentMethod}</span>
                  </div>

                  {expandedOrder === order.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                      {order.items?.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-gray-50">
                            {item.product?.imageUrl ? (
                              <img src={getProductImg(item.product.imageUrl)} alt={item.product.title} className="w-full h-full object-contain" />
                            ) : (
                              <Package size={20} className="text-gray-200" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{item.product?.title || 'Produit'}</p>
                            <p className="text-xs text-gray-400">x{item.quantity} · {item.priceAtTime?.toLocaleString()} FCFA</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">{(item.priceAtTime * item.quantity).toLocaleString()} F</span>
                            {order.status === 'DELIVERED' && (
                              <button onClick={() => setReviewModal({ productId: item.productId, productTitle: item.product?.title || 'Produit' })}
                                className="text-[11px] font-semibold text-primary-600 border border-primary-600 rounded-lg px-2.5 py-1 hover:bg-primary-50 transition-colors cursor-pointer">
                                Noter
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {order.city && (
                        <div className="text-xs text-gray-500 pt-2 border-t border-gray-50">
                          <span className="font-medium">Livraison :</span> {order.city}{order.adresse ? `, ${order.adresse}` : ''} · {order.customerPhone}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 animate-fadeIn" onClick={() => !submittingReview && setReviewModal(null)}>
          <div className="bg-white rounded shadow-2xl border border-gray-100 p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Noter ce produit</h3>
              <button onClick={() => setReviewModal(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer" aria-label="Fermer">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4 line-clamp-1">{reviewModal.productTitle}</p>
            <div className="flex items-center justify-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map(i => (
                <button key={i} type="button" onClick={() => setReviewRating(i)}
                  aria-label={`${i} étoile${i > 1 ? 's' : ''}`}
                  className={`p-1 transition-all cursor-pointer ${i <= reviewRating ? 'scale-110' : ''}`}>
                  <Star size={28} className={i <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} />
                </button>
              ))}
            </div>
            <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)}
              placeholder="Votre commentaire (optionnel)..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-600 resize-none mb-4" rows={3} />
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            <button onClick={submitReview} disabled={submittingReview || reviewRating < 1}
              className="w-full py-3 bg-primary-600 text-white font-bold rounded hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2">
              {submittingReview ? <Loader2 size={18} className="animate-spin" /> : <Star size={16} />}
              {submittingReview ? 'Envoi...' : 'Envoyer mon avis'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 z-[100] bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded shadow-lg flex items-center gap-2 max-w-sm">
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600 cursor-pointer"><X size={16} /></button>
        </div>
      )}
    </div>
  );
}
