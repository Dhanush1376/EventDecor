import React, { useState, useEffect } from 'react';
import whatsappAutomationService from '../../services/whatsappAutomationService';
import { toast } from 'react-hot-toast';

const WhatsAppDashboard = () => {
  const [data, setData] = useState({
    messagesToday: 0,
    messagesThisMonth: 0,
    deliveryRate: 100,
    failedMessages: 0,
    pendingQueue: 0,
    avgLatencyMs: 0,
    providerStatus: 'healthy',
    apiProvider: 'meta_cloud',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await whatsappAutomationService.getDashboard();
        if (res.data?.data) {
          setData((prev) => ({ ...prev, ...res.data.data }));
        }
      } catch (err) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading)
    return (
      <div className="p-8 text-center text-[var(--admin-text-secondary)]">Loading dashboard...</div>
    );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="admin-card p-5">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[13px] font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider">
              Status
            </h3>
            <span className="material-symbols-outlined text-green-500 text-[20px]">
              check_circle
            </span>
          </div>
          <div className="text-[24px] font-bold text-[var(--admin-text-primary)] mb-1">
            Connected
          </div>
          <div className="text-[13px] text-[var(--admin-text-tertiary)] flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>{' '}
            {data.apiProvider.replace('_', ' ')}
          </div>
        </div>

        <div className="admin-card p-5">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[13px] font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider">
              Messages Today
            </h3>
            <span className="material-symbols-outlined text-blue-500 text-[20px]">send</span>
          </div>
          <div className="text-[28px] font-bold text-[var(--admin-text-primary)] mb-1">
            {data.messagesToday}
          </div>
          <div className="text-[13px] text-[var(--admin-text-tertiary)]">
            Total this month: {data.messagesThisMonth}
          </div>
        </div>

        <div className="admin-card p-5">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[13px] font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider">
              Delivery Rate
            </h3>
            <span className="material-symbols-outlined text-purple-500 text-[20px]">
              mark_email_read
            </span>
          </div>
          <div className="text-[28px] font-bold text-[var(--admin-text-primary)] mb-1">
            {data.deliveryRate}%
          </div>
          <div className="text-[13px] text-red-500">{data.failedMessages} failed</div>
        </div>

        <div className="admin-card p-5">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-[13px] font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider">
              Latency
            </h3>
            <span className="material-symbols-outlined text-orange-500 text-[20px]">speed</span>
          </div>
          <div className="text-[28px] font-bold text-[var(--admin-text-primary)] mb-1">
            {data.avgLatencyMs}ms
          </div>
          <div className="text-[13px] text-[var(--admin-text-tertiary)]">
            Pending Queue: {data.pendingQueue}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppDashboard;
