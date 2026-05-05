/**
 * Supabase Edge Function: Create Cashi.id Payment
 * 
 * Generates dynamic QRIS via Cashi.id API when customer places order
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CASHI_API_URL = 'https://cashi.id/api';
const CASHI_API_KEY = Deno.env.get('CASHI_API_KEY') || '';

interface PaymentRequest {
  order_id: string;
  amount: number;
  customer_name: string;
  customer_email?: string;
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Parse request body
    const { order_id, amount, customer_name, customer_email }: PaymentRequest = await req.json();

    // Validate input
    if (!order_id || !amount || !customer_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: order_id, amount, customer_name' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (amount < 1000) {
      return new Response(
        JSON.stringify({ error: 'Minimum amount is Rp 1.000' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create payment via Cashi.id API
    const cashiResponse = await fetch(`${CASHI_API_URL}/create-order`, {
      method: 'POST',
      headers: {
        'x-api-key': CASHI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order_id: order_id,
        amount: amount,
      }),
    });

    if (!cashiResponse.ok) {
      const errorData = await cashiResponse.json();
      console.error('Cashi.id API error:', errorData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create payment', 
          details: errorData 
        }),
        { status: cashiResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const paymentData = await cashiResponse.json();
    
    console.log('Cashi.id response:', paymentData);

    // Update order with payment details
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_id: paymentData.orderId, // Cashi.id returns orderId (camelCase)
        payment_url: paymentData.qrUrl, // Cashi.id returns base64 image in qrUrl
      })
      .eq('id', order_id);

    if (updateError) {
      console.error('Failed to update order:', updateError);
      // Don't fail the request, payment is already created
    }

    // Return payment details
    return new Response(
      JSON.stringify({
        success: paymentData.success,
        payment_id: paymentData.orderId, // Return orderId
        payment_url: paymentData.qrUrl, // Base64 QRIS image
        checkout_url: paymentData.checkout_url,
        amount: paymentData.amount,
        expected_net: paymentData.expected_net,
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    );

  } catch (error) {
    console.error('Error creating payment:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    );
  }
});
