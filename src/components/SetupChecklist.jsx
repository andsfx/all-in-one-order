import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Circle, ClipboardList, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CHECKLIST = [
  {
    key: 'storeName',
    label: 'Nama toko sudah diisi',
    to: '/admin/settings',
  },
  {
    key: 'storeLogo',
    label: 'Logo sudah diupload',
    to: '/admin/settings',
  },
  {
    key: 'qrisImage',
    label: 'QRIS sudah diupload',
    to: '/admin/settings',
  },
  {
    key: 'activeProducts',
    label: 'Minimal 1 produk aktif',
    to: '/admin/menu',
  },
  {
    key: 'operationalHours',
    label: 'Jam operasional diatur',
    to: '/admin/settings',
  },
  {
    key: 'realProducts',
    label: 'Ganti produk sample dengan produk asli',
    to: '/admin/menu',
  },
];

export default function SetupChecklist() {
  const [completed, setCompleted] = useState({});
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchChecklist() {
      const [{ data: settingsData }, { count: activeProducts }, { count: realProducts }] = await Promise.all([
        supabase.from('store_settings').select('key, value'),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_available', true),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_starter', false),
      ]);

      if (!active) return;

      const settings = Object.fromEntries((settingsData || []).map((item) => [item.key, item.value]));

      setCompleted({
        storeName: Boolean(settings.store_name && settings.store_name !== 'Toko Saya'),
        storeLogo: Boolean(settings.store_logo),
        qrisImage: Boolean(settings.qris_image),
        activeProducts: (activeProducts || 0) > 0,
        operationalHours: Boolean(settings.open_hour && settings.close_hour),
        realProducts: (realProducts || 0) > 0,
      });
      setLoading(false);
    }

    fetchChecklist();

    return () => {
      active = false;
    };
  }, []);

  async function handleHide() {
    setHidden(true);
    await supabase
      .from('store_settings')
      .upsert({ key: 'hide_checklist', value: 'true' }, { onConflict: 'key' });
  }

  if (hidden) return null;

  const doneCount = CHECKLIST.filter((item) => completed[item.key]).length;
  const allDone = doneCount === CHECKLIST.length;
  const progress = loading ? 0 : (doneCount / CHECKLIST.length) * 100;

  return (
    <section className="mb-4 w-full rounded-2xl border border-border bg-white p-4 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ClipboardList size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-text-primary">Persiapan Toko</h2>
          <p className="text-sm text-text-secondary">{doneCount}/6 langkah selesai</p>
        </div>
        <button
          type="button"
          onClick={handleHide}
          className="rounded-full p-1.5 text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-secondary"
          aria-label="Sembunyikan Checklist"
        >
          <X size={18} />
        </button>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-surface-secondary">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {allDone ? (
        <div className="rounded-xl bg-primary/10 p-4 text-center">
          <p className="font-bold text-text-primary">Toko Anda siap! 🎉</p>
          <p className="mt-1 text-sm text-text-secondary">Checklist selesai. Pesanan pelanggan bisa mulai masuk.</p>
          <button
            type="button"
            onClick={handleHide}
            className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white active:scale-[0.98] transition-transform"
          >
            Sembunyikan Checklist
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {CHECKLIST.map((item) => {
            const done = completed[item.key];
            const Icon = done ? CheckCircle : Circle;

            return (
              <Link
                key={item.key}
                to={item.to}
                className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-surface-secondary active:scale-[0.99]"
              >
                <Icon size={20} className={done ? 'shrink-0 text-green-600' : 'shrink-0 text-text-muted'} />
                <span className={done ? 'text-sm font-medium text-text-primary' : 'text-sm font-medium text-text-secondary'}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
