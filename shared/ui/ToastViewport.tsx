import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast, Toast as ToastType, TOAST_ICONS, TOAST_COLORS } from '../toast/ToastContext';

const ToastItem: React.FC<{ toast: ToastType }> = ({ toast }) => {
  const { removeToast } = useToast();
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const duration = toast.duration ?? 4000;
    if (duration <= 0) {
      return undefined;
    }

    const enterToExitDelay = Math.max(0, duration - 200);
    let exitTimer: ReturnType<typeof setTimeout> | null = null;
    const timer = setTimeout(() => {
      setIsExiting(true);
      exitTimer = setTimeout(() => removeToast(toast.id), 200);
    }, enterToExitDelay);

    return () => {
      clearTimeout(timer);
      if (exitTimer) {
        clearTimeout(exitTimer);
      }
    };
  }, [toast.duration, toast.id, removeToast]);

  const handleClose = () => {
    if (isExiting) {
      return;
    }
    setIsExiting(true);
    setTimeout(() => removeToast(toast.id), 200);
  };

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border
        shadow-lg backdrop-blur-sm
        transform transition-all duration-200 ease-out
        ${TOAST_COLORS[toast.type]}
        ${isExiting 
          ? 'opacity-0 translate-x-4 scale-95' 
          : 'opacity-100 translate-x-0 scale-100 animate-slide-up'
        }
      `}
      role="alert"
    >
      <span className="text-lg flex-shrink-0">{TOAST_ICONS[toast.type]}</span>
      <p className="text-sm font-medium text-surface-100 flex-1">{toast.message}</p>
      <button
        onClick={handleClose}
        className="text-surface-400 hover:text-surface-100 transition-colors p-1"
        aria-label="Close"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export const ToastViewport: React.FC = () => {
  const { toasts } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>,
    document.body
  );
};

export default ToastViewport;
