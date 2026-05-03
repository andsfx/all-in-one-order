/**
 * Cashi.id Webhook Handler
 * 
 * Handles payment confirmation callbacks from Cashi.id
 * Auto-updates order status when payment is successful
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const WEBHOOK_SECRET = Deno.env.get('CASHI_WEBHOOK_SECRET') || 'sk_02ee564329393b25a5ea0b56bb4e7cb6';

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, X-Signature',
      },
    });
  }

  try {
    // Verify webhook signature
    const signature = req.headers.get('X-Signature');
    const body = await req.text();
    
    // TODO: Implement signature verification based on Cashi.id docs
    // For now, we'll check if signature matches webhook secret
    if (signature !== WEBHOOK_SECRET) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.parse(body);
    console.log('Cashi webhook received:', payload);

    // Extract payment info from Cashi.id webhook
    const {
      transaction_id,
      order_id,
      status,
      amount,
      paid_at,
    } = payload;

    // Only process successful payments
    if (status !== 'success' && status !== 'paid') {
      console.log('Payment not successful, status:', status);
      return new Response(
        JSON.stringify({ message: 'Payment not successful' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

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
      return new Response(
        JSON.stringify({ error: 'Failed to update order' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
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

    // Optional: Send notification (Telegram, WhatsApp, etc)
    // await sendPaymentNotification(order);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Payment confirmed',
        order_id,
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
