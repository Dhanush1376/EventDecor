import React, { useState, useEffect } from 'react';
import whatsappAutomationService from '../../services/whatsappAutomationService';

const QueueMetricsCard = ({ title, icon, color, metrics }) => (
  <div className="admin-card p-5 border-t-4" style={{ borderTopColor: color }}>
    <div className="flex justify-between items-start mb-4">
      <h3 className="text-[14px] font-semibold text-[var(--admin-text-primary)] uppercase tracking-wider flex items-center gap-2">
        <span className="material-symbols-outlined" style={{ color }}>
          {icon}
        </span>
        {title}
      </h3>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="text-[12px] text-[var(--admin-text-secondary)]">Waiting</div>
        <div
          className={`text-[24px] font-bold ${metrics.waiting > 100 ? 'text-orange-500' : 'text-[var(--admin-text-primary)]'}`}
        >
          {metrics.waiting || 0}
        </div>
      </div>
      <div>
        <div className="text-[12px] text-[var(--admin-text-secondary)]">Active (Processing)</div>
        <div className="text-[24px] font-bold text-blue-500">{metrics.active || 0}</div>
      </div>
      <div>
        <div className="text-[12px] text-[var(--admin-text-secondary)]">Delayed (Retries)</div>
        <div className="text-[20px] font-semibold text-orange-400">{metrics.delayed || 0}</div>
      </div>
      <div>
        <div className="text-[12px] text-[var(--admin-text-secondary)]">Failed (To DLQ)</div>
        <div
          className={`text-[20px] font-semibold ${metrics.failed > 0 ? 'text-red-500' : 'text-green-500'}`}
        >
          {metrics.failed || 0}
        </div>
      </div>
    </div>
  </div>
);

const QueueDashboard = () => {
  const [data, setData] = useState({
    dispatch: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
    retry: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
    media: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchMetrics = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await whatsappAutomationService.getQueueMetrics();
      if (res.data?.data) {
        setData(res.data.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to load queue metrics', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics(true);
    // Poll every 5 seconds for live queue updates
    const interval = setInterval(() => {
      fetchMetrics(false);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading)
    return (
      <div className="p-8 text-center text-[var(--admin-text-secondary)] flex flex-col items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-[32px] text-blue-500 mb-2">
          refresh
        </span>
        Loading live queues...
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-[18px] font-bold text-[var(--admin-text-primary)]">
          Live Queue Monitors
        </h2>
        <div className="text-[12px] text-[var(--admin-text-secondary)] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Live updating every 5s (Last update: {lastUpdated.toLocaleTimeString()})
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <QueueMetricsCard
          title="Dispatch Queue"
          icon="bolt"
          color="#3B82F6" // Blue
          metrics={data.dispatch}
        />
        <QueueMetricsCard
          title="Retry Queue"
          icon="replay"
          color="#F59E0B" // Amber
          metrics={data.retry}
        />
        <QueueMetricsCard
          title="Media Generation Queue"
          icon="picture_as_pdf"
          color="#8B5CF6" // Purple
          metrics={data.media}
        />
      </div>

      <div className="admin-card p-5 mt-8 bg-[var(--admin-bg-subtle)]">
        <h3 className="text-[14px] font-semibold text-[var(--admin-text-primary)] mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">info</span>
          Queue Architecture Overview
        </h3>
        <p className="text-[13px] text-[var(--admin-text-secondary)] leading-relaxed">
          The <strong>Dispatch Queue</strong> handles immediate message sends. It operates with high
          concurrency for fast delivery. If a message fails due to transient API errors, it is sent
          to the <strong>Retry Queue</strong> which processes messages using exponential backoff.
          The <strong>Media Queue</strong> is a separate worker pool dedicated to generating heavy
          attachments (like PDFs and QR codes) before dispatching the final message.
        </p>
      </div>
    </div>
  );
};

export default QueueDashboard;
