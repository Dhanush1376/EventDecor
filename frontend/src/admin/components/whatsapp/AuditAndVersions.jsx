import React, { useState, useEffect } from 'react';
import whatsappAutomationService from '../../services/whatsappAutomationService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const AuditAndVersions = () => {
  const [snapshots, setSnapshots] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null); // For diff modal

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [snapRes, auditRes] = await Promise.all([
        whatsappAutomationService.getSnapshots(),
        whatsappAutomationService.getAuditLogs(),
      ]);
      setSnapshots(snapRes.data?.data || []);
      setAuditLogs(auditRes.data?.data || []);
    } catch (err) {
      toast.error('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSnapshot = async () => {
    try {
      setCreating(true);
      const name = prompt('Enter a name for this Configuration Snapshot:');
      if (!name) return;

      const desc = prompt('Optional: Enter a description:');

      await whatsappAutomationService.createSnapshot({ name, description: desc || '' });
      toast.success('Configuration snapshot created successfully!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create snapshot');
    } finally {
      setCreating(false);
    }
  };

  const handleRollback = async (snapshot) => {
    if (
      !window.confirm(
        `CRITICAL WARNING: Are you sure you want to rollback the entire system configuration to "${snapshot.name}"? This action will overwrite all current automations, templates, routing rules, and policies.`,
      )
    ) {
      return;
    }

    try {
      setRollingBack(true);
      await whatsappAutomationService.rollbackSnapshot(snapshot.snapshotId);
      toast.success(`Successfully rolled back to ${snapshot.name}`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to rollback');
    } finally {
      setRollingBack(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Snapshots Section */}
      <div className="bg-white rounded-xl shadow-sm border border-[var(--admin-border-subtle)] p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-[18px] font-bold text-gray-800">Configuration Snapshots</h3>
            <p className="text-[12px] text-gray-500">
              Backup and restore the entire state of the WhatsApp engine.
            </p>
          </div>
          <button
            onClick={handleCreateSnapshot}
            disabled={creating}
            className="admin-btn admin-btn-primary flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">camera</span>
            {creating ? 'Taking Snapshot...' : 'Create Snapshot'}
          </button>
        </div>

        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[12px] text-gray-500 uppercase">
                  <th className="p-3 font-semibold">Snapshot ID</th>
                  <th className="p-3 font-semibold">Name</th>
                  <th className="p-3 font-semibold">Created By</th>
                  <th className="p-3 font-semibold">Date</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-[13px] text-gray-700">
                {snapshots.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-4 text-center text-gray-400">
                      No snapshots found.
                    </td>
                  </tr>
                ) : (
                  snapshots.map((s) => (
                    <tr key={s.snapshotId} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="p-3 font-mono text-[11px] text-gray-500">{s.snapshotId}</td>
                      <td className="p-3">
                        <div className="font-semibold text-gray-800">{s.name}</div>
                        <div className="text-[11px] text-gray-500">{s.description}</div>
                      </td>
                      <td className="p-3">{s.createdBy?.firstName || 'System'}</td>
                      <td className="p-3 whitespace-nowrap">
                        {format(new Date(s.createdAt), 'MMM d, yyyy HH:mm:ss')}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleRollback(s)}
                          disabled={rollingBack}
                          className="admin-btn admin-btn-secondary !text-red-600 !border-red-200 hover:!bg-red-50 text-[12px] py-1 px-3"
                        >
                          Restore
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Log Section */}
      <div className="bg-white rounded-xl shadow-sm border border-[var(--admin-border-subtle)] p-6">
        <h3 className="text-[18px] font-bold text-gray-800 mb-1">System Audit Trail</h3>
        <p className="text-[12px] text-gray-500 mb-6">
          Immutable, append-only ledger of all configuration changes.
        </p>

        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto h-[500px] custom-scrollbar relative border border-gray-100 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 text-[12px] text-gray-500 uppercase z-10">
                <tr>
                  <th className="p-3 font-semibold">Timestamp</th>
                  <th className="p-3 font-semibold">Action</th>
                  <th className="p-3 font-semibold">Entity</th>
                  <th className="p-3 font-semibold">Actor</th>
                  <th className="p-3 font-semibold">Description</th>
                  <th className="p-3 font-semibold text-center">Diff</th>
                </tr>
              </thead>
              <tbody className="text-[13px] text-gray-700">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-4 text-center text-gray-400">
                      No audit logs found.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log._id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="p-3 whitespace-nowrap text-gray-500">
                        {format(new Date(log.performedAt), 'MMM d, HH:mm:ss')}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            log.action === 'create'
                              ? 'bg-green-100 text-green-700'
                              : log.action === 'update'
                                ? 'bg-blue-100 text-blue-700'
                                : log.action === 'delete'
                                  ? 'bg-red-100 text-red-700'
                                  : log.action === 'rollback'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {log.action.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold">{log.entityType}</span>
                        <div className="font-mono text-[10px] text-gray-400">{log.entityId}</div>
                      </td>
                      <td className="p-3">{log.performedBy?.firstName || 'System'}</td>
                      <td className="p-3 text-[12px]">
                        {log.changeDescription || log.reason || '-'}
                      </td>
                      <td className="p-3 text-center">
                        {(log.previousValue || log.newValue) && (
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="p-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                            title="View Diff"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              difference
                            </span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* JSON Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-[16px]">Change Diff</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 flex gap-4 bg-gray-50">
              <div className="flex-1 bg-white border border-red-200 rounded-lg overflow-hidden flex flex-col">
                <div className="bg-red-50 text-red-700 px-4 py-2 text-[12px] font-bold border-b border-red-200">
                  Previous Value
                </div>
                <pre className="p-4 text-[11px] font-mono overflow-auto flex-1 text-gray-600">
                  {selectedLog.previousValue
                    ? JSON.stringify(selectedLog.previousValue, null, 2)
                    : 'null'}
                </pre>
              </div>
              <div className="flex-1 bg-white border border-green-200 rounded-lg overflow-hidden flex flex-col">
                <div className="bg-green-50 text-green-700 px-4 py-2 text-[12px] font-bold border-b border-green-200">
                  New Value
                </div>
                <pre className="p-4 text-[11px] font-mono overflow-auto flex-1 text-gray-800">
                  {selectedLog.newValue ? JSON.stringify(selectedLog.newValue, null, 2) : 'null'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditAndVersions;
