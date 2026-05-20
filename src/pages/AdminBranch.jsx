import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Eye, EyeOff, X, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { validateRequiredText } from '../lib/validation';
import { useToast } from '../components/Toast';

export default function AdminBranch() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', is_active: true });
  const { addToast } = useToast();

  useEffect(() => { fetchBranches(); }, []);

  async function fetchBranches() {
    setLoading(true);
    const { data } = await supabase
      .from('branches')
      .select('*')
      .order('sort_order');
    setBranches(data || []);
    setLoading(false);
  }

  function openAdd() {
    setEditing(null);
    setForm({ name: '', address: '', is_active: true });
    setShowForm(true);
  }

  function openEdit(branch) {
    setEditing(branch);
    setForm({
      name: branch.name,
      address: branch.address || '',
      is_active: branch.is_active,
    });
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);

    try {
      const nameCheck = validateRequiredText(form.name, { max: 100, label: 'Nama cabang' });
      if (!nameCheck.ok) {
        addToast(nameCheck.message, 'error');
        setSaving(false);
        return;
      }

      const payload = {
        name: nameCheck.value,
        address: form.address.trim().slice(0, 500) || null,
        is_active: form.is_active,
      };

      if (editing) {
        await supabase.from('branches').update(payload).eq('id', editing.id);
        addToast('Cabang berhasil diperbarui');
      } else {
        const maxSort = branches.reduce((max, b) => Math.max(max, b.sort_order || 0), 0);
        payload.sort_order = maxSort + 1;
        await supabase.from('branches').insert(payload);
        addToast('Cabang berhasil ditambahkan');
      }

      setShowForm(false);
      fetchBranches();
    } catch (err) {
      addToast('Gagal menyimpan: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(branch) {
    if (!confirm(`Hapus cabang "${branch.name}"?`)) return;
    await supabase.from('branches').delete().eq('id', branch.id);
    addToast('Cabang dihapus');
    fetchBranches();
  }

  async function toggleActive(branch) {
    await supabase.from('branches').update({ is_active: !branch.is_active }).eq('id', branch.id);
    fetchBranches();
  }

  return (
    <div className="page-enter min-h-screen bg-white pb-8">
      <header className="sticky top-0 z-40 bg-white border-b border-border-light px-4 py-3">
        <div className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto flex items-center gap-3">
          <Link to="/admin" className="p-1.5 rounded-full bg-surface-secondary text-text-secondary active:scale-95 transition-transform" aria-label="Kembali">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-bold text-text-primary flex-1">Kelola Cabang</h1>
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
        ) : branches.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl">📍</p>
            <p className="text-text-muted text-sm mt-2">Belum ada cabang</p>
          </div>
        ) : (
          <section className="space-y-3">
            {branches.map((branch) => (
              <div key={branch.id} className={`bg-white rounded-2xl p-4 shadow-[var(--shadow-card)] ${!branch.is_active ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary text-sm">{branch.name}</p>
                    {branch.address && (
                      <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{branch.address}</p>
                    )}
                    <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${branch.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {branch.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => toggleActive(branch)} className={`p-1.5 rounded-lg ${branch.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`} title={branch.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                      {branch.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button onClick={() => openEdit(branch)} className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(branch)} className="p-1.5 rounded-lg bg-red-100 text-red-500">
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
              <h2 className="font-bold text-lg text-text-primary">{editing ? 'Edit Cabang' : 'Tambah Cabang'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-xl bg-surface-secondary text-text-secondary">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">Nama Cabang</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Cabang Sudirman"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm border border-transparent outline-none focus:border-primary/30" />
              </div>

              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">Alamat</label>
                <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Alamat lengkap cabang"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm border border-transparent outline-none focus:border-primary/30 resize-none" />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="branch-active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded accent-emerald-700" />
                <label htmlFor="branch-active" className="text-sm text-text-secondary">Aktif (tampil di halaman utama)</label>
              </div>

              <button type="submit" disabled={saving}
                className="w-full bg-primary text-white py-3 rounded-full font-semibold text-sm active:scale-[0.98] transition-transform shadow-[var(--shadow-float)] disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : (editing ? 'Simpan Perubahan' : 'Tambah Cabang')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
