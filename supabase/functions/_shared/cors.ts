/**
 * CORS Configuration
 * 
 * Restricts cross-origin access to allowed domains only.
 * Prevents CSRF and phishing attacks on payment-related endpoints.
 * 
 * Set ALLOWED_ORIGINS env var (comma-separated) for production.
 * Falls back to localhost for development.
 */

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

function getAllowedOrigins(): string[] {
  const envOrigins = Deno.env.get('ALLOWED_ORIGINS');
  if (envOrigins) {
    return envOrigins.split(',').map(o => o.trim().replace(/\/+$/, '')).filter(Boolean);
  }
  return DEFAULT_ALLOWED_ORIGINS;
}

/**
 * Get CORS headers for a request, validating the Origin header
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = (req.headers.get('Origin') || '').replace(/\/+$/, '');
  const allowedOrigins = getAllowedOrigins();

  // Allow if origin matches any allowed pattern
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  };
}
