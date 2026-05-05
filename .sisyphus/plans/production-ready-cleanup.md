# Production Ready: Security Hardening & Cashi.id Migration Cleanup

## TL;DR

> **Quick Summary**: Fix 8 critical/high security issues, disable (not delete) static QRIS with fallback support, update README with standard Cashi.id documentation, and clean up debug logs for production deployment in 2 days.
> 
> **Deliverables**:
> - Webhook signature verification (HMAC-SHA256)
> - Hardcoded secrets removed from code
> - RLS policy fixed to prevent data leakage
> - Server-side rate limiting on payment endpoints
> - Payment amount validation in webhook
> - Console.log cleanup with proper error logging
> - Static QRIS disabled in admin (kept as fallback)
> - README updated with Cashi.id setup guide
> 
> **Estimated Effort**: Medium (1.5-2 days)
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Wave 1 (Security) → Wave 2 (Validation) → Wave 3 (Cleanup) → Wave 4 (Docs) → FINAL

---

## Context

### Original Request
User requested production readiness audit and cleanup after migrating from static QRIS to Cashi.id dynamic QRIS integration.

### Oracle Audit Summary
**Production Readiness Score**: 75/100

**CRITICAL Issues (3)**:
1. Webhook signature verification missing - attackers can forge payment confirmations
2. Hardcoded secrets in code (`sk_02ee564329393b25a5ea0b56bb4e7cb6`)
3. RLS policy leak - `order_items` table allows cross-session data access

**HIGH Issues (5)**:
4. Missing environment variables in `.env.example`
5. No webhook retry logic (always returns 200)
6. Client-side only rate limiting (easily bypassed)
7. No payment amount validation in webhook
8. Console.log statements in production code (9 files)

### User Decisions
- **Timeline**: 2 days to production deployment
- **Static QRIS**: Disable in admin UI, keep as fallback (not delete)
- **Secret Rotation**: Not needed (will remove from code only)
- **README Scope**: Standard (setup + env vars + webhook config + guide)
- **Fix Scope**: CRITICAL + HIGH (8 issues)

### Metis Review
**Identified Gaps**:
- Need to verify Cashi.id webhook secret available for testing
- Static QRIS fallback logic needs clear activation mechanism
- Rate limiting needs both client + server implementation
- README should link to Cashi.id docs instead of duplicating

---

## Work Objectives

### Core Objective
Harden security, clean up code, and finalize documentation to achieve production-ready status (target: 90/100 score) within 2-day deployment timeline.

### Concrete Deliverables
- `supabase/functions/cashi-webhook/index.ts` - HMAC-SHA256 signature verification implemented
- `supabase/functions/create-cashi-payment/index.ts` - Rate limiting + amount validation
- `supabase/setup.sql` - Fixed RLS policy for `order_items` table
- `.env.example` - Added Cashi.id environment variables
- `src/pages/AdminSettings.jsx` - Static QRIS toggle (disabled by default, fallback enabled)
- `README.md` - Cashi.id integration documentation (setup, env vars, webhook, troubleshooting)
- All `src/**/*.{js,jsx,ts,tsx}` - Console.log removed, proper error logging added

### Definition of Done
- [ ] All 8 CRITICAL + HIGH issues from Oracle audit resolved
- [ ] Webhook signature verification tested with valid/invalid signatures
- [ ] RLS policy prevents cross-session data access (verified with test users)
- [ ] Rate limiting blocks >10 requests/minute per IP
- [ ] Payment amount mismatch rejected by webhook
- [ ] Zero console.log in production code paths
- [ ] Static QRIS fallback works when Cashi.id API fails
- [ ] README includes complete Cashi.id setup guide
- [ ] All QA scenarios pass with evidence saved to `.sisyphus/evidence/`

### Must Have
- Webhook signature verification (CRITICAL - blocks production)
- Hardcoded secrets removed (CRITICAL - security risk)
- RLS policy fixed (CRITICAL - data leak)
- Server-side rate limiting (HIGH - spam prevention)
- Amount validation (HIGH - fraud prevention)

### Must NOT Have (Guardrails)
- **No new features** - Only fix existing issues, no payment analytics or retry UI
- **No performance optimization** - Defer database indexing, caching to post-launch
- **No architecture refactoring** - Keep existing patterns, only fix security holes
- **No static QRIS deletion** - Disable in UI, keep code for fallback
- **No README novel** - Standard docs only, link to external resources

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Supabase + Vercel)
- **Automated tests**: Tests-after (add security tests for new validation logic)
- **Framework**: bun test (existing setup)
- **QA Policy**: Every task has agent-executed scenarios with evidence capture

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Backend/API**: Use Bash (curl) - Send requests, assert status + response fields
- **Database**: Use Bash (psql or Supabase REST API) - Query, compare results
- **Frontend**: Use Playwright (if UI changes) - Navigate, interact, assert DOM
- **Code Search**: Use ast_grep_search + grep - Find patterns, assert zero matches

---

## Execution Strategy

### Parallel Execution Waves

> Maximize throughput by grouping independent tasks into parallel waves.
> Target: 5-8 tasks per wave.

```
Wave 1 (CRITICAL Security Fixes - Start Immediately):
├── Task 1: Implement webhook signature verification [deep]
├── Task 2: Remove hardcoded secrets from codebase [quick]
├── Task 3: Fix order_items RLS policy [quick]
└── Task 4: Add Cashi.id env vars to .env.example [quick]

Wave 2 (HIGH Priority Validation - After Wave 1):
├── Task 5: Add server-side rate limiting [unspecified-high]
├── Task 6: Implement payment amount validation [deep]
└── Task 7: Add webhook retry logic (return 500 on errors) [quick]

Wave 3 (Code Cleanup - After Wave 2):
├── Task 8: Remove console.log, add proper logging [quick]
├── Task 9: Disable static QRIS in admin UI (keep fallback) [quick]
└── Task 10: Add static QRIS fallback logic [unspecified-high]

Wave 4 (Documentation - After Wave 3):
├── Task 11: Update README with Cashi.id integration guide [writing]
└── Task 12: Add deployment checklist to README [writing]

Wave FINAL (After ALL tasks - 4 parallel reviews, then user okay):
├── Task F1: Security audit verification (oracle)
├── Task F2: Payment flow regression test (unspecified-high)
├── Task F3: Real manual QA on staging (unspecified-high)
└── Task F4: Production deployment checklist review (deep)
-> Present results -> Get explicit user okay
```

**Critical Path**: Task 1 → Task 6 → Task 10 → Task 11 → F1-F4 → user okay  
**Parallel Speedup**: ~60% faster than sequential  
**Max Concurrent**: 4 (Wave 1)

### Dependency Matrix

- **1-4**: - - 5-7, 1
- **5**: 1-4 - 8-10, 2
- **6**: 1-4 - 8-10, 2
- **7**: 1-4 - 8-10, 2
- **8**: 5-7 - 11-12, 3
- **9**: 5-7 - 10, 3
- **10**: 5-7, 9 - 11-12, 3
- **11**: 8-10 - F1-F4, 4
- **12**: 8-10 - F1-F4, 4
- **F1-F4**: 11-12 - user okay, FINAL

### Agent Dispatch Summary

- **Wave 1**: 4 tasks - T1 → `deep`, T2-4 → `quick`
- **Wave 2**: 3 tasks - T5 → `unspecified-high`, T6 → `deep`, T7 → `quick`
- **Wave 3**: 3 tasks - T8-9 → `quick`, T10 → `unspecified-high`
- **Wave 4**: 2 tasks - T11-12 → `writing`
- **FINAL**: 4 tasks - F1 → `oracle`, F2-3 → `unspecified-high`, F4 → `deep`

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.

- [x] 1. Implement Webhook Signature Verification

  **What to do**:
  - Read Cashi.id webhook documentation for signature algorithm (likely HMAC-SHA256)
  - Implement signature verification in `supabase/functions/cashi-webhook/index.ts`
  - Extract `X-Signature` or `X-Cashi-Signature` header from request
  - Compute HMAC-SHA256 of request body using `CASHI_WEBHOOK_SECRET`
  - Compare computed signature with header value (constant-time comparison)
  - Return 401 Unauthorized if signature invalid
  - Only process webhook if signature valid

  **Must NOT do**:
  - Don't use simple string comparison (timing attack vulnerable)
  - Don't log the webhook secret or signature values
  - Don't skip verification in any code path

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Security-critical implementation requiring careful crypto handling
  - **Skills**: []
    - No special skills needed - standard Deno crypto APIs
  - **Skills Evaluated but Omitted**:
    - `security-audit`: Not needed for implementation, only for review

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 5, 6, 7 (Wave 2 depends on security foundation)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `supabase/functions/cashi-webhook/index.ts:11-38` - Current webhook handler structure, CORS headers
  - Look for existing HMAC examples in Supabase Edge Functions docs

  **API/Type References**:
  - Deno crypto API: `https://deno.land/api@v1.40.0?s=crypto.subtle.importKey`
  - HMAC-SHA256 example: `https://deno.land/manual@v1.40.0/runtime/web_platform_apis#cryptosubtle`

  **External References**:
  - Cashi.id webhook docs: `https://cashi.id/doc` (check signature verification section)
  - OWASP timing attack prevention: Use `crypto.timingSafeEqual()` or equivalent

  **WHY Each Reference Matters**:
  - Current webhook structure shows where to inject verification (before line 40)
  - Deno crypto API is the standard way to compute HMAC in Edge Functions
  - Cashi.id docs will specify exact header name and algorithm

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Valid signature allows webhook processing
    Tool: Bash (curl)
    Preconditions: Webhook secret set in environment, test order exists in DB
    Steps:
      1. Compute valid HMAC-SHA256 signature of test payload using webhook secret
      2. curl -X POST https://kmmxfqqpoipeqdcvtljv.supabase.co/functions/v1/cashi-webhook \
           -H "Content-Type: application/json" \
           -H "X-Signature: [computed-signature]" \
           -d '{"event":"PAYMENT_SETTLED","data":{"order_id":"TEST-001","status":"SETTLED","amount":50000}}'
      3. Check response status code
      4. Query database to verify order status NOT updated (TEST- prefix should be ignored)
    Expected Result: HTTP 200, response body "Test OK"
    Failure Indicators: HTTP 401, or order status changed (should not process TEST- orders)
    Evidence: .sisyphus/evidence/task-1-valid-signature.json

  Scenario: Invalid signature rejects webhook
    Tool: Bash (curl)
    Preconditions: Webhook secret set in environment
    Steps:
      1. curl -X POST https://kmmxfqqpoipeqdcvtljv.supabase.co/functions/v1/cashi-webhook \
           -H "Content-Type: application/json" \
           -H "X-Signature: invalid_signature_12345" \
           -d '{"event":"PAYMENT_SETTLED","data":{"order_id":"ORD-9999","status":"SETTLED","amount":50000}}'
      2. Check response status code and body
    Expected Result: HTTP 401 Unauthorized, response body contains "Invalid signature" or "Unauthorized"
    Failure Indicators: HTTP 200 (should reject), or order processed
    Evidence: .sisyphus/evidence/task-1-invalid-signature.json

  Scenario: Missing signature header rejects webhook
    Tool: Bash (curl)
    Preconditions: Webhook secret set in environment
    Steps:
      1. curl -X POST https://kmmxfqqpoipeqdcvtljv.supabase.co/functions/v1/cashi-webhook \
           -H "Content-Type: application/json" \
           -d '{"event":"PAYMENT_SETTLED","data":{"order_id":"ORD-9999","status":"SETTLED"}}'
      2. Check response status code
    Expected Result: HTTP 401 Unauthorized, response body indicates missing signature
    Failure Indicators: HTTP 200 (should reject)
    Evidence: .sisyphus/evidence/task-1-missing-signature.json
  ```

  **Evidence to Capture**:
  - [ ] Each evidence file named: task-1-{scenario-slug}.json
  - [ ] Response bodies for all 3 scenarios
  - [ ] Database query result showing order status unchanged for invalid signatures

  **Commit**: YES
  - Message: `feat(security): add HMAC-SHA256 webhook signature verification`
  - Files: `supabase/functions/cashi-webhook/index.ts`
  - Pre-commit: Deploy to Supabase and run QA scenarios

- [x] 2. Remove Hardcoded Secrets from Codebase

  **What to do**:
  - Search for hardcoded secret: `sk_02ee564329393b25a5ea0b56bb4e7cb6`
  - Remove from `supabase/functions/cashi-webhook/index.ts:11` (fallback value)
  - Ensure function fails fast if `CASHI_WEBHOOK_SECRET` env var not set
  - Add validation at function startup to check env var exists
  - Search entire codebase for other hardcoded secrets (API keys, tokens, passwords)
  - Remove any found, replace with env var references

  **Must NOT do**:
  - Don't leave any fallback hardcoded values
  - Don't commit the secret to git (it's already in history, but don't add more)
  - Don't log the secret value in error messages

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple search-and-replace task, no complex logic
  - **Skills**: []
  - **Skills Evaluated but Omitted**: None

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Tasks 5-7
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `supabase/functions/cashi-webhook/index.ts:11` - Current hardcoded secret location
  - `supabase/functions/create-cashi-payment/index.ts:11` - Check if API key also hardcoded

  **External References**:
  - Supabase Edge Functions env vars: `https://supabase.com/docs/guides/functions/secrets`

  **WHY Each Reference Matters**:
  - Line 11 is the exact location of hardcoded secret to remove
  - Need to verify create-cashi-payment doesn't have same issue

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: No hardcoded secrets in codebase
    Tool: ast_grep_search + grep
    Preconditions: None
    Steps:
      1. ast_grep_search(pattern='(api_key|secret|password|token) = "$$$"', lang="typescript", paths=["supabase/functions"])
      2. grep -r "sk_02ee564329393b25a5ea0b56bb4e7cb6" supabase/functions/
      3. grep -r "CASHI-1AKE5VR2PAD" supabase/functions/ (check if API key hardcoded)
    Expected Result: Zero matches for all searches
    Failure Indicators: Any match found
    Evidence: .sisyphus/evidence/task-2-secret-search.txt

  Scenario: Webhook function fails without env var
    Tool: Bash (curl)
    Preconditions: Deploy function WITHOUT CASHI_WEBHOOK_SECRET set
    Steps:
      1. curl -X POST https://kmmxfqqpoipeqdcvtljv.supabase.co/functions/v1/cashi-webhook \
           -H "Content-Type: application/json" \
           -d '{"event":"PAYMENT_SETTLED","data":{"order_id":"TEST-001"}}'
    Expected Result: HTTP 500 Internal Server Error, response indicates missing env var
    Failure Indicators: HTTP 200 (should fail), or generic error message
    Evidence: .sisyphus/evidence/task-2-missing-env-var.json
  ```

  **Evidence to Capture**:
  - [ ] Search results showing zero hardcoded secrets
  - [ ] Error response when env var missing

  **Commit**: YES
  - Message: `fix(security): remove hardcoded webhook secret, require env var`
  - Files: `supabase/functions/cashi-webhook/index.ts`
  - Pre-commit: Run secret search QA scenario

- [x] 3. Fix order_items RLS Policy to Prevent Data Leakage

  **What to do**:
  - Open `supabase/setup.sql` and locate `order_items` RLS policies
  - Find policy "Anyone can view order items" (line ~123-124 per Oracle audit)
  - Replace with restrictive policy: only allow if user owns the parent order
  - Policy logic: `EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.session_token = current_setting('request.headers')::json->>'x-session-token')`
  - Or allow if user is authenticated admin
  - Test policy with two different session tokens to verify isolation

  **Must NOT do**:
  - Don't break existing order display functionality
  - Don't allow unrestricted access to order_items
  - Don't forget to handle authenticated admin access

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple SQL policy update, well-defined pattern
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 5-7
  - **Blocked By**: None

  **References**:
  - `supabase/setup.sql:123-124` - Current insecure policy
  - `supabase/migrations/001_add_session_token.sql:27-32` - Example of secure RLS policy pattern for orders table

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: User A cannot see User B's order items
    Tool: Bash (Supabase REST API)
    Steps:
      1. Create order-A with session-token-A
      2. Create order-B with session-token-B
      3. curl https://kmmxfqqpoipeqdcvtljv.supabase.co/rest/v1/order_items?order_id=eq.{order-B-id} \
           -H "x-session-token: {session-token-A}" \
           -H "apikey: {anon-key}"
    Expected Result: HTTP 200, empty array [] (no items returned)
    Evidence: .sisyphus/evidence/task-3-rls-isolation.json
  ```

  **Commit**: YES
  - Message: `fix(security): restrict order_items RLS policy to session token owner`
  - Files: `supabase/setup.sql`

- [x] 4. Add Cashi.id Environment Variables to .env.example

  **What to do**:
  - Open `.env.example`
  - Add `CASHI_API_KEY=your_cashi_api_key_here`
  - Add `CASHI_WEBHOOK_SECRET=your_cashi_webhook_secret_here`
  - Add comments explaining where to get these values
  - Ensure no real secrets in .env.example (only placeholders)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 5-7
  - **Blocked By**: None

  **References**:
  - `.env` - Current environment variables (DO NOT copy real values)
  - `.env.example` - Existing structure to follow

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: .env.example contains Cashi.id placeholders
    Tool: grep
    Steps:
      1. grep "CASHI_API_KEY" .env.example
      2. grep "CASHI_WEBHOOK_SECRET" .env.example
      3. Verify values are placeholders, not real secrets
    Expected Result: Both variables present with placeholder values
    Evidence: .sisyphus/evidence/task-4-env-example.txt
  ```

  **Commit**: YES
  - Message: `docs: add Cashi.id env vars to .env.example`
  - Files: `.env.example`

---

**[Tasks 5-12 follow same detailed structure with QA scenarios]**

**Wave 2 Tasks (After Wave 1 complete)**:
- Task 5: Server-side rate limiting (IP-based, 10 req/min) in create-cashi-payment Edge Function
- Task 6: Payment amount validation in webhook (compare webhook amount vs order.total)
- Task 7: Webhook retry logic (return 500 on DB errors instead of 200)

**Wave 3 Tasks (After Wave 2 complete)**:
- Task 8: Remove console.log from production code, add proper error logging
- Task 9: Add static QRIS toggle in AdminSettings (disabled by default)
- Task 10: Implement static QRIS fallback when Cashi.id API fails

**Wave 4 Tasks (After Wave 3 complete)**:
- Task 11: Update README with Cashi.id integration guide (setup, env vars, webhook config, troubleshooting)
- Task 12: Add production deployment checklist to README

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
>
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**

- [ ] F1. **Security Audit Verification** — `oracle`
  
  Read the plan end-to-end. For each CRITICAL + HIGH issue from original audit:
  1. Webhook signature verification - verify implementation exists, test with valid/invalid signatures
  2. Hardcoded secrets - search codebase, confirm zero matches
  3. RLS policy - test with two session tokens, verify isolation
  4. Rate limiting - send 20 requests, verify 429 after limit
  5. Amount validation - send mismatched amount, verify rejection
  6. Console.log cleanup - search codebase, verify removed from production paths
  7. Env vars - verify .env.example has Cashi.id variables
  8. Webhook retry - verify 500 returned on DB errors
  
  Check evidence files exist in `.sisyphus/evidence/task-{1-12}-*.{json,txt}`.
  
  Output: `CRITICAL [3/3] | HIGH [5/5] | Evidence [N files] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Payment Flow Regression Test** — `unspecified-high`
  
  Execute end-to-end payment flow to ensure nothing broke:
  1. Create order via frontend (https://order-kopi-app.vercel.app/)
  2. Verify dynamic QRIS generated from Cashi.id
  3. Simulate webhook callback with valid signature
  4. Verify order status updates to "paid"
  5. Test static QRIS fallback (disable Cashi.id API, verify fallback activates)
  6. Test rate limiting (create 15 orders rapidly, verify 11th blocked)
  
  Save evidence to `.sisyphus/evidence/final-payment-flow/`.
  
  Output: `Order Creation [PASS/FAIL] | QRIS Generation [PASS/FAIL] | Webhook [PASS/FAIL] | Fallback [PASS/FAIL] | Rate Limit [PASS/FAIL] | VERDICT`

- [ ] F3. **Real Manual QA on Staging** — `unspecified-high`
  
  Deploy to staging environment (if available) or Vercel preview:
  1. Test complete user journey (browse → add to cart → checkout → pay → status update)
  2. Test admin panel (view orders, update status, check audit logs)
  3. Test error scenarios (invalid payment, expired QRIS, network failure)
  4. Verify no console errors in browser DevTools
  5. Check mobile responsiveness
  
  Output: `User Journey [PASS/FAIL] | Admin Panel [PASS/FAIL] | Error Handling [PASS/FAIL] | Console Errors [CLEAN/N issues] | Mobile [PASS/FAIL] | VERDICT`

- [ ] F4. **Production Deployment Checklist Review** — `deep`
  
  Verify all production prerequisites met:
  1. Environment variables set in Vercel (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, CASHI_API_KEY, CASHI_WEBHOOK_SECRET)
  2. Supabase Edge Functions deployed (create-cashi-payment, cashi-webhook)
  3. Database migrations applied (001_add_session_token.sql, 002_add_audit_logging.sql)
  4. Cashi.id webhook URL configured (https://kmmxfqqpoipeqdcvtljv.supabase.co/functions/v1/cashi-webhook)
  5. README documentation complete
  6. No hardcoded secrets in codebase
  7. RLS policies active and tested
  8. Rate limiting functional
  
  Output: `Env Vars [N/8] | Edge Functions [2/2] | Migrations [2/2] | Webhook Config [YES/NO] | Docs [COMPLETE/INCOMPLETE] | Secrets [CLEAN/FOUND] | RLS [ACTIVE/INACTIVE] | Rate Limit [ACTIVE/INACTIVE] | VERDICT`

---

## Commit Strategy

- **Wave 1**: 4 commits (security fixes)
- **Wave 2**: 3 commits (validation logic)
- **Wave 3**: 3 commits (cleanup + fallback)
- **Wave 4**: 2 commits (documentation)
- **Total**: 12 commits + 1 final merge commit

---

## Success Criteria

### Verification Commands
```bash
# Security verification
curl -X POST https://kmmxfqqpoipeqdcvtljv.supabase.co/functions/v1/cashi-webhook \
  -H "X-Signature: invalid" \
  -d '{"event":"PAYMENT_SETTLED","data":{"order_id":"TEST-001"}}'
# Expected: HTTP 401 Unauthorized

# Rate limiting verification
for i in {1..15}; do
  curl -X POST https://kmmxfqqpoipeqdcvtljv.supabase.co/functions/v1/create-cashi-payment \
    -H "Content-Type: application/json" \
    -d '{"order_id":"TEST-'$i'","amount":10000,"customer_name":"Test"}'
done
# Expected: First 10 succeed, 11-15 return HTTP 429

# Secret search verification
grep -r "sk_02ee564329393b25a5ea0b56bb4e7cb6" supabase/functions/
# Expected: No matches

# Console.log cleanup verification
grep -r "console\.log" src/ --include="*.jsx" --include="*.js"
# Expected: Zero matches in production code paths
```

### Final Checklist
- [ ] All 3 CRITICAL issues resolved
- [ ] All 5 HIGH issues resolved
- [ ] Static QRIS disabled in admin, fallback functional
- [ ] README updated with Cashi.id guide
- [ ] All QA scenarios pass with evidence
- [ ] Production deployment checklist complete
- [ ] User explicitly approves deployment

---

## Production Readiness Score Projection

**Before**: 75/100
**After**: 90/100 (target)

**Improvements**:
- Security: 60 → 95 (+35)
- Code Quality: 70 → 85 (+15)
- Documentation: 80 → 90 (+10)
- Payment Flow: 95 → 95 (maintained)
- Database: 85 → 85 (maintained)
- Performance: 75 → 75 (deferred to post-launch)

**Deployment Timeline**: 2 days (as requested)
