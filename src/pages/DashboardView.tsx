import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, TrendingUp, DollarSign, GraduationCap, CreditCard, BarChart3, Wallet, ArrowDownCircle } from 'lucide-react';
import { getMonthlyChartData } from '../components/admin/helpers';

function DashboardView({ apiStats }: { apiStats: any }) {
  const totalStudents = apiStats?.totalStudents || 0;
  const totalTeachers = apiStats?.totalTeachers || 0;
  const totalRevenue = Number(apiStats?.totalRevenue || 0);
  const totalExpenses = Number(apiStats?.totalExpenses || 0);
  const netProfit = Number(apiStats?.netProfit || 0);
  const recentPayments = apiStats?.recentPayments || [];
  const financeEvolution = getMonthlyChartData(apiStats?.chartData || []);
  const currentYear = new Date().getFullYear();

  const stats = [
    {
      label: "Étudiants inscrits",
      value: totalStudents.toLocaleString('fr-FR'),
      sub: "Comptes étudiants actifs",
      icon: <Users size={22} strokeWidth={2.2} />,
      chip: "Inscrits",
      iconBg: "bg-gradient-to-br from-primary-500 to-primary-700",
      chipCls: "bg-primary-50 text-primary-800",
    },
    {
      label: "Enseignants",
      value: totalTeachers.toLocaleString('fr-FR'),
      sub: "Formateurs mobilisés",
      icon: <GraduationCap size={22} strokeWidth={2.2} />,
      chip: "Actifs",
      iconBg: "bg-gradient-to-br from-accent-500 to-accent-800",
      chipCls: "bg-accent-50 text-accent-800",
    },
    {
      label: "Revenus totaux",
      value: `${totalRevenue.toLocaleString('fr-FR')} F`,
      sub: `Dépenses : ${totalExpenses.toLocaleString('fr-FR')} F`,
      icon: <DollarSign size={22} strokeWidth={2.2} />,
      chip: "FCFA",
      iconBg: "bg-gradient-to-br from-emerald-500 to-emerald-700",
      chipCls: "bg-emerald-50 text-emerald-800",
    },
    {
      label: "Bénéfice net",
      value: `${netProfit.toLocaleString('fr-FR')} F`,
      sub: netProfit >= 0 ? "Excédentaire" : "Déficitaire",
      icon: <TrendingUp size={22} strokeWidth={2.2} />,
      chip: netProfit >= 0 ? "Bénéfice" : "Déficit",
      iconBg: netProfit >= 0 ? "bg-gradient-to-br from-primary-600 to-primary-900" : "bg-gradient-to-br from-rose-500 to-rose-700",
      chipCls: netProfit >= 0 ? "bg-primary-50 text-primary-800" : "bg-rose-50 text-rose-700",
    },
  ];

  const chartData = financeEvolution;

  return (
    <>
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5 mb-6">
        {stats.map((s, i) => (
          <div
            key={i}
            className="group relative bg-white rounded p-5 border border-surface-200 shadow-[0_1px_3px_rgba(28,29,31,0.06)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3">
              <div className={`w-12 h-12 rounded ${s.iconBg} text-white flex items-center justify-center shadow-md shrink-0`}>
                {s.icon}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${s.chipCls}`}>
                {s.chip}
              </span>
            </div>
            <div className="mt-4 text-[26px] leading-7 font-black text-surface-900 tracking-tight tabular-nums">{s.value}</div>
            <div className="text-surface-700 text-[13px] font-semibold mt-1">{s.label}</div>
            <div className="text-surface-400 text-[11px] mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        {/* Financial chart */}
        <div className="xl:col-span-2 bg-white rounded border border-surface-200 shadow-[0_1px_3px_rgba(28,29,31,0.06)] overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6 pb-4 border-b border-surface-100">
            <div>
              <h2 className="font-black text-surface-900 flex items-center gap-2 text-base">
                <span className="w-8 h-8 rounded bg-primary-50 text-primary-700 flex items-center justify-center">
                  <BarChart3 size={16} />
                </span>
                Évolution financière
              </h2>
              <p className="text-xs text-surface-400 mt-1 ml-10">Revenus vs dépenses par mois — {currentYear}</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold text-surface-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-accent-500 inline-block" /> Revenus</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Dépenses</span>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#EEF0F3" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6a6f73', fontSize: 11 }} dy={8} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    tick={{ fill: '#aab4bc', fontSize: 11 }}
                    tickFormatter={(v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${Math.round(v / 1_000)}k` : String(v))}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(201,126,0,0.06)' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e9edf0', boxShadow: '0 12px 32px -8px rgba(28,29,31,0.25)', fontSize: 12, padding: '10px 14px' }}
                    formatter={(value: any, name: any) => [`${Number(value || 0).toLocaleString('fr-FR')} FCFA`, name]}
                  />
                  <Bar dataKey="Revenus" fill="#1e9e54" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="Depenses" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent payments */}
        <div className="bg-white rounded border border-surface-200 shadow-[0_1px_3px_rgba(28,29,31,0.06)] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-surface-100">
            <div>
              <h2 className="font-black text-surface-900 flex items-center gap-2 text-base">
                <span className="w-8 h-8 rounded bg-accent-50 text-accent-600 flex items-center justify-center">
                  <CreditCard size={16} />
                </span>
                Paiements récents
              </h2>
              <p className="text-xs text-surface-400 mt-1 ml-10">Dernières transactions enregistrées</p>
            </div>
            {totalRevenue > 0 && (
              <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-accent-800 bg-accent-50 px-2.5 py-1.5 rounded-full">
                <Wallet size={12} /> {totalRevenue.toLocaleString('fr-FR')} F
              </span>
            )}
          </div>
          <div className="p-4 space-y-2 flex-1">
            {recentPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-14 h-14 rounded bg-surface-50 flex items-center justify-center text-surface-300 mb-3">
                  <CreditCard size={26} />
                </div>
                <p className="text-sm font-semibold text-surface-500">Aucun paiement récent</p>
                <p className="text-xs text-surface-400 mt-1">Les transactions apparaîtront ici dès qu'elles seront validées.</p>
              </div>
            ) : (
              recentPayments.map((p: any, i: number) => {
                const name = p.user?.name || "Inconnu";
                const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join('');
                return (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded hover:bg-surface-50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-800 text-white flex items-center justify-center text-xs font-black shrink-0">
                      {initials || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-surface-900 text-[13px] truncate">{name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-500 inline-block" />
                        <span className="text-[11px] text-surface-400 font-medium">{p.status || 'Validé'} · {new Date(p.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-accent-700 text-[13px] tabular-nums">+{Number(p.amount || 0).toLocaleString('fr-FR')}</div>
                      <div className="text-[10px] text-surface-400 font-semibold">FCFA</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {totalExpenses > 0 && (
            <div className="px-6 py-3 border-t border-surface-100 flex items-center justify-between text-[11px] text-surface-500">
              <span className="flex items-center gap-1.5"><ArrowDownCircle size={12} className="text-rose-500" /> Dépenses cumulées</span>
              <span className="font-bold text-surface-700 tabular-nums">{totalExpenses.toLocaleString('fr-FR')} FCFA</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default DashboardView;
