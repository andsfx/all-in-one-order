import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export function useStoreStatus() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      const { data, error } = await supabase
        .from('store_settings')
        .select('key, value');

      if (!error && data) {
        const map = {};
        data.forEach((row) => { map[row.key] = row.value; });
        setSettings(map);
      }
      setLoading(false);
    }

    fetchSettings();
  }, []);

  // Check if store is currently open based on WIB (UTC+7)
  function isOpen() {
    if (loading || !settings) return true; // Default open while loading

    // Manual override - handle both boolean and string
    const manualOverride = settings.is_open;
    
    // Debug logging
    console.log('Store Status Debug:', {
      manualOverride,
      type: typeof manualOverride,
      settings,
    });
    
    if (manualOverride === false || manualOverride === 'false') {
      console.log('Store manually closed');
      return false;
    }
    if (manualOverride === true || manualOverride === 'true') {
      console.log('Store manually opened');
      return true;
    }

    const openHour = settings.open_hour || '07:00';
    const closeHour = settings.close_hour || '22:00';

    // Get current time in WIB (UTC+7)
    const now = new Date();
    const wibOffset = 7 * 60; // UTC+7 in minutes
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const wibMinutes = (utcMinutes + wibOffset) % (24 * 60);

    const [openH, openM] = openHour.split(':').map(Number);
    const [closeH, closeM] = closeHour.split(':').map(Number);
    const openMin = openH * 60 + openM;
    const closeMin = closeH * 60 + closeM;
    
    const isOpenNow = wibMinutes >= openMin && wibMinutes < closeMin;
    
    console.log('Store Hours Check:', {
      openHour,
      closeHour,
      wibMinutes,
      openMin,
      closeMin,
      isOpenNow,
    });

    return isOpenNow;
  }

  return {
    isOpen: isOpen(),
    loading,
    settings,
  };
}
