import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import {
  Loader2, Bold, Italic, Heading, List, ListOrdered, Image, Undo, Redo, Save, ArrowLeft,
  AlignLeft, AlignCenter, AlignRight, Upload, X, Check
} from "lucide-react";
import { createBlogPost, updateBlogPost, getMe, fetchCourses, uploadBlogAttachment } from "../utils/api";

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "/api";

type TitleSize = 'sm' | 'md' | 'lg' | 'xl';
interface TitleStyle {
  size: TitleSize;
  align: 'left' | 'center' | 'right';
  color: string;
  weight: 'normal' | 'black';
}
const DEFAULT_TITLE_STYLE: TitleStyle = { size: 'lg', align: 'left', color: '#1c1d1f', weight: 'black' };
const TITLE_SIZES: Record<TitleSize, string> = {
  sm: '1.5rem',
  md: '2rem',
  lg: '2.5rem',
  xl: '3.25rem',
};
const TITLE_COLORS = ['#1c1d1f', '#c97e00', '#187f44', '#b32d0f', '#70136b', '#003375', '#f5a623'];

function Toolbar({ editor }: { editor: any }) {
  if (!editor) return null;
  const addImage = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch(`${API_BASE_URL}/blog/cover`, {
          method: 'POST', credentials: 'include', body: formData,
        });
        const data = await res.json();
        if (res.ok && data.url) editor.chain().focus().setImage({ src: data.url }).run();
      } catch {}
    };
    input.click();
  };
  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-xl">
      <button onClick={() => editor.chain().focus().toggleBold().run()} title="Gras" className={`p-1.5 rounded-lg text-sm ${editor.isActive('bold') ? 'bg-[#c97e00] text-white' : 'hover:bg-gray-200'}`}><Bold size={16} /></button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} title="Italique" className={`p-1.5 rounded-lg text-sm ${editor.isActive('italic') ? 'bg-[#c97e00] text-white' : 'hover:bg-gray-200'}`}><Italic size={16} /></button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Titre H2" className={`p-1.5 rounded-lg text-sm ${editor.isActive('heading', { level: 2 }) ? 'bg-[#c97e00] text-white' : 'hover:bg-gray-200'}`}><Heading size={16} /></button>
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} title="Liste à puces" className={`p-1.5 rounded-lg text-sm ${editor.isActive('bulletList') ? 'bg-[#c97e00] text-white' : 'hover:bg-gray-200'}`}><List size={16} /></button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Liste numérotée" className={`p-1.5 rounded-lg text-sm ${editor.isActive('orderedList') ? 'bg-[#c97e00] text-white' : 'hover:bg-gray-200'}`}><ListOrdered size={16} /></button>
      <button onClick={addImage} title="Insérer une image" className="p-1.5 rounded-lg text-sm hover:bg-gray-200"><Image size={16} /></button>
      <span className="w-px bg-gray-300 mx-1" />
      <button onClick={() => editor.chain().focus().undo().run()} title="Annuler" className="p-1.5 rounded-lg text-sm hover:bg-gray-200"><Undo size={16} /></button>
      <button onClick={() => editor.chain().focus().redo().run()} title="Rétablir" className="p-1.5 rounded-lg text-sm hover:bg-gray-200"><Redo size={16} /></button>
    </div>
  );
}

export default function BlogEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [coverUploading, setCoverUploading] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [tags, setTags] = useState("");
  const [published, setPublished] = useState(true);
  const [audience, setAudience] = useState<'MEMBERS' | 'PUBLIC'>('MEMBERS');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!id);

  const [titleStyle, setTitleStyle] = useState<TitleStyle>(DEFAULT_TITLE_STYLE);

  const editor = useEditor({
    extensions: [StarterKit, ImageExtension],
    content: "",
  });

  useEffect(() => {
    getMe().then(u => {
      setUser(u);
      if (!['ADMIN', 'TEACHER', 'SECRETARY'].includes(u.role)) navigate("/");
    }).catch(() => navigate("/student/login"));
    fetchCourses().then(setCourses).catch(() => {});
  }, [navigate]);

  const loadPost = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/blog/${id}`);
      const post = await res.json();
      setTitle(post.title);
      setExcerpt(post.excerpt || "");
      setCoverImage(post.coverImage || "");
      setCourseId(post.courseId || "");
      setTags(post.tags?.map((t: any) => t.tag.name).join(", ") || "");
      setPublished(post.published);
      setAudience(post.audience === 'PUBLIC' ? 'PUBLIC' : 'MEMBERS');
      if (post.titleStyle) {
        try { setTitleStyle({ ...DEFAULT_TITLE_STYLE, ...JSON.parse(post.titleStyle) }); } catch {}
      }
      if (editor) editor.commands.setContent(post.content);
    } catch { navigate("/blog"); }
    finally { setLoading(false); }
  }, [id, navigate, editor]);

  useEffect(() => { if (id && editor) loadPost(); }, [id, editor, loadPost]);

  const handleSave = async () => {
    if (!title.trim() || !editor) return;
    setSaving(true);
    try {
      const data = {
        title: title.trim(),
        content: editor.getHTML(),
        excerpt: excerpt.trim() || undefined,
        coverImage: coverImage || undefined,
        courseId: courseId || undefined,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        published,
        titleStyle: JSON.stringify(titleStyle),
        audience,
      };
      if (id) {
        await updateBlogPost(id, data);
      } else {
        await createBlogPost(data);
      }
      navigate("/blog");
    } catch (e: any) {
      alert(e.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setCoverUploading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/blog/cover`, {
        method: "POST", credentials: "include", body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data?.message || "Erreur lors de l'upload");
      setCoverImage(data.url);
    } catch (err: any) {
      alert(err?.message || "Erreur lors de l'upload de la couverture");
    } finally {
      setCoverUploading(false);
      e.target.value = "";
    }
  };

  const titlePreviewStyle: React.CSSProperties = {
    fontSize: TITLE_SIZES[titleStyle.size],
    textAlign: titleStyle.align,
    color: titleStyle.color,
    fontWeight: titleStyle.weight === 'black' ? 800 : 500,
    lineHeight: 1.15,
    fontFamily: '"Bricolage Grotesque", "Inter", sans-serif',
    letterSpacing: '-0.02em',
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-[#c97e00]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate("/blog")} className="text-gray-500 hover:text-[#c97e00] flex items-center gap-1 text-sm font-semibold">
            <ArrowLeft size={16} /> Retour
          </button>
          <h1 className="font-black text-gray-900">{id ? "Modifier l'article" : "Nouvel article"}</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Titre & options de style */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-surface-500">Titre de l'article</label>
              {/* Barre de style du titre */}
              <div className="flex items-center gap-1 flex-wrap">
                {/* Taille */}
                {(['sm', 'md', 'lg', 'xl'] as TitleSize[]).map(s => (
                  <button key={s} type="button" onClick={() => setTitleStyle(prev => ({ ...prev, size: s }))}
                    title={`Taille ${s === 'sm' ? 'S' : s === 'md' ? 'M' : s === 'lg' ? 'L' : 'XL'}`}
                    className={`w-8 h-8 rounded-lg text-[13px] font-black transition-all ${titleStyle.size === s ? 'bg-[#c97e00] text-white shadow' : 'bg-surface-50 text-surface-600 hover:bg-surface-100'}`}>
                    {s === 'sm' ? 'S' : s === 'md' ? 'M' : s === 'lg' ? 'L' : 'XL'}
                  </button>
                ))}
                <span className="w-px h-5 bg-surface-200 mx-1" />
                {/* Alignement */}
                <button type="button" onClick={() => setTitleStyle(prev => ({ ...prev, align: 'left' }))} title="Aligner à gauche"
                  className={`p-2 rounded-lg transition-all ${titleStyle.align === 'left' ? 'bg-[#c97e00] text-white shadow' : 'text-surface-500 hover:bg-surface-100'}`}><AlignLeft size={15} /></button>
                <button type="button" onClick={() => setTitleStyle(prev => ({ ...prev, align: 'center' }))} title="Centrer"
                  className={`p-2 rounded-lg transition-all ${titleStyle.align === 'center' ? 'bg-[#c97e00] text-white shadow' : 'text-surface-500 hover:bg-surface-100'}`}><AlignCenter size={15} /></button>
                <button type="button" onClick={() => setTitleStyle(prev => ({ ...prev, align: 'right' }))} title="Aligner à droite"
                  className={`p-2 rounded-lg transition-all ${titleStyle.align === 'right' ? 'bg-[#c97e00] text-white shadow' : 'text-surface-500 hover:bg-surface-100'}`}><AlignRight size={15} /></button>
                <span className="w-px h-5 bg-surface-200 mx-1" />
                {/* Couleurs */}
                {TITLE_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setTitleStyle(prev => ({ ...prev, color: c }))} title={c}
                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${titleStyle.color === c ? 'border-surface-900 scale-110' : 'border-transparent'}`}
                    style={{ background: c }} />
                ))}
                <input type="color" value={titleStyle.color} onChange={e => setTitleStyle(prev => ({ ...prev, color: e.target.value }))} title="Couleur personnalisée"
                  className="w-6 h-6 rounded-full border border-surface-200 cursor-pointer bg-transparent p-0" />
                <span className="w-px h-5 bg-surface-200 mx-1" />
                {/* Graisse */}
                <button type="button" onClick={() => setTitleStyle(prev => ({ ...prev, weight: prev.weight === 'black' ? 'normal' : 'black' }))}
                  title="Épaisseurs du titre"
                  className={`h-7 px-2.5 rounded-lg text-[11px] font-black transition-all ${titleStyle.weight === 'black' ? 'bg-[#c97e00] text-white shadow' : 'bg-surface-50 text-surface-600 hover:bg-surface-100'}`}>
                  Aa
                </button>
              </div>
            </div>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Titre de l'article..."
              className="w-full text-2xl font-black text-gray-900 px-0 py-2 border-0 border-b-2 border-gray-200 focus:border-[#c97e00] focus:outline-none focus:ring-0 placeholder-gray-300" />
          </div>

          {/* Aperçu live du titre */}
          <div className="rounded-xl border border-dashed border-surface-300 bg-surface-50/50 px-5 py-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-surface-400 mb-1.5">Aperçu</p>
            <p style={titlePreviewStyle} className="break-words">{title.trim() || "Votre titre apparaîtra ici"}</p>
          </div>

          <input value={excerpt} onChange={e => setExcerpt(e.target.value)}
            placeholder="Résumé (optionnel)..."
            className="w-full text-sm text-gray-600 px-0 py-2 border-0 border-b border-gray-100 focus:border-[#c97e00] focus:outline-none focus:ring-0 placeholder-gray-300" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Image de couverture</label>
              {coverImage ? (
                <div className="relative group rounded-2xl overflow-hidden border border-surface-200">
                  <img src={coverImage} alt="Couverture" className="w-full h-48 object-cover" />
                  <div className="absolute inset-0 bg-black/45 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <label className="flex items-center gap-1.5 bg-white text-surface-800 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer hover:bg-surface-100 transition-colors">
                      {coverUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      Changer
                      <input type="file" accept="image/*" className="hidden" onChange={handleUploadCover} />
                    </label>
                    <button type="button" onClick={() => setCoverImage("")} className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-red-700 transition-colors">
                      <X size={14} /> Retirer
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-surface-300 rounded-2xl py-8 cursor-pointer hover:border-primary-500 hover:bg-gold-100/30 transition-all bg-surface-50/40">
                  {coverUploading ? (
                    <Loader2 size={26} className="animate-spin text-primary-600" />
                  ) : (
                    <Upload size={26} className="text-surface-400" />
                  )}
                  <span className="text-xs font-bold text-surface-600">{coverUploading ? "Envoi en cours…" : "Importer une image de couverture"}</span>
                  <span className="text-[10px] text-surface-400">JPG, PNG, WebP — stockée en base de données</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleUploadCover} disabled={coverUploading} />
                </label>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Visibilité</label>
              <select value={audience} onChange={e => setAudience(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#c97e00] focus:outline-none">
                <option value="MEMBERS">Membres uniquement</option>
                <option value="PUBLIC">Public — visible sur /actualites (SEO)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Matière</label>
              <select value={courseId} onChange={e => setCourseId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#c97e00] focus:outline-none">
                <option value="">Aucune</option>
                {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Tags (séparés par des virgules)</label>
              <input value={tags} onChange={e => setTags(e.target.value)}
                placeholder="maths, physique, examen..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#c97e00] focus:outline-none" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#c97e00]" />
                <span className="font-semibold text-gray-700">Publier immédiatement <span className="text-[10px] text-surface-400">(les abonnés aux alertes seront notifiés)</span></span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
          {editor && <Toolbar editor={editor} />}
          <div className="p-6 min-h-[400px]">
            <EditorContent editor={editor} className="prose prose-lg max-w-none focus:outline-none min-h-[300px]" />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={() => navigate("/blog")} className="px-6 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving || !title.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#c97e00] text-white rounded font-bold text-sm hover:bg-[#6b4500] disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Enregistrement..." : id ? "Mettre à jour" : "Publier"}
          </button>
        </div>
      </div>
    </div>
  );
}
