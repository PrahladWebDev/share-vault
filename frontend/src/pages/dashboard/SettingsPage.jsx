import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api/auth';
import { getErrorMessage } from '../../utils/formatters';
import Spinner from '../../components/ui/Spinner';
import TextField from '../../components/ui/TextField';
import toast from 'react-hot-toast';
import { Eye, EyeOff, User, Lock, Shield, Palette } from 'lucide-react';
import ThemeSwitcher from '../../components/ui/ThemeSwitcher';

const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="h-10 w-10 rounded-2xl bg-brand-600/20 flex items-center justify-center flex-shrink-0">
      <Icon className="h-5 w-5 text-brand-300" />
    </div>
    <div>
      <h2 className="text-base font-semibold text-white leading-tight">{title}</h2>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

const VisibilityToggle = ({ shown, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={shown ? 'Hide password' : 'Show password'}
    className="icon-btn"
  >
    {shown ? <EyeOff size={18} /> : <Eye size={18} />}
  </button>
);

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
    <div className="page-container max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Manage your account preferences</p>
      </div>

      {/* Profile section */}
      <div className="card !p-6 mb-5">
        <SectionHeader icon={User} title="Profile" subtitle="Your account details" />
        <div className="grid sm:grid-cols-2 gap-5">
          <TextField label="Full name" value={user?.name || ''} readOnly />
          <TextField label="Email address" type="email" value={user?.email || ''} readOnly />
          <TextField
            label="Role"
            value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
            leading={<Shield size={18} className="text-brand-300" />}
            readOnly
          />
          <TextField
            label="Member since"
            value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
            readOnly
          />
        </div>
        <p className="text-xs text-gray-600 mt-4">Profile editing coming soon.</p>
      </div>

      {/* Appearance */}
      <div className="card !p-6 mb-5">
        <SectionHeader icon={Palette} title="Appearance" subtitle="Pick a theme — it applies across the whole app instantly" />
        <ThemeSwitcher variant="full" />
      </div>

      {/* Change password */}
      <div className="card !p-6">
        <SectionHeader icon={Lock} title="Change Password" subtitle="Use a strong, unique password" />

        <form onSubmit={handleSubmit(onChangePassword)} className="space-y-5" noValidate>
          <TextField
            label="Current password"
            type={showCurrentPw ? 'text' : 'password'}
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            trailing={<VisibilityToggle shown={showCurrentPw} onToggle={() => setShowCurrentPw(!showCurrentPw)} />}
            {...register('currentPassword', { required: 'Current password is required' })}
          />

          <TextField
            label="New password"
            type={showNewPw ? 'text' : 'password'}
            autoComplete="new-password"
            helper="Min. 8 characters with upper, lower case and a number"
            error={errors.newPassword?.message}
            trailing={<VisibilityToggle shown={showNewPw} onToggle={() => setShowNewPw(!showNewPw)} />}
            {...register('newPassword', {
              required: 'New password is required',
              minLength: { value: 8, message: 'At least 8 characters' },
              pattern: {
                value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                message: 'Must have uppercase, lowercase, and number',
              },
            })}
          />

          <TextField
            label="Confirm new password"
            type={showNewPw ? 'text' : 'password'}
            autoComplete="new-password"
            error={errors.confirmNew?.message}
            {...register('confirmNew', {
              required: 'Please confirm new password',
              validate: (v) => v === newPw || 'Passwords do not match',
            })}
          />

          <div className="pt-1 flex justify-end">
            <button type="submit" disabled={isChangingPw} className="btn-primary">
              {isChangingPw ? <Spinner size="sm" /> : <Lock size={16} />}
              {isChangingPw ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;
