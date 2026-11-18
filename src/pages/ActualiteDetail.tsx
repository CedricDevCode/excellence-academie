import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import { ArrowLeft, Calendar, Clock, Eye, ArrowRight, Loader2, Share2, CheckCircle, Newspaper } from "lucide-react";
import Container from "../components/ui/Container";
import SEOHead from "../components/SEOHead";
import { fetchPublicPostBySlug, incrementBlogView } from "../utils/api";

export default function ActualiteDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [views, setViews] = useState(0);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetchPublicPostBySlug(slug)
      .then((data: any) => {
        setPost(data);
        setViews(Number(data?.views || 0));
        // Compte 1 vue par session
        const key = `journal-view-${slug}`;
        try {
          if (sessionStorage.getItem(key)) return;
          sessionStorage.setItem(key, "1");
          incrementBlogView(slug).then((res: any) => res?.views && setViews(res.views)).catch(() => {});
        } catch {}
      })
      .catch(() => navigate("/actualites"))
      .finally(() => setLoading(false));
  }, [slug]);

  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 size={34} className="animate-spin text-primary-600" /></div>;
  }
  if (!post) return null;

  const published = new Date(post.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    description: post.excerpt || post.title,
    image: post.coverImage ? [post.coverImage] : undefined,
    datePublished: post.createdAt,
    dateModified: post.updatedAt || post.createdAt,
    author: post.author?.name ? { "@type": "Person", name: post.author.name } : undefined,
    publisher: { "@type": "Organization", name: "Excellence Académie", logo: { "@type": "ImageObject", url: "https://www.exacademie.net/favicon.jpeg" } },
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://www.exacademie.net/actualites/${post.slug}` },
  };

  const titleStyle = (() => {
    const fallback = { fontSize: "2.25rem", textAlign: "left" as const, color: "#0f172a", fontWeight: 800 };
    if (!post.titleStyle) return fallback;
    try {
      const p = JSON.parse(post.titleStyle);
      const map: Record<string, string> = { sm: "1.5rem", md: "2rem", lg: "2.25rem", xl: "3rem" };
      return {
        fontSize: map[p.size] || map.lg,
        textAlign: (["left", "center", "right"].includes(p.align) ? p.align : "left") as "left" | "center" | "right",
        color: typeof p.color === "string" ? p.color : "#0f172a",
        fontWeight: p.weight === "normal" ? 500 : 800,
      };
    } catch {
      return fallback;
    }
  })();

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead
        title={post.title}
        description={post.excerpt || post.title}
        url={`/actualites/${post.slug}`}
        image={post.coverImage || undefined}
        type="article"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Barre d'actions */}
      <div className="bg-white/95 backdrop-blur border-b border-surface-200 sticky top-0 z-10">
        <Container className="py-3 flex items-center justify-between gap-3">
          <Link to="/actualites" className="flex items-center gap-1.5 text-xs font-bold text-surface-500 hover:text-ink-900 transition-colors">
            <ArrowLeft size={14} /> Journal
          </Link>
          <button onClick={copyUrl} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-surface-600 hover:text-ink-900 bg-surface-100 hover:bg-surface-200 rounded-lg transition-colors">
            {copied ? <CheckCircle size={14} className="text-green-600" /> : <Share2 size={14} />}
            {copied ? "Lien copié" : "Partager"}
          </button>
        </Container>
      </div>

      <Container size="narrow" className="py-10">
        {/* En-tête article */}
        <div className="flex items-center gap-3 flex-wrap text-[11px] text-surface-500 font-medium mb-3">
          {post.course?.title && <span className="px-2.5 py-1 rounded-full bg-primary-50 text-primary-800 font-bold border border-primary-100">{post.course.title}</span>}
          <span className="flex items-center gap-1"><Calendar size={12} />{published}</span>
          <span className="flex items-center gap-1 num"><Eye size={12} />{views.toLocaleString("fr-FR")} vue{views > 1 ? "s" : ""}</span>
        </div>

        <h1 className="tracking-tight break-words" style={{ ...titleStyle, fontFamily: '"Bricolage Grotesque", "Inter", sans-serif', lineHeight: 1.1 }}>
          {post.title}
        </h1>
        {post.excerpt && <p className="text-lg text-surface-600 leading-relaxed mt-4">{post.excerpt}</p>}

        {post.coverImage && (
          <figure className="mt-6 rounded-2xl overflow-hidden border border-surface-200 shadow-md">
            <img src={post.coverImage} alt={post.title} className="w-full max-h-[460px] object-cover" />
          </figure>
        )}

        <article
          className="prose prose-slate prose-lg max-w-none mt-8
            prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tight
            prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-3
            prose-strong:text-ink-900
            prose-a:text-primary-700 prose-a:font-semibold
            prose-blockquote:border-l-4 prose-blockquote:border-gold-500 prose-blockquote:bg-gold-100/40 prose-blockquote:px-5 prose-blockquote:py-3 prose-blockquote:rounded-r-xl prose-blockquote:italic"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content || "") }}
        />

        {/* Auteur */}
        {post.author?.name && (
          <div className="mt-10 p-5 bg-ink-900 text-gold-100 rounded-2xl flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gold-500 text-ink-950 flex items-center justify-center font-display font-extrabold text-xl shrink-0">
              {post.author.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gold-400 font-bold">Par</p>
              <p className="font-display font-bold text-lg">{post.author.name}</p>
              <p className="text-xs text-gold-100/70">Excellence Académie</p>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 p-6 rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 to-amber-50/50 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <p className="font-display font-bold text-ink-900">Prépare ton concours avec nous</p>
            <p className="text-xs text-surface-500 mt-1">Formation mensuelle, corrigés et suivi personnalisé.</p>
          </div>
          <Link to="/catalogue" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-bold text-sm hover:bg-primary-700 transition-colors whitespace-nowrap">
            Voir les formations <ArrowRight size={14} />
          </Link>
        </div>
      </Container>
    </div>
  );
}
