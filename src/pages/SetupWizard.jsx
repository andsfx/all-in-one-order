import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, QrCode, Clock, MapPin, CheckCircle, ChevronRight, ChevronLeft, Upload, Loader2, Coffee, UtensilsCrossed, ShoppingBag, Download, Image, CreditCard, Package } from 'lucide-react';
import { useStore } from '../lib/useStore';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { BUSINESS_PRESETS } from '../lib/businessPresets';
import { generateFromPreset } from '../lib/setupGenerator';

const STEPS = [
  { icon: Store, title: 'Jenis Bisnis' },
  { icon: Store, title: 'Nama Toko' },
  { icon: Image, title: 'Logo' },
  { icon: CreditCard, title: 'Pembayaran' },
  { icon: Package, title: 'Pemenuhan' },
  { icon: Clock, title: 'Jam Operasional' },
  { icon: MapPin, title: 'Cabang' },
  { icon: CheckCircle, title: 'Selesai' },
];

const BUSINESS_TYPE_ICONS = {
  beverage: Coffee,
  food: UtensilsCrossed,
  physical: ShoppingBag,
  digital: Download,
};

const FULFILLMENT_OPTIONS = [
  { value: 'dine_in', label: 'Dine-in', description: 'Makan di tempat', icon: UtensilsCrossed },
  { value: 'takeaway', label: 'Takeaway', description: 'Bawa pulang', icon: ShoppingBag },
  { value: 'delivery', label: 'Delivery', description: 'Antar ke alamat', icon: MapPin },
  { value: 'digital', label: 'Digital', description: 'Produk digital', icon: Download },
];

export default function SetupWizard() {
  const { settings, updateSetting } = useStore();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [businessType, setBusinessType] = useState('');
  const [storeName, setStoreName] = useState(settings.store_name || '');
  const [waNumber, setWaNumber] = useState('');
  const [logoPreview, setLogoPreview] = useState(settings.store_logo || '');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [qrisPreview, setQrisPreview] = useState(settings.qris_image || '');
  const [uploadingQris, setUploadingQris] = useState(false);
  const [acceptCash, setAcceptCash] = useState(true);
  const [fulfillmentTypes, setFulfillmentTypes] = useState([]);
  const [openHour, setOpenHour] = useState(settings.open_hour || '07:00');
  const [closeHour, setCloseHour] = useState(settings.close_hour || '22:00');
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [finishing, setFinishing] = useState(false);

  async function handleUploadLogo(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('File harus berupa gambar', 'error');
      return;
    }

    setUploadingLogo(true);
    const ext = file.name.split('.').pop();
    const fileName = `logo-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('store-assets')
      .upload(fileName, file, { upsert: true });

    if (error) {
      addToast('Gagal upload logo', 'error');
      setUploadingLogo(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('store-assets')
      .getPublicUrl(fileName);

    setLogoPreview(urlData.publicUrl);
    await updateSetting('store_logo', urlData.publicUrl);
    setUploadingLogo(false);
    addToast('Logo berhasil diupload');
  }

  async function handleUploadQris(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('File harus berupa gambar', 'error');
      return;
    }

    setUploadingQris(true);
    const ext = file.name.split('.').pop();
    const fileName = `qris-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('store-assets')
      .upload(fileName, file, { upsert: true });

    if (error) {
      addToast('Gagal upload QRIS', 'error');
      setUploadingQris(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('store-assets')
      .getPublicUrl(fileName);

    setQrisPreview(urlData.publicUrl);
    await updateSetting('qris_image', urlData.publicUrl);
    setUploadingQris(false);
    addToast('QRIS berhasil diupload');
  }

  function handleBusinessTypeSelect(type) {
    setBusinessType(type);
    const preset = BUSINESS_PRESETS.find(p => p.type === type);
    if (preset) {
      setFulfillmentTypes(preset.defaultFulfillment || []);
    }
  }

  function toggleFulfillment(value) {
    setFulfillmentTypes(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  }

  async function handleNext() {
    // Validation
    if (step === 0 && !businessType) {
      addToast('Pilih jenis bisnis terlebih dahulu', 'error');
      return;
    }
    if (step === 1 && !storeName.trim()) {
      addToast('Nama toko harus diisi', 'error');
      return;
    }
    if (step === 4 && fulfillmentTypes.length === 0) {
      addToast('Pilih minimal 1 tipe pemenuhan', 'error');
      return;
    }

    // Save data at each step
    if (step === 0) {
      await updateSetting('business_type', businessType);
    } else if (step === 1) {
      await updateSetting('store_name', storeName);
      if (waNumber) await updateSetting('admin_whatsapp', waNumber);
    } else if (step === 4) {
      await updateSetting('fulfillment_types', JSON.stringify(fulfillmentTypes));
    } else if (step === 5) {
      await updateSetting('open_hour', openHour);
      await updateSetting('close_hour', closeHour);
    } else if (step === 6 && businessType !== 'digital') {
      if (branchName.trim()) {
        await supabase.from('branches').insert({
          name: branchName.trim(),
          address: branchAddress.trim() || null,
          is_active: true,
          sort_order: 1,
        });
      }
    }

    // Skip branch step if digital business
    if (step === 5 && businessType === 'digital') {
      setStep(7);
    } else if (step === 6 && businessType === 'digital') {
      // Should not reach here, but safety
      setStep(7);
    } else {
      setStep(step + 1);
    }
  }

  async function handleFinish() {
    setFinishing(true);
    
    // Save payment settings
    await updateSetting('accept_cash', acceptCash ? 'true' : 'false');
    
    // Generate preset data
    const { success, error } = await generateFromPreset(supabase, businessType, storeName);
    
    if (!success) {
      addToast(error || 'Gagal generate data awal', 'error');
      setFinishing(false);
      return;
    }

    await updateSetting('setup_completed', 'true');
    await updateSetting('is_open', 'true');
    setFinishing(false);
    addToast('Setup selesai! Toko siap menerima pesanan');
    navigate('/admin', { replace: true });
  }

  function handleBack() {
    // Skip branch step backward if digital
    if (step === 7 && businessType === 'digital') {
      setStep(5);
    } else {
      setStep(step - 1);
    }
  }

  const currentStepIndex = businessType === 'digital' && step === 7 ? 6 : (businessType === 'digital' && step > 6 ? step - 1 : step);
  const totalSteps = businessType === 'digital' ? 7 : 8;

  return (
    <div className="page-enter min-h-screen bg-white flex flex-col items-center justify-center px-4 py-8">
      {/* Progress */}
      <div className="w-full max-w-2xl mb-6">
        <div className="flex items-center justify-between mb-2">
          {STEPS.filter((s, idx) => businessType !== 'digital' || idx !== 6).map((s, idx) => {
            const Icon = s.icon;
            const actualIdx = businessType === 'digital' && idx >= 6 ? idx + 1 : idx;
            const isActive = actualIdx <= step;
            const isCurrent = actualIdx === step;
            return (
              <div key={idx} className="flex flex-col items-center relative flex-1">
                {idx > 0 && (
                  <div className={`absolute top-4 right-1/2 w-full h-0.5 -z-10 transition-colors ${isActive ? 'bg-primary' : 'bg-border'}`} />
                )}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isActive ? 'bg-primary text-white' : 'bg-surface-secondary text-text-muted'
                } ${isCurrent ? 'scale-110 shadow-[0_2px_8px_rgba(0,96,65,0.3)]' : ''}`}>
                  <Icon size={14} />
                </div>
                <p className={`text-[10px] mt-1 font-medium ${isActive ? 'text-primary' : 'text-text-muted'}`}>
                  {s.title}
                </p>
              </div>
            );
          })}
        </div>
        <p className="text-center text-xs text-text-muted mt-2">Langkah {currentStepIndex + 1} dari {totalSteps}</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-[var(--shadow-elevated)]">
        {/* Step 0: Business Type */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="text-center">
              <Store size={32} className="text-primary mx-auto" />
              <h2 className="text-lg font-bold text-text-primary mt-3">Pilih Jenis Bisnis Anda</h2>
              <p className="text-sm text-text-secondary mt-1">Kami akan menyesuaikan fitur sesuai kebutuhan bisnis Anda</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-6">
              {BUSINESS_PRESETS.map((preset) => {
                const Icon = BUSINESS_TYPE_ICONS[preset.type];
                const isSelected = businessType === preset.type;
                return (
                  <button
                    key={preset.type}
                    onClick={() => handleBusinessTypeSelect(preset.type)}
                    className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-surface-secondary hover:border-primary/30'
                    }`}
                  >
                    {isSelected && (
                      <CheckCircle size={16} className="absolute top-2 right-2 text-primary" />
                    )}
                    <Icon size={24} className={isSelected ? 'text-primary' : 'text-text-secondary'} />
                    <h3 className="text-sm font-semibold text-text-primary mt-2">{preset.label}</h3>
                    <p className="text-xs text-text-muted mt-1">{preset.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 1: Store Name */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center">
              <Store size={32} className="text-primary mx-auto" />
              <h2 className="text-lg font-bold text-text-primary mt-3">Nama Toko</h2>
              <p className="text-sm text-text-secondary mt-1">Masukkan nama toko yang akan ditampilkan ke pelanggan</p>
            </div>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-surface-secondary text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary/30 text-center font-semibold"
              placeholder="Nama toko kamu"
            />
            <div className="mt-4">
              <label className="text-sm font-medium text-text-secondary block mb-1.5">Nomor WhatsApp Admin</label>
              <input
                type="tel"
                value={waNumber}
                onChange={(e) => setWaNumber(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="628123456789"
                className="w-full px-4 py-3 rounded-xl bg-surface-secondary text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary/30"
              />
              <p className="text-xs text-text-muted mt-1">Format: 628xxxxxxxxxx (tanpa + atau spasi)</p>
            </div>
          </div>
        )}

        {/* Step 2: Logo Upload */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center">
              <Image size={32} className="text-primary mx-auto" />
              <h2 className="text-lg font-bold text-text-primary mt-3">Upload Logo</h2>
              <p className="text-sm text-text-secondary mt-1">Tambahkan logo toko untuk tampilan lebih profesional</p>
            </div>
            {logoPreview && (
              <div className="flex justify-center">
                <img src={logoPreview} alt="Logo Preview" className="w-32 h-32 object-cover rounded-full border-4 border-border" />
              </div>
            )}
            <label className="w-full flex items-center justify-center gap-2 bg-surface-secondary text-text-secondary px-4 py-3 rounded-xl text-sm font-medium cursor-pointer active:scale-95 transition-transform border-2 border-dashed border-border hover:border-primary/30">
              {uploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploadingLogo ? 'Mengupload...' : logoPreview ? 'Ganti Logo' : 'Pilih Logo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUploadLogo(e.target.files[0])}
              />
            </label>
            <p className="text-xs text-text-muted text-center">Bisa dilewati dan diupload nanti di Pengaturan</p>
          </div>
        )}

        {/* Step 3: Payment Methods */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-center">
              <CreditCard size={32} className="text-primary mx-auto" />
              <h2 className="text-lg font-bold text-text-primary mt-3">Metode Pembayaran</h2>
              <p className="text-sm text-text-secondary mt-1">Atur cara pelanggan membayar pesanan</p>
            </div>
            
            {/* QRIS Upload */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-text-secondary block">QRIS (opsional)</label>
              {qrisPreview && (
                <div className="flex justify-center">
                  <img src={qrisPreview} alt="QRIS Preview" className="w-40 h-40 object-contain rounded-xl border border-border" />
                </div>
              )}
              <label className="w-full flex items-center justify-center gap-2 bg-surface-secondary text-text-secondary px-4 py-3 rounded-xl text-sm font-medium cursor-pointer active:scale-95 transition-transform border-2 border-dashed border-border hover:border-primary/30">
                {uploadingQris ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {uploadingQris ? 'Mengupload...' : qrisPreview ? 'Ganti QRIS' : 'Upload QRIS'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUploadQris(e.target.files[0])}
                />
              </label>
            </div>

            {/* Cash Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-secondary">
              <div>
                <p className="text-sm font-medium text-text-primary">Terima Cash</p>
                <p className="text-xs text-text-muted mt-0.5">Pembayaran tunai di tempat</p>
              </div>
              <button
                onClick={() => setAcceptCash(!acceptCash)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  acceptCash ? 'bg-primary' : 'bg-border'
                }`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  acceptCash ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Fulfillment Types */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="text-center">
              <Package size={32} className="text-primary mx-auto" />
              <h2 className="text-lg font-bold text-text-primary mt-3">Tipe Pemenuhan</h2>
              <p className="text-sm text-text-secondary mt-1">Bagaimana pelanggan menerima pesanan?</p>
            </div>
            <div className="space-y-2">
              {FULFILLMENT_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = fulfillmentTypes.includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => toggleFulfillment(option.value)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-surface-secondary hover:border-primary/30'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isSelected ? 'bg-primary text-white' : 'bg-white text-text-secondary'
                    }`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-text-primary">{option.label}</p>
                      <p className="text-xs text-text-muted">{option.description}</p>
                    </div>
                    {isSelected && <CheckCircle size={20} className="text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 5: Operating Hours */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="text-center">
              <Clock size={32} className="text-primary mx-auto" />
              <h2 className="text-lg font-bold text-text-primary mt-3">Jam Operasional</h2>
              <p className="text-sm text-text-secondary mt-1">Atur jam buka dan tutup toko</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-text-muted block mb-1.5">Jam Buka</label>
                <input
                  type="time"
                  value={openHour}
                  onChange={(e) => setOpenHour(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface-secondary text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary/30"
                />
              </div>
              <span className="text-text-muted mt-5">—</span>
              <div className="flex-1">
                <label className="text-xs font-medium text-text-muted block mb-1.5">Jam Tutup</label>
                <input
                  type="time"
                  value={closeHour}
                  onChange={(e) => setCloseHour(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface-secondary text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary/30"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 6: First Branch (skip if digital) */}
        {step === 6 && businessType !== 'digital' && (
          <div className="space-y-4">
            <div className="text-center">
              <MapPin size={32} className="text-primary mx-auto" />
              <h2 className="text-lg font-bold text-text-primary mt-3">Cabang Pertama</h2>
              <p className="text-sm text-text-secondary mt-1">Tambahkan lokasi cabang pertama toko kamu</p>
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1.5">Nama Cabang</label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-secondary text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary/30"
                placeholder="Contoh: Cabang Utama"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted block mb-1.5">Alamat (opsional)</label>
              <input
                type="text"
                value={branchAddress}
                onChange={(e) => setBranchAddress(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-secondary text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary/30"
                placeholder="Jl. Contoh No. 123"
              />
            </div>
            <p className="text-xs text-text-muted text-center">Bisa dilewati dan ditambahkan nanti</p>
          </div>
        )}

        {/* Step 7: Done */}
        {step === 7 && (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={32} className="text-primary" />
            </div>
            <h2 className="text-lg font-bold text-text-primary">Hampir Selesai!</h2>
            <div className="bg-surface-secondary rounded-xl p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Jenis Bisnis</span>
                <span className="text-text-primary font-medium">
                  {BUSINESS_PRESETS.find(p => p.type === businessType)?.label}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Nama Toko</span>
                <span className="text-text-primary font-medium">{storeName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Tipe Pemenuhan</span>
                <span className="text-text-primary font-medium">{fulfillmentTypes.length} tipe</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Jam Operasional</span>
                <span className="text-text-primary font-medium">{openHour} - {closeHour}</span>
              </div>
            </div>
            <p className="text-sm text-text-secondary">
              Kami akan menyiapkan menu, kategori, dan pengaturan awal sesuai jenis bisnis Anda.
            </p>
            <button
              onClick={handleFinish}
              disabled={finishing}
              className="w-full bg-primary text-white py-3 rounded-full font-semibold text-sm active:scale-[0.98] transition-transform shadow-[var(--shadow-float)] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {finishing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Menyiapkan toko...
                </>
              ) : (
                'Buka Toko'
              )}
            </button>
          </div>
        )}

        {/* Navigation Buttons */}
        {step < 7 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border-light">
            <button
              onClick={handleBack}
              disabled={step === 0}
              className="flex items-center gap-1 text-sm font-medium text-text-secondary disabled:opacity-30 active:scale-95 transition-transform"
            >
              <ChevronLeft size={16} />
              Kembali
            </button>
            <div className="flex items-center gap-2">
              {(step === 2 || step === 3 || step === 6) && (
                <button
                  onClick={() => {
                    if (step === 5 && businessType === 'digital') {
                      setStep(7);
                    } else {
                      setStep(step + 1);
                    }
                  }}
                  className="text-sm font-medium text-text-muted active:scale-95 transition-transform"
                >
                  Lewati
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-1 bg-primary text-white px-5 py-2.5 rounded-full text-sm font-semibold active:scale-95 transition-transform shadow-[0_2px_8px_rgba(0,96,65,0.25)]"
              >
                Lanjut
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
