import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Palette, QrCode, Lock, Trash2, Info, Upload, Eye, EyeOff, Loader2, HelpCircle, Phone } from 'lucide-react';
import { useStore } from '../lib/useStore';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';

export default function AdminSettings() {
  const { settings, updateSetting } = useStore();
  const { addToast } = useToast();

  // Branding state
  const [storeName, setStoreName] = useState(settings.store_name || 'Order Kopi');
  const [savingBrand, setSavingBrand] = useState(false);
  const [uploadingQris, setUploadingQris] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // WhatsApp state
  const [waNumber, setWaNumber] = useState(settings.admin_whatsapp || '');

  // Reset state
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetting, setResetting] = useState(false);

  async function handleSaveBranding() {
    setSavingBrand(true);
    await updateSetting('store_name', storeName);
    setSavingBrand(false);
    addToast('Nama toko disimpan');
  }

  async function handleUploadFile(file, key, setUploading) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('File harus berupa gambar', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('Ukuran file maksimal 5MB', 'error');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const fileName = `${key}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('store-assets')
      .upload(fileName, file, { upsert: true });

    if (error) {
      addToast('Gagal upload file', 'error');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('store-assets')
      .getPublicUrl(fileName);

    await updateSetting(key, urlData.publicUrl);
    setUploading(false);
    addToast('Gambar berhasil diupload');
  }

  async function handleChangePassword() {
    if (newPassword.length < 6) {
      addToast('Password minimal 6 karakter', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('Password tidak cocok', 'error');
      return;
    }

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);

    if (error) {
      addToast('Gagal mengubah password', 'error');
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    addToast('Password berhasil diubah');
  }

  async function handleResetData() {
    if (resetConfirm !== 'RESET') {
      addToast('Ketik RESET untuk konfirmasi', 'error');
      return;
    }

    setResetting(true);
    try {
      await supabase.from('reviews').delete().neq('id', 0);
      await supabase.from('order_items').delete().neq('id', 0);
      await supabase.from('orders').delete().neq('id', '');
      await supabase.from('order_counter').update({ last_number: 0 }).eq('id', 1);
      setResetConfirm('');
      addToast('Semua data pesanan berhasil direset');
    } catch {
      addToast('Gagal mereset data', 'error');
    }
    setResetting(false);
  }

  return (
    <div className="page-enter min-h-screen bg-white pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-border-light px-4 py-3">
        <div className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto flex items-center gap-3">
          <Link
            to="/admin"
            className="p-1.5 rounded-full bg-surface-secondary text-text-secondary active:scale-95 transition-transform"
            aria-label="Kembali"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-bold text-text-primary flex-1">Pengaturan</h1>
        </div>
      </header>

      <main className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto px-4 mt-4 space-y-4">
        {/* Section 1: Branding */}
        <section className="bg-white rounded-2xl p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 mb-4">
            <Palette size={18} className="text-primary" />
            <h2 className="font-semibold text-text-primary text-sm">Branding</h2>
          </div>

          {/* Store Name */}
          <div className="mb-4">
            <label className="text-xs font-medium text-text-muted block mb-1.5">Nama Toko</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-surface-secondary text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary/30"
                placeholder="Nama toko kamu"
              />
              <button
                onClick={handleSaveBranding}
                disabled={savingBrand}
                className="bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold active:scale-95 transition-transform disabled:opacity-60"
              >
                {savingBrand ? '...' : 'Simpan'}
              </button>
            </div>
          </div>

          {/* Store Logo */}
          <div className="mb-4">
            <label className="text-xs font-medium text-text-muted block mb-1.5">Logo Toko</label>
            {settings.store_logo && (
              <img src={settings.store_logo} alt="Logo" className="w-16 h-16 rounded-xl object-contain border border-border mb-2" />
            )}
            <label className="inline-flex items-center gap-2 bg-surface-secondary text-text-secondary px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer active:scale-95 transition-transform">
              {uploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploadingLogo ? 'Mengupload...' : 'Upload Logo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUploadFile(e.target.files[0], 'store_logo', setUploadingLogo)}
              />
            </label>
          </div>

          {/* QRIS Image */}
          <div>
            <label className="text-xs font-medium text-text-muted block mb-1.5">QRIS Pembayaran</label>
            <div className="flex items-start gap-3">
              {settings.qris_image && (
                <img src={settings.qris_image} alt="QRIS" className="w-24 h-24 rounded-xl object-contain border border-border" />
              )}
              <div className="flex flex-col gap-2">
                <label className="inline-flex items-center gap-2 bg-surface-secondary text-text-secondary px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer active:scale-95 transition-transform">
                  {uploadingQris ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
                  {uploadingQris ? 'Mengupload...' : 'Upload QRIS'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUploadFile(e.target.files[0], 'qris_image', setUploadingQris)}
                  />
                </label>
                <p className="text-xs text-text-muted">Format: JPG, PNG. Maks 5MB</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section: WhatsApp Admin */}
        <section className="bg-white rounded-2xl p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 mb-4">
            <Phone size={20} className="text-primary" />
            <h2 className="font-bold text-text-primary">WhatsApp Admin</h2>
          </div>
          <p className="text-xs text-text-muted mb-3">
            Nomor WhatsApp untuk menerima notifikasi pesanan dan dihubungi customer.
            Format: 628xxxxxxxxxx (tanpa + atau spasi)
          </p>
          <div className="flex gap-2">
            <input
              type="tel"
              value={waNumber}
              onChange={(e) => setWaNumber(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="628123456789"
              className="flex-1 px-4 py-2.5 rounded-xl bg-surface-secondary text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary/30"
            />
            <button
              onClick={async () => {
                await updateSetting('admin_whatsapp', waNumber);
                addToast('Nomor WhatsApp disimpan');
              }}
              className="bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
            >
              Simpan
            </button>
          </div>
        </section>

        {/* Section 2: Change Password */}
        <section className="bg-white rounded-2xl p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={18} className="text-primary" />
            <h2 className="font-semibold text-text-primary text-sm">Ganti Password</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1.5">Password Baru</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 rounded-xl bg-surface-secondary text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary/30"
                  placeholder="Minimal 6 karakter"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1.5">Konfirmasi Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary/30"
                placeholder="Ulangi password baru"
              />
            </div>
            <button
              onClick={handleChangePassword}
              disabled={savingPassword || !newPassword || !confirmPassword}
              className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {savingPassword ? 'Menyimpan...' : 'Ubah Password'}
            </button>
          </div>
        </section>

        {/* Section 3: Reset Data */}
        <section className="bg-white rounded-2xl p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 mb-4">
            <Trash2 size={18} className="text-error" />
            <h2 className="font-semibold text-text-primary text-sm">Reset Data</h2>
          </div>

          <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
            <p className="text-xs text-red-700 font-medium">
              ⚠️ Ini akan menghapus SEMUA pesanan, review, dan reset counter. Menu dan pengaturan tidak akan dihapus.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1.5">
                Ketik <span className="font-bold text-error">RESET</span> untuk konfirmasi
              </label>
              <input
                type="text"
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm text-text-primary outline-none focus:ring-2 focus:ring-red-500/20 border border-transparent focus:border-red-300"
                placeholder="Ketik RESET"
              />
            </div>
            <button
              onClick={handleResetData}
              disabled={resetting || resetConfirm !== 'RESET'}
              className="w-full bg-error text-white py-2.5 rounded-xl text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {resetting ? 'Mereset...' : 'Reset Semua Data'}
            </button>
          </div>
        </section>

        {/* Section 4: About */}
        <section className="bg-white rounded-2xl p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 mb-4">
            <Info size={18} className="text-primary" />
            <h2 className="font-semibold text-text-primary text-sm">Tentang</h2>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">Versi Aplikasi</span>
              <span className="text-sm font-medium text-text-primary">Order Kopi v1.0</span>
            </div>
            <Link
              to="/admin/help"
              className="flex items-center gap-2 text-sm text-primary font-medium"
            >
              <HelpCircle size={16} />
              Bantuan & Dokumentasi
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
