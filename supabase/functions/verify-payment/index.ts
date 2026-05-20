import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders } from '../_shared/cors.ts';
import { checkFraud } from '../_shared/fraudDetection.ts';
import { getClientIP, checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { methodNotAllowed } from '../_shared/auth.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface VerifyPaymentRequest {
  orderId: string;
  paymentProofUrl: string;
  paymentProofPath?: string; // Storage path for private bucket
  amountEntered: number;
  sessionToken: string;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Method allowlist: POST only
  if (req.method !== 'POST') {
    return methodNotAllowed(corsHeaders);
  }

  try {
    // Rate limiting
    const clientIP = getClientIP(req);
    const retryAfter = checkRateLimit(clientIP);
    if (retryAfter !== null) {
      return rateLimitResponse(retryAfter, corsHeaders);
    }

    const body: VerifyPaymentRequest = await req.json();

    // Validate inputs
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request body',
          auto_verified: false,
          needs_manual_review: false
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { orderId, paymentProofUrl, paymentProofPath, amountEntered, sessionToken } = body;

    if (
      typeof orderId !== 'string' || orderId.trim().length === 0 ||
      typeof paymentProofUrl !== 'string' || paymentProofUrl.trim().length === 0 ||
      (paymentProofPath !== undefined && typeof paymentProofPath !== 'string') ||
      typeof amountEntered !== 'number' || !Number.isFinite(amountEntered) || amountEntered <= 0 ||
      typeof sessionToken !== 'string' || sessionToken.trim().length === 0
    ) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request parameters',
          auto_verified: false,
          needs_manual_review: false
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate payment proof URL exists (not empty)
    if (!paymentProofUrl.trim()) {
      return new Response(
        JSON.stringify({ 
          error: 'Payment proof is required',
          auto_verified: false,
          needs_manual_review: false
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch order with session token validation
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, total, unique_code, status, session_token, customer_name, voucher_code, voucher_discount')
      .eq('id', orderId)
      .eq('session_token', sessionToken)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ 
          error: 'Order not found or invalid session',
          auto_verified: false,
          needs_manual_review: false
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check order status - must be pending_payment
    if (order.status !== 'pending_payment') {
      return new Response(
        JSON.stringify({ 
          error: `Order cannot be verified in current status`,
          auto_verified: false,
          needs_manual_review: false
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate expected amount = order.total + unique_code
    const uniqueCodeInt = parseInt(order.unique_code || '0', 10);
    const expectedAmount = order.total + uniqueCodeInt;

    /**
     * Floating Point Precision Handling
     * 
     * JavaScript uses IEEE 754 double-precision floating-point format,
     * which can cause precision issues with decimal arithmetic.
     * 
     * Example: 0.1 + 0.2 = 0.30000000000000004 (not exactly 0.3)
     * 
     * To handle this, we use a tolerance of ±1 when comparing amounts.
     * This allows for:
     * - Floating point rounding errors
     * - Minor input variations (e.g., 50123 vs 50123.00)
     * - Database precision differences
     * 
     * The ±1 tolerance is safe because:
     * - Minimum transaction is typically > Rp 1,000
     * - ±1 rupiah is negligible (0.0001% for Rp 10,000 order)
     * - Prevents false negatives from technical precision issues
     * 
     * Test cases in index.test.ts verify this behavior.
     */
    const amountDiff = Math.abs(amountEntered - expectedAmount);
    const amountMatches = amountDiff <= 1;

    if (!amountMatches) {
      // Amount doesn't match - update order with entered amount but don't approve
      await supabase
        .from('orders')
        .update({
          payment_proof_url: paymentProofUrl,
          payment_amount_entered: amountEntered,
          status: 'pending_verification',
          auto_verified: false,
          needs_manual_review: true,
          fraud_score: 0
        })
        .eq('id', orderId)
        .in('status', ['pending_payment', 'pending_verification']);

      // Log to audit_logs
      await supabase
        .from('audit_logs')
        .insert({
          order_id: orderId,
          event_type: 'payment_verification_failed',
          event_data: {
            reason: 'amount_mismatch',
            expected: expectedAmount,
            entered: amountEntered,
            difference: amountDiff
          },
          actor_type: 'system'
        });

      // Also log payment proof upload
      await supabase
        .from('audit_logs')
        .insert({
          order_id: orderId,
          event_type: 'payment_proof_uploaded',
          event_data: {
            payment_proof_url: paymentProofUrl,
            amount_entered: amountEntered
          },
          actor_type: 'customer'
        });

      return new Response(
        JSON.stringify({ 
          error: 'Payment verification failed',
          expected: expectedAmount,
          entered: amountEntered,
          auto_verified: false,
          needs_manual_review: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Amount matches - run fraud detection
    const fraudCheck = await checkFraud(
      supabase,
      orderId,
      sessionToken,
      order.customer_name,
      amountEntered,
      expectedAmount
    );

    // Determine if auto-verification is allowed
    const autoVerified = !fraudCheck.needsReview;

    // Update order
    const updateData: any = {
      payment_proof_url: paymentProofUrl,
      payment_proof_path: paymentProofPath || null, // Store storage path
      payment_amount_entered: amountEntered,
      auto_verified: autoVerified,
      needs_manual_review: fraudCheck.needsReview,
      fraud_score: fraudCheck.fraudScore
    };

    if (autoVerified) {
      // Auto-approve
      updateData.status = 'paid';
      updateData.verified_at = new Date().toISOString();
    } else {
      // Flag for manual review
      updateData.status = 'pending_verification';
    }

    // Update order with optimistic locking
    // Use WHERE status = 'pending_payment' to prevent concurrent updates
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .eq('status', 'pending_payment') // Optimistic locking: only update if still pending
      .select()
      .single();

    if (updateError || !updatedOrder) {
      console.error('Update error:', updateError);
      
      // Check if order was already verified by another request
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();
      
      if (currentOrder && currentOrder.status !== 'pending_payment') {
        return new Response(
          JSON.stringify({ 
            error: 'Order has already been processed',
            auto_verified: false,
            needs_manual_review: false
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update order',
          auto_verified: false,
          needs_manual_review: false
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log to audit_logs
    const auditEventType = autoVerified 
      ? 'auto_verification_success' 
      : 'auto_verification_failed';

    await supabase
      .from('audit_logs')
      .insert({
        order_id: orderId,
        event_type: auditEventType,
        event_data: {
          amount_entered: amountEntered,
          expected_amount: expectedAmount,
          fraud_score: fraudCheck.fraudScore,
          fraud_reasons: fraudCheck.reasons,
          payment_proof_url: paymentProofUrl
        },
        actor_type: 'system'
      });

    // Also log payment proof upload
    await supabase
      .from('audit_logs')
      .insert({
        order_id: orderId,
        event_type: 'payment_proof_uploaded',
        event_data: {
          payment_proof_url: paymentProofUrl,
          amount_entered: amountEntered
        },
        actor_type: 'customer'
      });

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true,
        auto_verified: autoVerified,
        needs_manual_review: fraudCheck.needsReview,
        fraud_score: fraudCheck.fraudScore,
        fraud_reasons: fraudCheck.reasons,
        message: autoVerified 
          ? 'Payment verified successfully' 
          : 'Payment submitted for manual review'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Verify payment error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An error occurred while processing your request',
        auto_verified: false,
        needs_manual_review: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
