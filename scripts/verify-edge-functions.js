#!/usr/bin/env node
/**
 * Edge Function Security Verification Script
 * ============================================
 *
 * Manually verifies the security posture of deployed Supabase Edge Functions:
 *   - payment-webhook   : HMAC signature validation
 *   - confirm-payment   : Maintenance token + POST-only + idempotency
 *   - verify-payment    : POST-only + input validation
 *   - auto-cancel-orders: Maintenance token (if deployed)
 *   - cleanup-old-proofs: Maintenance token (if deployed)
 *
 * USAGE
 * -----
 *   1. Deploy Edge Functions to a *non-production* Supabase project.
 *   2. Export required env vars (see below).
 *   3. Run: node scripts/verify-edge-functions.js
 *
 * REQUIRED ENV VARS
 * -----------------
 *   SUPABASE_URL           - e.g. https://abc123.supabase.co
 *   SUPABASE_ANON_KEY      - anon public key (used as Authorization bearer)
 *   BAYAR_WEBHOOK_SECRET   - same secret configured on the Edge Function
 *   MAINTENANCE_TOKEN      - same token configured on the Edge Function
 *
 * OPTIONAL ENV VARS
 * -----------------
 *   TEST_ORDER_ID          - existing order id to use for idempotency tests
 *                            (if omitted, the idempotency case is skipped)
 *
 * EXIT CODES
 * ----------
 *   0  - all tests passed (or skipped intentionally)
 *   1  - one or more tests failed
 *   2  - misconfiguration (missing env vars, bad URL, etc.)
 *
 * SAFETY NOTES
 * ------------
 *   - This script does NOT contact bayar.gg or any real payment provider.
 *   - It does NOT read or print real secrets - secrets are read from env only.
 *   - It is NOT wired into `npm test` and will NOT run in CI by default.
 *   - Run only against a disposable / staging Supabase project.
 */

'use strict';

const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Environment validation
// ---------------------------------------------------------------------------

const REQUIRED_ENV = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'BAYAR_WEBHOOK_SECRET',
  'MAINTENANCE_TOKEN',
];

function loadEnv() {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k] || !process.env[k].trim());
  if (missing.length > 0) {
    console.error('\nERROR: Missing required environment variables:');
    for (const k of missing) console.error(`  - ${k}`);
    console.error('\nSee header comment in this file for usage.');
    process.exit(2);
  }

  const url = process.env.SUPABASE_URL.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//.test(url)) {
    console.error(`ERROR: SUPABASE_URL must start with http:// or https:// (got: ${url})`);
    process.exit(2);
  }

  return {
    SUPABASE_URL: url,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY.trim(),
    BAYAR_WEBHOOK_SECRET: process.env.BAYAR_WEBHOOK_SECRET.trim(),
    MAINTENANCE_TOKEN: process.env.MAINTENANCE_TOKEN.trim(),
    TEST_ORDER_ID: (process.env.TEST_ORDER_ID || '').trim(),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const results = []; // { name, status: 'pass'|'fail'|'skip', message }

function log(label, color, msg) {
  const c = COLORS[color] || '';
  console.log(`${c}${label}${COLORS.reset} ${msg}`);
}

function recordPass(name, message = '') {
  results.push({ name, status: 'pass', message });
  log('PASS', 'green', `${name}${message ? ' - ' + message : ''}`);
}

function recordFail(name, message) {
  results.push({ name, status: 'fail', message });
  log('FAIL', 'red', `${name} - ${message}`);
}

function recordSkip(name, message) {
  results.push({ name, status: 'skip', message });
  log('SKIP', 'yellow', `${name} - ${message}`);
}

function functionUrl(env, name) {
  return `${env.SUPABASE_URL}/functions/v1/${name}`;
}

/**
 * Compute hex HMAC-SHA256 of body using secret. Mirrors the algorithm in
 * supabase/functions/payment-webhook/index.ts.
 */
function hmacSha256Hex(secret, body) {
  return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

/**
 * Wrapped fetch with timeout. Returns { status, headers, text }.
 * Falls back gracefully if global fetch is missing (Node < 18).
 */
async function call(url, opts = {}, timeoutMs = 10_000) {
  if (typeof fetch !== 'function') {
    throw new Error('global fetch() unavailable - use Node 18+ to run this script');
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    const text = await res.text();
    return { status: res.status, headers: res.headers, text };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Assert helper. Pass when actual === expected; otherwise record failure.
 */
function expectStatus(name, res, expected) {
  const list = Array.isArray(expected) ? expected : [expected];
  if (list.includes(res.status)) {
    recordPass(name, `status=${res.status}`);
    return true;
  }
  recordFail(
    name,
    `expected status ${list.join(' or ')}, got ${res.status} body=${truncate(res.text, 160)}`,
  );
  return false;
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '...' : s;
}

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

/**
 * Test 1: payment-webhook rejects requests with NO X-Signature header.
 * Expected: 401 Unauthorized.
 */
async function testWebhookMissingSignature(env) {
  const name = 'payment-webhook: missing signature -> 401';
  const url = functionUrl(env, 'payment-webhook');
  const body = JSON.stringify({ event: 'payment.paid', invoice_id: 'test_no_sig' });
  const res = await call(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    },
    body,
  });
  expectStatus(name, res, 401);
}

/**
 * Test 2: payment-webhook rejects requests with INVALID signature.
 * Expected: 401 Unauthorized.
 */
async function testWebhookInvalidSignature(env) {
  const name = 'payment-webhook: invalid signature -> 401';
  const url = functionUrl(env, 'payment-webhook');
  const body = JSON.stringify({ event: 'payment.paid', invoice_id: 'test_bad_sig' });
  const res = await call(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      'X-Signature': 'deadbeef'.repeat(8),
    },
    body,
  });
  expectStatus(name, res, 401);
}

/**
 * Test 3: payment-webhook rejects MALFORMED JSON even with valid signature.
 * The HMAC is computed over the raw body string, so we sign garbage and
 * expect the function to verify the signature, then fail to parse JSON.
 * Expected: 400 Bad Request (or 500 if the function does not guard JSON.parse).
 */
async function testWebhookMalformedBody(env) {
  const name = 'payment-webhook: malformed JSON body -> 400 or 500';
  const url = functionUrl(env, 'payment-webhook');
  const body = '{not valid json';
  const sig = hmacSha256Hex(env.BAYAR_WEBHOOK_SECRET, body);
  const res = await call(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      'X-Signature': sig,
    },
    body,
  });
  // Accept either 400 (defensive guard) or 500 (uncaught parse error).
  // 401 would mean signature validation broke, which is a real failure.
  if (res.status === 400) {
    recordPass(name, 'status=400');
  } else if (res.status === 500) {
    recordPass(name, 'status=500 (unhandled parse - acceptable, signature passed)');
  } else {
    recordFail(name, `expected 400 or 500, got ${res.status} body=${truncate(res.text, 160)}`);
  }
}

/**
 * Test 4: payment-webhook rejects non-POST methods.
 * Expected: 405 Method Not Allowed.
 */
async function testWebhookNonPost(env) {
  const name = 'payment-webhook: GET method -> 405';
  const url = functionUrl(env, 'payment-webhook');
  const res = await call(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
  });
  expectStatus(name, res, 405);
}

/**
 * Test 5: confirm-payment rejects non-POST methods.
 * Expected: 405 Method Not Allowed.
 */
async function testConfirmPaymentNonPost(env) {
  const name = 'confirm-payment: GET method -> 405';
  const url = functionUrl(env, 'confirm-payment');
  const res = await call(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
  });
  expectStatus(name, res, 405);
}

/**
 * Test 6: confirm-payment rejects requests without Maintenance bearer token.
 * Note: Supabase gateway requires the anon key for routing; the function then
 * checks for a Bearer that matches MAINTENANCE_TOKEN. We send the anon key as
 * the bearer (which won't match MAINTENANCE_TOKEN unless they are identical -
 * in normal config they are not).
 * Expected: 401 Unauthorized.
 */
async function testConfirmPaymentMissingMaintenanceToken(env) {
  const name = 'confirm-payment: missing/invalid maintenance token -> 401';
  const url = functionUrl(env, 'confirm-payment');
  const res = await call(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ order_id: 'irrelevant' }),
  });
  if (env.SUPABASE_ANON_KEY === env.MAINTENANCE_TOKEN) {
    recordSkip(name, 'SUPABASE_ANON_KEY equals MAINTENANCE_TOKEN - cannot test rejection');
    return;
  }
  expectStatus(name, res, 401);
}

/**
 * Test 7: verify-payment rejects non-POST methods.
 * Expected: 405 Method Not Allowed.
 */
async function testVerifyPaymentNonPost(env) {
  const name = 'verify-payment: GET method -> 405';
  const url = functionUrl(env, 'verify-payment');
  const res = await call(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
  });
  expectStatus(name, res, 405);
}

/**
 * Test 8: verify-payment rejects malformed JSON body.
 * Expected: 400 or 500 (req.json() throws inside try/catch -> 500).
 */
async function testVerifyPaymentMalformedBody(env) {
  const name = 'verify-payment: malformed JSON body -> 400 or 500';
  const url = functionUrl(env, 'verify-payment');
  const res = await call(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    },
    body: '{not valid json',
  });
  if (res.status === 400) {
    recordPass(name, 'status=400');
  } else if (res.status === 500) {
    recordPass(name, 'status=500 (unhandled parse - acceptable)');
  } else {
    recordFail(name, `expected 400 or 500, got ${res.status} body=${truncate(res.text, 160)}`);
  }
}

/**
 * Test 9: confirm-payment idempotency / safe failure.
 * Requires TEST_ORDER_ID to point at an order that can safely be confirmed in
 * a disposable test project. The first call may return 200 if pending, while
 * the second must return 400/409 safe error (already processed / not pending).
 * Expected second call: 400 or 409.
 */
async function testConfirmPaymentIdempotency(env) {
  const name = 'confirm-payment: re-confirm already-paid order -> 409 or safe error';
  if (!env.TEST_ORDER_ID) {
    recordSkip(name, 'TEST_ORDER_ID not set');
    return;
  }

  const url = functionUrl(env, 'confirm-payment');
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${env.MAINTENANCE_TOKEN}`,
  };
  const body = JSON.stringify({ order_id: env.TEST_ORDER_ID });

  const first = await call(url, { method: 'POST', headers, body });
  log('INFO', 'gray', `${name} first call status=${first.status}`);

  const second = await call(url, { method: 'POST', headers, body });
  if ([400, 409].includes(second.status)) {
    recordPass(name, `second status=${second.status}`);
  } else {
    recordFail(name, `expected second status 400 or 409, got ${second.status} body=${truncate(second.text, 160)}`);
  }
}

/**
 * Test 10: auto-cancel-orders rejects missing Maintenance token.
 * Expected: 401 if function exists. 404/405 means project may use different
 * function name or function is not deployed, so script records SKIP not FAIL.
 */
async function testAutoCancelMissingMaintenanceToken(env) {
  const name = 'auto-cancel-orders: missing maintenance token -> 401';
  await testMaintenanceProtectedFunction(env, 'auto-cancel-orders', name);
}

/**
 * Test 11: cleanup-old-proofs rejects missing Maintenance token.
 * Expected: 401 if function exists. 404/405 means project may use different
 * function name or function is not deployed, so script records SKIP not FAIL.
 */
async function testCleanupMissingMaintenanceToken(env) {
  const name = 'cleanup-old-proofs: missing maintenance token -> 401';
  await testMaintenanceProtectedFunction(env, 'cleanup-old-proofs', name);
}

async function testMaintenanceProtectedFunction(env, fnName, testName) {
  const url = functionUrl(env, fnName);
  const res = await call(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ dry_run: true }),
  });

  if (res.status === 401) {
    recordPass(testName, 'status=401');
  } else if ([404, 405].includes(res.status)) {
    recordSkip(testName, `function unavailable or method differs (status=${res.status})`);
  } else {
    recordFail(testName, `expected 401, got ${res.status} body=${truncate(res.text, 160)}`);
  }
}

async function main() {
  const env = loadEnv();
  console.log(`${COLORS.cyan}Edge Function verification starting${COLORS.reset}`);
  console.log(`Target: ${env.SUPABASE_URL}`);
  console.log('');

  const tests = [
    testWebhookMissingSignature,
    testWebhookInvalidSignature,
    testWebhookMalformedBody,
    testWebhookNonPost,
    testConfirmPaymentNonPost,
    testConfirmPaymentMissingMaintenanceToken,
    testVerifyPaymentNonPost,
    testVerifyPaymentMalformedBody,
    testConfirmPaymentIdempotency,
    testAutoCancelMissingMaintenanceToken,
    testCleanupMissingMaintenanceToken,
  ];

  for (const test of tests) {
    try {
      await test(env);
    } catch (err) {
      recordFail(test.name, err && err.message ? err.message : String(err));
    }
  }

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const skipped = results.filter((r) => r.status === 'skip').length;

  console.log('');
  console.log(`${COLORS.cyan}Summary${COLORS.reset}: ${passed} passed, ${failed} failed, ${skipped} skipped`);

  if (failed > 0) {
    console.error('\nOne or more Edge Function security checks failed.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected script failure:', err);
  process.exit(1);
});
