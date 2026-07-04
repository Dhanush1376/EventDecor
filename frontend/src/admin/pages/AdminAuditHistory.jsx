import React, { useState, useMemo } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useAdmin } from '../context/AdminContext';
import { PageHeader, stagger, StatCard } from '../components/AdminUIKit';

export function AdminAuditHistory({ hideHeader }) {
  const { auditLogs, clearAuditLogs, handleBackupDownload } = useAdmin();

  const [searchQuery, setSearchQuery] = useState('');
  const [actorFilter, setActorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchesSearch =
        log.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesActor =
        actorFilter === 'all' || log.actor?.toLowerCase() === actorFilter.toLowerCase();
      const matchesStatus =
        statusFilter === 'all' || log.status?.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesActor && matchesStatus;
    });
  }, [auditLogs, searchQuery, actorFilter, statusFilter]);

  const errorCount = auditLogs.filter((l) => l.status === 'Failure').length;
  const adminCount = auditLogs.filter((l) =>
    ['OWNER', 'MANAGER', 'ADMIN', 'EDITOR'].includes(l.actor),
  ).length;
  const customerCount = auditLogs.filter((l) => ['CUSTOMER', 'USER'].includes(l.actor)).length;

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      {!hideHeader && (
        <PageHeader
          title="Audit History"
          subtitle="A comprehensive immutable log of all actions performed in the admin system."
          icon="history"
        />
      )}

      {/* Analytics Row */}
      <div className="admin-grid-stats">
        <StatCard
          icon="history"
          label="Total Recorded Events"
          value={auditLogs.length}
          change=""
          changeType="neutral"
          domainColor="settings"
        />
        <StatCard
          icon="warning"
          label="Security Flags / Errors"
          value={errorCount}
          change={errorCount > 0 ? 'Needs attention' : 'All clear'}
          changeType={errorCount > 0 ? 'down' : 'neutral'}
          domainColor="danger"
        />
        <StatCard
          icon="admin_panel_settings"
          label="Admin Actions"
          value={adminCount}
          change=""
          changeType="neutral"
          domainColor="users"
        />
        <StatCard
          icon="group"
          label="Customer Actions"
          value={customerCount}
          change=""
          changeType="neutral"
          domainColor="revenue"
        />
      </div>

      <div className="admin-card p-0 flex flex-col h-[600px] border border-[var(--admin-border-strong)]">
        {/* Toolbar */}
        <div className="p-4 sm:p-6 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-surface-muted)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-[300px]">
              <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] absolute left-3 top-2.5">
                search
              </span>
              <input
                type="text"
                placeholder="Search audit trail logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-input pl-10 h-10 w-full"
              />
            </div>
            <select
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              className="admin-input h-10 py-0 w-full sm:w-auto min-w-[150px]"
            >
              <option value="all">All Actors</option>
              <option value="owner">Owner</option>
              <option value="manager">Manager</option>
              <option value="editor">Editor</option>
              <option value="customer">Customer</option>
              <option value="user">User</option>
              <option value="system">System</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="admin-input h-10 py-0 w-full sm:w-auto min-w-[150px]"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="failure">Failure / Error</option>
            </select>
          </div>
          <div className="flex gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={handleBackupDownload}
              className="admin-btn admin-btn-outline h-10 px-4 w-full sm:w-auto"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Export JSON
            </button>
            <button
              onClick={clearAuditLogs}
              className="admin-btn h-10 px-4 bg-[var(--admin-error-light)] text-[var(--admin-error)] border-none hover:bg-[var(--admin-error)] hover:text-white w-full sm:w-auto"
            >
              <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
              Clear
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="admin-table w-full min-w-[800px]">
            <thead className="sticky top-0 bg-[var(--admin-surface-muted)] z-10 shadow-sm">
              <tr>
                <th className="pl-6 w-[180px]">Timestamp</th>
                <th className="w-[150px]">Actor</th>
                <th className="w-[200px]">Event Type</th>
                <th>Detailed Payload</th>
                <th className="pr-6 w-[100px]">Status</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[12px]">
              <AnimatePresence>
                {filteredLogs.map((log) => (
                  <motion.tr
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={log.id}
                    className="hover:bg-[var(--admin-surface-hover)] transition-colors border-b border-[var(--admin-border-subtle)] last:border-0"
                  >
                    <td className="pl-6 text-[var(--admin-text-secondary)] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td>
                      <div className="flex flex-col">
                        <span className="inline-flex items-center gap-1.5 font-bold text-[var(--admin-text-primary)]">
                          <span className="material-symbols-outlined text-[14px] text-[var(--admin-text-tertiary)]">
                            person
                          </span>
                          {log.actor}
                        </span>
                        {log.actorEmail && log.actorEmail !== 'System' && (
                          <span
                            className="text-[10px] text-[var(--admin-text-tertiary)] mt-0.5 ml-5 truncate max-w-[130px]"
                            title={log.actorEmail}
                          >
                            {log.actorEmail}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="font-bold text-[var(--admin-accent)]">{log.action}</td>
                    <td className="text-[var(--admin-text-secondary)] py-3">
                      <div className="line-clamp-2" title={log.details}>
                        {log.details}
                      </div>
                    </td>
                    <td className="pr-6">
                      <span
                        className={`admin-badge text-[10px] font-bold h-6 px-2 uppercase tracking-wider ${log.status === 'Failure' ? 'admin-badge-danger' : 'admin-badge-success'}`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {filteredLogs.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-20 text-center text-[var(--admin-text-tertiary)] font-sans text-[14px]"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <span className="material-symbols-outlined text-[40px] opacity-20 mb-3">
                        history
                      </span>
                      No matching audit logs found.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
