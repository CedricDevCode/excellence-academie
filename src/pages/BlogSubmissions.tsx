import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, CheckCircle, FileText, Download, User, Save, AlertCircle } from "lucide-react";
import { fetchSubmissions, evaluateSubmission, getMe } from "../utils/api";

export default function BlogSubmissions() {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [evaluating, setEvaluating] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getMe().then(u => {
      if (!['ADMIN', 'TEACHER', 'SECRETARY'].includes(u.role)) navigate("/");
      setUser(u);
    }).catch(() => navigate("/student/login"));
  }, [navigate]);

  useEffect(() => {
    if (!exerciseId) return;
    setLoading(true);
    fetchSubmissions(exerciseId)
      .then(data => {
        setSubmissions(data);
        data.forEach((s: any) => {
          if (s.grade != null) setGrades(prev => ({ ...prev, [s.id]: String(s.grade) }));
          if (s.feedback) setFeedbacks(prev => ({ ...prev, [s.id]: s.feedback }));
        });
      })
      .catch(() => navigate("/blog"))
      .finally(() => setLoading(false));
  }, [exerciseId, navigate]);

  const handleEvaluate = async (submissionId: string) => {
    setEvaluating(prev => ({ ...prev, [submissionId]: true }));
    try {
      const updated = await evaluateSubmission(submissionId, {
        grade: grades[submissionId] ? Number(grades[submissionId]) : undefined,
        feedback: feedbacks[submissionId] || undefined,
      });
      setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, ...updated } : s));
    } catch (e: any) { alert(e.message); }
    finally { setEvaluating(prev => ({ ...prev, [submissionId]: false })); }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-[#0056B3]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate("/blog")} className="text-gray-500 hover:text-[#0056B3] flex items-center gap-1 text-sm font-semibold">
            <ArrowLeft size={16} /> Retour au blog
          </button>
          <h1 className="font-black text-gray-900">Soumissions des étudiants</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {submissions.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <FileText size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">Aucune soumission pour cet exercice.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {submissions.map((s: any) => (
              <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0056B3] flex items-center justify-center text-white font-bold text-sm">
                      {s.student?.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{s.student?.name || "Inconnu"}</div>
                      <div className="text-gray-400 text-xs">{s.student?.email}</div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(s.createdAt).toLocaleDateString("fr-FR")}</span>
                </div>

                {s.content && (
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{s.content}</p>
                  </div>
                )}

                {s.fileUrl && (
                  <a href={s.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#0056B3] font-semibold hover:underline mb-4">
                    <Download size={14} /> Télécharger le fichier joint
                  </a>
                )}

                {s.grade != null && (
                  <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-xl">
                    <CheckCircle size={14} className="text-green-600" />
                    <span className="text-sm font-bold text-green-700">Note : {s.grade}/20</span>
                    {s.feedback && <span className="text-sm text-gray-600 ml-2">— {s.feedback}</span>}
                  </div>
                )}

                <div className="border-t border-gray-100 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Note /20</label>
                      <input type="number" min="0" max="20" step="0.5"
                        value={grades[s.id] ?? ""}
                        onChange={e => setGrades(prev => ({ ...prev, [s.id]: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none" />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Feedback</label>
                      <input value={feedbacks[s.id] ?? ""}
                        onChange={e => setFeedbacks(prev => ({ ...prev, [s.id]: e.target.value }))}
                        placeholder="Commentaire..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none" />
                    </div>
                    <div className="flex items-end">
                      <button onClick={() => handleEvaluate(s.id)} disabled={evaluating[s.id]}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#FF6B00] text-white rounded-xl text-sm font-semibold hover:bg-[#e05e00] disabled:opacity-50">
                        {evaluating[s.id] ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Évaluer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
