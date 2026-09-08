import { useState, useEffect } from "react";
import { fetchStudentSessions, getSessionFiles, getDownloadUrl } from "../utils/api";
import { Loader2, Clock, Monitor, User, MapPin, BookOpen, Download, FileText } from "lucide-react";

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

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-[#0056B3]" /></div>;

  if (weeks.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-black text-gray-900 text-xl">Mes cours</h2>
          <p className="text-gray-500 text-sm">Consultez vos sessions de cours programmées.</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
          <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm mb-2">Aucune session programmée pour le moment.</p>
          <p className="text-gray-400 text-xs">Les sessions apparaîtront ici une fois planifiées par vos enseignants.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-black text-gray-900 text-xl">Mes cours</h2>
        <p className="text-gray-500 text-sm">Sessions programmées pour vos inscriptions.</p>
      </div>

      <div className="space-y-4">
        {weeks.map((week: any) => (
          <div key={week.weekLabel} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-linear-to-r from-[#0056B3] to-[#003375] px-6 py-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Clock size={14} /> {week.weekLabel}
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {week.sessions.map((s: any) => (
                <div key={s.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="bg-[#0056B3]/10 rounded-xl p-3 text-center shrink-0 min-w-[60px]">
                      <div className="text-[#0056B3] text-xs font-bold uppercase">
                        {new Date(s.date).toLocaleDateString("fr-FR", { weekday: "short" })}
                      </div>
                      <div className="text-[#0056B3] font-black text-lg leading-tight">
                        {new Date(s.date).getDate()}
                      </div>
                      <div className="text-[#0056B3] text-[10px] font-semibold uppercase">
                        {new Date(s.date).toLocaleDateString("fr-FR", { month: "short" })}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {s.course && (
                          <h4 className="font-bold text-gray-900 text-sm">{s.course.title}</h4>
                        )}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.type === 'ONLINE' ? 'bg-purple-50 text-purple-700' : 'bg-green-50 text-green-700'}`}>
                          {s.type === 'ONLINE' ? <Monitor size={10} /> : <User size={10} />}
                          {s.type === 'ONLINE' ? 'En ligne' : 'Présentiel'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{s.startTime} - {s.endTime} ({s.hours}h)</span>
                        {s.teacher && <span>• {s.teacher.name}</span>}
                      </div>
                      {s.location && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                          <MapPin size={10} />
                          {s.type === 'ONLINE' ? (
                            <a href={s.location} target="_blank" rel="noopener noreferrer" className="text-[#0056B3] hover:underline">
                              {s.location}
                            </a>
                          ) : s.location}
                        </div>
                      )}
                      {s.description && (
                        <p className="text-xs text-gray-400 mt-1">{s.description}</p>
                      )}
                      <button onClick={() => toggleFiles(s.id)}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-[#0056B3] hover:underline font-semibold">
                        {loadingFiles[s.id] ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Download size={12} />
                        )}
                        {filesExpanded[s.id] ? 'Masquer les fichiers' : 'Voir les fichiers'}
                      </button>
                      {filesExpanded[s.id] && sessionFilesMap[s.id]?.length > 0 && (
                        <div className="mt-2 pl-2 border-l-2 border-[#0056B3]/20 space-y-1">
                          {sessionFilesMap[s.id].map((f: any) => (
                            <a key={f.id} href={getDownloadUrl(f.id)} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-[#0056B3] hover:underline">
                              <FileText size={12} /> {f.fileName}
                            </a>
                          ))}
                        </div>
                      )}
                      {filesExpanded[s.id] && (!sessionFilesMap[s.id] || sessionFilesMap[s.id].length === 0) && !loadingFiles[s.id] && (
                        <p className="mt-1 text-xs text-gray-400">Aucun fichier disponible</p>
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
