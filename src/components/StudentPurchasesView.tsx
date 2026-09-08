import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Package, Truck, CheckCircle, Clock, XCircle, ShoppingBag } from 'lucide-react';

const STATUS_FLOW: Record<string, { label: string; icon: any; textClass: string; bgClass: string; step: number }> = {
  PENDING: { label: 'En attente', icon: Clock, textClass: 'text-orange-500', bgClass: 'bg-orange-100', step: 1 },
  PAID: { label: 'Payée', icon: CheckCircle, textClass: 'text-blue-500', bgClass: 'bg-blue-100', step: 2 },
  SHIPPED: { label: 'Expédiée', icon: Truck, textClass: 'text-purple-500', bgClass: 'bg-purple-100', step: 3 },
  DELIVERED: { label: 'Livrée', icon: Package, textClass: 'text-green-500', bgClass: 'bg-green-100', step: 4 },
  CANCELLED: { label: 'Annulée', icon: XCircle, textClass: 'text-red-500', bgClass: 'bg-red-100', step: 0 },
};

function OrderTimeline({ status }: { status: string }) {
  const steps = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED'];
  const currentStep = steps.indexOf(status);

  return (
    <div className="flex items-center gap-1 my-3">
      {steps.map((s, i) => {
        const st = STATUS_FLOW[s];
        const isActive = i <= currentStep;
        const isLast = i === steps.length - 1;
        return (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-1.5 ${isActive ? st.textClass : 'text-gray-300'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isActive ? 'bg-current bg-opacity-10' : 'bg-gray-100'}`}>
                <st.icon size={12} />
              </div>
              <span className={`text-[10px] font-semibold ${isActive ? '' : 'text-gray-400'}`}>{st.label}</span>
            </div>
            {!isLast && <div className={`flex-1 h-0.5 ${i < currentStep ? 'bg-green-400' : 'bg-gray-200'}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function StudentPurchasesView() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/shop/my-orders');
      setOrders(res.data);
    } catch (e) {
      setError('Erreur lors du chargement de vos achats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Chargement...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-700 mb-2">Mes commandes</h2>
        <p className="text-gray-500">Vous n'avez pas encore effectué d'achat dans la boutique.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-[#002855]">Mes commandes</h2>
        <p className="text-sm text-gray-500 mt-1">Suivez l'état de vos achats en temps réel.</p>
      </div>
      {error && <div className="text-red-500 bg-red-50 p-3 rounded-lg">{error}</div>}
      {orders.map(order => {
        const statusInfo = STATUS_FLOW[order.status] || STATUS_FLOW.PENDING;
        const StatusIcon = statusInfo.icon;
        const isExpanded = expandedId === order.id;

        return (
          <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button onClick={() => setExpandedId(isExpanded ? null : order.id)} className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors text-left">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${statusInfo.bgClass} flex items-center justify-center`}>
                  <StatusIcon size={20} className={statusInfo.textClass} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">Commande #{order.id.split('-')[0]}</span>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${statusInfo.bgClass} ${statusInfo.textClass}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} • {order.totalAmount.toLocaleString()} FCFA
                  </div>
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                <OrderTimeline status={order.status} />

                <div className="mt-4 space-y-2">
                  <h4 className="font-semibold text-sm text-gray-700">Articles commandés</h4>
                  <div className="divide-y divide-gray-50">
                    {order.items.map((item: any) => (
                      <div key={item.id} className="flex justify-between py-2 text-sm">
                        <span className="text-gray-600">{item.quantity}x {item.product?.title || 'Produit'}</span>
                        <span className="font-semibold text-gray-900">{(item.priceAtTime * item.quantity).toLocaleString()} F</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-100">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="font-black text-[#FF6B00]">{order.totalAmount.toLocaleString()} FCFA</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
                  <div><span className="font-semibold">Nom :</span> {order.customerName}</div>
                  <div><span className="font-semibold">Email :</span> {order.customerEmail}</div>
                  <div><span className="font-semibold">Téléphone :</span> {order.customerPhone}</div>
                  <div><span className="font-semibold">Ville :</span> {order.city}</div>
                  <div><span className="font-semibold">Paiement :</span> {order.paymentMethod || 'Non spécifié'}</div>
                  <div><span className="font-semibold">Réf. paiement :</span> {order.geniusPayReference || '—'}</div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}