import { useState, useEffect } from "react";
import { fetchStudentSessions, getSessionFiles, getDownloadUrl } from "../utils/api";
import { Loader2, Clock, Monitor, User, MapPin, BookOpen, Download, FileText, CalendarDays } from "lucide-react";

export default function StudentSessionsView() {
  const [weeks, setWeeks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filesExpanded, setFilesExpanded] = useState<Record<string, boolean>>({});
  const [sessionFilesMap, setSessionFilesMap] = useState<Record<string, any[]>>({});
  const [loadingFiles, setLoadingFiles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchStudentSessions()
      .then((data) => setWeeks(data.weeks || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleFiles = async (sessionId: string) => {
    if (filesExpanded[sessionId]) {
      setFilesExpanded(prev => ({ ...prev, [sessionId]: false }));
      return;
    }
    setLoadingFiles(prev => ({ ...prev, [sessionId]: true }));
    try {
      const files = await getSessionFiles(sessionId);
      setSessionFilesMap(prev => ({ ...prev, [sessionId]: files }));
      setFilesExpanded(prev => ({ ...prev, [sessionId]: true }));
    } catch {}
    setLoadingFiles(prev => ({ ...prev, [sessionId]: false }));
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-48 bg-surface-100 rounded animate-pulse" />
        <div className="h-24 bg-surface-50 border border-surface-100 rounded animate-pulse" />
        <div className="h-24 bg-surface-50 border border-surface-100 rounded animate-pulse" />
      </div>
    );
  }

  if (weeks.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-black text-surface-900 text-xl">Mes cours</h2>
          <p className="text-surface-500 text-sm mt-0.5">Consultez vos sessions de cours programmées.</p>
        </div>
        <div className="bg-surface-50 border border-surface-100 rounded p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-surface-100 text-surface-400 flex items-center justify-center mx-auto mb-4">
            <CalendarDays size={26} />
          </div>
          <p className="text-surface-700 text-sm font-semibold">Aucune session programmée pour le moment</p>
          <p className="text-surface-500 text-xs mt-1">Les sessions apparaîtront ici une fois planifiées par vos enseignants.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-black text-surface-900 text-xl">Mes cours</h2>
        <p className="text-surface-500 text-sm mt-0.5">Sessions programmées pour vos inscriptions.</p>
      </div>

      <div className="space-y-5">
        {weeks.map((week: any) => (
          <div key={week.weekLabel} className="bg-white border border-surface-100 rounded overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-2.5 bg-surface-50 border-b border-surface-100">
              <Clock size={14} className="text-primary-600" />
              <h3 className="font-bold text-surface-900 text-sm">{week.weekLabel}</h3>
            </div>
            <div className="divide-y divide-surface-100">
              {week.sessions.map((s: any) => (
                <div key={s.id} className="p-5 hover:bg-surface-50/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-12 shrink-0 text-center py-1 bg-surface-100 rounded">
                      <div className="text-[10px] font-bold text-surface-500 uppercase">
                        {new Date(s.date).toLocaleDateString("fr-FR", { weekday: "short" })}
                      </div>
                      <div className="text-primary-700 font-black text-lg leading-tight">
                        {new Date(s.date).getDate()}
                      </div>
                      <div className="text-[10px] font-semibold text-surface-500 uppercase">
                        {new Date(s.date).toLocaleDateString("fr-FR", { month: "short" })}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {s.course && (
                          <h4 className="font-bold text-surface-900 text-sm">{s.course.title}</h4>
                        )}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${s.type === 'ONLINE' ? 'bg-accent-50 text-accent-700' : 'bg-green-50 text-green-700'}`}>
                          {s.type === 'ONLINE' ? <Monitor size={10} /> : <User size={10} />}
                          {s.type === 'ONLINE' ? 'En ligne' : 'Présentiel'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-surface-500">
                        <span>{s.startTime} - {s.endTime}</span>
                        {s.teacher?.name && <span>• {s.teacher.name}</span>}
                        {s.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={10} className="text-surface-400" />
                            {s.type === 'ONLINE' ? (
                              <a href={s.location} target="_blank" rel="noopener noreferrer" className="text-primary-700 hover:underline font-semibold">
                                Accéder à la visio
                              </a>
                            ) : s.location}
                          </span>
                        )}
                      </div>
                      {s.description && <p className="text-xs text-surface-500 mt-1">{s.description}</p>}
                      <button onClick={() => toggleFiles(s.id)}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary-700 hover:underline font-semibold">
                        {loadingFiles[s.id] ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                        {filesExpanded[s.id] ? 'Masquer les fichiers' : 'Voir les fichiers'}
                      </button>
                      {filesExpanded[s.id] && sessionFilesMap[s.id]?.length > 0 && (
                        <div className="mt-2 pl-3 border-l-2 border-primary-200 space-y-1">
                          {sessionFilesMap[s.id].map((f: any) => (
                            <a key={f.id} href={getDownloadUrl(f.id)} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-primary-700 hover:underline">
                              <FileText size={12} /> {f.fileName}
                            </a>
                          ))}
                        </div>
                      )}
                      {filesExpanded[s.id] && (!sessionFilesMap[s.id] || sessionFilesMap[s.id].length === 0) && !loadingFiles[s.id] && (
                        <p className="mt-1 text-xs text-surface-400">Aucun fichier disponible</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}