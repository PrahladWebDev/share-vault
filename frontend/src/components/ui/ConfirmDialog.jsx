import Modal from './Modal';
import Spinner from './Spinner';
import { AlertTriangle } from 'lucide-react';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to continue?',
  confirmLabel = 'Confirm',
  isLoading = false,
  variant = 'danger',
}) => {
  const isDanger = variant === 'danger';

  return (
    <Modal isOpen={isOpen} onClose={isLoading ? undefined : onClose} size="sm">
      <div className="flex flex-col items-center text-center gap-4 -mt-1">
        <div
          className={`h-14 w-14 rounded-full flex items-center justify-center ${
            isDanger ? 'bg-red-500/15 text-red-300' : 'bg-yellow-500/15 text-yellow-300'
          }`}
        >
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">{title}</h3>
          <p className="text-sm text-gray-400 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3 w-full justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-text" disabled={isLoading}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex items-center justify-center gap-2 min-h-[40px] min-w-[96px] px-6 py-2 rounded-full text-sm font-medium text-white shadow-md shadow-black/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
              isDanger ? 'bg-red-600 hover:bg-red-500' : 'bg-yellow-600 hover:bg-yellow-500'
            }`}
          >
            {isLoading ? <Spinner size="sm" /> : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
