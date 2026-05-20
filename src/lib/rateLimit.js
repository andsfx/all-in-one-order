/**
 * Rate Limiting Utility
 * 
 * Prevents abuse by limiting the number of orders a customer can place
 * within a specific time window. Uses localStorage to track order attempts.
 */

import { logError } from './logError';

const RATE_LIMIT_KEY = 'order_rate_limit';
const MAX_ORDERS = 5; // Maximum orders allowed per time window
const WINDOW_MS = 60 * 60 * 1000; // 1 hour time window

/**
 * Check if the user has exceeded the rate limit
 * @returns {Object} { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit() {
  try {
    const stored = localStorage.getItem(RATE_LIMIT_KEY);
    const now = Date.now();
    
    if (!stored) {
      // First order, initialize rate limit
      const data = {
        count: 1,
        resetAt: now + WINDOW_MS,
        orders: [now]
      };
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
      
      return {
        allowed: true,
        remaining: MAX_ORDERS - 1,
        resetAt: data.resetAt
      };
    }
    
    const data = JSON.parse(stored);
    
    // Check if time window has expired
    if (now >= data.resetAt) {
      // Reset the counter
      const newData = {
        count: 1,
        resetAt: now + WINDOW_MS,
        orders: [now]
      };
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(newData));
      
      return {
        allowed: true,
        remaining: MAX_ORDERS - 1,
        resetAt: newData.resetAt
      };
    }
    
    // Within time window, check if limit exceeded
    if (data.count >= MAX_ORDERS) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: data.resetAt
      };
    }
    
    // Increment counter
    data.count++;
    data.orders.push(now);
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
    
    return {
      allowed: true,
      remaining: MAX_ORDERS - data.count,
      resetAt: data.resetAt
    };
    
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { metadata: { source: 'rateLimit.checkRateLimit' } });
    // On error, allow the request (fail open)
    return {
      allowed: true,
      remaining: MAX_ORDERS,
      resetAt: Date.now() + WINDOW_MS
    };
  }
}

/**
 * Get current rate limit status without incrementing
 * @returns {Object} { count: number, remaining: number, resetAt: number }
 */
export function getRateLimitStatus() {
  try {
    const stored = localStorage.getItem(RATE_LIMIT_KEY);
    const now = Date.now();
    
    if (!stored) {
      return {
        count: 0,
        remaining: MAX_ORDERS,
        resetAt: now + WINDOW_MS
      };
    }
    
    const data = JSON.parse(stored);
    
    // Check if expired
    if (now >= data.resetAt) {
      return {
        count: 0,
        remaining: MAX_ORDERS,
        resetAt: now + WINDOW_MS
      };
    }
    
    return {
      count: data.count,
      remaining: Math.max(0, MAX_ORDERS - data.count),
      resetAt: data.resetAt
    };
    
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { metadata: { source: 'rateLimit.getRateLimitStatus' } });
    return {
      count: 0,
      remaining: MAX_ORDERS,
      resetAt: Date.now() + WINDOW_MS
    };
  }
}

/**
 * Reset the rate limit counter (for testing or admin purposes)
 */
export function resetRateLimit() {
  try {
    localStorage.removeItem(RATE_LIMIT_KEY);
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { metadata: { source: 'rateLimit.resetRateLimit' } });
  }
}

/**
 * Format time remaining until reset
 * @param {number} resetAt - Timestamp when rate limit resets
 * @returns {string} Human-readable time remaining
 */
export function formatTimeRemaining(resetAt) {
  const now = Date.now();
  const remaining = resetAt - now;
  
  if (remaining <= 0) {
    return 'sekarang';
  }
  
  const minutes = Math.ceil(remaining / (60 * 1000));
  
  if (minutes < 60) {
    return `${minutes} menit`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) {
    return `${hours} jam`;
  }
  
  return `${hours} jam ${mins} menit`;
}

/**
 * Get configuration values (for display purposes)
 * @returns {Object} { maxOrders: number, windowMinutes: number }
 */
export function getRateLimitConfig() {
  return {
    maxOrders: MAX_ORDERS,
    windowMinutes: WINDOW_MS / (60 * 1000)
  };
}
