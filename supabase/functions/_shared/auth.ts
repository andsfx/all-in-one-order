/**
 * Maintenance Auth Helper
 * 
 * Validates that maintenance/cron requests carry a valid MAINTENANCE_TOKEN.
 * Used by: auto-cancel, cleanup-old-proofs, confirm-payment
 */

const MAINTENANCE_TOKEN = Deno.env.get('MAINTENANCE_TOKEN');

export interface AuthResult {
  authorized: boolean;
  error?: string;
}

/**
 * Verify maintenance authorization.
 * Expects header: Authorization: Bearer <MAINTENANCE_TOKEN>
 */
export function requireMaintenanceAuth(req: Request): AuthResult {
  if (!MAINTENANCE_TOKEN) {
    console.error('MAINTENANCE_TOKEN env not configured');
    return { authorized: false, error: 'Server misconfiguration' };
  }

  const authHeader = req.headers.get('Authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return { authorized: false, error: 'Missing or malformed Authorization header' };
  }

  const token = match[1];

  // Constant-time compare to prevent timing attacks on token
  if (token.length !== MAINTENANCE_TOKEN.length) {
    return { authorized: false, error: 'Invalid token' };
  }

  const encoder = new TextEncoder();
  const a = encoder.encode(token);
  const b = encoder.encode(MAINTENANCE_TOKEN);

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }

  if (diff !== 0) {
    return { authorized: false, error: 'Invalid token' };
  }

  return { authorized: true };
}

/**
 * Helper: return 405 for disallowed methods.
 */
export function methodNotAllowed(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Helper: return 401 for unauthorized requests.
 */
export function unauthorizedResponse(error: string, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
