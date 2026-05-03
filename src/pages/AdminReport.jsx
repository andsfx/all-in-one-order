import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, TrendingUp, ShoppingBag, DollarSign, Clock, Loader2, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AdminReport() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const wib = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
    return wib.toISOString().split('T')[0];
  });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      setLoading(true);
      const startOfDay = `${selectedDate}T00:00:00+07:00`;
      const endOfDay = `${selectedDate}T23:59:59+07:00`;

      const { data } = await supabase
        .from('orders')
        .select('*, order_items(product_name, qty, price_at_order)')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      setOrders(data || []);
      setLoading(false);
    }
    fetchReport();
  }, [selectedDate]);

  const stats = useMemo(() => {
    const paidOrders = orders.filter((o) => o.status !== 'cancelled');
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);
    const totalOrders = paidOrders.length;
    const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Top selling items
    const itemMap = {};
    paidOrders.forEach((o) => {
      (o.order_items || []).forEach((item) => {
        const name = item.product_name;
        if (!itemMap[name]) itemMap[name] = { name, qty: 0, revenue: 0 };
        itemMap[name].qty += item.qty;
        itemMap[name].revenue += item.qty * item.price_at_order;
      });
    });
    const topItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

    // Orders by status
    const statusCounts = {};
    orders.forEach((o) => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    });

    // Revenue by hour
    const hourlyRevenue = Array.from({ length: 24 }, () => 0);
    paidOrders.forEach((o) => {
      const date = new Date(o.created_at);
      const wibHour = (date.getUTCHours() + 7) % 24;
      hourlyRevenue[wibHour] += o.total_price || 0;
    });
    const maxHourly = Math.max(...hourlyRevenue, 1);

    return { totalRevenue, totalOrders, avgOrder, topItems, statusCounts, hourlyRevenue, maxHourly };
  }, [orders]);

  const STATUS_LABELS = {
    pending_payment: 'Belum Bayar',
    paid: 'Sudah Bayar',
    preparing: 'Diproses',
    ready: 'Siap',
    done: 'Selesai',
    cancelled: 'Dibatalkan',
  };

  const STATUS_COLORS = {
    pending_payment: 'bg-orange-100 text-orange-700',
    paid: 'bg-amber-100 text-amber-700',
    preparing: 'bg-blue-100 text-blue-700',
    ready: 'bg-emerald-100 text-emerald-700',
    done: 'bg-slate-100 text-slate-500',
    cancelled: 'bg-red-100 text-red-500',
  };

  function exportCSV() {
    if (!orders.length) return;
    const headers = ['Order ID', 'Customer', 'Items', 'Total', 'Status', 'Payment Method', 'Created At'];
    const rows = orders.map(o => [
      o.id,
      o.customer_name,
      o.order_items.map(i => `${i.product_name} x${i.qty}`).join('; '),
      o.total,
      o.status,
      o.payment_method || 'qris',
      new Date(o.created_at).toLocaleString('id-ID'),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-enter min-h-screen bg-white pb-8">
      <header className="sticky top-0 z-40 bg-white border-b border-border-light px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link to="/admin" className="p-1.5 rounded-full bg-surface-secondary text-text-secondary active:scale-95 transition-transform" aria-label="Kembali">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-bold text-text-primary flex-1">Laporan Penjualan</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 mt-4">
        {/* Date Picker + Export */}
        <div className="mb-4 flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-surface-secondary text-sm text-text-primary border border-transparent outline-none focus:border-primary/30"
          />
          <button onClick={exportCSV} className="bg-primary text-white px-3 py-1.5 rounded-xl text-sm font-semibold flex items-center gap-1 active:scale-95 transition-transform">
            <Download size={14} /> Export CSV
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-primary" />
            <span className="ml-2 text-text-muted text-sm">Memuat laporan...</span>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <section className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
                <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
                  <DollarSign size={16} className="text-primary" />
                </div>
                <p className="text-xs text-text-muted mt-2">Revenue</p>
                <p className="font-bold text-text-primary text-sm mt-0.5">
                  Rp {stats.totalRevenue.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
                <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
                  <ShoppingBag size={16} className="text-primary" />
                </div>
                <p className="text-xs text-text-muted mt-2">Pesanan</p>
                <p className="font-bold text-text-primary text-sm mt-0.5">{stats.totalOrders}</p>
              </div>
              <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
                <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
                  <TrendingUp size={16} className="text-primary" />
                </div>
                <p className="text-xs text-text-muted mt-2">Rata-rata</p>
                <p className="font-bold text-text-primary text-sm mt-0.5">
                  Rp {stats.avgOrder.toLocaleString('id-ID')}
                </p>
              </div>
            </section>

            {/* Top Selling Items */}
            <section className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={16} className="text-primary" />
                <h2 className="font-bold text-text-primary text-sm">Top 5 Item Terlaris</h2>
              </div>
              {stats.topItems.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-4">Belum ada data</p>
              ) : (
                <div className="space-y-2">
                  {stats.topItems.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{item.name}</p>
                        <p className="text-xs text-text-muted">Rp {item.revenue.toLocaleString('id-ID')}</p>
                      </div>
                      <span className="text-sm font-semibold text-primary">{item.qty}x</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Orders by Status */}
            <section className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <div className="flex items-center gap-2 mb-3">
                <ShoppingBag size={16} className="text-primary" />
                <h2 className="font-bold text-text-primary text-sm">Pesanan per Status</h2>
              </div>
              {Object.keys(stats.statusCounts).length === 0 ? (
                <p className="text-text-muted text-sm text-center py-4">Belum ada pesanan</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.statusCounts).map(([status, count]) => (
                    <span key={status} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-500'}`}>
                      {STATUS_LABELS[status] || status}: {count}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Revenue by Hour */}
            <section className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-primary" />
                <h2 className="font-bold text-text-primary text-sm">Revenue per Jam</h2>
              </div>
              <div className="flex items-end gap-0.5 h-32">
                {stats.hourlyRevenue.map((rev, hour) => {
                  const heightPct = stats.maxHourly > 0 ? (rev / stats.maxHourly) * 100 : 0;
                  return (
                    <div key={hour} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                      <div
                        className="w-full rounded-t bg-primary/70 hover:bg-primary transition-colors min-h-[2px]"
                        style={{ height: `${Math.max(heightPct, rev > 0 ? 4 : 0)}%` }}
                      />
                      {rev > 0 && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-text-primary text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          {hour}:00 — Rp {(rev / 1000).toFixed(0)}k
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-text-muted">00</span>
                <span className="text-[10px] text-text-muted">06</span>
                <span className="text-[10px] text-text-muted">12</span>
                <span className="text-[10px] text-text-muted">18</span>
                <span className="text-[10px] text-text-muted">23</span>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
