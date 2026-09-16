import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, User, Tag, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchBlogPosts, fetchCourses } from "../utils/api";
import { Skeleton, Card, Badge, Button, Container, SectionTitle } from "../components/ui";

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function BlogList() {
  const [data, setData] = useState<any>({ posts: [], total: 0, page: 1, totalPages: 1 });
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [courseFilter, setCourseFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  useEffect(() => { fetchCourses().then(setCourses).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true);
    fetchBlogPosts({ page, limit: 12, courseId: courseFilter || undefined, tag: tagFilter || undefined })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, courseFilter, tagFilter]);

  const allTags: string[] = Array.from(new Set(data.posts.flatMap((p: any) => p.tags?.map((t: any) => t.tag.name) || [])));

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="bg-linear-to-r from-primary-500 to-primary-600 py-12">
        <Container>
          <h1 className="text-3xl font-black text-white mb-2">Blog Excellence Académie</h1>
          <p className="text-primary-200">Actualités, cours et ressources pédagogiques</p>
        </Container>
      </div>

      <Container className="py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-64 shrink-0 space-y-6">
            <Card padding="md">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><BookOpen size={16} className="text-primary-500" /> Filtres</h3>
              <div className="space-y-3">
                <select value={courseFilter} onChange={e => { setCourseFilter(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-primary-500 focus:outline-none">
                  <option value="">Toutes les matières</option>
                  {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                {allTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {allTags.map((tag: string) => (
                      <button key={tag} onClick={() => { setTagFilter(tagFilter === tag ? "" : tag); setPage(1); }}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${tagFilter === tag ? 'bg-primary-500 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </aside>

          <main className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} padding="none">
                    <Skeleton variant="rectangular" className="h-44 rounded-t-2xl rounded-b-none" />
                    <div className="p-5 space-y-3">
                      <div className="flex gap-3">
                        <Skeleton variant="text" className="w-20" />
                        <Skeleton variant="text" className="w-24" />
                      </div>
                      <Skeleton variant="text" className="h-5 w-3/4" />
                      <Skeleton variant="text" className="h-4 w-full" />
                      <div className="flex gap-2">
                        <Skeleton variant="text" className="w-14 h-5 rounded-full" />
                        <Skeleton variant="text" className="w-18 h-5 rounded-full" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : data.posts.length === 0 ? (
              <Card className="text-center py-12">
                <BookOpen size={48} className="mx-auto text-surface-300 mb-3" />
                <p className="text-surface-400">Aucun article publié pour le moment.</p>
              </Card>
            ) : (
              <>
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                  variants={stagger}
                  initial="hidden"
                  animate="visible"
                >
                  <AnimatePresence mode="popLayout">
                    {data.posts.map((post: any) => (
                      <motion.div key={post.id} variants={cardVariant} layout>
                        <Link to={`/blog/${post.slug}`} className="block h-full">
                          <Card hover className="h-full overflow-hidden">
                            {post.coverImage ? (
                              <img src={post.coverImage} alt={post.title} className="w-full h-44 object-cover -m-4 sm:-m-5 mb-4 -mt-4 sm:-mt-5 rounded-t-2xl" />
                            ) : (
                              <div className="w-full h-44 bg-linear-to-br from-primary-500 to-primary-400 flex items-center justify-center -m-4 sm:-m-5 mb-4 -mt-4 sm:-mt-5 rounded-t-2xl">
                                <BookOpen size={40} className="text-white/50" />
                              </div>
                            )}
                            <div className="flex items-center gap-3 text-xs text-surface-400 mb-2">
                              <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(post.createdAt).toLocaleDateString("fr-FR")}</span>
                              {post.author && <span className="flex items-center gap-1"><User size={12} /> {post.author.name}</span>}
                            </div>
                            <h2 className="font-bold text-gray-900 group-hover:text-primary-500 transition-colors mb-1.5 line-clamp-2">{post.title}</h2>
                            {post.excerpt && <p className="text-surface-500 text-sm line-clamp-2 mb-3">{post.excerpt}</p>}
                            <div className="flex items-center gap-2 flex-wrap">
                              {post.tags?.map((t: any) => (
                                <Badge key={t.tag.id} variant="primary" size="sm">
                                  <Tag size={10} /> {t.tag.name}
                                </Badge>
                              ))}
                            </div>
                            <div className="mt-3 flex items-center gap-3 text-xs text-surface-400">
                              <span>{post._count?.comments || 0} commentaire(s)</span>
                              {post._count?.exercises > 0 && <span>{post._count.exercises} exercice(s)</span>}
                            </div>
                          </Card>
                        </Link>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>

                {data.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2">
                      <ChevronLeft size={18} />
                    </Button>
                    {Array.from({ length: data.totalPages }, (_, i) => i + 1).map(p => (
                      <Button
                        key={p}
                        variant={p === page ? "primary" : "outline"}
                        size="sm"
                        onClick={() => setPage(p)}
                        className="w-9 h-9 !px-0"
                      >
                        {p}
                      </Button>
                    ))}
                    <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)} className="p-2">
                      <ChevronRight size={18} />
                    </Button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </Container>
    </div>
  );
}
