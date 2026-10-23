import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

/** Material-style dialog: scrim, 28px radius, Escape / scrim click to close. */
const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const dialogRef = useRef(null);
  // Keep the latest onClose without re-running the open/close effect on every
  // render (which would steal focus from inputs inside the dialog).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;

    const previouslyFocused = document.activeElement;
    document.body.style.overflow = 'hidden';
    // Don't steal focus from an input inside the dialog that already autofocused.
    if (!dialogRef.current?.contains(document.activeElement)) dialogRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Dialog'}
        tabIndex={-1}
        className={`relative w-full ${sizes[size]} max-h-[90vh] overflow-y-auto bg-vault-panel border border-vault-border/60 rounded-[28px] shadow-2xl shadow-black/50 animate-dialog-in focus:outline-none`}
      >
        {title && (
          <div className="flex items-center justify-between gap-4 px-6 pt-6 pb-2">
            <h2 className="text-xl font-semibold text-white tracking-tight">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="icon-btn -mr-2">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
