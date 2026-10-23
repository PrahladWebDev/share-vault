import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/formatters';
import Spinner from '../../components/ui/Spinner';
import TextField from '../../components/ui/TextField';
import AuthShell from '../../components/auth/AuthShell';
import toast from 'react-hot-toast';
import { Eye, EyeOff, UserPlus } from 'lucide-react';

const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const password = watch('password');

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const user = await registerUser(data.name, data.email, data.password);
      toast.success(`Account created! Welcome, ${user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      icon={UserPlus}
      title="Create account"
      subtitle="Start sharing files securely"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-brand-300 hover:text-brand-200 font-medium transition-colors">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <TextField
          label="Full name"
          type="text"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name', {
            required: 'Name is required',
            minLength: { value: 2, message: 'Name must be at least 2 characters' },
          })}
        />

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
            minLength: { value: 8, message: 'At least 8 characters required' },
            pattern: {
              value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
              message: 'Must have uppercase, lowercase, and number',
            },
          })}
        />

        <TextField
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: (v) => v === password || 'Passwords do not match',
          })}
        />

        <div className="pt-1">
          <p className="text-xs text-gray-500 mb-4">
            By creating an account you agree to our <span className="text-brand-300">Terms of Service</span>.
          </p>
          <button type="submit" disabled={isLoading} className="btn-primary w-full min-h-[48px] text-base">
            {isLoading ? <Spinner size="sm" /> : <UserPlus size={18} />}
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </div>
      </form>
    </AuthShell>
  );
};

export default RegisterPage;
