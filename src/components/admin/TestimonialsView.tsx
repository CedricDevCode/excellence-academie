import { useState, useEffect, useRef } from "react";
import { Award, Plus, Edit, Trash2, Loader2, Star, Upload, X, Eye, EyeOff, Camera } from "lucide-react";
import {
  fetchAllTestimonials,
  createTestimonialAdmin,
  updateTestimonial,
  deleteTestimonial,
  uploadTestimonialImages,
} from "../../utils/api";
import { useToast } from "../Toast";

export default function TestimonialsView() {
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const emptyForm = {
    name: "",
    course: "",
    message: "",
    rating: 5,
    imageUrl: "",
    isActive: true,
  };

  const [form, setForm] = useState(emptyForm);

  const loadTestimonials = () => {
    setLoading(true);
    fetchAllTestimonials()
      .then(setTestimonials)
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTestimonials(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (t: any) => {
    setEditingId(t.id);
    setForm({
      name: t.name || "",
      course: t.course || "",
      message: t.message || "",
      rating: t.rating || 5,
      imageUrl: (t.images && t.images[0]) || "",
      isActive: t.isActive !== undefined ? t.isActive : true,
    });
    setShowForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const urls = await uploadTestimonialImages([file]);
      if (urls && urls.length > 0) {
        setForm(prev => ({ ...prev, imageUrl: urls[0] }));
        toast("success", "Photo de l'admis téléchargée avec succès");
      }
    } catch (err: any) {
      toast("error", err.message || "Erreur lors du téléchargement de l'image");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.course || !form.message) {
      toast("error", "Veuillez renseigner le nom, la promotion/concours et le témoignage.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        course: form.course.trim(),
        message: form.message.trim(),
        rating: Number(form.rating) || 5,
        images: form.imageUrl ? [form.imageUrl] : [],
        isActive: form.isActive,
      };

      if (editingId) {
        await updateTestimonial(editingId, payload);
        toast("success", "Profil de l'admis mis à jour !");
      } else {
        await createTestimonialAdmin(payload);
        toast("success", "Nouvel admis ajouté avec succès !");
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      loadTestimonials();
    } catch (err: any) {
      toast("error", err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateTestimonial(id, { isActive: !currentStatus });
      toast("success", `Profil ${!currentStatus ? 'publié sur la page d\'accueil' : 'masqué'}`);
      loadTestimonials();
    } catch (err: any) {
      toast("error", err.message || "Erreur lors de la modification");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce profil d'admis / avis ?")) return;
    try {
      await deleteTestimonial(id);
      toast("success", "Profil supprimé avec succès");
      loadTestimonials();
    } catch (err: any) {
      toast("error", err.message || "Erreur lors de la suppression");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#FF6B00] rounded-full animate-spin" />
      </div>
    );
  }

  const publishedCount = testimonials.filter(t => t.isActive).length;
  const hiddenCount = testimonials.filter(t => !t.isActive).length;

  return (
    <div className="space-y-6">
      {/* Top Banner Stats & Actions */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-[#FF6B00] flex items-center justify-center">
              <Award size={18} />
            </div>
            <h2 className="text-xl font-black text-gray-900">Lauréats Admis & Témoignages</h2>
          </div>
          <p className="text-sm text-gray-500">
            Mettez en avant les photos et promotions des admis (Magistrature, ENA, Greffe...) pour renforcer la crédibilité.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
            <span>{publishedCount} en ligne</span>
            {hiddenCount > 0 && <span className="text-gray-400">· {hiddenCount} masqué(s)</span>}
          </div>

          <button
            onClick={openCreate}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#FF6B00] to-[#ff8533] text-white font-bold rounded-xl hover:brightness-105 transition-all shadow-sm shadow-orange-500/20 text-sm whitespace-nowrap"
          >
            <Plus size={18} />
            <span>Ajouter un admis</span>
          </button>
        </div>
      </div>

      {/* Form Drawer / Card */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-xl border-2 border-orange-200 overflow-hidden animate-fadeIn">
          <div className="bg-gradient-to-r from-orange-50 to-amber-50/50 p-5 border-b border-orange-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Award size={20} className="text-[#FF6B00]" />
              <h3 className="font-black text-[#002855] text-base">
                {editingId ? "Modifier le profil de l'admis" : "Ajouter un admis aux concours précédents"}
              </h3>
            </div>
            <button
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Nom & Prénom de l'étudiant *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Kouamé Jean-Marc"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Concours & Promotion / Statut *
                </label>
                <input
                  type="text"
                  required
                  value={form.course}
                  onChange={e => setForm({ ...form, course: e.target.value })}
                  placeholder="Ex: Admis Magistrature 2023, Admise ENA 2024..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none"
                />
                {/* Suggestions rapides */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px]">
                  <span className="text-gray-400">Suggestions :</span>
                  {["Admis Magistrature 2023", "Admis ENA 2024", "Admis Greffe 2024", "Admis Agent pénitentiaire 2023"].map(sug => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setForm({ ...form, course: sug })}
                      className="px-2 py-0.5 bg-gray-100 hover:bg-orange-50 hover:text-[#FF6B00] rounded-md text-gray-600 font-medium transition-colors"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Photo de l'admis & Note */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Photo officielle de l'admis
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 overflow-hidden shrink-0 flex items-center justify-center relative">
                    {form.imageUrl ? (
                      <img src={form.imageUrl} alt="Aperçu" className="w-full h-full object-cover" />
                    ) : (
                      <Camera size={22} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="inline-flex items-center gap-2 px-3.5 py-2 border border-gray-200 hover:border-[#FF6B00] hover:text-[#FF6B00] bg-white rounded-xl text-xs font-bold text-gray-700 transition-colors shadow-2xs"
                    >
                      {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      <span>{uploadingImage ? "Téléchargement..." : "Choisir une photo"}</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <input
                      type="text"
                      value={form.imageUrl}
                      onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                      placeholder="Ou collez l'URL de la photo"
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:border-[#FF6B00] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Évaluation
                </label>
                <div className="flex items-center gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setForm({ ...form, rating: star })}
                      className="p-1 text-yellow-400 hover:scale-125 transition-transform"
                    >
                      <Star size={24} fill={star <= form.rating ? "currentColor" : "none"} className={star <= form.rating ? "" : "text-gray-300"} />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-gray-500 ml-2">{form.rating}/5 étoiles</span>
                </div>

                <div className="mt-4 flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="isActiveToggle"
                    checked={form.isActive}
                    onChange={e => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 text-[#FF6B00] focus:ring-[#FF6B00] rounded"
                  />
                  <label htmlFor="isActiveToggle" className="text-xs font-bold text-gray-700 cursor-pointer">
                    Afficher immédiatement sur la page d'accueil
                  </label>
                </div>
              </div>
            </div>

            {/* Message / Témoignage */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Témoignage / Retour d'expérience *
              </label>
              <textarea
                required
                rows={3}
                value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })}
                placeholder="Ex: Grâce à la rigueur des cours et aux examens blancs avec les magistrats formateurs, j'ai été reçu au concours dès ma première tentative..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#FF6B00] hover:bg-[#e65c00] text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-orange-500/25 disabled:opacity-50"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                <span>{editingId ? "Enregistrer les modifications" : "Publier l'admis"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid of Testimonials / Admis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {testimonials.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-gray-100">
            <div className="w-16 h-16 rounded-full bg-orange-50 text-[#FF6B00] flex items-center justify-center mx-auto mb-3">
              <Award size={28} />
            </div>
            <h3 className="font-bold text-gray-800 text-base mb-1">Aucun lauréat ou avis pour le moment</h3>
            <p className="text-gray-500 text-xs max-w-md mx-auto mb-4">
              Cliquez sur "Ajouter un admis" pour mettre en avant vos premiers lauréats avec leur photo et promotion.
            </p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF6B00] text-white font-bold rounded-xl text-xs hover:bg-[#e65c00] transition-colors"
            >
              <Plus size={16} />
              <span>Ajouter un premier admis</span>
            </button>
          </div>
        ) : (
          testimonials.map(t => {
            const hasPhoto = t.images && t.images.length > 0;
            const photoUrl = hasPhoto ? t.images[0] : null;

            return (
              <div
                key={t.id}
                className={`bg-white rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                  t.isActive ? "border-gray-100 shadow-sm hover:shadow-md" : "border-dashed border-gray-300 opacity-70 bg-gray-50/50"
                }`}
              >
                <div>
                  {/* Card Header: Avatar & Info */}
                  <div className="flex items-start gap-3.5 mb-3.5">
                    <div className="relative shrink-0">
                      {photoUrl ? (
                        <div className="w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-[#FF6B00]/40 shadow-sm">
                          <img src={photoUrl} alt={t.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#002855] to-[#004080] flex items-center justify-center text-white text-lg font-black shadow-sm ring-2 ring-blue-100">
                          {t.name?.charAt(0)?.toUpperCase() || "A"}
                        </div>
                      )}
                      {t.isActive && (
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 ring-2 ring-white" title="En ligne sur le site" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-extrabold text-gray-900 text-sm truncate">{t.name}</h4>
                        <div className="flex text-yellow-400 shrink-0">
                          {[...Array(5)].map((_, j) => (
                            <Star key={j} size={11} fill={j < (t.rating || 5) ? "currentColor" : "none"} className={j >= (t.rating || 5) ? "text-gray-200" : ""} />
                          ))}
                        </div>
                      </div>

                      {/* Course / Promotion Badge */}
                      <div className="mt-1">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-[#FF6B00]">
                          {t.course}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Message Quote */}
                  <p className="text-gray-600 text-xs italic line-clamp-4 leading-relaxed mb-4">
                    "{t.message}"
                  </p>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${t.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {t.isActive ? "En ligne" : "Masqué"}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleActive(t.id, t.isActive)}
                      className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        t.isActive ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"
                      }`}
                      title={t.isActive ? "Masquer ce profil" : "Publier sur le site"}
                    >
                      {t.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>

                    <button
                      onClick={() => openEdit(t)}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Modifier"
                    >
                      <Edit size={16} />
                    </button>

                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
