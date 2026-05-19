import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { supabase } from './lib/supabase';
import { CartProvider } from './lib/CartContext';
import { OrderProvider } from './lib/OrderContext';
import { AuthProvider, useAuth } from './lib/useAuth';
import { StoreProvider, useStore } from './lib/useStore';
import { ToastProvider } from './components/Toast';
import { useActivityTracker } from './lib/useActivityTracker';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';

const Admin = lazy(() => import('./pages/Admin'));
const AdminMenu = lazy(() => import('./pages/AdminMenu'));
const AdminReport = lazy(() => import('./pages/AdminReport'));
const AdminPromo = lazy(() => import('./pages/AdminPromo'));
const AdminVoucher = lazy(() => import('./pages/AdminVoucher'));
const AdminBranch = lazy(() => import('./pages/AdminBranch'));
const AdminSettings = lazy(() => import('./pages/AdminSettings'));
const AdminHelp = lazy(() => import('./pages/AdminHelp'));
const AdminAudit = lazy(() => import('./pages/AdminAudit'));
const AdminOptionTemplates = lazy(() => import('./pages/AdminOptionTemplates'));
const SetupWizard = lazy(() => import('./pages/SetupWizard'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderStatus = lazy(() => import('./pages/OrderStatus'));
const Login = lazy(() => import('./pages/Login'));

function ProtectedRoute({ children, allowSetup = false }) {
  const { user, loading } = useAuth();
  const { settings, loading: storeLoading } = useStore();

  if (loading || storeLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-text-muted">Memuat...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check admin role from user metadata
  const userRole = user.app_metadata?.role || user.user_metadata?.role;
  if (userRole && userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
        <AlertTriangle size={32} className="text-text-muted" />
        <h1 className="text-xl font-bold text-text-primary mt-4">Akses Ditolak</h1>
        <p className="text-text-secondary mt-2 text-sm">Akun Anda tidak memiliki akses admin.</p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="mt-6 bg-primary text-white px-6 py-2.5 rounded-full text-sm font-semibold"
        >
          Keluar
        </button>
      </div>
    );
  }

  // Redirect to setup wizard if not completed (unless we're already on setup)
  if (!allowSetup && settings.setup_completed === 'false') {
    return <Navigate to="/admin/setup" replace />;
  }

  return children;
}

function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
      <AlertTriangle size={32} className="text-text-muted" />
      <h1 className="text-2xl font-bold text-text-primary mt-4">Halaman Tidak Ditemukan</h1>
      <p className="text-text-secondary mt-2 text-sm">URL yang kamu cari tidak tersedia.</p>
      <Link to="/" className="mt-6 bg-primary text-white px-6 py-2.5 rounded-full text-sm font-semibold">
        Kembali ke Beranda
      </Link>
    </div>
  );
}

function AppContent() {
  // Track user activity for token auto-refresh
  useActivityTracker(true);
  
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><p className="text-text-muted">Memuat...</p></div>}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order/:orderId" element={<OrderStatus />} />
        <Route path="/login" element={<Login />} />

        {/* Protected Admin */}
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="/admin/menu" element={<ProtectedRoute><AdminMenu /></ProtectedRoute>} />
        <Route path="/admin/report" element={<ProtectedRoute><AdminReport /></ProtectedRoute>} />
        <Route path="/admin/promo" element={<ProtectedRoute><AdminPromo /></ProtectedRoute>} />
        <Route path="/admin/voucher" element={<ProtectedRoute><AdminVoucher /></ProtectedRoute>} />
        <Route path="/admin/branch" element={<ProtectedRoute><AdminBranch /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
          <Route path="/admin/audit" element={<ProtectedRoute><AdminAudit /></ProtectedRoute>} />
          <Route path="/admin/help" element={<ProtectedRoute><AdminHelp /></ProtectedRoute>} />
          <Route path="/admin/option-templates" element={<ProtectedRoute><AdminOptionTemplates /></ProtectedRoute>} />
          <Route path="/admin/setup" element={<ProtectedRoute allowSetup><SetupWizard /></ProtectedRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <AuthProvider>
          <ToastProvider>
            <OrderProvider>
              <CartProvider>
                <BrowserRouter>
                  <AppContent />
                </BrowserRouter>
              </CartProvider>
            </OrderProvider>
          </ToastProvider>
        </AuthProvider>
      </StoreProvider>
    </ErrorBoundary>
  );
}

export default App;
