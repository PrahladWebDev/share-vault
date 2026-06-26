import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api/auth';
import { getErrorMessage } from '../../utils/formatters';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { Eye, EyeOff, User, Lock, Shield } from 'lucide-react';

const SettingsPage = () => {
  const { user } = useAuth();
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm();

  const newPw = watch('newPassword');

  const onChangePassword = async (data) => {
    setIsChangingPw(true);
    try {
      await authAPI.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Password changed. Please login again.');
      reset();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsChangingPw(false);
    }
  };

  return (
    <div className="page-container max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Manage your account preferences</p>
      </div>

      {/* Profile section */}
      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-5">
          <User className="h-4 w-4 text-brand-400" />
          <h2 className="section-title mb-0">Profile</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Full name</label>
            <input type="text" className="input-field bg-vault-muted" value={user?.name || ''} readOnly />
          </div>
          <div>
            <label className="label">Email address</label>
            <input type="email" className="input-field bg-vault-muted" value={user?.email || ''} readOnly />
          </div>
          <div>
            <label className="label">Role</label>
            <div className="input-field bg-vault-muted flex items-center gap-2">
              <Shield className="h-4 w-4 text-brand-400" />
              <span className="capitalize text-gray-300">{user?.role}</span>
            </div>
          </div>
          <div>
            <label className="label">Member since</label>
            <input
              type="text"
              className="input-field bg-vault-muted"
              value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
              readOnly
            />
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-3">Profile editing coming soon.</p>
      </div>

      {/* Change password */}
      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <Lock className="h-4 w-4 text-brand-400" />
          <h2 className="section-title mb-0">Change Password</h2>
        </div>

        <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4">
          <div>
            <label className="label">Current password</label>
            <div className="relative">
              <input
                type={showCurrentPw ? 'text' : 'password'}
                placeholder="Your current password"
                className={`input-field pr-10 ${errors.currentPassword ? 'border-red-500' : ''}`}
                {...register('currentPassword', { required: 'Current password is required' })}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="error-text">{errors.currentPassword.message}</p>
            )}
          </div>

          <div>
            <label className="label">New password</label>
            <div className="relative">
              <input
                type={showNewPw ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                className={`input-field pr-10 ${errors.newPassword ? 'border-red-500' : ''}`}
                {...register('newPassword', {
                  required: 'New password is required',
                  minLength: { value: 8, message: 'At least 8 characters' },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                    message: 'Must have uppercase, lowercase, and number',
                  },
                })}
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.newPassword && <p className="error-text">{errors.newPassword.message}</p>}
          </div>

          <div>
            <label className="label">Confirm new password</label>
            <input
              type={showNewPw ? 'text' : 'password'}
              placeholder="Repeat new password"
              className={`input-field ${errors.confirmNew ? 'border-red-500' : ''}`}
              {...register('confirmNew', {
                required: 'Please confirm new password',
                validate: (v) => v === newPw || 'Passwords do not match',
              })}
            />
            {errors.confirmNew && <p className="error-text">{errors.confirmNew.message}</p>}
          </div>

          <div className="pt-1">
            <button type="submit" disabled={isChangingPw} className="btn-primary">
              {isChangingPw ? <Spinner size="sm" /> : <Lock size={14} />}
              {isChangingPw ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;
