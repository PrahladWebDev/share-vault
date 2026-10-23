import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { LogoMark } from '../components/ui/Logo';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-vault-dark app-backdrop flex flex-col items-center justify-center px-6 text-center">
      <div className="surface p-10 max-w-md w-full animate-slide-up">
        <div className="flex justify-center mb-6">
          <LogoMark size={64} />
        </div>
        <p className="text-7xl font-black text-brand-600/70 mb-2 font-mono tracking-tight">404</p>
        <h1 className="text-2xl font-bold text-white mb-3 tracking-tight">Page not found</h1>
        <p className="text-gray-400 text-sm mb-8">
          The page you're looking for doesn't exist. It may have been moved, deleted, or never existed.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button type="button" onClick={() => window.history.back()} className="btn-secondary">
            <ArrowLeft size={16} />
            Go back
          </button>
          <Link to="/dashboard" className="btn-primary">
            <Home size={16} />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
