/**
 * Rate Limiting Utility for Edge Functions
 * 
 * In-memory rate limiting per IP address.
 * Note: Edge Functions are stateless per cold start, so this provides
 * best-effort rate limiting. For stricter limits, use Supabase RLS + DB-based tracking.
 */

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // Max requests per window

// In-memory rate limit store: IP -> array of timestamps
const rateLimitStore = new Map<string, number[]>();

/**
 * Extract client IP from request headers
 */
export function getClientIP(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

/**
 * Check if request should be rate limited
 * Returns null if allowed, or seconds until retry if rate limited
 */
export function checkRateLimit(
  ip: string, 
  maxRequests: number = RATE_LIMIT_MAX_REQUESTS,
  windowMs: number = RATE_LIMIT_WINDOW_MS
): number | null {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Get existing timestamps for this IP
  let timestamps = rateLimitStore.get(ip) || [];
  
  // Remove timestamps outside the current window
  timestamps = timestamps.filter(ts => ts > windowStart);
  
  // Check if limit exceeded
  if (timestamps.length >= maxRequests) {
    const oldestTimestamp = timestamps[0];
    const retryAfterMs = oldestTimestamp + windowMs - now;
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
    
    return retryAfterSeconds;
  }
  
  // Add current timestamp
  timestamps.push(now);
  rateLimitStore.set(ip, timestamps);
  
  return null;
}

/**
 * Create a rate limit exceeded response
 */
export function rateLimitResponse(retryAfterSeconds: number, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ 
      error: 'Rate limit exceeded. Too many requests.',
      retry_after_seconds: retryAfterSeconds
    }),
    { 
      status: 429,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': retryAfterSeconds.toString(),
      } 
    }
  );
}
