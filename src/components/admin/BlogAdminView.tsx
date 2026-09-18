import { useState, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import {
  BookOpen, Plus, Edit, Trash2, Loader2, X, Eye, Upload,
  Bold, Italic, Heading, List, ListOrdered, Image as ImageIconLucide, Undo, Redo,
} from "lucide-react";
import {
  fetchBlogPosts, deleteBlogPost, createBlogPost, updateBlogPost,
  fetchCourses, uploadBlogAttachment,
} from "../../utils/api";
import { useToast } from "../Toast";

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

function BlogToolbar({ editor }: { editor: any }) {
  if (!editor) return null;
  const addImage = () => {
    const url = prompt("URL de l'image :");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };
  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-xl">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded-lg text-sm ${editor.isActive('bold') ? 'bg-[#c97e00] text-white' : 'hover:bg-gray-200'}`}><Bold size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded-lg text-sm ${editor.isActive('italic') ? 'bg-[#c97e00] text-white' : 'hover:bg-gray-200'}`}><Italic size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-1.5 rounded-lg text-sm ${editor.isActive('heading', { level: 2 }) ? 'bg-[#c97e00] text-white' : 'hover:bg-gray-200'}`}><Heading size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded-lg text-sm ${editor.isActive('bulletList') ? 'bg-[#c97e00] text-white' : 'hover:bg-gray-200'}`}><List size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-1.5 rounded-lg text-sm ${editor.isActive('orderedList') ? 'bg-[#c97e00] text-white' : 'hover:bg-gray-200'}`}><ListOrdered size={16} /></button>
      <button type="button" onClick={addImage} className="p-1.5 rounded-lg text-sm hover:bg-gray-200"><ImageIconLucide size={16} /></button>
      <span className="w-px bg-gray-300 mx-1" />
      <button type="button" onClick={() => editor.chain().focus().undo().run()} className="p-1.5 rounded-lg text-sm hover:bg-gray-200"><Undo size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().redo().run()} className="p-1.5 rounded-lg text-sm hover:bg-gray-200"><Redo size={16} /></button>
    </div>
  );
}

export default function BlogAdminView() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formExcerpt, setFormExcerpt] = useState('');
  const [formCoverImage, setFormCoverImage] = useState('');
  const [formCourseId, setFormCourseId] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formPublished, setFormPublished] = useState(true);

  const { toast, confirm } = useToast();
  const fileCoverRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [StarterKit, ImageExtension],
    content: '',
  });

  const loadPosts = () => {
    fetchBlogPosts({ limit: 100 })
      .then(d => setPosts(d.posts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPosts(); }, []);
  useEffect(() => { fetchCourses().then(setCourses).catch(() => {}); }, []);

  const openCreate = () => {
    setEditingId(null);
    setFormTitle('');
    setFormExcerpt('');
    setFormCoverImage('');
    setFormCourseId('');
    setFormTags('');
    setFormPublished(true);
    if (editor) editor.commands.setContent('');
    setShowForm(true);
  };

  const openEdit = async (post: any) => {
    setEditingId(post.id);
    setFormTitle(post.title);
    setFormExcerpt(post.excerpt || '');
    setFormCoverImage(post.coverImage || '');
    setFormCourseId(post.courseId || '');
    setFormTags(post.tags?.map((t: any) => t.tag.name).join(', ') || '');
    setFormPublished(post.published);
    setShowForm(true);

    try {
      const res = await fetch(`${API_BASE_URL}/blog/${post.slug}`);
      const fullPost = await res.json();
      if (editor) editor.commands.setContent(fullPost.content || '');
    } catch {
      if (editor) editor.commands.setContent('');
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE_URL}/blog/placeholder/attachments`, {
        method: 'POST', credentials: 'include', body: formData,
      });
      const data = await res.json();
      setFormCoverImage(data.url);
      toast('success', 'Image de couverture téléchargée');
    } catch {
      toast('error', 'Erreur lors du téléchargement');
    } finally {
      setUploadingCover(false);
      if (fileCoverRef.current) fileCoverRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !editor) {
      toast('error', 'Le titre est requis');
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        title: formTitle.trim(),
        content: editor.getHTML(),
        excerpt: formExcerpt.trim() || undefined,
        coverImage: formCoverImage || undefined,
        courseId: formCourseId || undefined,
        tags: formTags.split(',').map(t => t.trim()).filter(Boolean),
        published: formPublished,
      };

      if (editingId) {
        await updateBlogPost(editingId, data);
        toast('success', 'Article mis à jour');
      } else {
        await createBlogPost(data);
        toast('success', 'Article créé');
      }

      setShowForm(false);
      setEditingId(null);
      loadPosts();
    } catch (err: any) {
      toast('error', err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm('Supprimer cet article définitivement ?');
    if (!ok) return;
    try {
      await deleteBlogPost(id);
      toast('success', 'Article supprimé');
      setPosts(prev => prev.filter(p => p.id !== id));
    } catch {
      toast('error', 'Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Blog — Articles</h2>
          <p className="text-sm text-gray-500 mt-1">Gestion complète des articles du blog.</p>
        </div>
        {!showForm && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-[#c97e00] text-white font-bold rounded-lg hover:bg-[#6b4500] transition-colors">
            <Plus size={18} />
            Nouvel article
          </button>
        )}
      </div>

      {/* Inline Form */}
      {showForm && (
        <div className="bg-white rounded shadow-xl border-2 border-primary-200 overflow-hidden">
          <div className="bg-gradient-to-r from-primary-50 to-amber-50/50 p-5 border-b border-primary-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BookOpen size={20} className="text-[#c97e00]" />
              <h3 className="font-black text-[#7a4b00] text-base">
                {editingId ? "Modifier l'article" : "Nouvel article"}
              </h3>
            </div>
            <button
              onClick={cancelForm}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Titre de l'article *</label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="Ex: Concours de Magistrature 2024 : Guide complet"
                className="w-full px-4 py-2.5 border border-gray-200 rounded text-sm focus:border-[#c97e00] focus:ring-1 focus:ring-[#c97e00] outline-none"
              />
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Résumé (optionnel)</label>
              <input
                type="text"
                value={formExcerpt}
                onChange={e => setFormExcerpt(e.target.value)}
                placeholder="Courte description de l'article..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded text-sm focus:border-[#c97e00] focus:ring-1 focus:ring-[#c97e00] outline-none"
              />
            </div>

            {/* Meta row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Image de couverture</label>
                {formCoverImage && (
                  <img src={formCoverImage} alt="Couverture" className="w-full h-32 object-cover rounded mb-2" />
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formCoverImage}
                    onChange={e => setFormCoverImage(e.target.value)}
                    placeholder="URL de l'image..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded text-sm focus:border-[#c97e00] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => fileCoverRef.current?.click()}
                    className="px-3 py-2 bg-surface-50 rounded text-xs font-semibold cursor-pointer hover:bg-gray-200 flex items-center gap-1"
                  >
                    {uploadingCover ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    Upload
                  </button>
                  <input ref={fileCoverRef} type="file" accept="image/*" className="hidden" onChange={handleUploadCover} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Matière / Formation</label>
                <select
                  value={formCourseId}
                  onChange={e => setFormCourseId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-[#c97e00] outline-none"
                >
                  <option value="">Aucune</option>
                  {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Tags (séparés par des virgules)</label>
                <input
                  type="text"
                  value={formTags}
                  onChange={e => setFormTags(e.target.value)}
                  placeholder="maths, physique, examen..."
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:border-[#c97e00] outline-none"
                />
              </div>
            </div>

            {/* Published toggle */}
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formPublished}
                onChange={e => setFormPublished(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300"
              />
              <span className="text-sm font-bold text-gray-700">{formPublished ? 'Publié' : 'Brouillon'}</span>
            </label>

            {/* Rich Text Editor */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Contenu de l'article *</label>
              <div className="border border-gray-200 rounded overflow-hidden">
                {editor && <BlogToolbar editor={editor} />}
                <div className="p-4 min-h-[300px]">
                  <EditorContent editor={editor} className="prose prose-lg max-w-none focus:outline-none min-h-[250px]" />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={cancelForm}
                className="px-4 py-2.5 rounded border border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting || !formTitle.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#c97e00] hover:bg-[#6b4500] text-white text-sm font-bold rounded transition-all shadow-sm shadow-primary-700/25 disabled:opacity-50"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                <span>{editingId ? 'Enregistrer les modifications' : 'Publier l\'article'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Posts List */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-[#c97e00]" /></div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded p-8 text-center shadow-sm border border-gray-100">
          <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">Aucun article. Créez le premier !</p>
        </div>
      ) : (
        <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {["Titre", "Auteur", "Matière", "Statut", "Commentaires", "Date", "Actions"].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-gray-500 text-xs font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {posts.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-gray-900 text-sm max-w-[250px] truncate">{p.title}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{p.author?.name || "—"}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{p.course?.title || "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.published ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                        {p.published ? 'Publié' : 'Brouillon'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">{p._count?.comments || 0}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{new Date(p.createdAt).toLocaleDateString("fr-FR")}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-600 transition-colors" title="Modifier">
                          <Edit size={14} />
                        </button>
                        <a href={`/blog/${p.slug}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-accent-50 text-accent-700 transition-colors" title="Voir">
                          <Eye size={14} />
                        </a>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors" title="Supprimer">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-gray-100 text-sm text-gray-500">
            Total : {posts.length} article(s)
          </div>
        </div>
      )}
    </div>
  );
}
