/**
 * Cashi.id Webhook Handler
 * 
 * Handles payment confirmation callbacks from Cashi.id
 * Auto-updates order status when payment is successful
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const WEBHOOK_SECRET = Deno.env.get('CASHI_WEBHOOK_SECRET');

if (!WEBHOOK_SECRET) {
  throw new Error('CASHI_WEBHOOK_SECRET environment variable is required');
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, HEAD',
        'Access-Control-Allow-Headers': 'Content-Type, X-Signature, x-session-token, authorization, x-client-info, apikey',
      },
    });
  }

  // Handle HEAD request (for webhook verification)
  if (req.method === 'HEAD') {
    console.log('HEAD request received - webhook verification');
    return new Response(null, {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'X-Webhook-Status': 'active',
      }
    });
  }

  // Handle GET request (for webhook verification)
  if (req.method === 'GET') {
    console.log('GET request received - webhook verification');
    return new Response(
      JSON.stringify({ 
        status: 'ok', 
        message: 'Cashi.id webhook endpoint is active',
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }

  // Only accept POST for actual webhooks
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.text();
    
    // Handle empty body (ping/health check)
    if (!body || body.trim() === '') {
      console.log('Empty body received - health check');
      return new Response('OK', { status: 200 });
    }
    
    // Verify webhook signature using HMAC-SHA256
    const signature = req.headers.get('X-Signature') || req.headers.get('X-Cashi-Signature');
    
    if (!signature) {
      console.error('Missing webhook signature');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing signature' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Compute HMAC-SHA256 of request body
    const encoder = new TextEncoder();
    const keyData = encoder.encode(WEBHOOK_SECRET);
    const messageData = encoder.encode(body);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Timing-safe comparison
    const receivedSigBuffer = encoder.encode(signature);
    const expectedSigBuffer = encoder.encode(expectedSignature);
    
    // Ensure both buffers are same length to prevent timing attacks
    if (receivedSigBuffer.length !== expectedSigBuffer.length) {
      console.error('Invalid webhook signature: length mismatch');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid signature' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Use crypto.subtle.timingSafeEqual equivalent (XOR comparison)
    let isValid = true;
    for (let i = 0; i < receivedSigBuffer.length; i++) {
      if (receivedSigBuffer[i] !== expectedSigBuffer[i]) {
        isValid = false;
      }
    }
    
    if (!isValid) {
      console.error('Invalid webhook signature: mismatch');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid signature' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Webhook signature verified successfully');
    
    const payload = JSON.parse(body);
    
    // Log webhook payload
    console.log('Cashi webhook received:', payload);
    console.log('Headers:', Object.fromEntries(req.headers.entries()));
    
    // Extract event and data from Cashi.id webhook format
    const { event, data } = payload;
    
    // Handle test webhook from Cashi.id
    if (data?.order_id?.startsWith('TEST-')) {
      console.log('Test Connection Received from Cashi.id');
      return new Response('Test OK', { status: 200 });
    }
    
    // Only process PAYMENT_SETTLED events
    if (event !== 'PAYMENT_SETTLED') {
      console.log('Ignoring non-payment event:', event);
      return new Response('OK', { status: 200 });
    }

    // Extract payment info from Cashi.id webhook data
    const {
      transaction_id,
      order_id,
      status,
      amount,
      paid_at,
    } = data || {};

    // Only process SETTLED payments
    if (status !== 'SETTLED') {
      console.log('Payment not settled, status:', status);
      return new Response('OK', { status: 200 });
    }

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch order to validate amount before updating
    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('id, total, status, payment_id')
      .eq('id', order_id)
      .eq('payment_id', transaction_id)
      .single();

    if (fetchError || !existingOrder) {
      console.error('Order not found:', order_id, fetchError);
      return new Response('OK', { status: 200 }); // Return 200 to prevent retry
    }

    // FRAUD PREVENTION: Validate payment amount matches order total
    // Allow ±100 rupiah tolerance for rounding differences
    const TOLERANCE = 100;
    const amountDiff = Math.abs(amount - existingOrder.total);
    
    if (amountDiff > TOLERANCE) {
      console.error('FRAUD ATTEMPT DETECTED: Amount mismatch', {
        order_id,
        transaction_id,
        expected_amount: existingOrder.total,
        received_amount: amount,
        difference: amountDiff,
      });

      // Log fraud attempt to audit trail
      await supabase.from('audit_logs').insert({
        table_name: 'orders',
        record_id: order_id,
        action: 'FRAUD_ATTEMPT',
        user_type: 'system',
        user_email: 'cashi-webhook@system',
        field_name: 'amount',
        old_value: existingOrder.total.toString(),
        new_value: amount.toString(),
        metadata: {
          transaction_id,
          expected_amount: existingOrder.total,
          received_amount: amount,
          difference: amountDiff,
          source: 'cashi-webhook',
          reason: 'payment_amount_mismatch',
        },
      });

      // Return 200 to prevent Cashi.id from retrying invalid payment
      return new Response(
        JSON.stringify({ 
          error: 'Payment amount mismatch',
          expected: existingOrder.total,
          received: amount,
        }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Amount validation passed:', {
      order_id,
      expected: existingOrder.total,
      received: amount,
      difference: amountDiff,
    });

    // Update order status to paid
    const { data: order, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        paid_at: paid_at || new Date().toISOString(),
      })
      .eq('id', order_id)
      .eq('payment_id', transaction_id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update order:', updateError);
      return new Response('OK', { status: 200 }); // Still return 200 to Cashi.id
    }

    console.log('Order updated successfully:', order);

    // Log to audit trail
    await supabase.from('audit_logs').insert({
      table_name: 'orders',
      record_id: order_id,
      action: 'STATUS_CHANGE',
      user_type: 'system',
      user_email: 'cashi-webhook@system',
      field_name: 'status',
      old_value: 'pending_payment',
      new_value: 'paid',
      metadata: {
        transaction_id,
        amount,
        paid_at,
        payment_method: 'qris',
        source: 'cashi-webhook',
      },
    });

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('Webhook error:', error);
    // Always return 200 to Cashi.id to prevent retries
    return new Response('OK', { status: 200 });
  }
});
