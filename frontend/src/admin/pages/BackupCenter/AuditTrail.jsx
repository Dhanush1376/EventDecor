import React, { useState, useEffect } from 'react';
import Download from 'lucide-react/dist/esm/icons/download';
import Search from 'lucide-react/dist/esm/icons/search';
import Shield from 'lucide-react/dist/esm/icons/shield';
import backupService from '../../services/backupService';
import toast from 'react-hot-toast';

const AuditTrail = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await backupService.fetchAuditTrail({ limit: 100 });
      setLogs(res.logs || []);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await backupService.downloadAuditTrail();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'backup-audit-log.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      toast.error('Failed to export logs');
    }
  };

  const filteredLogs = logs.filter(
    (log) =>
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.backupId && log.backupId.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  return (
    <div className="glass-card">
      <div className="flex justify-between items-center mb-6">
        <div className="card-title m-0">
          <Shield size={18} /> Immutable Audit Trail
        </div>
        <button onClick={handleExport} className="btn-outline flex items-center gap-2 text-sm">
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
        <input
          type="text"
          placeholder="Search by action or backup ID..."
          className="w-full bg-slate-800 border border-slate-700 rounded py-2 pl-10 pr-4 text-white focus:border-emerald-500 outline-none text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="backup-table-container max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-400">Loading audit trail...</div>
        ) : (
          <table className="backup-table">
            <thead className="sticky top-0 bg-slate-900">
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Performed By</th>
                <th>Backup ID</th>
                <th>Details</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log._id}>
                  <td className="whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                  <td>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        log.action.includes('failed') || log.action.includes('anomaly')
                          ? 'bg-red-900/30 text-red-400 border border-red-500/30'
                          : log.action.includes('restore')
                            ? 'bg-amber-900/30 text-amber-400 border border-amber-500/30'
                            : log.action.includes('transition')
                              ? 'text-gray-400'
                              : 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td>{log.performedBy}</td>
                  <td className="code-font">
                    {log.backupId ? log.backupId.split('-')[0] + '...' : '-'}
                  </td>
                  <td className="text-xs">
                    {log.stateTransition ? (
                      <span className="text-gray-400">
                        {log.stateTransition.from} &rarr; {log.stateTransition.to}
                      </span>
                    ) : (
                      <span
                        className="text-gray-400 truncate max-w-[200px] block"
                        title={JSON.stringify(log.details)}
                      >
                        {JSON.stringify(log.details)}
                      </span>
                    )}
                  </td>
                  <td className="text-xs text-gray-500">{log.ipAddress || 'internal'}</td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center">
                    No logs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AuditTrail;
