import { Link } from 'react-router-dom';
import { Vault, Home, ArrowLeft } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-vault-dark flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-8">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-vault-panel rounded-2xl border border-vault-border">
            <Vault className="h-10 w-10 text-brand-400" />
          </div>
        </div>
        <p className="text-8xl font-black text-brand-800 mb-2 font-mono">404</p>
        <h1 className="text-2xl font-bold text-white mb-3">Page not found</h1>
        <p className="text-gray-400 text-sm max-w-sm">
          The page you're looking for doesn't exist. It may have been moved, deleted, or never existed.
        </p>
      </div>

      <div className="flex gap-3">
        <button onClick={() => window.history.back()} className="btn-secondary">
          <ArrowLeft size={15} />
          Go back
        </button>
        <Link to="/dashboard" className="btn-primary">
          <Home size={15} />
          Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
