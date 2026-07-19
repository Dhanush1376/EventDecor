import React, { useState } from 'react';
import { aiService } from '../../../services/api/aiService';
import toast from 'react-hot-toast';

const AiProviderList = ({ providers, onEdit, onRefresh }) => {
  const [validating, setValidating] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleValidate = async (provider) => {
    try {
      setValidating(provider._id);
      await aiService.validateProvider(provider._id);
      // Auto trigger model detection after successful validation
      await aiService.detectModels(provider._id);
      onRefresh();
      toast.success(`${provider.name} validated successfully`);
    } catch (err) {
      console.error(err);
      toast.error('Validation failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setValidating(null);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await aiService.deleteProvider(deleteConfirm._id);
      setDeleteConfirm(null);
      onRefresh();
      toast.success('Provider deleted successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeleting(false);
    }
  };

  const getStatusChip = (provider) => {
    if (!provider.isValidated) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-800">
          Unverified
        </span>
      );
    }

    if (provider.health?.status === 'healthy') {
      return (
        <span
          title={`Latency: ${provider.health?.avgLatencyMs || 0}ms`}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-700 border border-green-200"
        >
          <span className="material-symbols-outlined text-[14px]">check_circle</span>
          Healthy
        </span>
      );
    }

    if (provider.health?.status === 'degraded') {
      return (
        <span
          title={provider.health?.lastError || 'Rate limited'}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-yellow-50 text-yellow-700 border border-yellow-200"
        >
          <span className="material-symbols-outlined text-[14px]">warning</span>
          Degraded
        </span>
      );
    }

    return (
      <span
        title={provider.health?.lastError || 'Service down'}
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 border border-red-200"
      >
        <span className="material-symbols-outlined text-[14px]">error</span>
        Down
      </span>
    );
  };

  const getCapabilities = (provider) => {
    const caps = [];
    if (provider.capabilities?.text) caps.push('Text');
    if (provider.capabilities?.vision) caps.push('Vision');
    if (provider.capabilities?.jsonMode) caps.push('JSON');
    return caps.join(' • ');
  };

  if (!providers || providers.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <span className="material-symbols-outlined text-4xl text-gray-300 mb-3">storage</span>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No AI Providers Configured</h3>
        <p className="text-sm text-gray-500">
          Add your first provider to enable AI features across the platform.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Platform</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Capabilities</th>
                <th className="px-6 py-4">Last Validated</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {providers.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{p.name}</div>
                    {p.modelOverride && (
                      <div className="text-xs text-gray-500 mt-0.5">Model: {p.modelOverride}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                      {p.provider}
                    </span>
                  </td>
                  <td className="px-6 py-4">{getStatusChip(p)}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-gray-500">{getCapabilities(p)}</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {p.lastValidatedAt ? new Date(p.lastValidatedAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleValidate(p)}
                        disabled={validating === p._id}
                        title="Test Connection & Update Models"
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
                      >
                        {validating === p._id ? (
                          <div className="w-[18px] h-[18px] border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <span className="material-symbols-outlined text-[18px]">sync</span>
                        )}
                      </button>
                      <button
                        onClick={() => onEdit(p)}
                        title="Edit"
                        className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(p)}
                        title="Delete"
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in-up">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Provider</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete the provider "{deleteConfirm?.name}"? This action
              cannot be undone. If this provider is currently used in the Global Routing, you will
              need to select a new one.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => !deleting && setDeleteConfirm(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {deleting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AiProviderList;
