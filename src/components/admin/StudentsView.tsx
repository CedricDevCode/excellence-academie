import { useState, useEffect, useMemo } from "react";
import {
  Users, Search, Plus, Edit, Trash2, Loader2, Mail, Send, X, CheckCircle,
  ChevronDown, ChevronRight, Filter, Download, Phone, MapPin, GraduationCap,
  Clock, Calendar, Save, Banknote
} from "lucide-react";
import {
  fetchUsers, createUser, updateUser, deleteUser, registerStudent, registerAndPay,
  sendBulkNotification, fetchCourses, fetchPaymentsByUser, fetchSubscriptionsByUser,
  initCashPayment, confirmCashPayment, resendCashPaymentOtp,
  initRegistrationCompletion, confirmRegistrationCompletion, resendRegistrationCompletionOtp
} from "../../utils/api";
import OtpCountdown from "../OtpCountdown";
import { useToast } from "../Toast";
import ConfirmDialog from "../ui/ConfirmDialog";
import LoadingSpinner from "./LoadingSpinner";
import StudentRegistrationForm from "../StudentRegistrationForm";
import { calcRegistrationTotal, calcMonthlyTotal, PAYS, VILLES, isDiaspora } from "../../constants/student";

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
  const [editForm, setEditForm] = useState({ nom: '', prenom: '', email: '', telephone: '', ville: '', pays: '', isActive: true, courseIds: [] as string[] });

  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [paymentsStudent, setPaymentsStudent] = useState<any>(null);
  const [studentPayments, setStudentPayments] = useState<any[]>([]);
  const [studentSubscriptions, setStudentSubscriptions] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsTab, setPaymentsTab] = useState<'paid' | 'unpaid' | 'upcoming'>('paid');
  const { toast } = useToast();

  // Suppression étudiant : modale de confirmation premium
  const [studentToDelete, setStudentToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Encaissement espèces (admin, OTP requis)
  const [cashPaySub, setCashPaySub] = useState<any>(null);
  const [cashPayMonths, setCashPayMonths] = useState(1);
  const [cashPayPaidAt, setCashPayPaidAt] = useState(() => new Date().toISOString().split('T')[0]);
  const [cashPayAmount, setCashPayAmount] = useState(0);
  const [cashPayRemiseAmount, setCashPayRemiseAmount] = useState(0);
  const [cashPayRemiseNote, setCashPayRemiseNote] = useState('');
  const [cashPayRemiseDate, setCashPayRemiseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [cashPayOtpSent, setCashPayOtpSent] = useState(false);
  const [cashPayOtp, setCashPayOtp] = useState("");
  const [cashPayExpiresAt, setCashPayExpiresAt] = useState(0);
  const [cashPayLoading, setCashPayLoading] = useState(false);
  const [cashPayResending, setCashPayResending] = useState(false);
  const [cashPayError, setCashPayError] = useState<string | null>(null);

  // Finalisation d'inscription (étudiant sans formation/paiement enregistré)
  const [completionTarget, setCompletionTarget] = useState<any>(null);
  const [completionCourseIds, setCompletionCourseIds] = useState<string[]>([]);
  const [completionMode, setCompletionMode] = useState<'presentiel' | 'en_ligne' | 'les_deux'>('presentiel');
  const [completionPaidAt, setCompletionPaidAt] = useState(() => new Date().toISOString().split('T')[0]);
  const [completionRemiseAmount, setCompletionRemiseAmount] = useState('');
  const [completionRemiseNote, setCompletionRemiseNote] = useState('');
  const [completionRemiseDate, setCompletionRemiseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [completionOtpSent, setCompletionOtpSent] = useState(false);
  const [completionOtp, setCompletionOtp] = useState("");
  const [completionExpiresAt, setCompletionExpiresAt] = useState(0);
  const [completionLoading, setCompletionLoading] = useState(false);
  const [completionResending, setCompletionResending] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const openCompletion = (student: any) => {
    setCompletionTarget(student);
    setCompletionCourseIds([]);
    setCompletionMode('presentiel');
    setCompletionPaidAt(new Date().toISOString().split('T')[0]);
    setCompletionRemiseAmount('');
    setCompletionRemiseNote('');
    setCompletionRemiseDate(new Date().toISOString().split('T')[0]);
    setCompletionOtpSent(false);
    setCompletionOtp("");
    setCompletionExpiresAt(0);
    setCompletionError(null);
  };

  const closeCompletion = () => {
    setCompletionTarget(null);
    setCompletionOtpSent(false);
    setCompletionOtp("");
    setCompletionError(null);
  };

  const selectedCompletionCourses = courses.filter((c: any) => completionCourseIds.includes(c.id));
  const completionDiaspora = isDiaspora(completionTarget?.pays || '');
  const completionRegPrice = calcRegistrationTotal(selectedCompletionCourses, false, completionTarget?.pays || '', completionTarget?.ville || '');
  const completionMonthly = calcMonthlyTotal(selectedCompletionCourses, false, completionTarget?.pays || '', completionMode);
  const completionRemiseValue = Number(completionRemiseAmount) || 0;
  const completionAmount = Math.max(0, completionRegPrice - Math.max(0, Math.min(completionRegPrice, completionRemiseValue))) + completionMonthly;

  const toggleCompletionCourse = (id: string) => {
    setCompletionCourseIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const startCompletion = async () => {
    if (!completionTarget) return;
    if (completionCourseIds.length === 0) { setCompletionError('Sélectionnez au moins une formation.'); return; }
    if (completionRemiseValue > 0 && !completionRemiseNote.trim()) { setCompletionError('Un justificatif de remise est requis.'); return; }
    setCompletionError(null);
    setCompletionLoading(true);
    try {
      const res = await initRegistrationCompletion({
        userId: completionTarget.id,
        courseIds: completionCourseIds,
        mode: completionMode,
        paidAt: completionPaidAt,
        remiseAmount: completionRemiseValue,
        remiseNote: completionRemiseNote,
        remiseDate: completionRemiseDate,
      } as any);
      setCompletionExpiresAt(typeof res?.expiresAt === 'number' ? res.expiresAt : Date.now() + 15 * 60 * 1000);
      setCompletionOtp("");
      setCompletionOtpSent(true);
    } catch (err: any) {
      setCompletionError(err?.message || "Erreur lors de l'initialisation");
    } finally {
      setCompletionLoading(false);
    }
  };

  const resendCompletionOtp = async () => {
    if (!completionTarget) return;
    setCompletionError(null);
    setCompletionResending(true);
    try {
      const res = await resendRegistrationCompletionOtp({ userId: completionTarget.id });
      setCompletionExpiresAt(typeof res?.expiresAt === 'number' ? res.expiresAt : Date.now() + 15 * 60 * 1000);
      setCompletionOtp("");
    } catch (err: any) {
      setCompletionError(err?.message || "Erreur lors du renvoi du code");
    } finally {
      setCompletionResending(false);
    }
  };

  const confirmCompletion = async () => {
    if (!completionTarget) return;
    if (!completionOtp || completionOtp.length < 4) { setCompletionError("Veuillez entrer le code OTP reçu par email."); return; }
    setCompletionError(null);
    setCompletionLoading(true);
    try {
      await confirmRegistrationCompletion({ userId: completionTarget.id, otp: completionOtp });
      toast('success', 'Paiement enregistré — formations activées');
      closeCompletion();
      loadUsers();
      if (paymentsStudent && paymentsStudent.id === completionTarget.id) {
        const [payments, subscriptions] = await Promise.all([
          fetchPaymentsByUser(paymentsStudent.id),
          fetchSubscriptionsByUser(paymentsStudent.id),
        ]);
        setStudentPayments(payments);
        setStudentSubscriptions(subscriptions);
      }
    } catch (err: any) {
      setCompletionError(err?.message || "Erreur lors de la confirmation");
    } finally {
      setCompletionLoading(false);
    }
  };

  const openCashPay = (sub: any) => {
    setCashPaySub(sub);
    setCashPayMonths(1);
    setCashPayPaidAt(new Date().toISOString().split('T')[0]);
    setCashPayAmount(Number(sub.amount || 0));
    setCashPayRemiseAmount(0);
    setCashPayRemiseNote('');
    setCashPayRemiseDate(new Date().toISOString().split('T')[0]);
    setCashPayOtpSent(false);
    setCashPayOtp("");
    setCashPayExpiresAt(0);
    setCashPayError(null);
  };

  const closeCashPay = () => {
    setCashPaySub(null);
    setCashPayOtpSent(false);
    setCashPayOtp("");
    setCashPayError(null);
  };

  const startCashPay = async () => {
    if (!cashPaySub) return;
    if (cashPayRemiseAmount > 0 && !cashPayRemiseNote.trim()) { setCashPayError('Un justificatif de remise est requis.'); return; }
    setCashPayError(null);
    setCashPayLoading(true);
    try {
      const res = await initCashPayment({
        subscriptionId: cashPaySub.id,
        months: cashPayMonths,
        paidAt: cashPayPaidAt,
        remiseAmount: cashPayRemiseAmount,
        remiseNote: cashPayRemiseNote,
        remiseDate: cashPayRemiseDate,
      } as any);
      setCashPayAmount(Number(res?.amount ?? Number(cashPaySub.amount || 0) * cashPayMonths));
      setCashPayExpiresAt(typeof res?.expiresAt === 'number' ? res.expiresAt : Date.now() + 15 * 60 * 1000);
      setCashPayOtp("");
      setCashPayOtpSent(true);
    } catch (err: any) {
      setCashPayError(err?.message || "Erreur lors de l'initialisation de l'encaissement");
    } finally {
      setCashPayLoading(false);
    }
  };

  const resendCashPayOtp = async () => {
    if (!cashPaySub) return;
    setCashPayError(null);
    setCashPayResending(true);
    try {
      const res = await resendCashPaymentOtp({ subscriptionId: cashPaySub.id });
      setCashPayExpiresAt(typeof res?.expiresAt === 'number' ? res.expiresAt : Date.now() + 15 * 60 * 1000);
      setCashPayOtp("");
    } catch (err: any) {
      setCashPayError(err?.message || "Erreur lors du renvoi du code");
    } finally {
      setCashPayResending(false);
    }
  };

  const confirmCashPay = async () => {
    if (!cashPaySub) return;
    if (!cashPayOtp || cashPayOtp.length < 4) { setCashPayError("Veuillez entrer le code OTP reçu par email."); return; }
    setCashPayError(null);
    setCashPayLoading(true);
    try {
      const res = await confirmCashPayment({ subscriptionId: cashPaySub.id, otp: cashPayOtp });
      toast('success', 'Encaissement enregistré — prochaine mensualité mise à jour');
      closeCashPay();
      // Rafraîchir les données du modal de paiement
      if (paymentsStudent) {
        const [payments, subscriptions] = await Promise.all([
          fetchPaymentsByUser(paymentsStudent.id),
          fetchSubscriptionsByUser(paymentsStudent.id),
        ]);
        setStudentPayments(payments);
        setStudentSubscriptions(subscriptions);
      }
    } catch (err: any) {
      setCashPayError(err?.message || "Erreur lors de la confirmation");
    } finally {
      setCashPayLoading(false);
    }
  };

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
      if (s.status === 'CANCELLED') return;
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

  // Helper : prochaine échéance de mensualité (le 05 du mois).
  // Règle métier : payable au plus tard le 05 ; au-delà → "En retard".
  const MONTHLY_DUE_DAY = 5;
  const getStudentEcheance = (u: any) => {
    const activeSubs = (u.subscriptions || []).filter((s: any) => s.status === 'ACTIVE' && !s.coursParticuliers);
    if (activeSubs.length === 0) return null;
    const due = new Date(Math.min(...activeSubs.map((s: any) => new Date(s.nextPayment).getTime())));
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const diffDays = Math.round((dueDay.getTime() - now.getTime()) / 86400000);
    return { due: dueDay, diffDays };
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
      pays: student.pays || '',
      isActive: student.isActive !== false,
      courseIds: getStudentCourses(student).map((c: any) => c.id),
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setSubmitting(true);
    try {
      await updateUser(editingStudent.id, {
        prenom: editForm.prenom,
        nom: editForm.nom,
        email: editForm.email,
        telephone: editForm.telephone,
        ville: editForm.ville,
        pays: editForm.pays,
        courseIds: editForm.courseIds,
      });
      loadUsers();
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

  const handleDeleteStudent = (student: any) => {
    setDeleteError(null);
    setStudentToDelete(student);
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteUser(studentToDelete.id);
      setUsers(users.filter(u => u.id !== studentToDelete.id));
      setStudentToDelete(null);
      toast('success', 'Étudiant supprimé');
    } catch (err: any) {
      setDeleteError(err?.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
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
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-[#c97e00] focus:outline-none transition-all shadow-xs"
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
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-[#c97e00] focus:outline-none transition-all text-gray-700 font-medium shadow-xs"
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
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-[#c97e00] focus:outline-none transition-all text-gray-700 font-medium shadow-xs"
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
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-[#c97e00] focus:outline-none transition-all text-gray-700 font-medium shadow-xs"
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
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-[#c97e00] focus:outline-none transition-all text-gray-700 font-medium shadow-xs"
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
                    <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider" title="Mensualité payable au plus tard le 05 du mois">Échéance mensualité</th>
                    <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-gray-400 text-sm">
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
                      const echeance = getStudentEcheance(u);

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
                              <button onClick={() => openCompletion(u)} className="text-xs text-amber-600 font-semibold hover:underline text-left">
                                Non renseignée — finaliser
                              </button>
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
                            {!echeance ? (
                              <span className="text-xs text-gray-400">—</span>
                            ) : echeance.diffDays < 0 ? (
                              <span className="inline-flex flex-col items-start gap-0.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                                  <Clock size={11} /> En retard
                                </span>
                                <span className="text-[10px] text-red-500 font-semibold pl-0.5">échéance le {echeance.due.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} (+{Math.abs(echeance.diffDays)} j)</span>
                              </span>
                            ) : echeance.diffDays <= 7 ? (
                              <span className="inline-flex flex-col items-start gap-0.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Calendar size={11} /> {echeance.due.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
                                </span>
                                <span className="text-[10px] text-amber-600 font-semibold pl-0.5">dans {echeance.diffDays} j</span>
                              </span>
                            ) : (
                              <span className="inline-flex flex-col items-start gap-0.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                                  <Calendar size={11} /> {echeance.due.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
                                </span>
                                <span className="text-[10px] text-gray-400 font-medium pl-0.5">→ 05 du mois suivant</span>
                              </span>
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
                            <div className="flex items-center justify-end gap-2">
                              {(studentCourses.length === 0 || !(u.payments || []).some((p: any) => p.status === 'SUCCESS')) && (
                                <button onClick={() => openCompletion(u)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition-colors shrink-0" title="Finaliser l'inscription (encaisser le paiement)" aria-label="Finaliser l'inscription">
                                  <Banknote size={16} strokeWidth={2} className="shrink-0" />
                                </button>
                              )}
                              <button onClick={() => openEditModal(u)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary-100 text-primary-800 border border-primary-300 hover:bg-primary-200 transition-colors shrink-0" title="Modifier" aria-label="Modifier">
                                <Edit size={16} strokeWidth={2} className="shrink-0" />
                              </button>
                              <button onClick={() => handleToggleActive(u)} className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-colors shrink-0 ${u.isActive !== false ? 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200' : 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'}`} title={u.isActive !== false ? 'Désactiver' : 'Activer'} aria-label={u.isActive !== false ? 'Désactiver' : 'Activer'}>
                                {u.isActive !== false ? <Clock size={16} strokeWidth={2} className="shrink-0" /> : <CheckCircle size={16} strokeWidth={2} className="shrink-0" />}
                              </button>
                              <button onClick={() => handleDeleteStudent(u)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 transition-colors shrink-0" title="Supprimer" aria-label="Supprimer">
                                <Trash2 size={16} strokeWidth={2} className="shrink-0" />
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
          <aside className="bg-white rounded shadow-sm border border-surface-200 overflow-hidden xl:min-h-[600px]">
            <div className="flex items-start justify-between gap-3 p-6 pb-5 bg-gradient-to-r from-primary-700 via-[#c97e00] to-primary-800 text-white">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded bg-white/15 flex items-center justify-center shrink-0">
                  <GraduationCap size={22} />
                </div>
                <div>
                  <h3 className="font-black text-lg leading-tight">Inscrire un étudiant</h3>
                  <p className="text-amber-100/90 text-xs mt-0.5">Inscription assistée en 4 étapes</p>
                </div>
              </div>
              <button onClick={() => setShowAddPanel(false)} className="text-amber-100 hover:text-white bg-white/10 hover:bg-white/20 transition-colors shrink-0 rounded p-2" aria-label="Fermer">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <StudentRegistrationForm embedded onSuccess={() => { setShowAddPanel(false); loadUsers(); toast('success', 'Étudiant inscrit avec succès !'); }} />
            </div>
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
                <input required value={msgForm.title} onChange={e => setMsgForm({ ...msgForm, title: e.target.value })} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#c97e00] focus:outline-none" placeholder="Rappel de cours..." />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Contenu</label>
                <textarea required rows={5} value={msgForm.message} onChange={e => setMsgForm({ ...msgForm, message: e.target.value })} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#c97e00] focus:outline-none resize-none" placeholder="Votre message..." />
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
                              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
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
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${p.status === 'FAILED' ? 'bg-red-100' : 'bg-yellow-100'}`}>
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
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isOverdue ? 'bg-orange-100' : 'bg-blue-100'}`}>
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
                                {!sub.coursParticuliers && (
                                  <button
                                    onClick={() => openCashPay(sub)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded bg-primary-600 text-white text-[11px] font-bold hover:bg-primary-700 transition-colors shrink-0"
                                    title="Enregistrer un encaissement en espèces"
                                  >
                                    <Banknote size={14} /> Encaisser
                                  </button>
                                )}
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

      {/* Cash Payment Modal (admin, OTP requis) */}
      {cashPaySub && (
        <div className="fixed inset-0 bg-surface-900/60 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4 modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeCashPay(); }}>
          <div className="bg-white rounded w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92vh] modal-content" role="dialog" aria-modal="true" aria-label="Encaissement en espèces">
            <div className="p-5 bg-gradient-to-r from-primary-700 via-[#c97e00] to-primary-800 text-white flex items-center gap-3 shrink-0">
              <div className="w-11 h-11 rounded bg-white/15 flex items-center justify-center shrink-0"><Banknote size={22} /></div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-base leading-tight">Encaissement en espèces</h3>
                <p className="text-amber-100/90 text-[11px] mt-0.5 truncate">{paymentsStudent?.name || 'Étudiant'} — {cashPaySub.course?.title || 'Formation'}</p>
              </div>
              <button onClick={closeCashPay} className="text-amber-100 hover:text-white bg-white/10 hover:bg-white/20 rounded p-2 transition-colors shrink-0" aria-label="Fermer"><X size={17} /></button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              {cashPayError && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-700 flex items-start gap-2">
                  <X size={14} className="shrink-0 mt-0.5" /> <span>{cashPayError}</span>
                </div>
              )}

              {!cashPayOtpSent ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-1.5" htmlFor="cash-months">Mensualités</label>
                      <select id="cash-months" value={cashPayMonths} onChange={e => { const m = Number(e.target.value); setCashPayMonths(m); setCashPayAmount(Number(cashPaySub.amount || 0) * m); }} className="w-full px-3 py-2.5 bg-surface-50/60 border border-surface-300 rounded-xl text-sm focus:bg-white focus:border-primary-600 focus:outline-none">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                          <option key={m} value={m}>{m} mois{m > 1 ? '' : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-1.5" htmlFor="cash-paidat">Date de paiement *</label>
                      <input id="cash-paidat" type="date" value={cashPayPaidAt} max={new Date().toISOString().split('T')[0]} onChange={e => setCashPayPaidAt(e.target.value)} className="w-full px-3 py-2.5 bg-surface-50/60 border border-surface-300 rounded-xl text-sm focus:bg-white focus:border-primary-600 focus:outline-none" />
                    </div>
                  </div>

                  {/* Remise (optionnel) */}
                  <div className="rounded border border-dashed border-surface-300 p-3 bg-surface-50/40">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-surface-400 mb-2">Remise (optionnel)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-surface-500 mb-1" htmlFor="cp-remise-amount">Montant (F)</label>
                        <input id="cp-remise-amount" type="number" min={0} step={1000} value={cashPayRemiseAmount} onChange={e => setCashPayRemiseAmount(Math.max(0, Number(e.target.value) || 0))}
                          className="w-full px-2.5 py-2 bg-white border border-surface-300 rounded-xl text-xs num focus:border-primary-600 focus:outline-none" placeholder="0" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-surface-500 mb-1" htmlFor="cp-remise-note">Justificatif {cashPayRemiseAmount > 0 && '*'}</label>
                        <input id="cp-remise-note" type="text" value={cashPayRemiseNote} onChange={e => setCashPayRemiseNote(e.target.value)}
                          className="w-full px-2.5 py-2 bg-white border border-surface-300 rounded-xl text-xs focus:border-primary-600 focus:outline-none" placeholder="Ex: Remise sur promesse écrite du 17/11/2026" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-surface-500 mb-1" htmlFor="cp-remise-date">Date de remise</label>
                        <input id="cp-remise-date" type="date" value={cashPayRemiseDate} max={new Date().toISOString().split('T')[0]} onChange={e => setCashPayRemiseDate(e.target.value)}
                          className="w-full px-2.5 py-2 bg-white border border-surface-300 rounded-xl text-xs focus:border-primary-600 focus:outline-none" />
                      </div>
                    </div>
                    {cashPayRemiseAmount > 0 && (
                      <p className="text-[11px] text-accent-700 font-semibold mt-2">Remise de {cashPayRemiseAmount.toLocaleString('fr-FR')} F — enregistrement avec justificatif et date.</p>
                    )}
                  </div>

                  <div className="rounded border border-primary-200 bg-gradient-to-br from-primary-50 to-amber-50/50 p-4 flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-surface-500">Montant à encaisser</span>
                    <span className="text-2xl font-black text-primary-800 tabular-nums">{Math.max(0, Number(cashPaySub?.amount || 0) * cashPayMonths - cashPayRemiseAmount).toLocaleString('fr-FR')} <span className="text-sm">FCFA</span></span>
                  </div>
                  <p className="text-[11px] text-surface-400">La prochaine mensualité sera définie à partir de cette date de paiement (+{cashPayMonths} mois).</p>

                  <button type="button" onClick={startCashPay} disabled={cashPayLoading}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded transition-all shadow-sm hover:shadow-md disabled:opacity-60">
                    {cashPayLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {cashPayLoading ? 'Envoi du code…' : 'Envoyer le code OTP'}
                  </button>
                </>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded p-4 text-xs text-blue-800">
                    Un code à 6 chiffres a été envoyé à la boîte mail de l'établissement. La prochaine mensualité sera recalculée à partir du <strong>{new Date(cashPayPaidAt).toLocaleDateString('fr-FR')}</strong>.
                  </div>
                  <div className="flex items-center justify-between gap-3 px-1">
                    <OtpCountdown expiresAt={cashPayExpiresAt} />
                    <button type="button" onClick={resendCashPayOtp} disabled={cashPayResending}
                      className="text-xs font-bold text-primary-800 hover:text-primary-900 hover:underline disabled:opacity-50 transition-colors">
                      {cashPayResending ? 'Envoi…' : 'Renvoyer le code'}
                    </button>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-1.5" htmlFor="cash-otp">Code OTP</label>
                    <input id="cash-otp" type="text" inputMode="numeric" autoComplete="one-time-code" value={cashPayOtp} onChange={e => setCashPayOtp(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmCashPay(); } }}
                      placeholder="Code reçu par email" maxLength={8} autoFocus
                      className="w-full px-4 py-3 border-2 border-surface-300 rounded text-center text-lg tracking-widest font-black tabular-nums focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10 focus:outline-none" />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setCashPayOtpSent(false); setCashPayOtp(""); setCashPayError(null); }}
                      className="flex-1 px-4 py-2.5 border border-surface-300 text-surface-600 rounded-xl text-xs font-semibold hover:bg-surface-100 transition-colors">
                      Retour
                    </button>
                    <button type="button" onClick={confirmCashPay} disabled={cashPayLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded transition-all disabled:opacity-60">
                      {cashPayLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                      {cashPayLoading ? 'Confirmation…' : "Confirmer l'encaissement"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Registration Completion Modal (admin, OTP requis) */}
      {completionTarget && (
        <div className="fixed inset-0 bg-surface-900/60 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4 modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeCompletion(); }}>
          <div className="bg-white rounded w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92vh] modal-content" role="dialog" aria-modal="true" aria-label="Finaliser l'inscription">
            <div className="p-5 bg-gradient-to-r from-primary-700 via-[#c97e00] to-primary-800 text-white flex items-center gap-3 shrink-0">
              <div className="w-11 h-11 rounded bg-white/15 flex items-center justify-center shrink-0"><Banknote size={22} /></div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-base leading-tight">Finaliser l'inscription</h3>
                <p className="text-amber-100/90 text-[11px] mt-0.5 truncate">{completionTarget.name || completionTarget.email} — paiement rattrapable</p>
              </div>
              <button onClick={closeCompletion} className="text-amber-100 hover:text-white bg-white/10 hover:bg-white/20 rounded p-2 transition-colors shrink-0" aria-label="Fermer"><X size={17} /></button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              {completionError && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-700 flex items-start gap-2">
                  <X size={14} className="shrink-0 mt-0.5" /> <span>{completionError}</span>
                </div>
              )}

              {!completionOtpSent ? (
                <>
                  <div>
                    <p className="block text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-1.5">Formation(s) *</p>
                    <div className="max-h-44 overflow-y-auto border border-surface-300 rounded p-2 space-y-0.5 bg-surface-50/40">
                      {courses.length === 0 ? (
                        <p className="text-xs text-surface-400 italic px-1 py-1">Aucune formation disponible</p>
                      ) : courses.map((c: any) => {
                        const checked = completionCourseIds.includes(c.id);
                        return (
                          <label key={c.id} className={`flex items-center gap-2.5 px-2 py-1.5 text-sm cursor-pointer rounded transition-colors ${checked ? 'bg-primary-50' : 'hover:bg-surface-100'}`}>
                            <input type="checkbox" checked={checked} onChange={() => toggleCompletionCourse(c.id)} className="accent-[#c97e00] w-4 h-4" />
                            <span className={checked ? 'text-surface-900 font-medium' : 'text-surface-600'}>{c.title}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {!completionDiaspora && (
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-1.5" htmlFor="completion-mode">Mode de formation</label>
                      <select id="completion-mode" value={completionMode} onChange={e => setCompletionMode(e.target.value as any)} className="w-full px-3 py-2.5 bg-surface-50/60 border border-surface-300 rounded-xl text-sm focus:bg-white focus:border-primary-600 focus:outline-none">
                        <option value="presentiel">Présentiel</option>
                        <option value="en_ligne">En ligne</option>
                        <option value="les_deux">Présentiel + En ligne</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-1.5" htmlFor="completion-paidat">Date de paiement *</label>
                    <input id="completion-paidat" type="date" value={completionPaidAt} max={new Date().toISOString().split('T')[0]} onChange={e => setCompletionPaidAt(e.target.value)} className="w-full px-3 py-2.5 bg-surface-50/60 border border-surface-300 rounded-xl text-sm focus:bg-white focus:border-primary-600 focus:outline-none" />
                  </div>

                  {/* Remise (optionnel) */}
                  <div className="rounded border border-dashed border-surface-300 p-3 bg-surface-50/40">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-surface-400 mb-2">Remise sur l'inscription (optionnel)</p>
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-surface-500 mb-1" htmlFor="cr-remise-amount">Montant (F)</label>
                          <input id="cr-remise-amount" type="number" min={0} step={1000} value={completionRemiseAmount} onChange={e => setCompletionRemiseAmount(e.target.value)}
                            className="w-full px-2.5 py-2 bg-white border border-surface-300 rounded-xl text-xs num focus:border-primary-600 focus:outline-none" placeholder="Ex: 5000" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-surface-500 mb-1" htmlFor="cr-remise-date">Date de remise</label>
                          <input id="cr-remise-date" type="date" value={completionRemiseDate} max={new Date().toISOString().split('T')[0]} onChange={e => setCompletionRemiseDate(e.target.value)}
                            className="w-full px-2.5 py-2 bg-white border border-surface-300 rounded-xl text-xs focus:border-primary-600 focus:outline-none" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-surface-500 mb-1" htmlFor="cr-remise-note">Justificatif {completionRemiseValue > 0 && '*'}</label>
                        <textarea id="cr-remise-note" rows={3} value={completionRemiseNote} onChange={e => setCompletionRemiseNote(e.target.value)}
                          className="w-full px-2.5 py-2 bg-white border border-surface-300 rounded-xl text-xs focus:border-primary-600 focus:outline-none resize-none" placeholder="Ex: remise 10 % accordée le 17/11/2026" />
                      </div>
                    </div>
                    {completionRemiseValue > 0 && <p className="text-[11px] text-accent-700 font-semibold mt-2">Remise de {completionRemiseValue.toLocaleString('fr-FR')} F — enregistrée sur le paiement.</p>}
                  </div>

                  {selectedCompletionCourses.length > 0 ? (
                    <div className="rounded border border-primary-200 bg-gradient-to-br from-primary-50 to-amber-50/50 p-4 space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-surface-500">Frais d'inscription</span>
                        <span className="font-bold text-surface-900 tabular-nums">{completionRegPrice.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                      {completionRemiseValue > 0 && (
                        <div className="flex items-center justify-between gap-3 text-xs text-accent-700">
                          <span>Remise</span>
                          <span className="font-bold tabular-nums">− {Math.min(completionRegPrice, completionRemiseValue).toLocaleString('fr-FR')} FCFA</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-surface-500">Mensualité (chaque mois)</span>
                        <span className="font-bold text-surface-900 tabular-nums">{completionMonthly.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                      <div className="border-t border-primary-200/70 pt-1.5 flex items-center justify-between gap-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-surface-500">Total à encaisser</span>
                        <span className="text-xl font-black text-primary-800 tabular-nums">{completionAmount.toLocaleString('fr-FR')} <span className="text-xs">FCFA</span></span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded border border-dashed border-surface-300 bg-surface-50/60 p-4 text-center">
                      <p className="text-xs font-semibold text-surface-500">Sélectionnez au moins une formation</p>
                      <p className="text-[11px] text-surface-400 mt-0.5">Les montants seront calculés automatiquement</p>
                    </div>
                  )}

                  <button type="button" onClick={startCompletion} disabled={completionLoading || completionCourseIds.length === 0}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded transition-all shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed">
                    {completionLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {completionLoading ? 'Envoi du code…' : 'Envoyer le code OTP'}
                  </button>
                </>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded p-4 text-xs text-blue-800">
                    Un code à 6 chiffres a été envoyé à la boîte mail de l'établissement pour l'encaissement de <strong>{completionAmount.toLocaleString('fr-FR')} FCFA</strong>.
                  </div>
                  <div className="flex items-center justify-between gap-3 px-1">
                    <OtpCountdown expiresAt={completionExpiresAt} />
                    <button type="button" onClick={resendCompletionOtp} disabled={completionResending}
                      className="text-xs font-bold text-primary-800 hover:text-primary-900 hover:underline disabled:opacity-50 transition-colors">
                      {completionResending ? 'Envoi…' : 'Renvoyer le code'}
                    </button>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-1.5" htmlFor="completion-otp">Code OTP</label>
                    <input id="completion-otp" type="text" inputMode="numeric" autoComplete="one-time-code" value={completionOtp} onChange={e => setCompletionOtp(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmCompletion(); } }}
                      placeholder="Code reçu par email" maxLength={8} autoFocus
                      className="w-full px-4 py-3 border-2 border-surface-300 rounded text-center text-lg tracking-widest font-black tabular-nums focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10 focus:outline-none" />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setCompletionOtpSent(false); setCompletionOtp(""); setCompletionError(null); }}
                      className="flex-1 px-4 py-2.5 border border-surface-300 text-surface-600 rounded-xl text-xs font-semibold hover:bg-surface-100 transition-colors">
                      Retour
                    </button>
                    <button type="button" onClick={confirmCompletion} disabled={completionLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded transition-all disabled:opacity-60">
                      {completionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                      {completionLoading ? 'Confirmation…' : "Confirmer l'encaissement"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!studentToDelete}
        title="Supprimer cet étudiant ?"
        description="Cette action est définitive et irréversible."
        confirmLabel="Supprimer"
        cancelLabel="Garder l'étudiant"
        loading={deleting}
        error={deleteError}
        icon={<Trash2 size={30} strokeWidth={2.2} />}
        onConfirm={confirmDeleteStudent}
        onCancel={() => { if (!deleting) { setStudentToDelete(null); setDeleteError(null); } }}
      >
        {studentToDelete && (
          <div className="space-y-3">
            {/* Identité de l'étudiant */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-rose-100 bg-rose-50/50">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-800 text-white flex items-center justify-center text-base font-black shrink-0">
                {((studentToDelete.name?.[0] || '?') + (studentToDelete.name?.split(' ')[1]?.[0] || '')).toUpperCase().slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-surface-900 truncate">{studentToDelete.name || 'Sans nom'}</p>
                <p className="text-xs text-surface-500 truncate">{studentToDelete.email}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {studentToDelete.matricule && <span className="text-[10px] font-mono text-surface-400">Matr. {studentToDelete.matricule}</span>}
                  {studentToDelete.ville && <span className="text-[10px] text-surface-400 flex items-center gap-0.5"><MapPin size={9} />{studentToDelete.ville}</span>}
                </div>
              </div>
            </div>
            {/* Conséquences */}
            <ul className="text-[11px] text-surface-500 space-y-1 pl-1">
              <li className="flex items-start gap-1.5"><span className="text-rose-500 font-black leading-none mt-0.5">•</span> Le compte, les paiements, les abonnements et les contrats seront supprimés</li>
              <li className="flex items-start gap-1.5"><span className="text-rose-500 font-black leading-none mt-0.5">•</span> L'étudiant ne pourra plus se connecter à son espace</li>
              <li className="flex items-start gap-1.5"><span className="text-rose-500 font-black leading-none mt-0.5">•</span> Les reçus et historiques associés seront perdus</li>
            </ul>
          </div>
        )}
      </ConfirmDialog>

      {/* Edit Student Modal */}
      {showEditModal && editingStudent && (
        <div className="fixed inset-0 bg-surface-900/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 modal-overlay" onClick={() => { setShowEditModal(false); setEditingStudent(null); }}>
          <div className="bg-white rounded w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh] modal-content" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Modifier l'étudiant">
            {/* Header avec identité */}
            <div className="p-5 border-b border-primary-800/40 shrink-0 bg-gradient-to-r from-primary-700 via-[#c97e00] to-primary-800 text-white flex items-center gap-4">
              <div className="w-14 h-14 rounded bg-white/15 flex items-center justify-center text-lg font-black shrink-0">
                {(((editForm.prenom?.[0] || editingStudent.name?.[0] || '?') + (editForm.nom?.[0] || editingStudent.name?.split(' ')[1]?.[0] || '')).toUpperCase())}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-lg leading-tight">Modifier l'étudiant</h3>
                <p className="text-amber-100/90 text-xs mt-0.5 truncate">
                  {editingStudent.matricule ? <span className="font-mono">Matr. {editingStudent.matricule}</span> : editingStudent.email}
                </p>
              </div>
              <button onClick={() => { setShowEditModal(false); setEditingStudent(null); }} className="text-amber-100 hover:text-white bg-white/10 hover:bg-white/20 rounded p-2 transition-colors shrink-0" aria-label="Fermer"><X size={18} /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="flex flex-col h-full overflow-hidden">
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Identité */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-surface-400 mb-2 flex items-center gap-1.5"><GraduationCap size={11} /> Identité</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-surface-500 mb-1.5" htmlFor="edit-prenom">Prénom</label>
                      <input id="edit-prenom" value={editForm.prenom} onChange={e => setEditForm({ ...editForm, prenom: e.target.value })} autoComplete="given-name" className="w-full px-4 py-2.5 bg-surface-50/60 border border-surface-300 rounded-xl text-sm focus:bg-white focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10 focus:outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-surface-500 mb-1.5" htmlFor="edit-nom">Nom</label>
                      <input id="edit-nom" value={editForm.nom} onChange={e => setEditForm({ ...editForm, nom: e.target.value })} autoComplete="family-name" className="w-full px-4 py-2.5 bg-surface-50/60 border border-surface-300 rounded-xl text-sm focus:bg-white focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10 focus:outline-none transition-all" />
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-surface-400 mb-2 flex items-center gap-1.5"><Mail size={11} /> Contact</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-surface-500 mb-1.5" htmlFor="edit-email">Email</label>
                      <input id="edit-email" type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} autoComplete="email" className="w-full px-4 py-2.5 bg-surface-50/60 border border-surface-300 rounded-xl text-sm focus:bg-white focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10 focus:outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-surface-500 mb-1.5" htmlFor="edit-telephone">Téléphone (WhatsApp)</label>
                      <input id="edit-telephone" type="tel" value={editForm.telephone} onChange={e => setEditForm({ ...editForm, telephone: e.target.value })} autoComplete="tel" placeholder="07 XX XX XX XX" className="w-full px-4 py-2.5 bg-surface-50/60 border border-surface-300 rounded-xl text-sm focus:bg-white focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10 focus:outline-none transition-all" />
                    </div>
                  </div>
                </div>

                {/* Localisation */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-surface-400 mb-2 flex items-center gap-1.5"><MapPin size={11} /> Localisation</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-surface-500 mb-1.5" htmlFor="edit-pays">Pays</label>
                      <select id="edit-pays" value={editForm.pays} onChange={e => setEditForm({ ...editForm, pays: e.target.value })} className="w-full px-4 py-2.5 bg-surface-50/60 border border-surface-300 rounded-xl text-sm focus:bg-white focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10 focus:outline-none transition-all">
                        <option value="">—</option>
                        {PAYS.map(p => <option key={p} value={p}>{p}</option>)}
                        {editForm.pays && !PAYS.includes(editForm.pays) && <option value={editForm.pays}>{editForm.pays}</option>}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-surface-500 mb-1.5" htmlFor="edit-ville">Ville / Centre</label>
                      <input id="edit-ville" list="edit-villes-list" value={editForm.ville} onChange={e => setEditForm({ ...editForm, ville: e.target.value })} placeholder="Ex: Abidjan" className="w-full px-4 py-2.5 bg-surface-50/60 border border-surface-300 rounded-xl text-sm focus:bg-white focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10 focus:outline-none transition-all" />
                      <datalist id="edit-villes-list">
                        {VILLES.map(v => <option key={v} value={v} />)}
                      </datalist>
                    </div>
                  </div>
                </div>

                {/* Formations */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-surface-400 mb-2 flex items-center gap-1.5"><GraduationCap size={11} /> Formations</p>
                  <div className="max-h-44 overflow-y-auto border border-surface-300 rounded p-2 space-y-0.5 bg-surface-50/40">
                    {courses.length === 0 ? (
                      <p className="text-xs text-surface-400 italic px-1 py-1">Aucune formation disponible</p>
                    ) : (
                      courses.map((c: any) => {
                        const checked = editForm.courseIds.includes(c.id);
                        return (
                          <label key={c.id} className={`flex items-center gap-2.5 px-2 py-1.5 text-sm cursor-pointer rounded transition-colors ${checked ? 'bg-primary-50' : 'hover:bg-surface-100'}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={e => setEditForm(f => ({
                                ...f,
                                courseIds: e.target.checked
                                  ? [...f.courseIds, c.id]
                                  : f.courseIds.filter(id => id !== c.id),
                              }))}
                              className="accent-[#c97e00] w-4 h-4"
                            />
                            <span className={checked ? 'text-surface-900 font-medium' : 'text-surface-600'}>{c.title}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                  {editForm.courseIds.length === 0 && (
                    <p className="text-xs text-amber-700 mt-1.5">Sélectionnez au moins une formation pour cet étudiant.</p>
                  )}
                </div>
              </div>
              <div className="p-5 border-t border-surface-200 shrink-0 flex items-center justify-end gap-3 bg-surface-50/70">
                <button type="button" onClick={() => { setShowEditModal(false); setEditingStudent(null); }} className="px-5 py-2.5 text-surface-500 hover:text-surface-800 font-semibold text-sm rounded hover:bg-surface-100 transition-colors">Annuler</button>
                <button type="submit" disabled={submitting} className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2.5 rounded font-bold text-sm hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {submitting ? 'Enregistrement…' : 'Enregistrer'}
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
