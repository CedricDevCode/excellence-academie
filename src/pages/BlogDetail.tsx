import { useState, useEffect, useCallback } from "react";
import DOMPurify from 'dompurify';
import { useParams, Link, useNavigate } from "react-router-dom";
import { Calendar, User, Tag, ArrowLeft, MessageSquare, BookOpen, Loader2, Trash2, Send, FileUp, CheckCircle, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { fetchBlogPostBySlug, createComment, deleteComment, createExercise, deleteExercise, submitExercise, deleteBlogPost } from "../utils/api";
import { getMe } from "../utils/api";
import { Card, Badge, Button, Container } from "../components/ui";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

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
    <div className="min-h-screen bg-surface-50 flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-primary-500" />
    </div>
  );

  if (!post) return null;

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="bg-white border-b border-surface-200">
        <Container size="narrow" className="py-4">
          <div className="flex items-center gap-4">
            <Link to="/blog" className="text-surface-500 hover:text-primary-500 flex items-center gap-1 text-sm font-semibold">
              <ArrowLeft size={16} /> Retour
            </Link>
            {(canEdit || isOwner) && (
              <div className="ml-auto flex gap-2">
                <Link to={`/blog/edit/${post.id}`}
                  className="px-3 py-1.5 bg-primary-500 text-white rounded-xl text-xs font-semibold hover:bg-primary-600 transition-colors">
                  Modifier
                </Link>
                <button onClick={handleDeletePost} className="px-3 py-1.5 bg-red-500 text-white rounded-xl text-xs font-semibold hover:bg-red-600 transition-colors">
                  Supprimer
                </button>
              </div>
            )}
          </div>
        </Container>
      </div>

      <Container size="narrow" className="py-8">
        <motion.article initial="hidden" animate="visible" variants={stagger}>
          {post.coverImage && (
            <motion.div variants={fadeUp}>
              <img src={post.coverImage} alt={post.title} className="w-full h-64 md:h-80 object-cover rounded-2xl mb-8 shadow-sm" />
            </motion.div>
          )}

          <motion.div variants={fadeUp} className="flex items-center gap-4 text-sm text-surface-500 mb-4 flex-wrap">
            {post.author && <span className="flex items-center gap-1"><User size={14} /> {post.author.name}</span>}
            <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(post.createdAt).toLocaleDateString("fr-FR")}</span>
            {post.course && <span className="flex items-center gap-1"><BookOpen size={14} /> {post.course.title}</span>}
          </motion.div>

          {post.tags?.length > 0 && (
            <motion.div variants={fadeUp} className="flex flex-wrap gap-1.5 mb-4">
              {post.tags.map((t: any) => (
                <Badge key={t.tag.id} variant="primary" size="md">
                  <Tag size={11} /> {t.tag.name}
                </Badge>
              ))}
            </motion.div>
          )}

          <motion.h1 variants={fadeUp} className="text-3xl md:text-4xl font-black text-gray-900 mb-4">{post.title}</motion.h1>
          {post.excerpt && <motion.p variants={fadeUp} className="text-lg text-surface-500 mb-6">{post.excerpt}</motion.p>}

          <motion.div variants={fadeUp} className="prose prose-lg max-w-none mb-12 text-surface-700 leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }} />

          {/* ─── Exercises ─────────────────────────── */}
          {post.exercises?.length > 0 && (
            <motion.section variants={fadeUp} className="mb-12">
              <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2"><BookOpen size={20} className="text-primary-500" /> Exercices</h2>
              <div className="space-y-4">
                {post.exercises.map((ex: any) => {
                  const subForm = submitForm[ex.id] || { content: "", file: null };
                  return (
                    <Card key={ex.id} padding="md">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-gray-900">{ex.title}</h3>
                          {ex.description && <p className="text-surface-500 text-sm mt-1">{ex.description}</p>}
                        </div>
                        {canEdit && (
                          <button onClick={() => handleDeleteExercise(ex.id)} className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      {canEdit && ex.fileUrl && (
                        <a href={ex.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-500 font-semibold hover:underline flex items-center gap-1 mb-3">
                          <FileUp size={12} /> Voir le fichier
                        </a>
                      )}
                      {user?.role === 'STUDENT' && (
                        <div className="mt-3 border-t border-surface-100 pt-3 space-y-2">
                          <textarea value={subForm.content} onChange={e => setSubmitForm(prev => ({ ...prev, [ex.id]: { ...prev[ex.id], content: e.target.value, file: prev[ex.id]?.file || null } }))}
                            placeholder="Votre réponse..." rows={3}
                            className="w-full px-3 py-2 border border-surface-200 rounded-xl text-sm focus:border-primary-500 focus:outline-none resize-none transition-colors" />
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1 text-xs text-primary-500 font-semibold cursor-pointer hover:underline">
                              <FileUp size={14} /> Joindre un fichier
                              <input type="file" accept=".pdf,image/*" className="hidden"
                                onChange={e => setSubmitForm(prev => ({ ...prev, [ex.id]: { ...prev[ex.id], content: prev[ex.id]?.content || "", file: e.target.files?.[0] || null } }))} />
                            </label>
                            <Button variant="accent" size="sm" onClick={() => handleSubmitExercise(ex.id)} disabled={!subForm.content && !subForm.file} className="ml-auto">
                              <Send size={12} /> Soumettre
                            </Button>
                          </div>
                        </div>
                      )}
                      {canEdit && (
                        <Link to={`/blog/exercises/${ex.id}/submissions`}
                          className="mt-2 inline-flex items-center gap-1 text-xs text-purple-600 font-semibold hover:underline">
                          <CheckCircle size={12} /> Voir les soumissions ({ex._count?.submissions || 0})
                        </Link>
                      )}
                    </Card>
                  );
                })}
              </div>
            </motion.section>
          )}

          {/* ─── Add Exercise (teacher) ─────────────── */}
          {canEdit && (
            <motion.section variants={fadeUp} className="mb-12">
              <Card padding="md">
                <h3 className="font-bold text-gray-900 mb-3">Ajouter un exercice</h3>
                <div className="flex gap-2 mb-2">
                  <input value={exerciseForm.title} onChange={e => setExerciseForm({ ...exerciseForm, title: e.target.value })}
                    placeholder="Titre de l'exercice" className="flex-1 px-3 py-2 border border-surface-200 rounded-xl text-sm focus:border-primary-500 focus:outline-none transition-colors" />
                  <Button variant="primary" size="sm" onClick={handleAddExercise} disabled={!exerciseForm.title.trim()}>
                    Ajouter
                  </Button>
                </div>
                <textarea value={exerciseForm.description} onChange={e => setExerciseForm({ ...exerciseForm, description: e.target.value })}
                  placeholder="Description (optionnelle)" rows={2}
                  className="w-full px-3 py-2 border border-surface-200 rounded-xl text-sm focus:border-primary-500 focus:outline-none resize-none transition-colors" />
              </Card>
            </motion.section>
          )}

          {/* ─── Comments ────────────────────────────── */}
          <motion.section variants={fadeUp}>
            <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare size={20} className="text-primary-500" /> Commentaires ({post.comments?.length || 0})
            </h2>

            {user ? (
              <Card padding="md" className="mb-6">
                <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                  placeholder="Écrire un commentaire..." rows={3}
                  className="w-full px-3 py-2 border border-surface-200 rounded-xl text-sm focus:border-primary-500 focus:outline-none resize-none mb-2 transition-colors" />
                <div className="flex justify-end">
                  <Button variant="primary" size="sm" onClick={handleComment} disabled={!commentText.trim()}>
                    <Send size={14} /> Commenter
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="bg-surface-50 rounded-2xl p-4 mb-6 text-center text-sm text-surface-500">
                <Link to="/student/login" className="text-primary-500 font-semibold hover:underline">Connectez-vous</Link> pour commenter
              </div>
            )}

            <div className="space-y-4">
              {post.comments?.length === 0 ? (
                <p className="text-surface-400 text-sm text-center py-4">Aucun commentaire. Soyez le premier !</p>
              ) : (
                post.comments?.map((c: any) => (
                  <Card key={c.id} padding="md">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold">
                          {c.author?.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <span className="font-semibold text-gray-900 text-sm">{c.author?.name || "Anonyme"}</span>
                        <span className="text-surface-400 text-xs">{new Date(c.createdAt).toLocaleDateString("fr-FR")}</span>
                      </div>
                      {(user?.id === c.authorId || canEdit) && (
                        <button onClick={() => handleDeleteComment(c.id)} className="p-1 text-surface-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <p className="text-surface-600 text-sm">{c.content}</p>
                  </Card>
                ))
              )}
            </div>
          </motion.section>
        </motion.article>
      </Container>
    </div>
  );
}
