import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/formatters';
import Spinner from '../../components/ui/Spinner';
import TextField from '../../components/ui/TextField';
import AuthShell from '../../components/auth/AuthShell';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock } from 'lucide-react';

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
    <AuthShell
      title="Sign in"
      subtitle="Welcome back to your vault"
      footer={
        <>
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-300 hover:text-brand-200 font-medium transition-colors">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <TextField
          label="Email address"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email', { required: 'Email is required' })}
        />

        <TextField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          error={errors.password?.message}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="icon-btn"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
          {...register('password', { required: 'Password is required' })}
        />

        <div className="flex justify-end -mt-2">
          <Link
            to="/forgot-password"
            className="text-sm text-brand-300 hover:text-brand-200 font-medium transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <button type="submit" disabled={isLoading} className="btn-primary w-full min-h-[48px] text-base">
          {isLoading ? <Spinner size="sm" /> : <Lock size={18} />}
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
};

export default LoginPage;
