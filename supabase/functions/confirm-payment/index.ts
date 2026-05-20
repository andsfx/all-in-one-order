import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { sendTelegramNotification, formatOrderNotification } from '../_shared/telegram.ts';
import { getClientIP, checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { methodNotAllowed, requireMaintenanceAuth, unauthorizedResponse } from '../_shared/auth.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Method allowlist: POST only
  if (req.method !== 'POST') {
    return methodNotAllowed(corsHeaders);
  }

  // Require maintenance auth (admin-only endpoint)
  const auth = requireMaintenanceAuth(req);
  if (!auth.authorized) {
    return unauthorizedResponse(auth.error || 'Unauthorized', corsHeaders);
  }

  try {
    // Rate limiting (admin endpoints: allow 30 req/min)
    const clientIP = getClientIP(req);
    const retryAfter = checkRateLimit(clientIP, 30);
    if (retryAfter !== null) {
      return rateLimitResponse(retryAfter, corsHeaders);
    }

    const body = await req.json();

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { order_id } = body;

    if (typeof order_id !== 'string' || order_id.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'order_id must be a non-empty string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch order with items (include new generalized fields)
    const { data: order, error: findError } = await supabase
      .from('orders')
      .select('*, order_items(product_name, qty, size, sweetness, ice_cube, price_at_order, selected_options, variant_id)')
      .eq('id', order_id)
      .single();

    if (findError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (order.status !== 'pending_payment' && order.status !== 'pending_verification') {
      return new Response(
        JSON.stringify({ error: 'Order is not pending payment or verification', status: order.status }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to paid with optimistic locking (prevent double-confirm)
    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', order_id)
      .in('status', ['pending_payment', 'pending_verification'])
      .select()
      .single();

    if (updateError || !updated) {
      return new Response(
        JSON.stringify({ error: 'Failed to update order — may already be processed' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle digital product fulfillment
    if (order.fulfillment_type === 'digital') {
      try {
        // Generate signed download URL for digital products
        // Assumes digital product files are stored in 'digital-products' bucket
        // with path pattern: {product_id}/{file_name}
        // For now, we'll log this as a placeholder since actual file storage setup is TBD
        console.log(`[Digital Fulfillment] Order ${order_id} requires digital delivery`);
        
        // TODO: Implement actual signed URL generation when digital product storage is set up
        // Example:
        // const { data: signedUrl, error: urlError } = await supabase.storage
        //   .from('digital-products')
        //   .createSignedUrl(order.digital_product_path, 86400); // 24h expiry
        // 
        // if (!urlError && signedUrl) {
        //   await supabase
        //     .from('orders')
        //     .update({ digital_download_url: signedUrl.signedUrl })
        //     .eq('id', order_id);
        // }
      } catch (digitalErr) {
        console.error('[Digital Fulfillment] Error:', digitalErr);
        // Non-blocking: continue with order confirmation even if digital delivery fails
      }
    }

    // Send email notification for digital/delivery orders with email
    if (order.delivery_email) {
      try {
        console.log(`[Email Notification] Sending to ${order.delivery_email} for order ${order_id}`);
        // TODO: Implement actual email sending (e.g., via Resend, SendGrid, or Supabase Edge Function)
        // For now, just log
        console.log(`[Email Mock] Subject: Order ${order_id} Confirmed`);
        console.log(`[Email Mock] Body: Your order has been confirmed. ${order.fulfillment_type === 'digital' ? 'Download link will be sent shortly.' : ''}`);
      } catch (emailErr) {
        console.error('[Email Notification] Error:', emailErr);
        // Non-blocking
      }
    }

    // Send Telegram notification
    try {
      const message = formatOrderNotification({
        id: order.id,
        customer_name: order.customer_name,
        note: order.note,
        total: order.total,
        payment_method: order.payment_method,
        fulfillment_type: order.fulfillment_type,
        items: order.order_items,
      });
      await sendTelegramNotification(message);
    } catch (tgErr) {
      console.error('Telegram notification failed:', tgErr);
    }

    return new Response(
      JSON.stringify({ success: true, order_id, new_status: 'paid' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('confirm-payment error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
