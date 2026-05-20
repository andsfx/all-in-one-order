import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { getSessionToken } from './sessionToken';
import { generateUniqueCode } from './generateUniqueCode';
import { logOrderCreation, logStatusChange } from './auditLog';
import { logError } from './logError';

const OrderContext = createContext(null);

function transformOrder(order) {
  return {
    id: order.id,
    customer: {
      name: order.customer_name,
      note: order.note,
    },
    total: order.total,
    amountToPay: order.amount_to_pay || order.total,
    uniqueCode: order.unique_code || null,
    status: order.status,
    createdAt: order.created_at,
    paymentUrl: order.payment_url,
    paymentMethod: order.payment_method || 'qris',
    paymentProofPath: order.payment_proof_path,
    fulfillmentType: order.fulfillment_type || 'dine_in',
    digitalDownloadUrl: order.digital_download_url || null,
    items: (order.order_items || []).map((item) => ({
      key: item.selected_options
        ? `${item.product_id}-${JSON.stringify(item.selected_options)}`
        : `${item.product_id}-${item.size}-${item.sweetness}-${item.ice_cube}`,
      product: {
        id: item.product_id,
        name: item.product_name,
        price: item.price_at_order,
        image_url: item.products?.image_url,
      },
      price: item.price_at_order,
      selectedOptions: item.selected_options || null,
      options: {
        size: item.size,
        sweetness: item.sweetness,
        iceCube: item.ice_cube,
      },
      qty: item.qty,
    })),
  };
}

export function OrderProvider({ children }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all orders (for admin only — gated by auth in useEffect)
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name, image_url))')
      .order('created_at', { ascending: false })
      .range(0, 99);

    if (!error && data) {
      setOrders(data.map(transformOrder));
    }
    setLoading(false);
  }, []);

  // Subscribe to realtime — only when authenticated (admin)
  useEffect(() => {
    let channel;
    let cancelled = false;

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return; // Customer — don't fetch all orders

      await fetchOrders();
      if (cancelled) return;

      channel = supabase
        .channel(`admin-orders-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => { if (!cancelled) fetchOrders(); }
        )
        .subscribe();
    }

    init();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  // Place a new order using atomic RPC (single transaction)
  async function placeOrder(cartItems, customerInfo, appliedVoucher = null, voucherDiscount = 0) {
    // Get or create session token for this customer
    const sessionToken = getSessionToken();
    
    const subtotal = cartItems.reduce((sum, i) => sum + (i.price ?? i.product.price) * i.qty, 0);
    const finalTotal = Math.max(0, subtotal - voucherDiscount);

    // Generate unique code (0-500) for QRIS Static payment verification
    const uniqueCode = generateUniqueCode(null, finalTotal);
    const amountToPay = finalTotal + parseInt(uniqueCode);

    // Prepare items as JSON for atomic RPC
    const itemsJson = cartItems.map((item) => {
      const options = item.selectedOptions || item.options || {};
      return {
        product_id: item.product.id,
        product_name: item.product.name,
        qty: item.qty,
        size: options.size || item.variant?.name || null,
        sweetness: options.sweetness || null,
        ice_cube: options.iceCube || options.ice_cube || null,
        selected_options: item.selectedOptions || null,
        price_at_order: item.price ?? item.product.price,
      };
    });

    // Call atomic RPC — order, items, and voucher increment in one transaction
    const { data: orderData, error: rpcError } = await supabase.rpc('create_order_atomic', {
      p_customer_name: customerInfo.name,
      p_note: customerInfo.note || null,
      p_total: finalTotal,
      p_unique_code: uniqueCode,
      p_amount_to_pay: amountToPay,
      p_payment_method: customerInfo.paymentMethod || 'qris',
      p_branch_id: customerInfo.branchId || null,
      p_session_token: sessionToken,
      p_voucher_id: appliedVoucher?.id || null,
      p_discount_amount: voucherDiscount || 0,
      p_items: itemsJson,
      p_fulfillment_type: customerInfo.fulfillmentType || 'dine_in',
      p_delivery_address: customerInfo.deliveryAddress || null,
      p_delivery_phone: customerInfo.deliveryPhone || null,
      p_delivery_email: customerInfo.deliveryEmail || null,
      p_table_number: customerInfo.tableNumber || null,
    });

    if (rpcError) {
      throw new Error('Gagal membuat order: ' + rpcError.message);
    }

    const orderId = orderData.order_id;

    // If payment method is QRIS, create Cashi.id payment
    if (customerInfo.paymentMethod === 'qris') {
      try {
        const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-cashi-payment', {
          body: {
            order_id: orderId,
            amount: amountToPay,
            customer_name: customerInfo.name,
          },
        });

        if (paymentError) {
          logError(paymentError instanceof Error ? paymentError : new Error(String(paymentError.message || paymentError)), { metadata: { source: 'OrderContext.placeOrder', type: 'cashi_payment' } });
        } else if (paymentData) {
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              payment_id: paymentData.payment_id,
              payment_url: paymentData.payment_url,
            })
            .eq('id', orderId);
            
          if (updateError) {
            logError(updateError instanceof Error ? updateError : new Error(String(updateError.message || updateError)), { metadata: { source: 'OrderContext.placeOrder', type: 'payment_update' } });
          }
        }
      } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), { metadata: { source: 'OrderContext.placeOrder', type: 'cashi_payment_catch' } });
      }
    }

    // Log order creation to audit log
    await logOrderCreation(orderId, {
      customer_name: customerInfo.name,
      total: finalTotal,
      payment_method: customerInfo.paymentMethod || 'qris',
      branch_id: customerInfo.branchId
    }, sessionToken);

    // Refresh orders so admin dashboard picks up the new order
    fetchOrders();

    return {
      id: orderId,
      customer: { name: customerInfo.name, note: customerInfo.note || null },
      total: finalTotal,
      amountToPay: amountToPay,
      uniqueCode: uniqueCode,
      status: 'pending_payment',
      paymentMethod: customerInfo.paymentMethod || 'qris',
      createdAt: new Date().toISOString(),
      items: cartItems,
    };
  }

  // Update order status (for admin)
  async function updateStatus(orderId, newStatus) {
    // Get current status before updating (for audit log)
    const currentOrder = orders.find(o => o.id === orderId);
    const oldStatus = currentOrder?.status;

    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      logError(error instanceof Error ? error : new Error(String(error.message || error)), { metadata: { source: 'OrderContext.updateStatus', orderId } });
      return;
    }

    // Log status change to audit log
    if (oldStatus && oldStatus !== newStatus) {
      await logStatusChange(orderId, oldStatus, newStatus, 'admin');
      
      // Log manual verification events
      if (oldStatus === 'pending_verification' && newStatus === 'paid') {
        await supabase
          .from('audit_logs')
          .insert({
            order_id: orderId,
            event_type: 'manual_verification_approved',
            event_data: {
              previous_status: oldStatus,
              new_status: newStatus
            },
            actor_type: 'admin'
          });
      } else if (oldStatus === 'pending_verification' && newStatus === 'cancelled') {
        await supabase
          .from('audit_logs')
          .insert({
            order_id: orderId,
            event_type: 'manual_verification_rejected',
            event_data: {
              previous_status: oldStatus,
              new_status: newStatus
            },
            actor_type: 'admin'
          });
      }
    }

    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
  }

  // Get single order by ID — wrapped in useCallback to prevent infinite re-renders
  const getOrder = useCallback(async (orderId) => {
    // Check local state first
    const local = orders.find((o) => o.id === orderId);
    if (local) return local;

    // Get session token to verify ownership
    const sessionToken = getSessionToken();

    // Fetch from DB - RLS policy handles access via x-session-token header
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name, image_url))')
      .eq('id', orderId)
      .maybeSingle();

    if (error) {
      logError(error instanceof Error ? error : new Error(String(error.message || error)), { metadata: { source: 'OrderContext.getOrder', orderId } });
      return null;
    }
    if (!data) return null;
    return transformOrder(data);
  }, [orders]);

  // Upload payment proof and verify payment
  async function uploadPaymentProof(orderId, file, amountEntered) {
    try {
      const sessionToken = getSessionToken();
      
      // 1. Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${orderId}_${Date.now()}.${fileExt}`;
      const filePath = `payment-proofs/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('order-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error('Gagal upload bukti pembayaran: ' + uploadError.message);
      }

      // Generate signed URL (1 hour expiry)
      const signedUrl = await getPaymentProofSignedUrl(filePath, 3600);
      
      if (!signedUrl) {
        throw new Error('Gagal membuat URL akses bukti pembayaran');
      }

      // 2. Call verify-payment Edge Function with signed URL
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: {
          orderId,
          paymentProofUrl: signedUrl,
          paymentProofPath: filePath, // Store the storage path
          amountEntered: parseInt(amountEntered, 10),
          sessionToken
        }
      });

      if (error) {
        throw new Error('Gagal verifikasi pembayaran: ' + error.message);
      }

      // 3. Return result with signed URL
      return {
        success: data.success,
        autoVerified: data.auto_verified,
        needsManualReview: data.needs_manual_review,
        fraudScore: data.fraud_score,
        message: data.message,
        error: data.error,
        signedUrl: signedUrl,
        storagePath: filePath
      };
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { metadata: { source: 'OrderContext.uploadPaymentProof' } });
      throw error;
    }
  }

  // Helper: Generate signed URL for payment proof
  async function getPaymentProofSignedUrl(filePath, expiresIn = 3600) {
    try {
      const { data, error } = await supabase.storage
        .from('order-attachments')
        .createSignedUrl(filePath, expiresIn);
      
      if (error) {
        logError(error instanceof Error ? error : new Error(String(error.message || error)), { metadata: { source: 'OrderContext.getPaymentProofSignedUrl', type: 'rpc_error' } });
        return null;
      }
      
      return data.signedUrl;
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { metadata: { source: 'OrderContext.getPaymentProofSignedUrl' } });
      return null;
    }
  }

  return (
    <OrderContext.Provider value={{ orders, loading, placeOrder, updateStatus, getOrder, fetchOrders, uploadPaymentProof, getPaymentProofSignedUrl }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrderContext);
  if (!ctx) {
    throw new Error('useOrders harus digunakan di dalam OrderProvider');
  }
  return ctx;
}
