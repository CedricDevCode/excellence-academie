import { useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck, Search, Download, Upload, Trash2, Loader2, FileText, GraduationCap, X, Image as ImageIcon,
} from "lucide-react";
import {
  fetchLibraryDocuments, uploadLibraryDocument, deleteLibraryDocument, libraryDocumentUrl,
  getMe, fetchCourses,
} from "../utils/api";
import SEOHead from "../components/SEOHead";
import Container from "../components/ui/Container";
import { useToast } from "../components/Toast";

export default function Bibliotheque() {
  const { toast, confirm } = useToast();
  const [me, setMe] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [courseId, setCourseId] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", courseId: "", courseTitle: "", file: null as File | null });

  const canUpload = me && ["ADMIN", "TEACHER", "SECRETARY", "ACCOUNTANT"].includes(me.role);

  const load = async () => {
    setLoading(true);
    try { setDocuments(await fetchLibraryDocuments({ q: q || undefined, courseId: courseId || undefined })); }
    catch { toast('error', 'Impossible de charger la bibliothèque'); }
    finally { setLoading(false); }
  };

  useEffect(() => { getMe().then(setMe).catch(() => {}); fetchCourses().then(setCourses).catch(() => {}); }, []);
  useEffect(() => { load(); }, [courseId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.file || !form.title.trim()) return;
    setUploading(true);
    try {
      await uploadLibraryDocument(form.file, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        courseId: form.courseId || undefined,
        courseTitle: courses.find(c => c.id === form.courseId)?.title || form.courseTitle || undefined,
      });
      toast('success', 'Document ajouté à la bibliothèque');
      setShowUpload(false);
      setForm({ title: "", description: "", courseId: "", courseTitle: "", file: null });
      load();
    } catch (err: any) {
      toast('error', err?.message || 'Erreur lors de l’envoi');
    } finally { setUploading(false); }
  };

  const handleDelete = async (doc: any) => {
    if (!(await confirm(`Supprimer « ${doc.title} » ?`))) return;
    try {
      await deleteLibraryDocument(doc.id);
      setDocuments(documents.filter(d => d.id !== doc.id));
      toast('success', 'Document supprimé');
    } catch (err: any) {
      toast('error', err?.message || 'Erreur lors de la suppression');
    }
  };

  const filtered = useMemo(() =>
    q ? documents.filter(d => d.title.toLowerCase().includes(q.toLowerCase()) || (d.description || '').toLowerCase().includes(q.toLowerCase())) : documents,
    [documents, q]
  );

  return (
    <div className="min-h-screen bg-surface-50">
      <SEOHead title="Bibliothèque en ligne" description="Documents, annales corrigées et fiches réservés aux inscrits d'Excellence Académie." url="/bibliotheque" />
      <Container className="py-8">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary-800"><BookOpenCheck size={13} /> Espace réservé</span>
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-ink-900 tracking-tight mt-1">Bibliothèque<span className="text-gold-600">.</span></h1>
            <p className="text-sm text-surface-500 mt-1 max-w-xl">Annales, fiches méthode, sujets corrigés et documents de préparation — accessibles aux inscrits et à l'équipe pédagogique.</p>
          </div>
          {canUpload && (
            <button onClick={() => setShowUpload(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-bold text-sm hover:bg-primary-700 transition-colors shrink-0">
              <Upload size={16} /> Ajouter un document
            </button>
          )}
        </div>

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un document…"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
          </div>
          <select value={courseId} onChange={e => setCourseId(e.target.value)}
            className="px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm focus:border-primary-600 focus:outline-none">
            <option value="">Toutes les formations</option>
            {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>

        {/* Documents */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={30} className="animate-spin text-primary-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-surface-200">
            <BookOpenCheck size={38} className="mx-auto text-surface-300 mb-3" />
            <p className="font-display font-bold text-ink-900">Aucun document</p>
            <p className="text-xs text-surface-500 mt-1">La bibliothèque se remplit au fil des semaines.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((d: any) => (
              <div key={d.id} className="group bg-white rounded-2xl border border-surface-200 p-5 flex flex-col hover:shadow-md hover:border-primary-200 transition-all">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
                    {d.mimeType?.startsWith('image/') ? <ImageIcon size={20} /> : <FileText size={20} />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-bold text-ink-900 leading-snug line-clamp-2">{d.title}</p>
                    {d.courseTitle && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary-800 bg-primary-50 px-2 py-0.5 rounded-full mt-1.5"><GraduationCap size={10} />{d.courseTitle}</span>}
                  </div>
                </div>
                {d.description && <p className="text-xs text-surface-500 leading-relaxed line-clamp-2 mb-3">{d.description}</p>}
                <div className="mt-auto flex items-center justify-between gap-2 pt-3 border-t border-surface-100">
                  <div className="text-[10px] text-surface-400">
                    <p className="num">{(d.size / 1024 / 1024).toFixed(1)} Mo</p>
                    <p>{new Date(d.createdAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={libraryDocumentUrl(d.id)} target="_blank" rel="noreferrer"
                      className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-700 text-white hover:bg-primary-800 transition-colors shrink-0" title="Télécharger" aria-label="Télécharger">
                      <Download size={20} strokeWidth={2.2} className="shrink-0" />
                    </a>
                    {(me?.role === 'ADMIN' || me?.id === d.uploadedById) && (
                      <button onClick={() => handleDelete(d)} className="w-10 h-10 flex items-center justify-center rounded-lg bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 transition-colors shrink-0" title="Supprimer" aria-label="Supprimer">
                        <Trash2 size={20} strokeWidth={2.2} className="shrink-0" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-surface-900/60 backdrop-blur-[2px] z-[80] flex items-center justify-center p-4 modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowUpload(false); }}>
          <form onSubmit={handleUpload} className="bg-white rounded-2xl w-full max-w-md shadow-2xl modal-content max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-surface-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-display font-bold text-ink-900">Ajouter un document</h3>
              <button type="button" onClick={() => setShowUpload(false)} className="text-surface-400 hover:text-surface-700"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-1.5">Titre *</label>
                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Annales session 2024 — corrigées"
                  className="w-full px-3 py-2.5 border border-surface-300 rounded-xl text-sm focus:border-primary-600 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-1.5">Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Contenu, niveau, utilisation..."
                  className="w-full px-3 py-2.5 border border-surface-300 rounded-xl text-sm focus:border-primary-600 focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-surface-500 mb-1.5">Formation (optionnel)</label>
                <select value={form.courseId} onChange={e => setForm({ ...form, courseId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-surface-300 rounded-xl text-sm focus:border-primary-600 focus:outline-none">
                  <option value="">Toute la promotion</option>
                  {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-surface-300 rounded-2xl py-8 cursor-pointer hover:border-primary-500 hover:bg-gold-100/30 transition-all">
                {uploading ? <Loader2 size={26} className="animate-spin text-primary-600" /> : <Upload size={26} className="text-surface-400" />}
                <span className="text-xs font-bold text-surface-600">{form.file ? form.file.name : 'Choisir un fichier (PDF, image, Word…)'}</span>
                <span className="text-[10px] text-surface-400">25 Mo max — stocké en base</span>
                <input type="file" className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt,.csv,.zip" onChange={e => setForm({ ...form, file: e.target.files?.[0] || null })} />
              </label>
            </div>
            <div className="p-5 border-t border-surface-100 flex justify-end gap-2 sticky bottom-0 bg-white rounded-b-2xl">
              <button type="button" onClick={() => setShowUpload(false)} className="px-4 py-2.5 text-sm font-semibold text-surface-500 hover:text-surface-800 rounded-xl hover:bg-surface-100">Annuler</button>
              <button type="submit" disabled={uploading || !form.file || !form.title.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 disabled:opacity-50">
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                {uploading ? 'Envoi…' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
