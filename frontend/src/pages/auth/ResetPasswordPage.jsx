import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authAPI } from '../../api/auth';
import { getErrorMessage } from '../../utils/formatters';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { Eye, EyeOff, KeyRound, Vault } from 'lucide-react';

const ResetPasswordPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const password = watch('password');

  const onSubmit = async (data) => {
    if (!token) {
      toast.error('Invalid reset link');
      return;
    }
    setIsLoading(true);
    try {
      await authAPI.resetPassword({ token, password: data.password });
      toast.success('Password reset successfully! Please login.');
      navigate('/login');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-vault-dark flex items-center justify-center px-6">
        <div className="card text-center max-w-sm w-full">
          <p className="text-4xl mb-3">⛔</p>
          <p className="text-white font-semibold mb-2">Invalid Reset Link</p>
          <p className="text-sm text-gray-400 mb-5">This password reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="btn-primary w-full justify-center">
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vault-dark flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="p-1.5 bg-brand-600 rounded-lg">
            <Vault className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">ShareVault</span>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-brand-900/50 rounded-lg border border-brand-800">
              <KeyRound className="h-5 w-5 text-brand-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Set new password</h2>
              <p className="text-xs text-gray-400">Choose a strong password</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">New password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  className={`input-field pr-10 ${errors.password ? 'border-red-500' : ''}`}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'At least 8 characters' },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                      message: 'Must include uppercase, lowercase, and number',
                    },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="error-text">{errors.password.message}</p>}
            </div>

            <div>
              <label className="label">Confirm new password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Repeat password"
                className={`input-field ${errors.confirm ? 'border-red-500' : ''}`}
                {...register('confirm', {
                  required: 'Please confirm your password',
                  validate: (v) => v === password || 'Passwords do not match',
                })}
              />
              {errors.confirm && <p className="error-text">{errors.confirm.message}</p>}
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 mt-2">
              {isLoading ? <Spinner size="sm" /> : <KeyRound size={16} />}
              {isLoading ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
