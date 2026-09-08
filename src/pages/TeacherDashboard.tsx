import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Home, Users, BookOpen, Bell, LogOut, Menu, X, Calendar,
  ChevronRight, CheckCircle, Clock, FileText, GraduationCap,
  AlertCircle, Loader2, Search, Monitor, MapPin, Upload, Download, User
} from "lucide-react";
import { getMe, logout as apiLogout, fetchUsers, fetchNotifications, markNotificationRead, fetchEvents, fetchEvaluations, createEvaluation, fetchSessions, completeSession, uploadSessionFile, getSessionFiles, getDownloadUrl, fetchBlogPosts, deleteBlogPost } from "../utils/api";
import { useToast } from "../components/Toast";

const NAV_ITEMS = [
  { icon: <Home size={18} />, label: "Tableau de bord", id: "dashboard" },
  { icon: <Clock size={18} />, label: "Mes séances", id: "sessions" },
  { icon: <Users size={18} />, label: "Mes étudiants", id: "students" },
  { icon: <BookOpen size={18} />, label: "Mes cours", id: "courses" },
  { icon: <Calendar size={18} />, label: "Planning", id: "planning" },
  { icon: <FileText size={18} />, label: "Évaluations", id: "evals" },
  { icon: <Bell size={18} />, label: "Notifications", id: "notifs" },
  { icon: <BookOpen size={18} />, label: "Blog", id: "blog" },
];

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-2xl p-6 h-32 border border-gray-100" />)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl h-80 border border-gray-100" />
        <div className="bg-white rounded-2xl h-80 border border-gray-100" />
      </div>
    </div>
  );
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

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('teacherTab') || 'dashboard');

  const [user, setUser] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [authChecked, setAuthChecked] = useState(false);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const userData = await getMe();
      if (userData.role !== 'TEACHER') {
        navigate('/student/login');
        return;
      }
      setUser(userData);
      setAuthChecked(true);
      const [usersData, notifsData] = await Promise.all([
        fetchUsers(),
        fetchNotifications(),
      ]);
      setStudents(usersData.filter((u: any) => u.role === "STUDENT"));
      setNotifs(notifsData);
    } catch {
      navigate("/student/login");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { localStorage.setItem('teacherTab', activeTab); }, [activeTab]);

  const handleLogout = async () => {
    try { await apiLogout(); } catch { /* ignore */ }
    navigate("/student/login");
  };

  const filteredStudents = students.filter((s: any) =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const initials = user?.name?.split(" ").map((s: string) => s[0]).join("").toUpperCase() || "PR";

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (error) return <ErrorBanner message={error} onRetry={loadData} />;

    switch (activeTab) {
      case "sessions": {
        const [mySessions, setMySessions] = useState<any[]>([]);
        const [sessLoading, setSessLoading] = useState(true);
        const [completingId, setCompletingId] = useState<string | null>(null);
        const [uploadingId, setUploadingId] = useState<string | null>(null);
        const [sessionFiles, setSessionFiles] = useState<Record<string, any[]>>({});

        const loadSessions = () => {
          setSessLoading(true);
          fetchSessions({ teacherId: user?.id })
            .then((data: any) => setMySessions(Array.isArray(data) ? data : []))
            .catch(() => {})
            .finally(() => setSessLoading(false));
        };

        useState(() => { if (user?.id) loadSessions(); });

        const handleComplete = async (sessionId: string) => {
          setCompletingId(sessionId);
          try {
            await completeSession(sessionId);
            toast('success', 'Séance marquée comme terminée !');
            loadSessions();
          } catch {
            toast('error', 'Erreur lors de la complétion');
          } finally {
            setCompletingId(null);
          }
        };

        const handleFileUpload = async (sessionId: string, file: File) => {
          setUploadingId(sessionId);
          try {
            await uploadSessionFile(sessionId, file);
            toast('success', 'Fichier uploadé avec succès !');
            const files = await getSessionFiles(sessionId);
            setSessionFiles(prev => ({ ...prev, [sessionId]: files }));
          } catch {
            toast('error', 'Erreur lors de l\'upload du fichier');
          } finally {
            setUploadingId(null);
          }
        };

        const loadFilesForSession = async (sessionId: string) => {
          try {
            const files = await getSessionFiles(sessionId);
            setSessionFiles(prev => ({ ...prev, [sessionId]: files }));
          } catch {}
        };

        return (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-black text-gray-900 text-lg flex items-center gap-2"><Clock size={18} className="text-purple-600" /> Mes séances</h2>
              <p className="text-gray-500 text-sm mt-1">Consultez et gérez vos sessions de cours.</p>
            </div>
            {sessLoading ? (
              <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-purple-600" /></div>
            ) : mySessions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
                <Clock size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm">Aucune session programmée.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Date', 'Horaire', 'Durée', 'Type', 'Matière', 'Lieu', 'Statut', 'Actions'].map(h => (
                          <th key={h} className="text-left py-3 px-4 text-gray-500 text-xs font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {mySessions.map((s: any) => (
                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 text-sm text-gray-900 font-semibold">
                            {new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{s.startTime} - {s.endTime}</td>
                          <td className="py-3 px-4 text-sm font-bold text-gray-900">{s.hours}h</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.type === 'ONLINE' ? 'bg-purple-50 text-purple-700' : 'bg-green-50 text-green-700'}`}>
                              {s.type === 'ONLINE' ? <Monitor size={10} /> : <User size={10} />}
                              {s.type === 'ONLINE' ? 'En ligne' : 'Présentiel'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700">{s.course?.title || '—'}</td>
                          <td className="py-3 px-4 text-sm text-gray-500 max-w-[150px] truncate">
                            {s.location ? (s.type === 'ONLINE' ? <a href={s.location} target="_blank" rel="noopener noreferrer" className="text-[#0056B3] hover:underline">{s.location}</a> : s.location) : '—'}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                              s.status === 'PAID' ? 'bg-green-50 text-green-700' :
                              s.status === 'VALIDATED' ? 'bg-blue-50 text-blue-700' :
                              s.status === 'COMPLETED' ? 'bg-indigo-50 text-indigo-700' :
                              s.status === 'SCHEDULED' ? 'bg-yellow-50 text-yellow-700' :
                              'bg-gray-50 text-gray-600'
                            }`}>
                              {s.status === 'PAID' ? 'Payée' : s.status === 'VALIDATED' ? 'Validée' : s.status === 'COMPLETED' ? 'Terminée' : s.status === 'SCHEDULED' ? 'Planifiée' : s.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              {s.status === 'SCHEDULED' && (
                                <button onClick={() => handleComplete(s.id)} disabled={completingId === s.id}
                                  className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors" title="Terminer le cours">
                                  {completingId === s.id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                                </button>
                              )}
                              {(s.status === 'COMPLETED' || s.status === 'SCHEDULED') && (
                                <div className="relative">
                                  <label className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600 transition-colors cursor-pointer" title="Uploader un fichier">
                                    {uploadingId === s.id ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden"
                                      onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFileUpload(s.id, file);
                                        e.target.value = '';
                                      }} />
                                  </label>
                                </div>
                              )}
                              <button onClick={() => loadFilesForSession(s.id)}
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="Voir fichiers">
                                <Download size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {/* Files modal */}
            {Object.entries(sessionFiles).map(([sessionId, files]) =>
              files.length > 0 && (
                <div key={sessionId} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <h3 className="font-bold text-gray-900 text-sm mb-2">Fichiers de la séance</h3>
                  <div className="space-y-1">
                    {files.map((f: any) => (
                      <a key={f.id} href={getDownloadUrl(f.id)} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-[#0056B3] hover:underline">
                        <Download size={12} /> {f.fileName}
                      </a>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        );
      }

      case "students":
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-black text-gray-900 text-lg mb-4 flex items-center gap-2"><Users size={18} className="text-purple-600" /> Mes étudiants</h2>
              <div className="relative max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Rechercher un étudiant..."
                  className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-500 focus:outline-none" />
              </div>
            </div>
            {filteredStudents.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                <Users size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm">{searchTerm ? "Aucun résultat" : "Aucun étudiant inscrit"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredStudents.map((s: any) => (
                  <div key={s.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm">
                        {s.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm truncate">{s.name || "Sans nom"}</div>
                        <div className="text-gray-400 text-xs truncate">{s.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{s.ville || "Non défini"}</span>
                      <span className={`px-2 py-0.5 rounded-full ${s.role === "STUDENT" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {s.role === "STUDENT" ? "Actif" : s.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "courses":
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-black text-gray-900 text-lg flex items-center gap-2"><BookOpen size={18} className="text-purple-600" /> Mes cours</h2>
              <p className="text-gray-500 text-sm mt-1">Gérez vos modules et sessions de cours.</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
              <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 text-sm">La gestion des cours sera bientôt disponible.</p>
            </div>
          </div>
        );

      case "planning": {
        const [events, setEvents] = useState<any[]>([]);
        const [eventsLoading, setEventsLoading] = useState(true);
        useState(() => { fetchEvents({ teacherId: user?.id }).then(setEvents).catch(() => {}).finally(() => setEventsLoading(false)); });
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-black text-gray-900 text-lg flex items-center gap-2"><Calendar size={18} className="text-purple-600" /> Planning</h2>
              <p className="text-gray-500 text-sm mt-1">Votre calendrier des sessions.</p>
            </div>
            {eventsLoading ? (
              <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-purple-600" /></div>
            ) : events.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
                <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm">Aucun événement planifié.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {events.map((ev: any) => (
                  <div key={ev.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className="bg-purple-50 rounded-xl p-3 text-center shrink-0 min-w-[60px]">
                        <div className="text-purple-600 text-xs font-bold uppercase">{new Date(ev.startTime).toLocaleDateString("fr-FR", { weekday: "short" })}</div>
                        <div className="text-purple-900 font-black text-lg leading-tight">{new Date(ev.startTime).getDate()}</div>
                        <div className="text-purple-600 text-[10px] font-semibold uppercase">{new Date(ev.startTime).toLocaleDateString("fr-FR", { month: "short" })}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-block w-2 h-2 rounded-full ${ev.type === "EXAM" ? "bg-red-500" : "bg-green-500"}`} />
                          <h3 className="font-bold text-gray-900 text-sm">{ev.title}</h3>
                        </div>
                        <p className="text-gray-500 text-xs">
                          {new Date(ev.startTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          {ev.endTime ? ` - ${new Date(ev.endTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}
                          {ev.location ? ` • ${ev.location}` : ""}
                        </p>
                        {ev.description && <p className="text-gray-400 text-xs mt-1">{ev.description}</p>}
                        {ev.course && <span className="mt-1.5 inline-block text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{ev.course.title}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      case "evals": {
        const [evals, setEvals] = useState<any[]>([]);
        const [evalsLoading, setEvalsLoading] = useState(true);
        useState(() => { fetchEvaluations({ teacherId: user?.id }).then(setEvals).catch(() => {}).finally(() => setEvalsLoading(false)); });
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-black text-gray-900 text-lg flex items-center gap-2"><FileText size={18} className="text-purple-600" /> Évaluations</h2>
              <p className="text-gray-500 text-sm mt-1">Suivez les notes de vos étudiants.</p>
            </div>
            {evalsLoading ? (
              <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-purple-600" /></div>
            ) : evals.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
                <FileText size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm">Aucune évaluation pour le moment.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {["Étudiant", "Évaluation", "Note", "Date"].map(h => (
                          <th key={h} className="text-left py-3 px-4 text-gray-500 text-xs font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {evals.map((ev: any) => (
                        <tr key={ev.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-gray-900 text-sm">{ev.student?.name || "Inconnu"}</td>
                          <td className="py-3 px-4 text-gray-600 text-sm">{ev.title}</td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-gray-900">
                              {ev.score != null ? ev.score : "—"}
                              {ev.maxScore ? ` / ${ev.maxScore}` : ""}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-500 text-xs">{new Date(ev.createdAt).toLocaleDateString("fr-FR")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      }

      case "notifs":
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
              <div>
                <h2 className="font-black text-gray-900 text-lg flex items-center gap-2"><Bell size={18} className="text-purple-600" /> Notifications</h2>
                <p className="text-gray-500 text-sm">Dernières alertes et messages.</p>
              </div>
              {notifs.filter(n => !n.isRead).length > 0 && (
                <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {notifs.filter(n => !n.isRead).length} non lue(s)
                </span>
              )}
            </div>
            {notifs.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                <Bell size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm">Aucune notification</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifs.map((n: any) => (
                  <div key={n.id} className={`bg-white rounded-2xl border border-gray-100 p-5 shadow-sm ${!n.isRead ? "border-l-4 border-l-purple-600" : ""}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{n.title}</h3>
                      <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString("fr-FR")}</span>
                    </div>
                    <p className="text-gray-500 text-sm">{n.message}</p>
                    {!n.isRead && (
                      <button onClick={async () => { await markNotificationRead(n.id); loadData(); }}
                        className="mt-2 text-purple-600 text-xs font-semibold hover:underline">
                        Marquer comme lu
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "blog": {
        const [blogPosts, setBlogPosts] = useState<any[]>([]);
        const [blogLoading, setBlogLoading] = useState(true);
        useState(() => { fetchBlogPosts({ limit: 50 }).then(d => setBlogPosts(d.posts || [])).catch(() => {}).finally(() => setBlogLoading(false)); });
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
              <div>
                <h2 className="font-black text-gray-900 text-lg flex items-center gap-2"><BookOpen size={18} className="text-purple-600" /> Blog</h2>
                <p className="text-gray-500 text-sm">Gérez vos articles.</p>
              </div>
              <Link to="/blog/new" className="flex items-center gap-1.5 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-purple-700">
                <BookOpen size={16} /> Nouvel article
              </Link>
            </div>
            {blogLoading ? (
              <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-purple-600" /></div>
            ) : blogPosts.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm">Aucun article. Créez votre premier article !</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {["Titre", "Statut", "Commentaires", "Exercices", "Date", "Actions"].map(h => (
                          <th key={h} className="text-left py-3 px-4 text-gray-500 text-xs font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {blogPosts.map((p: any) => (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-gray-900 text-sm max-w-[250px] truncate">{p.title}</td>
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
                            </div>
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
      }

      default:
        return (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Mes étudiants", value: students.length, icon: <Users size={20} />, color: "bg-purple-600" },
                { label: "Notifications", value: notifs.filter(n => !n.isRead).length, icon: <Bell size={20} />, color: "bg-[#0056B3]" },
                { label: "Taux d'occupation", value: students.length > 0 ? `${Math.min(100, Math.round((students.length / 50) * 100))}%` : "—", icon: <CheckCircle size={20} />, color: "bg-green-500" },
                { label: "Mois en cours", value: new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" }), icon: <Calendar size={20} />, color: "bg-[#FF6B00]" },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className={`w-11 h-11 ${s.color} rounded-xl flex items-center justify-center text-white mb-4`}>{s.icon}</div>
                  <div className="text-2xl font-black text-gray-900">{s.value}</div>
                  <div className="text-gray-500 text-sm mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="font-black text-gray-900 flex items-center gap-2"><GraduationCap size={18} className="text-[#0056B3]" /> Derniers étudiants inscrits</h2>
                </div>
                <div className="p-6 space-y-4">
                  {students.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">Aucun étudiant inscrit</p>
                  ) : (
                    students.slice(0, 5).map((s: any) => (
                      <div key={s.id} className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs">
                          {s.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 text-sm truncate">{s.name || "Sans nom"}</div>
                          <div className="text-gray-400 text-xs">{s.email}</div>
                        </div>
                        <span className="text-xs text-gray-500">{s.ville || "—"}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="font-black text-gray-900 flex items-center gap-2"><Bell size={18} className="text-purple-600" /> Dernières notifications</h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {notifs.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-gray-400 text-sm">Aucune notification</p>
                    </div>
                  ) : (
                    notifs.slice(0, 5).map((n: any) => (
                      <div key={n.id} className={`p-4 hover:bg-gray-50 transition-colors ${!n.isRead ? "bg-purple-50/30" : ""}`}>
                        <div className="font-semibold text-gray-900 text-sm">{n.title}</div>
                        <p className="text-gray-500 text-xs mt-0.5">{n.message}</p>
                        <span className="text-gray-400 text-[10px] mt-1 block">{new Date(n.createdAt).toLocaleDateString("fr-FR")}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-[Inter,sans-serif] overflow-hidden">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-purple-700 text-white transform transition-transform lg:relative lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`} role="navigation" aria-label="Menu enseignant">
        <div className="flex items-center justify-between p-5 border-b border-purple-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-black text-sm" aria-hidden="true">{initials}</div>
            <div>
              <div className="font-black text-sm truncate max-w-[140px]">{user?.name || "Enseignant"}</div>
              <div className="text-purple-200 text-xs">Enseignant</div>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-purple-200 hover:text-white" aria-label="Fermer le menu">
            <X size={20} />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === item.id ? "bg-white/20 text-white font-bold" : "text-purple-100 hover:bg-white/10"}`}
              aria-current={activeTab === item.id ? "page" : undefined}>
              {item.icon} {item.label}
              {activeTab === item.id && <ChevronRight size={16} className="ml-auto" />}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-purple-500/30">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-purple-200 hover:text-white text-sm rounded-xl hover:bg-white/10 transition-all" aria-label="Se déconnecter">
            <LogOut size={18} /> Déconnexion
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
              <h1 className="font-black text-gray-900">Espace Enseignant</h1>
              <p className="text-gray-400 text-xs">Excellence Académie • Gestion pédagogique</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveTab("notifs")} className="relative p-2 text-gray-500 hover:text-gray-700" aria-label="Voir les notifications">
              <Bell size={20} />
              {notifs.filter(n => !n.isRead).length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full" />
              )}
            </button>
            <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-white font-black text-xs" aria-hidden="true">{initials}</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-linear-to-r from-purple-700 to-purple-900 rounded-2xl p-6 text-white mb-6">
            <h2 className="font-black text-xl mb-1">Bon retour parmi nous, {user?.name?.split(" ")[0] || "Enseignant"} !</h2>
          </div>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

