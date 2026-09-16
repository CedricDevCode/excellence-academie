import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users, TrendingUp, DollarSign, GraduationCap, CheckCircle, CreditCard, BarChart3 } from 'lucide-react';
import { getMonthlyChartData } from '../components/admin/helpers';

function DashboardView({ apiStats }: { apiStats: any }) {
  const totalStudents = apiStats?.totalStudents || 0;
  const totalTeachers = apiStats?.totalTeachers || 0;
  const totalRevenue = apiStats?.totalRevenue || 0;
  const netProfit = apiStats?.netProfit || 0;
  const recentPayments = apiStats?.recentPayments || [];
  const financeEvolution = getMonthlyChartData(apiStats?.chartData || []);

  const stats = [
    { label: "Total étudiants", value: totalStudents, change: "Inscrits", icon: <Users size={22} />, color: "bg-[#0056B3]" },
    { label: "Total enseignants", value: totalTeachers, change: "Actifs", icon: <GraduationCap size={22} />, color: "bg-purple-600" },
    { label: "Revenus (FCFA)", value: totalRevenue.toLocaleString('fr-FR'), change: "Total", icon: <DollarSign size={22} />, color: "bg-green-500" },
    { label: "Bénéfice net", value: netProfit.toLocaleString('fr-FR'), change: "FCFA", icon: <TrendingUp size={22} />, color: "bg-[#FF6B00]" },
  ];

  const chartData = financeEvolution;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-11 h-11 ${s.color} rounded-xl flex items-center justify-center text-white`}>{s.icon}</div>
              <span className="text-gray-500 text-xs font-semibold bg-gray-50 px-2 py-1 rounded-full">{s.change}</span>
            </div>
            <div className="text-2xl font-black text-gray-900">{s.value}</div>
            <div className="text-gray-500 text-sm mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6">
          <h2 className="font-black text-gray-900 mb-6 flex items-center gap-2"><BarChart3 size={18} className="text-[#0056B3]" /> Évolution Financière</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" />
                <Bar dataKey="Revenus" fill="#10B981" radius={[4, 4, 0, 0]} barSize={40} />
                <Bar dataKey="Depenses" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="font-black text-gray-900 flex items-center gap-2"><CreditCard size={18} className="text-green-500" /> Paiements récents</h2>
          </div>
          <div className="p-4 space-y-4">
            {recentPayments.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Aucun paiement récent</p>
            ) : (
              recentPayments.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 shrink-0">
                    <CheckCircle size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm truncate">{p.user?.name || "Inconnu"}</div>
                    <div className="text-gray-400 text-xs">Statut : {p.status}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-black text-green-600 text-sm">+{p.amount} FCFA</div>
                    <div className="text-gray-400 text-xs">{new Date(p.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default DashboardView;
