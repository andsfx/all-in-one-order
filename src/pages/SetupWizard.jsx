import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, QrCode, Clock, MapPin, CheckCircle, ChevronRight, ChevronLeft, Upload, Loader2 } from 'lucide-react';
import { useStore } from '../lib/useStore';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';

const STEPS = [
  { icon: Store, title: 'Nama Toko' },
  { icon: QrCode, title: 'Upload QRIS' },
  { icon: Clock, title: 'Jam Operasional' },
  { icon: MapPin, title: 'Cabang Pertama' },
  { icon: CheckCircle, title: 'Selesai' },
];

export default function SetupWizard() {
  const { settings, updateSetting } = useStore();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [storeName, setStoreName] = useState(settings.store_name || 'Order Kopi');
  const [qrisPreview, setQrisPreview] = useState(settings.qris_image || '');
  const [uploadingQris, setUploadingQris] = useState(false);
  const [openHour, setOpenHour] = useState(settings.open_hour || '07:00');
  const [closeHour, setCloseHour] = useState(settings.close_hour || '22:00');
  const [waNumber, setWaNumber] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [finishing, setFinishing] = useState(false);

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

  async function handleNext() {
    if (step === 0) {
      await updateSetting('store_name', storeName);
      if (waNumber) await updateSetting('admin_whatsapp', waNumber);
    } else if (step === 2) {
      await updateSetting('open_hour', openHour);
      await updateSetting('close_hour', closeHour);
    } else if (step === 3) {
      if (branchName.trim()) {
        await supabase.from('branches').insert({
          name: branchName.trim(),
          address: branchAddress.trim() || null,
          is_active: true,
          sort_order: 1,
        });
      }
    }
    setStep(step + 1);
  }

  async function handleFinish() {
    setFinishing(true);
    await updateSetting('setup_completed', 'true');
    await updateSetting('is_open', 'true');
    setFinishing(false);
    addToast('Setup selesai! Toko siap menerima pesanan');
    navigate('/admin', { replace: true });
  }

  return (
    <div className="page-enter min-h-screen bg-white flex flex-col items-center justify-center px-4 py-8">
      {/* Progress */}
      <div className="w-full max-w-md mb-6">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div key={idx} className="flex flex-col items-center relative flex-1">
                {idx > 0 && (
                  <div className={`absolute top-4 right-1/2 w-full h-0.5 -z-10 ${idx <= step ? 'bg-primary' : 'bg-border'}`} />
                )}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  idx <= step ? 'bg-primary text-white' : 'bg-surface-secondary text-text-muted'
                } ${idx === step ? 'scale-110 shadow-[0_2px_8px_rgba(0,96,65,0.3)]' : ''}`}>
                  <Icon size={14} />
                </div>
                <p className={`text-[10px] mt-1 font-medium ${idx <= step ? 'text-primary' : 'text-text-muted'}`}>
                  {s.title}
                </p>
              </div>
            );
          })}
        </div>
        <p className="text-center text-xs text-text-muted mt-2">Langkah {step + 1} dari {STEPS.length}</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-[var(--shadow-elevated)]">
        {/* Step 0: Store Name */}
        {step === 0 && (
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

        {/* Step 1: QRIS Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center">
              <QrCode size={32} className="text-primary mx-auto" />
              <h2 className="text-lg font-bold text-text-primary mt-3">Upload QRIS</h2>
              <p className="text-sm text-text-secondary mt-1">Upload gambar QRIS untuk pembayaran pelanggan</p>
            </div>
            {qrisPreview && (
              <div className="flex justify-center">
                <img src={qrisPreview} alt="QRIS Preview" className="w-40 h-40 object-contain rounded-xl border border-border" />
              </div>
            )}
            <label className="w-full flex items-center justify-center gap-2 bg-surface-secondary text-text-secondary px-4 py-3 rounded-xl text-sm font-medium cursor-pointer active:scale-95 transition-transform border-2 border-dashed border-border hover:border-primary/30">
              {uploadingQris ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploadingQris ? 'Mengupload...' : qrisPreview ? 'Ganti QRIS' : 'Pilih Gambar QRIS'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUploadQris(e.target.files[0])}
              />
            </label>
            <p className="text-xs text-text-muted text-center">Bisa dilewati dan diupload nanti di Pengaturan</p>
          </div>
        )}

        {/* Step 2: Operating Hours */}
        {step === 2 && (
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

        {/* Step 3: First Branch */}
        {step === 3 && (
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

        {/* Step 4: Done */}
        {step === 4 && (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={32} className="text-primary" />
            </div>
            <h2 className="text-lg font-bold text-text-primary">Setup Selesai!</h2>
            <p className="text-sm text-text-secondary">
              Toko <span className="font-semibold text-primary">{storeName}</span> siap menerima pesanan.
              Kamu bisa mengubah pengaturan kapan saja di menu Pengaturan.
            </p>
            <button
              onClick={handleFinish}
              disabled={finishing}
              className="w-full bg-primary text-white py-3 rounded-full font-semibold text-sm active:scale-[0.98] transition-transform shadow-[var(--shadow-float)] disabled:opacity-60"
            >
              {finishing ? 'Menyimpan...' : 'Mulai Terima Pesanan'}
            </button>
          </div>
        )}

        {/* Navigation Buttons */}
        {step < 4 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border-light">
            <button
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
              className="flex items-center gap-1 text-sm font-medium text-text-secondary disabled:opacity-30 active:scale-95 transition-transform"
            >
              <ChevronLeft size={16} />
              Kembali
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-1 bg-primary text-white px-5 py-2.5 rounded-full text-sm font-semibold active:scale-95 transition-transform shadow-[0_2px_8px_rgba(0,96,65,0.25)]"
            >
              {step === 3 ? 'Selesai' : 'Lanjut'}
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
