import { useState, useEffect, useMemo } from "react";
import {
  Users, Search, Plus, Edit, Trash2, Loader2, Mail, Send, X, CheckCircle,
  ChevronDown, ChevronRight, Filter, Download, Phone, MapPin, GraduationCap,
  Clock, Calendar
} from "lucide-react";
import {
  fetchUsers, createUser, updateUser, deleteUser, registerStudent, registerAndPay,
  sendBulkNotification, fetchCourses, fetchPaymentsByUser, fetchSubscriptionsByUser
} from "../../utils/api";
import { useToast } from "../Toast";
import LoadingSpinner from "./LoadingSpinner";
import StudentRegistrationForm from "../StudentRegistrationForm";
import { calcRegistrationPrice } from "../../constants/student";

import { generateTempPassword } from "./helpers";

function StudentsView() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedMode, setSelectedMode] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
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

  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [paymentsStudent, setPaymentsStudent] = useState<any>(null);
  const [studentPayments, setStudentPayments] = useState<any[]>([]);
  const [studentSubscriptions, setStudentSubscriptions] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsTab, setPaymentsTab] = useState<'paid' | 'unpaid' | 'upcoming'>('paid');
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
    if (!sub) return { label: 'Standard', type: 'standard', color: 'bg-surface-50 text-gray-700' };
    if (sub.coursParticuliers) {
      return { label: 'Particulier', type: 'particulier', color: 'bg-amber-100 text-amber-800 border border-amber-200' };
    }
    if (sub.formule === 'en_ligne') {
      return { label: 'En ligne', type: 'en_ligne', color: 'bg-accent-100 text-accent-700 border border-accent-200' };
    }
    if (sub.formule === 'les_deux') {
      return { label: 'Présentiel + En ligne', type: 'les_deux', color: 'bg-primary-100 text-primary-800 border border-primary-200' };
    }
    return { label: 'Présentiel', type: 'presentiel', color: 'bg-primary-100 text-[#c97e00] border border-primary-200' };
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

      // 4. Filtre par Ville
      if (selectedCity && (u.ville || '') !== selectedCity) return false;

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
  }, [users, search, selectedCourse, selectedMode, selectedCity, dateFilter, startDate, endDate]);

  const hasActiveFilters = Boolean(search || selectedCourse || selectedMode || selectedCity || dateFilter || startDate || endDate);

  const resetFilters = () => {
    setSearch("");
    setSelectedCourse("");
    setSelectedMode("");
    setSelectedCity("");
    setDateFilter("");
    setStartDate("");
    setEndDate("");
  };

  // Unique cities from students
  const studentCities = useMemo(() => {
    const set = new Set<string>();
    users.forEach(u => { if (u.ville) set.add(u.ville); });
    return Array.from(set).sort();
  }, [users]);

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

  const openPaymentsModal = async (student: any) => {
    setPaymentsStudent(student);
    setShowPaymentsModal(true);
    setPaymentsTab('paid');
    setPaymentsLoading(true);
    try {
      const [payments, subscriptions] = await Promise.all([
        fetchPaymentsByUser(student.id),
        fetchSubscriptionsByUser(student.id)
      ]);
      setStudentPayments(payments);
      setStudentSubscriptions(subscriptions);
    } catch (err) {
      console.error(err);
      toast('error', 'Erreur lors du chargement des paiements');
    } finally {
      setPaymentsLoading(false);
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
            <Users size={22} className="text-[#c97e00]" /> Gestion des étudiants
          </h2>
          <p className="text-gray-500 text-xs mt-0.5">Suivi, filtrage multi-critères et gestion des inscriptions</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {selectedIds.length > 0 && (
            <button onClick={() => setShowMsgModal(true)} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded font-bold text-sm hover:bg-primary-700 transition-colors whitespace-nowrap shadow-sm">
              <Send size={16} /> Envoyer Message ({selectedIds.length})
            </button>
          )}
          <button onClick={() => setShowAddPanel(true)} className="flex items-center gap-2 bg-[#c97e00] text-white px-4 py-2.5 rounded font-bold text-sm hover:bg-[#6b4500] transition-colors whitespace-nowrap shadow-sm">
            <Plus size={16} /> Inscrire un étudiant
          </button>
        </div>
      </div>

      {/* Cartes Compteurs en haut */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded bg-primary-50 text-[#c97e00] flex items-center justify-center shrink-0">
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

        <div className="bg-white p-4 rounded border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded bg-green-50 text-green-600 flex items-center justify-center shrink-0">
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

        <div className="bg-white p-4 rounded border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
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
          <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
            {/* Barre de Filtres Automatique */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/70 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* 1. Recherche textuelle */}
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Nom, email, telephone..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none transition-all shadow-xs"
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
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none transition-all text-gray-700 font-medium shadow-xs"
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
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none transition-all text-gray-700 font-medium shadow-xs"
                  >
                    <option value="">🎯 Tous les types</option>
                    <option value="presentiel">🏫 Presentiel</option>
                    <option value="en_ligne">💻 En ligne</option>
                    <option value="les_deux">🔄 Hybride</option>
                    <option value="particulier">⭐ Particulier</option>
                  </select>
                </div>

                {/* 4. Filtre par Ville */}
                <div className="relative">
                  <select
                    value={selectedCity}
                    onChange={e => setSelectedCity(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none transition-all text-gray-700 font-medium shadow-xs"
                  >
                    <option value="">📍 Toutes les villes</option>
                    {studentCities.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* 5. Filtre Date d'inscription */}
                <div className="relative">
                  <select
                    value={dateFilter}
                    onChange={e => setDateFilter(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none transition-all text-gray-700 font-medium shadow-xs"
                  >
                    <option value="">📅 Toutes les dates</option>
                    <option value="today">Inscrits aujourd'hui</option>
                    <option value="this_week">Inscrits cette semaine (7j)</option>
                    <option value="this_month">Inscrits ce mois-ci</option>
                    <option value="custom">Periode personnalisee...</option>
                  </select>
                </div>
              </div>

              {/* Sélecteurs de date personnalisée si "custom" */}
              {dateFilter === 'custom' && (
                <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-gray-600 bg-white p-3 rounded border border-gray-200">
                  <span className="font-semibold text-gray-700 flex items-center gap-1">
                    <Calendar size={14} className="text-[#c97e00]" /> Du :
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#c97e00]"
                  />
                  <span className="font-semibold text-gray-700">Au :</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#c97e00]"
                  />
                </div>
              )}

              {/* Barre de réinitialisation si filtre actif */}
              {hasActiveFilters && (
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#c97e00]">
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
                      <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === filtered.length} onChange={toggleSelectAll} className="w-4 h-4 rounded text-[#c97e00] focus:ring-[#c97e00] accent-[#c97e00]" />
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
                            <button onClick={resetFilters} className="text-xs text-[#c97e00] font-bold underline hover:text-[#6b4500]">
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
                            <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => toggleSelect(u.id)} className="w-4 h-4 rounded accent-[#c97e00]" />
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-[#c97e00] flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {u.name?.[0]?.toUpperCase() || '?'}
                              </div>
                              <div>
                                <button onClick={() => openPaymentsModal(u)} className="font-semibold text-gray-900 text-sm block hover:text-[#c97e00] hover:underline transition-colors text-left cursor-pointer">
                                  {u.name || 'Sans nom'}
                                </button>
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
                                  <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary-50 text-[#c97e00] border border-primary-100">
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
                              <button onClick={() => openEditModal(u)} className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-600 transition-colors" title="Modifier">
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
          <aside className="bg-white rounded shadow-sm border border-gray-100 p-6 xl:min-h-[600px]">
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
          <div className="bg-white rounded w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="font-black text-gray-900 text-lg">Message Groupé ({selectedIds.length} dest.)</h3>
              <button onClick={() => setShowMsgModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSendBulkMsg} className="flex flex-col h-full overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Sujet du message</label>
                <input required value={msgForm.title} onChange={e => setMsgForm({ ...msgForm, title: e.target.value })} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none" placeholder="Rappel de cours..." />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Contenu</label>
                <textarea required rows={5} value={msgForm.message} onChange={e => setMsgForm({ ...msgForm, message: e.target.value })} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none resize-none" placeholder="Votre message..." />
              </div>
              </div>
              <div className="p-6 pt-4 border-t border-gray-100 shrink-0 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                <button type="button" onClick={() => setShowMsgModal(false)} className="px-4 py-2 text-gray-600 font-semibold text-sm">Annuler</button>
                <button type="submit" disabled={submitting} className="bg-primary-600 text-white px-6 py-2 rounded font-bold text-sm hover:bg-primary-700 disabled:opacity-50">
                  {submitting ? '...' : 'Envoyer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Payments Modal — Premium Training Platform Style */}
      {showPaymentsModal && paymentsStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) { setShowPaymentsModal(false); setPaymentsStudent(null); } }}>
          <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header with student info */}
            <div className="bg-linear-to-r from-[#c97e00] to-[#6b4500] px-6 py-5 text-white shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-xl font-black shrink-0">
                    {paymentsStudent.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <h3 className="font-black text-lg">{paymentsStudent.name || 'Etudiant'}</h3>
                    <p className="text-white/70 text-sm">{paymentsStudent.email}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-white/60">
                      {paymentsStudent.matricule && <span>Matr: {paymentsStudent.matricule}</span>}
                      {paymentsStudent.ville && <span className="flex items-center gap-1"><MapPin size={10} />{paymentsStudent.ville}</span>}
                      {paymentsStudent.createdAt && <span>Inscrit le {new Date(paymentsStudent.createdAt).toLocaleDateString('fr-FR')}</span>}
                    </div>
                  </div>
                </div>
                <button onClick={() => { setShowPaymentsModal(false); setPaymentsStudent(null); }}
                  className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors shrink-0">
                  <X size={18} />
                </button>
              </div>
              {/* Summary KPIs */}
              {!paymentsLoading && (
                <div className="grid grid-cols-3 gap-3 mt-5">
                  <div className="bg-white/10 rounded-lg px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">Total paye</p>
                    <p className="text-lg font-black">
                      {studentPayments.filter(p => p.status === 'SUCCESS').reduce((s, p) => s + Number(p.amount), 0).toLocaleString('fr-FR')} <span className="text-xs font-normal text-white/60">FCFA</span>
                    </p>
                  </div>
                  <div className="bg-white/10 rounded-lg px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">En attente</p>
                    <p className="text-lg font-black">
                      {studentPayments.filter(p => p.status !== 'SUCCESS').reduce((s, p) => s + Number(p.amount), 0).toLocaleString('fr-FR')} <span className="text-xs font-normal text-white/60">FCFA</span>
                    </p>
                  </div>
                  <div className="bg-white/10 rounded-lg px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">Prochain versement</p>
                    <p className="text-lg font-black">
                      {(() => {
                        const activeSub = studentSubscriptions.find((s: any) => s.status === 'ACTIVE');
                        if (!activeSub) return '—';
                        const next = new Date(activeSub.nextPayment);
                        const now = new Date();
                        const days = Math.ceil((next.getTime() - now.getTime()) / 86400000);
                        if (days <= 0) return <span className="text-red-300">En retard</span>;
                        return <>{days}j</>;
                      })()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {paymentsLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-[#c97e00]" /></div>
              ) : (
                <>
                  {/* Tabs */}
                  <div className="flex border-b border-gray-100 bg-gray-50/50 px-6">
                    {(['paid', 'unpaid', 'upcoming'] as const).map(tab => {
                      const labels = { paid: 'Paiements reussis', unpaid: 'Impayes', upcoming: 'A venir' };
                      const colors = { paid: 'text-green-600 bg-green-50', unpaid: 'text-red-600 bg-red-50', upcoming: 'text-blue-600 bg-blue-50' };
                      const count = tab === 'paid'
                        ? studentPayments.filter(p => p.status === 'SUCCESS').length
                        : tab === 'unpaid'
                          ? studentPayments.filter(p => p.status !== 'SUCCESS').length
                          : studentSubscriptions.length;
                      return (
                        <button key={tab} onClick={() => setPaymentsTab(tab)}
                          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                            paymentsTab === tab
                              ? 'border-[#c97e00] text-[#c97e00]'
                              : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}>
                          {labels[tab]}
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${paymentsTab === tab ? colors[tab] : 'bg-gray-200 text-gray-500'}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-6">
                    {/* PAID tab */}
                    {paymentsTab === 'paid' && (() => {
                      const paid = studentPayments.filter(p => p.status === 'SUCCESS');
                      if (paid.length === 0) return (
                        <div className="text-center py-12">
                          <CheckCircle size={40} className="text-gray-200 mx-auto mb-3" />
                          <p className="text-gray-400 text-sm">Aucun paiement reussi</p>
                        </div>
                      );
                      return (
                        <div className="space-y-2">
                          {paid.map(p => (
                            <div key={p.id} className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:bg-green-50/30 hover:border-green-200 transition-all group">
                              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                <CheckCircle size={18} className="text-green-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-900 text-sm">{Number(p.amount).toLocaleString('fr-FR')} FCFA</span>
                                  {p.type === 'INSCRIPTION' ? (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">Inscription</span>
                                  ) : (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">Mensualite</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                  <span>{p.course?.title || '—'}</span>
                                  <span>·</span>
                                  <span>{new Date(p.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                {p.receiptNumber && (
                                  <span className="text-[10px] text-gray-400 font-mono">Recu: {p.receiptNumber}</span>
                                )}
                              </div>
                            </div>
                          ))}
                          <div className="pt-3 mt-2 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-xs text-gray-500">{paid.length} paiement(s)</span>
                            <span className="text-sm font-black text-green-700">Total: {paid.reduce((s, p) => s + Number(p.amount), 0).toLocaleString('fr-FR')} FCFA</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* UNPAID tab */}
                    {paymentsTab === 'unpaid' && (() => {
                      const unpaid = studentPayments.filter(p => p.status !== 'SUCCESS');
                      if (unpaid.length === 0) return (
                        <div className="text-center py-12">
                          <CheckCircle size={40} className="text-gray-200 mx-auto mb-3" />
                          <p className="text-gray-400 text-sm">Aucun impaye</p>
                        </div>
                      );
                      return (
                        <div className="space-y-2">
                          {unpaid.map(p => (
                            <div key={p.id} className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:bg-red-50/30 hover:border-red-200 transition-all">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${p.status === 'FAILED' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                                <X size={18} className={p.status === 'FAILED' ? 'text-red-600' : 'text-yellow-600'} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-900 text-sm">{Number(p.amount).toLocaleString('fr-FR')} FCFA</span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {p.status === 'FAILED' ? 'Echoue' : 'En attente'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                  <span>{p.course?.title || '—'}</span>
                                  <span>·</span>
                                  <span>{new Date(p.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* UPCOMING tab */}
                    {paymentsTab === 'upcoming' && (() => {
                      if (studentSubscriptions.length === 0) return (
                        <div className="text-center py-12">
                          <Clock size={40} className="text-gray-200 mx-auto mb-3" />
                          <p className="text-gray-400 text-sm">Aucun abonnement actif</p>
                        </div>
                      );
                      const now = new Date();
                      return (
                        <div className="space-y-2">
                          {studentSubscriptions.map(sub => {
                            const nextDate = new Date(sub.nextPayment);
                            const isOverdue = nextDate <= now;
                            const daysUntil = Math.ceil((nextDate.getTime() - now.getTime()) / 86400000);
                            return (
                              <div key={sub.id} className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${isOverdue ? 'bg-orange-50 border-orange-200' : 'bg-blue-50/50 border-blue-100 hover:border-blue-200'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isOverdue ? 'bg-orange-100' : 'bg-blue-100'}`}>
                                  <Clock size={18} className={isOverdue ? 'text-orange-600' : 'text-blue-600'} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-900 text-sm">{Number(sub.amount).toLocaleString('fr-FR')} FCFA / mois</span>
                                    {isOverdue ? (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">En retard</span>
                                    ) : (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">A venir</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                    <span>{sub.course?.title || '—'}</span>
                                    <span>·</span>
                                    <span>{isOverdue ? `${Math.abs(daysUntil)} jour(s) de retard` : `Dans ${daysUntil} jour(s)`}</span>
                                    <span>·</span>
                                    <span>{nextDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end rounded-b-2xl">
              <button onClick={() => { setShowPaymentsModal(false); setPaymentsStudent(null); }}
                className="px-5 py-2.5 text-gray-600 font-semibold text-sm hover:text-gray-800 rounded-lg hover:bg-gray-200 transition-colors">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditModal && editingStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-overlay">
          <div className="bg-white rounded w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="font-black text-gray-900 text-lg">Modifier l'étudiant</h3>
              <button onClick={() => { setShowEditModal(false); setEditingStudent(null); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="flex flex-col h-full overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Prénom</label>
                  <input value={editForm.prenom} onChange={e => setEditForm({ ...editForm, prenom: e.target.value })} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nom</label>
                  <input value={editForm.nom} onChange={e => setEditForm({ ...editForm, nom: e.target.value })} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Téléphone</label>
                <input value={editForm.telephone} onChange={e => setEditForm({ ...editForm, telephone: e.target.value })} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ville</label>
                <input value={editForm.ville} onChange={e => setEditForm({ ...editForm, ville: e.target.value })} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none" />
              </div>
              </div>
              <div className="p-6 pt-4 border-t border-gray-100 shrink-0 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                <button type="button" onClick={() => { setShowEditModal(false); setEditingStudent(null); }} className="px-4 py-2 text-gray-600 font-semibold text-sm">Annuler</button>
                <button type="submit" disabled={submitting} className="bg-[#c97e00] text-white px-6 py-2 rounded font-bold text-sm hover:bg-[#6b4500] disabled:opacity-50">
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

export default StudentsView;
