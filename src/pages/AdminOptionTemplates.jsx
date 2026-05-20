import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, X, Layers } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { validateRequiredText } from '../lib/validation';
import { useToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';

export default function AdminOptionTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'single', choices: [{ label: '', value: '', price_delta: 0 }] });
  const { addToast } = useToast();

  useEffect(() => { fetchTemplates(); }, []);

  async function fetchTemplates() {
    setLoading(true);
    const { data } = await supabase
      .from('option_templates')
      .select('*')
      .order('created_at', { ascending: false });
    setTemplates(data || []);
    setLoading(false);
  }

  function openAdd() {
    setEditing(null);
    setForm({ name: '', type: 'single', choices: [{ label: '', value: '', price_delta: 0 }] });
    setShowForm(true);
  }

  function openEdit(template) {
    setEditing(template);
    setForm({
      name: template.name,
      type: template.type,
      choices: template.choices.length > 0 ? template.choices : [{ label: '', value: '', price_delta: 0 }],
    });
    setShowForm(true);
  }

  function addChoice() {
    setForm({ ...form, choices: [...form.choices, { label: '', value: '', price_delta: 0 }] });
  }

  function removeChoice(index) {
    setForm({ ...form, choices: form.choices.filter((_, i) => i !== index) });
  }

  function updateChoice(index, field, value) {
    const updated = [...form.choices];
    updated[index][field] = field === 'price_delta' ? parseFloat(value) || 0 : value;
    setForm({ ...form, choices: updated });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate
      const nameCheck = validateRequiredText(form.name, { max: 100, label: 'Nama template' });
      if (!nameCheck.ok) {
        addToast(nameCheck.message, 'error');
        setSaving(false);
        return;
      }

      const validChoices = form.choices.filter(c => c.label.trim() && c.value.trim());
      if (validChoices.length === 0) {
        addToast('Minimal 1 pilihan harus diisi', 'error');
        setSaving(false);
        return;
      }

      // Check duplicate labels
      const labels = validChoices.map(c => c.label.trim().toLowerCase());
      if (new Set(labels).size !== labels.length) {
        addToast('Label pilihan tidak boleh duplikat', 'error');
        setSaving(false);
        return;
      }

      const payload = {
        name: form.name.trim(),
        type: form.type,
        choices: validChoices,
      };

      if (editing) {
        await supabase.from('option_templates').update(payload).eq('id', editing.id);
        addToast('Template berhasil diperbarui');
      } else {
        await supabase.from('option_templates').insert(payload);
        addToast('Template berhasil ditambahkan');
      }

      setShowForm(false);
      fetchTemplates();
    } catch (err) {
      addToast('Gagal menyimpan: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(template) {
    if (!confirm(`Hapus template "${template.name}"?`)) return;

    try {
      // Check if template is in use
      const { count } = await supabase
        .from('product_option_templates')
        .select('*', { count: 'exact', head: true })
        .eq('option_template_id', template.id);

      if (count > 0) {
        addToast('Template sedang digunakan oleh produk', 'error');
        return;
      }

      await supabase.from('option_templates').delete().eq('id', template.id);
      addToast('Template berhasil dihapus');
      fetchTemplates();
    } catch (err) {
      addToast('Gagal menghapus: ' + err.message, 'error');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-700 to-emerald-500 text-white p-6 shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <Link to="/admin" className="p-2 hover:bg-white/20 rounded-lg transition">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold">Kelola Template Opsi</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-4xl mx-auto">
        <button
          onClick={openAdd}
          className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 transition mb-6"
        >
          <Plus className="w-5 h-5" />
          Tambah Template
        </button>

        {templates.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="Belum ada template opsi"
            description="Template opsi memungkinkan pelanggan memilih ukuran, rasa, atau varian lainnya."
            actionLabel="Buat Template"
            onAction={openAdd}
          />
        ) : (
          <div className="space-y-4">
            {templates.map(template => (
              <div key={template.id} className="bg-white rounded-xl shadow-md p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-slate-800">{template.name}</h3>
                    <p className="text-sm text-slate-500">
                      {template.type === 'single' ? 'Pilihan Tunggal' : 'Pilihan Ganda'} • {template.choices.length} pilihan
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {template.choices.map((choice, idx) => (
                        <span key={idx} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                          {choice.label}
                          {choice.price_delta !== 0 && (
                            <span className="ml-1 text-emerald-600 font-semibold">
                              {choice.price_delta > 0 ? '+' : ''}{choice.price_delta.toLocaleString('id-ID')}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => openEdit(template)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(template)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">
                {editing ? 'Edit Template' : 'Tambah Template'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Template *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Contoh: Tingkat Kemanisan"
                  required
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tipe Pilihan *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="single"
                      checked={form.type === 'single'}
                      onChange={e => setForm({ ...form, type: e.target.value })}
                      className="w-4 h-4 text-emerald-600"
                    />
                    <span className="text-slate-700">Pilihan Tunggal</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="multiple"
                      checked={form.type === 'multiple'}
                      onChange={e => setForm({ ...form, type: e.target.value })}
                      className="w-4 h-4 text-emerald-600"
                    />
                    <span className="text-slate-700">Pilihan Ganda</span>
                  </label>
                </div>
              </div>

              {/* Choices */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Pilihan *</label>
                <div className="space-y-3">
                  {form.choices.map((choice, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={choice.label}
                          onChange={e => updateChoice(index, 'label', e.target.value)}
                          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="Label (contoh: Normal)"
                        />
                        <input
                          type="text"
                          value={choice.value}
                          onChange={e => updateChoice(index, 'value', e.target.value)}
                          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="Value (contoh: normal)"
                        />
                        <input
                          type="number"
                          value={choice.price_delta}
                          onChange={e => updateChoice(index, 'price_delta', e.target.value)}
                          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="Harga (+/-)"
                          step="0.01"
                        />
                      </div>
                      {form.choices.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeChoice(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addChoice}
                  className="mt-3 text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Pilihan
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-5 h-5 animate-spin" />}
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
