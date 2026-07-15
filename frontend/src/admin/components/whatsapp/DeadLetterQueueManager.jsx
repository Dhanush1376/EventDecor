import React, { useState, useEffect } from 'react';
import whatsappAutomationService from '../../services/whatsappAutomationService';
import { toast } from 'react-hot-toast';

const DeadLetterQueueManager = () => {
  const [dlqMessages, setDlqMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // In a real implementation, this would call a specific DLQ endpoint.
  // For now, we simulate fetching failed logs that exhausted retries.
  const fetchDLQ = async () => {
    try {
      setLoading(true);
      const res = await whatsappAutomationService.getLogs({ status: 'failed', limit: 20 });
      if (res.data?.data) {
        // Filter those that have exhausted retries (simulated DLQ view)
        setDlqMessages(
          res.data.data.filter(
            (log) => log.retryCount >= 4 || log.failureReason === 'Max retries exhausted',
          ),
        );
      }
    } catch (err) {
      toast.error('Failed to load DLQ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDLQ();
  }, []);

  const handleRetry = async (logId) => {
    try {
      await whatsappAutomationService.retryMessage(logId);
      toast.success('Message queued for manual retry');
      fetchDLQ();
    } catch (err) {
      toast.error('Failed to retry message');
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center text-[var(--admin-text-secondary)]">
        Loading Dead Letter Queue...
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-[18px] font-bold text-red-600 flex items-center gap-2">
            <span className="material-symbols-outlined">warning</span>
            Dead Letter Queue (DLQ)
          </h2>
          <p className="text-[13px] text-[var(--admin-text-secondary)]">
            Messages that failed all automatic retries.
          </p>
        </div>
        <button className="admin-btn bg-red-600 hover:bg-red-700 text-white border-transparent">
          <span className="material-symbols-outlined text-[18px]">delete_sweep</span> Purge All
        </button>
      </div>

      <div className="admin-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--admin-bg-subtle)] border-b border-[var(--admin-border-subtle)] text-[12px] uppercase text-[var(--admin-text-secondary)] tracking-wider">
              <th className="p-4 font-semibold">Failed At</th>
              <th className="p-4 font-semibold">Recipient</th>
              <th className="p-4 font-semibold">Automation</th>
              <th className="p-4 font-semibold">Reason</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-[14px]">
            {dlqMessages.map((msg) => (
              <tr
                key={msg._id}
                className="border-b border-[var(--admin-border-subtle)] hover:bg-gray-50/50"
              >
                <td className="p-4 text-[var(--admin-text-secondary)]">
                  {new Date(msg.updatedAt).toLocaleString()}
                </td>
                <td className="p-4 font-medium text-[var(--admin-text-primary)]">
                  {msg.recipientPhone}{' '}
                  <span className="text-[12px] font-normal text-gray-500">
                    ({msg.recipientName})
                  </span>
                </td>
                <td className="p-4 text-[var(--admin-text-secondary)]">{msg.automationName}</td>
                <td className="p-4 text-red-600 text-[13px]">
                  {msg.failureReason || 'Unknown error'}
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => handleRetry(msg._id)}
                    className="admin-btn admin-btn-primary py-1 px-3 text-[12px]"
                  >
                    <span className="material-symbols-outlined text-[14px] mr-1">replay</span> Retry
                  </button>
                </td>
              </tr>
            ))}
            {dlqMessages.length === 0 && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-[var(--admin-text-tertiary)]">
                  <div className="flex flex-col items-center justify-center">
                    <span className="material-symbols-outlined text-[48px] text-green-300 mb-2">
                      check_circle
                    </span>
                    <p>DLQ is empty. All messages delivered successfully.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DeadLetterQueueManager;
