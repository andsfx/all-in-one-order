import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { CartProvider } from './lib/CartContext';
import { OrderProvider } from './lib/OrderContext';
import { AuthProvider, useAuth } from './lib/useAuth';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';

const Admin = lazy(() => import('./pages/Admin'));
const AdminMenu = lazy(() => import('./pages/AdminMenu'));
const AdminReport = lazy(() => import('./pages/AdminReport'));
const AdminPromo = lazy(() => import('./pages/AdminPromo'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderStatus = lazy(() => import('./pages/OrderStatus'));
const Login = lazy(() => import('./pages/Login'));

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-text-muted">Memuat...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
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

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <OrderProvider>
            <CartProvider>
              <BrowserRouter>
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

                    <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </CartProvider>
        </OrderProvider>
      </ToastProvider>
    </AuthProvider>
  </ErrorBoundary>
  );
}

export default App;
