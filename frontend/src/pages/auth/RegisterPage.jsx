import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/formatters';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { Eye, EyeOff, UserPlus, Vault } from 'lucide-react';

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
    <div className="min-h-screen bg-vault-dark flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="p-1.5 bg-brand-600 rounded-lg">
            <Vault className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">ShareVault</span>
        </div>

        <div className="card">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-1">Create account</h2>
            <p className="text-sm text-gray-400">Start sharing files securely</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <input
                type="text"
                autoComplete="name"
                placeholder="John Doe"
                className={`input-field ${errors.name ? 'border-red-500' : ''}`}
                {...register('name', {
                  required: 'Name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' },
                })}
              />
              {errors.name && <p className="error-text">{errors.name.message}</p>}
            </div>

            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={`input-field ${errors.email ? 'border-red-500' : ''}`}
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && <p className="error-text">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  className={`input-field pr-10 ${errors.password ? 'border-red-500' : ''}`}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'At least 8 characters required' },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                      message: 'Must have uppercase, lowercase, and number',
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
              <label className="label">Confirm password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Repeat password"
                className={`input-field ${errors.confirmPassword ? 'border-red-500' : ''}`}
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (v) => v === password || 'Passwords do not match',
                })}
              />
              {errors.confirmPassword && (
                <p className="error-text">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="pt-1">
              <p className="text-xs text-gray-500 mb-4">
                By creating an account you agree to our{' '}
                <span className="text-brand-400">Terms of Service</span>.
              </p>
              <button type="submit" disabled={isLoading} className="btn-primary w-full py-3">
                {isLoading ? <Spinner size="sm" /> : <UserPlus size={16} />}
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
