import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

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
    isPrompt: false,
    promptPlaceholder: '',
  });

  const [inputValue, setInputValue] = useState('');

  const resolver = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setInputValue('');
      setConfirmState({
        isOpen: true,
        title: options.title || 'Please Confirm',
        message: options.message || 'Are you sure?',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        type: options.type || 'warning',
        isPrompt: !!options.isPrompt,
        promptPlaceholder: options.promptPlaceholder || 'Enter value...',
      });
      resolver.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
    if (resolver.current) {
      resolver.current(confirmState.isPrompt ? inputValue : true);
      resolver.current = null;
    }
  }, [confirmState.isPrompt, inputValue]);

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
      <ConfirmModal
        {...confirmState}
        inputValue={inputValue}
        setInputValue={setInputValue}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
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
  isPrompt,
  promptPlaceholder,
  inputValue,
  setInputValue,
  onConfirm,
  onCancel,
}) => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: 'delete_forever',
          iconColor: isAdmin ? 'text-[var(--admin-error)]' : 'text-error',
          btnBg: isAdmin
            ? 'bg-[var(--admin-error)] hover:brightness-110'
            : 'bg-error hover:bg-error/90',
          btnText: 'text-white', // forced white for danger button readability
        };
      case 'info':
        return {
          icon: 'info',
          iconColor: isAdmin ? 'text-[var(--admin-accent)]' : 'text-primary',
          btnBg: isAdmin
            ? 'bg-[var(--admin-accent)] hover:brightness-110'
            : 'bg-primary hover:bg-primary/90',
          btnText: 'text-white',
        };
      case 'warning':
      default:
        return {
          icon: 'warning',
          iconColor: isAdmin ? 'text-[#d97706]' : 'text-warning',
          btnBg: isAdmin ? 'bg-[#d97706] hover:brightness-110' : 'bg-warning hover:bg-warning/90',
          btnText: 'text-white',
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${isAdmin ? 'admin-section-root' : ''}`}
        >
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
            className={`relative w-full max-w-md overflow-hidden keyboard-aware-drawer ${
              isAdmin
                ? 'bg-[var(--admin-surface)] border border-[var(--admin-border-strong)] rounded-xl shadow-[var(--admin-shadow-lg)]'
                : 'bg-surface border border-outline-variant/30 rounded-3xl shadow-2xl'
            }`}
          >
            <div className="absolute top-[98%] left-0 right-0 h-[100vh] bg-inherit sm:hidden z-[-1]" />
            {/* Header */}
            <div
              className={`flex items-center justify-between ${isAdmin ? 'p-5 border-b border-[var(--admin-border-subtle)]' : 'p-6 pb-4 border-b border-outline-variant/20'}`}
            >
              <div className={`flex items-center gap-3 ${styles.iconColor}`}>
                <span className="material-symbols-outlined text-[24px]">{styles.icon}</span>
                <h3
                  className={`${isAdmin ? 'font-sans text-[16px] font-bold text-[var(--admin-text-primary)]' : 'font-display text-[18px] font-medium text-on-surface'}`}
                >
                  {title}
                </h3>
              </div>
              <button
                onClick={onCancel}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                  isAdmin
                    ? 'hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                    : 'hover:bg-surface-variant text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Content */}
            <div className={isAdmin ? 'p-5 space-y-4' : 'p-6 space-y-4'}>
              <p
                className={`${isAdmin ? 'text-[var(--admin-text-secondary)] text-[14px] leading-relaxed' : 'text-on-surface-variant text-[14px] leading-relaxed'}`}
              >
                {message}
              </p>

              {isPrompt && (
                <div className="mt-4">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={promptPlaceholder}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onConfirm();
                    }}
                    className={`w-full px-3 py-2 border rounded-md outline-none transition-colors ${
                      isAdmin
                        ? 'bg-[var(--admin-surface)] border-[var(--admin-border)] focus:border-blue-500 text-[var(--admin-text-primary)] text-sm'
                        : 'bg-surface border-outline-variant focus:border-primary text-on-surface'
                    }`}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className={`flex items-center justify-end gap-3 ${isAdmin ? 'p-5 pt-0' : 'p-6 pt-4 bg-surface-variant/30'}`}
            >
              <button
                onClick={onCancel}
                className={`transition-colors ${
                  isAdmin
                    ? 'px-4 py-2 rounded-md text-[13px] font-bold text-[var(--admin-text-primary)] bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] hover:bg-[var(--admin-border-subtle)]'
                    : 'px-5 py-2.5 rounded-full font-label-sm text-[11px] uppercase tracking-widest font-bold text-on-surface hover:bg-surface-variant'
                }`}
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`transition-all flex items-center gap-2 ${styles.btnBg} ${styles.btnText} ${
                  isAdmin
                    ? 'px-4 py-2 rounded-md text-[13px] font-bold shadow-sm'
                    : 'px-6 py-2.5 rounded-full font-label-sm text-[11px] uppercase tracking-widest font-bold shadow-md'
                }`}
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
