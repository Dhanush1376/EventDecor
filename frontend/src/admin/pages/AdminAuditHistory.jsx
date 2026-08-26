import React, { useState, useMemo } from 'react';
import { m as motion } from 'framer-motion';
import { useAdmin } from '../context/AdminContext';
import { PageHeader, stagger, StatCard } from '../components/AdminUIKit';

export function AdminAuditHistory({ hideHeader }) {
  const { auditLogs, clearAuditLogs } = useAdmin();

  const [searchQuery, setSearchQuery] = useState('');
  const [actorFilter, setActorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 100;

  React.useEffect(() => {
    setPage(1);
  }, [searchQuery, actorFilter, statusFilter]);

  const downloadExcel = () => {
    const headers = ['Timestamp,Actor,Action,Status,Details\n'];
    const csvContent = filteredLogs
      .map(
        (log) =>
          `"${new Date(log.timestamp).toLocaleString().replace(/"/g, '""')}","${log.actor} (${log.actorEmail})","${formatHumanAction(log.action)}","${log.status}","${formatHumanDetails(log.details, log.action).replace(/"/g, '""')}"`,
      )
      .join('\n');
    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  const formatHumanAction = (action) => {
    if (!action) return 'System Event';
    if (!action.includes('/api/')) return action;

    let path = action.split('/api/v1/')[1] || action.split('/api/')[1] || action;
    // Replace IDs (MongoDB object IDs are 24 hex chars, but let's just remove anything that looks like an ID/number)
    path = path.replace(/\/[a-f0-9]{24}/g, '');
    path = path.replace(/\/\d+/g, '');

    path = path.replace(/[-_]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
    path = path.replace(/\//g, ' • ');

    return path
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const formatHumanDetails = (details, action) => {
    if (!details) return 'No details provided';
    if (!details.startsWith('HTTP')) return details;

    const methodMatch = details.match(/HTTP (POST|PUT|DELETE|GET|PATCH)/);
    const method = methodMatch ? methodMatch[1] : '';

    let actionVerb = 'Accessed';
    if (method === 'POST') actionVerb = 'Created';
    if (method === 'PUT' || method === 'PATCH') actionVerb = 'Updated';
    if (method === 'DELETE') actionVerb = 'Deleted';

    const target = formatHumanAction(action);
    const statusMatch = details.match(/status (\d+)/);
    const status = statusMatch ? statusMatch[1] : '';

    if (status && parseInt(status) >= 400) {
      return `Failed to ${actionVerb.toLowerCase()} ${target} (Error ${status})`;
    }

    return `${actionVerb} ${target} successfully`;
  };

  const paginatedLogs = filteredLogs.slice((page - 1) * limit, page * limit);
  const totalPages = Math.ceil(filteredLogs.length / limit);

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
        <div className="p-4 sm:p-5 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] flex flex-col sm:flex-row items-stretch justify-between gap-4 rounded-t-xl">
          <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64 shrink-0 bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border)] flex items-center px-3">
              <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search audit trail logs..."
                className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-10"
              />
            </div>

            <div className="flex items-stretch gap-2 w-full sm:w-auto overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="relative flex-1 sm:flex-none items-stretch">
                <select
                  value={actorFilter}
                  onChange={(e) => setActorFilter(e.target.value)}
                  className="bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border)] text-[12px] font-semibold text-[var(--admin-text-primary)] focus:outline-none cursor-pointer transition-all pl-3 pr-8 h-10 appearance-none w-full sm:min-w-[130px]"
                >
                  <option value="all">All Actors</option>
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                  <option value="editor">Editor</option>
                  <option value="customer">Customer</option>
                  <option value="user">User</option>
                  <option value="system">System</option>
                </select>
                <span
                  className="material-symbols-outlined absolute right-2 text-[16px] text-[var(--admin-text-tertiary)] pointer-events-none"
                  style={{ top: '50%', transform: 'translateY(-50%)' }}
                >
                  expand_more
                </span>
              </div>

              <div className="relative flex-1 sm:flex-none items-stretch">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[var(--admin-surface-muted)] rounded border border-[var(--admin-border)] text-[12px] font-semibold text-[var(--admin-text-primary)] focus:outline-none cursor-pointer transition-all pl-3 pr-8 h-10 appearance-none w-full sm:min-w-[130px]"
                >
                  <option value="all">All Statuses</option>
                  <option value="success">Success</option>
                  <option value="failure">Failure / Error</option>
                </select>
                <span
                  className="material-symbols-outlined absolute right-2 text-[16px] text-[var(--admin-text-tertiary)] pointer-events-none"
                  style={{ top: '50%', transform: 'translateY(-50%)' }}
                >
                  expand_more
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-stretch gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={downloadExcel}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-black px-4 rounded font-bold uppercase tracking-wider text-[11px] border border-black/10 shadow-sm hover:bg-black/5 transition-all h-10"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Export Excel
            </button>
            <button
              onClick={clearAuditLogs}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[var(--admin-error-light)] text-[var(--admin-error)] px-4 rounded font-bold uppercase tracking-wider text-[11px] hover:bg-[var(--admin-error)] hover:text-white transition-all h-10"
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
                <th className="w-[250px]">Action</th>
                <th>Details</th>
                <th className="pr-6 w-[100px]">Status</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[12px]">
              {paginatedLogs.map((log) => (
                <tr
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
                  <td className="font-bold text-[var(--admin-accent)] py-2 pr-4">
                    {formatHumanAction(log.action)}
                  </td>
                  <td className="text-[var(--admin-text-secondary)] py-2">
                    <div className="line-clamp-2" title={log.details}>
                      {formatHumanDetails(log.details, log.action)}
                    </div>
                  </td>
                  <td className="pr-6 py-2">
                    <span
                      className={`admin-badge text-[10px] font-bold h-6 px-2 uppercase tracking-wider ${log.status === 'Failure' ? 'admin-badge-danger' : 'admin-badge-success'}`}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
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

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[var(--admin-border-subtle)] flex items-center justify-between bg-white text-[13px] rounded-b-xl shrink-0">
            <span className="text-[var(--admin-text-secondary)] font-medium">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, filteredLogs.length)} of{' '}
              {filteredLogs.length} logs
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="admin-btn admin-btn-outline h-8 px-3 text-[12px] disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="admin-btn admin-btn-outline h-8 px-3 text-[12px] disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
