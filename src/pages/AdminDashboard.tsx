import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Users, TrendingUp, TrendingDown, DollarSign, Bell, Settings, LogOut,
  BarChart3, BookOpen, Menu, X, Home, CreditCard, FileText,
  GraduationCap, ChevronRight, ChevronDown, CheckCircle, Clock,
  AlertCircle, Search, Plus, Mail, Calendar, Award, Edit, Trash2, Send, Save, User, Download, Filter, Loader2, MapPin, Shield, Heart, PanelLeftClose, PanelLeftOpen, Eye, EyeOff, Camera, MessageSquare, Star, ShoppingCart
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  fetchStats, fetchUsers, fetchPayments, fetchExpenses,
  fetchNotifications, markNotificationRead, createExpense, updateExpense, deleteExpense,
  fetchCityBreakdown,
  fetchCities, createCity, updateCity, deleteCity,
  getMe, logout as apiLogout, registerStudent, registerAndPay, sendBulkNotification,
  fetchCourses, createCourse, updateCourse, deleteCourse, createUser, updateUser, deleteUser,
  fetchAllContracts, fetchContractByUserId, getSignedContractPdfUrl,
  fetchAllTestimonials, updateTestimonial, deleteTestimonial,
  fetchShopOrders,
  fetchBlogPosts, deleteBlogPost
} from "../utils/api";
import { calcRegistrationPrice } from "../constants/student";
import StudentRegistrationForm from "../components/StudentRegistrationForm";
import TeacherSessionsView from "../components/TeacherSessionsView";
import TeacherSalariesView from "../components/TeacherSalariesView";
import ShopProductsView from "../components/ShopProductsView";
import ShopOrdersView from "../components/ShopOrdersView";
import BannersView from "../components/BannersView";
import { generateInvoiceReport, generatePaymentsReport } from "../utils/pdf";
import { useToast } from "../components/Toast";

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function generateTempPassword() {
  return 'P@ssw0rd';
}

function formatNumber(value: number) {
  return value.toLocaleString('fr-FR');
}

function getMonthlyChartData(rawData: any[] = []) {
  const monthMap = rawData.reduce<Record<string, any>>((acc, item) => {
    if (!item?.name) return acc;
    acc[item.name] = {
      Revenus: Number(item.Revenus || 0),
      Depenses: Number(item.Depenses || 0),
    };
    return acc;
  }, {});

  const currentMonthIndex = new Date().getMonth();
  return MONTHS_FR.slice(0, currentMonthIndex + 1).map((name) => ({
    name,
    Revenus: monthMap[name]?.Revenus || 0,
    Depenses: monthMap[name]?.Depenses || 0,
  }));
}

function downloadCsv(filename: string, rows: string[][]) {
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

function printReportHtml(title: string, data: { totalRevenue: number; totalExpenses: number; netProfit: number; chartData: any[] }) {
  generateInvoiceReport(data, `${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}

const NAV_GROUPS = [
  {
    category: "Administration",
    items: [
      { icon: <Home size={18} />, label: "Tableau de bord", id: "dashboard" },
      { icon: <GraduationCap size={18} />, label: "Formations", id: "courses" },
      { icon: <Users size={18} />, label: "Étudiants", id: "students" },
      { icon: <Clock size={18} />, label: "Séances", id: "sessions" },
      { icon: <FileText size={18} />, label: "Contrats", id: "contracts" },
      { icon: <MessageSquare size={18} />, label: "Avis & Témoignages", id: "testimonials" },
      { icon: <ShoppingCart size={18} />, label: "À la une", id: "home_featured" },
    ]
  },
  {
    category: "Finances",
    items: [
      { icon: <BarChart3 size={18} />, label: "Comptabilité", id: "compta" },
      { icon: <CreditCard size={18} />, label: "Paiements reçus", id: "payments" },
    ]
  },
  {
    category: "Blog",
    items: [
      { icon: <BookOpen size={18} />, label: "Articles", id: "blog" },
    ]
  },
  {
    category: "Boutique",
    items: [
      { icon: <ShoppingCart size={18} />, label: "Produits", id: "shop_products" },
      { icon: <ShoppingCart size={18} />, label: "Commandes", id: "shop_orders" },
      { icon: <ShoppingCart size={18} />, label: "Bannières boutique", id: "shop_banners" },
    ]
  },
  {
    category: "Système",
    items: [
      { icon: <Users size={18} />, label: "Utilisateurs", id: "users" },
      { icon: <Bell size={18} />, label: "Notifications", id: "notifs" },
      { icon: <FileText size={18} />, label: "Rapports", id: "reports" },
      { icon: <Settings size={18} />, label: "Paramètres", id: "settings" },
    ]
  }
];

// ─── Dashboard Overview ──────────────────────────────────────────────
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

// ─── Students View ───────────────────────────────────────────────────
function StudentsView() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedMode, setSelectedMode] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddPanel, setShowAddPanel] = useState(false);

  const [showMsgModal, setShowMsgModal] = useState(false);

  // Forms
  const [msgForm, setMsgForm] = useState({ title: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [editForm, setEditForm] = useState({ nom: '', prenom: '', email: '', telephone: '', ville: '', isActive: true });
  const { toast, confirm } = useToast();

  const loadUsers = () => {
    setLoading(true);
    fetchUsers()
      .then(data => setUsers(data.filter((u: any) => u.role === 'STUDENT')))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
    fetchCourses().then(setCourses).catch(console.error);
  };

  useEffect(() => { loadUsers(); }, []);

  // Helper: get courses list for a student
  const getStudentCourses = (u: any) => {
    const list = new Map<string, string>();
    u.subscriptions?.forEach((s: any) => {
      if (s.course?.id && s.course?.title) list.set(s.course.id, s.course.title);
      else if (s.courseId) list.set(s.courseId, s.course?.title || s.courseId);
    });
    u.payments?.forEach((p: any) => {
      if (p.course?.id && p.course?.title) list.set(p.course.id, p.course.title);
      else if (p.courseId) list.set(p.courseId, p.course?.title || p.courseId);
    });
    return Array.from(list.entries()).map(([id, title]) => ({ id, title }));
  };

  // Helper: get mode info for a student
  const getStudentMode = (u: any) => {
    const sub = u.subscriptions?.[0];
    if (!sub) return { label: 'Standard', type: 'standard', color: 'bg-gray-100 text-gray-700' };
    if (sub.coursParticuliers) {
      return { label: 'Particulier', type: 'particulier', color: 'bg-amber-100 text-amber-800 border border-amber-200' };
    }
    if (sub.formule === 'en_ligne') {
      return { label: 'En ligne', type: 'en_ligne', color: 'bg-purple-100 text-purple-800 border border-purple-200' };
    }
    if (sub.formule === 'les_deux') {
      return { label: 'Présentiel + En ligne', type: 'les_deux', color: 'bg-orange-100 text-orange-800 border border-orange-200' };
    }
    return { label: 'Présentiel', type: 'presentiel', color: 'bg-blue-100 text-[#0056B3] border border-blue-200' };
  };

  // Filtre automatique instantané
  const filtered = useMemo(() => {
    return users.filter(u => {
      // 1. Recherche texte (Nom, Email, Téléphone, Matricule)
      const q = search.trim().toLowerCase();
      if (q) {
        const matchesName = u.name?.toLowerCase().includes(q);
        const matchesEmail = u.email?.toLowerCase().includes(q);
        const matchesPhone = u.telephone?.toLowerCase().includes(q);
        const matchesMatricule = u.matricule?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesMatricule) {
          return false;
        }
      }

      // 2. Filtre par Catégorie de Formation (Cours)
      if (selectedCourse) {
        const studentCoursesList = getStudentCourses(u);
        const matchCourse = studentCoursesList.some(
          c => c.id === selectedCourse || c.title.toLowerCase() === selectedCourse.toLowerCase()
        );
        if (!matchCourse) return false;
      }

      // 3. Filtre par Type de Formation
      if (selectedMode) {
        const modeInfo = getStudentMode(u);
        if (selectedMode === 'particulier' && modeInfo.type !== 'particulier') return false;
        if (selectedMode === 'presentiel' && modeInfo.type !== 'presentiel') return false;
        if (selectedMode === 'en_ligne' && modeInfo.type !== 'en_ligne') return false;
        if (selectedMode === 'les_deux' && modeInfo.type !== 'les_deux') return false;
      }

      // 4. Filtre par Date d'inscription
      if (u.createdAt) {
        const regDate = new Date(u.createdAt);
        const now = new Date();

        if (dateFilter === 'today') {
          const isToday = regDate.toDateString() === now.toDateString();
          if (!isToday) return false;
        } else if (dateFilter === 'this_week') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          sevenDaysAgo.setHours(0, 0, 0, 0);
          if (regDate < sevenDaysAgo) return false;
        } else if (dateFilter === 'this_month') {
          const isThisMonth = regDate.getMonth() === now.getMonth() && regDate.getFullYear() === now.getFullYear();
          if (!isThisMonth) return false;
        } else if (dateFilter === 'custom') {
          if (startDate) {
            const s = new Date(startDate);
            s.setHours(0, 0, 0, 0);
            if (regDate < s) return false;
          }
          if (endDate) {
            const e = new Date(endDate);
            e.setHours(23, 59, 59, 999);
            if (regDate > e) return false;
          }
        }
      }

      return true;
    });
  }, [users, search, selectedCourse, selectedMode, dateFilter, startDate, endDate]);

  const hasActiveFilters = Boolean(search || selectedCourse || selectedMode || dateFilter || startDate || endDate);

  const resetFilters = () => {
    setSearch("");
    setSelectedCourse("");
    setSelectedMode("");
    setDateFilter("");
    setStartDate("");
    setEndDate("");
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map(u => u.id));
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const handleSendBulkMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) { toast('error', 'Sélectionnez au moins un étudiant.'); return; }
    setSubmitting(true);
    try {
      await sendBulkNotification({ userIds: selectedIds, title: msgForm.title, message: msgForm.message });
      setShowMsgModal(false);
      setMsgForm({ title: '', message: '' });
      setSelectedIds([]);
      toast('success', 'Message envoyé avec succès !');
    } catch (err) {
      toast('error', 'Erreur lors de l\'envoi du message.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (student: any) => {
    const [prenom, ...rest] = (student.name || '').split(' ');
    setEditingStudent(student);
    setEditForm({
      prenom: prenom || '',
      nom: rest.join(' ') || '',
      email: student.email || '',
      telephone: student.telephone || '',
      ville: student.ville || '',
      isActive: student.isActive !== false,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setSubmitting(true);
    try {
      const updated = await updateUser(editingStudent.id, {
        prenom: editForm.prenom,
        nom: editForm.nom,
        email: editForm.email,
        telephone: editForm.telephone,
        ville: editForm.ville,
      });
      setUsers(users.map(u => u.id === updated.id ? { ...u, ...updated } : u));
      setShowEditModal(false);
      setEditingStudent(null);
      toast('success', 'Étudiant modifié avec succès');
    } catch (err: any) {
      toast('error', err?.message || 'Erreur lors de la modification');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (student: any) => {
    const newStatus = !(student.isActive !== false);
    try {
      const updated = await updateUser(student.id, { isActive: newStatus });
      setUsers(users.map(u => u.id === updated.id ? { ...u, ...updated } : u));
      toast('success', newStatus ? 'Étudiant activé' : 'Étudiant désactivé');
    } catch (err: any) {
      toast('error', 'Erreur lors du changement de statut');
    }
  };

  const handleDeleteStudent = async (student: any) => {
    const confirmed = await confirm(`Supprimer ${student.name || student.email} ?`);
    if (!confirmed) return;
    try {
      await deleteUser(student.id);
      setUsers(users.filter(u => u.id !== student.id));
      toast('success', 'Étudiant supprimé');
    } catch (err: any) {
      toast('error', err?.message || 'Erreur lors de la suppression');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header avec titre et boutons d'action */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div>
          <h2 className="font-black text-gray-900 text-xl flex items-center gap-2">
            <Users size={22} className="text-[#0056B3]" /> Gestion des étudiants
          </h2>
          <p className="text-gray-500 text-xs mt-0.5">Suivi, filtrage multi-critères et gestion des inscriptions</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {selectedIds.length > 0 && (
            <button onClick={() => setShowMsgModal(true)} className="flex items-center gap-2 bg-[#FF6B00] text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-[#e05e00] transition-colors whitespace-nowrap shadow-sm">
              <Send size={16} /> Envoyer Message ({selectedIds.length})
            </button>
          )}
          <button onClick={() => setShowAddPanel(true)} className="flex items-center gap-2 bg-[#0056B3] text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-[#003375] transition-colors whitespace-nowrap shadow-sm">
            <Plus size={16} /> Inscrire un étudiant
          </button>
        </div>
      </div>

      {/* Cartes Compteurs en haut */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0056B3] flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Étudiants affichés</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-900">{filtered.length}</span>
              <span className="text-xs text-gray-400 font-medium">/ {users.length} au total</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Comptes Actifs</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-900">
                {users.filter(u => u.isActive !== false).length}
              </span>
              <span className="text-xs text-green-600 font-medium font-semibold">
                {users.length > 0 ? Math.round((users.filter(u => u.isActive !== false).length / users.length) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#FF6B00] flex items-center justify-center shrink-0">
            <GraduationCap size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Formations disponibles</p>
            <span className="text-2xl font-black text-gray-900">{courses.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {!showAddPanel && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Barre de Filtres Automatique */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/70 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Recherche textuelle */}
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Nom, email, téléphone..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none transition-all shadow-xs"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* 2. Filtre Catégorie de Formation */}
                <div className="relative">
                  <select
                    value={selectedCourse}
                    onChange={e => setSelectedCourse(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none transition-all text-gray-700 font-medium shadow-xs"
                  >
                    <option value="">📚 Toutes les formations</option>
                    {courses.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Filtre Type de Formation */}
                <div className="relative">
                  <select
                    value={selectedMode}
                    onChange={e => setSelectedMode(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none transition-all text-gray-700 font-medium shadow-xs"
                  >
                    <option value="">🎯 Tous les types de formation</option>
                    <option value="presentiel">🏫 Présentiel</option>
                    <option value="en_ligne">💻 En ligne (À distance)</option>
                    <option value="les_deux">🔄 Présentiel + En ligne (Hybride)</option>
                    <option value="particulier">⭐ Cours particuliers</option>
                  </select>
                </div>

                {/* 4. Filtre Date d'inscription */}
                <div className="relative">
                  <select
                    value={dateFilter}
                    onChange={e => setDateFilter(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none transition-all text-gray-700 font-medium shadow-xs"
                  >
                    <option value="">📅 Toutes les dates</option>
                    <option value="today">Inscrits aujourd'hui</option>
                    <option value="this_week">Inscrits cette semaine (7j)</option>
                    <option value="this_month">Inscrits ce mois-ci</option>
                    <option value="custom">Période personnalisée...</option>
                  </select>
                </div>
              </div>

              {/* Sélecteurs de date personnalisée si "custom" */}
              {dateFilter === 'custom' && (
                <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-gray-600 bg-white p-3 rounded-xl border border-gray-200">
                  <span className="font-semibold text-gray-700 flex items-center gap-1">
                    <Calendar size={14} className="text-[#0056B3]" /> Du :
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#0056B3]"
                  />
                  <span className="font-semibold text-gray-700">Au :</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#0056B3]"
                  />
                </div>
              )}

              {/* Barre de réinitialisation si filtre actif */}
              {hasActiveFilters && (
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#0056B3]">
                    <Filter size={14} />
                    <span>Filtre appliqué : {filtered.length} étudiant{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}</span>
                  </div>
                  <button
                    onClick={resetFilters}
                    className="text-xs text-red-600 hover:text-red-700 font-bold hover:underline flex items-center gap-1 transition-colors"
                  >
                    <X size={14} /> Réinitialiser tous les filtres
                  </button>
                </div>
              )}
            </div>

            {/* Tableau des étudiants */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-white border-b border-gray-100 text-left">
                    <th className="px-5 py-4 w-10">
                      <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === filtered.length} onChange={toggleSelectAll} className="w-4 h-4 rounded text-[#0056B3] focus:ring-[#0056B3] accent-[#0056B3]" />
                    </th>
                    <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Étudiant</th>
                    <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Formation(s)</th>
                    <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type de formation</th>
                    <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date Inscription</th>
                    <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-gray-400 text-sm">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Users size={32} className="text-gray-300" />
                          <p className="font-semibold text-gray-600">Aucun étudiant ne correspond aux filtres</p>
                          {hasActiveFilters && (
                            <button onClick={resetFilters} className="text-xs text-[#0056B3] font-bold underline hover:text-[#003375]">
                              Effacer les filtres
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((u: any) => {
                      const studentCourses = getStudentCourses(u);
                      const modeBadge = getStudentMode(u);

                      return (
                        <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-4">
                            <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => toggleSelect(u.id)} className="w-4 h-4 rounded accent-[#0056B3]" />
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-[#0056B3] flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {u.name?.[0]?.toUpperCase() || '?'}
                              </div>
                              <div>
                                <span className="font-semibold text-gray-900 text-sm block">{u.name || 'Sans nom'}</span>
                                {u.matricule && (
                                  <span className="text-[11px] text-gray-400 font-mono">Matr: {u.matricule}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-xs space-y-0.5">
                              <p className="text-gray-700 font-medium">{u.email}</p>
                              {u.telephone && <p className="text-gray-400">{u.telephone}</p>}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {studentCourses.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {studentCourses.map((c, idx) => (
                                  <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-[#0056B3] border border-blue-100">
                                    {c.title}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Non renseignée</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${modeBadge.color}`}>
                              {modeBadge.label}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-gray-600 text-xs whitespace-nowrap">
                            {u.createdAt ? (
                              <div>
                                <p className="font-medium text-gray-800">{new Date(u.createdAt).toLocaleDateString('fr-FR')}</p>
                                <p className="text-[10px] text-gray-400">{new Date(u.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            {u.isActive !== false ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">
                                <CheckCircle size={12} /> Actif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                                <X size={12} /> Inactif
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => openEditModal(u)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="Modifier">
                                <Edit size={15} />
                              </button>
                              <button onClick={() => handleToggleActive(u)} className={`p-1.5 rounded-lg transition-colors ${u.isActive !== false ? 'hover:bg-yellow-50 text-yellow-600' : 'hover:bg-green-50 text-green-600'}`} title={u.isActive !== false ? 'Désactiver' : 'Activer'}>
                                {u.isActive !== false ? <Clock size={15} /> : <CheckCircle size={15} />}
                              </button>
                              <button onClick={() => handleDeleteStudent(u)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors" title="Supprimer">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showAddPanel && (
          <aside className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 xl:min-h-[600px]">
            <div className="flex items-start justify-between gap-3 mb-6">
              <div>
                <h3 className="font-black text-gray-900 text-lg">Inscrire un étudiant</h3>
                <p className="text-gray-500 text-sm">Suivez les étapes pour compléter l'inscription.</p>
              </div>
              <button onClick={() => setShowAddPanel(false)} className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                Fermer
              </button>
            </div>
            <StudentRegistrationForm embedded onSuccess={() => { setShowAddPanel(false); loadUsers(); toast('success', 'Étudiant inscrit avec succès !'); }} />
          </aside>
        )}
      </div>

      {/* Bulk Message Modal */}
      {showMsgModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-overlay">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="font-black text-gray-900 text-lg">Message Groupé ({selectedIds.length} dest.)</h3>
              <button onClick={() => setShowMsgModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSendBulkMsg} className="flex flex-col h-full overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Sujet du message</label>
                <input required value={msgForm.title} onChange={e => setMsgForm({ ...msgForm, title: e.target.value })} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none" placeholder="Rappel de cours..." />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Contenu</label>
                <textarea required rows={5} value={msgForm.message} onChange={e => setMsgForm({ ...msgForm, message: e.target.value })} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none resize-none" placeholder="Votre message..." />
              </div>
              </div>
              <div className="p-6 pt-4 border-t border-gray-100 shrink-0 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                <button type="button" onClick={() => setShowMsgModal(false)} className="px-4 py-2 text-gray-600 font-semibold text-sm">Annuler</button>
                <button type="submit" disabled={submitting} className="bg-[#FF6B00] text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-[#e05e00] disabled:opacity-50">
                  {submitting ? '...' : 'Envoyer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditModal && editingStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-overlay">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="font-black text-gray-900 text-lg">Modifier l'étudiant</h3>
              <button onClick={() => { setShowEditModal(false); setEditingStudent(null); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="flex flex-col h-full overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Prénom</label>
                  <input value={editForm.prenom} onChange={e => setEditForm({ ...editForm, prenom: e.target.value })} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nom</label>
                  <input value={editForm.nom} onChange={e => setEditForm({ ...editForm, nom: e.target.value })} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Téléphone</label>
                <input value={editForm.telephone} onChange={e => setEditForm({ ...editForm, telephone: e.target.value })} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ville</label>
                <input value={editForm.ville} onChange={e => setEditForm({ ...editForm, ville: e.target.value })} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none" />
              </div>
              </div>
              <div className="p-6 pt-4 border-t border-gray-100 shrink-0 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                <button type="button" onClick={() => { setShowEditModal(false); setEditingStudent(null); }} className="px-4 py-2 text-gray-600 font-semibold text-sm">Annuler</button>
                <button type="submit" disabled={submitting} className="bg-[#0056B3] text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-[#003375] disabled:opacity-50">
                  {submitting ? '...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Payments View ───────────────────────────────────────────────────
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
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
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none transition-colors"
            />
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none transition-colors"
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

// ─── Comptabilité View (Revenus + Dépenses) ──────────────────────────
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

function formatPrice(n: number) {
  return Number(n).toLocaleString("fr-FR");
}

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
    { id: 'scolarite', label: 'Scolarité', icon: <GraduationCap size={16} />, color: 'from-blue-500 to-blue-700' },
    { id: 'boutique', label: 'Boutique', icon: <ShoppingCart size={16} />, color: 'from-orange-500 to-orange-700' },
    { id: 'depenses', label: 'Dépenses', icon: <TrendingDown size={16} />, color: 'from-red-500 to-red-700' },
    { id: 'bilan', label: 'Bilan Global', icon: <BarChart3 size={16} />, color: 'from-purple-500 to-purple-700' },
    { id: 'salaries', label: 'Salaires', icon: <DollarSign size={16} />, color: 'from-green-500 to-green-700' },
  ];
  const activeComptaTab = COMPTA_TABS.find(t => t.id === comptaTab) || COMPTA_TABS[0];
  const totalRevenusCombined = totalRevenus + totalShopRevenus;
  const globalBalance = totalRevenusCombined - totalDepenses;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
        <div className="flex flex-wrap gap-2">
          {COMPTA_TABS.map(tab => (
            <button key={tab.id} onClick={() => setComptaTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${comptaTab === tab.id
                ? `bg-linear-to-r ${tab.color} text-white shadow-md scale-105`
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
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
            <div className="relative overflow-hidden bg-linear-to-br from-blue-500 to-blue-700 rounded-2xl p-5 text-white shadow-lg">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full" />
              <div className="absolute -right-1 top-8 w-12 h-12 bg-white/10 rounded-full" />
              <div className="flex items-center gap-2 mb-3 relative z-10">
                <TrendingUp size={18} />
                <span className="text-blue-100 text-sm font-medium">Inscriptions & Mensualités</span>
              </div>
              <div className="text-3xl font-black relative z-10">{formatPrice(totalRevenus)}</div>
              <div className="text-blue-200 text-sm mt-1 relative z-10">FCFA &bull; {paidPayments.length} paiements validés</div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3 text-gray-400">
                <CreditCard size={18} />
                <span className="text-sm font-medium">Transactions</span>
              </div>
              <div className="text-3xl font-black text-gray-900">{paidPayments.length}</div>
              <div className="text-gray-400 text-sm mt-1">Paiements réussis</div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-gray-600">
              <Filter size={15} />
              <span className="text-sm font-semibold">Filtrer la période</span>
            </div>
            <DateFilterBar />
          </div>

          {/* Transactions list */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-500" /> Paiements de scolarité
                <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{dateFilteredPaidPayments.length}</span>
              </h3>
              <span className="text-sm font-black text-blue-600">{formatPrice(totalRevenus)} FCFA</span>
            </div>
            {dateFilteredPaidPayments.length === 0 ? (
              <div className="py-12 text-center">
                <TrendingUp size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Aucun paiement de scolarité</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {dateFilteredPaidPayments.slice(0, 10).map((p: any) => (
                  <div key={p.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-blue-50/30 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                      <CheckCircle size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm truncate">{p.user?.name || 'Client inconnu'}</div>
                      <div className="text-gray-400 text-xs">{new Date(p.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-blue-600 text-sm">+{formatPrice(p.amount)} FCFA</div>
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
            <div className="relative overflow-hidden bg-linear-to-br from-orange-500 to-orange-700 rounded-2xl p-5 text-white shadow-lg">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full" />
              <div className="flex items-center gap-2 mb-3 relative z-10">
                <ShoppingCart size={18} />
                <span className="text-orange-100 text-sm font-medium">Ventes Boutique</span>
              </div>
              <div className="text-3xl font-black relative z-10">{formatPrice(totalShopRevenus)}</div>
              <div className="text-orange-200 text-sm mt-1 relative z-10">FCFA &bull; {paidShopOrders.length} commandes payées</div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3 text-gray-400">
                <ShoppingCart size={18} />
                <span className="text-sm font-medium">Commandes validées</span>
              </div>
              <div className="text-3xl font-black text-gray-900">{paidShopOrders.length}</div>
              <div className="text-gray-400 text-sm mt-1">Livrées ou en cours</div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-gray-600">
              <Filter size={15} />
              <span className="text-sm font-semibold">Filtrer la période</span>
            </div>
            <DateFilterBar />
          </div>

          {/* Orders list */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart size={16} className="text-orange-500" /> Commandes boutique
                <span className="bg-orange-50 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">{dateFilteredShopOrders.length}</span>
              </h3>
              <span className="text-sm font-black text-orange-600">{formatPrice(totalShopRevenus)} FCFA</span>
            </div>
            {dateFilteredShopOrders.length === 0 ? (
              <div className="py-12 text-center">
                <ShoppingCart size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Aucune vente boutique sur cette période</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {dateFilteredShopOrders.slice(0, 10).map((o: any) => (
                  <div key={o.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-orange-50/30 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0 font-bold text-xs">
                      {o.customerName?.slice(0, 2).toUpperCase() || 'CL'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm truncate">{o.customerName}</div>
                      <div className="text-gray-400 text-xs">{new Date(o.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })} &bull; {o.city}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-orange-600 text-sm">+{formatPrice(o.totalAmount)} FCFA</div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${o.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                        o.status === 'SHIPPED' ? 'bg-purple-100 text-purple-700' :
                          'bg-blue-100 text-blue-700'
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
            <div className="relative overflow-hidden bg-linear-to-br from-red-500 to-red-700 rounded-2xl p-5 text-white shadow-lg">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full" />
              <div className="flex items-center gap-2 mb-3 relative z-10">
                <TrendingDown size={18} />
                <span className="text-red-100 text-sm font-medium">Total Dépenses</span>
              </div>
              <div className="text-3xl font-black relative z-10">{formatPrice(totalDepenses)}</div>
              <div className="text-red-200 text-sm mt-1 relative z-10">FCFA &bull; {expenses.length} entrées</div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3 text-gray-400">
                <BarChart3 size={18} />
                <span className="text-sm font-medium">Catégories</span>
              </div>
              <div className="text-3xl font-black text-gray-900">{expenseByCategory.length}</div>
              <div className="text-gray-400 text-sm mt-1">Types de dépenses</div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-gray-600">
                <Filter size={15} />
                <span className="text-sm font-semibold">Filtrer la période</span>
              </div>
              <DateFilterBar />
            </div>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-linear-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:shadow-md transition-all hover:scale-105">
              <Plus size={15} /> Ajouter une dépense
            </button>
          </div>

          {/* Expense list */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                        {d.ville && <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{d.ville}</span>}
                        {d.category && <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{EXPENSE_CATEGORIES.find(c => c.value === d.category)?.label || d.category}</span>}
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 size={16} className="text-orange-500" /> Répartition par catégorie
                </h3>
              </div>
              <div className="p-5 space-y-3">
                {expenseByCategory.map((c: any) => (
                  <div key={c.category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{c.label}</span>
                      <span className="font-black text-red-600">-{formatPrice(c.amount)} FCFA <span className="text-gray-400 font-normal">({totalDepenses > 0 ? ((c.amount / totalDepenses) * 100).toFixed(1) : '0'}%)</span></span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
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
            <div className="relative overflow-hidden bg-linear-to-br from-blue-500 to-blue-700 rounded-2xl p-5 text-white shadow-lg">
              <div className="text-blue-200 text-xs font-semibold mb-2 uppercase tracking-wider">Scolarité</div>
              <div className="text-2xl font-black">{formatPrice(totalRevenus)}</div>
              <div className="text-blue-200 text-xs mt-1">FCFA</div>
            </div>
            <div className="relative overflow-hidden bg-linear-to-br from-orange-500 to-orange-700 rounded-2xl p-5 text-white shadow-lg">
              <div className="text-orange-200 text-xs font-semibold mb-2 uppercase tracking-wider">Boutique</div>
              <div className="text-2xl font-black">{formatPrice(totalShopRevenus)}</div>
              <div className="text-orange-200 text-xs mt-1">FCFA</div>
            </div>
            <div className="relative overflow-hidden bg-linear-to-br from-red-500 to-red-700 rounded-2xl p-5 text-white shadow-lg">
              <div className="text-red-200 text-xs font-semibold mb-2 uppercase tracking-wider">Dépenses</div>
              <div className="text-2xl font-black">-{formatPrice(totalDepenses)}</div>
              <div className="text-red-200 text-xs mt-1">FCFA</div>
            </div>
            <div className={`relative overflow-hidden bg-linear-to-br ${globalBalance >= 0 ? 'from-emerald-500 to-emerald-700' : 'from-rose-600 to-rose-800'} rounded-2xl p-5 text-white shadow-lg`}>
              <div className="text-white/70 text-xs font-semibold mb-2 uppercase tracking-wider">Résultat net</div>
              <div className="text-2xl font-black">{globalBalance >= 0 ? '+' : ''}{formatPrice(globalBalance)}</div>
              <div className="text-white/70 text-xs mt-1">{globalBalance >= 0 ? 'Bénéfice' : 'Déficit'}</div>
            </div>
          </div>

          {/* Revenue split visual */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2"><BarChart3 size={16} className="text-purple-500" /> Sources de revenus</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="flex items-center gap-2 font-medium text-gray-700"><GraduationCap size={14} className="text-blue-500" /> Scolarité (inscriptions & mensualités)</span>
                  <span className="font-black text-blue-600">{formatPrice(totalRevenus)} FCFA</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div className="bg-linear-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-700"
                    style={{ width: totalRevenusCombined > 0 ? `${(totalRevenus / totalRevenusCombined) * 100}%` : '0%' }} />
                </div>
                <div className="text-xs text-gray-400 mt-1">{totalRevenusCombined > 0 ? ((totalRevenus / totalRevenusCombined) * 100).toFixed(1) : '0'}% du total</div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="flex items-center gap-2 font-medium text-gray-700"><ShoppingCart size={14} className="text-orange-500" /> Boutique (ventes produits)</span>
                  <span className="font-black text-orange-600">{formatPrice(totalShopRevenus)} FCFA</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div className="bg-linear-to-r from-orange-400 to-orange-600 h-3 rounded-full transition-all duration-700"
                    style={{ width: totalRevenusCombined > 0 ? `${(totalShopRevenus / totalRevenusCombined) * 100}%` : '0%' }} />
                </div>
                <div className="text-xs text-gray-400 mt-1">{totalRevenusCombined > 0 ? ((totalShopRevenus / totalRevenusCombined) * 100).toFixed(1) : '0'}% du total</div>
              </div>
            </div>
          </div>

          {/* Monthly table */}
          {monthlyData.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><BarChart3 size={16} className="text-blue-500" /> Évolution mensuelle (Scolarité)</h3>
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
                        <td className="py-3 px-4 font-black text-blue-600 text-sm">+{formatPrice(m.revenus)} FCFA</td>
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
                      <td className="py-3 px-4 font-black text-blue-600 text-sm">+{formatPrice(totalRevenus)} FCFA</td>
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center gap-2"><MapPin size={16} className="text-purple-500" /> Par ville</h3>
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
                            <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold">
                              {c.city.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-semibold text-gray-900 text-sm">{c.city}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-black text-blue-600 text-sm">+{formatPrice(c.revenue)} FCFA</td>
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
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[90vh]">
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
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                      required placeholder="Ex : Salaire professeur Mathématiques" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Montant (FCFA) *</label>
                    <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                      required min="1" placeholder="50 000" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Ville</label>
                    <input type="text" value={form.ville} list="city-list" onChange={e => setForm({ ...form, ville: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                      placeholder="Abidjan, Bouaké..." />
                    <datalist id="city-list">
                      {cities.map(c => <option key={c.id} value={c.name} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Catégorie</label>
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white">
                      {EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Mode de paiement</label>
                    <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white">
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
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white">
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
                  className="flex-1 py-3 rounded-xl border border-gray-200 bg-white text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-linear-to-r from-red-500 to-red-600 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2">
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

// ─── Notifications View ──────────────────────────────────────────────
function NotifsView() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifs = () => {
    setLoading(true);
    fetchNotifications()
      .then(setNotifs)
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadNotifs(); }, []);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    loadNotifs();
  };

  if (loading) return <LoadingSpinner />;

  const unreadCount = notifs.filter((n: any) => !n.isRead).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-black text-gray-900 flex items-center gap-2">
          <Bell size={18} className="text-[#FF6B00]" /> Notifications
          {unreadCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</span>
          )}
        </h2>
      </div>
      <div className="divide-y divide-gray-100">
        {notifs.length === 0 ? (
          <div className="p-8 text-center">
            <Bell size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">Aucune notification</p>
          </div>
        ) : (
          notifs.map((n: any) => (
            <div key={n.id} className={`p-5 flex items-start gap-4 transition-colors ${n.isRead ? 'bg-white' : 'bg-blue-50/50'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${n.isRead ? 'bg-gray-100 text-gray-400' : 'bg-[#0056B3] text-white'}`}>
                <Mail size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-gray-900 text-sm">{n.title}</span>
                  {!n.isRead && <span className="w-2 h-2 bg-[#0056B3] rounded-full" />}
                </div>
                <p className="text-gray-600 text-sm">{n.message}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-gray-400 text-xs flex items-center gap-1"><Calendar size={12} /> {new Date(n.createdAt).toLocaleDateString('fr-FR')}</span>
                  {!n.isRead && (
                    <button onClick={() => handleMarkRead(n.id)} className="text-[#0056B3] text-xs font-semibold hover:underline">
                      Marquer comme lu
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Formations & Concours View ───────────────────────────────────────────
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  'Concours Juridiques & Judiciaires': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-800' },
  'Administration Publique': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800' },
  'Sécurité & Force Publique': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800' },
  'Technologies & Métiers Numériques': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-800' },
};

const DEFAULT_CATEGORY_COLOR = { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-800' };

function FormationsView() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ id: '', title: '', category: 'Concours Juridiques & Judiciaires', description: '', price: '' });
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirmation Modal state
  const [courseToDelete, setCourseToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { toast } = useToast();

  const CATEGORY_PRESETS = [
    'Concours Juridiques & Judiciaires',
    'Administration Publique',
    'Sécurité & Force Publique',
    'Technologies & Métiers Numériques',
    'Santé & Paramédical',
    'Éducation & Enseignement',
    'Finances & Gestion',
  ];

  const loadCourses = async () => {
    setLoading(true);
    try {
      const data = await fetchCourses();
      setCourses(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des formations :', err);
      toast('error', 'Erreur lors du chargement des formations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  // Compute unique categories from existing courses + presets
  const availableCategories = useMemo(() => {
    const fromCourses = courses.map(c => c.category || 'Général').filter(Boolean);
    const combined = Array.from(new Set([...CATEGORY_PRESETS, ...fromCourses]));
    return combined;
  }, [courses]);

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      const matchesCategory = selectedCategory === 'ALL' || (c.category || 'Général') === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (c.title || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [courses, selectedCategory, searchQuery]);

  // Stats calculation
  const totalStudentsEnrolled = useMemo(() => {
    return courses.reduce((acc, c) => acc + (c._count?.subscriptions || c._count?.payments || 0), 0);
  }, [courses]);

  const averagePrice = useMemo(() => {
    if (!courses.length) return 0;
    const sum = courses.reduce((acc, c) => acc + (Number(c.price) || 0), 0);
    return Math.round(sum / courses.length);
  }, [courses]);

  const handleOpenAdd = () => {
    setForm({ id: '', title: '', category: CATEGORY_PRESETS[0], description: '', price: '' });
    setIsCustomCategory(false);
    setCustomCategory('');
    setShowModal(true);
  };

  const handleEdit = (c: any) => {
    const isPreset = CATEGORY_PRESETS.includes(c.category);
    setForm({
      id: c.id,
      title: c.title || '',
      category: isPreset ? c.category : 'CUSTOM',
      description: c.description || '',
      price: c.price !== undefined ? String(c.price) : '',
    });
    if (!isPreset && c.category) {
      setIsCustomCategory(true);
      setCustomCategory(c.category);
    } else {
      setIsCustomCategory(false);
      setCustomCategory('');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast('error', 'Le titre de la formation est obligatoire');
      return;
    }
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) {
      toast('error', 'Veuillez saisir un prix valide en FCFA');
      return;
    }

    const finalCategory = isCustomCategory
      ? (customCategory.trim() || 'Général')
      : form.category;

    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        category: finalCategory,
        description: form.description.trim() || undefined,
        price: Number(form.price),
      };

      if (form.id) {
        await updateCourse(form.id, payload);
        toast('success', 'Formation modifiée avec succès');
      } else {
        await createCourse(payload);
        toast('success', 'Nouvelle formation ajoutée avec succès');
      }

      await loadCourses();
      setShowModal(false);
    } catch (err: any) {
      console.error('Erreur enregistrement formation :', err);
      toast('error', err.message || 'Erreur lors de l\'enregistrement de la formation');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!courseToDelete) return;
    setDeleting(true);
    try {
      await deleteCourse(courseToDelete.id);
      toast('success', `La formation "${courseToDelete.title}" a été supprimée`);
      setCourseToDelete(null);
      await loadCourses();
    } catch (err: any) {
      console.error('Erreur suppression formation :', err);
      toast('error', err.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-[#0056B3]">
              <GraduationCap size={22} />
            </span>
            <h2 className="text-xl font-black text-gray-900">Gestion des Formations & Concours</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Gérez le catalogue des filières dispensées par Excellence Académie, leurs catégories et tarifs officiels.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 bg-[#0056B3] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#003d80] transition-colors shadow-sm"
        >
          <Plus size={18} />
          <span>Ajouter une formation</span>
        </button>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0056B3] flex items-center justify-center font-bold">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Formations</div>
            <div className="text-2xl font-black text-gray-900">{courses.length}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Award size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Catégories</div>
            <div className="text-2xl font-black text-gray-900">
              {new Set(courses.map(c => c.category || 'Général')).size}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-[#FF6B00] flex items-center justify-center font-bold">
            <DollarSign size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tarif Moyen</div>
            <div className="text-2xl font-black text-[#FF6B00]">{averagePrice.toLocaleString('fr-FR')} <span className="text-xs text-gray-600">F</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Users size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Inscrits Associés</div>
            <div className="text-2xl font-black text-gray-900">{totalStudentsEnrolled}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher une formation par nom, mot-clé ou catégorie..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-[#0056B3] focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-gray-500">
              {filteredCourses.length} formation{filteredCourses.length > 1 ? 's' : ''} trouvée{filteredCourses.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-[#0056B3] text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Toutes ({courses.length})
          </button>
          {availableCategories.map(cat => {
            const count = courses.filter(c => (c.category || 'Général') === cat).length;
            if (count === 0 && selectedCategory !== cat) return null;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#0056B3] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Courses Cards Grid */}
      {filteredCourses.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-blue-50 text-[#0056B3] rounded-full flex items-center justify-center mx-auto mb-3">
            <GraduationCap size={32} />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">Aucune formation correspondante</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
            {searchQuery || selectedCategory !== 'ALL'
              ? 'Aucune formation ne correspond à vos critères de recherche. Essayez de réinitialiser vos filtres.'
              : 'Aucune formation n\'est encore configurée. Ajoutez votre première formation dès maintenant.'}
          </p>
          {(searchQuery || selectedCategory !== 'ALL') ? (
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); }}
              className="text-xs font-bold text-[#0056B3] hover:underline"
            >
              Réinitialiser les filtres
            </button>
          ) : (
            <button
              onClick={handleOpenAdd}
              className="bg-[#0056B3] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#003d80]"
            >
              Ajouter une formation
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredCourses.map(c => {
            const cat = c.category || 'Général';
            const style = CATEGORY_COLORS[cat] || DEFAULT_CATEGORY_COLOR;
            const studentsCount = c._count?.subscriptions || c._count?.payments || 0;

            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all flex flex-col justify-between group relative"
              >
                {/* Header with category and actions */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide uppercase ${style.badge}`}>
                      {cat}
                    </span>
                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(c)}
                        className="w-8 h-8 rounded-lg bg-blue-50 text-[#0056B3] flex items-center justify-center hover:bg-blue-100 transition-colors"
                        title="Modifier cette formation"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        onClick={() => setCourseToDelete(c)}
                        className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"
                        title="Supprimer cette formation"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-black text-gray-900 text-base mb-1.5 leading-snug group-hover:text-[#0056B3] transition-colors">
                    {c.title}
                  </h3>
                  <p className="text-gray-500 text-xs leading-relaxed line-clamp-3 mb-4 min-h-[3.25rem]">
                    {c.description || "Aucune description détaillée renseignée."}
                  </p>
                </div>

                {/* Footer with Price & Info */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Users size={14} className="text-gray-400" />
                    <span>{studentsCount} inscrit{studentsCount > 1 ? 's' : ''}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold block leading-tight">Tarif</span>
                    <span className="font-black text-[#FF6B00] text-base">
                      {Number(c.price || 0).toLocaleString('fr-FR')} <span className="text-xs font-bold">FCFA</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Ajouter / Modifier une formation */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-overlay animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 bg-gray-50/70 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-blue-50 text-[#0056B3]">
                  <GraduationCap size={20} />
                </span>
                <div>
                  <h3 className="font-black text-gray-900 text-base">
                    {form.id ? 'Modifier la formation' : 'Ajouter une nouvelle formation'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {form.id ? 'Mettez à jour les informations et tarifs de la filière' : 'Définissez une nouvelle filière de concours ou de cours'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Titre */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Titre de la formation / Concours *
                  </label>
                  <input
                    required
                    type="text"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="Ex: Magistrature, ENA, Police, Greffe..."
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none transition-colors"
                  />
                </div>

                {/* Catégorie */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Catégorie de la formation *
                  </label>
                  <select
                    value={isCustomCategory ? 'CUSTOM' : form.category}
                    onChange={e => {
                      if (e.target.value === 'CUSTOM') {
                        setIsCustomCategory(true);
                      } else {
                        setIsCustomCategory(false);
                        setForm({ ...form, category: e.target.value });
                      }
                    }}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none bg-white transition-colors"
                  >
                    {CATEGORY_PRESETS.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="CUSTOM">+ Autre catégorie personnalisée...</option>
                  </select>

                  {isCustomCategory && (
                    <div className="mt-2">
                      <input
                        type="text"
                        required
                        value={customCategory}
                        onChange={e => setCustomCategory(e.target.value)}
                        placeholder="Nom de la nouvelle catégorie..."
                        className="w-full px-4 py-2 border-2 border-[#0056B3]/40 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none bg-blue-50/20"
                      />
                    </div>
                  )}
                </div>

                {/* Prix */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Prix de la formation (FCFA) *
                  </label>
                  <div className="relative">
                    <input
                      required
                      type="number"
                      min="0"
                      step="1000"
                      value={form.price}
                      onChange={e => setForm({ ...form, price: e.target.value })}
                      placeholder="Ex: 150000"
                      className="w-full pl-4 pr-16 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:border-[#0056B3] focus:outline-none transition-colors"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-500">
                      FCFA
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Tarif standard applicable pour l'inscription ou le forfait de cette formation.
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Description & Programme
                  </label>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Détails sur les modules dispensés, durée, conditions d'accès, prérequis..."
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none resize-none transition-colors"
                  />
                </div>
              </div>

              {/* Modal footer */}
              <div className="p-4 border-t border-gray-100 shrink-0 flex justify-end gap-3 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 font-semibold text-sm hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-[#0056B3] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#003d80] transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>{form.id ? 'Mettre à jour' : 'Enregistrer la formation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirmation de suppression */}
      {courseToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-overlay animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertCircle size={26} />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-base">Confirmer la suppression</h3>
                <p className="text-xs text-gray-500">Cette action est irréversible</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement la formation{' '}
              <strong className="text-gray-900">« {courseToDelete.title} »</strong> ({Number(courseToDelete.price || 0).toLocaleString('fr-FR')} FCFA) ?
              Elle sera retirée des formulaires d'inscription et du catalogue du site.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCourseToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 text-gray-600 font-semibold text-sm hover:bg-gray-100 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                <span>Supprimer définitivement</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Alias for backward compatibility
const ConcoursView = FormationsView;

// ─── Users View ─────────────────────────────────────────────────────
function UsersView() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userTab, setUserTab] = useState(() => localStorage.getItem('adminUserTab') || 'admin');
  const [userForm, setUserForm] = useState({ prenom: '', nom: '', email: '', password: '', role: 'TEACHER', telephone: '', ville: '', hourlyRate: '' });

  const USER_TABS = [
    { id: 'admin', label: 'Administration', icon: <Shield size={15} />, roles: ['ADMIN', 'ACCOUNTANT', 'SECRETARY'] },
    { id: 'teachers', label: 'Enseignants', icon: <GraduationCap size={15} />, roles: ['TEACHER'] },
    { id: 'students', label: '\u00c9tudiants', icon: <BookOpen size={15} />, roles: ['STUDENT'] },
    { id: 'parents', label: 'Parents', icon: <Heart size={15} />, roles: ['PARENT'] },
  ];

  const loadUsers = () => {
    setLoading(true);
    fetchUsers()
      .then(data => setUsers(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => { localStorage.setItem('adminUserTab', userTab); }, [userTab]);

  const activeTab = USER_TABS.find(t => t.id === userTab) || USER_TABS[0];
  const filteredUsers = users.filter(u => activeTab.roles.includes(u.role));

  const openModal = (user?: any) => {
    if (user) {
      const [firstName, ...rest] = (user.name || '').split(' ');
      setEditingUserId(user.id);
      setUserForm({
        prenom: firstName || '',
        nom: rest.join(' ') || '',
        email: user.email || '',
        password: '',
        role: user.role || 'TEACHER',
        telephone: user.telephone || '',
        ville: user.ville || '',
        hourlyRate: user.hourlyRate ? String(user.hourlyRate) : '',
      });
      setMessage('Laissez le mot de passe vide pour le conserver.');
      setShowPassword(false);
    } else {
      const tempPwd = generateTempPassword();
      setEditingUserId(null);
      setUserForm({ prenom: '', nom: '', email: '', password: tempPwd, role: 'TEACHER', telephone: '', ville: '', hourlyRate: '' });
      setMessage('Mot de passe provisoire : ' + tempPwd);
      setShowPassword(true);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUserId(null);
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      if (editingUserId) {
        const updated = await updateUser(editingUserId, {
          prenom: userForm.prenom,
          nom: userForm.nom,
          email: userForm.email,
          password: userForm.password || undefined,
          role: userForm.role,
          telephone: userForm.telephone,
          ville: userForm.ville,
          hourlyRate: userForm.hourlyRate || undefined,
        });
        setUsers(users.map((user) => (user.id === updated.id ? updated : user)));
        setMessage('Compte utilisateur mis à jour.');
      } else {
        const created = await createUser({
          prenom: userForm.prenom,
          nom: userForm.nom,
          email: userForm.email,
          password: userForm.password,
          role: userForm.role,
          telephone: userForm.telephone,
          ville: userForm.ville,
          hourlyRate: userForm.hourlyRate || undefined,
        });
        setUsers([created, ...users]);
        setMessage('Compte utilisateur créé avec succès.');
      }
      closeModal();
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message || 'Erreur lors de l’enregistrement du compte.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[28px] shadow-[0_20px_60px_rgba(15,23,42,0.08)] border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="font-black text-gray-900 text-lg">Gestion des utilisateurs</h2>
            <p className="text-gray-500 text-sm mt-1">Cliquez sur l’icône au bout de la ligne pour modifier un compte.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-semibold">{users.length} comptes</span>
            <button type="button" onClick={() => openModal()} className="inline-flex items-center gap-2 rounded-full bg-[#0056B3] text-white text-sm font-semibold px-4 py-2 hover:bg-[#003375] focus:outline-none">
              <Plus size={14} /> Ajouter
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {USER_TABS.map(tab => (
            <button key={tab.id} onClick={() => setUserTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${userTab === tab.id
                ? 'bg-[#0056B3] text-white shadow-md'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}>
              {tab.icon} {tab.label}
              <span className={`ml-1 text-xs ${userTab === tab.id ? 'text-blue-200' : 'text-gray-400'}`}>
                ({users.filter(u => tab.roles.includes(u.role)).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[28px] shadow-[0_20px_60px_rgba(15,23,42,0.08)] border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-y-3">
            <thead className="bg-gray-50">
              <tr>
                {['Nom', 'Email', 'Rôle', 'Taux horaire', 'Ville', 'Téléphone', 'Actions'].map(header => (
                  <th key={header} className="px-4 py-4 text-left text-gray-500 text-xs font-semibold uppercase tracking-wide">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400 text-sm">Chargement...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400 text-sm">Aucun utilisateur dans cette catégorie</td></tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border border-gray-100 rounded-3xl bg-white shadow-sm hover:shadow-md transition-all duration-200">
                    <td className="px-4 py-4 text-sm font-semibold text-gray-900">{user.name || user.email}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{user.role}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{user.role === 'TEACHER' ? (user.hourlyRate ? `${user.hourlyRate.toLocaleString('fr-FR')} FCFA/h` : 'Défaut 5000') : '—'}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{user.ville || '—'}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{user.telephone || '—'}</td>
                    <td className="px-4 py-4 text-right">
                      <button type="button" onClick={() => openModal(user)} className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                        <Edit size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 modal-overlay">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="text-lg font-black text-gray-900">{editingUserId ? 'Modifier l’utilisateur' : 'Ajouter un utilisateur'}</h3>
                <p className="text-gray-500 text-sm mt-1">Formulaire compact et rapide.</p>
              </div>
              <button type="button" onClick={closeModal} className="text-gray-500 hover:text-gray-700 focus:outline-none">Annuler</button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
              <div className="space-y-4 px-6 py-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-gray-600">Prénom</label>
                <input value={userForm.prenom} onChange={e => setUserForm({ ...userForm, prenom: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-2xl text-sm focus:border-[#0056B3] focus:outline-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-gray-600">Nom</label>
                <input value={userForm.nom} onChange={e => setUserForm({ ...userForm, nom: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-2xl text-sm focus:border-[#0056B3] focus:outline-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-gray-600">Email</label>
                <input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-2xl text-sm focus:border-[#0056B3] focus:outline-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-gray-600">Mot de passe</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-2xl text-sm focus:border-[#0056B3] focus:outline-none" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-gray-600">Rôle</label>
                <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-2xl text-sm focus:border-[#0056B3] focus:outline-none">
                  <option value="ADMIN">Administrateur</option>
                  <option value="ACCOUNTANT">Comptable</option>
                  <option value="SECRETARY">Secrétaire</option>
                  <option value="TEACHER">Enseignant</option>
                  <option value="STUDENT">Étudiant</option>
                  <option value="PARENT">Parent</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-gray-600">Ville / Centre</label>
                <input value={userForm.ville} onChange={e => setUserForm({ ...userForm, ville: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-2xl text-sm focus:border-[#0056B3] focus:outline-none" />
              </div>
              {userForm.role === 'TEACHER' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block text-xs font-semibold text-gray-600">Taux horaire (FCFA/h)</label>
                  <input type="number" min="0" value={userForm.hourlyRate} onChange={e => setUserForm({ ...userForm, hourlyRate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-2xl text-sm focus:border-[#0056B3] focus:outline-none" placeholder="5000" />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-gray-600">Téléphone</label>
                <input value={userForm.telephone} onChange={e => setUserForm({ ...userForm, telephone: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-2xl text-sm focus:border-[#0056B3] focus:outline-none" />
              </div>
              {message && <p className="text-sm text-gray-600">{message}</p>}
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0 bg-gray-50">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-2xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 bg-white">Annuler</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 rounded-2xl bg-[#0056B3] text-white text-sm font-semibold hover:bg-[#003375] disabled:opacity-70">
                  {submitting ? '...' : editingUserId ? 'Mettre à jour' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reports View ────────────────────────────────────────────────────
function ReportsView({ apiStats }: { apiStats: any }) {
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
            <FileText size={18} className="text-[#0056B3]" /> Rapports & Statistiques
          </h2>
          <p className="text-gray-500 text-sm mt-1">Vue synthétique des revenus, dépenses et inscriptions.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExportCsv} className="inline-flex items-center gap-2 bg-[#0056B3] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#003375]">
            <Download size={16} /> Exporter CSV
          </button>
          <button onClick={handleExportPdf} className="inline-flex items-center gap-2 bg-[#10B981] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#0f7f5a]">
            <FileText size={16} /> Exporter PDF
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">Tendance financière</h3>
          <p className="text-gray-500 text-sm mb-4">Évolution des revenus et dépenses jusqu’à aujourd’hui.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="Revenus" fill="#10B981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Depenses" fill="#EF4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">Inscriptions par mois</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={enrollmentsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="Inscriptions" fill="#0056B3" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4">Revenus par ville (FCFA)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="Revenus" fill="#FF6B00" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Settings View ───────────────────────────────────────────────────
const AFRICA_COUNTRIES = [
  'Côte d\'Ivoire', 'Bénin', 'Burkina Faso', 'Cap-Vert', 'Ghana', 'Guinée',
  'Mali', 'Niger', 'Nigeria', 'Sénégal', 'Togo', 'Cameroun',
  'Congo', 'Gabon', 'République Démocratique du Congo',
];

const EUROPE_COUNTRIES = [
  'France', 'Belgique', 'Suisse', 'Allemagne', 'Italie', 'Espagne',
  'Portugal', 'Royaume-Uni', 'Pays-Bas', 'Luxembourg',
];

const SETTINGS_TABS = [
  { id: 'account', label: 'Compte', icon: <User size={16} /> },
  { id: 'concours', label: 'Concours', icon: <BookOpen size={16} /> },
  { id: 'cities', label: 'Villes couvertes', icon: <MapPin size={16} /> },
];

function SettingsView({ currentUser, onRefresh }: { currentUser: any; onRefresh?: () => void }) {
  const [activeSettingsTab, setActiveSettingsTab] = useState(() => localStorage.getItem('adminSettingsTab') || 'account');

  const [form, setForm] = useState({ name: currentUser?.name || 'Administrateur', email: currentUser?.email || 'admin@excellence.ci', oldPass: '', newPass: '', image: currentUser?.image || '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const [cities, setCities] = useState<any[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [showCityModal, setShowCityModal] = useState(false);
  const [editingCity, setEditingCity] = useState<any>(null);
  const [cityForm, setCityForm] = useState({ name: '', country: '' });
  const [citySubmitting, setCitySubmitting] = useState(false);
  const { toast, confirm } = useToast();

  const loadCities = async () => {
    setCitiesLoading(true);
    try { const data = await fetchCities(); setCities(data); } catch { } finally { setCitiesLoading(false); }
  };

  useEffect(() => { loadCities(); }, []);
  useEffect(() => { localStorage.setItem('adminSettingsTab', activeSettingsTab); }, [activeSettingsTab]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      setMessageType('error');
      setMessage('Le nom d\'affichage est requis.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      if (currentUser?.id) {
        await updateUser(currentUser.id, {
          name: form.name,
          image: form.image,
          ...(form.oldPass && form.newPass ? { password: form.newPass } : {}),
        });
      }
      setMessageType('success');
      setMessage('Paramètres mis à jour avec succès.');
      setForm(prev => ({ ...prev, oldPass: '', newPass: '' }));
      if (onRefresh) onRefresh();
    } catch {
      setMessageType('error');
      setMessage('Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  };

  const handleCitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCitySubmitting(true);
    try {
      if (editingCity) {
        await updateCity(editingCity.id, cityForm);
        toast('success', 'Ville modifiée avec succès');
      } else {
        await createCity(cityForm);
        toast('success', 'Ville ajoutée avec succès');
      }
      setShowCityModal(false);
      setEditingCity(null);
      setCityForm({ name: '', country: '' });
      loadCities();
    } catch (err: any) {
      toast('error', err?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setCitySubmitting(false);
    }
  };

  const openCityModal = (city?: any) => {
    if (city) {
      setEditingCity(city);
      setCityForm({ name: city.name, country: city.country || '' });
    } else {
      setEditingCity(null);
      setCityForm({ name: '', country: "Côte d'Ivoire" });
    }
    setShowCityModal(true);
  };

  const handleDeleteCity = async (id: string) => {
    const ok = await confirm('Supprimer cette ville ?');
    if (!ok) return;
    try {
      await deleteCity(id);
      setCities(cities.filter(c => c.id !== id));
      toast('success', 'Ville supprimée');
    } catch {
      toast('error', 'Erreur lors de la suppression');
    }
  };

  const initials = form.name?.split(" ").map((s: string) => s[0]).join("").toUpperCase() || "A";

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 flex gap-1">
        {SETTINGS_TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveSettingsTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeSettingsTab === tab.id ? 'bg-[#0056B3] text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Account Settings */}
      {activeSettingsTab === 'account' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-linear-to-r from-blue-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#0056B3] flex items-center justify-center text-white"><User size={22} /></div>
              <div>
                <h2 className="font-black text-gray-900">Mon compte</h2>
                <p className="text-gray-500 text-sm">Informations personnelles et sécurité</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {message && (
              <div className={`px-4 py-3 rounded-xl text-sm font-semibold ${messageType === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {message}
              </div>
            )}
            <div className="flex items-center gap-5">
              <div className="relative group">
                <label className="cursor-pointer block">
                  {form.image ? (
                    <img src={form.image} alt="Photo" className="w-20 h-20 rounded-full object-cover shadow-md border-2 border-white" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-linear-to-br from-[#0056B3] to-blue-400 flex items-center justify-center text-white text-2xl font-black shadow-md">{initials}</div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={20} className="text-white" />
                  </div>
                </label>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 border-2 border-white rounded-full" />
                <input type="file" accept="image/*" className="hidden" id="photo-upload"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) { setMessage('Image trop volumineuse (max 2 Mo)'); setMessageType('error'); return; }
                    const reader = new FileReader();
                    reader.onload = () => setForm({ ...form, image: reader.result as string });
                    reader.readAsDataURL(file);
                  }} />
              </div>
              <div>
                <div className="font-bold text-gray-900">{form.name || 'Administrateur'}</div>
                <div className="text-gray-500 text-sm">{currentUser?.email}</div>
                <div className="mt-2">
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-[#0056B3] text-xs font-semibold px-2.5 py-1 rounded-full">
                    <CheckCircle size={10} /> Administrateur
                  </span>
                </div>
                <label htmlFor="photo-upload" className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#0056B3] hover:underline cursor-pointer">
                  <Camera size={12} /> Changer la photo
                </label>
              </div>
            </div>
            <hr className="border-gray-100" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom d'affichage</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                <input value={form.email} disabled
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
              </div>
            </div>
            <hr className="border-gray-100" />
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Changer de mot de passe</h3>
              <p className="text-gray-500 text-xs mb-4">Laissez vides si vous ne souhaitez pas changer votre mot de passe.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mot de passe actuel</label>
                  <input type="password" value={form.oldPass} onChange={e => setForm({ ...form, oldPass: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nouveau mot de passe</label>
                  <input type="password" value={form.newPass} onChange={e => setForm({ ...form, newPass: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
                </div>
              </div>
            </div>
            <div className="pt-2 flex justify-end border-t border-gray-100">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 bg-[#0056B3] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#003375] transition-all disabled:opacity-50 shadow-sm">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* City Management */}
      {activeSettingsTab === 'cities' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-linear-to-r from-purple-50 to-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center text-white"><MapPin size={22} /></div>
              <div>
                <h2 className="font-black text-gray-900">Villes couvertes</h2>
                <p className="text-gray-500 text-sm">Ajoutez et gérez les villes où vous opérez</p>
              </div>
            </div>
            <button onClick={() => openCityModal()}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-purple-700 transition-all shadow-sm">
              <Plus size={16} /> Nouvelle ville
            </button>
          </div>
          <div className="p-6">
            {citiesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={28} className="animate-spin text-purple-600" />
              </div>
            ) : cities.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
                  <MapPin size={32} className="text-purple-300" />
                </div>
                <p className="text-gray-500 font-semibold">Aucune ville couverte pour le moment</p>
                <p className="text-gray-400 text-sm mt-1">Ajoutez les villes où vous avez des étudiants ou des dépenses.</p>
                <button onClick={() => openCityModal()}
                  className="mt-4 inline-flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-purple-700 transition-all">
                  <Plus size={16} /> Ajouter une ville
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-500"><span className="font-bold text-gray-900">{cities.length}</span> ville{cities.length > 1 ? 's' : ''} enregistrée{cities.length > 1 ? 's' : ''}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cities.map(city => (
                    <div key={city.id} className="group relative bg-white border border-gray-200 rounded-2xl p-5 hover:border-purple-200 hover:shadow-md transition-all duration-200">
                      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openCityModal(city)}
                          className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 shadow-sm border border-gray-100">
                          <Edit size={13} />
                        </button>
                        <button onClick={() => handleDeleteCity(city.id)}
                          className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 shadow-sm border border-gray-100">
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-black text-sm mb-3 shadow-sm">
                        {city.name.slice(0, 2).toUpperCase()}
                      </div>
                      <h3 className="font-bold text-gray-900">{city.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-gray-400 text-xs">{city.country}</span>
                        <span className="text-gray-300">•</span>
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${city.isActive !== false ? 'text-green-600' : 'text-red-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${city.isActive !== false ? 'bg-green-400' : 'bg-red-400'}`} />
                          {city.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Concours */}
      {activeSettingsTab === 'concours' && <ConcoursView />}

      {/* City Modal */}
      {showCityModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-overlay">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                  <MapPin size={20} />
                </div>
                <h3 className="font-black text-gray-900">{editingCity ? 'Modifier' : 'Ajouter'} une ville</h3>
              </div>
              <button onClick={() => { setShowCityModal(false); setEditingCity(null); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCitySubmit} className="space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nom de la ville *</label>
                <input type="text" value={cityForm.name} onChange={e => setCityForm({ ...cityForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all" required placeholder="Ex: Abidjan, Bouaké..." />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Pays *</label>
                <select value={cityForm.country} onChange={e => setCityForm({ ...cityForm, country: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all" required>
                  <option value="">Sélectionner un pays</option>
                  <optgroup label="Afrique">
                    {AFRICA_COUNTRIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Europe">
                    {EUROPE_COUNTRIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div className="pt-2 flex gap-3 justify-end border-t border-gray-100">
                <button type="button" onClick={() => { setShowCityModal(false); setEditingCity(null); }}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all">
                  Annuler
                </button>
                <button type="submit" disabled={citySubmitting}
                  className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-purple-700 transition-all disabled:opacity-50">
                  {citySubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  {citySubmitting ? 'Enregistrement...' : editingCity ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Contracts View ──────────────────────────────────────────────────
function ContractsView() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<any>(null);

  const loadContracts = () => {
    setLoading(true);
    fetchAllContracts()
      .then(setContracts)
      .catch(() => { })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadContracts(); }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-gray-900 flex items-center gap-2">
            <FileText size={18} className="text-[#0056B3]" /> Contrats signés
          </h2>
          <p className="text-gray-500 text-sm mt-1">{contracts.length} contrat(s) signé(s)</p>
        </div>
      </div>

      {contracts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
          <FileText size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">Aucun contrat signé pour le moment</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {["Étudiant", "Matricule", "Email", "Téléphone", "Pays", "Signé le", ""].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-gray-500 text-xs font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contracts.map((c: any) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-gray-900 text-sm">{c.user?.name || "—"}</td>
                    <td className="py-3 px-4 text-xs text-gray-500 font-mono">{c.user?.matricule || "—"}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{c.user?.email || "—"}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{c.user?.telephone || "—"}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{c.user?.pays || "—"}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {new Date(c.signedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedContract(selectedContract?.id === c.id ? null : c)}
                        className="px-3 py-1.5 bg-[#0056B3] text-white rounded-lg text-xs font-semibold hover:bg-[#003375] whitespace-nowrap"
                      >
                        {selectedContract?.id === c.id ? 'Masquer' : 'Voir le contrat'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedContract && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-[#0056B3]" />
              <span className="font-bold text-gray-900 text-sm">
                Contrat de {selectedContract.user?.name || "l'étudiant"}
              </span>
              <span className="text-xs text-gray-500">
                — Signé le {new Date(selectedContract.signedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <button onClick={() => setSelectedContract(null)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <div className="p-6">
            <h3 className="font-bold text-gray-900 text-sm mb-3">Contrat de formation signé</h3>
            <div className="h-[600px] border border-gray-200 rounded-xl overflow-hidden">
              <iframe
                src={getSignedContractPdfUrl(selectedContract.id)}
                className="w-full h-full"
                title="Contrat signé"
              />
            </div>
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
                <p><strong>Étudiant :</strong> {selectedContract.user?.name || "—"}</p>
                <p><strong>Email :</strong> {selectedContract.user?.email || "—"}</p>
                <p><strong>Matricule :</strong> {selectedContract.user?.matricule || "—"}</p>
                <p><strong>Téléphone :</strong> {selectedContract.user?.telephone || "—"}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
                <p><strong>Pays :</strong> {selectedContract.user?.pays || "—"}</p>
                <p><strong>Ville :</strong> {selectedContract.user?.ville || "—"}</p>
                <p><strong>Signé le :</strong> {new Date(selectedContract.signedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                <p><strong>Adresse IP :</strong> {selectedContract.ipAddress || "—"}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Loading Spinner ─────────────────────────────────────────────────
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-gray-200 border-t-[#0056B3] rounded-full animate-spin" />
    </div>
  );
}

// ─── Tab Title Map ───────────────────────────────────────────────────
const TAB_TITLES: Record<string, string> = {
  dashboard: "Tableau de bord",
  courses: "Gestion des formations",
  students: "Gestion des étudiants",
  payments: "Gestion des paiements",
  contracts: "Contrats signés",
  compta: "Comptabilité",
  sessions: "Séances de cours",
  notifs: "Notifications",
  reports: "Rapports",
  settings: "Paramètres",
};

// ─── Testimonials View ───────────────────────────────────────────────────
function TestimonialsView() {
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadTestimonials = () => {
    setLoading(true);
    fetchAllTestimonials()
      .then(setTestimonials)
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTestimonials(); }, []);

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateTestimonial(id, { isActive: !currentStatus });
      toast("success", `Avis ${!currentStatus ? 'publié' : 'masqué'} avec succès`);
      loadTestimonials();
    } catch (err: any) {
      toast("error", err.message || "Erreur lors de la modification");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cet avis ?")) return;
    try {
      await deleteTestimonial(id);
      toast("success", "Avis supprimé");
      loadTestimonials();
    } catch (err: any) {
      toast("error", err.message || "Erreur lors de la suppression");
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#0056B3] rounded-full animate-spin" /></div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-black text-gray-900 flex items-center gap-2"><MessageSquare size={18} className="text-[#0056B3]" /> Gestion des Avis</h2>
      </div>
      <div className="p-6 space-y-4">
        {testimonials.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucun avis soumis pour le moment.</p>
        ) : (
          testimonials.map(t => (
            <div key={t.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {t.images && t.images.length > 0 ? (
                    <div className="flex -space-x-2">
                      {t.images.slice(0, 3).map((img: string, idx: number) => (
                        <div key={idx} className="w-8 h-8 rounded-full border-2 border-white overflow-hidden shadow-sm">
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#0056B3] flex items-center justify-center text-white text-xs font-bold">
                      {t.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <h3 className="font-bold text-gray-900">{t.name}</h3>
                  <span className="px-2 py-0.5 bg-orange-100 text-[#FF6B00] text-xs font-bold rounded-full">{t.course}</span>
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} size={12} fill={j < t.rating ? "currentColor" : "none"} className={j >= t.rating ? "text-gray-300" : ""} />
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 text-sm italic">"{t.message}"</p>
                {t.images && t.images.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {t.images.map((img: string, idx: number) => (
                      <a key={idx} href={img} target="_blank" rel="noopener noreferrer"
                        className="w-14 h-14 rounded-lg overflow-hidden border border-gray-200 hover:border-[#0056B3] transition-colors">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-2">Soumis le {new Date(t.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0 mt-4 md:mt-0">
                <button
                  onClick={() => handleToggleActive(t.id, t.isActive)}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${t.isActive
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                >
                  {t.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                  {t.isActive ? "Publié" : "Masqué"}
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('adminSidebar') === 'collapsed');
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('adminTab') || 'dashboard');
  const [openCategories, setOpenCategories] = useState<string[]>(['Administration']);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      setShowWelcome(true);
      const timer = setTimeout(() => setShowWelcome(false), 4000);
      return () => clearTimeout(timer);
    } else {
      setShowWelcome(false);
    }
  }, [activeTab]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [apiStats, setApiStats] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();

  // Auth guard — redirect to login if not authenticated
  useEffect(() => {
    getMe()
      .then(user => {
        setCurrentUser(user);
        if (user.role !== 'ADMIN') {
          navigate('/student/login');
          return;
        }
        setAuthChecked(true);
      })
      .catch(() => {
        navigate('/student/login');
      });
  }, [navigate]);

  // Fetch stats when auth is confirmed or when switching to dashboard tab
  const loadStats = () => {
    fetchStats()
      .then(data => setApiStats(data))
      .catch(err => console.error("Erreur de chargement des stats", err));
  };

  useEffect(() => {
    if (!authChecked) return;
    localStorage.setItem('adminTab', activeTab);
    if (activeTab === 'dashboard') loadStats();
  }, [authChecked, activeTab]);

  useEffect(() => { localStorage.setItem('adminSidebar', sidebarCollapsed ? 'collapsed' : ''); }, [sidebarCollapsed]);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchNotifications().then(setNotifications).catch(() => { }); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const toggleSidebar = () => setSidebarCollapsed(prev => !prev);

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch (e) { /* ignore */ }
    navigate('/student/login');
  };

  // Show nothing while checking auth
  if (!authChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-[#0056B3] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  // Render active tab content
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView apiStats={apiStats} />;
      case 'courses': return <FormationsView />;
      case 'students': return <StudentsView />;
      case 'payments': return <PaymentsView />;
      case 'contracts': return <ContractsView />;
      case 'compta': return <ComptaView />;
      case 'sessions': return <TeacherSessionsView />;
      case 'notifs': return <NotifsView />;
      // case 'concours': return <ConcoursView />;
      case 'users': return <UsersView />;
      case 'reports': return <ReportsView apiStats={apiStats} />;
      case 'testimonials': return <TestimonialsView />;
      case 'shop_products': return <ShopProductsView />;
      case 'shop_orders': return <ShopOrdersView />;
      case 'shop_banners': return <BannersView mode="shop" />;
      case 'home_featured': return <BannersView mode="homepage" />;
      case 'blog': return <BlogAdminView />;
      case 'settings': return <SettingsView currentUser={currentUser} onRefresh={() => getMe().then(setCurrentUser)} />;
      default: return <DashboardView apiStats={apiStats} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-[Inter,sans-serif] overflow-hidden">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-[#0056B3] text-white transform transition-all duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} ${sidebarCollapsed ? "w-16" : "w-64"}`}>
        <div className={`flex items-center justify-between border-b border-blue-400/30 ${sidebarCollapsed ? "p-3 justify-center" : "p-5"}`}>
          {sidebarCollapsed ? (
            <img src="/images/logo exacademy.jpeg" alt="Logo" className="w-9 h-9 rounded-full object-cover bg-white shrink-0" />
          ) : (
            <div className="flex items-center gap-3 overflow-hidden">
              <img src="/images/logo exacademy.jpeg" alt="Logo" className="w-9 h-9 rounded-full object-cover bg-white shrink-0" />
              <div className="min-w-0">
                <div className="font-black text-sm truncate">Excellence Académie</div>
                <div className="text-blue-200 text-xs truncate">Administrateur</div>
              </div>
            </div>
          )}
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-blue-200 hover:text-white shrink-0">
            <X size={20} />
          </button>
        </div>
        <nav className={`space-y-2 ${sidebarCollapsed ? "p-2" : "p-4"} overflow-y-auto pb-24`}>
          {NAV_GROUPS.map((group) => (
            <div key={group.category} className="space-y-1">
              {!sidebarCollapsed && (
                <button
                  onClick={() => setOpenCategories(prev =>
                    prev.includes(group.category)
                      ? prev.filter(c => c !== group.category)
                      : [group.category]
                  )}
                  className="w-full flex items-center justify-between text-blue-200 hover:text-white px-2 py-2 text-xs font-bold uppercase tracking-wider mb-1 transition-colors"
                >
                  {group.category}
                  {openCategories.includes(group.category) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              )}

              <div className={`space-y-1 transition-all duration-300 overflow-hidden ${!sidebarCollapsed && !openCategories.includes(group.category) ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'}`}>
                {group.items.map(item => (
                  <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all ${sidebarCollapsed ? "justify-center p-3" : "px-4 py-2.5"} ${activeTab === item.id ? "bg-white/20 text-white font-bold" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}
                    title={sidebarCollapsed ? item.label : undefined}>
                    <span className="shrink-0">{item.icon}</span>
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className={`absolute bottom-0 left-0 right-0 border-t border-blue-400/30 ${sidebarCollapsed ? "p-2" : "p-4"}`}>
          <button onClick={toggleSidebar} className={`w-full flex items-center gap-3 text-blue-200 hover:text-white text-sm rounded-xl hover:bg-white/10 transition-all ${sidebarCollapsed ? "justify-center p-3" : "px-4 py-3"}`}
            title={sidebarCollapsed ? "Agrandir" : "Réduire"}>
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            {!sidebarCollapsed && <span>Réduire</span>}
          </button>
          <button onClick={handleLogout} className={`w-full flex items-center gap-3 text-blue-200 hover:text-white text-sm rounded-xl hover:bg-white/10 transition-all ${sidebarCollapsed ? "justify-center p-3" : "px-4 py-3"}`}
            title="Déconnexion">
            <LogOut size={18} />
            {!sidebarCollapsed && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700">
              <Menu size={22} />
            </button>
            <div>
              <h1 className="font-black text-gray-900">{TAB_TITLES[activeTab] || "Tableau de bord"} – Administrateur</h1>
              <p className="text-gray-400 text-xs">Excellence Académie • {currentUser?.name || 'Admin'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button onClick={(e) => { e.stopPropagation(); setNotifOpen(!notifOpen); }} className="relative p-2 text-gray-500 hover:text-gray-700 transition-colors">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <span className="font-bold text-gray-900 text-sm">Notifications</span>
                    <button onClick={() => setActiveTab('notifs')} className="text-xs text-[#0056B3] hover:underline">Voir tout</button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-sm">Aucune notification</div>
                    ) : (
                      notifications.slice(0, 5).map((n: any) => (
                        <div key={n.id} className={`px-4 py-3 border-b border-gray-50 text-sm ${!n.isRead ? 'bg-blue-50/50' : ''}`}>
                          <div className="font-semibold text-gray-900">{n.title}</div>
                          <div className="text-gray-500 text-xs mt-0.5 line-clamp-2">{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button onClick={(e) => { e.stopPropagation(); setProfileOpen(!profileOpen); }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-xs hover:opacity-90 transition-opacity cursor-pointer overflow-hidden">
                {currentUser?.image ? (
                  <img src={currentUser.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#0056B3] flex items-center justify-center">{currentUser?.name?.[0]?.toUpperCase() || 'A'}</div>
                )}
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <div className="font-bold text-gray-900 text-sm truncate">{currentUser?.name || 'Administrateur'}</div>
                    <div className="text-gray-400 text-xs truncate">{currentUser?.email || ''}</div>
                  </div>
                  <div className="p-2">
                    <button onClick={() => { localStorage.setItem('adminSettingsTab', 'account'); setActiveTab('settings'); setProfileOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <User size={16} className="text-gray-400" /> Profil
                    </button>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 relative">
          <div className={`bg-linear-to-r from-[#0056B3] to-[#003375] rounded-2xl text-white transition-all duration-700 overflow-hidden ${showWelcome && activeTab === 'dashboard' ? 'opacity-100 max-h-32 p-6 mb-6 translate-y-0' : 'opacity-0 max-h-0 p-0 mb-0 -translate-y-4 border-none'}`}>
            <h2 className="font-black text-xl mb-1">Bon retour parmi nous, {currentUser?.name?.split(" ")[0] || "Admin"} !</h2>
          </div>
          <div key={activeTab} className="animate-fadeInSlideUp">
            {renderContent()}
          </div>
        </div>
      </main>
      <style>{`
        .modal-overlay { animation: fadeIn 0.15s ease-out; }
        .modal-content { animation: scaleIn 0.2s ease-out; }
        .animate-fadeInSlideUp { animation: fadeInSlideUp 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes fadeInSlideUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function BlogAdminView() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const loadPosts = () => fetchBlogPosts({ limit: 100 }).then(d => setPosts(d.posts || [])).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { loadPosts(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet article définitivement ?")) return;
    try { await deleteBlogPost(id); setPosts(prev => prev.filter(p => p.id !== id)); }
    catch {}
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
        <div>
          <h2 className="font-black text-gray-900 flex items-center gap-2"><BookOpen size={18} className="text-[#0056B3]" /> Blog — Articles</h2>
          <p className="text-gray-500 text-sm mt-1">Gestion complète des articles.</p>
        </div>
        <Link to="/blog/new" className="flex items-center gap-1.5 bg-[#0056B3] text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-[#003375] transition-colors">
          <BookOpen size={16} /> Nouvel article
        </Link>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-[#0056B3]" /></div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
          <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">Aucun article. Créez le premier !</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {["Titre", "Auteur", "Matière", "Statut", "Commentaires", "Exercices", "Date", "Actions"].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-gray-500 text-xs font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {posts.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-gray-900 text-sm max-w-[250px] truncate">{p.title}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{p.author?.name || "—"}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{p.course?.title || "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.published ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                        {p.published ? 'Publié' : 'Brouillon'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">{p._count?.comments || 0}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{p._count?.exercises || 0}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{new Date(p.createdAt).toLocaleDateString("fr-FR")}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Link to={`/blog/edit/${p.id}`} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="Modifier">
                          <BookOpen size={14} />
                        </Link>
                        <Link to={`/blog/${p.slug}`} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600 transition-colors" title="Voir">
                          <BookOpen size={14} />
                        </Link>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors" title="Supprimer">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-gray-100 text-sm text-gray-500">
            Total : {posts.length} article(s)
          </div>
        </div>
      )}
    </div>
  );
}

