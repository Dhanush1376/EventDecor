import React from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { DynamicCustomOrderWizard } from '../../../components/ui/DynamicCustomOrderWizard';
import toast from 'react-hot-toast';

export function CustomOrderPreviewModal({
  showPreviewModal,
  setShowPreviewModal,
  previewDevice,
  setPreviewDevice,
  config,
  activeTypeTab,
}) {
  return (
    <AnimatePresence>
      {showPreviewModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--admin-surface-overlay)] backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            className="bg-[var(--admin-surface)] w-full h-[92vh] rounded-[4px] shadow-2xl border border-[var(--admin-border)] flex flex-col overflow-hidden max-w-[1300px] text-left"
          >
            {/* Modal Header */}
            <div className="bg-[var(--admin-bg-subtle)] border-b border-[var(--admin-border-subtle)] px-5 py-3.5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[var(--admin-accent)]">
                    visibility
                  </span>
                  <h3 className="font-bold text-[14px] text-[var(--admin-text-primary)]">
                    Storefront Wizard Live Preview
                  </h3>
                </div>

                {/* Device Toggles */}
                <div className="flex items-center gap-1 bg-[var(--admin-surface-muted)] p-1 rounded-[4px] border border-[var(--admin-border)]">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`h-7 px-2.5 rounded-[4px] flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                      previewDevice === 'desktop'
                        ? 'bg-[var(--admin-accent)] text-white shadow-xs'
                        : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">desktop_mac</span>
                    <span className="hidden sm:inline">Desktop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('tablet')}
                    className={`h-7 px-2.5 rounded-[4px] flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                      previewDevice === 'tablet'
                        ? 'bg-[var(--admin-accent)] text-white shadow-xs'
                        : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">tablet_mac</span>
                    <span className="hidden sm:inline">Tablet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`h-7 px-2.5 rounded-[4px] flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                      previewDevice === 'mobile'
                        ? 'bg-[var(--admin-accent)] text-white shadow-xs'
                        : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">smartphone</span>
                    <span className="hidden sm:inline">Mobile</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="admin-btn-icon !rounded-[4px] w-8 h-8 text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]"
                title="Close Preview"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body / Device Container */}
            <div className="flex-1 overflow-y-auto bg-[var(--admin-bg-subtle)] flex items-center justify-center p-4 sm:p-6 custom-scrollbar">
              <div
                className={`bg-[var(--admin-surface)] shadow-md border border-[var(--admin-border)] rounded-[4px] overflow-y-auto transition-all duration-300 ${
                  previewDevice === 'desktop'
                    ? 'w-[1100px] h-[750px] max-w-full'
                    : previewDevice === 'tablet'
                      ? 'w-[720px] h-[850px]'
                      : 'w-[375px] h-[720px]'
                }`}
                style={{ maxHeight: '100%' }}
              >
                <div className="p-6">
                  <DynamicCustomOrderWizard
                    previewConfig={config}
                    initialProductPayload={activeTypeTab === 'product' ? { preview: true } : null}
                    initialEventType={activeTypeTab === 'event' ? { preview: true } : null}
                    onComplete={() => toast.success('Preview submission successful!')}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
