import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Lock, Mail, Loader2, Coffee } from 'lucide-react';
import { useAuth } from '../lib/useAuth';

export default function Login() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/admin" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      navigate('/admin');
    } catch (err) {
      setError('Email atau password salah');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-enter min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto">
            <Coffee size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-text-primary mt-4">Admin Login</h1>
          <p className="text-text-muted text-sm mt-1">Masuk untuk mengelola pesanan & menu</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          {error && (
            <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-xl">{error}</p>
          )}

          <div>
            <label className="text-sm font-medium text-text-secondary flex items-center gap-1.5 mb-1.5">
              <Mail size={14} /> Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@email.com"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm text-text-primary placeholder:text-text-muted outline-none border border-transparent focus:border-primary/30"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary flex items-center gap-1.5 mb-1.5">
              <Lock size={14} /> Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm text-text-primary placeholder:text-text-muted outline-none border border-transparent focus:border-primary/30"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-full font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Masuk...</> : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
