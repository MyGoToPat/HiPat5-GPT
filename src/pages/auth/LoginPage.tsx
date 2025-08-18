import React, { useEffect, useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // If already authenticated, bounce away from /login
  useEffect(() => {
    getSession().then((s) => {
      if (s?.user) {
        console.log('[login] already authenticated → redirecting');
        navigate('/dashboard', { replace: true });
      }
    });
  }, [navigate]);

  // If already authenticated, bounce away from /login
  useEffect(() => {
      return setError('Please enter a valid email address');
        console.log('[login] already authenticated → redirecting');
        navigate('/', { replace: true });
      }
      return setError('Please enter your password');

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
      const { error: authError } = await signInWithPassword(email.trim(), password);
    if (!password) return setError('Please enter your password');
        const msg = authError.message || 'Sign in failed. Check your email and password.';
        console.warn('[login] auth error:', authError);
        setError(msg);
      if (authError) {
        const msg = authError.message || 'Sign in failed. Check your email and password.';
      console.log('[login] success → redirecting to app root');
      navigate('/', { replace: true }); // root is safest; router can land you on dashboard
      // If your dashboard route is strictly '/dashboard', also push a delayed fallback:
      setTimeout(() => navigate('/dashboard', { replace: true }), 50);
      setTimeout(() => navigate('/dashboard', { replace: true }), 50);
      console.error('[login] unexpected error:', error);
      setError((error as any)?.message ?? 'Unexpected error during sign in.');
      setError(err?.message ?? 'Unexpected error during sign in.');
      return setError('Please enter your email address');
    }
  };

  return (
    <div className="min-h-screen bg-pat-gradient flex items-center justify-center px-4">
      <div className="bg-gray-900 p-8 rounded-2xl shadow-pat-card max-w-md w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <PatAvatar size={80} mood="neutral" className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-400">Sign in to continue with Pat</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-10 pr-12 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Signing In...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-6 text-center space-y-2">
          <button
            onClick={() => navigate('/forgot-password')}
            className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
            disabled={isLoading}
          >
            Forgot your password?
          </button>
          <div className="text-gray-500 text-sm">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-blue-400 hover:text-blue-300 transition-colors"
              disabled={isLoading}
            >
              Sign up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};