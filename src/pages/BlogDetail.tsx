import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Calendar, User, Tag, ArrowLeft, MessageSquare, BookOpen, Loader2, Trash2, Send, FileUp, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { fetchBlogPostBySlug, createComment, deleteComment, createExercise, deleteExercise, submitExercise, deleteBlogPost } from "../utils/api";
import { getMe } from "../utils/api";

export default function BlogDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [exerciseForm, setExerciseForm] = useState({ title: "", description: "" });
  const [submitForm, setSubmitForm] = useState<Record<string, { content: string; file: File | null }>>({});
  const [authChecked, setAuthChecked] = useState(false);

  const loadPost = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const data = await fetchBlogPostBySlug(slug);
      setPost(data);
    } catch { navigate("/blog"); }
    finally { setLoading(false); }
  }, [slug, navigate]);

  useEffect(() => { loadPost(); }, [loadPost]);

  useEffect(() => {
    getMe().then(setUser).catch(() => {}).finally(() => setAuthChecked(true));
  }, []);

  const handleComment = async () => {
    if (!commentText.trim() || !post) return;
    try {
      const c = await createComment(post.id, commentText);
      setPost({ ...post, comments: [c, ...(post.comments || [])] });
      setCommentText("");
    } catch {}
  };

  const handleDeleteComment = async (id: string) => {
    try {
      await deleteComment(id);
      setPost({ ...post, comments: post.comments.filter((c: any) => c.id !== id) });
    } catch {}
  };

  const handleAddExercise = async () => {
    if (!exerciseForm.title.trim() || !post) return;
    try {
      const ex = await createExercise(post.id, exerciseForm);
      setPost({ ...post, exercises: [...(post.exercises || []), ex] });
      setExerciseForm({ title: "", description: "" });
    } catch {}
  };

  const handleDeleteExercise = async (id: string) => {
    try {
      await deleteExercise(id);
      setPost({ ...post, exercises: post.exercises.filter((e: any) => e.id !== id) });
    } catch {}
  };

  const handleSubmitExercise = async (exerciseId: string) => {
    const form = submitForm[exerciseId];
    if (!form?.content?.trim() && !form?.file) return;
    try {
      await submitExercise(exerciseId, { content: form.content, file: form.file || undefined });
      setSubmitForm(prev => ({ ...prev, [exerciseId]: { content: "", file: null } }));
      loadPost();
    } catch (e: any) { alert(e.message); }
  };

  const canEdit = user && ['ADMIN', 'TEACHER', 'SECRETARY'].includes(user.role);
  const isOwner = user && post?.authorId === user.id;

  const handleDeletePost = async () => {
    if (!post || !confirm("Supprimer cet article ?")) return;
    try { await deleteBlogPost(post.id); navigate("/blog"); }
    catch {}
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-[#0056B3]" />
    </div>
  );

  if (!post) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/blog" className="text-gray-500 hover:text-[#0056B3] flex items-center gap-1 text-sm font-semibold">
            <ArrowLeft size={16} /> Retour
          </Link>
          {(canEdit || isOwner) && (
            <div className="ml-auto flex gap-2">
              <Link to={`/blog/edit/${post.id}`}
                className="px-3 py-1.5 bg-[#0056B3] text-white rounded-xl text-xs font-semibold hover:bg-[#003375]">
                Modifier
              </Link>
              <button onClick={handleDeletePost} className="px-3 py-1.5 bg-red-500 text-white rounded-xl text-xs font-semibold hover:bg-red-600">
                Supprimer
              </button>
            </div>
          )}
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 py-8">
        {post.coverImage && (
          <img src={post.coverImage} alt={post.title} className="w-full h-64 md:h-80 object-cover rounded-2xl mb-8 shadow-sm" />
        )}

        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4 flex-wrap">
          {post.author && <span className="flex items-center gap-1"><User size={14} /> {post.author.name}</span>}
          <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(post.createdAt).toLocaleDateString("fr-FR")}</span>
          {post.course && <span className="flex items-center gap-1"><BookOpen size={14} /> {post.course.title}</span>}
        </div>

        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {post.tags.map((t: any) => (
              <span key={t.tag.id} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-[#0056B3] px-2.5 py-1 rounded-full font-semibold">
                <Tag size={11} /> {t.tag.name}
              </span>
            ))}
          </div>
        )}

        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">{post.title}</h1>
        {post.excerpt && <p className="text-lg text-gray-500 mb-6">{post.excerpt}</p>}

        <div className="prose prose-lg max-w-none mb-12 text-gray-700 leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: post.content }} />

        {/* ─── Exercises ─────────────────────────── */}
        {post.exercises?.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2"><BookOpen size={20} className="text-[#0056B3]" /> Exercices</h2>
            <div className="space-y-4">
              {post.exercises.map((ex: any) => {
                const subForm = submitForm[ex.id] || { content: "", file: null };
                return (
                  <div key={ex.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-gray-900">{ex.title}</h3>
                        {ex.description && <p className="text-gray-500 text-sm mt-1">{ex.description}</p>}
                      </div>
                      {canEdit && (
                        <button onClick={() => handleDeleteExercise(ex.id)} className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    {canEdit && ex.fileUrl && (
                      <a href={ex.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#0056B3] font-semibold hover:underline flex items-center gap-1 mb-3">
                        <FileUp size={12} /> Voir le fichier
                      </a>
                    )}
                    {user?.role === 'STUDENT' && (
                      <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
                        <textarea value={subForm.content} onChange={e => setSubmitForm(prev => ({ ...prev, [ex.id]: { ...prev[ex.id], content: e.target.value, file: prev[ex.id]?.file || null } }))}
                          placeholder="Votre réponse..." rows={3}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none resize-none" />
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 text-xs text-[#0056B3] font-semibold cursor-pointer hover:underline">
                            <FileUp size={14} /> Joindre un fichier
                            <input type="file" accept=".pdf,image/*" className="hidden"
                              onChange={e => setSubmitForm(prev => ({ ...prev, [ex.id]: { ...prev[ex.id], content: prev[ex.id]?.content || "", file: e.target.files?.[0] || null } }))} />
                          </label>
                          <button onClick={() => handleSubmitExercise(ex.id)} disabled={!subForm.content && !subForm.file}
                            className="ml-auto px-4 py-1.5 bg-[#FF6B00] text-white rounded-xl text-xs font-semibold hover:bg-[#e05e00] disabled:opacity-50">
                            <Send size={12} className="inline mr-1" /> Soumettre
                          </button>
                        </div>
                      </div>
                    )}
                    {canEdit && (
                      <Link to={`/blog/exercises/${ex.id}/submissions`}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-purple-600 font-semibold hover:underline">
                        <CheckCircle size={12} /> Voir les soumissions ({ex._count?.submissions || 0})
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── Add Exercise (teacher) ─────────────── */}
        {canEdit && (
          <section className="mb-12 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3">Ajouter un exercice</h3>
            <div className="flex gap-2 mb-2">
              <input value={exerciseForm.title} onChange={e => setExerciseForm({ ...exerciseForm, title: e.target.value })}
                placeholder="Titre de l'exercice" className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none" />
              <button onClick={handleAddExercise} disabled={!exerciseForm.title.trim()}
                className="px-4 py-2 bg-[#0056B3] text-white rounded-xl text-sm font-semibold hover:bg-[#003375] disabled:opacity-50">
                Ajouter
              </button>
            </div>
            <textarea value={exerciseForm.description} onChange={e => setExerciseForm({ ...exerciseForm, description: e.target.value })}
              placeholder="Description (optionnelle)" rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none resize-none" />
          </section>
        )}

        {/* ─── Comments ────────────────────────────── */}
        <section>
          <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare size={20} className="text-[#0056B3]" /> Commentaires ({post.comments?.length || 0})
          </h2>

          {user ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 shadow-sm">
              <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                placeholder="Écrire un commentaire..." rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none resize-none mb-2" />
              <div className="flex justify-end">
                <button onClick={handleComment} disabled={!commentText.trim()}
                  className="flex items-center gap-1 px-4 py-2 bg-[#0056B3] text-white rounded-xl text-sm font-semibold hover:bg-[#003375] disabled:opacity-50">
                  <Send size={14} /> Commenter
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-center text-sm text-gray-500">
              <Link to="/student/login" className="text-[#0056B3] font-semibold hover:underline">Connectez-vous</Link> pour commenter
            </div>
          )}

          <div className="space-y-4">
            {post.comments?.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Aucun commentaire. Soyez le premier !</p>
            ) : (
              post.comments?.map((c: any) => (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#0056B3] flex items-center justify-center text-white text-xs font-bold">
                        {c.author?.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <span className="font-semibold text-gray-900 text-sm">{c.author?.name || "Anonyme"}</span>
                      <span className="text-gray-400 text-xs">{new Date(c.createdAt).toLocaleDateString("fr-FR")}</span>
                    </div>
                    {(user?.id === c.authorId || canEdit) && (
                      <button onClick={() => handleDeleteComment(c.id)} className="p-1 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm">{c.content}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </article>
    </div>
  );
}
