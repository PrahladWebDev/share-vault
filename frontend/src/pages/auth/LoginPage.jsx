import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/formatters';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Vault, Lock } from 'lucide-react';

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const user = await login(data.email, data.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-vault-dark flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-vault-panel border-r border-vault-border flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/30 via-transparent to-purple-900/20" />
        <div className="relative z-10 text-center max-w-md">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-brand-600 rounded-2xl shadow-2xl shadow-brand-900/50">
              <Vault className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">ShareVault</h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Secure file sharing with automatic expiry. Upload, share, and manage your files with confidence.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { label: 'Encrypted', desc: 'JWT-secured transfers' },
              { label: 'Auto-expiry', desc: '24h for user files' },
              { label: 'Instant links', desc: 'No login to download' },
            ].map((item) => (
              <div key={item.label} className="p-3 bg-vault-dark/50 rounded-xl border border-vault-border">
                <p className="text-xs font-semibold text-brand-300">{item.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="p-1.5 bg-brand-600 rounded-lg">
              <Vault className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">ShareVault</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">Sign in</h2>
            <p className="text-gray-400 text-sm">Welcome back to your vault</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={`input-field ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && <p className="error-text">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Password</label>
                <Link to="/forgot-password" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`input-field pr-10 ${errors.password ? 'border-red-500' : ''}`}
                  {...register('password', { required: 'Password is required' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="error-text">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3">
              {isLoading ? <Spinner size="sm" /> : <Lock size={16} />}
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
