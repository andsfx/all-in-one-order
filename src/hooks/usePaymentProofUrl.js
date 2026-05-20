import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logError } from '../lib/logError';

/**
 * Custom hook to get signed URL for payment proof
 * Handles both legacy public URLs and new private storage paths
 * 
 * @param {string} paymentProofUrl - Legacy public URL (if exists)
 * @param {string} paymentProofPath - Storage path for private bucket
 * @returns {string|null} - Signed URL or public URL
 */
export function usePaymentProofUrl(paymentProofUrl, paymentProofPath) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUrl() {
      setLoading(true);
      
      // If we have a storage path (new system), generate signed URL
      if (paymentProofPath && paymentProofPath.startsWith('payment-proofs/')) {
        try {
          const { data, error } = await supabase.storage
            .from('order-attachments')
            .createSignedUrl(paymentProofPath, 3600); // 1 hour expiry
          
          if (error) {
            logError(error instanceof Error ? error : new Error(String(error.message || error)), { metadata: { source: 'usePaymentProofUrl', type: 'signed_url_error' } });
            setSignedUrl(null);
          } else {
            setSignedUrl(data.signedUrl);
          }
        } catch (error) {
          logError(error instanceof Error ? error : new Error(String(error)), { metadata: { source: 'usePaymentProofUrl' } });
          setSignedUrl(null);
        }
      } 
      // Otherwise, use the legacy public URL (for backward compatibility)
      else if (paymentProofUrl) {
        setSignedUrl(paymentProofUrl);
      } 
      else {
        setSignedUrl(null);
      }
      
      setLoading(false);
    }

    getUrl();
  }, [paymentProofUrl, paymentProofPath]);

  return { url: signedUrl, loading };
}
