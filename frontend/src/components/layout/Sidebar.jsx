import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Upload, Files, Settings, LogOut,
  Shield, Users, HardDrive, ScrollText, Vault, Film, FileArchive
} from 'lucide-react';
import toast from 'react-hot-toast';
import ThemeSwitcher from '../ui/ThemeSwitcher';

const NavItem = ({ to, icon: Icon, label, end, onClick }) => (
  <NavLink
    to={to}
    end={end}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center gap-3 h-12 px-4 rounded-full text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'bg-brand-600/25 text-white'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`
    }
  >
    {({ isActive }) => (
      <>
        <Icon size={20} className={`flex-shrink-0 ${isActive ? 'text-brand-300' : ''}`} />
        {label}
      </>
    )}
  </NavLink>
);

const SectionLabel = ({ children, className = '' }) => (
  <p className={`text-[11px] uppercase tracking-[0.14em] text-gray-500 px-4 mb-2 font-semibold ${className}`}>
    {children}
  </p>
);

const Sidebar = ({ onClose }) => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('Logged out');
    onClose?.();
  };

  const userLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/upload', icon: Upload, label: 'Upload File' },
    { to: '/files', icon: Files, label: 'My Files' },
    { to: '/zip-converter', icon: FileArchive, label: 'ZIP Converter' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const adminLinks = [
    { to: '/admin', icon: Shield, label: 'Admin Dashboard', end: true },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/files', icon: HardDrive, label: 'All Files' },
    { to: '/admin/logs', icon: ScrollText, label: 'Cleanup Logs' },
    { to: '/admin/videos', icon: Film, label: 'Video Vault' },
  ];

  return (
    <div className="flex flex-col h-full bg-vault-panel transition-colors duration-500">
      {/* Brand */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-black/30">
            <Vault className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">ShareVault</span>
        </div>
      </div>

      {/* User */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-brand-600/10">
          <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          {isAdmin && <span className="badge badge-purple flex-shrink-0">Admin</span>}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1" aria-label="Main">
        <SectionLabel className="mt-1">Menu</SectionLabel>
        {userLinks.map((link) => (
          <NavItem key={link.to} {...link} onClick={onClose} />
        ))}

        {isAdmin && (
          <>
            <SectionLabel className="mt-6">Admin</SectionLabel>
            {adminLinks.map((link) => (
              <NavItem key={link.to} {...link} onClick={onClose} />
            ))}
          </>
        )}
      </nav>

      {/* Theme + Logout */}
      <div className="px-3 py-3 border-t border-vault-border/60 space-y-1">
        <ThemeSwitcher variant="compact" />
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 w-full h-12 px-4 rounded-full text-sm font-medium text-gray-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={20} />
          Sign out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
