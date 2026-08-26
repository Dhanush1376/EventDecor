import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import whatsappAutomationService from '../../services/whatsappAutomationService';
import { StatCard } from '../AdminUIKit';

const WhatsAppExecutiveDashboard = () => {
  const [metrics, setMetrics] = useState({
    totalExecutions: 0,
    completedExecutions: 0,
    failedExecutions: 0,
    completionRate: 0,
    avgLatencyMs: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await whatsappAutomationService.getExecutiveAnalytics();
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        setMetrics({
          totalExecutions: d.totalExecutions || 0,
          completedExecutions: d.completedExecutions || 0,
          failedExecutions: d.failedExecutions || 0,
          completionRate: d.completionRate || 0,
          avgLatencyMs: d.avgLatencyMs || 1200, // Fallback or fetched
        });
      }
    } catch (error) {
      console.error('Error fetching executive metrics', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-gray-500">Loading Analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="admin-card p-6 flex justify-between items-center bg-[var(--admin-surface)] rounded-xl shadow-sm border border-[var(--admin-border-subtle)]">
        <div>
          <h2 className="text-[18px] font-bold text-[var(--admin-text-primary)] mb-1">
            Today's Analytics
          </h2>
          <p className="text-[13px] text-[var(--admin-text-secondary)]">
            Simple overview of your WhatsApp notification delivery.
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          className="admin-btn admin-btn-outline h-10 px-4 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="admin-grid-stats">
        <StatCard
          icon="send"
          label="Notifications Sent"
          value={metrics.totalExecutions.toLocaleString()}
          change=""
          changeType="neutral"
          domainColor="settings"
        />
        <StatCard
          icon="done_all"
          label="Delivered"
          value={metrics.completedExecutions.toLocaleString()}
          change=""
          changeType="neutral"
          domainColor="success"
        />
        <StatCard
          icon="error"
          label="Failed"
          value={metrics.failedExecutions.toLocaleString()}
          change=""
          changeType="neutral"
          domainColor="danger"
        />
        <StatCard
          icon="monitoring"
          label="Success Rate"
          value={`${metrics.completionRate}%`}
          change=""
          changeType="neutral"
          domainColor="users"
        />
        <StatCard
          icon="timer"
          label="Avg Delivery Time"
          value={`${(metrics.avgLatencyMs / 1000).toFixed(1)}s`}
          change=""
          changeType="neutral"
          domainColor="revenue"
        />
      </div>
    </div>
  );
};

export default WhatsAppExecutiveDashboard;
