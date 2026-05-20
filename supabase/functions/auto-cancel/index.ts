import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { methodNotAllowed, requireMaintenanceAuth, unauthorizedResponse } from '../_shared/auth.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Method allowlist: maintenance endpoint accepts POST only
  if (req.method !== 'POST') {
    return methodNotAllowed(corsHeaders);
  }

  // Require maintenance auth (server-only token)
  const auth = requireMaintenanceAuth(req);
  if (!auth.authorized) {
    return unauthorizedResponse(auth.error || 'Unauthorized', corsHeaders);
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Find pending_payment orders older than 15 minutes WITHOUT payment proof
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: expiredOrders, error: findError } = await supabase
      .from('orders')
      .select('id, customer_name, total, created_at, status')
      .eq('status', 'pending_payment')
      .is('payment_proof_url', null)
      .lt('created_at', fifteenMinutesAgo);

    if (findError) {
      console.error('Error finding expired orders:', findError);
      return new Response(
        JSON.stringify({ error: 'An error occurred while processing your request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Find pending_verification orders older than 60 minutes
    // (admin hasn't reviewed them — likely abandoned or forgotten)
    const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: staleVerificationOrders, error: staleError } = await supabase
      .from('orders')
      .select('id, customer_name, total, created_at, status')
      .eq('status', 'pending_verification')
      .lt('created_at', sixtyMinutesAgo);

    if (staleError) {
      console.error('Error finding stale verification orders:', staleError);
      // Don't fail the whole request, just log and continue
    }

    // Combine all orders to cancel
    const allOrders = [
      ...(expiredOrders || []).map(o => ({ ...o, reason: 'Payment timeout (15 min)' })),
      ...(staleVerificationOrders || []).map(o => ({ ...o, reason: 'Verification timeout (60 min)' })),
    ];

    if (allOrders.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No expired orders found', cancelled: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orderIds = allOrders.map((o) => o.id);

    // Cancel orders
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: 'cancelled',
        cancelled_reason: 'auto_timeout',
        cancelled_at: new Date().toISOString()
      })
      .in('id', orderIds);

    if (updateError) {
      console.error('Error cancelling orders:', updateError);
      return new Response(
        JSON.stringify({ error: 'An error occurred while processing your request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log audit events for each cancelled order
    for (const order of allOrders) {
      await supabase.from('audit_logs').insert({
        event_type: order.status === 'pending_verification' 
          ? 'order_verification_timeout_cancelled' 
          : 'order_auto_cancelled',
        order_id: order.id,
        details: {
          reason: order.reason,
          customer_name: order.customer_name,
          total: order.total,
          original_status: order.status,
          created_at: order.created_at
        },
        created_at: new Date().toISOString()
      });
    }

    console.log(`Auto-cancelled ${orderIds.length} orders: ${orderIds.join(', ')}`);

    return new Response(
      JSON.stringify({ 
        message: 'Expired orders cancelled', 
        cancelled: orderIds.length, 
        order_ids: orderIds,
        pending_payment_cancelled: (expiredOrders || []).length,
        pending_verification_cancelled: (staleVerificationOrders || []).length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('auto-cancel error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
