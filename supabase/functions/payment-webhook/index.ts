import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendTelegramNotification, formatOrderNotification } from '../_shared/telegram.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('BAYAR_WEBHOOK_SECRET');

if (!WEBHOOK_SECRET) {
  throw new Error('BAYAR_WEBHOOK_SECRET environment variable is required');
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // bayar.gg sends POST with JSON body on successful payment
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.text();
    
    // Verify webhook signature using HMAC-SHA256
    const signature = req.headers.get('X-Signature') || req.headers.get('X-Bayar-Signature');
    
    if (!signature) {
      console.error('Missing webhook signature');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    
    // Constant-time comparison: no early exit on length mismatch
    // Pad shorter to max length, XOR accumulate across full span
    const maxLen = Math.max(signature.length, expectedSignature.length);
    let diff = signature.length ^ expectedSignature.length; // non-zero if lengths differ
    for (let i = 0; i < maxLen; i++) {
      const a = i < signature.length ? signature.charCodeAt(i) : 0;
      const b = i < expectedSignature.length ? expectedSignature.charCodeAt(i) : 0;
      diff |= a ^ b;
    }
    
    if (diff !== 0) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Webhook signature verified successfully');
    
    const payload = JSON.parse(body);
    console.log('Webhook received:', JSON.stringify(payload));

    // Input validation: ensure required fields present and correct type
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      console.error('Invalid payload structure');
      return new Response(
        JSON.stringify({ error: 'Invalid payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // bayar.gg webhook callback payload:
    // { event: "payment.paid", invoice_id, status, amount, final_amount, paid_at, customer_name, ... }
    const paymentId = String(payload.invoice_id || payload.id || payload.payment_id || '').trim();
    const status = String(payload.status || '').trim();
    const event = String(payload.event || '').trim();

    if (!paymentId) {
      console.error('Missing payment ID in webhook payload');
      return new Response(
        JSON.stringify({ error: 'Missing payment ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Payment ID:', paymentId, 'Status:', status, 'Event:', event);

    // Only process successful payments
    if (status !== 'paid' && event !== 'payment.paid') {
      console.log('Ignoring non-paid webhook:', status, event);
      return new Response(JSON.stringify({ received: true, action: 'ignored' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find order by payment_id
    const { data: order, error: findError } = await supabase
      .from('orders')
      .select('*, order_items(product_name, qty, size, sweetness, ice_cube, price_at_order)')
      .eq('payment_id', paymentId)
      .single();

    if (findError || !order) {
      console.error('Order not found for payment_id:', paymentId);
      // Try matching by description (fallback)
      return new Response(
        JSON.stringify({ received: true, error: 'Order not found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update order status to 'paid' with optimistic predicate (close race window)
    if (order.status === 'pending_payment' || order.status === 'pending_verification') {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', order.id)
        .in('status', ['pending_payment', 'pending_verification']);

      if (updateError) {
        console.error('Failed to update order:', updateError);
      }

      // Send Telegram notification
      try {
        const message = formatOrderNotification({
          id: order.id,
          customer_name: order.customer_name,
          table_number: order.table_number,
          note: order.note,
          total: order.total,
          items: order.order_items,
        });
        await sendTelegramNotification(message);
        console.log('Telegram notification sent for', order.id);
      } catch (tgErr) {
        console.error('Telegram notification failed:', tgErr);
        // Don't fail the webhook because of Telegram
      }
    }

    return new Response(
      JSON.stringify({ received: true, order_id: order.id, new_status: 'paid' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
