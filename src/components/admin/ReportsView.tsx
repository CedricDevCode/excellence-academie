import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FileText, Download } from "lucide-react";
import { getMonthlyChartData, downloadCsv, printReportHtml } from "./helpers";

export default function ReportsView({ apiStats }: { apiStats: any }) {
  const chartData = getMonthlyChartData(apiStats?.chartData || []);
  const enrollmentsData: Array<{ name: string; Inscriptions: number }> = apiStats?.enrollmentsData?.length ? apiStats.enrollmentsData : [{ name: 'Aucun', Inscriptions: 0 }];
  const revenueData = apiStats?.revenueByCityData?.length ? apiStats.revenueByCityData.sort((a: any, b: any) => b.Revenus - a.Revenus) : [{ name: 'Aucune', Revenus: 0 }];

  const monthEnrollmentsMap = enrollmentsData.reduce((acc, item) => {
    acc[item.name] = Number(item.Inscriptions || 0);
    return acc;
  }, {} as Record<string, number>);
  const exportRows = chartData.map((item) => [
    item.name,
    String(item.Revenus),
    String(item.Depenses),
    String(monthEnrollmentsMap[item.name] || 0),
  ]);

  const handleExportCsv = () => {
    downloadCsv('rapport-financier.csv', [['Mois', 'Revenus', 'Dépenses', 'Inscriptions'], ...exportRows]);
  };

  const handleExportPdf = () => {
    printReportHtml('Rapport financier', {
      totalRevenue: apiStats?.totalRevenue || 0,
      totalExpenses: apiStats?.totalExpenses || 0,
      netProfit: apiStats?.netProfit || 0,
      chartData,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="font-black text-gray-900 flex items-center gap-2">
            <FileText size={18} className="text-[#c97e00]" /> Rapports & Statistiques
          </h2>
          <p className="text-gray-500 text-sm mt-1">Vue synthétique des revenus, dépenses et inscriptions.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExportCsv} className="inline-flex items-center gap-2 bg-[#c97e00] text-white px-4 py-2 rounded text-sm font-semibold hover:bg-[#6b4500]">
            <Download size={16} /> Exporter CSV
          </button>
          <button onClick={handleExportPdf} className="inline-flex items-center gap-2 bg-accent-500 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-accent-600">
            <FileText size={16} /> Exporter PDF
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">Tendance financière</h3>
          <p className="text-gray-500 text-sm mb-4">Évolution des revenus et dépenses jusqu'à aujourd'hui.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '6px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="Revenus" fill="#1e9e54" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Depenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-6 rounded shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">Inscriptions par mois</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={enrollmentsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '6px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="Inscriptions" fill="#c97e00" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4">Revenus par ville (FCFA)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '6px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="Revenus" fill="#c97e00" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
