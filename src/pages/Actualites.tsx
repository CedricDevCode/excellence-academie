import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Newspaper, ArrowRight, Calendar, Clock, Eye, Loader2, ChevronLeft, ChevronRight, BookOpen, Sparkles,
} from "lucide-react";
import Container from "../components/ui/Container";
import SEOHead from "../components/SEOHead";
import { fetchPublicPosts } from "../utils/api";

export default function Actualites() {
  const [data, setData] = useState<any>({ posts: [], page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetchPublicPosts({ page, limit: 9 })
      .then(setData)
      .catch(() => setData({ posts: [], page: 1, totalPages: 1, total: 0 }))
      .finally(() => setLoading(false));
  }, [page]);

  const posts = data.posts || [];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-800">
      <SEOHead
        title="Actualités & Journal"
        description="Suivez au quotidien l'actualité d'Excellence Académie : annonces officielles de concours, conseils méthodologiques et réussites de nos élèves."
        url="/actualites"
      />

      {/* Hero */}
      <header className="bg-gradient-to-br from-primary-950 via-primary-900 to-slate-900 text-white">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-accent-300 text-[11px] font-bold uppercase tracking-wider mb-4">
              <Sparkles size={13} /> Journal quotidien
            </span>
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight leading-[1.02] mb-4">
              Le Journal<span className="text-accent-400">.</span>
            </h1>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl">
              Annonces officielles de concours, préparation, méthodologie et réussites — publiés par l'équipe pédagogique d'Excellence Académie.
            </p>
          </div>
        </Container>
      </header>

      <Container className="py-10 sm:py-14">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-primary-600" /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-surface-200">
            <BookOpen size={40} className="mx-auto text-surface-300 mb-3" />
            <h2 className="font-display font-bold text-xl text-ink-900">Le journal ouvrira bientôt</h2>
            <p className="text-sm text-surface-500 mt-2 max-w-md mx-auto">La rédaction prépare les premières publications. Revenez très vite — ou inscrivez-vous à la formation pour recevoir nos exercices chaque semaine.</p>
            <Link to="/catalogue" className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-bold text-sm hover:bg-primary-700 transition-colors">
              Voir nos formations <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((p: any) => (
                <Link
                  key={p.id}
                  to={`/actualites/${p.slug}`}
                  className="group bg-white rounded-2xl border border-surface-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
                >
                  {p.coverImage ? (
                    <div className="relative h-44 overflow-hidden bg-surface-100">
                      <img src={p.coverImage} alt={p.title} loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      {p.course?.title && (
                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold">{p.course.title}</span>
                      )}
                    </div>
                  ) : (
                    <div className="h-36 bg-gradient-to-br from-primary-800 to-slate-800 flex items-center justify-center">
                      <Newspaper size={40} className="text-gold-400/60" />
                    </div>
                  )}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center gap-3 text-[11px] text-surface-500 font-medium mb-2">
                      <span className="flex items-center gap-1"><Calendar size={12} />{new Date(p.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span className="flex items-center gap-1 num"><Eye size={12} />{Number(p.views || 0).toLocaleString('fr-FR')}</span>
                    </div>
                    <h3 className="font-display font-bold text-ink-900 leading-snug line-clamp-2 group-hover:text-primary-800 transition-colors">{p.title}</h3>
                    {p.excerpt && <p className="text-surface-500 text-xs leading-relaxed line-clamp-3 mt-2 flex-1">{p.excerpt}</p>}
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary-700 mt-3">Lire la publication <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" /></span>
                  </div>
                </Link>
              ))}
            </div>

            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="p-2 rounded-xl border border-surface-300 disabled:opacity-40 hover:bg-surface-50 transition-colors" aria-label="Page précédente"><ChevronLeft size={18} /></button>
                {Array.from({ length: data.totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-xl text-sm font-bold transition-colors ${p === page ? 'bg-primary-600 text-white' : 'border border-surface-300 text-surface-600 hover:bg-surface-50'}`}>{p}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}
                  className="p-2 rounded-xl border border-surface-300 disabled:opacity-40 hover:bg-surface-50 transition-colors" aria-label="Page suivante"><ChevronRight size={18} /></button>
              </div>
            )}
          </>
        )}
      </Container>
    </div>
  );
}
