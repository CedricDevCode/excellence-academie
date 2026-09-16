import { useState, useEffect } from "react";
import { Layers, Plus, Edit, Trash2, Loader2, X, Save, Tag, BookOpen, AlertCircle } from "lucide-react";
import {
  fetchCourseCategories,
  createCourseCategory,
  updateCourseCategory,
  deleteCourseCategory,
} from "../../utils/api";
import { useToast } from "../Toast";
import LoadingSpinner from "./LoadingSpinner";

export default function CategoriesView() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', description: '', color: '#0056B3', displayOrder: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const COLOR_PRESETS = [
    { hex: '#4F46E5', label: 'Indigo' },
    { hex: '#0056B3', label: 'Bleu' },
    { hex: '#D97706', label: 'Ambre' },
    { hex: '#059669', label: 'Vert' },
    { hex: '#DC2626', label: 'Rouge' },
    { hex: '#7C3AED', label: 'Violet' },
    { hex: '#0284C7', label: 'Cyan' },
    { hex: '#DB2777', label: 'Rose' },
    { hex: '#65A30D', label: 'Lime' },
    { hex: '#EA580C', label: 'Orange' },
  ];

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await fetchCourseCategories();
      setCategories(data || []);
    } catch (err) {
      toast('error', 'Erreur lors du chargement des catégories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCategories(); }, []);

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: '', description: '', color: '#0056B3', displayOrder: String(categories.length + 1) });
    setShowPanel(true);
  };

  const openEdit = (cat: any) => {
    setEditTarget(cat);
    setForm({
      name: cat.name || '',
      description: cat.description || '',
      color: cat.color || '#0056B3',
      displayOrder: String(cat.displayOrder ?? ''),
    });
    setShowPanel(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast('error', 'Le nom est obligatoire'); return; }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        color: form.color || '#0056B3',
        displayOrder: form.displayOrder ? Number(form.displayOrder) : undefined,
      };
      if (editTarget) {
        await updateCourseCategory(editTarget.id, payload);
        toast('success', 'Catégorie modifiée avec succès');
      } else {
        await createCourseCategory(payload);
        toast('success', 'Catégorie créée avec succès');
      }
      await loadCategories();
      setShowPanel(false);
    } catch (err: any) {
      toast('error', err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCourseCategory(deleteTarget.id);
      toast('success', `Catégorie "${deleteTarget.name}" supprimée`);
      setDeleteTarget(null);
      await loadCategories();
    } catch (err: any) {
      toast('error', err.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex gap-6">
      {/* ── Main List ── */}
      <div className={`flex-1 min-w-0 space-y-6 ${showPanel ? 'hidden xl:block' : ''}`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-50 text-[#0056B3]"><Layers size={22} /></span>
              <h2 className="text-xl font-black text-gray-900">Catégories de Formations</h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Organisez vos formations par catégories thématiques. Les catégories s'appliquent automatiquement au catalogue et aux formulaires d'inscription.
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center justify-center gap-2 bg-[#0056B3] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#003d80] transition-colors shadow-sm shrink-0"
          >
            <Plus size={18} /><span>Nouvelle catégorie</span>
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0056B3] flex items-center justify-center"><Layers size={24} /></div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Catégories</div>
              <div className="text-2xl font-black text-gray-900">{categories.length}</div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><BookOpen size={24} /></div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Formations Classées</div>
              <div className="text-2xl font-black text-gray-900">{categories.reduce((a: number, c: any) => a + (c.coursesCount || 0), 0)}</div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center"><Tag size={24} /></div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Catégories Actives</div>
              <div className="text-2xl font-black text-gray-900">{categories.filter((c: any) => (c.coursesCount || 0) > 0).length}</div>
            </div>
          </div>
        </div>

        {/* Categories grid */}
        {categories.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
            <div className="w-16 h-16 bg-blue-50 text-[#0056B3] rounded-full flex items-center justify-center mx-auto mb-3">
              <Layers size={32} />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Aucune catégorie</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">Les catégories par défaut seront créées automatiquement au prochain chargement.</p>
            <button onClick={openAdd} className="bg-[#0056B3] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#003d80]">Créer une catégorie</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {categories.map((cat: any) => (
              <div
                key={cat.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all group relative overflow-hidden"
              >
                {/* Color accent strip */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                  style={{ background: cat.color || '#0056B3' }}
                />
                <div className="flex items-start justify-between gap-2 mt-1">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                      style={{ backgroundColor: `${cat.color || '#0056B3'}18`, color: cat.color || '#0056B3' }}
                    >
                      <Tag size={18} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-gray-900 text-sm leading-tight truncate">{cat.name}</h3>
                      <span className="text-[11px] text-gray-400">{cat.coursesCount || 0} formation{(cat.coursesCount || 0) > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => openEdit(cat)}
                      className="w-8 h-8 rounded-lg bg-blue-50 text-[#0056B3] flex items-center justify-center hover:bg-blue-100 transition-colors"
                      title="Modifier"
                    ><Edit size={14} /></button>
                    <button
                      onClick={() => setDeleteTarget(cat)}
                      className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"
                      title="Supprimer"
                    ><Trash2 size={14} /></button>
                  </div>
                </div>

                {cat.description && (
                  <p className="text-xs text-gray-500 mt-3 leading-relaxed line-clamp-2">{cat.description}</p>
                )}

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-200" style={{ backgroundColor: cat.color || '#0056B3' }} />
                    <span className="text-[10px] text-gray-400 font-mono">{cat.color || '#0056B3'}</span>
                  </div>
                  <span className="text-[10px] text-gray-300">Ordre : {cat.displayOrder ?? '–'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Inline Panel ── */}
      {showPanel && (
        <div className="w-full xl:w-[380px] shrink-0">
          <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 sticky top-4" style={{maxHeight: 'calc(100vh - 7rem)'}}>
            {/* Panel header */}
            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-[#0056B3]/5 to-blue-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-[#0056B3] text-white shadow-sm"><Layers size={16} /></span>
                <div>
                  <h3 className="font-black text-gray-900 text-sm">{editTarget ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</h3>
                  <p className="text-[11px] text-gray-400">{editTarget ? 'Mettre à jour les informations' : 'Définir une nouvelle thématique'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPanel(false)}
                className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
              ><X size={18} /></button>
            </div>

            {/* Panel form */}
            <form onSubmit={handleSubmit} className="overflow-y-auto" style={{maxHeight: 'calc(100vh - 15rem)'}}>
              <div className="p-5 space-y-5">
                {/* Nom */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">Nom de la catégorie *</label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Concours Juridiques & Judiciaires"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none transition-colors"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">Description</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Brève description de la catégorie..."
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none resize-none transition-colors"
                  />
                </div>

                {/* Couleur */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">Couleur d'identification</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {COLOR_PRESETS.map(c => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setForm({ ...form, color: c.hex })}
                        title={c.label}
                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                          form.color === c.hex ? 'border-gray-900 scale-110 shadow-md' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.color}
                      onChange={e => setForm({ ...form, color: e.target.value })}
                      className="w-10 h-10 rounded-xl border-2 border-gray-200 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={form.color}
                      onChange={e => setForm({ ...form, color: e.target.value })}
                      placeholder="#0056B3"
                      className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl text-sm font-mono focus:border-[#0056B3] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Ordre d'affichage */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">Ordre d'affichage</label>
                  <input
                    type="number"
                    min="1"
                    value={form.displayOrder}
                    onChange={e => setForm({ ...form, displayOrder: e.target.value })}
                    placeholder="Ex: 1"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none transition-colors"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Les catégories s'affichent du plus petit au plus grand numéro.</p>
                </div>

                {/* Preview */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Aperçu</div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${form.color}20`, color: form.color }}
                    >
                      <Tag size={16} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-gray-900">{form.name || 'Nom de la catégorie'}</div>
                      <div className="text-[11px] text-gray-400">{form.description || 'Aucune description'}</div>
                    </div>
                  </div>
                  <div className="mt-2 h-1 rounded-full" style={{ backgroundColor: form.color }} />
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/70">
                <button
                  type="button"
                  onClick={() => setShowPanel(false)}
                  className="px-4 py-2 text-gray-500 font-semibold text-sm hover:bg-gray-100 rounded-xl transition-colors"
                >Annuler</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-[#0056B3] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#003d80] transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>{editTarget ? 'Mettre à jour' : 'Créer la catégorie'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertCircle size={26} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-base">Supprimer la catégorie ?</h3>
                <p className="text-xs text-gray-500">Les formations associées seront déplacées vers « Général »</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Supprimer définitivement <strong className="text-gray-900">« {deleteTarget.name} »</strong> ?{' '}
              {(deleteTarget.coursesCount || 0) > 0 && (
                <span className="text-amber-600 font-semibold">{deleteTarget.coursesCount} formation(s) seront recatégorisées.</span>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="px-4 py-2 text-gray-600 font-semibold text-sm hover:bg-gray-100 rounded-xl transition-colors">Annuler</button>
              <button onClick={confirmDelete} disabled={deleting} className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-50">
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
