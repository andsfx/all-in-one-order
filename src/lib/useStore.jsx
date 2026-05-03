import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from './supabase';

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [settings, setSettings] = useState({
    store_name: 'Order Kopi',
    store_logo: '',
    primary_color: '#006041',
    qris_image: '/qris.jpg',
    open_hour: '07:00',
    close_hour: '22:00',
    is_open: 'true',
    setup_completed: 'false',
    admin_whatsapp: '',
  });
  const [loading, setLoading] = useState(true);

  async function fetchSettings() {
    const { data } = await supabase.from('store_settings').select('*');
    if (data) {
      const map = {};
      data.forEach(row => { map[row.key] = row.value; });
      setSettings(prev => ({ ...prev, ...map }));
    }
    setLoading(false);
  }

  useEffect(() => { fetchSettings(); }, []);

  async function updateSetting(key, value) {
    await supabase.from('store_settings').upsert({ key, value: String(value) });
    setSettings(prev => ({ ...prev, [key]: String(value) }));
  }

  return (
    <StoreContext.Provider value={{ settings, loading, updateSetting, fetchSettings }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore harus digunakan di dalam StoreProvider');
  return ctx;
}
