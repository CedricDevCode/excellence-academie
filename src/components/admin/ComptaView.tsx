import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  ShoppingCart,
  GraduationCap,
  Calendar,
  Filter,
  Plus,
  X,
  Save,
  Loader2,
  CreditCard,
  MapPin,
  Trash2,
  CheckCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  fetchPayments,
  fetchExpenses,
  fetchUsers,
  fetchShopOrders,
  createExpense,
  deleteExpense,
  fetchCityBreakdown,
  fetchCities,
} from "../../utils/api";
import { useToast } from "../Toast";
import LoadingSpinner from "./LoadingSpinner";
import { formatPrice, EXPENSE_CATEGORIES } from "./helpers";
import TeacherSalariesView from "../TeacherSalariesView";

function ComptaView() {
  const [comptaTab, setComptaTab] = useState(() => localStorage.getItem('adminComptaTab') || 'scolarite');
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [shopOrders, setShopOrders] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [cityData, setCityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: '', description: '', category: '', ville: '', paymentMethod: 'Espèces', teacherId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast, confirm } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [paymentsData, expensesData, usersData, shopOrdersData] = await Promise.all([
        fetchPayments(),
        fetchExpenses(),
        fetchUsers(),
        fetchShopOrders()
      ]);
      setPayments(paymentsData);
      setExpenses(expensesData);
      setShopOrders(shopOrdersData);
      setTeachers(usersData.filter((u: any) => u.role === 'TEACHER'));
      try { const [cityB, citiesData] = await Promise.all([fetchCityBreakdown(), fetchCities()]); setCityData(cityB); setCities(citiesData); } catch { }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { localStorage.setItem('adminComptaTab', comptaTab); }, [comptaTab]);

  const paidPayments = payments.filter((t: any) => t.status === 'SUCCESS');
  const totalRevenus = paidPayments.reduce((a: number, t: any) => a + Number(t.amount), 0);
  const paidShopOrders = shopOrders.filter((o: any) => o.status === 'PAID' || o.status === 'SHIPPED' || o.status === 'DELIVERED');
  const totalShopRevenus = paidShopOrders.reduce((a: number, o: any) => a + Number(o.totalAmount), 0);
  const totalDepenses = expenses.reduce((a: number, d: any) => a + Number(d.amount), 0);
  const balance = totalRevenus - totalDepenses;

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createExpense({
        amount: form.amount,
        description: form.description,
        category: form.category || undefined,
        ville: form.ville || undefined,
        paymentMethod: form.paymentMethod,
        teacherId: form.teacherId || undefined,
      });
      setForm({ amount: '', description: '', category: '', ville: '', paymentMethod: 'Espèces', teacherId: '' });
      setShowForm(false);
      const expensesData = await fetchExpenses();
      setExpenses(expensesData);
      toast('success', 'Dépense enregistrée');
    } catch (err) {
      toast('error', "Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    const ok = await confirm('Supprimer cette dépense ?');
    if (!ok) return;
    setDeletingId(id);
    try {
      await deleteExpense(id);
      setExpenses(expenses.filter(e => e.id !== id));
      toast('success', 'Dépense supprimée');
    } catch {
      toast('error', 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const dateFilteredPaidPayments = useMemo(() => {
    return paidPayments.filter((p: any) => {
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
  }, [paidPayments, startDate, endDate]);

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

  const dateFilteredShopOrders = useMemo(() => {
    return paidShopOrders.filter((o: any) => {
      if (!startDate && !endDate) return true;
      const d = new Date(o.createdAt).getTime();
      if (startDate && d < new Date(startDate).getTime()) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (d > end.getTime()) return false;
      }
      return true;
    });
  }, [paidShopOrders, startDate, endDate]);

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
        return new Date(`${bMonth} 1, ${bYear}`).getTime() - new Date(`${aMonth} 1, ${aYear}`).getTime();
      });
  }, [paidPayments, expenses]);

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e: any) => {
      const cat = e.category || 'AUTRE';
      map[cat] = (map[cat] || 0) + Number(e.amount);
    });
    const catLabels: Record<string, string> = Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.value, c.label]));
    return Object.entries(map)
      .map(([cat, amount]) => ({ category: cat, label: catLabels[cat] || cat, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const DateFilterBar = () => (
    <div className="flex items-center gap-3 flex-wrap">
      <Calendar size={14} className="text-gray-400" />
      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:border-green-500 focus:outline-none" />
      <span className="text-gray-400 text-sm">-</span>
      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:border-green-500 focus:outline-none" />
      {(startDate || endDate) && (
        <button onClick={() => { setStartDate(''); setEndDate(''); }}
          className="text-xs text-gray-500 hover:text-gray-700 underline">Réinitialiser</button>
      )}
    </div>
  );

  if (loading) return <LoadingSpinner />;

  const COMPTA_TABS = [
    { id: 'scolarite', label: 'Scolarité', icon: <GraduationCap size={16} />, color: 'from-primary-500 to-primary-700' },
    { id: 'boutique', label: 'Boutique', icon: <ShoppingCart size={16} />, color: 'from-accent-500 to-accent-700' },
    { id: 'depenses', label: 'Dépenses', icon: <TrendingDown size={16} />, color: 'from-red-500 to-red-700' },
    { id: 'bilan', label: 'Bilan Global', icon: <BarChart3 size={16} />, color: 'from-accent-700 to-accent-700' },
    { id: 'salaries', label: 'Salaires', icon: <DollarSign size={16} />, color: 'from-green-500 to-green-700' },
  ];
  const activeComptaTab = COMPTA_TABS.find(t => t.id === comptaTab) || COMPTA_TABS[0];
  const totalRevenusCombined = totalRevenus + totalShopRevenus;
  const globalBalance = totalRevenusCombined - totalDepenses;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded shadow-sm border border-gray-100 p-2">
        <div className="flex flex-wrap gap-2">
          {COMPTA_TABS.map(tab => (
            <button key={tab.id} onClick={() => setComptaTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded text-sm font-semibold transition-all duration-200 ${comptaTab === tab.id
                ? `bg-linear-to-r ${tab.color} text-white shadow-md scale-105`
                : 'text-gray-500 hover:text-gray-800 hover:bg-surface-50'
                }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* SALAIRES */}
      {comptaTab === 'salaries' && <TeacherSalariesView />}

      {/* SCOLARITE TAB */}
      {comptaTab === 'scolarite' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative overflow-hidden bg-linear-to-br from-primary-500 to-primary-700 rounded p-5 text-white shadow-lg">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full" />
              <div className="absolute -right-1 top-8 w-12 h-12 bg-white/10 rounded-full" />
              <div className="flex items-center gap-2 mb-3 relative z-10">
                <TrendingUp size={18} />
                <span className="text-primary-100 text-sm font-medium">Inscriptions & Mensualités</span>
              </div>
              <div className="text-3xl font-black relative z-10">{formatPrice(totalRevenus)}</div>
              <div className="text-primary-200 text-sm mt-1 relative z-10">FCFA &bull; {paidPayments.length} paiements validés</div>
            </div>
            <div className="bg-white rounded p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3 text-gray-400">
                <CreditCard size={18} />
                <span className="text-sm font-medium">Transactions</span>
              </div>
              <div className="text-3xl font-black text-gray-900">{paidPayments.length}</div>
              <div className="text-gray-400 text-sm mt-1">Paiements réussis</div>
            </div>
            <div className="bg-white rounded p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3 text-gray-400">
                <DollarSign size={18} />
                <span className="text-sm font-medium">Moyenne / paiement</span>
              </div>
              <div className="text-3xl font-black text-gray-900">
                {paidPayments.length > 0 ? formatPrice(Math.round(totalRevenus / paidPayments.length)) : '0'}
              </div>
              <div className="text-gray-400 text-sm mt-1">FCFA moyen</div>
            </div>
          </div>

          {/* Date filter */}
          <div className="bg-white rounded shadow-sm border border-gray-100 p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-gray-600">
              <Filter size={15} />
              <span className="text-sm font-semibold">Filtrer la période</span>
            </div>
            <DateFilterBar />
          </div>

          {/* Transactions list */}
          <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp size={16} className="text-primary-500" /> Paiements de scolarité
                <span className="bg-primary-50 text-primary-700 text-xs font-bold px-2 py-0.5 rounded-full">{dateFilteredPaidPayments.length}</span>
              </h3>
              <span className="text-sm font-black text-primary-600">{formatPrice(totalRevenus)} FCFA</span>
            </div>
            {dateFilteredPaidPayments.length === 0 ? (
              <div className="py-12 text-center">
                <TrendingUp size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Aucun paiement de scolarité</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {dateFilteredPaidPayments.slice(0, 10).map((p: any) => (
                  <div key={p.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-primary-50/30 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 shrink-0">
                      <CheckCircle size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm truncate">{p.user?.name || 'Client inconnu'}</div>
                      <div className="text-gray-400 text-xs">{new Date(p.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-primary-600 text-sm">+{formatPrice(p.amount)} FCFA</div>
                      {p.course && <div className="text-gray-400 text-xs truncate max-w-[120px]">{p.course.title}</div>}
                    </div>
                  </div>
                ))}
                {dateFilteredPaidPayments.length > 10 && (
                  <div className="px-5 py-3 bg-gray-50 text-center text-sm text-gray-400">
                    +{dateFilteredPaidPayments.length - 10} autres paiements
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOUTIQUE TAB */}
      {comptaTab === 'boutique' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative overflow-hidden bg-linear-to-br from-accent-500 to-accent-700 rounded p-5 text-white shadow-lg">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full" />
              <div className="flex items-center gap-2 mb-3 relative z-10">
                <ShoppingCart size={18} />
                <span className="text-accent-100 text-sm font-medium">Ventes Boutique</span>
              </div>
              <div className="text-3xl font-black relative z-10">{formatPrice(totalShopRevenus)}</div>
              <div className="text-accent-100 text-sm mt-1 relative z-10">FCFA &bull; {paidShopOrders.length} commandes payées</div>
            </div>
            <div className="bg-white rounded p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3 text-gray-400">
                <ShoppingCart size={18} />
                <span className="text-sm font-medium">Commandes validées</span>
              </div>
              <div className="text-3xl font-black text-gray-900">{paidShopOrders.length}</div>
              <div className="text-gray-400 text-sm mt-1">Livrées ou en cours</div>
            </div>
            <div className="bg-white rounded p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3 text-gray-400">
                <DollarSign size={18} />
                <span className="text-sm font-medium">Panier moyen</span>
              </div>
              <div className="text-3xl font-black text-gray-900">
                {paidShopOrders.length > 0 ? formatPrice(Math.round(totalShopRevenus / paidShopOrders.length)) : '0'}
              </div>
              <div className="text-gray-400 text-sm mt-1">FCFA par commande</div>
            </div>
          </div>

          {/* Date filter */}
          <div className="bg-white rounded shadow-sm border border-gray-100 p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-gray-600">
              <Filter size={15} />
              <span className="text-sm font-semibold">Filtrer la période</span>
            </div>
            <DateFilterBar />
          </div>

          {/* Orders list */}
          <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart size={16} className="text-accent-500" /> Commandes boutique
                <span className="bg-accent-50 text-accent-700 text-xs font-bold px-2 py-0.5 rounded-full">{dateFilteredShopOrders.length}</span>
              </h3>
              <span className="text-sm font-black text-accent-600">{formatPrice(totalShopRevenus)} FCFA</span>
            </div>
            {dateFilteredShopOrders.length === 0 ? (
              <div className="py-12 text-center">
                <ShoppingCart size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Aucune vente boutique sur cette période</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {dateFilteredShopOrders.slice(0, 10).map((o: any) => (
                  <div key={o.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-accent-50/30 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-accent-100 flex items-center justify-center text-accent-600 shrink-0 font-bold text-xs">
                      {o.customerName?.slice(0, 2).toUpperCase() || 'CL'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm truncate">{o.customerName}</div>
                      <div className="text-gray-400 text-xs">{new Date(o.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })} &bull; {o.city}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-accent-600 text-sm">+{formatPrice(o.totalAmount)} FCFA</div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${o.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                        o.status === 'SHIPPED' ? 'bg-accent-100 text-accent-700' :
                          'bg-primary-100 text-primary-700'
                        }`}>{o.status}</span>
                    </div>
                  </div>
                ))}
                {dateFilteredShopOrders.length > 10 && (
                  <div className="px-5 py-3 bg-gray-50 text-center text-sm text-gray-400">
                    +{dateFilteredShopOrders.length - 10} autres commandes
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DEPENSES TAB */}
      {comptaTab === 'depenses' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative overflow-hidden bg-linear-to-br from-red-500 to-red-700 rounded p-5 text-white shadow-lg">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full" />
              <div className="flex items-center gap-2 mb-3 relative z-10">
                <TrendingDown size={18} />
                <span className="text-red-100 text-sm font-medium">Total Dépenses</span>
              </div>
              <div className="text-3xl font-black relative z-10">{formatPrice(totalDepenses)}</div>
              <div className="text-red-200 text-sm mt-1 relative z-10">FCFA &bull; {expenses.length} entrées</div>
            </div>
            <div className="bg-white rounded p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3 text-gray-400">
                <BarChart3 size={18} />
                <span className="text-sm font-medium">Catégories</span>
              </div>
              <div className="text-3xl font-black text-gray-900">{expenseByCategory.length}</div>
              <div className="text-gray-400 text-sm mt-1">Types de dépenses</div>
            </div>
            <div className="bg-white rounded p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3 text-gray-400">
                <DollarSign size={18} />
                <span className="text-sm font-medium">Moyenne mensuelle</span>
              </div>
              <div className="text-3xl font-black text-gray-900">
                {monthlyData.length > 0 ? formatPrice(Math.round(totalDepenses / monthlyData.length)) : '0'}
              </div>
              <div className="text-gray-400 text-sm mt-1">FCFA / mois</div>
            </div>
          </div>

          {/* Date filter + Add button */}
          <div className="bg-white rounded shadow-sm border border-gray-100 p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-gray-600">
                <Filter size={15} />
                <span className="text-sm font-semibold">Filtrer la période</span>
              </div>
              <DateFilterBar />
            </div>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-linear-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded text-sm font-bold shadow-sm hover:shadow-md transition-all hover:scale-105">
              <Plus size={15} /> Ajouter une dépense
            </button>
          </div>

          {/* Expense list */}
          <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <TrendingDown size={16} className="text-red-500" /> Liste des dépenses
                <span className="bg-red-50 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{dateFilteredExpenses.length}</span>
              </h3>
              <span className="text-sm font-black text-red-600">-{formatPrice(totalDepenses)} FCFA</span>
            </div>
            {dateFilteredExpenses.length === 0 ? (
              <div className="py-12 text-center">
                <TrendingDown size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Aucune dépense sur cette période</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {dateFilteredExpenses.map((d: any) => (
                  <div key={d.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-red-50/20 transition-colors group">
                    <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0 text-xs font-black">
                      {d.description?.slice(0, 2).toUpperCase() || 'DP'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm truncate">{d.description}</div>
                      <div className="text-gray-400 text-xs flex flex-wrap gap-1.5 mt-0.5">
                        <span>{new Date(d.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        {d.ville && <span className="bg-surface-50 px-1.5 py-0.5 rounded text-gray-500">{d.ville}</span>}
                        {d.category && <span className="bg-surface-50 px-1.5 py-0.5 rounded text-gray-500">{EXPENSE_CATEGORIES.find(c => c.value === d.category)?.label || d.category}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-3">
                      <div className="font-black text-red-500 text-sm">-{formatPrice(d.amount)} FCFA</div>
                      <button onClick={() => handleDeleteExpense(d.id)} disabled={deletingId === d.id}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                        title="Supprimer">
                        {deletingId === d.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* By category breakdown */}
          {expenseByCategory.length > 0 && (
            <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 size={16} className="text-red-500" /> Répartition par catégorie
                </h3>
              </div>
              <div className="p-5 space-y-3">
                {expenseByCategory.map((c: any) => (
                  <div key={c.category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{c.label}</span>
                      <span className="font-black text-red-600">-{formatPrice(c.amount)} FCFA <span className="text-gray-400 font-normal">({totalDepenses > 0 ? ((c.amount / totalDepenses) * 100).toFixed(1) : '0'}%)</span></span>
                    </div>
                    <div className="w-full bg-surface-50 rounded-full h-2">
                      <div className="bg-linear-to-r from-red-400 to-red-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: totalDepenses > 0 ? `${(c.amount / totalDepenses) * 100}%` : '0%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* BILAN GLOBAL TAB */}
      {comptaTab === 'bilan' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative overflow-hidden bg-linear-to-br from-primary-500 to-primary-700 rounded p-5 text-white shadow-lg">
              <div className="text-primary-200 text-xs font-semibold mb-2 uppercase tracking-wider">Scolarité</div>
              <div className="text-2xl font-black">{formatPrice(totalRevenus)}</div>
              <div className="text-primary-200 text-xs mt-1">FCFA</div>
            </div>
            <div className="relative overflow-hidden bg-linear-to-br from-accent-500 to-accent-700 rounded p-5 text-white shadow-lg">
              <div className="text-accent-100 text-xs font-semibold mb-2 uppercase tracking-wider">Boutique</div>
              <div className="text-2xl font-black">{formatPrice(totalShopRevenus)}</div>
              <div className="text-accent-100 text-xs mt-1">FCFA</div>
            </div>
            <div className="relative overflow-hidden bg-linear-to-br from-red-500 to-red-700 rounded p-5 text-white shadow-lg">
              <div className="text-red-200 text-xs font-semibold mb-2 uppercase tracking-wider">Dépenses</div>
              <div className="text-2xl font-black">-{formatPrice(totalDepenses)}</div>
              <div className="text-red-200 text-xs mt-1">FCFA</div>
            </div>
            <div className={`relative overflow-hidden bg-linear-to-br ${globalBalance >= 0 ? 'from-emerald-500 to-emerald-700' : 'from-rose-600 to-rose-800'} rounded p-5 text-white shadow-lg`}>
              <div className="text-white/70 text-xs font-semibold mb-2 uppercase tracking-wider">Résultat net</div>
              <div className="text-2xl font-black">{globalBalance >= 0 ? '+' : ''}{formatPrice(globalBalance)}</div>
              <div className="text-white/70 text-xs mt-1">{globalBalance >= 0 ? 'Bénéfice' : 'Déficit'}</div>
            </div>
          </div>

          {/* Revenue split visual */}
          <div className="bg-white rounded shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2"><BarChart3 size={16} className="text-accent-700" /> Sources de revenus</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="flex items-center gap-2 font-medium text-gray-700"><GraduationCap size={14} className="text-primary-500" /> Scolarité (inscriptions & mensualités)</span>
                  <span className="font-black text-primary-600">{formatPrice(totalRevenus)} FCFA</span>
                </div>
                <div className="w-full bg-surface-50 rounded-full h-3">
                  <div className="bg-linear-to-r from-primary-400 to-primary-600 h-3 rounded-full transition-all duration-700"
                    style={{ width: totalRevenusCombined > 0 ? `${(totalRevenus / totalRevenusCombined) * 100}%` : '0%' }} />
                </div>
                <div className="text-xs text-gray-400 mt-1">{totalRevenusCombined > 0 ? ((totalRevenus / totalRevenusCombined) * 100).toFixed(1) : '0'}% du total</div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="flex items-center gap-2 font-medium text-gray-700"><ShoppingCart size={14} className="text-accent-500" /> Boutique (ventes produits)</span>
                  <span className="font-black text-accent-600">{formatPrice(totalShopRevenus)} FCFA</span>
                </div>
                <div className="w-full bg-surface-50 rounded-full h-3">
                  <div className="bg-linear-to-r from-accent-400 to-accent-600 h-3 rounded-full transition-all duration-700"
                    style={{ width: totalRevenusCombined > 0 ? `${(totalShopRevenus / totalRevenusCombined) * 100}%` : '0%' }} />
                </div>
                <div className="text-xs text-gray-400 mt-1">{totalRevenusCombined > 0 ? ((totalShopRevenus / totalRevenusCombined) * 100).toFixed(1) : '0'}% du total</div>
              </div>
            </div>
          </div>

          {/* Monthly table */}
          {monthlyData.length > 0 && (
            <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><BarChart3 size={16} className="text-primary-500" /> Évolution mensuelle (Scolarité)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Mois', 'Revenus Scolarité', 'Dépenses', 'Résultat net'].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-gray-500 text-xs font-bold uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {monthlyData.map((m: any) => (
                      <tr key={m.name} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-gray-900 text-sm">{m.name}</td>
                        <td className="py-3 px-4 font-black text-primary-600 text-sm">+{formatPrice(m.revenus)} FCFA</td>
                        <td className="py-3 px-4 font-black text-red-500 text-sm">-{formatPrice(m.depenses)} FCFA</td>
                        <td className={`py-3 px-4 font-black text-sm ${m.net >= 0 ? 'text-emerald-600' : 'text-red-700'}`}>
                          {m.net >= 0 ? '+' : ''}{formatPrice(m.net)} FCFA
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td className="py-3 px-4 font-bold text-gray-700 text-sm">TOTAL</td>
                      <td className="py-3 px-4 font-black text-primary-600 text-sm">+{formatPrice(totalRevenus)} FCFA</td>
                      <td className="py-3 px-4 font-black text-red-500 text-sm">-{formatPrice(totalDepenses)} FCFA</td>
                      <td className={`py-3 px-4 font-black text-sm ${balance >= 0 ? 'text-emerald-600' : 'text-red-700'}`}>
                        {balance >= 0 ? '+' : ''}{formatPrice(balance)} FCFA
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* By city */}
          {cityData.filter((c: any) => c.revenue > 0).length > 0 && (
            <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><MapPin size={16} className="text-accent-700" /> Par ville</h3>
                <span className="text-sm text-gray-400">{cityData.length} villes</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Ville', 'Revenus', 'Dépenses', 'Net'].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-gray-500 text-xs font-bold uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {cityData.map((c: any) => (
                      <tr key={c.city} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-accent-100 flex items-center justify-center text-accent-700 text-xs font-bold">
                              {c.city.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-semibold text-gray-900 text-sm">{c.city}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-black text-primary-600 text-sm">+{formatPrice(c.revenue)} FCFA</td>
                        <td className="py-3 px-4 font-black text-red-500 text-sm">-{formatPrice(c.expense)} FCFA</td>
                        <td className={`py-3 px-4 font-black text-sm ${c.net >= 0 ? 'text-emerald-600' : 'text-red-700'}`}>
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
      )}

      {/* Expense Form Modal — Premium Design */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="bg-white rounded w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="bg-linear-to-r from-red-500 to-red-700 px-6 py-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-black text-white text-lg">Nouvelle dépense</h3>
                <p className="text-red-200 text-sm mt-0.5">Enregistrez une sortie d'argent</p>
              </div>
              <button onClick={() => setShowForm(false)}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            {/* Modal body */}
            <form onSubmit={handleCreateExpense} className="flex flex-col h-full overflow-hidden">
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Description *</label>
                    <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded text-sm focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                      required placeholder="Ex : Salaire professeur Mathématiques" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Montant (FCFA) *</label>
                    <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded text-sm focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                      required min="1" placeholder="50 000" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Ville</label>
                    <input type="text" value={form.ville} list="city-list" onChange={e => setForm({ ...form, ville: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded text-sm focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                      placeholder="Abidjan, Bouaké..." />
                    <datalist id="city-list">
                      {cities.map(c => <option key={c.id} value={c.name} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Catégorie</label>
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded text-sm focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white">
                      {EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Mode de paiement</label>
                    <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded text-sm focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white">
                      <option value="Espèces">Espèces</option>
                      <option value="Virement bancaire">Virement bancaire</option>
                      <option value="Mobile Money">Mobile Money</option>
                      <option value="Chèque">Chèque</option>
                      <option value="Carte bancaire">Carte bancaire</option>
                    </select>
                  </div>
                  {teachers.length > 0 && (
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Enseignant concerné (optionnel)</label>
                      <select value={form.teacherId} onChange={e => setForm({ ...form, teacherId: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded text-sm focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white">
                        <option value="">-- Aucun enseignant --</option>
                        {teachers.map((t: any) => (
                          <option key={t.id} value={t.id}>{t.name || t.email}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 pt-4 border-t border-gray-100 shrink-0 flex gap-3 bg-gray-50 rounded-b-3xl">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-3 rounded border border-gray-200 bg-white text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-3 rounded bg-linear-to-r from-red-500 to-red-600 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {submitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComptaView;
