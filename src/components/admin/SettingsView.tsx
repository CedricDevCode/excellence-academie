import { useState, useEffect } from "react";
import { User, MapPin, BookOpen, Plus, Edit, Trash2, Loader2, X, Save, CheckCircle, Camera, DollarSign, Info } from "lucide-react";
import { fetchCities, createCity, updateCity, deleteCity, updateUser, uploadProfileImage, fetchAppSettings, updateAppSettings } from "../../utils/api";
import { useToast } from "../Toast";
import FormationsView from "./FormationsView";
import { AFRICA_COUNTRIES, EUROPE_COUNTRIES } from "./helpers";

const SETTINGS_TABS = [
  { id: 'account', label: 'Compte', icon: <User size={16} /> },
  { id: 'concours', label: 'Concours', icon: <BookOpen size={16} /> },
  { id: 'tarifs', label: 'Tarification & Inscriptions', icon: <DollarSign size={16} /> },
  { id: 'cities', label: 'Villes couvertes', icon: <MapPin size={16} /> },
];

export default function SettingsView({ currentUser, onRefresh }: { currentUser: any; onRefresh?: () => void }) {
  const [activeSettingsTab, setActiveSettingsTab] = useState(() => localStorage.getItem('adminSettingsTab') || 'account');

  const [form, setForm] = useState({ name: currentUser?.name || 'Administrateur', email: currentUser?.email || 'admin@excellence.ci', oldPass: '', newPass: '', image: currentUser?.image || '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const [cities, setCities] = useState<any[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [showCityModal, setShowCityModal] = useState(false);
  const [editingCity, setEditingCity] = useState<any>(null);
  const [cityForm, setCityForm] = useState({ name: '', country: '' });
  const [citySubmitting, setCitySubmitting] = useState(false);

  // App Settings / Tarifs
  const [tarifs, setTarifs] = useState({
    additionalCourseAmount: 10000,
    defaultRegistrationFee: 45000,
    defaultRegistrationFeeInterieur: 35000,
    defaultRegistrationFeeDiaspora: 100000,
  });
  const [tarifsLoading, setTarifsLoading] = useState(false);
  const [tarifsSaving, setTarifsSaving] = useState(false);

  const { toast, confirm } = useToast();

  const loadCities = async () => {
    setCitiesLoading(true);
    try { const data = await fetchCities(); setCities(data); } catch { } finally { setCitiesLoading(false); }
  };

  const loadTarifs = async () => {
    setTarifsLoading(true);
    try {
      const data = await fetchAppSettings();
      if (data) {
        setTarifs({
          additionalCourseAmount: data.additionalCourseAmount ?? 10000,
          defaultRegistrationFee: data.defaultRegistrationFee ?? 45000,
          defaultRegistrationFeeInterieur: data.defaultRegistrationFeeInterieur ?? 35000,
          defaultRegistrationFeeDiaspora: data.defaultRegistrationFeeDiaspora ?? 100000,
        });
      }
    } catch (err) {
      console.error('Erreur chargement paramètres :', err);
    } finally {
      setTarifsLoading(false);
    }
  };

  useEffect(() => { loadCities(); loadTarifs(); }, []);
  useEffect(() => { localStorage.setItem('adminSettingsTab', activeSettingsTab); }, [activeSettingsTab]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      setMessageType('error');
      setMessage('Le nom d\'affichage est requis.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      if (currentUser?.id) {
        await updateUser(currentUser.id, {
          name: form.name,
          image: form.image,
          ...(form.oldPass && form.newPass ? { password: form.newPass } : {}),
        });
      }
      setMessageType('success');
      setMessage('Paramètres mis à jour avec succès.');
      setForm(prev => ({ ...prev, oldPass: '', newPass: '' }));
      if (onRefresh) onRefresh();
    } catch {
      setMessageType('error');
      setMessage('Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  };

  const handleCitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCitySubmitting(true);
    try {
      if (editingCity) {
        await updateCity(editingCity.id, cityForm);
        toast('success', 'Ville modifiée avec succès');
      } else {
        await createCity(cityForm);
        toast('success', 'Ville ajoutée avec succès');
      }
      setShowCityModal(false);
      setEditingCity(null);
      setCityForm({ name: '', country: '' });
      loadCities();
    } catch (err: any) {
      toast('error', err?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setCitySubmitting(false);
    }
  };

  const openCityModal = (city?: any) => {
    if (city) {
      setEditingCity(city);
      setCityForm({ name: city.name, country: city.country || '' });
    } else {
      setEditingCity(null);
      setCityForm({ name: '', country: "Côte d'Ivoire" });
    }
    setShowCityModal(true);
  };

  const handleDeleteCity = async (id: string) => {
    const ok = await confirm('Supprimer cette ville ?');
    if (!ok) return;
    try {
      await deleteCity(id);
      setCities(cities.filter(c => c.id !== id));
      toast('success', 'Ville supprimée');
    } catch {
      toast('error', 'Erreur lors de la suppression');
    }
  };

  const initials = form.name?.split(" ").map((s: string) => s[0]).join("").toUpperCase() || "A";

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded shadow-sm border border-gray-100 p-1.5 flex gap-1">
        {SETTINGS_TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveSettingsTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded text-sm font-semibold transition-all ${activeSettingsTab === tab.id ? 'bg-[#c97e00] text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Account Settings */}
      {activeSettingsTab === 'account' && (
        <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-linear-to-r from-primary-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded bg-[#c97e00] flex items-center justify-center text-white"><User size={22} /></div>
              <div>
                <h2 className="font-black text-gray-900">Mon compte</h2>
                <p className="text-gray-500 text-sm">Informations personnelles et sécurité</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {message && (
              <div className={`px-4 py-3 rounded text-sm font-semibold ${messageType === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {message}
              </div>
            )}
            <div className="flex items-center gap-5">
              <div className="relative group">
                <label className="cursor-pointer block">
                  {form.image ? (
                    <img src={form.image} alt="Photo" className="w-20 h-20 rounded-full object-cover shadow-md border-2 border-white" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-linear-to-br from-[#c97e00] to-primary-400 flex items-center justify-center text-white text-2xl font-black shadow-md">{initials}</div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={20} className="text-white" />
                  </div>
                </label>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 border-2 border-white rounded-full" />
                <input type="file" accept="image/*" className="hidden" id="photo-upload"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) { setMessage('Image trop volumineuse (max 2 Mo)'); setMessageType('error'); return; }
                    try {
                      const { url } = await uploadProfileImage(file);
                      setForm({ ...form, image: url });
                    } catch (err: any) {
                      setMessage(err.message || "Erreur lors de l'upload"); setMessageType('error');
                    }
                  }} />
              </div>
              <div>
                <div className="font-bold text-gray-900">{form.name || 'Administrateur'}</div>
                <div className="text-gray-500 text-sm">{currentUser?.email}</div>
                <div className="mt-2">
                  <span className="inline-flex items-center gap-1 bg-primary-50 text-[#c97e00] text-xs font-semibold px-2.5 py-1 rounded-full">
                    <CheckCircle size={10} /> Administrateur
                  </span>
                </div>
                <label htmlFor="photo-upload" className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#c97e00] hover:underline cursor-pointer">
                  <Camera size={12} /> Changer la photo
                </label>
              </div>
            </div>
            <hr className="border-gray-100" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom d'affichage</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                <input value={form.email} disabled
                  className="w-full px-4 py-2.5 border border-gray-200 rounded text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
              </div>
            </div>
            <hr className="border-gray-100" />
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Changer de mot de passe</h3>
              <p className="text-gray-500 text-xs mb-4">Laissez vides si vous ne souhaitez pas changer votre mot de passe.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mot de passe actuel</label>
                  <input type="password" value={form.oldPass} onChange={e => setForm({ ...form, oldPass: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nouveau mot de passe</label>
                  <input type="password" value={form.newPass} onChange={e => setForm({ ...form, newPass: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded text-sm focus:border-[#c97e00] focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all" />
                </div>
              </div>
            </div>
            <div className="pt-2 flex justify-end border-t border-gray-100">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 bg-[#c97e00] text-white px-6 py-2.5 rounded font-bold text-sm hover:bg-[#6b4500] transition-all disabled:opacity-50 shadow-sm">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* City Management */}
      {activeSettingsTab === 'cities' && (
        <div className="bg-white rounded shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-linear-to-r from-accent-50 to-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded bg-accent-600 flex items-center justify-center text-white"><MapPin size={22} /></div>
              <div>
                <h2 className="font-black text-gray-900">Villes couvertes</h2>
                <p className="text-gray-500 text-sm">Ajoutez et gérez les villes où vous opérez</p>
              </div>
            </div>
            <button onClick={() => openCityModal()}
              className="flex items-center gap-2 bg-accent-600 text-white px-4 py-2.5 rounded font-bold text-sm hover:bg-accent-700 transition-all shadow-sm">
              <Plus size={16} /> Nouvelle ville
            </button>
          </div>
          <div className="p-6">
            {citiesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={28} className="animate-spin text-accent-700" />
              </div>
            ) : cities.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-accent-50 flex items-center justify-center mx-auto mb-4">
                  <MapPin size={32} className="text-accent-300" />
                </div>
                <p className="text-gray-500 font-semibold">Aucune ville couverte pour le moment</p>
                <p className="text-gray-400 text-sm mt-1">Ajoutez les villes où vous avez des étudiants ou des dépenses.</p>
                <button onClick={() => openCityModal()}
                  className="mt-4 inline-flex items-center gap-2 bg-accent-600 text-white px-5 py-2.5 rounded font-bold text-sm hover:bg-accent-700 transition-all">
                  <Plus size={16} /> Ajouter une ville
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-500"><span className="font-bold text-gray-900">{cities.length}</span> ville{cities.length > 1 ? 's' : ''} enregistrée{cities.length > 1 ? 's' : ''}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cities.map(city => (
                    <div key={city.id} className="group relative bg-white border border-gray-200 rounded p-5 hover:border-accent-200 hover:shadow-md transition-all duration-200">
                      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openCityModal(city)}
                          className="w-8 h-8 bg-white rounded flex items-center justify-center text-gray-400 hover:text-primary-600 hover:bg-primary-50 shadow-sm border border-gray-100">
                          <Edit size={13} />
                        </button>
                        <button onClick={() => handleDeleteCity(city.id)}
                          className="w-8 h-8 bg-white rounded flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 shadow-sm border border-gray-100">
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="w-11 h-11 rounded bg-linear-to-br from-accent-700 to-accent-700 flex items-center justify-center text-white font-black text-sm mb-3 shadow-sm">
                        {city.name.slice(0, 2).toUpperCase()}
                      </div>
                      <h3 className="font-bold text-gray-900">{city.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-gray-400 text-xs">{city.country}</span>
                        <span className="text-gray-300">•</span>
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${city.isActive !== false ? 'text-green-600' : 'text-red-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${city.isActive !== false ? 'bg-green-400' : 'bg-red-400'}`} />
                          {city.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Concours */}
      {activeSettingsTab === 'concours' && <FormationsView />}

      {/* Tarification & Inscriptions */}
      {activeSettingsTab === 'tarifs' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-linear-to-r from-amber-50/50 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#c97e00] flex items-center justify-center text-white shadow-sm">
                <DollarSign size={24} />
              </div>
              <div>
                <h2 className="font-black text-gray-900 text-lg">Paramètres de Tarification & Inscriptions</h2>
                <p className="text-gray-500 text-xs">Règles globales de calcul pour les formations supplémentaires et les zones</p>
              </div>
            </div>

            <button
              onClick={async () => {
                setTarifsSaving(true);
                try {
                  await updateAppSettings(tarifs);
                  toast('success', 'Paramètres de tarification enregistrés avec succès');
                } catch (err: any) {
                  toast('error', err?.message || 'Erreur lors de la sauvegarde');
                } finally {
                  setTarifsSaving(false);
                }
              }}
              disabled={tarifsSaving || tarifsLoading}
              className="flex items-center gap-2 bg-[#c97e00] text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#7a4b00] transition-all shadow-sm hover:shadow-md disabled:opacity-50 cursor-pointer"
            >
              {tarifsSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>Enregistrer les tarifs</span>
            </button>
          </div>

          <div className="p-6 space-y-6">
            {tarifsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={28} className="animate-spin text-[#c97e00]" />
              </div>
            ) : (
              <div className="space-y-6 max-w-3xl">
                
                {/* 1. Tarif formation supplémentaire */}
                <div className="bg-amber-50/60 border-2 border-amber-200/80 rounded-xl p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                        <span>🎓 Tarif Formation Supplémentaire (Étudiant déjà inscrit)</span>
                      </h3>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        Lorsqu'un étudiant déjà actif dans l'académie souhaite s'inscrire à une nouvelle formation, il ne repayera pas les frais de dossier initiaux complets. Ce montant est automatiquement ajouté sur sa mensualité.
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                      Défaut: 10 000 FCFA
                    </span>
                  </div>

                  <div className="pt-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                      Montant formation supplémentaire (FCFA) *
                    </label>
                    <div className="relative max-w-xs">
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={tarifs.additionalCourseAmount}
                        onChange={e => setTarifs({ ...tarifs, additionalCourseAmount: Number(e.target.value) || 0 })}
                        className="w-full pl-4 pr-16 py-2.5 border-2 border-amber-300 rounded-lg text-base font-black text-gray-900 bg-white focus:border-[#c97e00] focus:outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">
                        FCFA
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1.5">
                      Exemple : Si l'étudiant a une mensualité de 30 000 F et ajoute un 2ème cours, il paiera (mensualité nouveau cours + {tarifs.additionalCourseAmount.toLocaleString('fr-FR')} F).
                    </p>
                  </div>
                </div>

                {/* 2. Tarifs d'inscription par défaut par zone */}
                <div className="space-y-4">
                  <h3 className="font-black text-gray-900 text-sm uppercase tracking-wider text-gray-500 flex items-center gap-2">
                    <Info size={16} />
                    <span>Frais d'inscription par défaut selon la zone géographique</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Abidjan */}
                    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-2">
                      <div className="text-xs font-bold text-gray-700">🏙️ Zone Abidjan</div>
                      <p className="text-[11px] text-gray-500">Ville d'Abidjan (standard)</p>
                      <div className="relative pt-1">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={tarifs.defaultRegistrationFee}
                          onChange={e => setTarifs({ ...tarifs, defaultRegistrationFee: Number(e.target.value) || 0 })}
                          className="w-full pl-3 pr-12 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-900 bg-white"
                        />
                        <span className="absolute right-2.5 top-[13px] text-[10px] font-bold text-gray-400">FCFA</span>
                      </div>
                    </div>

                    {/* Intérieur CI */}
                    <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/30 space-y-2">
                      <div className="text-xs font-bold text-emerald-800">📍 Intérieur de la CI</div>
                      <p className="text-[11px] text-emerald-600">Bouaké, Yamoussoukro, Daloa...</p>
                      <div className="relative pt-1">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={tarifs.defaultRegistrationFeeInterieur}
                          onChange={e => setTarifs({ ...tarifs, defaultRegistrationFeeInterieur: Number(e.target.value) || 0 })}
                          className="w-full pl-3 pr-12 py-2 border border-emerald-300 rounded-lg text-sm font-bold text-emerald-900 bg-white"
                        />
                        <span className="absolute right-2.5 top-[13px] text-[10px] font-bold text-gray-400">FCFA</span>
                      </div>
                    </div>

                    {/* Diaspora */}
                    <div className="border border-accent-200 rounded-xl p-4 bg-accent-50/30 space-y-2">
                      <div className="text-xs font-bold text-accent-800">🌍 Diaspora / En ligne</div>
                      <p className="text-[11px] text-accent-600">Résidents hors Côte d'Ivoire</p>
                      <div className="relative pt-1">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={tarifs.defaultRegistrationFeeDiaspora}
                          onChange={e => setTarifs({ ...tarifs, defaultRegistrationFeeDiaspora: Number(e.target.value) || 0 })}
                          className="w-full pl-3 pr-12 py-2 border border-accent-300 rounded-lg text-sm font-bold text-accent-900 bg-white"
                        />
                        <span className="absolute right-2.5 top-[13px] text-[10px] font-bold text-gray-400">FCFA</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={async () => {
                      setTarifsSaving(true);
                      try {
                        await updateAppSettings(tarifs);
                        toast('success', 'Paramètres de tarification enregistrés avec succès');
                      } catch (err: any) {
                        toast('error', err?.message || 'Erreur lors de la sauvegarde');
                      } finally {
                        setTarifsSaving(false);
                      }
                    }}
                    disabled={tarifsSaving}
                    className="flex items-center gap-2 bg-[#c97e00] text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#7a4b00] transition-all shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {tarifsSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    <span>Sauvegarder les paramètres</span>
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* City Modal */}
      {showCityModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 modal-overlay">
          <div className="bg-white rounded p-6 w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-accent-100 flex items-center justify-center text-accent-700">
                  <MapPin size={20} />
                </div>
                <h3 className="font-black text-gray-900">{editingCity ? 'Modifier' : 'Ajouter'} une ville</h3>
              </div>
              <button onClick={() => { setShowCityModal(false); setEditingCity(null); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCitySubmit} className="space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nom de la ville *</label>
                <input type="text" value={cityForm.name} onChange={e => setCityForm({ ...cityForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded text-sm focus:border-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-100 transition-all" required placeholder="Ex: Abidjan, Bouaké..." />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Pays *</label>
                <select value={cityForm.country} onChange={e => setCityForm({ ...cityForm, country: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded text-sm focus:border-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-100 transition-all" required>
                  <option value="">Sélectionner un pays</option>
                  <optgroup label="Afrique">
                    {AFRICA_COUNTRIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Europe">
                    {EUROPE_COUNTRIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div className="pt-2 flex gap-3 justify-end border-t border-gray-100">
                <button type="button" onClick={() => { setShowCityModal(false); setEditingCity(null); }}
                  className="px-4 py-2.5 rounded border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all">
                  Annuler
                </button>
                <button type="submit" disabled={citySubmitting}
                  className="flex items-center gap-2 bg-accent-600 text-white px-5 py-2.5 rounded font-bold text-sm hover:bg-accent-700 transition-all disabled:opacity-50">
                  {citySubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  {citySubmitting ? 'Enregistrement...' : editingCity ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
