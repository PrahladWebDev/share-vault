import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authAPI } from '../../api/auth';
import { getErrorMessage } from '../../utils/formatters';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { ArrowLeft, Mail, Vault } from 'lucide-react';

const ForgotPasswordPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await authAPI.forgotPassword(data.email);
      setSent(true);
      toast.success('Reset instructions sent (check dev console/email)');
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
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-brand-900/50 rounded-lg border border-brand-800">
              <Mail className="h-5 w-5 text-brand-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Reset password</h2>
              <p className="text-xs text-gray-400">We'll send reset instructions</p>
            </div>
          </div>

          {sent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">📬</div>
              <p className="text-sm text-gray-300 font-medium mb-1">Check your inbox</p>
              <p className="text-xs text-gray-500">If an account exists, reset instructions have been sent.</p>
              <Link to="/login" className="btn-primary w-full mt-6 justify-center">
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className={`input-field ${errors.email ? 'border-red-500' : ''}`}
                  {...register('email', { required: 'Email is required' })}
                />
                {errors.email && <p className="error-text">{errors.email.message}</p>}
              </div>
              <button type="submit" disabled={isLoading} className="btn-primary w-full py-3">
                {isLoading ? <Spinner size="sm" /> : null}
                {isLoading ? 'Sending...' : 'Send reset instructions'}
              </button>
            </form>
          )}
        </div>

        <Link to="/login" className="flex items-center justify-center gap-2 mt-5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          <ArrowLeft size={14} />
          Back to login
        </Link>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
