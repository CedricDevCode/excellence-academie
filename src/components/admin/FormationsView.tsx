import { useState, useEffect, useMemo } from "react";
import {
  GraduationCap,
  Plus,
  X,
  Save,
  Loader2,
  Search,
  BookOpen,
  Award,
  DollarSign,
  Users,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  MapPin,
  Globe,
  Building,
  Info,
} from "lucide-react";
import {
  fetchCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  fetchCourseCategories,
} from "../../utils/api";
import { useToast } from "../Toast";
import LoadingSpinner from "./LoadingSpinner";
import { CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR } from "./helpers";

// ─── Formations & Concours View ───────────────────────────────────────────
function FormationsView() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Full-page form states
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    id: '',
    title: '',
    category: 'Concours Juridiques & Judiciaires',
    description: '',
    // Zone 1: Abidjan
    registrationFee: '45000',
    monthlyFee: '30000',
    // Zone 2: Intérieur CI (toutes les villes sauf Abidjan)
    registrationFeeInterieur: '35000',
    monthlyFeeInterieur: '25000',
    // Zone 3: Diaspora (hors Côte d'Ivoire)
    registrationFeeDiaspora: '100000',
    monthlyFeeDiaspora: '35000',
    // Mode-specific monthly fees
    monthlyFeeOnline: '25000',
    monthlyFeeBoth: '35000',
    hasPresentiel: true,
    hasOnline: true,
  });
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dbCategories, setDbCategories] = useState<any[]>([]);

  // Delete Confirmation state
  const [courseToDelete, setCourseToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { toast } = useToast();

  const CATEGORY_PRESETS = [
    'Concours Juridiques & Judiciaires',
    'Administration Publique',
    'Sécurité & Force Publique',
    'Technologies & Métiers Numériques',
    'Santé & Paramédical',
    'Éducation & Enseignement',
    'Finances & Gestion',
  ];

  const loadCourses = async () => {
    setLoading(true);
    try {
      const [coursesRes, catsRes] = await Promise.allSettled([fetchCourses(), fetchCourseCategories()]);
      if (coursesRes.status === 'fulfilled') {
        setCourses(coursesRes.value || []);
      }
      if (catsRes.status === 'fulfilled') {
        setDbCategories(catsRes.value || []);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des formations :', err);
      toast('error', 'Erreur lors du chargement des formations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  // Compute categories: prefer DB categories, fallback to presets + course categories
  const availableCategories = useMemo(() => {
    if (dbCategories.length > 0) return dbCategories.map((c: any) => c.name);
    const fromCourses = courses.map(c => c.category || 'Général').filter(Boolean);
    const combined = Array.from(new Set([...CATEGORY_PRESETS, ...fromCourses]));
    return combined;
  }, [courses, dbCategories]);

  // All category names for the form select
  const formCategoryOptions = useMemo(() => {
    if (dbCategories.length > 0) return dbCategories.map((c: any) => c.name);
    return CATEGORY_PRESETS;
  }, [dbCategories]);

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      const matchesCategory = selectedCategory === 'ALL' || (c.category || 'Général') === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (c.title || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [courses, selectedCategory, searchQuery]);

  // Stats calculation
  const totalStudentsEnrolled = useMemo(() => {
    return courses.reduce((acc, c) => acc + (c._count?.subscriptions || c._count?.payments || 0), 0);
  }, [courses]);

  const averageMonthlyFee = useMemo(() => {
    if (!courses.length) return 30000;
    const sum = courses.reduce((acc, c) => acc + (Number(c.monthlyFee || 30000) || 0), 0);
    return Math.round(sum / courses.length);
  }, [courses]);

  const handleOpenAdd = () => {
    setForm({
      id: '',
      title: '',
      category: formCategoryOptions[0] || CATEGORY_PRESETS[0],
      description: '',
      registrationFee: '45000',
      monthlyFee: '30000',
      registrationFeeInterieur: '35000',
      monthlyFeeInterieur: '25000',
      registrationFeeDiaspora: '100000',
      monthlyFeeDiaspora: '35000',
      monthlyFeeOnline: '25000',
      monthlyFeeBoth: '35000',
      hasPresentiel: true,
      hasOnline: true,
    });
    setIsCustomCategory(false);
    setCustomCategory('');
    setShowForm(true);
  };

  const handleEdit = (c: any) => {
    const isKnown = formCategoryOptions.includes(c.category);
    setForm({
      id: c.id,
      title: c.title || '',
      category: isKnown ? c.category : 'CUSTOM',
      description: c.description || '',
      registrationFee: String(c.registrationFee !== undefined && c.registrationFee !== null ? c.registrationFee : (c.price || 45000)),
      monthlyFee: String(c.monthlyFee !== undefined && c.monthlyFee !== null ? c.monthlyFee : 30000),
      registrationFeeInterieur: String(c.registrationFeeInterieur !== undefined && c.registrationFeeInterieur !== null ? c.registrationFeeInterieur : 35000),
      monthlyFeeInterieur: String(c.monthlyFeeInterieur !== undefined && c.monthlyFeeInterieur !== null ? c.monthlyFeeInterieur : 25000),
      registrationFeeDiaspora: String(c.registrationFeeDiaspora !== undefined && c.registrationFeeDiaspora !== null ? c.registrationFeeDiaspora : 100000),
      monthlyFeeDiaspora: String(c.monthlyFeeDiaspora !== undefined && c.monthlyFeeDiaspora !== null ? c.monthlyFeeDiaspora : 35000),
      monthlyFeeOnline: String(c.monthlyFeeOnline !== undefined && c.monthlyFeeOnline !== null ? c.monthlyFeeOnline : 25000),
      monthlyFeeBoth: String(c.monthlyFeeBoth !== undefined && c.monthlyFeeBoth !== null ? c.monthlyFeeBoth : 35000),
      hasPresentiel: c.hasPresentiel !== undefined ? c.hasPresentiel : true,
      hasOnline: c.hasOnline !== undefined ? c.hasOnline : true,
    });
    if (!isKnown && c.category) {
      setIsCustomCategory(true);
      setCustomCategory(c.category);
    } else {
      setIsCustomCategory(false);
      setCustomCategory('');
    }
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast('error', 'Le titre de la formation est obligatoire');
      return;
    }
    if (!form.hasPresentiel && !form.hasOnline) {
      toast('error', 'Veuillez cocher au moins un mode de formation (Présentiel ou En ligne)');
      return;
    }

    const regFee = Number(form.registrationFee) || 45000;
    const mFee = Number(form.monthlyFee) || 30000;
    const regFeeInt = Number(form.registrationFeeInterieur) || 35000;
    const mFeeInt = Number(form.monthlyFeeInterieur) || 25000;
    const regFeeDias = Number(form.registrationFeeDiaspora) || 100000;
    const mFeeDias = Number(form.monthlyFeeDiaspora) || 35000;
    const mFeeOnline = Number(form.monthlyFeeOnline) || 25000;
    const mFeeBoth = Number(form.monthlyFeeBoth) || 35000;

    const finalCategory = isCustomCategory
      ? (customCategory.trim() || 'Général')
      : form.category;

    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        category: finalCategory,
        description: form.description.trim() || undefined,
        price: regFee,
        registrationFee: regFee,
        monthlyFee: mFee,
        registrationFeeInterieur: regFeeInt,
        monthlyFeeInterieur: mFeeInt,
        registrationFeeDiaspora: regFeeDias,
        monthlyFeeDiaspora: mFeeDias,
        monthlyFeeOnline: mFeeOnline,
        monthlyFeeBoth: mFeeBoth,
        hasPresentiel: Boolean(form.hasPresentiel),
        hasOnline: Boolean(form.hasOnline),
      };

      if (form.id) {
        await updateCourse(form.id, payload);
        toast('success', 'Formation modifiée avec succès');
      } else {
        await createCourse(payload);
        toast('success', 'Nouvelle formation ajoutée avec succès');
      }

      await loadCourses();
      setShowForm(false);
    } catch (err: any) {
      console.error('Erreur enregistrement formation :', err);
      toast('error', err.message || 'Erreur lors de l\'enregistrement de la formation');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!courseToDelete) return;
    setDeleting(true);
    try {
      await deleteCourse(courseToDelete.id);
      toast('success', `La formation "${courseToDelete.title}" a été supprimée`);
      setCourseToDelete(null);
      await loadCourses();
    } catch (err: any) {
      console.error('Erreur suppression formation :', err);
      toast('error', err.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  // ─── Modal / Full-page form view ──────────────────────────────────────────
  if (showForm) {
    return (
      <div className="space-y-6 pb-12 animate-fadeIn">
        {/* Header navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowForm(false)}
              className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors font-bold text-base"
              title="Retour à la liste"
            >
              ←
            </button>
            <div className="flex items-center gap-3">
              <span className="p-3 rounded-xl bg-linear-to-br from-[#c97e00] to-amber-600 text-white shadow-md">
                <GraduationCap size={22} />
              </span>
              <div>
                <h2 className="text-xl font-black text-gray-900">
                  {form.id ? 'Modifier la formation / concours' : 'Créer une nouvelle formation'}
                </h2>
                <p className="text-xs text-gray-500">
                  Configurez le programme, les modes et les tarifs officiels par zone géographique
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 text-gray-600 font-semibold text-sm hover:bg-gray-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 bg-[#c97e00] text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#7a4b00] transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{form.id ? 'Mettre à jour' : 'Enregistrer la formation'}</span>
            </button>
          </div>
        </div>

        {/* 2-Columns layout for clean, spacious editing */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT COLUMN: Course info & Description (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                <BookOpen size={18} className="text-[#c97e00]" />
                <h3 className="font-black text-gray-900 text-sm uppercase tracking-wide">Informations Générales</h3>
              </div>

              {/* Titre */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Titre de la formation / Concours *
                </label>
                <input
                  required
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Concours de la Magistrature, ENA, Greffe, Police..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:border-[#c97e00] focus:ring-2 focus:ring-[#c97e00]/20 focus:outline-none transition-all"
                />
              </div>

              {/* Catégorie */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Catégorie de la formation *
                </label>
                <select
                  value={isCustomCategory ? 'CUSTOM' : form.category}
                  onChange={e => {
                    if (e.target.value === 'CUSTOM') {
                      setIsCustomCategory(true);
                    } else {
                      setIsCustomCategory(false);
                      setForm({ ...form, category: e.target.value });
                    }
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:border-[#c97e00] focus:ring-2 focus:ring-[#c97e00]/20 focus:outline-none bg-white transition-all"
                >
                  {formCategoryOptions.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="CUSTOM">+ Autre catégorie personnalisée...</option>
                </select>

                {isCustomCategory && (
                  <div className="mt-3">
                    <input
                      type="text"
                      required
                      value={customCategory}
                      onChange={e => setCustomCategory(e.target.value)}
                      placeholder="Nom de la nouvelle catégorie..."
                      className="w-full px-4 py-2.5 border-2 border-[#c97e00]/40 rounded-lg text-sm focus:border-[#c97e00] focus:outline-none bg-amber-50/30"
                    />
                  </div>
                )}
              </div>

              {/* Modes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                  Modes de formation proposés *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center gap-3 p-3.5 border-2 rounded-lg cursor-pointer transition-all ${form.hasPresentiel ? "border-[#c97e00] bg-amber-50/50 shadow-xs" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                    <input
                      type="checkbox"
                      checked={form.hasPresentiel}
                      onChange={e => setForm({ ...form, hasPresentiel: e.target.checked })}
                      className="w-4 h-4 accent-[#c97e00] rounded"
                    />
                    <div>
                      <div className="text-xs font-bold text-gray-900">🏛️ Présentiel</div>
                      <div className="text-[10px] text-gray-500">En centre / salle</div>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-3.5 border-2 rounded-lg cursor-pointer transition-all ${form.hasOnline ? "border-accent-600 bg-accent-50/50 shadow-xs" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                    <input
                      type="checkbox"
                      checked={form.hasOnline}
                      onChange={e => setForm({ ...form, hasOnline: e.target.checked })}
                      className="w-4 h-4 accent-accent-600 rounded"
                    />
                    <div>
                      <div className="text-xs font-bold text-gray-900">🌐 En Ligne</div>
                      <div className="text-[10px] text-gray-500">Visio / Google Meet</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Description & Programme
                </label>
                <textarea
                  rows={6}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Détails du programme, conditions d'accès, matières enseignées, durée, débouchés..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:border-[#c97e00] focus:ring-2 focus:ring-[#c97e00]/20 focus:outline-none resize-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Tarification par Zone Géographique (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <DollarSign size={18} className="text-[#c97e00]" />
                  <h3 className="font-black text-gray-900 text-sm uppercase tracking-wide">
                    Tarification par Zone Géographique
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                  Automatique selon le lieu
                </span>
              </div>

              {/* Explication zone */}
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 flex items-start gap-3">
                <Info size={18} className="text-[#c97e00] shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <strong>Gestion automatique des tarifs :</strong> Lorsque l'étudiant s'inscrit en ligne, le montant de son inscription et de sa mensualité est calculé directement en fonction de son pays et de sa ville sélectionnés.
                </div>
              </div>

              {/* 3 Zone Cards */}
              <div className="space-y-4">

                {/* ZONE 1 : Abidjan */}
                <div className="border-2 border-primary-200 bg-linear-to-r from-primary-50/30 to-white rounded-xl p-5 relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-[#c97e00] text-white flex items-center justify-center font-bold shadow-xs">
                        <Building size={16} />
                      </span>
                      <div>
                        <h4 className="font-black text-gray-900 text-sm">Zone 1 : Abidjan & Présentiel Standard</h4>
                        <p className="text-[11px] text-gray-500">Ville d'Abidjan et formation standard</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-[#c97e00] px-2.5 py-1 rounded-md">
                      Abidjan
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Frais d'inscription (FCFA) *
                      </label>
                      <div className="relative">
                        <input
                          required
                          type="number"
                          min="0"
                          step="1000"
                          value={form.registrationFee}
                          onChange={e => setForm({ ...form, registrationFee: e.target.value })}
                          className="w-full pl-4 pr-16 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:border-[#c97e00] focus:outline-none transition-colors"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">
                          FCFA
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Défaut: 45 000 FCFA</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Mensualité (FCFA / mois) *
                      </label>
                      <div className="relative">
                        <input
                          required
                          type="number"
                          min="0"
                          step="1000"
                          value={form.monthlyFee}
                          onChange={e => setForm({ ...form, monthlyFee: e.target.value })}
                          className="w-full pl-4 pr-16 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-bold text-[#c97e00] focus:border-[#c97e00] focus:outline-none transition-colors"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">
                          FCFA/m
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Défaut: 30 000 FCFA</p>
                    </div>
                  </div>
                </div>

                {/* ZONE 2 : Intérieur de la Côte d'Ivoire */}
                <div className="border-2 border-emerald-200 bg-linear-to-r from-emerald-50/30 to-white rounded-xl p-5 relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                        <MapPin size={16} />
                      </span>
                      <div>
                        <h4 className="font-black text-gray-900 text-sm">Zone 2 : Intérieur de la Côte d'Ivoire</h4>
                        <p className="text-[11px] text-gray-500">Toutes les villes de CI sauf Abidjan (Bouaké, Yamoussoukro, Daloa, etc.)</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md">
                      Intérieur CI
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Frais d'inscription Intérieur (FCFA) *
                      </label>
                      <div className="relative">
                        <input
                          required
                          type="number"
                          min="0"
                          step="1000"
                          value={form.registrationFeeInterieur}
                          onChange={e => setForm({ ...form, registrationFeeInterieur: e.target.value })}
                          className="w-full pl-4 pr-16 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:border-emerald-600 focus:outline-none transition-colors"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">
                          FCFA
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-700 mt-1">Défaut: 35 000 FCFA (tarif réduit pour l'intérieur)</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Mensualité Intérieur (FCFA / mois) *
                      </label>
                      <div className="relative">
                        <input
                          required
                          type="number"
                          min="0"
                          step="1000"
                          value={form.monthlyFeeInterieur}
                          onChange={e => setForm({ ...form, monthlyFeeInterieur: e.target.value })}
                          className="w-full pl-4 pr-16 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-bold text-emerald-700 focus:border-emerald-600 focus:outline-none transition-colors"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">
                          FCFA/m
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Défaut: 25 000 FCFA</p>
                    </div>
                  </div>
                </div>

                {/* ZONE 3 : Diaspora & International */}
                <div className="border-2 border-accent-200 bg-linear-to-r from-accent-50/30 to-white rounded-xl p-5 relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-accent-600 text-white flex items-center justify-center font-bold shadow-xs">
                        <Globe size={16} />
                      </span>
                      <div>
                        <h4 className="font-black text-gray-900 text-sm">Zone 3 : Diaspora & International (En ligne)</h4>
                        <p className="text-[11px] text-gray-500">Candidats résidant hors de Côte d'Ivoire (France, Belgique, Canada, etc.)</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-accent-100 text-accent-800 px-2.5 py-1 rounded-md">
                      Diaspora
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Frais d'inscription Diaspora (FCFA) *
                      </label>
                      <div className="relative">
                        <input
                          required
                          type="number"
                          min="0"
                          step="1000"
                          value={form.registrationFeeDiaspora}
                          onChange={e => setForm({ ...form, registrationFeeDiaspora: e.target.value })}
                          className="w-full pl-4 pr-16 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:border-accent-600 focus:outline-none transition-colors"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">
                          FCFA
                        </span>
                      </div>
                      <p className="text-[10px] text-accent-700 mt-1">Défaut: 100 000 FCFA</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Mensualité Diaspora (FCFA / mois) *
                      </label>
                      <div className="relative">
                        <input
                          required
                          type="number"
                          min="0"
                          step="1000"
                          value={form.monthlyFeeDiaspora}
                          onChange={e => setForm({ ...form, monthlyFeeDiaspora: e.target.value })}
                          className="w-full pl-4 pr-16 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-bold text-accent-700 focus:border-accent-600 focus:outline-none transition-colors"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">
                          FCFA/m
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Défaut: 35 000 FCFA</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Mode-Based Monthly Fees */}
              <div className="border-2 border-blue-200 bg-linear-to-r from-blue-50/30 to-white rounded-xl p-5 relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                      <Globe size={16} />
                    </span>
                    <div>
                      <h4 className="font-black text-gray-900 text-sm">Mensualité par Mode de Formation</h4>
                      <p className="text-[11px] text-gray-500">Tarif mensuel selon le mode choisi (en ligne, présentiel+en ligne)</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-800 px-2.5 py-1 rounded-md">
                    Par mode
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Mensualité En ligne (FCFA / mois)
                    </label>
                    <div className="relative">
                      <input
                        required
                        type="number"
                        min="0"
                        step="1000"
                        value={form.monthlyFeeOnline}
                        onChange={e => setForm({ ...form, monthlyFeeOnline: e.target.value })}
                        className="w-full pl-4 pr-16 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-bold text-blue-700 focus:border-blue-600 focus:outline-none transition-colors"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">
                        FCFA/m
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Défaut: 25 000 FCFA</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Mensualité Présentiel + En ligne (FCFA / mois)
                    </label>
                    <div className="relative">
                      <input
                        required
                        type="number"
                        min="0"
                        step="1000"
                        value={form.monthlyFeeBoth}
                        onChange={e => setForm({ ...form, monthlyFeeBoth: e.target.value })}
                        className="w-full pl-4 pr-16 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-bold text-blue-700 focus:border-blue-600 focus:outline-none transition-colors"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">
                        FCFA/m
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Défaut: 35 000 FCFA</p>
                  </div>
                </div>
              </div>

              {/* Résumé interactif */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/80">
                <div className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-green-600" />
                  <span>Aperçu de ce que paiera un étudiant lors de son inscription :</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-gray-200 text-center">
                    <span className="text-[11px] text-gray-500 block">Abidjan</span>
                    <strong className="text-gray-900 text-sm">
                      {(Number(form.registrationFee) || 0) + (Number(form.monthlyFee) || 0)} F
                    </strong>
                    <span className="text-[10px] text-gray-400 block mt-0.5">({form.registrationFee} F + 1er mois)</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-gray-200 text-center">
                    <span className="text-[11px] text-emerald-700 block font-semibold">Intérieur CI</span>
                    <strong className="text-gray-900 text-sm">
                      {(Number(form.registrationFeeInterieur) || 0) + (Number(form.monthlyFeeInterieur) || 0)} F
                    </strong>
                    <span className="text-[10px] text-gray-400 block mt-0.5">({form.registrationFeeInterieur} F + 1er mois)</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-gray-200 text-center">
                    <span className="text-[11px] text-accent-700 block font-semibold">Diaspora</span>
                    <strong className="text-gray-900 text-sm">
                      {(Number(form.registrationFeeDiaspora) || 0) + (Number(form.monthlyFeeDiaspora) || 0)} F
                    </strong>
                    <span className="text-[10px] text-gray-400 block mt-0.5">({form.registrationFeeDiaspora} F + 1er mois)</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mt-2">
                  <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200 text-center">
                    <span className="text-[11px] text-blue-700 block font-semibold">Mensualité En ligne</span>
                    <strong className="text-blue-900 text-sm">{form.monthlyFeeOnline} F/mois</strong>
                  </div>
                  <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200 text-center">
                    <span className="text-[11px] text-blue-700 block font-semibold">Mensuel Présentiel + En ligne</span>
                    <strong className="text-blue-900 text-sm">{form.monthlyFeeBoth} F/mois</strong>
                  </div>
                </div>
              </div>

              {/* Submit buttons */}
              <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 text-gray-500 font-semibold text-sm hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-[#c97e00] text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#7a4b00] transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>{form.id ? 'Mettre à jour' : 'Enregistrer la formation'}</span>
                </button>
              </div>

            </div>
          </div>

        </form>

        {/* Delete modal */}
        {courseToDelete && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl p-6">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <AlertCircle size={26} />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-base">Confirmer la suppression</h3>
                  <p className="text-xs text-gray-500">Cette action est irréversible</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                Êtes-vous sûr de vouloir supprimer définitivement la formation{' '}
                <strong className="text-gray-900">« {courseToDelete.title} »</strong> ?
              </p>
              <div className="flex items-center justify-end gap-3">
                <button onClick={() => setCourseToDelete(null)} disabled={deleting}
                  className="px-4 py-2 text-gray-600 font-semibold text-sm hover:bg-gray-100 rounded-lg transition-colors">
                  Annuler
                </button>
                <button onClick={confirmDelete} disabled={deleting}
                  className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50">
                  {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  <span>Supprimer définitivement</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── List view ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2.5 rounded-xl bg-amber-50 text-[#c97e00]">
              <GraduationCap size={22} />
            </span>
            <h2 className="text-xl font-black text-gray-900">Catalogue des Formations & Concours</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Gérez les filières dispensées par Excellence Académie et leurs tarifs par zone (Abidjan, Intérieur CI, Diaspora).
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 bg-[#c97e00] text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-[#7a4b00] transition-all shadow-sm hover:shadow-md cursor-pointer"
        >
          <Plus size={18} />
          <span>Ajouter une formation</span>
        </button>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-[#c97e00] flex items-center justify-center font-bold">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Formations</div>
            <div className="text-2xl font-black text-gray-900">{courses.length}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent-50 text-accent-700 flex items-center justify-center font-bold">
            <Award size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Catégories</div>
            <div className="text-2xl font-black text-gray-900">
              {new Set(courses.map(c => c.category || 'Général')).size}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
            <DollarSign size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mensualité Moyenne</div>
            <div className="text-2xl font-black text-primary-600">{averageMonthlyFee.toLocaleString('fr-FR')} <span className="text-xs text-gray-600">F/m</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Users size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Inscrits Associés</div>
            <div className="text-2xl font-black text-gray-900">{totalStudentsEnrolled}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher une formation par nom, mot-clé ou catégorie..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-[#c97e00] focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-gray-500">
              {filteredCourses.length} formation{filteredCourses.length > 1 ? 's' : ''} trouvée{filteredCourses.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === 'ALL'
                ? 'bg-[#c97e00] text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            Toutes ({courses.length})
          </button>
          {availableCategories.map(cat => {
            const count = courses.filter(c => (c.category || 'Général') === cat).length;
            if (count === 0 && selectedCategory !== cat) return null;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === cat
                    ? 'bg-[#c97e00] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Courses Cards Grid */}
      {filteredCourses.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-amber-50 text-[#c97e00] rounded-full flex items-center justify-center mx-auto mb-3">
            <GraduationCap size={32} />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">Aucune formation correspondante</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
            {searchQuery || selectedCategory !== 'ALL'
              ? 'Aucune formation ne correspond à vos critères de recherche. Essayez de réinitialiser vos filtres.'
              : 'Aucune formation n\'est encore configurée. Ajoutez votre première formation dès maintenant.'}
          </p>
          {(searchQuery || selectedCategory !== 'ALL') ? (
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); }}
              className="text-xs font-bold text-[#c97e00] hover:underline cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          ) : (
            <button
              onClick={handleOpenAdd}
              className="bg-[#c97e00] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#7a4b00] cursor-pointer"
            >
              Ajouter une formation
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredCourses.map(c => {
            const cat = c.category || 'Général';
            const style = CATEGORY_COLORS[cat] || DEFAULT_CATEGORY_COLOR;
            const studentsCount = c._count?.subscriptions || c._count?.payments || 0;
            const regFee = c.registrationFee !== undefined && c.registrationFee !== null ? Number(c.registrationFee) : (c.price ? Number(c.price) : 45000);
            const mFee = c.monthlyFee !== undefined && c.monthlyFee !== null ? Number(c.monthlyFee) : 30000;
            const regFeeInt = c.registrationFeeInterieur !== undefined && c.registrationFeeInterieur !== null ? Number(c.registrationFeeInterieur) : 35000;
            const regFeeDias = c.registrationFeeDiaspora !== undefined && c.registrationFeeDiaspora !== null ? Number(c.registrationFeeDiaspora) : 100000;
            const hasPres = c.hasPresentiel !== false;
            const hasOnl = c.hasOnline !== false;

            return (
              <div
                key={c.id}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-between group relative"
              >
                {/* Header with category and actions */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide uppercase ${style.badge}`}>
                      {cat}
                    </span>
                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(c)}
                        className="w-8 h-8 rounded-lg bg-amber-50 text-[#c97e00] flex items-center justify-center hover:bg-amber-100 transition-colors"
                        title="Modifier cette formation"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        onClick={() => setCourseToDelete(c)}
                        className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"
                        title="Supprimer cette formation"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-black text-gray-900 text-base mb-1.5 leading-snug group-hover:text-[#c97e00] transition-colors">
                    {c.title}
                  </h3>

                  {/* Modes tags */}
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {hasPres && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        🏛️ Présentiel
                      </span>
                    )}
                    {hasOnl && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-accent-50 text-accent-700 border border-accent-200">
                        🌐 En ligne
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 mb-4">
                    {c.description || "Aucune description détaillée renseignée."}
                  </p>
                </div>

                {/* Footer with 3-Zone Pricing Breakdown */}
                <div className="pt-3 border-t border-gray-100 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Tarifs inscription par zone :
                  </div>

                  {/* Grid 3 zones */}
                  <div className="grid grid-cols-3 gap-1.5 bg-gray-50/80 p-2 rounded-lg border border-gray-100 text-center">
                    <div>
                      <div className="text-[10px] text-gray-500 font-medium">Abidjan</div>
                      <div className="text-xs font-black text-gray-900">{regFee.toLocaleString('fr-FR')} F</div>
                    </div>
                    <div className="border-x border-gray-200">
                      <div className="text-[10px] text-emerald-700 font-medium">Intérieur</div>
                      <div className="text-xs font-black text-emerald-700">{regFeeInt.toLocaleString('fr-FR')} F</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-accent-700 font-medium">Diaspora</div>
                      <div className="text-xs font-black text-accent-700">{regFeeDias.toLocaleString('fr-FR')} F</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-gray-500 font-medium">Mensualité base :</span>
                    <span className="font-black text-[#c97e00]">
                      {mFee.toLocaleString('fr-FR')} FCFA/mois
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-gray-500 font-medium">Mensualité En ligne / Both :</span>
                    <span className="font-black text-blue-600 text-[11px]">
                      {Number(c.monthlyFeeOnline || 25000).toLocaleString('fr-FR')} / {Number(c.monthlyFeeBoth || 35000).toLocaleString('fr-FR')} F
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-gray-50 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {studentsCount} inscrit{studentsCount > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FormationsView;
