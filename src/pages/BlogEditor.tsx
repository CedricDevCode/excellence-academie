import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import { Loader2, Bold, Italic, Heading, List, ListOrdered, Image, Undo, Redo, Save,ArrowLeft } from "lucide-react";
import { createBlogPost, updateBlogPost, getMe, fetchCourses, uploadBlogAttachment } from "../utils/api";

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "/api";

function Toolbar({ editor }: { editor: any }) {
  if (!editor) return null;
  const addImage = () => {
    const url = prompt("URL de l'image :");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };
  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-xl">
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded-lg text-sm ${editor.isActive('bold') ? 'bg-[#0056B3] text-white' : 'hover:bg-gray-200'}`}><Bold size={16} /></button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded-lg text-sm ${editor.isActive('italic') ? 'bg-[#0056B3] text-white' : 'hover:bg-gray-200'}`}><Italic size={16} /></button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-1.5 rounded-lg text-sm ${editor.isActive('heading', { level: 2 }) ? 'bg-[#0056B3] text-white' : 'hover:bg-gray-200'}`}><Heading size={16} /></button>
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded-lg text-sm ${editor.isActive('bulletList') ? 'bg-[#0056B3] text-white' : 'hover:bg-gray-200'}`}><List size={16} /></button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-1.5 rounded-lg text-sm ${editor.isActive('orderedList') ? 'bg-[#0056B3] text-white' : 'hover:bg-gray-200'}`}><ListOrdered size={16} /></button>
      <button onClick={addImage} className="p-1.5 rounded-lg text-sm hover:bg-gray-200"><Image size={16} /></button>
      <span className="w-px bg-gray-300 mx-1" />
      <button onClick={() => editor.chain().focus().undo().run()} className="p-1.5 rounded-lg text-sm hover:bg-gray-200"><Undo size={16} /></button>
      <button onClick={() => editor.chain().focus().redo().run()} className="p-1.5 rounded-lg text-sm hover:bg-gray-200"><Redo size={16} /></button>
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
  const [courseId, setCourseId] = useState("");
  const [tags, setTags] = useState("");
  const [published, setPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!id);

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
    try {
      const res = await fetch(`${API_BASE_URL}/blog/placeholder/attachments`, {
        method: "POST", credentials: "include", body: formData,
      });
      const data = await res.json();
      setCoverImage(data.url);
    } catch {}
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-[#0056B3]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate("/blog")} className="text-gray-500 hover:text-[#0056B3] flex items-center gap-1 text-sm font-semibold">
            <ArrowLeft size={16} /> Retour
          </button>
          <h1 className="font-black text-gray-900">{id ? "Modifier l'article" : "Nouvel article"}</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Titre de l'article..."
            className="w-full text-2xl font-black text-gray-900 px-0 py-2 border-0 border-b-2 border-gray-200 focus:border-[#0056B3] focus:outline-none focus:ring-0 placeholder-gray-300" />

          <input value={excerpt} onChange={e => setExcerpt(e.target.value)}
            placeholder="Résumé (optionnel)..."
            className="w-full text-sm text-gray-600 px-0 py-2 border-0 border-b border-gray-100 focus:border-[#0056B3] focus:outline-none focus:ring-0 placeholder-gray-300" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Couverture</label>
              <div className="flex gap-2">
                <input value={coverImage} onChange={e => setCoverImage(e.target.value)}
                  placeholder="URL de l'image..." className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none" />
                <label className="px-3 py-2 bg-gray-100 rounded-xl text-xs font-semibold cursor-pointer hover:bg-gray-200">
                  Upload
                  <input type="file" accept="image/*" className="hidden" onChange={handleUploadCover} />
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Matière</label>
              <select value={courseId} onChange={e => setCourseId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none">
                <option value="">Aucune</option>
                {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Tags (séparés par des virgules)</label>
              <input value={tags} onChange={e => setTags(e.target.value)}
                placeholder="maths, physique, examen..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)}
              className="w-4 h-4 rounded accent-[#0056B3]" />
            <span className="font-semibold text-gray-700">Publié</span>
          </label>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
            className="flex items-center gap-2 px-6 py-2.5 bg-[#0056B3] text-white rounded-xl font-bold text-sm hover:bg-[#003375] disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Enregistrement..." : id ? "Mettre à jour" : "Publier"}
          </button>
        </div>
      </div>
    </div>
  );
}
