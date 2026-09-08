import { useState, useEffect } from "react";
import { fetchUsers, fetchCourses, fetchSessions, createSession, deleteSession, validateSession } from "../utils/api";
import { Plus, Search, Trash2, Loader2, Clock, CheckCircle, X, Monitor, User, Bell, MapPin, ShieldCheck } from "lucide-react";
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
      case 'VALIDATED': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700"><ShieldCheck size={10} /> Validée</span>;
      case 'COMPLETED': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700"><CheckCircle size={10} /> Terminée</span>;
      case 'CANCELLED': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700"><X size={10} /> Annulée</span>;
      default: return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700"><Clock size={10} /> Planifiée</span>;
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-[#0056B3]" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div>
          <h2 className="font-black text-gray-900 flex items-center gap-2">
            <Clock size={18} className="text-[#0056B3]" /> Programmation des cours
          </h2>
          <p className="text-gray-500 text-xs mt-1">Planifiez les séances par semaine, avec horaires et type de cours</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#0056B3] text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-[#003375] transition-colors whitespace-nowrap">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Fermer' : 'Nouvelle séance'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h3 className="font-bold text-gray-900">Programmer une séance de cours</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Enseignant *</label>
              <select required value={form.teacherId} onChange={e => setForm({ ...form, teacherId: e.target.value })}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none">
                <option value="">Sélectionnez...</option>
                {teachers.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name || t.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Matière / Cours</label>
              <select value={form.courseId} onChange={e => setForm({ ...form, courseId: e.target.value })}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none">
                <option value="">Sélectionnez...</option>
                {courses.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Date *</label>
              <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Début *</label>
              <input type="time" required value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Fin *</label>
              <input type="time" required value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Durée (auto)</label>
              <div className="px-3 py-2.5 border-2 border-gray-100 rounded-xl text-sm text-gray-500 bg-gray-50">
                {autoHours !== '0' ? `${autoHours}h` : '—'}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Type *</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm({ ...form, type: 'PRESENTIEL', location: '' })}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${form.type === 'PRESENTIEL' ? 'border-[#0056B3] bg-blue-50 text-[#0056B3]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  <User size={14} /> Présentiel
                </button>
                <button type="button" onClick={() => setForm({ ...form, type: 'ONLINE', location: '' })}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${form.type === 'ONLINE' ? 'border-[#0056B3] bg-blue-50 text-[#0056B3]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  <Monitor size={14} /> En ligne
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {form.type === 'ONLINE' ? 'Lien de connexion' : 'Lieu / Salle'}
              </label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                  placeholder={form.type === 'ONLINE' ? 'https://meet.google.com/...' : 'Salle 101, étage 2'}
                  className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Description (optionnel)</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none" placeholder="Cours de mathématiques - Chapitre 3" />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.notifyStudents} onChange={e => setForm({ ...form, notifyStudents: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-[#0056B3] focus:ring-[#0056B3]" />
                <span className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <Bell size={14} /> Notifier les étudiants
                </span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-600 font-semibold">Annuler</button>
            <button type="submit" disabled={submitting || autoHours === '0'}
              className="flex items-center gap-2 bg-[#0056B3] text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-[#003375] disabled:opacity-50">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Programmer la séance
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par enseignant, matière..."
              className="w-full pl-9 pr-4 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none" />
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
                    <Clock size={14} className="text-[#0056B3]" /> {week.weekLabel}
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
                              <div className="w-7 h-7 rounded-full bg-[#0056B3] flex items-center justify-center text-white text-[10px] font-bold">
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
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.type === 'ONLINE' ? 'bg-purple-50 text-purple-700' : 'bg-green-50 text-green-700'}`}>
                              {s.type === 'ONLINE' ? <Monitor size={10} /> : <User size={10} />}
                              {s.type === 'ONLINE' ? 'En ligne' : 'Présentiel'}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-gray-500 text-xs max-w-[150px] truncate">
                            {s.location ? (
                              s.type === 'ONLINE'
                                ? <a href={s.location} target="_blank" rel="noopener noreferrer" className="text-[#0056B3] hover:underline">{s.location}</a>
                                : s.location
                            ) : '—'}
                          </td>
                          <td className="px-6 py-3">{statusBadge(s.status)}</td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-1">
                              {s.status === 'COMPLETED' && (
                                <button onClick={() => handleValidate(s.id)} disabled={validatingId === s.id}
                                  className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="Valider">
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
