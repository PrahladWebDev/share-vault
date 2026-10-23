import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authAPI } from '../../api/auth';
import { getErrorMessage } from '../../utils/formatters';
import Spinner from '../../components/ui/Spinner';
import TextField from '../../components/ui/TextField';
import AuthShell from '../../components/auth/AuthShell';
import toast from 'react-hot-toast';
import { Eye, EyeOff, KeyRound, ShieldAlert } from 'lucide-react';

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
      <AuthShell
        icon={ShieldAlert}
        title="Invalid reset link"
        subtitle="This password reset link is invalid or has expired."
      >
        <Link to="/forgot-password" className="btn-primary w-full min-h-[48px]">
          Request new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell icon={KeyRound} title="Set new password" subtitle="Choose a strong password">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <TextField
          label="New password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          helper="Min. 8 characters with upper, lower case and a number"
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
          {...register('password', {
            required: 'Password is required',
            minLength: { value: 8, message: 'At least 8 characters' },
            pattern: {
              value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
              message: 'Must include uppercase, lowercase, and number',
            },
          })}
        />

        <TextField
          label="Confirm new password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          error={errors.confirm?.message}
          {...register('confirm', {
            required: 'Please confirm your password',
            validate: (v) => v === password || 'Passwords do not match',
          })}
        />

        <button type="submit" disabled={isLoading} className="btn-primary w-full min-h-[48px] text-base">
          {isLoading ? <Spinner size="sm" /> : <KeyRound size={18} />}
          {isLoading ? 'Resetting...' : 'Reset password'}
        </button>
      </form>
    </AuthShell>
  );
};

export default ResetPasswordPage;
