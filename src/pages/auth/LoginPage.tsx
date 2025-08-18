import React, { useEffect, useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PatAvatar } from '../../components/PatAvatar';
import { signInWithPassword, getSession } from '../../lib/auth';

interface LoginPageProps {
  onNavigate: (page: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    getSession().then((session) => {
      if (session?.user) {
        navigate('/dashboard', { replace: true });
      }
    });
  }, [navigate]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg(null);

    // Client-side validation
    if (typeof email !== 'string' || !email.trim()) {
      setErrMsg('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      setErrMsg('Please enter a valid email address');
      return;
    }

    if (typeof password !== 'string' || !password) {
      setErrMsg('Please enter your password');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await signInWithPassword(email.trim(), password);

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrMsg('Invalid email or password. Please try again.');
        } else if (error.message.includes('Email not confirmed')) {
          setErrMsg('Please check your email and click the confirmation link before signing in.');
        } else {
          setErrMsg(error.message || 'Sign in failed. Check your email and password.');
        }
        return;
      }

      // Success: navigate to dashboard
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      setErrMsg('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
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
        {errMsg && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{errMsg}</p>
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
                disabled={submitting}
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
                disabled={submitting}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                disabled={submitting}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {submitting ? (
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
            onClick={() => onNavigate('forgot-password')}
            className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
            disabled={submitting}
          >
            Forgot your password?
          </button>
          <div className="text-gray-500 text-sm">
            Don't have an account?{' '}
            <button
              onClick={() => onNavigate('register')}
              className="text-blue-400 hover:text-blue-300 transition-colors"
              disabled={submitting}
            >
              Sign up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};