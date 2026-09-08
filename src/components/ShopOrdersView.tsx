import { useState, useEffect } from 'react';
import { fetchShopOrders, updateShopOrderStatus } from '../utils/api';
import { useToast } from './Toast';

export default function ShopOrdersView() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await fetchShopOrders();
      setOrders(data);
    } catch (e) {
      toast('error', 'Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateShopOrderStatus(id, status);
      toast('success', `Statut mis à jour : ${status}`);
      fetchOrders();
    } catch (e) {
      toast('error', 'Erreur lors de la mise à jour');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#002855]">Commandes Boutique</h2>
      </div>

      {loading ? <div className="text-center py-8">Chargement...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-100 text-sm text-gray-500">
                <th className="pb-3 font-semibold">Réf / Date</th>
                <th className="pb-3 font-semibold">Client</th>
                <th className="pb-3 font-semibold">Articles</th>
                <th className="pb-3 font-semibold">Total (FCFA)</th>
                <th className="pb-3 font-semibold">Statut</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3">
                    <div className="font-medium text-xs text-gray-500">{o.id.split('-')[0]}</div>
                    <div className="text-sm">{new Date(o.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="py-3">
                    <div className="font-bold text-gray-900">{o.customerName}</div>
                    <div className="text-xs text-gray-500">{o.customerEmail} | {o.customerPhone}</div>
                    <div className="text-xs text-gray-500">Ville: {o.city}</div>
                  </td>
                  <td className="py-3">
                    <ul className="text-sm text-gray-600 list-disc pl-4">
                      {o.items.map((item: any) => (
                        <li key={item.id}>{item.quantity}x {item.product?.title || 'Produit'}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-3 font-semibold text-[#FF6B00]">{o.totalAmount.toLocaleString()}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full 
                      ${o.status === 'PAID' ? 'bg-blue-100 text-blue-700' : 
                        o.status === 'PENDING' ? 'bg-orange-100 text-orange-700' : 
                        o.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 
                        o.status === 'SHIPPED' ? 'bg-purple-100 text-purple-700' : 
                        'bg-gray-100 text-gray-700'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <select 
                      value={o.status}
                      onChange={(e) => updateStatus(o.id, e.target.value)}
                      className="text-sm border rounded p-1 bg-white"
                    >
                      <option value="PENDING">En attente</option>
                      <option value="PAID">Payé</option>
                      <option value="PROCESSING">En traitement</option>
                      <option value="SHIPPED">Expédié</option>
                      <option value="DELIVERED">Livré</option>
                      <option value="CANCELLED">Annulé</option>
                    </select>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">Aucune commande</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
