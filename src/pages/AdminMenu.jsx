import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Eye, EyeOff, X, Upload, Layers, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { validateRequiredText, validatePriceInt, validateDiscountPercent, validateImageMime } from '../lib/validation';
import EmptyState from '../components/EmptyState';
import AdminProductVariants from './AdminProductVariants';

export default function AdminMenu() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', category_id: '', description: '', image_url: '', is_available: true, discount_percent: '' });
  const [imageFile, setImageFile] = useState(null);
  const [showVariants, setShowVariants] = useState(false);
  const [variantProductId, setVariantProductId] = useState(null);

  // Category management
  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState('');
  const [savingCat, setSavingCat] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('products').select('*, categories(name)').order('id'),
    ]);
    setCategories(cats || []);
    setProducts(prods || []);
    setLoading(false);
  }

  function openAdd() {
    setEditing(null);
    setForm({ name: '', price: '', category_id: categories[0]?.id || '', description: '', image_url: '', is_available: true, discount_percent: '' });
    setImageFile(null);
    setShowForm(true);
  }

  function openEdit(product) {
    setEditing(product);
    setForm({
      name: product.name,
      price: String(product.price),
      category_id: String(product.category_id),
      description: product.description || '',
      image_url: product.image_url || '',
      is_available: product.is_available,
      discount_percent: product.discount_percent != null ? String(product.discount_percent) : '',
    });
    setImageFile(null);
    setShowForm(true);
  }

  async function uploadImage(file) {
    const mimeCheck = validateImageMime(file);
    if (!mimeCheck.ok) {
      alert(mimeCheck.message);
      throw new Error(mimeCheck.message);
    }
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);

    try {
      const nameCheck = validateRequiredText(form.name, { max: 200, label: 'Nama produk' });
      if (!nameCheck.ok) {
        alert(nameCheck.message);
        setSaving(false);
        return;
      }

      const priceCheck = validatePriceInt(form.price, { min: 0, max: 100_000_000, label: 'Harga' });
      if (!priceCheck.ok) {
        alert(priceCheck.message);
        setSaving(false);
        return;
      }

      const discountCheck = validateDiscountPercent(form.discount_percent, { allowEmpty: true });
      if (!discountCheck.ok) {
        alert(discountCheck.message);
        setSaving(false);
        return;
      }

      let imageUrl = form.image_url;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const payload = {
        name: nameCheck.value,
        price: priceCheck.value,
        category_id: parseInt(form.category_id, 10),
        description: form.description.trim() || null,
        image_url: imageUrl || null,
        is_available: form.is_available,
        discount_percent: discountCheck.value,
      };

      if (editing) {
        await supabase.from('products').update(payload).eq('id', editing.id);
      } else {
        await supabase.from('products').insert(payload);
      }

      setShowForm(false);
      fetchData();
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product) {
    if (!confirm(`Hapus "${product.name}"?`)) return;
    await supabase.from('products').delete().eq('id', product.id);
    fetchData();
  }

  async function toggleAvailable(product) {
    await supabase.from('products').update({ is_available: !product.is_available }).eq('id', product.id);
    fetchData();
  }

  async function handleAddCategory(e) {
    e.preventDefault();
    if (!catName.trim()) return;
    setSavingCat(true);
    const maxSort = categories.reduce((max, c) => Math.max(max, c.sort_order), 0);
    await supabase.from('categories').insert({ name: catName.trim(), sort_order: maxSort + 1 });
    setCatName('');
    setShowCatForm(false);
    setSavingCat(false);
    fetchData();
  }

  async function handleDeleteCategory(cat) {
    const hasProducts = products.some((p) => p.category_id === cat.id);
    if (hasProducts) { alert('Tidak bisa hapus kategori yang masih punya produk'); return; }
    if (!confirm(`Hapus kategori "${cat.name}"?`)) return;
    await supabase.from('categories').delete().eq('id', cat.id);
    fetchData();
  }

  return (
    <div className="page-enter min-h-screen bg-white pb-8">
      <header className="sticky top-0 z-40 bg-white border-b border-border-light px-4 py-3">
        <div className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto flex items-center gap-3">
          <Link to="/admin" className="p-1.5 rounded-full bg-surface-secondary text-text-secondary active:scale-95 transition-transform" aria-label="Kembali">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-bold text-text-primary flex-1">Kelola Menu</h1>
          <button onClick={openAdd} className="bg-primary text-white px-3 py-1.5 rounded-xl text-sm font-semibold flex items-center gap-1 active:scale-95 transition-transform">
            <Plus size={14} /> Tambah
          </button>
        </div>
      </header>

      <main className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto px-4 mt-4">
        {/* Kategori */}
        <section className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-text-primary text-sm">Kategori</h2>
            <button onClick={() => setShowCatForm(true)} className="text-primary text-xs font-semibold flex items-center gap-1">
              <Plus size={12} /> Tambah
            </button>
          </div>

          {showCatForm && (
            <form onSubmit={handleAddCategory} className="flex gap-2 mb-3">
              <input
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Nama kategori"
                className="flex-1 px-3 py-2 rounded-xl bg-surface-secondary text-sm border border-transparent outline-none focus:border-primary/30"
              />
              <button type="submit" disabled={savingCat} className="bg-primary text-white px-3 py-2 rounded-xl text-sm font-semibold">
                {savingCat ? '...' : 'Simpan'}
              </button>
              <button type="button" onClick={() => setShowCatForm(false)} className="p-2 text-text-muted">
                <X size={16} />
              </button>
            </form>
          )}

          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <div key={cat.id} className="bg-surface-secondary rounded-xl px-3 py-1.5 text-sm flex items-center gap-2">
                <span className="text-text-primary">{cat.name}</span>
                <button onClick={() => handleDeleteCategory(cat)} className="text-red-400 hover:text-red-600">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Produk */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Belum ada produk"
            description="Tambah produk pertama untuk mulai jualan. Produk sample bisa diedit sesuai menu Anda."
            actionLabel="Tambah Produk"
            onAction={openAdd}
          />
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {products.map((product) => (
              <div key={product.id} className={`bg-white rounded-2xl p-3 shadow-sm flex gap-3 ${!product.is_available ? 'opacity-50' : ''}`}>
                <img
                  src={product.image_url || ''}
                  alt={product.name}
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-surface-secondary"
                  onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect fill="%23e2e8f0" width="64" height="64"/></svg>'; }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-semibold text-sm text-text-primary truncate">{product.name}</p>
                        {product.is_starter === true && (
                          <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0">
                            SAMPLE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted">{product.categories?.name}</p>
                    </div>
                    <span className="text-primary font-bold text-sm flex-shrink-0">
                      Rp {product.price.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => toggleAvailable(product)} className={`p-1.5 rounded-lg ${product.is_available ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`} title={product.is_available ? 'Tersedia' : 'Tidak tersedia'}>
                      {product.is_available ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button onClick={() => openEdit(product)} className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(product)} className="p-1.5 rounded-lg bg-red-100 text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}
      </main>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowForm(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-[28px] p-5 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-border" /></div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-text-primary">{editing ? 'Edit Produk' : 'Tambah Produk'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-xl bg-surface-secondary text-text-secondary">
                <X size={18} />
              </button>
            </div>

            {editing && (
              <button
                type="button"
                onClick={() => { setVariantProductId(editing.id); setShowVariants(true); }}
                className="w-full mb-4 bg-emerald-50 text-primary px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <Layers size={16} /> Kelola Varian
              </button>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">Nama Produk</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm border border-transparent outline-none focus:border-primary/30" />
              </div>

              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">Harga (Rp)</label>
                <input type="number" required min="1000" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm border border-transparent outline-none focus:border-primary/30" />
              </div>

              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                  Diskon (%)
                  <span className="ml-1.5 text-xs font-normal text-text-muted">— kosongkan jika tidak ada diskon</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={form.discount_percent}
                    onChange={(e) => setForm({ ...form, discount_percent: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm border border-transparent outline-none focus:border-primary/30 pr-10"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-text-muted font-medium">%</span>
                </div>
                {form.discount_percent > 0 && form.price > 0 && (
                  <p className="text-xs text-emerald-600 mt-1 font-medium">
                    Harga setelah diskon: Rp {Math.round(parseInt(form.price) * (1 - parseInt(form.discount_percent) / 100)).toLocaleString('id-ID')}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">Kategori</label>
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm border border-transparent outline-none focus:border-primary/30">
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">Deskripsi</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm border border-transparent outline-none focus:border-primary/30 resize-none" />
              </div>

              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">Gambar Produk</label>
                {form.image_url && !imageFile && (
                  <img src={form.image_url} alt="Preview" className="w-20 h-20 rounded-xl object-cover mb-2" />
                )}
                {imageFile && (
                  <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-20 h-20 rounded-xl object-cover mb-2" />
                )}
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-secondary border border-transparent cursor-pointer text-sm text-text-secondary">
                  <Upload size={14} />
                  {imageFile ? imageFile.name : 'Pilih gambar...'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setImageFile(e.target.files[0] || null)} />
                </label>
                <p className="text-xs text-text-muted mt-1">Atau masukkan URL gambar:</p>
                <input type="url" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..."
                  className="w-full mt-1 px-4 py-2 rounded-xl bg-surface-secondary text-sm border border-transparent outline-none focus:border-primary/30" />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="available" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })}
                  className="w-4 h-4 rounded accent-emerald-700" />
                <label htmlFor="available" className="text-sm text-text-secondary">Tersedia untuk dijual</label>
              </div>

              <button type="submit" disabled={saving}
                className="w-full bg-primary text-white py-3 rounded-full font-semibold text-sm active:scale-[0.98] transition-transform shadow-[var(--shadow-float)] disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : (editing ? 'Simpan Perubahan' : 'Tambah Produk')}
              </button>
            </form>
          </div>
        </div>
      )}

      {showVariants && variantProductId && (
        <AdminProductVariants
          productId={variantProductId}
          onClose={() => { setShowVariants(false); setVariantProductId(null); }}
        />
      )}
    </div>
  );
}
