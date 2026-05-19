import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Palette, QrCode, Lock, Trash2, Info, Upload, Eye, EyeOff, Loader2, HelpCircle, Phone, Check, ShoppingCart, Truck } from 'lucide-react';
import { useStore } from '../lib/useStore';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';

const PRESET_COLORS = [
  { name: 'Hijau Tua', hex: '#006041' },
  { name: 'Coklat Kopi', hex: '#6F4E37' },
  { name: 'Navy', hex: '#1E3A5F' },
  { name: 'Merah Maroon', hex: '#800020' },
  { name: 'Ungu', hex: '#5B2C6F' },
  { name: 'Biru', hex: '#1A5276' },
  { name: 'Hitam', hex: '#1C1C1C' },
  { name: 'Terralogos', hex: '#CC5500' },
];

export default function AdminSettings() {
  const { settings, updateSetting } = useStore();
  const { addToast } = useToast();

  // Branding state
  const [storeName, setStoreName] = useState(settings.store_name || 'Toko Saya');
  const [primaryColor, setPrimaryColor] = useState(settings.primary_color || '#006041');
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

  // Store settings state
  const [allowMixedCart, setAllowMixedCart] = useState(settings.allow_mixed_cart === 'true');
  const [activeFulfillmentTypes, setActiveFulfillmentTypes] = useState(() => {
    try {
      return JSON.parse(settings.active_fulfillment_types || '["dine_in","takeaway"]');
    } catch { return ['dine_in', 'takeaway']; }
  });
  const [savingStoreSettings, setSavingStoreSettings] = useState(false);

  // Sample data state
  const [sampleProductCount, setSampleProductCount] = useState(0);
  const [sampleCategoryCount, setSampleCategoryCount] = useState(0);
  const [sampleConfirm, setSampleConfirm] = useState('');
  const [deletingSamples, setDeletingSamples] = useState(false);
  const [claimingSamples, setClaimingSamples] = useState(false);

  // Reset state
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetchSampleCounts();
  }, []);

  async function fetchSampleCounts() {
    const [{ count: productCount }, { count: categoryCount }] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_starter', true),
      supabase.from('categories').select('*', { count: 'exact', head: true }).eq('is_starter', true),
    ]);

    setSampleProductCount(productCount || 0);
    setSampleCategoryCount(categoryCount || 0);
  }

  async function handleDeleteSamples() {
    if (sampleConfirm !== 'SAMPLE') {
      addToast('Ketik SAMPLE untuk konfirmasi', 'error');
      return;
    }

    setDeletingSamples(true);
    try {
      await supabase.from('products').delete().eq('is_starter', true);
      await supabase.from('categories').delete().eq('is_starter', true);
      setSampleProductCount(0);
      setSampleCategoryCount(0);
      setSampleConfirm('');
      addToast('Semua data sample berhasil dihapus');
    } catch {
      addToast('Gagal menghapus data sample', 'error');
    }
    setDeletingSamples(false);
  }

  async function handleClaimSamples() {
    setClaimingSamples(true);
    try {
      await supabase.from('products').update({ is_starter: false }).eq('is_starter', true);
      await supabase.from('categories').update({ is_starter: false }).eq('is_starter', true);
      setSampleProductCount(0);
      setSampleCategoryCount(0);
      setSampleConfirm('');
      addToast('Data sample berhasil dijadikan milik Anda');
    } catch {
      addToast('Gagal menjadikan data sample milik Anda', 'error');
    }
    setClaimingSamples(false);
  }

  async function handleSaveBranding() {
    setSavingBrand(true);
    await updateSetting('store_name', storeName);
    await updateSetting('primary_color', primaryColor);
    setSavingBrand(false);
    addToast('Branding disimpan');
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
    
    // Log QRIS image update to audit_logs
    if (key === 'qris_image') {
      await supabase
        .from('audit_logs')
        .insert({
          event_type: 'qris_image_updated',
          event_data: {
            new_url: urlData.publicUrl,
            file_name: fileName
          },
          actor_type: 'admin'
        });
    }
    
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

  async function handleDeleteQris() {
    // Check if there are pending orders before allowing deletion
    const { data: pendingOrders, error } = await supabase
      .from('orders')
      .select('id')
      .in('status', ['pending_payment', 'pending_verification'])
      .limit(1);

    if (error) {
      addToast('Gagal memeriksa pesanan', 'error');
      return;
    }

    if (pendingOrders && pendingOrders.length > 0) {
      addToast('Tidak dapat menghapus QRIS. Masih ada pesanan yang menunggu pembayaran atau verifikasi.', 'error');
      return;
    }

    // Proceed with deletion
    await updateSetting('qris_image', null);
    addToast('QRIS berhasil dihapus');
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

  async function handleSaveStoreSettings() {
    setSavingStoreSettings(true);
    await updateSetting('allow_mixed_cart', allowMixedCart ? 'true' : 'false');
    await updateSetting('active_fulfillment_types', JSON.stringify(activeFulfillmentTypes));
    setSavingStoreSettings(false);
    addToast('Pengaturan toko disimpan');
  }

  function toggleFulfillmentType(type) {
    setActiveFulfillmentTypes(prev => {
      if (prev.includes(type)) {
        // Don't allow removing all types
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== type);
      }
      return [...prev, type];
    });
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
            </div>
          </div>

          {/* Primary Color */}
          <div className="mb-4">
            <label className="text-xs font-medium text-text-muted block mb-1.5">Warna Utama</label>
            <p className="text-xs text-text-muted mb-3">Pilih warna yang sesuai branding toko Anda</p>
            
            {/* Preset Colors */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.hex}
                  onClick={() => setPrimaryColor(color.hex)}
                  className={`relative flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all active:scale-95 ${
                    primaryColor === color.hex
                      ? 'border-primary bg-surface-accent'
                      : 'border-transparent bg-surface-secondary hover:border-border'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full border border-black/10 shadow-sm"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="text-[10px] text-text-muted leading-tight">{color.name}</span>
                  {primaryColor === color.hex && (
                    <Check size={12} className="absolute top-1 right-1 text-primary" />
                  )}
                </button>
              ))}
            </div>

            {/* Custom Color Input */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border-0 p-0.5 bg-surface-secondary"
                />
              </div>
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(val)) setPrimaryColor(val);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-surface-secondary text-sm text-text-primary font-mono outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary/30"
                placeholder="#006041"
                maxLength={7}
              />
            </div>

            {/* Preview */}
            <div className="mt-3 p-3 rounded-xl border border-border-light">
              <p className="text-xs text-text-muted mb-2">Preview</p>
              <div className="flex items-center gap-3">
                <button
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  Tombol Utama
                </button>
                <span className="text-sm font-bold" style={{ color: primaryColor }}>
                  Rp 25.000
                </span>
                <div className="px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: primaryColor }}>
                  Badge
                </div>
              </div>
            </div>
          </div>

          {/* Save Branding Button */}
          <button
            onClick={handleSaveBranding}
            disabled={savingBrand}
            className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-60 mb-4"
          >
            {savingBrand ? 'Menyimpan...' : 'Simpan Branding'}
          </button>

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
                {settings.qris_image && (
                  <button
                    onClick={handleDeleteQris}
                    className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2.5 rounded-xl text-sm font-medium active:scale-95 transition-transform hover:bg-red-100"
                  >
                    <Trash2 size={16} />
                    Hapus QRIS
                  </button>
                )}
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

        {/* Section: Pengaturan Keranjang */}
        <section className="bg-white rounded-2xl p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart size={18} className="text-primary" />
            <h2 className="font-semibold text-text-primary text-sm">Pengaturan Keranjang</h2>
          </div>

          <div className="space-y-4">
            {/* Mixed Cart Toggle */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium text-text-primary block mb-1">
                  Izinkan Produk Campuran
                </label>
                <p className="text-xs text-text-muted">
                  Jika dinonaktifkan, customer hanya bisa order satu jenis produk per keranjang
                </p>
              </div>
              <button
                onClick={() => setAllowMixedCart(!allowMixedCart)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  allowMixedCart ? 'bg-primary' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    allowMixedCart ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <button
              onClick={handleSaveStoreSettings}
              disabled={savingStoreSettings}
              className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {savingStoreSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </section>

        {/* Section: Tipe Pemenuhan */}
        <section className="bg-white rounded-2xl p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 mb-4">
            <Truck size={18} className="text-primary" />
            <h2 className="font-semibold text-text-primary text-sm">Tipe Pemenuhan</h2>
          </div>

          <p className="text-xs text-text-muted mb-4">
            Pilih metode pemenuhan pesanan yang tersedia untuk customer
          </p>

          <div className="space-y-3">
            {[
              { value: 'dine_in', label: 'Dine-in', desc: 'Makan di tempat' },
              { value: 'takeaway', label: 'Takeaway', desc: 'Bawa pulang' },
              { value: 'delivery', label: 'Delivery', desc: 'Antar ke alamat' },
              { value: 'digital', label: 'Digital', desc: 'Produk digital' }
            ].map(type => (
              <label
                key={type.value}
                className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  activeFulfillmentTypes.includes(type.value)
                    ? 'border-primary bg-surface-accent'
                    : 'border-border-light bg-surface-secondary'
                }`}
              >
                <input
                  type="checkbox"
                  checked={activeFulfillmentTypes.includes(type.value)}
                  onChange={() => toggleFulfillmentType(type.value)}
                  className="mt-0.5 w-4 h-4 text-primary rounded focus:ring-primary"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-text-primary">{type.label}</div>
                  <div className="text-xs text-text-muted">{type.desc}</div>
                </div>
                {activeFulfillmentTypes.includes(type.value) && (
                  <Check size={16} className="text-primary mt-0.5" />
                )}
              </label>
            ))}

            <button
              onClick={handleSaveStoreSettings}
              disabled={savingStoreSettings}
              className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {savingStoreSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}
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

        {/* Section: Kelola Data Sample */}
        <section className="bg-white rounded-2xl p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart size={18} className="text-primary" />
            <h2 className="font-semibold text-text-primary text-sm">Kelola Data Sample</h2>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4">
            <p className="text-xs text-amber-700 font-medium">
              {sampleProductCount === 0 && sampleCategoryCount === 0
                ? 'Tidak ada data sample'
                : `${sampleProductCount} produk sample, ${sampleCategoryCount} kategori sample`}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1.5">
                Ketik <span className="font-bold text-error">SAMPLE</span> untuk hapus semua data sample
              </label>
              <input
                type="text"
                value={sampleConfirm}
                onChange={(e) => setSampleConfirm(e.target.value)}
                disabled={sampleProductCount === 0 && sampleCategoryCount === 0}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm text-text-primary outline-none focus:ring-2 focus:ring-red-500/20 border border-transparent focus:border-red-300 disabled:opacity-50"
                placeholder="Ketik SAMPLE"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={handleDeleteSamples}
                disabled={deletingSamples || sampleConfirm !== 'SAMPLE' || (sampleProductCount === 0 && sampleCategoryCount === 0)}
                className="w-full bg-error text-white py-2.5 rounded-xl text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {deletingSamples ? 'Menghapus...' : 'Hapus Semua Data Sample'}
              </button>
              <button
                onClick={handleClaimSamples}
                disabled={claimingSamples || (sampleProductCount === 0 && sampleCategoryCount === 0)}
                className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {claimingSamples ? 'Menyimpan...' : 'Jadikan Milik Saya'}
              </button>
            </div>
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
              <span className="text-sm font-medium text-text-primary">All-in-One Order v1.0</span>
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
