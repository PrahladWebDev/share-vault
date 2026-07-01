import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Upload, Files, Settings, LogOut,
  Shield, Users, HardDrive, ScrollText, ChevronRight, Vault, Film
} from 'lucide-react';
import toast from 'react-hot-toast';

const NavItem = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-brand-600/20 text-brand-300 border border-brand-600/30'
          : 'text-gray-400 hover:text-white hover:bg-vault-muted'
      }`
    }
  >
    <Icon className="h-4.5 w-4.5 flex-shrink-0" size={18} />
    {label}
  </NavLink>
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
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const adminLinks = [
    { to: '/admin', icon: Shield, label: 'Admin Dashboard' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/files', icon: HardDrive, label: 'All Files' },
    { to: '/admin/logs', icon: ScrollText, label: 'Cleanup Logs' },
    { to: '/admin/videos', icon: Film, label: 'Video Vault' },
  ];

  return (
    <div className="flex flex-col h-full bg-vault-panel border-r border-vault-border">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-vault-border">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-brand-600 rounded-lg">
            <Vault className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">ShareVault</span>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-vault-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-700 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          {isAdmin && (
            <span className="ml-auto badge badge-purple flex-shrink-0">Admin</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-gray-600 px-3 mb-2 font-semibold">
          Menu
        </p>
        {userLinks.map((link) => (
          <NavItem key={link.to} {...link} />
        ))}

        {isAdmin && (
          <>
            <p className="text-[10px] uppercase tracking-widest text-gray-600 px-3 mt-5 mb-2 font-semibold">
              Admin
            </p>
            {adminLinks.map((link) => (
              <NavItem key={link.to} {...link} />
            ))}
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-vault-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
