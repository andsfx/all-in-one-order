import { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

const EMPTY_FORM = {
  sku: '',
  name: '',
  price_override: '',
  stock: '0',
  image_url: '',
  attributes: '',
  is_available: true,
};

export default function AdminProductVariants({ productId, onClose }) {
  const [variants, setVariants] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    fetchData();
  }, [productId]);

  async function fetchData() {
    setLoading(true);
    const [{ data: variantData }, { data: templateData }, { data: mappingData }] = await Promise.all([
      supabase.from('product_variants').select('*').eq('product_id', productId).order('created_at'),
      supabase.from('option_templates').select('*').order('name'),
      supabase.from('product_option_templates').select('*').eq('product_id', productId),
    ]);

    setVariants(variantData || []);
    setTemplates(templateData || []);
    setSelectedTemplates((mappingData || []).map((mapping) => mapping.template_id));
    setLoading(false);
  }

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(variant) {
    setEditing(variant);
    setForm({
      sku: variant.sku || '',
      name: variant.name || '',
      price_override: variant.price_override != null ? String(variant.price_override) : '',
      stock: variant.stock != null ? String(variant.stock) : '0',
      image_url: variant.image_url || '',
      attributes: variant.attributes ? JSON.stringify(variant.attributes, null, 2) : '',
      is_available: variant.is_available,
    });
    setShowForm(true);
  }

  function validateSku(sku) {
    const normalizedSku = sku.trim().toLowerCase();
    return !variants.some((variant) => variant.sku.trim().toLowerCase() === normalizedSku && variant.id !== editing?.id);
  }

  function parseAttributes() {
    if (!form.attributes.trim()) return {};
    return JSON.parse(form.attributes);
  }

  async function handleSave(e) {
    e.preventDefault();

    const sku = form.sku.trim();
    if (!validateSku(sku)) {
      alert('SKU sudah digunakan');
      return;
    }

    let attributes;
    try {
      attributes = parseAttributes();
    } catch {
      alert('Attributes harus berupa JSON valid');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        product_id: productId,
        sku,
        name: form.name.trim(),
        price_override: form.price_override === '' ? null : parseInt(form.price_override, 10),
        stock: parseInt(form.stock || '0', 10),
        image_url: form.image_url.trim() || null,
        attributes,
        is_available: form.is_available,
      };

      if (editing) {
        await supabase.from('product_variants').update(payload).eq('id', editing.id);
      } else {
        await supabase.from('product_variants').insert(payload);
      }

      setShowForm(false);
      fetchData();
    } catch (err) {
      alert('Gagal menyimpan varian: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(variant) {
    if (!confirm(`Hapus varian "${variant.name}"?`)) return;
    await supabase.from('product_variants').delete().eq('id', variant.id);
    fetchData();
  }

  function toggleTemplate(templateId) {
    setSelectedTemplates((current) => (
      current.includes(templateId)
        ? current.filter((id) => id !== templateId)
        : [...current, templateId]
    ));
  }

  async function saveTemplateMappings() {
    setSavingTemplates(true);
    try {
      await supabase.from('product_option_templates').delete().eq('product_id', productId);

      if (selectedTemplates.length > 0) {
        await supabase.from('product_option_templates').insert(
          selectedTemplates.map((templateId) => ({ product_id: productId, template_id: templateId }))
        );
      }

      alert('Template varian disimpan');
      fetchData();
    } catch (err) {
      alert('Gagal menyimpan template: ' + err.message);
    } finally {
      setSavingTemplates(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white w-full max-w-4xl rounded-t-[28px] p-5 animate-slide-up max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-border" /></div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg text-text-primary">Kelola Varian</h2>
            <p className="text-xs text-text-muted">Atur SKU, stok, harga khusus, dan template opsi produk.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-surface-secondary text-text-secondary">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5">
            <section className="bg-surface-secondary rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-bold text-sm text-text-primary">Daftar Varian</h3>
                  <p className="text-xs text-text-muted">SKU wajib unik untuk semua varian produk ini.</p>
                </div>
                <button onClick={openAdd} className="bg-primary text-white px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1 active:scale-95 transition-transform">
                  <Plus size={14} /> Tambah
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-text-muted border-b border-border">
                      <th className="py-2 pr-3">SKU</th>
                      <th className="py-2 pr-3">Nama</th>
                      <th className="py-2 pr-3">Harga</th>
                      <th className="py-2 pr-3">Stok</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((variant) => (
                      <tr key={variant.id} className="border-b border-border-light last:border-0">
                        <td className="py-2 pr-3 font-mono text-xs text-text-primary">{variant.sku}</td>
                        <td className="py-2 pr-3 text-text-primary font-medium">{variant.name}</td>
                        <td className="py-2 pr-3 text-text-secondary">{variant.price_override == null ? 'Pakai harga produk' : `Rp ${variant.price_override.toLocaleString('id-ID')}`}</td>
                        <td className="py-2 pr-3 text-text-secondary">{variant.stock}</td>
                        <td className="py-2 pr-3">
                          <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${variant.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                            {variant.is_available ? 'Tersedia' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="py-2">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openEdit(variant)} className="p-1.5 rounded-lg bg-blue-100 text-blue-600" title="Edit">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => handleDelete(variant)} className="p-1.5 rounded-lg bg-red-100 text-red-500" title="Hapus">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {variants.length === 0 && (
                      <tr>
                        <td colSpan="6" className="py-6 text-center text-sm text-text-muted">Belum ada varian.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bg-white border border-border-light rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-bold text-sm text-text-primary">Template Opsi</h3>
                  <p className="text-xs text-text-muted">Pilih template opsi yang berlaku untuk produk ini.</p>
                </div>
                <button onClick={saveTemplateMappings} disabled={savingTemplates} className="bg-primary text-white px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1 disabled:opacity-60">
                  {savingTemplates ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Simpan
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {templates.map((template) => (
                  <label key={template.id} className="flex items-start gap-3 p-3 rounded-xl bg-surface-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTemplates.includes(template.id)}
                      onChange={() => toggleTemplate(template.id)}
                      className="mt-1 accent-primary"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-text-primary">{template.name}</span>
                      {template.description && <span className="block text-xs text-text-muted">{template.description}</span>}
                    </span>
                  </label>
                ))}
                {templates.length === 0 && <p className="text-sm text-text-muted">Belum ada template opsi.</p>}
              </div>
            </section>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50" onClick={() => setShowForm(false)}>
            <div className="bg-white w-full max-w-lg rounded-t-[28px] p-5 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-border" /></div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-text-primary">{editing ? 'Edit Varian' : 'Tambah Varian'}</h3>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-xl bg-surface-secondary text-text-secondary">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary mb-1.5 block">SKU</label>
                  <input type="text" required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm border border-transparent outline-none focus:border-primary/30" />
                </div>

                <div>
                  <label className="text-sm font-medium text-text-secondary mb-1.5 block">Nama Varian</label>
                  <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm border border-transparent outline-none focus:border-primary/30" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-text-secondary mb-1.5 block">Harga Override</label>
                    <input type="number" min="0" placeholder="Kosongkan" value={form.price_override} onChange={(e) => setForm({ ...form, price_override: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm border border-transparent outline-none focus:border-primary/30" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-secondary mb-1.5 block">Stok</label>
                    <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm border border-transparent outline-none focus:border-primary/30" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-text-secondary mb-1.5 block">Image URL</label>
                  <input type="text" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm border border-transparent outline-none focus:border-primary/30" />
                </div>

                <div>
                  <label className="text-sm font-medium text-text-secondary mb-1.5 block">Attributes JSON</label>
                  <textarea rows="4" placeholder='{"color":"red","size":"M"}' value={form.attributes} onChange={(e) => setForm({ ...form, attributes: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm border border-transparent outline-none focus:border-primary/30 font-mono" />
                </div>

                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} className="accent-primary" />
                  Varian tersedia
                </label>

                <button type="submit" disabled={saving} className="w-full bg-primary text-white py-3 rounded-xl font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {editing ? 'Simpan Perubahan' : 'Tambah Varian'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
