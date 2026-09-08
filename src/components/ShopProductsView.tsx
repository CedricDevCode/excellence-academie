import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Package, X, Save, Loader2, ShoppingBag, Tag, Layers, Upload, Image as ImageIcon } from 'lucide-react';
import { fetchAdminProducts, createProduct, updateProduct, deleteProduct, uploadProductImage } from '../utils/api';
import { useToast } from './Toast';

const PRODUCT_TYPES = [
  { value: 'DOCUMENT', label: 'Document', color: 'bg-blue-100 text-blue-700' },
  { value: 'LIVRE', label: 'Livre', color: 'bg-purple-100 text-purple-700' },
  { value: 'AUTRE', label: 'Autre', color: 'bg-gray-100 text-gray-700' },
];

function formatPrice(n: number) {
  return Number(n).toLocaleString('fr-FR');
}

function parseImages(imageUrl: string | null | undefined): string[] {
  if (!imageUrl) return [];
  try {
    const p = JSON.parse(imageUrl);
    if (Array.isArray(p)) return p;
    return [imageUrl];
  } catch {
    return [imageUrl];
  }
}

const emptyForm = { title: '', description: '', price: '', originalPrice: '', type: 'DOCUMENT', imageUrls: [] as string[], stock: '' };

export default function ShopProductsView() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm, imageUrls: [] as string[] });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { toast, confirm } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminProducts();
      setProducts(data);
    } catch {
      toast('error', 'Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, imageUrls: [] });
    setShowForm(true);
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      title: p.title,
      description: p.description || '',
      price: String(p.price),
      originalPrice: p.originalPrice != null ? String(p.originalPrice) : '',
      type: p.type,
      imageUrls: parseImages(p.imageUrl),
      stock: p.stock != null ? String(p.stock) : '',
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm, imageUrls: [] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        price: Number(form.price),
        originalPrice: form.originalPrice !== '' ? Number(form.originalPrice) : null,
        type: form.type,
        imageUrl: form.imageUrls.length > 0 ? JSON.stringify(form.imageUrls) : '',
        stock: form.stock !== '' ? Number(form.stock) : null,
      };
      if (editingId) {
        await updateProduct(editingId, payload);
        toast('success', 'Produit mis à jour');
      } else {
        await createProduct(payload);
        toast('success', 'Produit ajouté avec succès');
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm, imageUrls: [] });
      load();
    } catch {
      toast('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm('Supprimer ce produit définitivement ?');
    if (!ok) return;
    setDeletingId(id);
    try {
      await deleteProduct(id);
      toast('success', 'Produit supprimé');
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch {
      toast('error', 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingIdx(idx);
    try {
      const result = await uploadProductImage(file);
      const urls = [...form.imageUrls];
      urls[idx] = result.url;
      setForm({ ...form, imageUrls: urls });
      toast('success', 'Image téléchargée');
    } catch {
      toast('error', 'Erreur lors du téléchargement de l\'image');
    } finally {
      setUploadingIdx(null);
      if (fileInputRefs.current[idx]) fileInputRefs.current[idx]!.value = '';
    }
  };

  const removeImageAt = (idx: number) => {
    const urls = form.imageUrls.filter((_, i) => i !== idx);
    setForm({ ...form, imageUrls: urls });
  };

  const typeInfo = (type: string) => PRODUCT_TYPES.find(t => t.value === type) || PRODUCT_TYPES[2];

  const firstImage = (p: any) => {
    const imgs = parseImages(p.imageUrl);
    return imgs[0] || '';
  };

  const imageCount = (p: any) => parseImages(p.imageUrl).length;

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .form-enter { animation: slideDown 0.35s ease-out; }
      `}</style>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <ShoppingBag size={22} className="text-orange-500" /> Gestion des Produits
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">{products.length} produit{products.length !== 1 ? 's' : ''} enregistré{products.length !== 1 ? 's' : ''}</p>
        </div>
        {!showForm && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-linear-to-r from-orange-500 to-orange-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            <Plus size={16} /> Ajouter un produit
          </button>
        )}
      </div>

      {/* Inline Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden form-enter">
          <div className="bg-linear-to-r from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="font-black text-white text-lg">
                {editingId ? 'Modifier le produit' : 'Nouveau produit'}
              </h3>
              <p className="text-orange-100 text-sm mt-0.5">
                {editingId ? 'Mettez à jour les informations du produit' : 'Ajoutez un produit à votre boutique'}
              </p>
            </div>
            <button onClick={cancelForm}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Nom du produit *
                </label>
                <input
                  required type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                  placeholder="Ex : Livre de Mathématiques CM2"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all resize-none"
                  placeholder="Décrivez le produit..."
                />
              </div>

              {/* Price / Type / Stock */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Tag size={11} /> Prix (FCFA) *
                  </label>
                  <input
                    required type="number" min="0"
                    value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                    placeholder="5 000"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Tag size={11} /> Prix original
                  </label>
                  <input
                    type="number" min="0"
                    value={form.originalPrice}
                    onChange={e => setForm({ ...form, originalPrice: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                    placeholder="6 250"
                  />
                  {form.originalPrice && Number(form.originalPrice) > Number(form.price) && (
                    <p className="text-xs text-green-600 font-bold mt-1">
                      -{Math.round((1 - Number(form.price) / Number(form.originalPrice)) * 100)}%
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Layers size={11} /> Type *
                  </label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all bg-white"
                  >
                    {PRODUCT_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Stock
                  </label>
                  <input
                    type="number" min="0"
                    value={form.stock}
                    onChange={e => setForm({ ...form, stock: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                    placeholder="Illimité"
                  />
                </div>
              </div>

              {/* Images (max 3) */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Images du produit (max 3)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[0, 1, 2].map(idx => (
                    <div key={idx}>
                      {form.imageUrls[idx] ? (
                        <div className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                          <img src={form.imageUrls[idx]} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeImageAt(idx)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-md">
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRefs.current[idx]?.click()}
                          className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center bg-gray-50 cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-all"
                        >
                          {uploadingIdx === idx ? (
                            <Loader2 size={24} className="animate-spin text-orange-400" />
                          ) : (
                            <>
                              <ImageIcon size={24} className="text-gray-300 mb-1" />
                              <span className="text-xs text-gray-400 font-medium">Image {idx + 1}</span>
                            </>
                          )}
                        </div>
                      )}
                      <input
                        ref={el => { fileInputRefs.current[idx] = el; }}
                        type="file"
                        accept="image/*"
                        onChange={e => handleImageSelect(e, idx)}
                        className="hidden"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">Formats acceptés : JPG, PNG, GIF. Max 5 Mo par image.</p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 bg-gray-50">
              <button type="button" onClick={cancelForm}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-linear-to-r from-orange-500 to-orange-600 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {submitting ? 'Enregistrement...' : (editingId ? 'Mettre à jour' : 'Ajouter le produit')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Product Grid */}
      {!showForm && (loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Loader2 size={32} className="animate-spin text-orange-400 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Chargement des produits...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <Package size={48} className="text-gray-200 mx-auto mb-4" />
          <h3 className="font-bold text-gray-700 mb-2">Aucun produit</h3>
          <p className="text-gray-400 text-sm mb-6">Commencez par ajouter votre premier produit à la boutique.</p>
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 bg-linear-to-r from-orange-500 to-orange-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:shadow-md transition-all">
            <Plus size={16} /> Ajouter un produit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {products.map(p => {
            const imgs = parseImages(p.imageUrl);
            const cnt = imgs.length;
            return (
            <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
              {/* Image */}
              <div className="relative h-24 bg-linear-to-br from-orange-50 to-amber-50 flex items-center justify-center overflow-hidden">
                {imgs[0] ? (
                  <img src={imgs[0]} alt={p.title} className="w-full h-full object-cover" />
                ) : (
                  <Package size={32} className="text-orange-200" />
                )}
                {cnt > 1 && (
                  <div className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                    +{cnt - 1}
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <button onClick={() => openEdit(p)}
                    className="w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors">
                    <Edit size={12} />
                  </button>
                  <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}
                    className="w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center text-red-600 hover:bg-red-50 transition-colors">
                    {deletingId === p.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                </div>
                <div className="absolute top-2 left-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${typeInfo(p.type).color}`}>
                    {typeInfo(p.type).label}
                  </span>
                </div>
              </div>
              {/* Content */}
              <div className="p-3">
                <h3 className="font-bold text-gray-900 text-sm truncate">{p.title}</h3>
                {p.description && <p className="text-gray-400 text-xs truncate mt-0.5">{p.description}</p>}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-black text-orange-600">{formatPrice(p.price)} <span className="text-[10px] font-normal text-gray-400">FCFA</span></span>
                  <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-lg">
                    {p.stock === null || p.stock === undefined ? 'Illimité' : `${p.stock}`}
                  </span>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

