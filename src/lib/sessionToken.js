/**
 * Session Token Management
 * 
 * Generates and manages unique session tokens for anonymous order tracking.
 * Each customer gets a unique token stored in localStorage that identifies their orders.
 * Tokens expire after 24 hours for security, but auto-refresh on user activity.
 */

import { logError } from './logError';

const SESSION_TOKEN_KEY = 'order_session_token';
const TOKEN_EXPIRY_KEY = 'order_session_expiry';
const LAST_ACTIVITY_KEY = 'order_last_activity';
const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours
const ACTIVITY_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes - refresh if active within this window
const REFRESH_BUFFER_MS = 2 * 60 * 60 * 1000; // 2 hours - refresh if less than this time remaining

/**
 * Generate a UUID v4 token using crypto-safe random
 * @returns {string} UUID v4 string
 */
function generateUUID() {
  // Use native crypto.randomUUID if available
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  
  // Fallback: build v4 UUID from crypto.getRandomValues
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  
  // Set version (4) and variant (10xx) bits per RFC 4122
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
  
  // Convert to hex string in UUID format
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Create a new session token and store it with expiry
 * @returns {string} The newly created session token
 */
export function createSessionToken() {
  const token = generateUUID();
  const expiry = Date.now() + TOKEN_LIFETIME_MS;
  
  try {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { metadata: { source: 'sessionToken.createSessionToken' } });
  }
  
  return token;
}

/**
 * Get the current session token, creating one if it doesn't exist or is expired
 * Auto-refreshes token if user has been active recently
 * @returns {string} The current valid session token
 */
export function getSessionToken() {
  try {
    const token = localStorage.getItem(SESSION_TOKEN_KEY);
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    
    // Check if token exists and is not expired
    if (token && expiry) {
      const expiryTime = parseInt(expiry, 10);
      const now = Date.now();
      
      if (now < expiryTime) {
        // Token is valid, check if we should refresh it
        const timeRemaining = expiryTime - now;
        
        // Auto-refresh if:
        // 1. Less than 2 hours remaining AND
        // 2. User was active in last 30 minutes
        if (timeRemaining < REFRESH_BUFFER_MS && lastActivity) {
          const lastActivityTime = parseInt(lastActivity, 10);
          const timeSinceActivity = now - lastActivityTime;
          
          if (timeSinceActivity < ACTIVITY_THRESHOLD_MS) {
            // User is active, refresh the token expiry
            refreshTokenExpiry();
          }
        }
        
        return token;
      }
      
      // Token expired, clear it
      clearSessionToken();
    }
    
    // Create new token if none exists or expired
    return createSessionToken();
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { metadata: { source: 'sessionToken.getSessionToken' } });
    // Fallback: generate token without storing
    return generateUUID();
  }
}

/**
 * Clear the current session token and expiry
 */
export function clearSessionToken() {
  try {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { metadata: { source: 'sessionToken.clearSessionToken' } });
  }
}

/**
 * Check if a session token exists and is valid
 * @returns {boolean} True if valid token exists
 */
export function hasValidToken() {
  try {
    const token = localStorage.getItem(SESSION_TOKEN_KEY);
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    
    if (!token || !expiry) {
      return false;
    }
    
    const expiryTime = parseInt(expiry, 10);
    return Date.now() < expiryTime;
  } catch (error) {
    return false;
  }
}

/**
 * Get the remaining time until token expiry in milliseconds
 * @returns {number} Milliseconds until expiry, or 0 if no valid token
 */
export function getTokenTimeRemaining() {
  try {
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    
    if (!expiry) {
      return 0;
    }
    
    const expiryTime = parseInt(expiry, 10);
    const remaining = expiryTime - Date.now();
    
    return remaining > 0 ? remaining : 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Refresh the token expiry time (extend by another 24 hours)
 * Also updates last activity timestamp
 */
export function refreshTokenExpiry() {
  try {
    const token = localStorage.getItem(SESSION_TOKEN_KEY);
    
    if (token) {
      const newExpiry = Date.now() + TOKEN_LIFETIME_MS;
      localStorage.setItem(TOKEN_EXPIRY_KEY, newExpiry.toString());
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    }
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { metadata: { source: 'sessionToken.refreshTokenExpiry' } });
  }
}

/**
 * Record user activity (call this on user interactions)
 * This helps determine if token should be auto-refreshed
 */
export function recordActivity() {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { metadata: { source: 'sessionToken.recordActivity' } });
  }
}

/**
 * Get time since last recorded activity
 * @returns {number} Milliseconds since last activity, or Infinity if no activity recorded
 */
export function getTimeSinceLastActivity() {
  try {
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    
    if (!lastActivity) {
      return Infinity;
    }
    
    const lastActivityTime = parseInt(lastActivity, 10);
    return Date.now() - lastActivityTime;
  } catch (error) {
    return Infinity;
  }
}

/**
 * Check if user is considered "active" (activity within threshold)
 * @returns {boolean} True if user has been active recently
 */
export function isUserActive() {
  const timeSinceActivity = getTimeSinceLastActivity();
  return timeSinceActivity < ACTIVITY_THRESHOLD_MS;
}

/**
 * Get token status information for debugging/display
 * @returns {Object} Token status details
 */
export function getTokenStatus() {
  try {
    const token = localStorage.getItem(SESSION_TOKEN_KEY);
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    
    if (!token || !expiry) {
      return {
        hasToken: false,
        isValid: false,
        timeRemaining: 0,
        willAutoRefresh: false
      };
    }
    
    const expiryTime = parseInt(expiry, 10);
    const now = Date.now();
    const timeRemaining = expiryTime - now;
    const isValid = timeRemaining > 0;
    
    let willAutoRefresh = false;
    if (isValid && lastActivity) {
      const lastActivityTime = parseInt(lastActivity, 10);
      const timeSinceActivity = now - lastActivityTime;
      willAutoRefresh = timeRemaining < REFRESH_BUFFER_MS && timeSinceActivity < ACTIVITY_THRESHOLD_MS;
    }
    
    return {
      hasToken: true,
      isValid,
      timeRemaining: Math.max(0, timeRemaining),
      timeSinceActivity: lastActivity ? now - parseInt(lastActivity, 10) : null,
      willAutoRefresh
    };
  } catch (error) {
    return {
      hasToken: false,
      isValid: false,
      timeRemaining: 0,
      willAutoRefresh: false,
      error: error.message
    };
  }
}
