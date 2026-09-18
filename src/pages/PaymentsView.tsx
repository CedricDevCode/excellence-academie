import { useState, useEffect } from 'react';
import { CreditCard, Search, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { fetchPayments } from '../utils/api';
import LoadingSpinner from '../components/admin/LoadingSpinner';

function PaymentsView() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchPayment, setSearchPayment] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    fetchPayments()
      .then(setPayments)
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredPayments = payments.filter((p) => {
    const paymentDate = new Date(p.createdAt);
    if (fromDate) {
      const from = new Date(fromDate);
      if (paymentDate < from) return false;
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      if (paymentDate > to) return false;
    }
    const query = `${p.user?.name || ''} ${p.user?.email || ''} ${p.geniusPayReference || ''} ${p.status || ''} ${p.amount}`.toLowerCase();
    return query.includes(searchPayment.toLowerCase());
  });

  if (loading) return <LoadingSpinner />;

  const statusColors: Record<string, string> = {
    SUCCESS: 'bg-green-50 text-green-700',
    PENDING: 'bg-yellow-50 text-yellow-700',
    FAILED: 'bg-red-50 text-red-700',
  };

  return (
    <div className="bg-white rounded shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-black text-gray-900 flex items-center gap-2">
          <CreditCard size={18} className="text-green-500" /> Tous les paiements
          <span className="ml-2 bg-green-50 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{payments.length}</span>
        </h2>
      </div>
      <div className="p-6 border-b border-gray-100">
        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.85fr]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchPayment}
              onChange={e => setSearchPayment(e.target.value)}
              placeholder="Rechercher nom, email, référence ou statut..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none transition-colors"
            />
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none transition-colors"
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">{filteredPayments.length} paiement(s) affiché(s) sur {payments.length}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Étudiant</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Montant</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Statut</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Référence</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredPayments.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm">Aucun paiement ne correspond aux filtres</td></tr>
            ) : (
              filteredPayments.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">
                        {p.user?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{p.user?.name || 'Inconnu'}</div>
                        <div className="text-gray-400 text-xs">{p.user?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-black text-gray-900 text-sm">{Number(p.amount).toLocaleString('fr-FR')} FCFA</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[p.status] || 'bg-gray-50 text-gray-600'}`}>
                      {p.status === 'SUCCESS' && <CheckCircle size={12} />}
                      {p.status === 'PENDING' && <Clock size={12} />}
                      {p.status === 'FAILED' && <AlertCircle size={12} />}
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs font-mono">{p.geniusPayReference || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{new Date(p.createdAt).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PaymentsView;
