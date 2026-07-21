import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';

const ConfirmContext = createContext(null);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider = ({ children }) => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'warning', // 'warning', 'danger', 'info'
  });

  const resolver = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title: options.title || 'Please Confirm',
        message: options.message || 'Are you sure?',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        type: options.type || 'warning',
      });
      resolver.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
    if (resolver.current) {
      resolver.current(true);
      resolver.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
    if (resolver.current) {
      resolver.current(false);
      resolver.current = null;
    }
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmModal {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </ConfirmContext.Provider>
  );
};

const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  type,
  onConfirm,
  onCancel,
}) => {
  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: 'delete_forever',
          iconColor: 'text-error',
          btnBg: 'bg-error hover:bg-error/90',
          btnText: 'text-onError shadow-error/20',
        };
      case 'info':
        return {
          icon: 'info',
          iconColor: 'text-primary',
          btnBg: 'bg-primary hover:bg-primary/90',
          btnText: 'text-onPrimary shadow-primary/20',
        };
      case 'warning':
      default:
        return {
          icon: 'warning',
          iconColor: 'text-warning',
          btnBg: 'bg-warning hover:bg-warning/90',
          btnText: 'text-onWarning shadow-warning/20',
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-surface border border-outline-variant/30 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 pb-4 border-b border-outline-variant/20 flex items-center justify-between">
              <div className={`flex items-center gap-3 ${styles.iconColor}`}>
                <span className="material-symbols-outlined text-[24px]">{styles.icon}</span>
                <h3 className="font-display text-[18px] font-medium text-on-surface">{title}</h3>
              </div>
              <button
                onClick={onCancel}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-on-surface-variant text-[14px] leading-relaxed">{message}</p>
            </div>

            {/* Footer */}
            <div className="p-6 pt-4 bg-surface-variant/30 flex items-center justify-end gap-3">
              <button
                onClick={onCancel}
                className="px-5 py-2.5 rounded-full font-label-sm text-[11px] uppercase tracking-widest font-bold text-on-surface hover:bg-surface-variant transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`px-6 py-2.5 rounded-full font-label-sm text-[11px] uppercase tracking-widest font-bold shadow-md transition-all flex items-center gap-2 ${styles.btnBg} ${styles.btnText}`}
              >
                <span>{confirmText}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
