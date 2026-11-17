import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, GraduationCap, DollarSign, TrendingUp, CreditCard, BarChart3, Banknote, ArrowDownRight } from 'lucide-react';
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
    { label: "Étudiants", value: totalStudents.toLocaleString('fr-FR'), sub: "comptes actifs", icon: <Users size={18} /> },
    { label: "Enseignants", value: totalTeachers.toLocaleString('fr-FR'), sub: "formateurs", icon: <GraduationCap size={18} /> },
    { label: "Revenus", value: totalRevenue.toLocaleString('fr-FR'), sub: "FCFA encaissés", icon: <DollarSign size={18} /> },
    { label: "Bénéfice net", value: `${netProfit >= 0 ? '+' : ''}${netProfit.toLocaleString('fr-FR')}`, sub: netProfit >= 0 ? "FCFA — excédentaire" : "FCFA — déficitaire", icon: <TrendingUp size={18} /> },
  ];

  return (
    <>
      {/* Bandeau KPI — registre */}
      <div className="panel mb-6 grid grid-cols-2 xl:grid-cols-4 divide-x divide-[var(--color-line)] overflow-hidden">
        {stats.map((s, i) => (
          <div key={i} className="p-4 sm:p-5">
            <div className="flex items-center gap-2 text-gold-800 mb-2">
              {s.icon}
              <span className="text-[10px] font-semibold tracking-[0.09em] uppercase text-ink-600">{s.label}</span>
            </div>
            <p className="font-display font-extrabold text-2xl sm:text-[28px] leading-none text-ink-900 num">{s.value}</p>
            <p className="text-[11px] text-ink-600/70 mt-1.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        {/* Graphique */}
        <section className="xl:col-span-2 panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-4 border-b border-[var(--color-line)]">
            <div>
              <h2 className="font-display font-bold text-ink-900 text-base flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-gold-100 text-gold-800 flex items-center justify-center"><BarChart3 size={15} /></span>
                Évolution financière
              </h2>
              <p className="text-[11px] text-ink-600/70 mt-1 ml-9">Revenus et dépenses par mois — {currentYear}</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-medium text-ink-600">
              <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[3px] bg-ivoire-500 inline-block" /> Revenus</span>
              <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[3px] bg-rose-500 inline-block" /> Dépenses</span>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financeEvolution} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="2 6" vertical={false} stroke="#e7e4dc" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#524838', fontSize: 11 }} dy={8} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={44}
                    tick={{ fill: '#8a7d60', fontSize: 11 }}
                    tickFormatter={(v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${Math.round(v / 1_000)}k` : String(v))}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(201,126,0,0.08)' }}
                    contentStyle={{ borderRadius: '10px', border: '1px solid var(--color-line)', boxShadow: '0 10px 30px -10px rgba(23,17,10,0.35)', fontSize: 12, padding: '10px 14px', background: '#fffdf6' }}
                    formatter={(value: any, name: any) => [`${Number(value || 0).toLocaleString('fr-FR')} FCFA`, name]}
                  />
                  <Bar dataKey="Revenus" fill="#1e9e54" radius={[3, 3, 0, 0]} maxBarSize={34} />
                  <Bar dataKey="Depenses" fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={34} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Paiements récents */}
        <section className="panel overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--color-line)]">
            <h2 className="font-display font-bold text-ink-900 text-base flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-accent-50 text-accent-700 flex items-center justify-center"><Banknote size={15} /></span>
              Paiements récents
            </h2>
            <span className="text-[10px] font-semibold text-ink-600/70 num">{recentPayments.length} reçu(s)</span>
          </div>
          <div className="p-3 flex-1">
            {recentPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CreditCard size={26} className="text-ink-600/30 mb-3" />
                <p className="text-sm font-semibold text-ink-600">Aucun paiement pour l'instant</p>
                <p className="text-xs text-ink-600/60 mt-1 max-w-[220px]">Les encaissements validés apparaîtront ici.</p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-line)]">
                {recentPayments.map((p: any, i: number) => {
                  const name = p.user?.name || "Inconnu";
                  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join('');
                  return (
                    <li key={i} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-gold-100/50 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-ink-900 text-gold-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {initials || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-ink-900 text-[13px] truncate">{name}</p>
                        <p className="text-[10px] text-ink-600/60 num">{new Date(p.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</p>
                      </div>
                      <span className="font-display font-bold text-accent-700 text-[13px] num shrink-0">+{Number(p.amount || 0).toLocaleString('fr-FR')}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {totalExpenses > 0 && (
            <div className="px-6 py-3 border-t border-[var(--color-line)] flex items-center justify-between text-[11px] text-ink-600">
              <span className="flex items-center gap-1.5"><ArrowDownRight size={12} className="text-rose-500" /> Dépenses cumulées</span>
              <span className="font-bold num">{totalExpenses.toLocaleString('fr-FR')} FCFA</span>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export default DashboardView;
