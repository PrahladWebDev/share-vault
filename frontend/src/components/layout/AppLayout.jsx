import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu, Vault } from 'lucide-react';

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Mobile drawer: Escape to close + lock page scroll while open.
  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen bg-vault-dark overflow-hidden transition-colors duration-500">
      {/* Desktop navigation drawer */}
      <aside className="hidden lg:block w-72 flex-shrink-0 p-3 pr-0">
        <div className="h-full overflow-hidden rounded-3xl border border-vault-border/60 shadow-xl shadow-black/20">
          <Sidebar />
        </div>
      </aside>

      {/* Mobile modal drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-80 max-w-[85vw] flex-shrink-0 rounded-r-[28px] overflow-hidden shadow-2xl shadow-black/60 animate-drawer-in">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top app bar */}
        <header className="lg:hidden flex items-center gap-2 h-14 px-2 border-b border-vault-border/60 bg-vault-panel/90 backdrop-blur">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            className="icon-btn"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <Vault className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-semibold text-white tracking-tight">ShareVault</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto app-backdrop">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
