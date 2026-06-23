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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[var(--color-surface-ivory)] w-full h-[95vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden max-w-[1400px]"
          >
            {/* Modal Header */}
            <div className="bg-black text-white p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <h3 className="font-display text-[20px]">Live Storefront Preview</h3>
                {/* Device Toggles */}
                <div className="flex gap-1 bg-white/10 p-1 rounded-lg">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`p-1.5 rounded flex items-center justify-center ${previewDevice === 'desktop' ? 'bg-[var(--color-gold)]' : 'hover:bg-white/10'}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">desktop_mac</span>
                  </button>
                  <button
                    onClick={() => setPreviewDevice('tablet')}
                    className={`p-1.5 rounded flex items-center justify-center ${previewDevice === 'tablet' ? 'bg-[var(--color-gold)]' : 'hover:bg-white/10'}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">tablet_mac</span>
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`p-1.5 rounded flex items-center justify-center ${previewDevice === 'mobile' ? 'bg-[var(--color-gold)]' : 'hover:bg-white/10'}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">smartphone</span>
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Body / Device Container */}
            <div className="flex-1 overflow-y-auto bg-[#e5e5e5] flex items-center justify-center p-6">
              <div
                className={`bg-[var(--color-surface-ivory)] shadow-2xl rounded-3xl overflow-y-auto transition-all duration-500 ${
                  previewDevice === 'desktop'
                    ? 'w-[1200px] h-[800px] max-w-full'
                    : previewDevice === 'tablet'
                      ? 'w-[768px] h-[1024px]'
                      : 'w-[375px] h-[812px]' // mobile
                }`}
                style={{ maxHeight: '100%' }}
              >
                <div className="p-8">
                  {/* Pass the current builder config directly to the wizard! */}
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
