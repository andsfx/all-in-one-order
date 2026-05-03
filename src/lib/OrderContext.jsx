import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

const OrderContext = createContext(null);

function transformOrder(order) {
  return {
    id: order.id,
    customer: {
      name: order.customer_name,
      note: order.note,
    },
    total: order.total,
    status: order.status,
    createdAt: order.created_at,
    paymentUrl: order.payment_url,
    paymentMethod: order.payment_method || 'qris',
    items: (order.order_items || []).map((item) => ({
      key: `${item.product_id}-${item.size}-${item.temp}-${item.sugar}`,
      product: {
        id: item.product_id,
        name: item.product_name,
        price: item.price_at_order,
        image_url: item.products?.image_url,
      },
      price: item.price_at_order,
      options: {
        size: item.size,
        temp: item.temp,
        sugar: item.sugar,
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

  // Place a new order (insert into Supabase)
  async function placeOrder(cartItems, customerInfo) {
    const { data: counterData, error: counterError } = await supabase
      .rpc('generate_order_id');

    if (counterError) {
      throw new Error('Gagal membuat order: ' + counterError.message);
    }

    const orderId = counterData;
    const total = cartItems.reduce((sum, i) => sum + (i.price ?? i.product.price) * i.qty, 0);

    // Insert order
    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        customer_name: customerInfo.name,
        note: customerInfo.note || null,
        total,
        status: 'pending_payment',
        payment_method: customerInfo.paymentMethod || 'qris',
        branch_id: customerInfo.branchId || null,
      });

    if (orderError) {
      throw new Error('Gagal menyimpan order: ' + orderError.message);
    }

    // Insert order items
    const items = cartItems.map((item) => ({
      order_id: orderId,
      product_id: item.product.id,
      product_name: item.product.name,
      qty: item.qty,
      size: item.options.size,
      temp: item.options.temp,
      sugar: item.options.sugar,
      price_at_order: item.price ?? item.product.price,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(items);

    if (itemsError) {
      // Rollback: delete orphaned order
      await supabase.from('orders').delete().eq('id', orderId);
      throw new Error('Gagal menyimpan item order: ' + itemsError.message);
    }

    return {
      id: orderId,
      customer: customerInfo,
      total,
      status: 'pending_payment',
      paymentMethod: customerInfo.paymentMethod || 'qris',
      createdAt: new Date().toISOString(),
      items: cartItems,
    };
  }

  // Update order status (for admin)
  async function updateStatus(orderId, newStatus) {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      console.error('Gagal update status:', error);
      return;
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

    // Fetch from DB
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name, image_url))')
      .eq('id', orderId)
      .single();

    if (error || !data) return null;
    return transformOrder(data);
  }, [orders]);

  return (
    <OrderContext.Provider value={{ orders, loading, placeOrder, updateStatus, getOrder, fetchOrders }}>
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
