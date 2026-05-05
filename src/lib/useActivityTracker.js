/**
 * Activity Tracker Hook
 * 
 * Tracks user activity and automatically refreshes session token
 * when user is active. Prevents token expiry during active sessions.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { recordActivity, getTokenStatus } from './sessionToken';

// Events that indicate user activity
const ACTIVITY_EVENTS = [
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'click'
];

// Throttle activity recording to avoid excessive localStorage writes
const ACTIVITY_RECORD_THROTTLE_MS = 60 * 1000; // 1 minute

/**
 * Hook to track user activity and auto-refresh session token
 * @param {boolean} enabled - Whether activity tracking is enabled (default: true)
 */
export function useActivityTracker(enabled = true) {
  const lastRecordedRef = useRef(0);
  const statusCheckIntervalRef = useRef(null);

  const handleActivity = useCallback(() => {
    if (!enabled) return;

    const now = Date.now();
    const timeSinceLastRecord = now - lastRecordedRef.current;

    // Throttle: only record activity once per minute
    if (timeSinceLastRecord >= ACTIVITY_RECORD_THROTTLE_MS) {
      recordActivity();
      lastRecordedRef.current = now;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Attach activity listeners
    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Record initial activity
    recordActivity();
    lastRecordedRef.current = Date.now();

    // Periodic check for token status (every 5 minutes)
    // This ensures token gets refreshed even if user is passively viewing
    statusCheckIntervalRef.current = setInterval(() => {
      const status = getTokenStatus();
      
      // If token is about to expire and user is inactive, warn
      if (status.isValid && status.timeRemaining < 5 * 60 * 1000 && !status.willAutoRefresh) {
        console.warn('⚠️ Session token will expire soon. User appears inactive.');
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    // Cleanup
    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
      }
    };
  }, [enabled, handleActivity]);

  return null;
}

/**
 * Hook to get current token status (for debugging/display)
 * @param {number} refreshInterval - How often to refresh status (ms), default 60000 (1 minute)
 * @returns {Object} Token status object
 */
export function useTokenStatus(refreshInterval = 60000) {
  const [status, setStatus] = useState(() => getTokenStatus());

  useEffect(() => {
    // Update status immediately
    setStatus(getTokenStatus());

    // Set up interval to refresh status
    const interval = setInterval(() => {
      setStatus(getTokenStatus());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  return status;
}

/**
 * Format time remaining in human-readable format
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted time string
 */
export function formatTimeRemaining(ms) {
  if (ms <= 0) return 'Expired';
  
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  
  return `${minutes}m`;
}
