import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  User,
  Tag,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Search,
  Clock,
  MessageSquare,
  Sparkles,
  ArrowRight,
  FileText,
  TrendingUp,
  Mail,
  CheckCircle,
  PlusCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchBlogPosts, fetchCourses, getMe } from "../utils/api";
import { Card, Badge, Button, Container } from "../components/ui";
import { DEFAULT_BLOG_POSTS, BlogPostItem } from "../constants/defaultBlogPosts";

const TOPIC_CATEGORIES = [
  "Tous",
  "Magistrature",
  "ENA",
  "Greffe",
  "Méthodologie",
  "Culture Générale",
];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function BlogList() {
  const [apiData, setApiData] = useState<any>({ posts: [], total: 0, page: 1, totalPages: 1 });
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [courseFilter, setCourseFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [user, setUser] = useState<any>(null);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);

  useEffect(() => {
    fetchCourses().then(setCourses).catch(() => {});
    getMe().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchBlogPosts({
      page,
      limit: 12,
      courseId: courseFilter || undefined,
      tag: tagFilter || undefined,
    })
      .then((res) => {
        setApiData(res);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, courseFilter, tagFilter]);

  // Merge with curated defaults if API returns 0 posts
  const allPosts: BlogPostItem[] = useMemo(() => {
    if (apiData.posts && apiData.posts.length > 0) {
      return apiData.posts.map((p: any) => ({
        ...p,
        category: p.course?.title || (p.tags?.[0]?.tag?.name) || "Concours",
        readingTime: p.readingTime || "5 min de lecture",
        publishedAt: p.createdAt || new Date().toISOString(),
      }));
    }
    return DEFAULT_BLOG_POSTS;
  }, [apiData.posts]);

  // Client-side filtering for fast, responsive magazine feel
  const filteredPosts = useMemo(() => {
    return allPosts.filter((post) => {
      // Category filter
      if (selectedCategory !== "Tous") {
        const cat = (post.category || "").toLowerCase();
        const tNames = (post.tags || []).map((t: any) => (t.tag?.name || "").toLowerCase()).join(" ");
        const title = post.title.toLowerCase();
        const sel = selectedCategory.toLowerCase();
        if (!cat.includes(sel) && !tNames.includes(sel) && !title.includes(sel)) {
          return false;
        }
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = post.title.toLowerCase().includes(q);
        const matchExcerpt = (post.excerpt || "").toLowerCase().includes(q);
        const matchAuthor = (post.author?.name || "").toLowerCase().includes(q);
        const matchTags = (post.tags || []).some((t: any) => (t.tag?.name || "").toLowerCase().includes(q));
        if (!matchTitle && !matchExcerpt && !matchAuthor && !matchTags) return false;
      }

      return true;
    });
  }, [allPosts, selectedCategory, searchQuery]);

  const featuredPost = filteredPosts.length > 0 ? filteredPosts[0] : null;
  const standardPosts = filteredPosts.length > 1 ? filteredPosts.slice(1) : (filteredPosts.length === 1 && searchQuery ? filteredPosts : []);

  const canCreate = user && ["ADMIN", "TEACHER", "SECRETARY"].includes(user.role);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterSuccess(true);
    setNewsletterEmail("");
    setTimeout(() => setNewsletterSuccess(false), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-800">
      {/* ─── Hero Header ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-950 via-primary-900 to-slate-900 text-white pt-16 pb-20 sm:pb-24">
        {/* Subtle decorative mesh background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#f97316_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary-600/30 rounded-full blur-3xl pointer-events-none" />

        <Container className="relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-accent-300 text-xs font-bold uppercase tracking-wider mb-5">
              <Sparkles size={14} className="text-accent-400" />
              Magazine & Ressources Pédagogiques
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4 leading-tight">
              Le Blog de l'<span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-400 to-amber-300">Excellence</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 mb-8 leading-relaxed max-w-2xl mx-auto">
              Analyses de jurys, fiches de méthodologie, conseils de majors et annales pour propulser votre réussite aux concours administratifs et judiciaires.
            </p>

            {/* Search Bar */}
            <div className="relative max-w-xl mx-auto">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un sujet, une matière, un concours..."
                className="w-full pl-12 pr-4 py-3.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400 focus:bg-white/15 transition-all shadow-xl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-300 hover:text-white bg-white/20 px-2 py-0.5 rounded-md"
                >
                  Effacer
                </button>
              )}
            </div>

            {/* Admin/Teacher action */}
            {canCreate && (
              <div className="mt-6 flex justify-center">
                <Link to="/blog/new">
                  <Button variant="accent" size="sm" icon={<PlusCircle size={16} />}>
                    Rédiger un nouvel article
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Topic Pills */}
          <div className="mt-10 flex items-center justify-center gap-2 flex-wrap max-w-2xl mx-auto">
            {TOPIC_CATEGORIES.map((topic) => {
              const isActive = selectedCategory === topic;
              return (
                <button
                  key={topic}
                  onClick={() => {
                    setSelectedCategory(topic);
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    isActive
                      ? "bg-accent-500 text-white shadow-lg shadow-accent-500/30 scale-105"
                      : "bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white"
                  }`}
                >
                  {topic}
                </button>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ─── Main Content Container ─── */}
      <Container className="py-12 sm:py-16">
        {/* ─── Featured Article (Hero Story) ─── */}
        {featuredPost && !searchQuery && selectedCategory === "Tous" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-14"
          >
            <div className="flex items-center gap-2 mb-4 text-xs font-extrabold uppercase tracking-wider text-accent-600">
              <TrendingUp size={16} />
              <span>À la Une du Magazine</span>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 group">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                {/* Cover Image */}
                <div className="lg:col-span-7 relative h-72 sm:h-96 lg:h-auto overflow-hidden">
                  <img
                    src={featuredPost.coverImage || "/images/image2.jpeg"}
                    alt={featuredPost.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/images/image2.jpeg";
                    }}
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3.5 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-xs font-bold shadow-md">
                      {featuredPost.category}
                    </span>
                  </div>
                </div>

                {/* Article Info */}
                <div className="lg:col-span-5 p-6 sm:p-10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-slate-400" />
                        {new Date(featuredPost.publishedAt || featuredPost.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock size={13} className="text-slate-400" />
                        {featuredPost.readingTime || "5 min de lecture"}
                      </span>
                    </div>

                    <Link to={`/blog/${featuredPost.slug}`}>
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 group-hover:text-primary-600 transition-colors leading-snug mb-4">
                        {featuredPost.title}
                      </h2>
                    </Link>

                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6 line-clamp-3">
                      {featuredPost.excerpt}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-6">
                      {featuredPost.tags?.map((t: any, idx: number) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg"
                        >
                          #{t.tag?.name || t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {featuredPost.author?.avatar ? (
                        <img
                          src={featuredPost.author.avatar}
                          alt={featuredPost.author.name}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-accent-500/20"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-sm">
                          {featuredPost.author?.name?.charAt(0) || "E"}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">
                          {featuredPost.author?.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {featuredPost.author?.role || "Excellence Académie"}
                        </div>
                      </div>
                    </div>

                    <Link to={`/blog/${featuredPost.slug}`}>
                      <Button variant="accent" size="sm" iconRight={<ArrowRight size={15} />}>
                        Lire l'article
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── Layout with Main Grid + Sidebar ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Feed (8 cols on desktop) */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <BookOpen size={20} className="text-primary-600" />
                {searchQuery
                  ? `Résultats pour « ${searchQuery} » (${filteredPosts.length})`
                  : selectedCategory !== "Tous"
                  ? `Articles : ${selectedCategory} (${filteredPosts.length})`
                  : "Dernières Publications"}
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                {filteredPosts.length} article(s) trouvé(s)
              </span>
            </div>

            {filteredPosts.length === 0 ? (
              <Card className="text-center py-16 px-6 bg-white rounded-3xl border border-slate-200">
                <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
                <h4 className="text-lg font-bold text-slate-800 mb-2">Aucun article trouvé</h4>
                <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
                  Aucun article ne correspond à vos filtres actuels. Réinitialisez la recherche pour voir tous les contenus pédagogiques.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("Tous");
                  }}
                >
                  Réinitialiser les filtres
                </Button>
              </Card>
            ) : (
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <AnimatePresence mode="popLayout">
                  {(searchQuery || selectedCategory !== "Tous" ? filteredPosts : standardPosts).map((post) => (
                    <motion.div key={post.id} variants={cardVariant} layout>
                      <Link to={`/blog/${post.slug}`} className="block h-full group">
                        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                          {/* Image */}
                          <div className="relative h-48 overflow-hidden bg-slate-100">
                            <img
                              src={post.coverImage || "/images/image2.jpeg"}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/images/image2.jpeg";
                              }}
                            />
                            <div className="absolute top-3 left-3">
                              <span className="px-2.5 py-1 rounded-md bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-bold shadow">
                                {post.category}
                              </span>
                            </div>
                          </div>

                          {/* Body */}
                          <div className="p-5 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-semibold mb-2">
                                <span>
                                  {new Date(post.publishedAt || post.createdAt).toLocaleDateString("fr-FR", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                                <span>•</span>
                                <span>{post.readingTime || "5 min"}</span>
                              </div>

                              <h3 className="font-extrabold text-slate-900 group-hover:text-primary-600 transition-colors text-base line-clamp-2 mb-2 leading-snug">
                                {post.title}
                              </h3>

                              <p className="text-slate-500 text-xs sm:text-sm line-clamp-2 mb-4 leading-relaxed">
                                {post.excerpt}
                              </p>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {post.author?.avatar ? (
                                  <img
                                    src={post.author.avatar}
                                    alt={post.author.name}
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-[10px] font-bold">
                                    {post.author?.name?.charAt(0) || "E"}
                                  </div>
                                )}
                                <span className="text-xs font-semibold text-slate-700 truncate max-w-[120px]">
                                  {post.author?.name}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                                <span className="flex items-center gap-1">
                                  <MessageSquare size={13} />
                                  {post._count?.comments || post.comments?.length || 0}
                                </span>
                                {(post._count?.exercises || 0) > 0 && (
                                  <span className="flex items-center gap-1 text-accent-600 font-bold">
                                    <FileText size={13} />
                                    {post._count?.exercises} ex.
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Pagination if API has multiple pages */}
            {apiData.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-2"
                >
                  <ChevronLeft size={18} />
                </Button>
                {Array.from({ length: apiData.totalPages }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    variant={p === page ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setPage(p)}
                    className="w-9 h-9 p-0 font-bold"
                  >
                    {p}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= apiData.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-2"
                >
                  <ChevronRight size={18} />
                </Button>
              </div>
            )}
          </div>

          {/* ─── Sidebar (4 cols on desktop) ─── */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Promo / Preparation CTA Card */}
            <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-accent-400 mb-4 font-black">
                <Sparkles size={24} />
              </div>
              <h4 className="text-lg font-black mb-2">Préparez votre concours avec des majors</h4>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-5">
                Rejoignez nos promotions en présentiel ou en ligne avec des jurys certifiés, entraînements chronométrés et corrections individuelles.
              </p>
              <Link to="/catalogue" className="block">
                <Button variant="accent" size="md" className="w-full justify-center" iconRight={<ArrowRight size={16} />}>
                  Explorer le catalogue
                </Button>
              </Link>
            </div>

            {/* Popular Articles Widget */}
            <Card padding="md" className="rounded-2xl border border-slate-200">
              <h4 className="font-extrabold text-slate-900 text-sm mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-accent-500" />
                Articles les plus consultés
              </h4>
              <div className="space-y-3.5">
                {DEFAULT_BLOG_POSTS.slice(0, 3).map((p, idx) => (
                  <Link
                    key={p.id}
                    to={`/blog/${p.slug}`}
                    className="flex items-start gap-3 group py-1.5 border-b border-slate-100 last:border-none"
                  >
                    <span className="font-black text-slate-300 group-hover:text-accent-500 transition-colors text-lg leading-none shrink-0 w-4">
                      0{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-slate-800 group-hover:text-primary-600 transition-colors line-clamp-2 leading-snug mb-1">
                        {p.title}
                      </h5>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {p.readingTime}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>

            {/* Newsletter Subscription */}
            <Card padding="md" className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-orange-50/30">
              <div className="flex items-center gap-2 mb-2 text-accent-600 font-bold text-xs uppercase tracking-wider">
                <Mail size={15} />
                <span>Alertes Concours</span>
              </div>
              <h4 className="font-extrabold text-slate-900 text-sm mb-1.5">
                Restez informé des ouvertures de concours
              </h4>
              <p className="text-slate-500 text-xs leading-relaxed mb-4">
                Recevez directement par email les dates officielles des arrêtés d'ouverture et nos conseils méthodologiques.
              </p>

              {newsletterSuccess ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs font-bold flex items-center gap-2">
                  <CheckCircle size={16} /> Inscription validée avec succès !
                </div>
              ) : (
                <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Votre adresse email..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                  <Button type="submit" variant="accent" size="sm" className="w-full justify-center text-xs">
                    S'abonner aux alertes
                  </Button>
                </form>
              )}
            </Card>
          </aside>
        </div>
      </Container>
    </div>
  );
}
