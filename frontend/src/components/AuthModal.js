import React, { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function AuthModal({ onClose, onSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await axios.post(`${API}${endpoint}`, payload);
      onSuccess(response.data.user, response.data.token);
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-testid="auth-modal"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(26,18,8,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 p-6 rounded-2xl"
        style={{ backgroundColor: 'var(--cream)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="playfair text-2xl font-bold mb-1" style={{ color: 'var(--ink)' }}>
          {isLogin ? 'Welcome back' : 'Create account'}
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
          {isLogin ? 'Login to sync your data across devices' : 'Sign up to save your preferences and inventory'}
        </p>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--ink)' }}>
                Name
              </label>
              <input
                data-testid="auth-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required={!isLogin}
                className="w-full px-3 py-2 text-sm rounded-lg"
                style={{ border: '1px solid var(--border-strong)' }}
                placeholder="Your name"
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--ink)' }}>
              Email
            </label>
            <input
              data-testid="auth-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-3 py-2 text-sm rounded-lg"
              style={{ border: '1px solid var(--border-strong)' }}
              placeholder="you@example.com"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--ink)' }}>
              Password
            </label>
            <input
              data-testid="auth-password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              className="w-full px-3 py-2 text-sm rounded-lg"
              style={{ border: '1px solid var(--border-strong)' }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--saffron-light)', color: 'var(--saffron)' }}>
              {error}
            </div>
          )}

          <button
            data-testid="auth-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-sm font-semibold mb-4"
            style={{ backgroundColor: 'var(--saffron)', color: 'white' }}
          >
            {loading ? 'Please wait...' : isLogin ? 'Login' : 'Sign up'}
          </button>

          <button
            data-testid="auth-toggle"
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="w-full text-sm font-medium"
            style={{ color: 'var(--saffron)' }}
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login'}
          </button>

          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs text-center" style={{ color: 'var(--subtle)' }}>
              Or continue without an account
            </p>
            <button
              data-testid="auth-skip"
              type="button"
              onClick={onClose}
              className="w-full mt-2 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'transparent', color: 'var(--muted)', border: '1px solid var(--border-strong)' }}
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AuthModal;
