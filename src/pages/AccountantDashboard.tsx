import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home, DollarSign, TrendingUp, TrendingDown, FileText,
  Bell, LogOut, Menu, X, ChevronRight, Download, Filter,
  CheckCircle, AlertCircle, Loader2, Calendar, Search, Plus, Printer, MapPin, PanelLeftClose, PanelLeftOpen, User, Clock
} from "lucide-react";
import {
  getMe, logout as apiLogout, fetchPayments, fetchExpenses, fetchNotifications,
  markNotificationRead, createExpense, fetchReceipts, generateReceipt, fetchUsers,
  fetchCityBreakdown, fetchCities
} from "../utils/api";
import TeacherSessionsView from "../components/TeacherSessionsView";
import TeacherSalariesView from "../components/TeacherSalariesView";
import { generateInvoiceReport } from "../utils/pdf";

const EXPENSE_CATEGORIES = [
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

const NAV_ITEMS = [
  { icon: <Home size={18} />, label: "Tableau de bord", id: "dashboard" },
  { icon: <DollarSign size={18} />, label: "Revenus", id: "revenues" },
  { icon: <TrendingDown size={18} />, label: "Dépenses", id: "expenses" },
  { icon: <FileText size={18} />, label: "Reçus & Factures", id: "receipts" },
  { icon: <MapPin size={18} />, label: "Villes", id: "cities" },
  { icon: <Clock size={18} />, label: "Séances", id: "sessions" },
  { icon: <TrendingUp size={18} />, label: "Rapports", id: "reports" },
  { icon: <Bell size={18} />, label: "Alertes", id: "alerts" },
];

function formatPrice(n: number) {
  return Number(n).toLocaleString("fr-FR");
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center gap-3">
      <AlertCircle size={20} className="text-red-500 shrink-0" />
      <p className="text-red-700 text-sm flex-1">{message}</p>
      {onRetry && <button onClick={onRetry} className="text-red-600 text-sm font-semibold hover:underline shrink-0">Réessayer</button>}
    </div>
  );
}

function downloadCsv(filename: string, rows: string[][]) {
  const csvContent = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.setAttribute("download", filename);
  document.body.appendChild(link); link.click();
  document.body.removeChild(link); URL.revokeObjectURL(url);
}

export default function AccountantDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('accountantSidebar') === 'collapsed');
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('accountantTab') || 'dashboard');
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [cityData, setCityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ amount: "", description: "", category: "", ville: "", paymentMethod: "Espèces", teacherId: "" });
  const [creatingExpense, setCreatingExpense] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [generatingReceiptId, setGeneratingReceiptId] = useState<string | null>(null);

  const [dashboardTab, setDashboardTab] = useState(() => localStorage.getItem('accDashboardTab') || 'overview');
  const [authChecked, setAuthChecked] = useState(false);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const userData = await getMe();
      if (userData.role !== 'ACCOUNTANT') {
        navigate('/student/login');
        return;
      }
      setUser(userData);
      setAuthChecked(true);
      const [paymentsData, expensesData, notifsData, receiptsData, usersData] = await Promise.all([
        fetchPayments(),
        fetchExpenses(),
        fetchNotifications(),
        fetchReceipts(),
        fetchUsers(),
      ]);
      setPayments(paymentsData);
      setExpenses(expensesData);
      setNotifs(notifsData);
      setReceipts(receiptsData);
      setTeachers(usersData.filter((u: any) => u.role === "TEACHER"));
      try { const [cityB, citiesData] = await Promise.all([fetchCityBreakdown(), fetchCities()]); setCityData(cityB); setCities(citiesData); } catch {} 
    } catch {
      navigate("/student/login");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { localStorage.setItem('accountantTab', activeTab); }, [activeTab]);
  useEffect(() => { localStorage.setItem('accDashboardTab', dashboardTab); }, [dashboardTab]);
  useEffect(() => { localStorage.setItem('accountantSidebar', sidebarCollapsed ? 'collapsed' : ''); }, [sidebarCollapsed]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleSidebar = () => setSidebarCollapsed(prev => !prev);

  const handleLogout = async () => {
    try { await apiLogout(); } catch { /* ignore */ }
    navigate("/student/login");
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingExpense(true);
    try {
      await createExpense({
        amount: expenseForm.amount,
        description: expenseForm.description,
        category: expenseForm.category || undefined,
        ville: expenseForm.ville || undefined,
        paymentMethod: expenseForm.paymentMethod,
        teacherId: expenseForm.teacherId || undefined,
      });
      setShowExpenseForm(false);
      setExpenseForm({ amount: "", description: "", category: "", ville: "", paymentMethod: "Espèces", teacherId: "" });
      const [expensesData, notifsData] = await Promise.all([
        fetchExpenses(),
        fetchNotifications(),
      ]);
      setExpenses(expensesData);
      setNotifs(notifsData);
    } catch (err: any) {
      alert(err?.message || "Erreur lors de la création de la dépense");
    } finally {
      setCreatingExpense(false);
    }
  };

  const handleGenerateReceipt = async (paymentId: string) => {
    setGeneratingReceiptId(paymentId);
    try {
      await generateReceipt(paymentId);
      const receiptsData = await fetchReceipts();
      setReceipts(receiptsData);
    } catch (err: any) {
      alert(err?.message || "Erreur lors de la génération du reçu");
    } finally {
      setGeneratingReceiptId(null);
    }
  };

  const paidPayments = payments.filter((t: any) => t.status === "SUCCESS");
  const totalRevenus = paidPayments.reduce((a: number, t: any) => a + Number(t.amount), 0);
  const totalDepenses = expenses.reduce((a: number, d: any) => a + Number(d.amount), 0);
  const balance = totalRevenus - totalDepenses;

  const dateFilteredPayments = useMemo(() => {
    return payments.filter((p: any) => {
      if (!startDate && !endDate) return true;
      const d = new Date(p.createdAt).getTime();
      if (startDate && d < new Date(startDate).getTime()) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (d > end.getTime()) return false;
      }
      return true;
    });
  }, [payments, startDate, endDate]);

  const dateFilteredPaidPayments = useMemo(() => {
    return dateFilteredPayments.filter((t: any) => t.status === "SUCCESS");
  }, [dateFilteredPayments]);

  const dateFilteredExpenses = useMemo(() => {
    return expenses.filter((e: any) => {
      if (!startDate && !endDate) return true;
      const d = new Date(e.createdAt).getTime();
      if (startDate && d < new Date(startDate).getTime()) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (d > end.getTime()) return false;
      }
      return true;
    });
  }, [expenses, startDate, endDate]);

  const filteredPayments = payments.filter((p: any) => {
    const q = `${p.user?.name || ""} ${p.user?.email || ""} ${p.status} ${p.amount}`.toLowerCase();
    return q.includes(searchQuery.toLowerCase());
  });

  const monthlyData = useMemo(() => {
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const map: Record<string, { revenus: number; depenses: number; count: number }> = {};

    paidPayments.forEach((p: any) => {
      const d = new Date(p.createdAt);
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
      if (!map[key]) map[key] = { revenus: 0, depenses: 0, count: 0 };
      map[key].revenus += Number(p.amount);
      map[key].count += 1;
    });

    expenses.forEach((e: any) => {
      const d = new Date(e.createdAt);
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
      if (!map[key]) map[key] = { revenus: 0, depenses: 0, count: 0 };
      map[key].depenses += Number(e.amount);
    });

    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data, net: data.revenus - data.depenses }))
      .sort((a, b) => {
        const [aMonth, aYear] = a.name.split(' ');
        const [bMonth, bYear] = b.name.split(' ');
        const aIdx = new Date(`${aMonth} 1, ${aYear}`).getTime();
        const bIdx = new Date(`${bMonth} 1, ${bYear}`).getTime();
        return bIdx - aIdx;
      });
  }, [paidPayments, expenses]);

  const handleExportCsv = () => {
    const rows = [
      ["Date", "Étudiant", "Type", "Montant", "Méthode", "Statut"],
      ...filteredPayments.map((t: any) => [
        new Date(t.createdAt).toLocaleDateString("fr-FR"),
        t.user?.name || "Inconnu",
        "Mensualité",
        `${formatPrice(t.amount)} FCFA`,
        t.geniusPayReference ? "GeniusPay" : "—",
        t.status,
      ]),
    ];
    downloadCsv("transactions.csv", rows);
  };

  const handleExportPdfReport = () => {
    generateInvoiceReport(
      {
        totalRevenue: totalRevenus,
        totalExpenses: totalDepenses,
        netProfit: balance,
        chartData: monthlyData.map(m => ({ name: m.name, Revenus: m.revenus, Depenses: m.depenses })),
      },
      `rapport-financier-${new Date().toISOString().slice(0, 10)}.pdf`
    );
  };

  const DateFilterBar = () => (
    <div className="flex items-center gap-3 flex-wrap">
      <Calendar size={14} className="text-gray-400" />
      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:border-green-500 focus:outline-none" />
      <span className="text-gray-400 text-xs">-</span>
      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:border-green-500 focus:outline-none" />
      {(startDate || endDate) && (
        <button onClick={() => { setStartDate(''); setEndDate(''); }}
          className="text-xs text-gray-500 hover:text-gray-700 underline">Réinitialiser</button>
      )}
    </div>
  );

  const initials = "CP";

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (error) return <ErrorBanner message={error} onRetry={loadData} />;

    switch (activeTab) {
      case "revenues":
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-black text-gray-900 text-lg flex items-center gap-2"><DollarSign size={18} className="text-green-500" /> Revenus</h2>
              <p className="text-gray-500 text-sm mt-1">Suivi des encaissements.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-3xl font-black text-green-600">{formatPrice(totalRevenus)} <span className="text-sm font-normal text-gray-400">FCFA</span></div>
                  <p className="text-gray-500 text-sm mt-1">Total des revenus ({paidPayments.length} transactions)</p>
                </div>
                <DateFilterBar />
              </div>
            </div>

            {monthlyData.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900 text-sm">Répartition mensuelle</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {["Mois", "Transactions", "Montant"].map(h => (
                          <th key={h} className="text-left py-3 px-4 text-gray-500 text-xs font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {monthlyData.filter(m => m.revenus > 0).map((m: any) => (
                        <tr key={m.name} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-gray-900 text-sm">{m.name}</td>
                          <td className="py-3 px-4 text-xs text-gray-500">{m.count}</td>
                          <td className="py-3 px-4 font-black text-green-600 text-sm">+{formatPrice(m.revenus)} FCFA</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Revenus par ville */}
            {cityData.filter((c: any) => c.revenue > 0).length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2"><MapPin size={14} className="text-purple-500" /> Revenus par ville</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {["Ville", "Transactions", "Montant"].map(h => (
                          <th key={h} className="text-left py-3 px-4 text-gray-500 text-xs font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {cityData.filter((c: any) => c.revenue > 0).sort((a: any, b: any) => b.revenue - a.revenue).map((c: any) => (
                        <tr key={c.city} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold">
                                {c.city.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="font-semibold text-gray-900 text-sm">{c.city}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-500">{c.revenueCount}</td>
                          <td className="py-3 px-4 font-black text-green-600 text-sm">+{formatPrice(c.revenue)} FCFA</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {dateFilteredPaidPayments.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                <DollarSign size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm">Aucun revenu enregistré</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {["Date", "Étudiant", "Ville", "Montant", "Statut"].map(h => (
                          <th key={h} className="text-left py-3 px-4 text-gray-500 text-xs font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {dateFilteredPaidPayments.map((t: any) => (
                        <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 text-xs text-gray-500">{new Date(t.createdAt).toLocaleDateString("fr-FR")}</td>
                          <td className="py-3 px-4 font-semibold text-gray-900 text-sm">{t.user?.name || "Inconnu"}</td>
                          <td className="py-3 px-4 text-xs text-gray-400">{t.user?.ville || "—"}</td>
                          <td className="py-3 px-4 font-black text-green-600 text-sm">+{formatPrice(t.amount)} FCFA</td>
                          <td className="py-3 px-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">Validé</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );

      case "expenses":
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
              <div>
                <h2 className="font-black text-gray-900 text-lg flex items-center gap-2"><TrendingDown size={18} className="text-red-500" /> Dépenses</h2>
                <p className="text-gray-500 text-sm mt-1">Suivi des dépenses.</p>
              </div>
              <button onClick={() => setShowExpenseForm(true)}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors">
                <Plus size={16} /> Ajouter une dépense
              </button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-3xl font-black text-red-600">{formatPrice(totalDepenses)} <span className="text-sm font-normal text-gray-400">FCFA</span></div>
                  <p className="text-gray-500 text-sm mt-1">Total des dépenses ({expenses.length} entrées)</p>
                </div>
                <DateFilterBar />
              </div>
            </div>
            {dateFilteredExpenses.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                <TrendingDown size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm">Aucune dépense enregistrée</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="divide-y divide-gray-100">
                  {dateFilteredExpenses.map((d: any) => (
                    <div key={d.id} className="p-5 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-500 shrink-0 font-bold text-xs">
                        {d.description?.slice(0, 2).toUpperCase() || "DP"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm truncate">{d.description}</div>
                        <div className="text-gray-400 text-xs">
                          {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                          {d.ville ? ` • ${d.ville}` : ""}
                          {d.category ? ` • ${EXPENSE_CATEGORIES.find(c => c.value === d.category)?.label || d.category}` : ""}
                          {d.paymentMethod ? ` • ${d.paymentMethod}` : ""}
                          {d.teacher?.name ? ` • ${d.teacher.name}` : ""}
                        </div>
                      </div>
                      <div className="font-black text-red-500 text-sm shrink-0">-{formatPrice(d.amount)} FCFA</div>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-red-50 flex items-center justify-between">
                  <span className="text-red-700 font-semibold text-sm">Total dépenses</span>
                  <span className="text-red-700 font-black">{formatPrice(totalDepenses)} FCFA</span>
                </div>
              </div>
            )}
          </div>
        );

      case "receipts":
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-black text-gray-900 text-lg flex items-center gap-2"><FileText size={18} className="text-green-500" /> Reçus & Factures</h2>
              <p className="text-gray-500 text-sm mt-1">Consultez et générez les reçus de paiement.</p>
            </div>
            {receipts.length === 0 && paidPayments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
                <FileText size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm">Aucun reçu disponible. Effectuez des paiements pour générer des reçus.</p>
              </div>
            ) : (
              <>
                {paidPayments.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="font-bold text-gray-900 text-sm">Générer un reçu</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {paidPayments.map((p: any) => {
                        const hasReceipt = receipts.some(r => r.paymentId === p.id);
                        return (
                          <div key={p.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 text-sm truncate">{p.user?.name || "Inconnu"}</div>
                              <div className="text-gray-400 text-xs">
                                {new Date(p.createdAt).toLocaleDateString("fr-FR")} • {formatPrice(p.amount)} FCFA
                              </div>
                            </div>
                            {hasReceipt ? (
                              <span className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                                <CheckCircle size={12} /> Reçu généré
                              </span>
                            ) : (
                              <button onClick={() => handleGenerateReceipt(p.id)} disabled={generatingReceiptId === p.id}
                                className="flex items-center gap-1 text-[#0056B3] text-xs font-semibold hover:underline disabled:opacity-50">
                                {generatingReceiptId === p.id ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Printer size={12} />
                                )}
                                Générer le reçu
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {receipts.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="font-bold text-gray-900 text-sm">Reçus existants</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            {["Date", "Étudiant", "Montant", "Statut"].map(h => (
                              <th key={h} className="text-left py-3 px-4 text-gray-500 text-xs font-semibold">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {receipts.map((r: any) => (
                            <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4 text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString("fr-FR")}</td>
                              <td className="py-3 px-4 font-semibold text-gray-900 text-sm">{r.payment?.user?.name || "Inconnu"}</td>
                              <td className="py-3 px-4 font-black text-green-600 text-sm">{formatPrice(r.payment?.amount || 0)} FCFA</td>
                              <td className="py-3 px-4">
                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">Généré</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );

      case "cities":
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-black text-gray-900 text-lg flex items-center gap-2"><MapPin size={18} className="text-purple-500" /> Revenus et dépenses par ville</h2>
              <p className="text-gray-500 text-sm mt-1">Répartition financière par ville de résidence des étudiants et localisation des dépenses.</p>
            </div>
            {cityData.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                <MapPin size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm">Aucune donnée disponible</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {["Ville", "Revenus", "Dépenses", "Résultat net"].map(h => (
                          <th key={h} className="text-left py-3 px-4 text-gray-500 text-xs font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {cityData.map((c: any) => (
                        <tr key={c.city} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold">
                                {c.city.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="font-semibold text-gray-900 text-sm">{c.city}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-black text-green-600 text-sm">+{formatPrice(c.revenue)} FCFA</div>
                            <div className="text-gray-400 text-xs">{c.revenueCount} transaction{c.revenueCount > 1 ? 's' : ''}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-black text-red-500 text-sm">-{formatPrice(c.expense)} FCFA</div>
                            <div className="text-gray-400 text-xs">{c.expenseCount} entrée{c.expenseCount > 1 ? 's' : ''}</div>
                          </td>
                          <td className={`py-3 px-4 font-black text-sm ${c.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {c.net >= 0 ? '+' : ''}{formatPrice(c.net)} FCFA
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );

      case "sessions":
        return <div className="space-y-6"><TeacherSessionsView /></div>;

      case "reports":
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
              <div>
                <h2 className="font-black text-gray-900 text-lg flex items-center gap-2"><TrendingUp size={18} className="text-green-500" /> Rapports</h2>
                <p className="text-gray-500 text-sm mt-1">Exportez les données financières.</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleExportCsv} className="flex items-center gap-2 bg-[#0056B3] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#003375] transition-colors">
                  <Download size={16} /> CSV
                </button>
                <button onClick={handleExportPdfReport} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
                  <Printer size={16} /> Rapport PDF
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-green-600 text-2xl font-black">{formatPrice(totalRevenus)} FCFA</div>
                <div className="text-gray-500 text-sm mt-1">Total Revenus</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-red-600 text-2xl font-black">{formatPrice(totalDepenses)} FCFA</div>
                <div className="text-gray-500 text-sm mt-1">Total Dépenses</div>
              </div>
              <div className={`rounded-2xl p-6 shadow-sm border ${balance >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                <div className={`text-2xl font-black ${balance >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {balance >= 0 ? "+" : ""}{formatPrice(balance)} FCFA
                </div>
                <div className={`${balance >= 0 ? "text-green-600" : "text-red-600"} text-sm mt-1`}>
                  {balance >= 0 ? "Bénéfice net" : "Déficit"}
                </div>
              </div>
            </div>

            {monthlyData.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900">Évolution mensuelle</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {["Mois", "Revenus", "Dépenses", "Résultat net"].map(h => (
                          <th key={h} className="text-left py-3 px-4 text-gray-500 text-xs font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {monthlyData.map((m: any) => (
                        <tr key={m.name} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-gray-900 text-sm">{m.name}</td>
                          <td className="py-3 px-4 font-black text-green-600 text-sm">+{formatPrice(m.revenus)} FCFA</td>
                          <td className="py-3 px-4 font-black text-red-500 text-sm">-{formatPrice(m.depenses)} FCFA</td>
                          <td className={`py-3 px-4 font-black text-sm ${m.net >= 0 ? "text-green-700" : "text-red-700"}`}>
                            {m.net >= 0 ? "+" : ""}{formatPrice(m.net)} FCFA
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 bg-gray-50 flex items-center justify-between">
                  <span className="text-gray-700 font-bold text-sm">Cumul</span>
                  <span className={`font-black text-sm ${balance >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {balance >= 0 ? "+" : ""}{formatPrice(balance)} FCFA
                  </span>
                </div>
              </div>
            )}
          </div>
        );

      case "alerts":
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
              <div>
                <h2 className="font-black text-gray-900 text-lg flex items-center gap-2"><Bell size={18} className="text-green-500" /> Alertes</h2>
                <p className="text-gray-500 text-sm mt-1">Notifications et alertes financières.</p>
              </div>
              {notifs.filter(n => !n.isRead).length > 0 && (
                <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {notifs.filter(n => !n.isRead).length} non lue(s)
                </span>
              )}
            </div>
            {notifs.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                <Bell size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm">Aucune alerte</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifs.map((n: any) => (
                  <div key={n.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{n.title}</h3>
                      <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString("fr-FR")}</span>
                    </div>
                    <p className="text-gray-500 text-sm mt-1">{n.message}</p>
                    {!n.isRead && (
                      <button onClick={async () => { await markNotificationRead(n.id); loadData(); }}
                        className="mt-2 text-green-600 text-xs font-semibold hover:underline">
                        Marquer comme lu
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1 flex gap-1 w-fit mb-6">
              <button onClick={() => setDashboardTab('overview')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${dashboardTab === 'overview' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
                <Home size={16} /> Vue d'ensemble
              </button>
              <button onClick={() => setDashboardTab('salaries')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${dashboardTab === 'salaries' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
                <DollarSign size={16} /> Salaires
              </button>
            </div>

            {dashboardTab === 'salaries' ? (
              <TeacherSalariesView />
            ) : (
            <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 bg-green-500 rounded-xl flex items-center justify-center text-white"><TrendingUp size={22} /></div>
                  <span className="text-green-500 text-xs font-semibold bg-green-50 px-2 py-1 rounded-full">{paidPayments.length} transactions</span>
                </div>
                <div className="text-2xl font-black text-gray-900">{formatPrice(totalRevenus)} <span className="text-sm font-normal text-gray-400">FCFA</span></div>
                <div className="text-gray-500 text-sm mt-1">Revenus</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 bg-red-500 rounded-xl flex items-center justify-center text-white"><TrendingDown size={22} /></div>
                  <span className="text-red-500 text-xs font-semibold bg-red-50 px-2 py-1 rounded-full">{expenses.length} entrées</span>
                </div>
                <div className="text-2xl font-black text-gray-900">{formatPrice(totalDepenses)} <span className="text-sm font-normal text-gray-400">FCFA</span></div>
                <div className="text-gray-500 text-sm mt-1">Dépenses</div>
              </div>
              <div className={`rounded-2xl p-6 shadow-sm border ${balance >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-11 h-11 ${balance >= 0 ? "bg-green-500" : "bg-red-500"} rounded-xl flex items-center justify-center text-white`}>
                    <DollarSign size={22} />
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${balance >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {balance >= 0 ? "Bénéfice" : "Déficit"}
                  </span>
                </div>
                <div className={`text-2xl font-black ${balance >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {balance >= 0 ? "+" : ""}{formatPrice(balance)} <span className="text-sm font-normal text-gray-500">FCFA</span>
                </div>
                <div className="text-gray-600 text-sm mt-1">Balance</div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-black text-gray-900 flex items-center gap-2"><CheckCircle size={18} className="text-green-500" /> Transactions récentes</h2>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Rechercher..."
                      className="w-40 pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:border-green-500 focus:outline-none" />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  {filteredPayments.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-8">Aucune transaction</p>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          {["Étudiant", "Montant", "Statut", "Date"].map(h => (
                            <th key={h} className="text-left py-3 px-4 text-gray-500 text-xs font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPayments.slice(0, 10).map((t: any) => (
                          <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4 font-semibold text-gray-900 text-sm">{t.user?.name || "Inconnu"}</td>
                            <td className="py-3 px-4 font-black text-green-600 text-sm">{formatPrice(t.amount)} FCFA</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${t.status === "SUCCESS" ? "bg-green-100 text-green-700" : t.status === "PENDING" ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"}`}>
                                {t.status === "SUCCESS" ? <CheckCircle size={10} className="inline mr-1" /> : <AlertCircle size={10} className="inline mr-1" />}
                                {t.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString("fr-FR")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-black text-gray-900 flex items-center gap-2"><TrendingDown size={18} className="text-red-500" /> Dernières dépenses</h2>
                  <button onClick={() => setShowExpenseForm(true)}
                    className="flex items-center gap-1 text-red-600 text-xs font-semibold hover:underline">
                    <Plus size={14} /> Ajouter
                  </button>
                </div>
                {expenses.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">Aucune dépense</p>
                ) : (
                  <>
                    <div className="divide-y divide-gray-50">
                      {expenses.slice(0, 5).map((d: any) => (
                        <div key={d.id} className="p-5 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-sm truncate">{d.description}</div>
                            <div className="text-gray-400 text-xs">
                              {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                              {d.ville ? ` • ${d.ville}` : ""}
                              {d.category ? ` • ${EXPENSE_CATEGORIES.find(c => c.value === d.category)?.label || d.category}` : ""}
                            </div>
                          </div>
                          <div className="font-black text-red-500 text-sm shrink-0">-{formatPrice(d.amount)} FCFA</div>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 bg-red-50 flex items-center justify-between">
                      <span className="text-red-700 font-semibold text-sm">Total</span>
                      <span className="text-red-700 font-black">{formatPrice(totalDepenses)} FCFA</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {monthlyData.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900">Résumé mensuel</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {["Mois", "Revenus", "Dépenses", "Résultat"].map(h => (
                          <th key={h} className="text-left py-3 px-4 text-gray-500 text-xs font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {monthlyData.slice(0, 6).map((m: any) => (
                        <tr key={m.name} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-gray-900 text-sm">{m.name}</td>
                          <td className="py-3 px-4 font-black text-green-600 text-sm">+{formatPrice(m.revenus)} FCFA</td>
                          <td className="py-3 px-4 font-black text-red-500 text-sm">-{formatPrice(m.depenses)} FCFA</td>
                          <td className={`py-3 px-4 font-black text-sm ${m.net >= 0 ? "text-green-700" : "text-red-700"}`}>
                            {m.net >= 0 ? "+" : ""}{formatPrice(m.net)} FCFA
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            </>
          )}
          </>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-[Inter,sans-serif] overflow-hidden">
      <aside className={`fixed inset-y-0 left-0 z-50 bg-green-700 text-white transform transition-all duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} ${sidebarCollapsed ? "w-16" : "w-64"}`} role="navigation" aria-label="Menu comptabilité">
        <div className={`flex items-center justify-between border-b border-green-600/30 ${sidebarCollapsed ? "p-3 justify-center" : "p-5"}`}>
          {sidebarCollapsed ? (
            <img src="/images/logo exacademy.jpeg" alt="Logo" className="w-9 h-9 rounded-full object-cover bg-white shrink-0" />
          ) : (
            <div className="flex items-center gap-3 overflow-hidden">
              <img src="/images/logo exacademy.jpeg" alt="Logo" className="w-9 h-9 rounded-full object-cover bg-white shrink-0" />
              <div className="min-w-0">
                <div className="font-black text-sm truncate">Excellence Académie</div>
                <div className="text-green-200 text-xs truncate">Comptabilité</div>
              </div>
            </div>
          )}
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-green-200 hover:text-white shrink-0" aria-label="Fermer le menu">
            <X size={20} />
          </button>
        </div>
        <nav className={`space-y-1 ${sidebarCollapsed ? "p-2" : "p-4"}`}>
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all ${sidebarCollapsed ? "justify-center p-3" : "px-4 py-3"} ${activeTab === item.id ? "bg-white/20 text-white font-bold" : "text-green-100 hover:bg-white/10"}`}
              aria-current={activeTab === item.id ? "page" : undefined}
              title={sidebarCollapsed ? item.label : undefined}>
              <span className="shrink-0">{item.icon}</span>
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              {!sidebarCollapsed && activeTab === item.id && <ChevronRight size={16} className="ml-auto shrink-0" />}
            </button>
          ))}
        </nav>
        <div className={`absolute bottom-0 left-0 right-0 border-t border-green-600/30 ${sidebarCollapsed ? "p-2" : "p-4"}`}>
          <button onClick={toggleSidebar} className={`w-full flex items-center gap-3 text-green-200 hover:text-white text-sm rounded-xl hover:bg-white/10 transition-all ${sidebarCollapsed ? "justify-center p-3" : "px-4 py-3"}`}
            title={sidebarCollapsed ? "Agrandir" : "Réduire"}>
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            {!sidebarCollapsed && <span>Réduire</span>}
          </button>
          <button onClick={handleLogout} className={`w-full flex items-center gap-3 text-green-200 hover:text-white text-sm rounded-xl hover:bg-white/10 transition-all ${sidebarCollapsed ? "justify-center p-3" : "px-4 py-3"}`}
            title="Déconnexion">
            <LogOut size={18} />
            {!sidebarCollapsed && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} role="presentation" />}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700" aria-label="Ouvrir le menu">
              <Menu size={22} />
            </button>
            <div>
              <h1 className="font-black text-gray-900">Tableau de bord – Comptabilité</h1>
              <p className="text-gray-400 text-xs">Excellence Académie • {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleExportCsv} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl text-sm font-semibold hover:bg-green-100 transition-colors" aria-label="Exporter le rapport">
              <Download size={16} /> Exporter rapport
            </button>
            <div className="relative" ref={profileRef}>
              <button onClick={(e) => { e.stopPropagation(); setProfileOpen(!profileOpen); }}
                className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white font-black text-xs hover:opacity-90 transition-opacity cursor-pointer">
                {initials}
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <div className="font-bold text-gray-900 text-sm truncate">{user?.name || 'Comptable'}</div>
                    <div className="text-gray-400 text-xs truncate">{user?.email || ''}</div>
                  </div>
                  <div className="p-2">
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors">
                      <LogOut size={16} /> Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-linear-to-r from-green-700 to-green-900 rounded-2xl p-6 text-white mb-6">
            <h2 className="font-black text-xl mb-1">Bon retour parmi nous, {user?.name?.split(" ")[0] || "Comptable"} !</h2>
          </div>
          {renderContent()}
        </div>
      </main>

      {showExpenseForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-overlay">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-gray-900">Nouvelle dépense</h3>
              <button onClick={() => setShowExpenseForm(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
                <input type="text" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-green-500 focus:outline-none" required placeholder="Ex: Fournitures de bureau" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Montant (FCFA) *</label>
                <input type="number" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-green-500 focus:outline-none" required min="1" placeholder="50000" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Catégorie</label>
                <select value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-green-500 focus:outline-none">
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ville</label>
                <input type="text" value={expenseForm.ville} list="city-list-acc" onChange={e => setExpenseForm({ ...expenseForm, ville: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-green-500 focus:outline-none" placeholder="Ex: Abidjan, Bouaké..." />
                <datalist id="city-list-acc">
                  {cities.map(c => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Méthode de paiement</label>
                <select value={expenseForm.paymentMethod} onChange={e => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-green-500 focus:outline-none">
                  <option value="Espèces">Espèces</option>
                  <option value="Virement bancaire">Virement bancaire</option>
                  <option value="Mobile Money">Mobile Money (Orange Money / MTN)</option>
                  <option value="Chèque">Chèque</option>
                  <option value="Carte bancaire">Carte bancaire</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Enseignant (optionnel)</label>
                <select value={expenseForm.teacherId} onChange={e => setExpenseForm({ ...expenseForm, teacherId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-green-500 focus:outline-none">
                  <option value="">Sélectionner un enseignant</option>
                  {teachers.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name || t.email}</option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={creatingExpense}
                className="w-full bg-red-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {creatingExpense ? <Loader2 size={16} className="animate-spin" /> : null}
                {creatingExpense ? "Enregistrement..." : "Enregistrer la dépense"}
              </button>
            </form>
          </div>
        </div>
      )}
      <style>{`
        .modal-overlay { animation: fadeIn 0.15s ease-out; }
        .modal-content { animation: scaleIn 0.2s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  );
}

