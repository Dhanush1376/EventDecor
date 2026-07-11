import React, { useState, useEffect } from 'react';
import whatsappAutomationService from '../../services/whatsappAutomationService';
import { toast } from 'react-hot-toast';

const MessageLogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = { limit: 50 };
      if (statusFilter) params.status = statusFilter;
      // Search would need backend support, but we can do basic client filter or pass it
      const res = await whatsappAutomationService.getLogs(params);
      if (res.data?.data) {
        setLogs(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [statusFilter]);

  const handleExport = () => {
    if (logs.length === 0) return toast.error('No data to export');

    const headers = ['Date', 'Phone', 'Name', 'Automation', 'Status', 'Message ID'];
    const csvContent = [
      headers.join(','),
      ...logs.map((l) =>
        [
          `"${new Date(l.createdAt).toISOString()}"`,
          `"${l.recipientPhone}"`,
          `"${l.recipientName}"`,
          `"${l.automationName}"`,
          `"${l.deliveryStatus}"`,
          `"${l.apiMessageId || ''}"`,
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `whatsapp_logs_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter(
    (log) =>
      !searchQuery ||
      log.recipientPhone.includes(searchQuery) ||
      (log.apiMessageId && log.apiMessageId.includes(searchQuery)),
  );

  const getStatusBadge = (status) => {
    const styles = {
      sent: 'bg-blue-100 text-blue-700',
      delivered: 'bg-green-100 text-green-700',
      read: 'bg-green-100 text-green-800 font-bold',
      failed: 'bg-red-100 text-red-700',
      queued: 'bg-gray-100 text-gray-600',
      dispatched: 'bg-purple-100 text-purple-700',
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-[12px] font-medium capitalize ${styles[status] || styles.queued}`}
      >
        {status}
      </span>
    );
  };

  if (loading && logs.length === 0)
    return (
      <div className="p-8 text-center text-[var(--admin-text-secondary)]">Loading logs...</div>
    );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search phone or ID..."
            className="admin-input max-w-[200px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="admin-input max-w-[150px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <button className="admin-btn-secondary" onClick={handleExport}>
          <span className="material-symbols-outlined text-[18px]">download</span> Export
        </button>
      </div>

      <div className="admin-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--admin-bg-subtle)] border-b border-[var(--admin-border-subtle)] text-[12px] uppercase text-[var(--admin-text-secondary)] tracking-wider">
              <th className="p-4 font-semibold">Date / Time</th>
              <th className="p-4 font-semibold">Recipient</th>
              <th className="p-4 font-semibold">Automation</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-[14px]">
            {filteredLogs.map((log) => (
              <tr
                key={log._id}
                className="border-b border-[var(--admin-border-subtle)] hover:bg-gray-50/50"
              >
                <td className="p-4 text-[var(--admin-text-secondary)]">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="p-4 font-medium text-[var(--admin-text-primary)]">
                  {log.recipientPhone}{' '}
                  <span className="text-[12px] font-normal text-gray-500">
                    ({log.recipientName})
                  </span>
                </td>
                <td className="p-4 text-[var(--admin-text-secondary)]">{log.automationName}</td>
                <td className="p-4">{getStatusBadge(log.deliveryStatus)}</td>
                <td className="p-4 text-right">
                  <button className="text-[var(--admin-accent)] hover:underline text-[13px] font-medium">
                    View
                  </button>
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-[var(--admin-text-tertiary)]">
                  No logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MessageLogViewer;
