import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import whatsappAutomationService from '../../services/whatsappAutomationService';
import toast from 'react-hot-toast';

const DryRunModal = ({ isOpen, onClose, automation }) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [payloadStr, setPayloadStr] = useState('{\n  "orderId": "sample_123"\n}');

  const handleRun = async () => {
    try {
      setLoading(true);
      let payload = {};
      try {
        payload = JSON.parse(payloadStr);
      } catch (err) {
        toast.error('Invalid JSON payload');
        setLoading(false);
        return;
      }

      const res = await whatsappAutomationService.dryRun(automation.automationKey, payload);
      if (res.data?.data) {
        setResults(res.data.data);
        toast.success('Dry run successful');
      }
    } catch (err) {
      toast.error('Dry run failed. Check backend logs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-[5%] left-1/2 -translate-x-1/2 w-full max-w-2xl max-h-[90vh] bg-[var(--admin-bg)] rounded-xl shadow-2xl z-50 flex flex-col border border-[var(--admin-border)] overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-[var(--admin-border-subtle)] bg-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-[18px] font-bold text-[var(--admin-text-primary)]">
                  Dry Run: {automation?.displayName}
                </h2>
                <p className="text-[12px] text-[var(--admin-text-secondary)]">
                  Simulate routing and template rendering without sending real messages.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-[var(--admin-bg-subtle)] space-y-6">
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase mb-2">
                  Simulation Payload (JSON)
                </label>
                <textarea
                  className="admin-input w-full font-mono text-[13px] min-h-[100px]"
                  value={payloadStr}
                  onChange={(e) => setPayloadStr(e.target.value)}
                />
              </div>

              <button
                onClick={handleRun}
                disabled={loading}
                className="admin-btn admin-btn-primary w-full flex justify-center py-2.5"
              >
                {loading ? 'Simulating...' : 'Run Simulation'}
              </button>

              {results && (
                <div className="space-y-4">
                  <h3 className="font-bold text-[14px] border-b pb-2">Simulation Results</h3>
                  {results.length === 0 ? (
                    <p className="text-[13px] text-gray-500">No active recipients resolved.</p>
                  ) : (
                    results.map((res, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-4 rounded-lg border border-[var(--admin-border-subtle)] shadow-sm"
                      >
                        <div className="flex justify-between items-start mb-3 border-b pb-2">
                          <div>
                            <p className="text-[14px] font-semibold">{res.recipient}</p>
                            <p className="text-[12px] text-gray-500">
                              Template: {res.templateName}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-[11px] font-bold rounded-full mb-1">
                              Route: {res.provider}
                            </span>
                            <p className="text-[12px] font-semibold text-green-600">
                              Cost: {res.costInfo?.amount} {res.costInfo?.currency}
                            </p>
                          </div>
                        </div>

                        {res.badges?.length > 0 && (
                          <div className="mb-3 flex gap-2 flex-wrap">
                            {res.badges.map((b, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[11px] rounded-full border border-blue-100"
                              >
                                {b}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="bg-[#EFEAE2] p-3 rounded-md text-[13px] whitespace-pre-wrap font-sans text-gray-800 border border-[#D9D3CA]">
                          {res.renderedMessage}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DryRunModal;
