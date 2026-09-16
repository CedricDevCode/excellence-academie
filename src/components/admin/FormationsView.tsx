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
  
  // Inline panel states (replaces modal)
  const [showPanel, setShowPanel] = useState(false);
  const [form, setForm] = useState({
    id: '',
    title: '',
    category: 'Concours Juridiques & Judiciaires',
    description: '',
    registrationFee: '35000',
    monthlyFee: '30000',
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
      registrationFee: '35000',
      monthlyFee: '30000',
      hasPresentiel: true,
      hasOnline: true,
    });
    setIsCustomCategory(false);
    setCustomCategory('');
    setShowPanel(true);
  };

  const handleEdit = (c: any) => {
    const isKnown = formCategoryOptions.includes(c.category);
    setForm({
      id: c.id,
      title: c.title || '',
      category: isKnown ? c.category : 'CUSTOM',
      description: c.description || '',
      registrationFee: String(c.registrationFee !== undefined ? c.registrationFee : (c.price || 35000)),
      monthlyFee: String(c.monthlyFee !== undefined ? c.monthlyFee : 30000),
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
    setShowPanel(true);
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

    const regFee = Number(form.registrationFee) || 35000;
    const mFee = Number(form.monthlyFee) || 30000;

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
      setShowPanel(false);
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

  return (
    <div className="flex gap-6">
      {/* Main list column */}
      <div className={`flex-1 min-w-0 space-y-6 transition-all duration-300 ${showPanel ? 'hidden xl:block' : ''}`}>
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-[#0056B3]">
              <GraduationCap size={22} />
            </span>
            <h2 className="text-xl font-black text-gray-900">Gestion des Formations & Concours</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Gérez le catalogue des filières dispensées par Excellence Académie, leurs catégories et tarifs officiels.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 bg-[#0056B3] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#003d80] transition-colors shadow-sm"
        >
          <Plus size={18} />
          <span>Ajouter une formation</span>
        </button>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0056B3] flex items-center justify-center font-bold">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Formations</div>
            <div className="text-2xl font-black text-gray-900">{courses.length}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Award size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Catégories</div>
            <div className="text-2xl font-black text-gray-900">
              {new Set(courses.map(c => c.category || 'Général')).size}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-[#FF6B00] flex items-center justify-center font-bold">
            <DollarSign size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mensualité Moyenne</div>
            <div className="text-2xl font-black text-[#FF6B00]">{averageMonthlyFee.toLocaleString('fr-FR')} <span className="text-xs text-gray-600">F/m</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
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
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher une formation par nom, mot-clé ou catégorie..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-[#0056B3] focus:outline-none transition-all"
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
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-[#0056B3] text-white shadow-sm'
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
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#0056B3] text-white shadow-sm'
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
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-blue-50 text-[#0056B3] rounded-full flex items-center justify-center mx-auto mb-3">
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
              className="text-xs font-bold text-[#0056B3] hover:underline"
            >
              Réinitialiser les filtres
            </button>
          ) : (
            <button
              onClick={handleOpenAdd}
              className="bg-[#0056B3] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#003d80]"
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
            const regFee = c.registrationFee !== undefined && c.registrationFee !== null ? Number(c.registrationFee) : (c.price ? Number(c.price) : 35000);
            const mFee = c.monthlyFee !== undefined && c.monthlyFee !== null ? Number(c.monthlyFee) : 30000;
            const hasPres = c.hasPresentiel !== false;
            const hasOnl = c.hasOnline !== false;

            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all flex flex-col justify-between group relative"
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
                        className="w-8 h-8 rounded-lg bg-blue-50 text-[#0056B3] flex items-center justify-center hover:bg-blue-100 transition-colors"
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
                  <h3 className="font-black text-gray-900 text-base mb-1.5 leading-snug group-hover:text-[#0056B3] transition-colors">
                    {c.title}
                  </h3>

                  {/* Modes tags */}
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {hasPres && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        🏛️ Présentiel
                      </span>
                    )}
                    {hasOnl && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        🌐 En ligne
                      </span>
                    )}
                    {!hasPres && !hasOnl && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-50 text-gray-500 border border-gray-200">
                        Mode non spécifié
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 mb-4">
                    {c.description || "Aucune description détaillée renseignée."}
                  </p>
                </div>

                {/* Footer with Price breakdown & Students */}
                <div className="pt-3 border-t border-gray-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-medium">Inscription :</span>
                    <span className="font-bold text-gray-900">
                      {regFee.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-medium">Mensualité :</span>
                    <span className="font-black text-[#FF6B00]">
                      {mFee.toLocaleString('fr-FR')} FCFA/mois
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
      </div>{/* end main list column */}

      {/* ─── Inline Side Panel: Ajouter / Modifier une formation ─── */}
      {showPanel && (
        <div className="w-full xl:w-[420px] shrink-0">
          <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 flex flex-col sticky top-4" style={{maxHeight: 'calc(100vh - 7rem)'}}>
            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-[#0056B3]/5 to-blue-50/50 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-[#0056B3] text-white shadow-sm">
                  <GraduationCap size={18} />
                </span>
                <div>
                  <h3 className="font-black text-gray-900 text-sm">
                    {form.id ? 'Modifier la formation' : 'Nouvelle formation'}
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    {form.id ? 'Modifier les informations et tarifs' : 'Renseigner les informations de la filière'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPanel(false)}
                className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                title="Fermer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
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
                    placeholder="Ex: Magistrature, ENA, Police, Greffe..."
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none transition-colors"
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
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none bg-white transition-colors"
                  >
                    {formCategoryOptions.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="CUSTOM">+ Autre catégorie personnalisée...</option>
                  </select>

                  {isCustomCategory && (
                    <div className="mt-2">
                      <input
                        type="text"
                        required
                        value={customCategory}
                        onChange={e => setCustomCategory(e.target.value)}
                        placeholder="Nom de la nouvelle catégorie..."
                        className="w-full px-4 py-2 border-2 border-[#0056B3]/40 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none bg-blue-50/20"
                      />
                    </div>
                  )}
                </div>

                {/* Tarifs (2 colonnes : Inscription + Mensualité) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
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
                        placeholder="Ex: 35000"
                        className="w-full pl-3 pr-14 py-2 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:border-[#0056B3] focus:outline-none transition-colors"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-500">
                        FCFA
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Frais uniques d'entrée</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                      Coût Mensualité (FCFA / mois) *
                    </label>
                    <div className="relative">
                      <input
                        required
                        type="number"
                        min="0"
                        step="1000"
                        value={form.monthlyFee}
                        onChange={e => setForm({ ...form, monthlyFee: e.target.value })}
                        placeholder="Ex: 30000"
                        className="w-full pl-3 pr-14 py-2 border-2 border-gray-200 rounded-xl text-sm font-bold text-[#FF6B00] focus:border-[#0056B3] focus:outline-none transition-colors"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-500">
                        FCFA/m
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Mensualité standard</p>
                  </div>
                </div>

                {/* Modes de formation dispensés */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                    Modes de formation dispensés *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${form.hasPresentiel ? "border-[#0056B3] bg-blue-50/50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                      <input
                        type="checkbox"
                        checked={form.hasPresentiel}
                        onChange={e => setForm({ ...form, hasPresentiel: e.target.checked })}
                        className="w-4 h-4 accent-[#0056B3] rounded"
                      />
                      <div>
                        <div className="text-sm font-bold text-gray-900">🏛️ Présentiel</div>
                        <div className="text-[11px] text-gray-500">Cours en centre / salle</div>
                      </div>
                    </label>

                    <label className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${form.hasOnline ? "border-purple-500 bg-purple-50/50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                      <input
                        type="checkbox"
                        checked={form.hasOnline}
                        onChange={e => setForm({ ...form, hasOnline: e.target.checked })}
                        className="w-4 h-4 accent-purple-600 rounded"
                      />
                      <div>
                        <div className="text-sm font-bold text-gray-900">🌐 En Ligne</div>
                        <div className="text-[11px] text-gray-500">À distance (Meet, visio)</div>
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
                    rows={4}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Détails sur les modules dispensés, durée, conditions d'accès, prérequis..."
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-[#0056B3] focus:outline-none resize-none transition-colors"
                  />
                </div>
              </div>

              {/* Panel footer */}
              <div className="p-4 border-t border-gray-100 shrink-0 flex justify-end gap-3 bg-gray-50/70">
                <button
                  type="button"
                  onClick={() => setShowPanel(false)}
                  className="px-4 py-2 text-gray-500 font-semibold text-sm hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-[#0056B3] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#003d80] transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>{form.id ? 'Mettre à jour' : 'Enregistrer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirmation de suppression */}
      {courseToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6">
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
              Elle sera retirée des formulaires d'inscription et du catalogue du site.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCourseToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 text-gray-600 font-semibold text-sm hover:bg-gray-100 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
              >
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

export default FormationsView;
