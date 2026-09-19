export function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const specials = '@#%&*!';
  let pwd = '';
  for (let i = 0; i < 10; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  pwd += specials.charAt(Math.floor(Math.random() * specials.length));
  pwd += String(Math.floor(Math.random() * 100));
  return pwd;
}

export function formatNumber(value: number) {
  return Number(value).toLocaleString('fr-FR');
}

export function formatPrice(n: number) {
  return Number(n).toLocaleString("fr-FR");
}

export function getMonthlyChartData(rawData: any[] = []) {
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const map: Record<string, any> = {};
  months.forEach(m => { map[m] = { name: m, Revenus: 0, Depenses: 0 }; });
  (rawData || []).forEach((item: any) => {
    if (item.name && map[item.name]) {
      map[item.name].Revenus = item.Revenus || 0;
      map[item.name].Depenses = item.Depenses || 0;
    }
  });
  return Object.values(map);
}

export function downloadCsv(filename: string, rows: string[][]) {
  const csvContent = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function printReportHtml(title: string, data: { totalRevenue: number; totalExpenses: number; netProfit: number; chartData: any[] }) {
  const { generateInvoiceReport } = await import("../../utils/pdf");
  generateInvoiceReport(data, `${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}

export const EXPENSE_CATEGORIES = [
  { value: '', label: 'Non catégorisé' },
  { value: 'SALAIRE', label: 'Salaire / Enseignant' },
  { value: 'LOYER', label: 'Loyer / Location' },
  { value: 'FOURNITURE', label: 'Fournitures / Matériel' },
  { value: 'EQUIPEMENT', label: 'Équipement' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'COMMUNICATION', label: 'Communication / Internet' },
  { value: 'SERVICES_PUBLICS', label: 'Services publics (eau, électricité)' },
  { value: 'FORMATION', label: 'Formation / Séminaire' },
  { value: 'AUTRE', label: 'Autre' },
];

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  'Concours Juridiques & Judiciaires': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800' },
  'Administration Publique': { bg: 'bg-primary-50', text: 'text-primary-700', border: 'border-primary-200', badge: 'bg-primary-100 text-primary-800' },
  'Sécurité & Force Publique': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', badge: 'bg-rose-100 text-rose-800' },
  'Technologies & Métiers Numériques': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-800' },
};

export const DEFAULT_CATEGORY_COLOR = { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-800' };

export const AFRICA_COUNTRIES = [
  "Côte d'Ivoire", 'Bénin', 'Burkina Faso', 'Cap-Vert', 'Ghana', 'Guinée',
  'Mali', 'Niger', 'Nigeria', 'Sénégal', 'Togo', 'Cameroun',
  'Congo', 'Gabon', 'République Démocratique du Congo',
];

export const EUROPE_COUNTRIES = [
  'France', 'Belgique', 'Suisse', 'Allemagne', 'Italie', 'Espagne',
  'Portugal', 'Royaume-Uni', 'Pays-Bas', 'Luxembourg',
];

export const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
