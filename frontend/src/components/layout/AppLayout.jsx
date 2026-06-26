import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu, X } from 'lucide-react';

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-vault-dark overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-64 flex-shrink-0">
        <div className="w-full">
          <Sidebar />
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-72 flex-shrink-0">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 p-2 bg-vault-panel rounded-lg text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-vault-border bg-vault-panel">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-vault-muted transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-white">ShareVault</span>
          <div className="w-9" />
        </div>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
