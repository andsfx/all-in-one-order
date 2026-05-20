import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Filter, Download, Search, Clock, User, FileText, AlertCircle } from 'lucide-react';
import { getAuditLogs, formatAuditLog, getAuditLogStats } from '../lib/auditLog';
import { logError } from '../lib/logError';

const ACTION_COLORS = {
  INSERT: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  STATUS_CHANGE: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700'
};

const USER_TYPE_COLORS = {
  admin: 'bg-purple-100 text-purple-700',
  customer: 'bg-blue-100 text-blue-700',
  system: 'bg-gray-100 text-gray-700'
};

export default function AdminAudit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    orderId: '',
    userType: '',
    action: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const PAGE_SIZE = 50;

  // Fetch audit logs
  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    try {
      const { data, count } = await getAuditLogs(page, PAGE_SIZE, filters);
      setLogs(data);
      setTotalCount(count);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { metadata: { source: 'AdminAudit.fetchLogs' } });
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 30); // Last 30 days
      const dateTo = new Date();

      const statsData = await getAuditLogStats(
        dateFrom.toISOString(),
        dateTo.toISOString()
      );
      setStats(statsData);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), { metadata: { source: 'AdminAudit.fetchStats' } });
    }
  }

  function handleFilterChange(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0); // Reset to first page when filters change
  }

  function clearFilters() {
    setFilters({
      orderId: '',
      userType: '',
      action: '',
      dateFrom: '',
      dateTo: ''
    });
    setPage(0);
  }

  function exportToCSV() {
    if (logs.length === 0) return;

    const headers = ['Waktu', 'Order ID', 'Action', 'User Type', 'User Email', 'Field', 'Old Value', 'New Value'];
    const rows = logs.map(log => [
      new Date(log.created_at).toLocaleString('id-ID'),
      log.record_id,
      log.action,
      log.user_type,
      log.user_email || '-',
      log.field_name || '-',
      log.old_value || '-',
      log.new_value || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  return (
    <div className="min-h-screen bg-surface-primary pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-border-light px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="p-1.5 rounded-full bg-surface-secondary text-text-secondary active:scale-95 transition-transform"
              aria-label="Kembali"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-text-primary">Audit Log</h1>
              <p className="text-xs text-text-muted">Riwayat perubahan order</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-primary text-white'
                  : 'bg-surface-secondary text-text-secondary'
              }`}
              aria-label="Filter"
            >
              <Filter size={18} />
            </button>
            <button
              onClick={exportToCSV}
              disabled={logs.length === 0}
              className="p-2 rounded-lg bg-surface-secondary text-text-secondary disabled:opacity-50 active:scale-95 transition-transform"
              aria-label="Export CSV"
            >
              <Download size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-text-muted mb-1">Total Events</p>
              <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-text-muted mb-1">Admin Actions</p>
              <p className="text-2xl font-bold text-purple-600">{stats.byUserType.admin || 0}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-text-muted mb-1">Customer Actions</p>
              <p className="text-2xl font-bold text-blue-600">{stats.byUserType.customer || 0}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-text-muted mb-1">Status Changes</p>
              <p className="text-2xl font-bold text-amber-600">{stats.byAction.STATUS_CHANGE || 0}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-text-primary">Filter</h2>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-primary font-medium"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Order ID */}
              <div>
                <label className="text-xs text-text-secondary mb-1 block">Order ID</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={filters.orderId}
                    onChange={(e) => handleFilterChange('orderId', e.target.value)}
                    placeholder="ORD-0001"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-surface-secondary border border-transparent focus:border-primary/30 outline-none"
                  />
                </div>
              </div>

              {/* User Type */}
              <div>
                <label className="text-xs text-text-secondary mb-1 block">User Type</label>
                <select
                  value={filters.userType}
                  onChange={(e) => handleFilterChange('userType', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-surface-secondary border border-transparent focus:border-primary/30 outline-none"
                >
                  <option value="">Semua</option>
                  <option value="admin">Admin</option>
                  <option value="customer">Customer</option>
                  <option value="system">System</option>
                </select>
              </div>

              {/* Action */}
              <div>
                <label className="text-xs text-text-secondary mb-1 block">Action</label>
                <select
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-surface-secondary border border-transparent focus:border-primary/30 outline-none"
                >
                  <option value="">Semua</option>
                  <option value="INSERT">Insert</option>
                  <option value="UPDATE">Update</option>
                  <option value="STATUS_CHANGE">Status Change</option>
                  <option value="DELETE">Delete</option>
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="text-xs text-text-secondary mb-1 block">Dari Tanggal</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-surface-secondary border border-transparent focus:border-primary/30 outline-none"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="text-xs text-text-secondary mb-1 block">Sampai Tanggal</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-surface-secondary border border-transparent focus:border-primary/30 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Logs Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
              <p className="text-sm text-text-muted mt-2">Memuat audit log...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle size={48} className="mx-auto text-text-muted mb-2" />
              <p className="text-text-secondary">Tidak ada audit log</p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-2 text-sm text-primary font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-secondary">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary">Waktu</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary">Order ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary">Action</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary">Perubahan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-surface-secondary/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-sm text-text-secondary">
                            <Clock size={14} />
                            {new Date(log.created_at).toLocaleString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-xs font-mono bg-surface-secondary px-2 py-1 rounded">
                            {log.record_id}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${USER_TYPE_COLORS[log.user_type] || 'bg-gray-100 text-gray-700'}`}>
                              {log.user_type}
                            </span>
                            {log.user_email && (
                              <span className="text-xs text-text-muted">{log.user_email}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {log.field_name && (
                            <div className="text-sm">
                              <span className="text-text-secondary">{log.field_name}:</span>{' '}
                              <span className="text-red-600 line-through">{log.old_value}</span>
                              {' → '}
                              <span className="text-green-600 font-medium">{log.new_value}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-border-light">
                {logs.map((log) => (
                  <div key={log.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <code className="text-xs font-mono bg-surface-secondary px-2 py-1 rounded">
                        {log.record_id}
                      </code>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}`}>
                        {log.action}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={12} className="text-text-muted" />
                      <span className="text-xs text-text-secondary">
                        {new Date(log.created_at).toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <User size={12} className="text-text-muted" />
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${USER_TYPE_COLORS[log.user_type] || 'bg-gray-100 text-gray-700'}`}>
                        {log.user_type}
                      </span>
                      {log.user_email && (
                        <span className="text-xs text-text-muted">{log.user_email}</span>
                      )}
                    </div>

                    {log.field_name && (
                      <div className="text-sm bg-surface-secondary rounded-lg p-2">
                        <span className="text-text-secondary">{log.field_name}:</span>{' '}
                        <span className="text-red-600 line-through">{log.old_value}</span>
                        {' → '}
                        <span className="text-green-600 font-medium">{log.new_value}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="border-t border-border-light px-4 py-3 flex items-center justify-between">
                  <p className="text-sm text-text-secondary">
                    Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="px-3 py-1.5 text-sm rounded-lg bg-surface-secondary text-text-secondary disabled:opacity-50 active:scale-95 transition-transform"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1.5 text-sm text-text-secondary">
                      Page {page + 1} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="px-3 py-1.5 text-sm rounded-lg bg-surface-secondary text-text-secondary disabled:opacity-50 active:scale-95 transition-transform"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
