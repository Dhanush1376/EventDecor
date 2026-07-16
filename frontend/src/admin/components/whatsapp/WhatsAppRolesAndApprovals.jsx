import React, { useState, useEffect } from 'react';
import whatsappAutomationService from '../../services/whatsappAutomationService';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

const WhatsAppRolesAndApprovals = () => {
  const [activeSubTab, setActiveSubTab] = useState('approvals');
  const [roles, setRoles] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeSubTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeSubTab === 'roles') {
        const res = await whatsappAutomationService.getRoles();
        setRoles(res.data?.data || []);
      } else {
        const res = await whatsappAutomationService.getApprovals();
        setApprovals(res.data?.data || []);
      }
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await whatsappAutomationService.approveRequest(id, { comments: 'Approved via Admin Panel' });
      toast.success('Request Approved! Action Executed.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    try {
      await whatsappAutomationService.rejectRequest(id, { reason });
      toast.success('Request Rejected');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject');
    }
  };

  if (loading)
    return <div className="p-10 text-center text-gray-500">Loading Enterprise Security...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-[var(--admin-border-subtle)]">
        <div>
          <h2 className="text-[20px] font-bold text-[var(--admin-text-primary)] mb-1">
            Enterprise RBAC & Approvals
          </h2>
          <p className="text-[13px] text-gray-500">
            Four-Eyes Principle Workflow & Granular Access Control.
          </p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            className={`px-4 py-2 rounded-md text-[13px] font-bold ${activeSubTab === 'approvals' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveSubTab('approvals')}
          >
            Approvals Inbox
          </button>
          <button
            className={`px-4 py-2 rounded-md text-[13px] font-bold ${activeSubTab === 'roles' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
            onClick={() => setActiveSubTab('roles')}
          >
            Role Management
          </button>
        </div>
      </div>

      {activeSubTab === 'approvals' && (
        <div className="bg-white rounded-2xl shadow-sm border border-[var(--admin-border-subtle)] overflow-hidden">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[var(--admin-bg-subtle)] text-[12px] font-bold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Requested Action</th>
                <th className="px-6 py-4">Requested By</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {approvals.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-10 text-gray-400">
                    Inbox is zero. No pending approvals! 🎉
                  </td>
                </tr>
              ) : (
                approvals.map((req) => (
                  <tr key={req._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[14px] text-gray-800">{req.actionTitle}</div>
                      <div className="text-[11px] text-gray-500 font-mono mt-1">
                        {req.targetMethod} {req.targetEndpoint}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1">
                        Payload: {JSON.stringify(req.payload).substring(0, 50)}...
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {req.requestedBy?.name || 'Unknown User'}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {format(new Date(req.createdAt), 'PPpp')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border ${
                          req.status === 'approved'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : req.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {req.status}
                      </span>
                      {req.comments && (
                        <div className="text-[11px] text-gray-500 mt-1 italic">
                          "{req.comments}"
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(req._id)}
                            className="admin-btn-primary bg-green-600 hover:bg-green-700 border-green-700 py-1.5 px-3 text-[12px]"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(req._id)}
                            className="admin-btn-secondary py-1.5 px-3 text-[12px] text-red-600 border-red-200 hover:bg-red-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeSubTab === 'roles' && (
        <div className="bg-white rounded-2xl shadow-sm border border-[var(--admin-border-subtle)] overflow-hidden">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[var(--admin-bg-subtle)] text-[12px] font-bold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Role Name</th>
                <th className="px-6 py-4">Permissions (Count)</th>
                <th className="px-6 py-4">Requires Approval For</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roles.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center py-10 text-gray-400">
                    No roles configured.
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr key={role._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-800">
                      {role.name}{' '}
                      {role.isSystemRole && (
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded ml-2">
                          SYSTEM
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.map((p) => (
                          <span
                            key={p}
                            className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {role.requiresApprovalFor.map((p) => (
                          <span
                            key={p}
                            className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200"
                          >
                            {p}
                          </span>
                        ))}
                        {role.requiresApprovalFor.length === 0 && (
                          <span className="text-gray-400 italic">None</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WhatsAppRolesAndApprovals;
