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
    <nav
      aria-label="Pagination"
      className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6"
    >
      <p className="text-sm text-gray-400">
        Page {page} of {pages} <span className="text-gray-600">·</span> {pagination.total} total
      </p>
      <div className="flex items-center gap-1 p-1 rounded-full bg-vault-panel border border-vault-border/60">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="icon-btn h-9 w-9"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        {getPages().map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`h-9 min-w-[36px] px-2 rounded-full text-sm font-medium transition-colors ${
              p === page
                ? 'bg-brand-600 text-white shadow-md shadow-black/20'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          aria-label="Next page"
          className="icon-btn h-9 w-9"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </nav>
  );
};

export default Pagination;
