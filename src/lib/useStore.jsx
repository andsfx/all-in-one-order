import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from './supabase';

const StoreContext = createContext(null);

// Derive darker/lighter shades from a hex color
function hexToHSL(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function applyPrimaryColor(hex) {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return;
  const [h, s, l] = hexToHSL(hex);
  const root = document.documentElement;
  root.style.setProperty('--color-primary', hex);
  root.style.setProperty('--color-primary-dark', `hsl(${h}, ${s}%, ${Math.max(l - 8, 10)}%)`);
  root.style.setProperty('--color-primary-light', `hsl(${h}, ${s}%, ${Math.min(l + 8, 90)}%)`);
  root.style.setProperty('--color-surface-accent', `hsl(${h}, ${Math.max(s - 40, 5)}%, ${Math.min(l + 55, 96)}%)`);
  root.style.setProperty('--shadow-float', `0 8px 24px hsla(${h}, ${s}%, ${l}%, 0.15)`);
}

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
      // Apply primary color to CSS variables
      if (map.primary_color) applyPrimaryColor(map.primary_color);
    }
    setLoading(false);
  }

  useEffect(() => { fetchSettings(); }, []);

  async function updateSetting(key, value) {
    await supabase.from('store_settings').upsert({ key, value: String(value) });
    setSettings(prev => {
      const next = { ...prev, [key]: String(value) };
      if (key === 'primary_color') applyPrimaryColor(String(value));
      return next;
    });
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
