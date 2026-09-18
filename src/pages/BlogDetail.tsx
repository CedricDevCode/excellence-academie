import { useState, useEffect, useCallback } from "react";
import DOMPurify from "dompurify";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  User,
  Tag,
  ArrowLeft,
  Clock,
  MessageSquare,
  BookOpen,
  Loader2,
  Trash2,
  Send,
  FileUp,
  Share2,
  Copy,
  CheckCircle,
  Sparkles,
  Award,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  fetchBlogPostBySlug,
  createComment,
  deleteComment,
  createExercise,
  deleteExercise,
  submitExercise,
  deleteBlogPost,
  getMe,
} from "../utils/api";
import { Card, Badge, Button, Container } from "../components/ui";
import { DEFAULT_BLOG_POSTS, BlogPostItem } from "../constants/defaultBlogPosts";

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
  const [copied, setCopied] = useState(false);

  const loadPost = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const data = await fetchBlogPostBySlug(slug);
      setPost(data);
    } catch {
      // Fallback to rich default post if not in database
      const fallback = DEFAULT_BLOG_POSTS.find((p) => p.slug === slug || p.id === slug);
      if (fallback) {
        setPost(fallback);
      } else {
        navigate("/blog");
      }
    } finally {
      setLoading(false);
    }
  }, [slug, navigate]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  useEffect(() => {
    getMe().then(setUser).catch(() => {});
  }, []);

  const handleComment = async () => {
    if (!commentText.trim() || !post) return;
    try {
      if (post.id && !post.id.startsWith("default-post")) {
        const c = await createComment(post.id, commentText);
        setPost({ ...post, comments: [c, ...(post.comments || [])] });
      } else {
        // Mock local comment for fallback post
        const mockComment = {
          id: `comment-${Date.now()}`,
          author: { name: user?.name || "Lecteur Invité" },
          content: commentText,
          createdAt: new Date().toISOString(),
        };
        setPost({ ...post, comments: [mockComment, ...(post.comments || [])] });
      }
      setCommentText("");
    } catch {}
  };

  const handleDeleteComment = async (id: string) => {
    try {
      if (!id.startsWith("comment-")) {
        await deleteComment(id);
      }
      setPost({ ...post, comments: post.comments.filter((c: any) => c.id !== id) });
    } catch {}
  };

  const handleAddExercise = async () => {
    if (!exerciseForm.title.trim() || !post) return;
    try {
      if (post.id && !post.id.startsWith("default-post")) {
        const ex = await createExercise(post.id, exerciseForm);
        setPost({ ...post, exercises: [...(post.exercises || []), ex] });
      } else {
        const mockEx = {
          id: `ex-${Date.now()}`,
          title: exerciseForm.title,
          description: exerciseForm.description,
        };
        setPost({ ...post, exercises: [...(post.exercises || []), mockEx] });
      }
      setExerciseForm({ title: "", description: "" });
    } catch {}
  };

  const handleDeleteExercise = async (id: string) => {
    try {
      if (!id.startsWith("ex-")) {
        await deleteExercise(id);
      }
      setPost({ ...post, exercises: post.exercises.filter((e: any) => e.id !== id) });
    } catch {}
  };

  const handleSubmitExercise = async (exerciseId: string) => {
    const form = submitForm[exerciseId];
    if (!form?.content?.trim() && !form?.file) return;
    try {
      if (!exerciseId.startsWith("ex-") && !post.id.startsWith("default-post")) {
        await submitExercise(exerciseId, { content: form.content, file: form.file || undefined });
      }
      alert("Votre travail a été transmis avec succès pour correction !");
      setSubmitForm((prev) => ({ ...prev, [exerciseId]: { content: "", file: null } }));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const copyPageUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const canEdit = user && ["ADMIN", "TEACHER", "SECRETARY"].includes(user.role);
  const isOwner = user && post?.authorId === user.id;

  const handleDeletePost = async () => {
    if (!post || !confirm("Supprimer cet article ?")) return;
    try {
      if (!post.id.startsWith("default-post")) {
        await deleteBlogPost(post.id);
      }
      navigate("/blog");
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={36} className="animate-spin text-accent-500" />
      </div>
    );
  }

  if (!post) return null;

  const readingTime = post.readingTime || "5 min de lecture";
  const categoryName = post.category || post.course?.title || post.tags?.[0]?.tag?.name || "Concours";

  // Related posts
  const relatedPosts = DEFAULT_BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-800">
      {/* ─── Breadcrumbs & Action Bar ─── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 backdrop-blur-md bg-white/90">
        <Container className="py-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 overflow-hidden">
              <Link to="/blog" className="hover:text-primary-600 flex items-center gap-1 shrink-0">
                <ArrowLeft size={14} /> Blog
              </Link>
              <ChevronRight size={12} className="text-slate-300 shrink-0" />
              <span className="text-accent-600 truncate max-w-[120px] sm:max-w-none">{categoryName}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={copyPageUrl}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                title="Copier le lien de l'article"
              >
                {copied ? <CheckCircle size={14} className="text-green-600" /> : <Copy size={14} />}
                <span>{copied ? "Lien copié !" : "Partager"}</span>
              </button>

              {(canEdit || isOwner) && (
                <div className="flex items-center gap-1.5">
                  <Link
                    to={`/blog/edit/${post.id}`}
                    className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-bold hover:bg-primary-700 transition-colors"
                  >
                    Modifier
                  </Link>
                  <button
                    onClick={handleDeletePost}
                    className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
              )}
            </div>
          </div>
        </Container>
      </div>

      {/* ─── Article Header ─── */}
      <header className="bg-gradient-to-b from-white to-slate-50 py-10 sm:py-14 border-b border-slate-200/60">
        <Container size="narrow">
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-3 py-1 bg-accent-50 text-accent-700 font-extrabold text-xs rounded-full border border-accent-200/60">
                {categoryName}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                <Clock size={13} /> {readingTime}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                <Calendar size={13} />{" "}
                {new Date(post.publishedAt || post.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="text-base sm:text-xl text-slate-600 leading-relaxed font-normal">
                {post.excerpt}
              </p>
            )}

            {/* Author card */}
            <div className="pt-4 flex items-center gap-3">
              {post.author?.avatar ? (
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-accent-500/20"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-base">
                  {post.author?.name?.charAt(0) || "E"}
                </div>
              )}
              <div>
                <div className="font-extrabold text-slate-900 text-sm sm:text-base">
                  {post.author?.name || "Équipe Pédagogique"}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {post.author?.role || "Excellence Académie Côte d'Ivoire"}
                </div>
              </div>
            </div>
          </div>
        </Container>
      </header>

      {/* ─── Article Body ─── */}
      <Container size="narrow" className="py-10">
        <article className="space-y-8">
          {/* Cover Image */}
          {post.coverImage && (
            <div className="rounded-3xl overflow-hidden shadow-xl border border-slate-200">
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-full max-h-[480px] object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/images/image2.jpeg";
                }}
              />
            </div>
          )}

          {/* Tags */}
          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {post.tags.map((t: any, i: number) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-200 transition-colors"
                >
                  #{t.tag?.name || t}
                </span>
              ))}
            </div>
          )}

          {/* Content */}
          <div
            className="prose prose-slate prose-lg sm:prose-xl max-w-none text-slate-700 leading-relaxed font-normal
              prose-headings:font-black prose-headings:text-slate-900 prose-headings:tracking-tight
              prose-h2:text-2xl prose-h2:sm:text-3xl prose-h2:mt-10 prose-h2:mb-4
              prose-blockquote:border-l-4 prose-blockquote:border-accent-500 prose-blockquote:bg-orange-50/40 prose-blockquote:p-4 prose-blockquote:rounded-r-xl prose-blockquote:italic
              prose-strong:text-slate-900 prose-strong:font-bold
              prose-ul:list-disc prose-ul:pl-6 prose-li:my-1"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
          />

          {/* Author Bio Box */}
          <div className="mt-12 p-6 sm:p-8 bg-gradient-to-br from-slate-900 to-primary-950 text-white rounded-3xl shadow-xl flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {post.author?.avatar ? (
              <img
                src={post.author.avatar}
                alt={post.author.name}
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-accent-400"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-accent-500 text-white flex items-center justify-center font-black text-2xl">
                {post.author?.name?.charAt(0) || "E"}
              </div>
            )}
            <div className="text-center sm:text-left flex-1">
              <span className="text-accent-400 text-xs font-bold uppercase tracking-wider">
                À propos de l'auteur
              </span>
              <h4 className="text-lg font-black text-white mt-1">
                {post.author?.name || "Excellence Académie"}
              </h4>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 leading-relaxed">
                {post.author?.role || "Corps professoral d'Excellence Académie"}. Accompagne chaque année les candidats aux concours d'entrée à l'ENA, la Magistrature et aux fonctions judiciaires.
              </p>
            </div>
            <Link to="/catalogue" className="shrink-0 mt-2 sm:mt-0">
              <Button variant="accent" size="sm">
                Voir les formations
              </Button>
            </Link>
          </div>

          {/* ─── Interactive Exercises Section ─── */}
          <section className="mt-14 pt-8 border-t border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BookOpen size={22} className="text-accent-500" />
                <h3 className="text-xl font-black text-slate-900">
                  Exercices d'entraînement ({post.exercises?.length || 0})
                </h3>
              </div>
            </div>

            {post.exercises && post.exercises.length > 0 ? (
              <div className="space-y-5">
                {post.exercises.map((ex: any) => {
                  const subForm = submitForm[ex.id] || { content: "", file: null };
                  return (
                    <Card key={ex.id} padding="md" className="border border-slate-200 rounded-2xl bg-white shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-base">{ex.title}</h4>
                          {ex.description && (
                            <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                              {ex.description}
                            </p>
                          )}
                        </div>
                        {canEdit && (
                          <button
                            onClick={() => handleDeleteExercise(ex.id)}
                            className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      {ex.fileUrl && (
                        <a
                          href={ex.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary-600 font-bold hover:underline flex items-center gap-1 mb-3"
                        >
                          <FileUp size={13} /> Télécharger le sujet officiel
                        </a>
                      )}

                      {/* Student submission form */}
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                        <textarea
                          value={subForm.content}
                          onChange={(e) =>
                            setSubmitForm((prev) => ({
                              ...prev,
                              [ex.id]: { ...prev[ex.id], content: e.target.value, file: prev[ex.id]?.file || null },
                            }))
                          }
                          placeholder="Rédigez votre réponse ou plan détaillé ici..."
                          rows={3}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none transition-colors"
                        />
                        <div className="flex items-center justify-between gap-3">
                          <label className="flex items-center gap-1.5 text-xs text-slate-600 font-bold cursor-pointer hover:text-primary-600 transition-colors">
                            <FileUp size={15} />
                            <span>{subForm.file ? subForm.file.name : "Joindre un devoir (PDF/Image)"}</span>
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              className="hidden"
                              onChange={(e) =>
                                setSubmitForm((prev) => ({
                                  ...prev,
                                  [ex.id]: {
                                    ...prev[ex.id],
                                    content: prev[ex.id]?.content || "",
                                    file: e.target.files?.[0] || null,
                                  },
                                }))
                              }
                            />
                          </label>

                          <Button
                            variant="accent"
                            size="sm"
                            onClick={() => handleSubmitExercise(ex.id)}
                            disabled={!subForm.content && !subForm.file}
                            iconRight={<Send size={13} />}
                          >
                            Soumettre mon travail
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-400 text-sm italic">
                Aucun exercice attaché à cette publication pour l'instant.
              </p>
            )}

            {/* Teacher add exercise box */}
            {canEdit && (
              <div className="mt-6 p-5 bg-slate-100 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Sparkles size={15} className="text-accent-500" /> Ajouter un exercice pour cet article
                </h4>
                <input
                  type="text"
                  placeholder="Titre de l'exercice..."
                  value={exerciseForm.title}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, title: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
                <textarea
                  placeholder="Consignes détaillées..."
                  rows={2}
                  value={exerciseForm.description}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none"
                />
                <div className="flex justify-end">
                  <Button variant="primary" size="sm" onClick={handleAddExercise} disabled={!exerciseForm.title.trim()}>
                    Enregistrer l'exercice
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* ─── Comments Section ─── */}
          <section className="mt-14 pt-8 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-6">
              <MessageSquare size={22} className="text-primary-600" />
              <h3 className="text-xl font-black text-slate-900">
                Commentaires & Questions ({post.comments?.length || 0})
              </h3>
            </div>

            {/* Comment Form */}
            <div className="mb-8 flex gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0">
                {user?.name?.charAt(0) || "M"}
              </div>
              <div className="flex-1 space-y-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Posez une question ou partagez votre avis..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none"
                />
                <div className="flex justify-end">
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={handleComment}
                    disabled={!commentText.trim()}
                    iconRight={<Send size={13} />}
                  >
                    Publier
                  </Button>
                </div>
              </div>
            </div>

            {/* Comments List */}
            {post.comments && post.comments.length > 0 ? (
              <div className="space-y-4">
                {post.comments.map((c: any) => (
                  <div
                    key={c.id}
                    className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-start gap-4"
                  >
                    <div className="w-10 h-10 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {c.author?.name?.charAt(0) || "U"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <span className="font-extrabold text-slate-900 text-sm">
                            {c.author?.name}
                          </span>
                          {c.author?.role && (
                            <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-semibold">
                              {c.author.role}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">
                            {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                          </span>
                          {(canEdit || (user && c.authorId === user.id)) && (
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              className="text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-700 text-sm leading-relaxed">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm italic">
                Soyez le premier à commenter cette publication !
              </p>
            )}
          </section>

          {/* ─── Related Articles ─── */}
          {relatedPosts.length > 0 && (
            <section className="mt-16 pt-10 border-t border-slate-200">
              <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <Sparkles size={18} className="text-accent-500" />
                Poursuivez votre lecture
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {relatedPosts.map((rel) => (
                  <Link
                    key={rel.id}
                    to={`/blog/${rel.slug}`}
                    className="p-5 bg-white border border-slate-200 rounded-2xl hover:shadow-lg hover:border-slate-300 transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[11px] font-bold text-accent-600 uppercase tracking-wider mb-2 block">
                        {rel.category}
                      </span>
                      <h4 className="font-extrabold text-slate-900 group-hover:text-primary-600 transition-colors text-base mb-2 line-clamp-2">
                        {rel.title}
                      </h4>
                      <p className="text-slate-500 text-xs line-clamp-2">{rel.excerpt}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                      <span>{rel.readingTime}</span>
                      <span className="text-accent-600 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Lire <ArrowRight size={13} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>
      </Container>
    </div>
  );
}
