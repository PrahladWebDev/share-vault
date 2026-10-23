import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authAPI } from '../../api/auth';
import { getErrorMessage } from '../../utils/formatters';
import Spinner from '../../components/ui/Spinner';
import TextField from '../../components/ui/TextField';
import AuthShell from '../../components/auth/AuthShell';
import toast from 'react-hot-toast';
import { ArrowLeft, Mail, MailCheck } from 'lucide-react';

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
    <AuthShell
      icon={sent ? MailCheck : Mail}
      title={sent ? 'Check your inbox' : 'Reset password'}
      subtitle={sent ? undefined : "We'll send reset instructions"}
      footer={
        <Link
          to="/login"
          className="inline-flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          Back to login
        </Link>
      }
    >
      {sent ? (
        <div>
          <p className="text-sm text-gray-400 leading-relaxed">
            If an account exists, reset instructions have been sent.
          </p>
          <Link to="/login" className="btn-primary w-full min-h-[48px] mt-6">
            Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <TextField
            label="Email address"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email', { required: 'Email is required' })}
          />
          <button type="submit" disabled={isLoading} className="btn-primary w-full min-h-[48px] text-base">
            {isLoading ? <Spinner size="sm" /> : null}
            {isLoading ? 'Sending...' : 'Send reset instructions'}
          </button>
        </form>
      )}
    </AuthShell>
  );
};

export default ForgotPasswordPage;
