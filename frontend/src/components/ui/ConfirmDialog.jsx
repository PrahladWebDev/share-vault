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
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div
          className={`p-3 rounded-full ${variant === 'danger' ? 'bg-red-900/40 text-red-400' : 'bg-yellow-900/40 text-yellow-400'}`}
        >
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
          <p className="text-sm text-gray-400">{message}</p>
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={onClose} className="btn-secondary flex-1" disabled={isLoading}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-yellow-600 hover:bg-yellow-500 text-white'
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
