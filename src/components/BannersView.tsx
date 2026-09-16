import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Upload, Image as ImageIcon, X, Save, Loader2, Eye, EyeOff, Calendar } from 'lucide-react';
import api, { uploadProductImage } from '../utils/api';
import { useToast } from './Toast';

interface Product {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
}

interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  backgroundColor: string;
  badgeText?: string;
  featured: boolean;
  displayOrder: number;
  isActive: boolean;
  product?: Product | null;
  productId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

interface BannersViewProps {
  mode?: 'shop' | 'homepage';
}

const GRADIENT_COLORS = [
  { value: 'from-[#FF6B00] to-[#e65c00]', label: 'Orange (Defaut)' },
  { value: 'from-red-600 to-red-700', label: 'Rouge' },
  { value: 'from-blue-600 to-blue-700', label: 'Bleu' },
  { value: 'from-green-600 to-green-700', label: 'Vert' },
  { value: 'from-purple-600 to-purple-700', label: 'Violet' },
  { value: 'from-pink-600 to-pink-700', label: 'Rose' },
];

const emptyForm = {
  title: '',
  subtitle: '',
  description: '',
  imageUrl: '',
  backgroundColor: 'from-[#FF6B00] to-[#e65c00]',
  badgeText: 'Promotion',
  featured: false,
  displayOrder: 0,
  isActive: true,
  productId: '',
  startDate: '',
  endDate: ''
};

export default function BannersView({ mode = 'shop' }: BannersViewProps) {
  const isHomepageMode = mode === 'homepage';
  const [banners, setBanners] = useState<Banner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast, confirm } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [bannersRes, productsRes] = await Promise.all([
        api.get('/banners'),
        api.get('/shop/products')
      ]);
      setBanners(bannersRes.data);
      setProducts(productsRes.data);
    } catch (error: any) {
      toast('error', 'Erreur lors du chargement');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, featured: isHomepageMode });
    setShowForm(true);
  };

  const openEdit = (banner: Banner) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle || '',
      description: banner.description || '',
      imageUrl: banner.imageUrl || '',
      backgroundColor: banner.backgroundColor,
      badgeText: banner.badgeText || 'Promotion',
      featured: banner.featured || isHomepageMode,
      displayOrder: banner.displayOrder,
      isActive: banner.isActive,
      productId: banner.productId || '',
      startDate: banner.startDate ? new Date(banner.startDate).toISOString().split('T')[0] : '',
      endDate: banner.endDate ? new Date(banner.endDate).toISOString().split('T')[0] : ''
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      toast('error', 'Le titre est requis');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        subtitle: form.subtitle,
        description: form.description,
        imageUrl: form.imageUrl,
        backgroundColor: isHomepageMode ? emptyForm.backgroundColor : form.backgroundColor,
        badgeText: isHomepageMode ? '' : form.badgeText,
        featured: isHomepageMode ? true : form.featured,
        displayOrder: parseInt(String(form.displayOrder)),
        isActive: form.isActive,
        productId: isHomepageMode ? null : form.productId || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null
      };

      if (editingId) {
        await api.put(`/banners/${editingId}`, payload);
        toast('success', 'Bannière mise à jour');
      } else {
        await api.post('/banners', payload);
        toast('success', 'Bannière créée');
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await loadData();
    } catch (error: any) {
      toast('error', error.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm('Supprimer cette bannière définitivement ?');
    if (!ok) return;

    setDeletingId(id);
    try {
      await api.delete(`/banners/${id}`);
      toast('success', 'Bannière supprimée');
      await loadData();
    } catch (error: any) {
      toast('error', error.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const response = await uploadProductImage(file);
      setForm({ ...form, imageUrl: response.url || response.imageUrl });
      toast('success', 'Image téléchargée');
    } catch (error: any) {
      toast('error', 'Erreur lors du téléchargement');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-[#FF6B00] mx-auto mb-2" />
          <p className="text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  const displayedBanners = isHomepageMode ? banners.filter((banner) => banner.featured) : banners;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{isHomepageMode ? 'Images À la une' : 'Bannières de la boutique'}</h2>
          <p className="text-sm text-gray-500 mt-1">{isHomepageMode ? 'Ajoutez les images qui apparaîtront dans la section À la une de la page d\'accueil.' : 'Gérez les bannières promotionnelles visibles dans la boutique.'}</p>
        </div>
        {!showForm && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6B00] text-white font-bold rounded-lg hover:bg-[#e65c00] transition-colors">
            <Plus size={18} />
            {isHomepageMode ? 'Nouvelle image' : 'Nouvelle bannière'}
          </button>
        )}
      </div>

      {/* Inline Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-xl border-2 border-orange-200 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-50 to-amber-50/50 p-5 border-b border-orange-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ImageIcon size={20} className="text-[#FF6B00]" />
              <h3 className="font-black text-[#002855] text-base">
                {editingId ? `Modifier ${isHomepageMode ? 'l\'image' : 'la bannière'}` : `Nouvelle ${isHomepageMode ? 'image' : 'bannière'}`}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  {isHomepageMode ? 'Titre de l\'image *' : 'Titre de la bannière *'}
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder={isHomepageMode ? 'Ex: Offre du mois' : 'Ex: Nouvelle Collection'}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none"
                />
              </div>

              {!isHomepageMode && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Sous-titre</label>
                    <input
                      type="text"
                      value={form.subtitle}
                      onChange={e => setForm({ ...form, subtitle: e.target.value })}
                      placeholder="Ex: Jusqu'à -50%"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Badge</label>
                    <input
                      type="text"
                      value={form.badgeText}
                      onChange={e => setForm({ ...form, badgeText: e.target.value })}
                      placeholder="Ex: Promo"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none"
                    />
                  </div>
                </>
              )}

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Détails de la bannière..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none resize-none"
                />
              </div>

              {/* Image */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Image</label>
                {form.imageUrl && (
                  <img src={form.imageUrl} alt="Preview" className="w-full h-40 object-cover rounded-xl mb-3" />
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 w-full justify-center text-sm font-bold text-gray-700 transition-colors"
                >
                  {uploadingImage ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {uploadingImage ? 'Téléchargement...' : 'Choisir une image'}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </div>

              {!isHomepageMode && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Couleur de fond</label>
                    <select
                      value={form.backgroundColor}
                      onChange={e => setForm({ ...form, backgroundColor: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none"
                    >
                      {GRADIENT_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Produit mis en avant</label>
                    <select
                      value={form.productId}
                      onChange={e => setForm({ ...form, productId: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none"
                    >
                      <option value="">Aucun produit</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Date de début</label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={e => setForm({ ...form, startDate: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Date de fin</label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={e => setForm({ ...form, endDate: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Ordre d'affichage</label>
                <input
                  type="number"
                  value={form.displayOrder}
                  onChange={e => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none"
                />
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={e => setForm({ ...form, featured: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300"
                  />
                  <span className="text-sm font-bold text-gray-700">{isHomepageMode ? 'Afficher dans À la une' : 'En avant (premium)'}</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={e => setForm({ ...form, isActive: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300"
                  />
                  <span className="text-sm font-bold text-gray-700">{form.isActive ? 'Actif' : 'Inactif'}</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={cancelForm}
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
                <span>{editingId ? 'Enregistrer les modifications' : 'Créer'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Banners List */}
      {displayedBanners.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <ImageIcon size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">{isHomepageMode ? 'Aucune image À la une' : 'Aucune bannière'}</p>
          <p className="text-gray-400 text-sm mt-1">{isHomepageMode ? 'Ajoutez votre première image' : 'Créez votre première bannière'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedBanners.map((banner) => (
            <div key={banner.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between hover:border-gray-300 transition-colors">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {banner.imageUrl ? (
                  <img src={banner.imageUrl} alt={banner.title} className="w-20 h-20 object-cover rounded-lg shrink-0" />
                ) : (
                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center shrink-0">
                    <ImageIcon size={28} className="text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 truncate">{banner.title}</h3>
                    {banner.featured && <span className="text-xs font-bold px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full shrink-0">{isHomepageMode ? 'À la une' : 'En avant'}</span>}
                    {!banner.isActive && <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full shrink-0">Inactif</span>}
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-0.5">{banner.subtitle || banner.description || 'Pas de description'}</p>
                  {!isHomepageMode && banner.product && <p className="text-xs text-[#FF6B00] font-bold mt-1">Produit: {banner.product.title}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(banner)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-blue-600">
                  <Edit size={18} />
                </button>
                <button onClick={() => handleDelete(banner.id)} disabled={deletingId === banner.id} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600 disabled:opacity-50">
                  {deletingId === banner.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
