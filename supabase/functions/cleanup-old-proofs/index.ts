import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders } from '../_shared/cors.ts';
import { methodNotAllowed, requireMaintenanceAuth, unauthorizedResponse } from '../_shared/auth.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * Cleanup Old Payment Proofs
 * 
 * This function deletes payment proof images older than 90 days
 * to save storage space and comply with data retention policies.
 * 
 * Should be run as a cron job (daily)
 */
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

    // Calculate cutoff date (90 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoffISO = cutoffDate.toISOString();

    console.log(`Cleaning up payment proofs older than ${cutoffISO}`);

    // Find orders with payment proofs older than 90 days
    const { data: oldOrders, error: fetchError } = await supabase
      .from('orders')
      .select('id, payment_proof_url, created_at')
      .not('payment_proof_url', 'is', null)
      .lt('created_at', cutoffISO);

    if (fetchError) {
      console.error('Error fetching old orders:', fetchError);
      return new Response(
        JSON.stringify({ 
          error: 'An error occurred while processing your request'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!oldOrders || oldOrders.length === 0) {
      console.log('No old payment proofs to clean up');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No old payment proofs to clean up',
          deleted_count: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${oldOrders.length} old payment proofs to delete`);

    let deletedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Delete each payment proof from storage
    for (const order of oldOrders) {
      try {
        // Extract file path from URL
        // URL format: https://{project}.supabase.co/storage/v1/object/public/payment-proofs/{filename}
        const url = order.payment_proof_url;
        const match = url.match(/payment-proofs\/(.+)$/);
        
        if (!match) {
          console.warn(`Could not extract filename from URL: ${url}`);
          failedCount++;
          errors.push(`Invalid URL format for order ${order.id}`);
          continue;
        }

        const fileName = match[1];

        // Delete from storage
        const { error: deleteError } = await supabase.storage
          .from('payment-proofs')
          .remove([fileName]);

        if (deleteError) {
          console.error(`Failed to delete ${fileName}:`, deleteError);
          failedCount++;
          errors.push(`Failed to delete ${fileName}: ${deleteError.message}`);
          continue;
        }

        // Clear payment_proof_url in database
        const { error: updateError } = await supabase
          .from('orders')
          .update({ payment_proof_url: null })
          .eq('id', order.id);

        if (updateError) {
          console.error(`Failed to update order ${order.id}:`, updateError);
          failedCount++;
          errors.push(`Failed to update order ${order.id}: ${updateError.message}`);
          continue;
        }

        deletedCount++;
        console.log(`Deleted payment proof for order ${order.id}`);

        // Log to audit_logs
        await supabase
          .from('audit_logs')
          .insert({
            order_id: order.id,
            event_type: 'payment_proof_deleted',
            event_data: {
              reason: 'automatic_cleanup',
              age_days: Math.floor((Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24)),
              file_url: order.payment_proof_url
            },
            actor_type: 'system'
          });

      } catch (err) {
        console.error(`Error processing order ${order.id}:`, err);
        failedCount++;
        errors.push(`Error processing order ${order.id}: ${err.message}`);
      }
    }

    console.log(`Cleanup complete: ${deletedCount} deleted, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Cleanup completed',
        deleted_count: deletedCount,
        failed_count: failedCount,
        total_processed: oldOrders.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An error occurred while processing your request'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
