import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast, { Toaster, ToastBar, useToasterStore } from 'react-hot-toast';
import debounce from 'lodash.debounce';
import { m } from 'framer-motion';

export function GlobalToaster() {
  const [toastPosition, setToastPosition] = useState('bottom-right');
  const { toasts } = useToasterStore();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  useEffect(() => {
    const TOAST_LIMIT = 3;
    toasts
      .filter((t) => t.visible)
      .filter((_, i) => i >= TOAST_LIMIT)
      .forEach((t) => toast.remove(t.id));
  }, [toasts]);

  useEffect(() => {
    const handleResize = debounce(() => {
      setToastPosition(window.innerWidth < 1024 ? 'top-center' : 'bottom-right');
    }, 250);
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      handleResize.cancel();
    };
  }, []);

  // Admin styles (sharp edges, solid background)
  const adminStyle = {
    background: 'var(--admin-surface, #ffffff)',
    border: '1px solid var(--admin-border, #e5e7eb)',
    color: 'var(--admin-text-primary, #111827)',
    fontSize: '13px',
    fontFamily: 'var(--font-body)',
    fontWeight: '500',
    borderRadius: 'var(--admin-radius-lg, 8px)',
    padding: '12px 16px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  };

  // Storefront styles (pill shape, glassmorphism)
  const storefrontStyle = {
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.4)',
    color: 'var(--text-primary, #111827)',
    fontSize: '13px',
    fontFamily: 'var(--font-body)',
    fontWeight: '500',
    borderRadius: '50px',
    padding: '12px 20px',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
  };

  return (
    <div className="toaster-container">
      <Toaster
        position={toastPosition}
        containerStyle={{
          top: toastPosition === 'top-center' ? '80px' : 20,
        }}
        toastOptions={{
          duration: 3500,
          style: isAdmin ? adminStyle : storefrontStyle,
          success: { iconTheme: { primary: '#16a34a', secondary: '#ffffff' } },
        }}
      >
        {(t) => (
          <m.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.4}
            onDragEnd={(_, info) => {
              if (info.offset.y < -20) {
                toast.dismiss(t.id);
              }
            }}
            style={{ touchAction: 'none', cursor: 'grab' }}
            whileTap={{ cursor: 'grabbing' }}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="pointer-events-auto"
          >
            <ToastBar toast={t} />
          </m.div>
        )}
      </Toaster>
    </div>
  );
}
