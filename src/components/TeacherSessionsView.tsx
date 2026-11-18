import { useState, useEffect } from "react";
import { fetchUsers, fetchCourses, fetchSessions, createSession, deleteSession, validateSession } from "../utils/api";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Trash2, Loader2, Clock, CheckCircle, X, Monitor, User, Bell, MapPin, ShieldCheck, CalendarClock, ChevronDown, GraduationCap, BookOpen, Link2 } from "lucide-react";
import { useToast } from "./Toast";

interface Props {
  onSessionChange?: () => void;
}

export default function TeacherSessionsView({ onSessionChange }: Props) {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [weeks, setWeeks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    teacherId: "", courseId: "", date: "", startTime: "", endTime: "",
    type: "PRESENTIEL", location: "", description: "", notifyStudents: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast, confirm } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [allUsers, allCourses, sessionsData] = await Promise.all([
        fetchUsers(),
        fetchCourses(),
        fetchSessions({ groupByWeek: 'true' }),
      ]);
      setTeachers(allUsers.filter((u: any) => u.role === 'TEACHER'));
      setCourses(allCourses);
      setWeeks(sessionsData.weeks || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const computeHours = (start: string, end: string): string => {
    if (!start || !end) return '0';
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const hours = (eh + em / 60) - (sh + sm / 60);
    return hours > 0 ? hours.toFixed(2) : '0';
  };

  const autoHours = computeHours(form.startTime, form.endTime);

  const filteredWeeks = weeks.filter((w: any) =>
    w.sessions.some((s: any) =>
      s.teacher?.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.teacher?.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.course?.title?.toLowerCase().includes(search.toLowerCase())
    )
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.teacherId || !form.date || !form.startTime || !form.endTime) {
      toast('error', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }
    const hours = parseFloat(autoHours);
    if (hours <= 0) {
      toast('error', "L'heure de fin doit être après l'heure de début.");
      return;
    }
    setSubmitting(true);
    try {
      await createSession({
        teacherId: form.teacherId,
        courseId: form.courseId || undefined,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        type: form.type,
        location: form.location || undefined,
        description: form.description || undefined,
        notifyStudents: form.notifyStudents,
      });
      setForm({ teacherId: "", courseId: "", date: "", startTime: "", endTime: "", type: "PRESENTIEL", location: "", description: "", notifyStudents: false });
      setShowForm(false);
      loadData();
      if (onSessionChange) onSessionChange();
      toast('success', 'Séance programmée avec succès !');
    } catch (err) {
      toast('error', "Erreur lors de la programmation de la séance.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (session: any) => {
    const label = `${new Date(session.date).toLocaleDateString('fr-FR')} ${session.startTime}-${session.endTime} (${session.type})`;
    const ok = await confirm(`Supprimer la séance du ${label} ?`);
    if (!ok) return;
    try {
      await deleteSession(session.id);
      loadData();
      if (onSessionChange) onSessionChange();
      toast('success', 'Séance supprimée.');
    } catch {
      toast('error', 'Erreur lors de la suppression.');
    }
  };

  const [validatingId, setValidatingId] = useState<string | null>(null);

  const handleValidate = async (sessionId: string) => {
    setValidatingId(sessionId);
    try {
      await validateSession(sessionId);
      toast('success', 'Séance validée avec succès !');
      loadData();
      if (onSessionChange) onSessionChange();
    } catch {
      toast('error', 'Erreur lors de la validation');
    } finally {
      setValidatingId(null);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'PAID': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700"><CheckCircle size={10} /> Payée</span>;
      case 'VALIDATED': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-50 text-primary-700"><ShieldCheck size={10} /> Validée</span>;
      case 'COMPLETED': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700"><CheckCircle size={10} /> Terminée</span>;
      case 'CANCELLED': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700"><X size={10} /> Annulée</span>;
      default: return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700"><Clock size={10} /> Planifiée</span>;
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-[#c97e00]" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div>
          <h2 className="font-black text-gray-900 flex items-center gap-2">
            <Clock size={18} className="text-[#c97e00]" /> Programmation des cours
          </h2>
          <p className="text-gray-500 text-xs mt-1">Planifiez les séances par semaine, avec horaires et type de cours</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#c97e00] text-white px-4 py-2.5 rounded font-bold text-sm hover:bg-[#6b4500] transition-colors whitespace-nowrap">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Fermer' : 'Nouvelle séance'}
        </button>
      </div>

      <AnimatePresence>
      {showForm && (
        <motion.form
          key="new-session-form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, height: 0, y: -12 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0, y: -12 }}
          transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          className="bg-white rounded-2xl shadow-xl border border-primary-100 overflow-hidden origin-top"
        >
          <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-primary-700 via-[#c97e00] to-primary-800 text-white">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <CalendarClock size={22} />
            </div>
            <div>
              <h3 className="font-display font-bold text-base leading-tight">Programmer une séance</h3>
              <p className="text-amber-100/80 text-[11px]">Enseignant, matière, horaires et type de cours</p>
            </div>
            <button type="button" onClick={() => setShowForm(false)} aria-label="Fermer"
              className="ml-auto text-amber-100/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg p-2 transition-colors">
              <X size={17} />
            </button>
          </div>
          <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-500 mb-1.5 flex items-center gap-1"><User size={11} /> Enseignant *</label>
              <div className="relative">
                <select required value={form.teacherId} onChange={e => setForm({ ...form, teacherId: e.target.value })}
                  className="w-full appearance-none pl-4 pr-10 py-2.5 border border-surface-300 rounded-xl text-sm bg-surface-50/60 focus:bg-white focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10 focus:outline-none transition-all">
                  <option value="">Sélectionnez...</option>
                  {teachers.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name || t.email}</option>
                  ))}
                </select>
                <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-500 mb-1.5 flex items-center gap-1"><BookOpen size={11} /> Matière / Cours</label>
              <div className="relative">
                <select value={form.courseId} onChange={e => setForm({ ...form, courseId: e.target.value })}
                  className="w-full appearance-none pl-4 pr-10 py-2.5 border border-surface-300 rounded-xl text-sm bg-surface-50/60 focus:bg-white focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10 focus:outline-none transition-all">
                  <option value="">Sélectionnez...</option>
                  {courses.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
                <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-500 mb-1.5">Date *</label>
              <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full px-4 py-2.5 border border-surface-300 rounded-xl text-sm bg-surface-50/60 focus:bg-white focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10 focus:outline-none transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-500 mb-1.5">Début *</label>
              <input type="time" required value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })}
                className="w-full px-4 py-2.5 border border-surface-300 rounded-xl text-sm bg-surface-50/60 focus:bg-white focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10 focus:outline-none transition-all num" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-500 mb-1.5">Fin *</label>
              <input type="time" required value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })}
                className="w-full px-4 py-2.5 border border-surface-300 rounded-xl text-sm bg-surface-50/60 focus:bg-white focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10 focus:outline-none transition-all num" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-500 mb-1.5">Durée (auto)</label>
              <div className="px-4 py-2.5 border border-transparent rounded-xl text-sm text-primary-800 font-bold bg-primary-50 border-primary-100 num flex items-center gap-2">
                <Clock size={14} /> {autoHours !== '0' ? `${autoHours}h` : '—'}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-500 mb-1.5 flex items-center gap-1"><GraduationCap size={11} /> Type de cours *</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setForm({ ...form, type: 'PRESENTIEL', location: '' })}
                  className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-bold border transition-all duration-150 ${form.type === 'PRESENTIEL' ? 'border-primary-600 bg-primary-50 text-primary-800 shadow-[0_0_0_3px_rgba(201,126,0,0.15)]' : 'border-surface-300 text-surface-500 hover:border-primary-300 hover:text-surface-700'}`}>
                  <User size={15} /> Présentiel
                </button>
                <button type="button" onClick={() => setForm({ ...form, type: 'ONLINE', location: '' })}
                  className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-bold border transition-all duration-150 ${form.type === 'ONLINE' ? 'border-primary-600 bg-primary-50 text-primary-800 shadow-[0_0_0_3px_rgba(201,126,0,0.15)]' : 'border-surface-300 text-surface-500 hover:border-primary-300 hover:text-surface-700'}`}>
                  <Monitor size={15} /> En ligne
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-500 mb-1.5 flex items-center gap-1">{form.type === 'ONLINE' ? <Link2 size={11} /> : <MapPin size={11} />} {form.type === 'ONLINE' ? 'Lien de connexion' : 'Lieu / Salle'}</label>
              <div className="relative">
                <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
                <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                  placeholder={form.type === 'ONLINE' ? 'https://meet.google.com/...' : 'Salle 101, étage 2'}
                  className="w-full pl-11 pr-4 py-2.5 border border-surface-300 rounded-xl text-sm bg-surface-50/60 focus:bg-white focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10 focus:outline-none transition-all" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-500 mb-1.5">Description (optionnel)</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-2.5 border border-surface-300 rounded-xl text-sm bg-surface-50/60 focus:bg-white focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10 focus:outline-none transition-all" placeholder="Ex: Magistrature — Chapitre 3" />
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none rounded-xl border border-surface-200 bg-surface-50/60 px-4 py-3 hover:border-primary-300 transition-colors">
              <button type="button" role="switch" aria-checked={form.notifyStudents} onClick={() => setForm({ ...form, notifyStudents: !form.notifyStudents })}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${form.notifyStudents ? 'bg-primary-600' : 'bg-surface-300'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.notifyStudents ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <span className="text-sm font-semibold text-surface-800 flex items-center gap-1.5">
                <Bell size={14} className="text-primary-600" /> Notifier les inscrits
              </span>
            </label>
          </div>
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-surface-100 pt-4">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2.5 text-sm text-surface-500 font-semibold hover:text-surface-800 rounded-xl hover:bg-surface-100 transition-colors">Annuler</button>
            <button type="submit" disabled={submitting || autoHours === '0'}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl font-bold text-sm hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md">
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Programmer la séance
            </button>
          </div>
          </div>
        </motion.form>
      )}
      </AnimatePresence>

      <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par enseignant, matière..."
              className="w-full pl-9 pr-4 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-[#c97e00] focus:outline-none" />
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {filteredWeeks.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">Aucune séance programmée</div>
          ) : (
            filteredWeeks.map((week: any) => (
              <div key={week.weekLabel}>
                <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-b border-gray-100">
                  <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                    <Clock size={14} className="text-[#c97e00]" /> {week.weekLabel}
                  </h3>
                  <span className="text-xs text-gray-500 font-semibold">{week.totalHours}h au total</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-white text-left">
                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Enseignant</th>
                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Matière</th>
                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Horaire</th>
                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Durée</th>
                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Lieu / Lien</th>
                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Statut</th>
                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {week.sessions.map((s: any) => (
                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#c97e00] flex items-center justify-center text-white text-[10px] font-bold">
                                {s.teacher?.name?.[0]?.toUpperCase() || '?'}
                              </div>
                              <span className="font-semibold text-gray-900 text-sm">{s.teacher?.name || 'Inconnu'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-700 font-medium">{s.course?.title || '—'}</td>
                          <td className="px-6 py-3 text-gray-600 text-sm">
                            {new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </td>
                          <td className="px-6 py-3 text-gray-500 text-sm">{s.startTime} - {s.endTime}</td>
                          <td className="px-6 py-3 font-bold text-gray-900 text-sm">{s.hours}h</td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.type === 'ONLINE' ? 'bg-accent-50 text-accent-700' : 'bg-green-50 text-green-700'}`}>
                              {s.type === 'ONLINE' ? <Monitor size={10} /> : <User size={10} />}
                              {s.type === 'ONLINE' ? 'En ligne' : 'Présentiel'}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-gray-500 text-xs max-w-[150px] truncate">
                            {s.location ? (
                              s.type === 'ONLINE'
                                ? <a href={s.location} target="_blank" rel="noopener noreferrer" className="text-[#c97e00] hover:underline">{s.location}</a>
                                : s.location
                            ) : '—'}
                          </td>
                          <td className="px-6 py-3">{statusBadge(s.status)}</td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-1">
                              {s.status === 'COMPLETED' && (
                                <button onClick={() => handleValidate(s.id)} disabled={validatingId === s.id}
                                  className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-600 transition-colors" title="Valider">
                                  {validatingId === s.id ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                                </button>
                              )}
                              {s.status !== 'PAID' && s.status !== 'CANCELLED' && (
                                <button onClick={() => handleDelete(s)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors" title="Supprimer">
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
