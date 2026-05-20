import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Eye, EyeOff, X, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { validateRequiredText } from '../lib/validation';
import { useToast } from '../components/Toast';

const THEMES = [
  { value: 'green', label: 'Hijau', preview: 'from-emerald-700 to-emerald-500' },
  { value: 'amber', label: 'Kuning', preview: 'from-amber-600 to-amber-400' },
  { value: 'slate', label: 'Abu-abu', preview: 'from-slate-700 to-slate-500' },
];

export default function AdminPromo() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', subtitle: '', theme: 'green', image_url: '', is_active: true });
  const { addToast } = useToast();

  useEffect(() => { fetchPromos(); }, []);

  async function fetchPromos() {
    setLoading(true);
    const { data } = await supabase
      .from('promos')
      .select('*')
      .order('sort_order');
    setPromos(data || []);
    setLoading(false);
  }

  function openAdd() {
    setEditing(null);
    setForm({ title: '', subtitle: '', theme: 'green', image_url: '', is_active: true });
    setShowForm(true);
  }

  function openEdit(promo) {
    setEditing(promo);
    setForm({
      title: promo.title,
      subtitle: promo.subtitle || '',
      theme: promo.theme,
      image_url: promo.image_url || '',
      is_active: promo.is_active,
    });
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);

    try {
      const titleCheck = validateRequiredText(form.title, { max: 100, label: 'Judul promo' });
      if (!titleCheck.ok) {
        addToast(titleCheck.message, 'error');
        setSaving(false);
        return;
      }

      const payload = {
        title: titleCheck.value,
        subtitle: form.subtitle.trim().slice(0, 200) || null,
        theme: form.theme,
        image_url: form.image_url.trim() || null,
        is_active: form.is_active,
      };

      if (editing) {
        await supabase.from('promos').update(payload).eq('id', editing.id);
        addToast('Promo berhasil diperbarui');
      } else {
        const maxSort = promos.reduce((max, p) => Math.max(max, p.sort_order), 0);
        payload.sort_order = maxSort + 1;
        await supabase.from('promos').insert(payload);
        addToast('Promo berhasil ditambahkan');
      }

      setShowForm(false);
      fetchPromos();
    } catch (err) {
      addToast('Gagal menyimpan: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(promo) {
    if (!confirm(`Hapus promo "${promo.title}"?`)) return;
    await supabase.from('promos').delete().eq('id', promo.id);
    addToast('Promo dihapus');
    fetchPromos();
  }

  async function toggleActive(promo) {
    await supabase.from('promos').update({ is_active: !promo.is_active }).eq('id', promo.id);
    fetchPromos();
  }

  async function moveOrder(promo, direction) {
    const idx = promos.findIndex((p) => p.id === promo.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= promos.length) return;

    const other = promos[swapIdx];
    await Promise.all([
      supabase.from('promos').update({ sort_order: other.sort_order }).eq('id', promo.id),
      supabase.from('promos').update({ sort_order: promo.sort_order }).eq('id', other.id),
    ]);
    fetchPromos();
  }

  const promoThemes = {
    green: 'from-emerald-700 to-emerald-500',
    amber: 'from-amber-600 to-amber-400',
    slate: 'from-slate-700 to-slate-500',
  };

  return (
    <div className="page-enter min-h-screen bg-white pb-8">
      <header className="sticky top-0 z-40 bg-white border-b border-border-light px-4 py-3">
        <div className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto flex items-center gap-3">
          <Link to="/admin" className="p-1.5 rounded-full bg-surface-secondary text-text-secondary active:scale-95 transition-transform" aria-label="Kembali">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-bold text-text-primary flex-1">Kelola Promo</h1>
          <button onClick={openAdd} className="bg-primary text-white px-3 py-1.5 rounded-xl text-sm font-semibold flex items-center gap-1 active:scale-95 transition-transform">
            <Plus size={14} /> Tambah
          </button>
        </div>
      </header>

      <main className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto px-4 mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : promos.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl">📢</p>
            <p className="text-text-muted text-sm mt-2">Belum ada promo</p>
          </div>
        ) : (
          <section className="space-y-3">
            {promos.map((promo, idx) => (
              <div key={promo.id} className={`bg-white rounded-2xl overflow-hidden shadow-sm ${!promo.is_active ? 'opacity-50' : ''}`}>
                {/* Preview */}
                <div className={`h-20 bg-gradient-to-r ${promoThemes[promo.theme] || promoThemes.green} relative overflow-hidden`}>
                  {promo.image_url && (
                    <img src={promo.image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" loading="lazy" />
                  )}
                  <div className="absolute inset-0 p-3 flex flex-col justify-end z-10">
                    <p className="text-white font-bold text-sm">{promo.title}</p>
                    {promo.subtitle && <p className="text-white/80 text-xs">{promo.subtitle}</p>}
                  </div>
                </div>

                {/* Actions */}
                <div className="p-3 flex items-center gap-2">
                  <button onClick={() => toggleActive(promo)} className={`p-1.5 rounded-lg ${promo.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`} title={promo.is_active ? 'Aktif' : 'Nonaktif'}>
                    {promo.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button onClick={() => openEdit(promo)} className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(promo)} className="p-1.5 rounded-lg bg-red-100 text-red-500">
                    <Trash2 size={14} />
                  </button>
                  <div className="flex-1" />
                  <button onClick={() => moveOrder(promo, -1)} disabled={idx === 0} className="p-1.5 rounded-lg bg-surface-secondary text-text-secondary disabled:opacity-30">
                    <ArrowUp size={14} />
                  </button>
                  <button onClick={() => moveOrder(promo, 1)} disabled={idx === promos.length - 1} className="p-1.5 rounded-lg bg-surface-secondary text-text-secondary disabled:opacity-30">
                    <ArrowDown size={14} />
                  </button>
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
              <h2 className="font-bold text-lg text-text-primary">{editing ? 'Edit Promo' : 'Tambah Promo'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-xl bg-surface-secondary text-text-secondary">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">Judul Promo</label>
                <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm border border-transparent outline-none focus:border-primary/30" />
              </div>

              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">Subtitle</label>
                <input type="text" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm border border-transparent outline-none focus:border-primary/30" />
              </div>

              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">Tema Warna</label>
                <div className="flex gap-2">
                  {THEMES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm({ ...form, theme: t.value })}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                        form.theme === t.value
                          ? 'bg-primary text-white'
                          : 'bg-surface-secondary text-text-secondary'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">URL Gambar</label>
                <input type="url" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm border border-transparent outline-none focus:border-primary/30" />
                {form.image_url && (
                  <img src={form.image_url} alt="Preview" className="w-full h-20 rounded-xl object-cover mt-2" />
                )}
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="promo-active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded accent-emerald-700" />
                <label htmlFor="promo-active" className="text-sm text-text-secondary">Aktif (tampil di halaman utama)</label>
              </div>

              {/* Preview */}
              <div>
                <p className="text-sm font-medium text-text-secondary mb-1.5">Preview</p>
                <div className={`w-full h-24 rounded-2xl bg-gradient-to-r ${promoThemes[form.theme] || promoThemes.green} relative overflow-hidden`}>
                  {form.image_url && (
                    <img src={form.image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                  )}
                  <div className="absolute inset-0 p-4 flex flex-col justify-end z-10">
                    <p className="text-white font-bold text-sm">{form.title || 'Judul Promo'}</p>
                    <p className="text-white/80 text-xs mt-0.5">{form.subtitle || 'Subtitle promo'}</p>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={saving}
                className="w-full bg-primary text-white py-3 rounded-full font-semibold text-sm active:scale-[0.98] transition-transform shadow-[var(--shadow-float)] disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : (editing ? 'Simpan Perubahan' : 'Tambah Promo')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
