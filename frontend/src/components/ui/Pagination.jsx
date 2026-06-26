import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.pages <= 1) return null;

  const { page, pages } = pagination;

  const getPages = () => {
    const arr = [];
    const range = 2;
    for (let i = Math.max(1, page - range); i <= Math.min(pages, page + range); i++) {
      arr.push(i);
    }
    return arr;
  };

  return (
    <div className="flex items-center justify-between mt-6">
      <p className="text-sm text-gray-400">
        Page {page} of {pages} ({pagination.total} total)
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-vault-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        {getPages().map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
              p === page
                ? 'bg-brand-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-vault-muted'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-vault-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
