import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, User, Tag, ChevronLeft, ChevronRight, Loader2, BookOpen } from "lucide-react";
import { fetchBlogPosts, fetchCourses } from "../utils/api";

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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-linear-to-r from-[#0056B3] to-[#003375] py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-3xl font-black text-white mb-2">Blog Excellence Académie</h1>
          <p className="text-blue-200">Actualités, cours et ressources pédagogiques</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-64 shrink-0 space-y-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><BookOpen size={16} /> Filtres</h3>
              <div className="space-y-3">
                <select value={courseFilter} onChange={e => { setCourseFilter(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none">
                  <option value="">Toutes les matières</option>
                  {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                {allTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {allTags.map((tag: string) => (
                      <button key={tag} onClick={() => { setTagFilter(tagFilter === tag ? "" : tag); setPage(1); }}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${tagFilter === tag ? 'bg-[#0056B3] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>

          <main className="flex-1">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-[#0056B3]" /></div>
            ) : data.posts.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                <BookOpen size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400">Aucun article publié pour le moment.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {data.posts.map((post: any) => (
                    <Link key={post.id} to={`/blog/${post.slug}`}
                      className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                      {post.coverImage ? (
                        <img src={post.coverImage} alt={post.title} className="w-full h-44 object-cover" />
                      ) : (
                        <div className="w-full h-44 bg-linear-to-br from-[#0056B3] to-blue-400 flex items-center justify-center">
                          <BookOpen size={40} className="text-white/50" />
                        </div>
                      )}
                      <div className="p-5">
                        <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                          <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(post.createdAt).toLocaleDateString("fr-FR")}</span>
                          {post.author && <span className="flex items-center gap-1"><User size={12} /> {post.author.name}</span>}
                        </div>
                        <h2 className="font-bold text-gray-900 group-hover:text-[#0056B3] transition-colors mb-1.5 line-clamp-2">{post.title}</h2>
                        {post.excerpt && <p className="text-gray-500 text-sm line-clamp-2 mb-3">{post.excerpt}</p>}
                        <div className="flex items-center gap-2 flex-wrap">
                          {post.tags?.map((t: any) => (
                            <span key={t.tag.id} className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-[#0056B3] px-2 py-0.5 rounded-full font-semibold">
                              <Tag size={10} /> {t.tag.name}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                          <span>{post._count?.comments || 0} commentaire(s)</span>
                          {post._count?.exercises > 0 && <span>{post._count.exercises} exercice(s)</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {data.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                      className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
                      <ChevronLeft size={18} />
                    </button>
                    {Array.from({ length: data.totalPages }, (_, i) => i + 1).map(p => (
                      <button key={p} onClick={() => setPage(p)}
                        className={`w-9 h-9 rounded-xl text-sm font-semibold ${p === page ? 'bg-[#0056B3] text-white' : 'border border-gray-200 hover:bg-gray-50'}`}>
                        {p}
                      </button>
                    ))}
                    <button disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}
                      className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
