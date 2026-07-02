import React, { useState, useEffect, useCallback } from 'react';
import { Eye, Download, ShieldCheck, Lock, Unlock, CheckCircle } from 'lucide-react';
import backupService from '../../services/backupService';
import './BackupCenter.css';

const BackupHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await backupService.fetchBackupHistory({
        page: pagination.page,
        limit: pagination.limit,
      });
      setHistory(res.records || []);
      setPagination((prev) => ({ ...prev, total: res.pagination?.total || 0 }));
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const getStatusBadgeClass = (status) => {
    if (status === 'completed') return 'status-completed';
    if (status === 'failed' || status === 'rolled_back') return 'status-failed';
    if (status === 'verifying' || status === 'uploading') return 'status-warning';
    return 'status-running'; // preparing, dumping, encrypting, etc.
  };

  const formatSize = (bytes) => {
    if (!bytes) return '-';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleVerify = async (id) => {
    try {
      await backupService.verifyBackup(id);
      alert('Verification triggered successfully.');
      fetchHistory();
    } catch (err) {
      alert('Verification failed');
    }
  };

  const handleLock = async (id) => {
    if (
      window.confirm('Mark this backup as immutable? It cannot be deleted until retention expires.')
    ) {
      try {
        await backupService.lockBackup(id);
        alert('Backup locked.');
        fetchHistory();
      } catch (err) {
        alert('Locking failed');
      }
    }
  };

  // State Machine Visualization Component
  const StateMachineIndicator = ({ status, timings }) => {
    const phases = [
      'preparing',
      'dumping',
      'compressing',
      'encrypting',
      'signing',
      'uploading',
      'verifying',
      'completed',
    ];

    // Determine active phase index
    let currentIndex = phases.indexOf(status);
    if (status === 'failed' || status === 'rolled_back') {
      // Find the last phase that actually started
      const startedPhases = Object.keys(timings || {});
      const lastStarted = startedPhases[startedPhases.length - 1];
      currentIndex = phases.indexOf(lastStarted) !== -1 ? phases.indexOf(lastStarted) : 0;
    }

    return (
      <div className="state-timeline">
        <div className="state-line"></div>
        <div
          className="state-progress"
          style={{ width: `${(currentIndex / (phases.length - 1)) * 100}%` }}
        ></div>

        {phases.map((phase, idx) => {
          let nodeClass = '';
          if (idx < currentIndex) nodeClass = 'completed';
          else if (idx === currentIndex && (status === 'failed' || status === 'rolled_back'))
            nodeClass = 'failed';
          else if (idx === currentIndex) nodeClass = 'active';

          const timing = timings?.[phase];

          return (
            <div
              key={phase}
              className={`state-node ${nodeClass}`}
              title={`${phase}${timing?.durationMs ? ` (${timing.durationMs}ms)` : ''}`}
            >
              {nodeClass === 'completed' && <CheckCircle size={12} color="white" />}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="glass-card">
      <div className="card-title">Backup Operations History</div>

      <div className="backup-table-container">
        {loading ? (
          <div className="p-4 text-center text-gray-400">Loading history...</div>
        ) : (
          <table className="backup-table">
            <thead>
              <tr>
                <th>Backup ID</th>
                <th>Type</th>
                <th>Status</th>
                <th>Pipeline Progress</th>
                <th>Size</th>
                <th>Score</th>
                <th>Immutable</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map((record) => (
                <tr key={record.backupId}>
                  <td className="code-font">{record.backupId.split('-')[0]}</td>
                  <td>
                    <span className="capitalize">{record.type}</span>
                    <div className="text-xs text-gray-500">{record.schedule}</div>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(record.status)}`}>
                      {record.status}
                    </span>
                  </td>
                  <td style={{ minWidth: '200px' }}>
                    <StateMachineIndicator
                      status={record.status}
                      timings={record.metrics?.phaseTimings}
                    />
                  </td>
                  <td className="code-font">
                    {formatSize(record.metrics?.sizeCompressed || record.metrics?.sizeRaw)}
                  </td>
                  <td>
                    <div
                      className={`font-bold ${record.integrityScore >= 90 ? 'text-emerald-400' : record.integrityScore >= 70 ? 'text-amber-400' : 'text-red-400'}`}
                    >
                      {record.integrityScore || '-'}/100
                    </div>
                  </td>
                  <td>
                    {record.immutable ? (
                      <Lock size={16} className="text-emerald-500" />
                    ) : (
                      <Unlock size={16} className="text-gray-600" />
                    )}
                  </td>
                  <td>{new Date(record.createdAt).toLocaleString()}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="text-gray-400 hover:text-white" title="View Details">
                        <Eye size={16} />
                      </button>
                      <button className="text-gray-400 hover:text-blue-400" title="Download">
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => handleVerify(record.backupId)}
                        className="text-gray-400 hover:text-emerald-400"
                        title="Verify Signatures"
                      >
                        <ShieldCheck size={16} />
                      </button>
                      {!record.immutable && (
                        <button
                          onClick={() => handleLock(record.backupId)}
                          className="text-gray-400 hover:text-amber-400"
                          title="Lock Backup"
                        >
                          <Lock size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan="9" className="text-center">
                    No backups found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Basic Pagination Controls */}
      <div className="flex justify-between items-center mt-4 text-sm text-gray-400">
        <div>
          Showing {history.length} of {pagination.total} records
        </div>
        <div className="flex gap-2">
          <button
            disabled={pagination.page === 1}
            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            className="btn-outline px-3 py-1 text-xs"
          >
            Previous
          </button>
          <button
            disabled={history.length < pagination.limit}
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            className="btn-outline px-3 py-1 text-xs"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackupHistory;
