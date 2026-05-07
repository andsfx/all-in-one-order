import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getSessionToken } from '../lib/sessionToken';
import { logOrderCancellation } from '../lib/auditLog';
import { ArrowLeft, Clock, CheckCircle, ChefHat, Package, Star, Loader2, XCircle, Share2, MessageCircle, CreditCard, Coffee, Search } from 'lucide-react';
import { useStore } from '../lib/useStore';
import { useOrders } from '../lib/OrderContext';

const STEPS = [
  { key: 'pending_payment', label: 'Bayar', icon: CreditCard },
  { key: 'paid', label: 'Menunggu', icon: Clock },
  { key: 'preparing', label: 'Diproses', icon: Coffee },
  { key: 'ready', label: 'Siap', icon: Package },
  { key: 'done', label: 'Selesai', icon: CheckCircle },
];

export default function OrderStatus() {
  const { orderId } = useParams();
  const { getOrder } = useOrders();
  const { settings } = useStore();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [queuePosition, setQueuePosition] = useState(null);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Fetch order on mount
  useEffect(() => {
    async function fetchOrder() {
      setLoading(true);
      const data = await getOrder(orderId);
      setOrder(data);
      setLoading(false);
    }
    fetchOrder();
  }, [orderId, getOrder]);

  // Subscribe to realtime updates for this order
  useEffect(() => {
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setOrder((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: payload.new.status,
              paymentUrl: payload.new.payment_url,
              paymentMethod: payload.new.payment_method || prev.paymentMethod,
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  // Queue position
  useEffect(() => {
    if (!order || (order.status !== 'paid' && order.status !== 'preparing')) return;
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['paid', 'preparing'])
      .lt('created_at', order.createdAt)
      .then(({ count }) => setQueuePosition(count));
  }, [order]);

  // Check if already reviewed
  useEffect(() => {
    if (!order || order.status !== 'done') return;
    supabase.from('reviews').select('id').eq('order_id', order.id).single().then(({ data }) => {
      if (data) setReviewed(true);
    });
  }, [order]);

  // Submit review function
  async function handleSubmitReview() {
    if (rating === 0) return;
    setSubmittingReview(true);
    await supabase.from('reviews').insert({
      order_id: order.id,
      rating,
      comment: reviewComment.trim() || null,
    });
    setReviewed(true);
    setSubmittingReview(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-primary" />
        <span className="ml-2 text-text-muted text-sm">Memuat pesanan...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
        <Search size={32} className="text-text-muted" />
        <h1 className="text-xl font-bold text-text-primary mt-4">Pesanan Tidak Ditemukan</h1>
        <p className="text-text-secondary mt-2 text-sm">Order ID &quot;{orderId}&quot; tidak tersedia.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 bg-primary text-white px-6 py-2.5 rounded-full text-sm font-semibold active:scale-[0.98] transition-transform"
        >
          Kembali ke Menu
        </button>
      </div>
    );
  }

  const currentIdx = STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="page-enter min-h-screen bg-white pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-border-light px-4 py-3">
        <div className="max-w-lg md:max-w-xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-full bg-surface-secondary text-text-secondary active:scale-95 transition-transform"
            aria-label="Kembali"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold text-text-primary">Status Pesanan</h1>
        </div>
      </header>

      <main className="max-w-lg md:max-w-xl mx-auto px-4 mt-4">
        {/* Order ID Card */}
        <section className="bg-white rounded-2xl p-5 shadow-sm text-center">
          <p className="text-sm text-text-muted tracking-wider uppercase">Order ID</p>
          <p className="text-2xl font-bold text-primary mt-1">{order.id}</p>
          <p className="text-xs text-text-muted mt-1">
            {new Date(order.createdAt).toLocaleString('id-ID')}
          </p>
        </section>

        {/* Payment Section (if pending payment) */}
        {order.status === 'pending_payment' && (
          <section className="mt-4 bg-white rounded-2xl p-5 shadow-sm">
            {order.paymentMethod === 'cash' ? (
              <>
                <h2 className="font-bold text-text-primary mb-1 text-center">💵 Bayar di Kasir</h2>
                 <div className="mt-4 bg-amber-50 rounded-xl p-4 text-center">
                   <p className="text-xs text-text-secondary">Total yang harus dibayar</p>
                   <p className="text-2xl font-bold text-primary mt-0.5">
                     Rp {(order.amountToPay || order.total).toLocaleString('id-ID')}
                   </p>
                 </div>
                <p className="text-sm text-text-secondary text-center mt-3">
                  Silakan bayar di kasir. Pesanan akan diproses setelah pembayaran dikonfirmasi.
                </p>
              </>
            ) : (
              <>
                <h2 className="font-bold text-text-primary mb-1 text-center">Scan QRIS untuk Bayar</h2>
                <p className="text-xs text-text-muted text-center mb-4">
                  Gunakan GoPay, OVO, DANA, ShopeePay, atau mobile banking
                </p>
                <div className="flex justify-center">
                  <img
                    src={order.paymentUrl || settings.qris_image || '/qris.jpg'}
                    alt="QRIS Payment"
                    className="w-56 h-56 object-contain rounded-xl border border-border"
                  />
                </div>
                <div className="mt-4 bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-text-secondary">Total yang harus dibayar</p>
                  <p className="text-2xl font-bold text-primary mt-0.5">
                    Rp {(order.amountToPay || order.total).toLocaleString('id-ID')}
                  </p>
                  {order.uniqueCode && order.amountToPay > order.total && (
                    <p className="text-xs text-text-muted mt-1">
                      Termasuk kode unik Rp {order.uniqueCode}
                    </p>
                  )}
                </div>
                <p className="text-xs text-text-muted text-center mt-3">
                  {order.paymentUrl ? 
                    'Pembayaran akan otomatis terkonfirmasi setelah kamu scan QRIS.' :
                    'Setelah bayar, tunggu admin mengkonfirmasi pembayaran kamu.'
                  }
                  Halaman ini akan otomatis update.
                </p>
              </>
            )}
          </section>
        )}

        {/* Cancel Button (if pending payment) */}
        {order.status === 'pending_payment' && (
          <section className="mt-4">
              <button
              disabled={cancelling}
              onClick={async () => {
                if (!window.confirm('Yakin ingin membatalkan pesanan ini?')) return;
                setCancelling(true);
                try {
                  const sessionToken = getSessionToken();
                  const { error } = await supabase
                    .from('orders')
                    .update({ status: 'cancelled' })
                    .eq('id', order.id)
                    .eq('session_token', sessionToken); // Verify ownership
                  if (error) throw error;
                  
                  // Log cancellation to audit log
                  await logOrderCancellation(order.id, 'customer', sessionToken, 'Customer cancelled order');
                  
                  setOrder((prev) => ({ ...prev, status: 'cancelled' }));
                } catch {
                  alert('Gagal membatalkan pesanan');
                } finally {
                  setCancelling(false);
                }
              }}
              className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-3 rounded-xl font-semibold text-sm active:scale-95 transition-transform disabled:opacity-60 border border-red-200"
            >
              {cancelling ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
              Batalkan Pesanan
            </button>
          </section>
        )}

        {/* Status Stepper */}
        <section className="mt-4 bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-text-primary mb-4">Status</h2>
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              return (
                <div key={step.key} className="flex flex-col items-center flex-1 relative">
                  {idx > 0 && (
                    <div
                      className={`absolute top-4 right-1/2 w-full h-0.5 -z-10 ${
                        idx <= currentIdx ? 'bg-primary' : 'bg-border'
                      }`}
                    />
                  )}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${
                      isActive ? 'bg-primary text-white' : 'bg-surface-secondary text-text-muted'
                    } ${isCurrent ? 'scale-110' : ''}`}
                  >
                    <Icon size={16} />
                  </div>
                  <p
                    className={`text-xs mt-1.5 font-medium ${
                      isActive ? 'text-primary' : 'text-text-muted'
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Estimated Wait Time */}
        {(order.status === 'paid' || order.status === 'preparing') && (
          <section className="mt-4 bg-surface-accent rounded-2xl p-4 text-center">
            <Clock size={20} className="text-primary mx-auto" />
            <p className="text-sm font-semibold text-text-primary mt-2">Estimasi Waktu</p>
            <p className="text-2xl font-bold text-primary mt-1">{order.status === 'paid' ? '~10-15' : '~5-10'} menit</p>
            <p className="text-xs text-text-muted mt-1">Pesanan sedang {order.status === 'paid' ? 'menunggu diproses' : 'dibuat'}</p>
            {queuePosition > 0 && (
              <p className="text-xs text-text-secondary mt-2 font-medium">{queuePosition} pesanan sebelum kamu</p>
            )}
          </section>
        )}

        {/* Customer Info */}
        <section className="mt-4 bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-text-primary mb-3">Info Pelanggan</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Nama</span>
              <span className="font-medium text-text-primary">{order.customer.name}</span>
            </div>
            {order.customer.note && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Catatan</span>
                <span className="font-medium text-text-primary text-right max-w-[60%]">{order.customer.note}</span>
              </div>
            )}
          </div>
        </section>

        {/* Items */}
        <section className="mt-4 bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-text-primary mb-3">Item Pesanan</h2>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.key} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-text-primary">
                    {item.product.name} <span className="text-text-muted">&times;{item.qty}</span>
                  </p>
                  <p className="text-xs text-text-muted">
                    {item.options.size} &middot; {item.options.sweetness} &middot; {item.options.iceCube}
                  </p>
                </div>
                <p className="font-semibold text-text-primary">
                  Rp {((item.price ?? item.product.price) * item.qty).toLocaleString('id-ID')}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-border-light flex items-center justify-between">
            <span className="font-semibold text-text-primary">Total</span>
            <div className="text-right">
              <span className="text-lg font-bold text-primary">
                Rp {(order.amountToPay || order.total).toLocaleString('id-ID')}
              </span>
              {order.uniqueCode != null && order.amountToPay > order.total && (
                <p className="text-xs text-text-muted">
                  Rp {order.total.toLocaleString('id-ID')} + kode unik {order.uniqueCode}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Share via WhatsApp */}
        {order.status !== 'cancelled' && (
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              `*Pesanan Order Kopi*\n\nOrder ID: ${order.id}\nStatus: ${order.status === 'done' ? 'Selesai' : order.status === 'ready' ? 'Siap diambil' : 'Diproses'}\n\n${order.items.map(i => `• ${i.product.name} x${i.qty} (${i.options.size})`).join('\n')}\n\nTotal: Rp ${order.total.toLocaleString('id-ID')}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full mt-4 bg-[#25D366] text-white py-3 rounded-full font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Bagikan via WhatsApp
          </a>
        )}

        {/* Hubungi via WhatsApp */}
        {settings.admin_whatsapp && (
          <a
            href={`https://wa.me/${settings.admin_whatsapp}?text=${encodeURIComponent(
              `Halo, saya ingin bertanya tentang pesanan ${order.id}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full mt-3 bg-white border-2 border-[#25D366] text-[#25D366] py-3 rounded-full font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Hubungi via WhatsApp
          </a>
        )}

        {/* Rating & Review */}
        {order.status === 'done' && !reviewed && (
          <section className="mt-4 bg-white rounded-2xl p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-bold text-text-primary mb-3 text-center">Bagaimana pesananmu?</h2>
            <div className="flex justify-center gap-2 mb-3">
              {[1,2,3,4,5].map(star => (
                <button key={star} onClick={() => setRating(star)} className="transition-transform active:scale-90">
                  <Star size={32} className={star <= rating ? 'fill-amber-400 text-amber-400' : 'text-border fill-none'} />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Tulis komentar (opsional)..."
                  rows={2}
                  maxLength={200}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary/30 resize-none"
                />
                <button
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className="w-full mt-3 bg-primary text-white py-3 rounded-full font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-60"
                >
                  {submittingReview ? 'Mengirim...' : 'Kirim Review'}
                </button>
              </>
            )}
          </section>
        )}

        {order.status === 'done' && reviewed && (
          <section className="mt-4 bg-surface-accent rounded-2xl p-4 text-center">
            <p className="text-sm font-medium text-primary">Terima kasih atas review-nya!</p>
          </section>
        )}

        {/* Pesan Lagi */}
        <button
          onClick={() => navigate('/')}
          className="w-full mt-6 bg-primary text-white py-3 rounded-full font-semibold text-sm active:scale-[0.98] transition-transform shadow-[var(--shadow-float)]"
        >
          Pesan Lagi
        </button>
      </main>
    </div>
  );
}
