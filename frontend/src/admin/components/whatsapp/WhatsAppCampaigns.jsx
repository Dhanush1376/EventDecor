import React, { useState, useEffect } from 'react';
import whatsappAutomationService from '../../services/whatsappAutomationService';
import { toast } from 'react-hot-toast';

const WhatsAppCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [validatingCamp, setValidatingCamp] = useState(null); // Holds validation results before dispatch
  const [validationLoading, setValidationLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    templateId: '',
    campaignType: 'one_time',
    triggerCategory: 'marketing_blast',
    targetAudience: { segment: 'all', minOrders: 1 },
  });

  useEffect(() => {
    fetchData();
    // Auto refresh progress every 5 seconds if any campaign is processing
    const interval = setInterval(() => {
      setCampaigns((prev) => {
        if (prev.some((c) => c.status === 'processing')) {
          fetchData(false);
        }
        return prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async (showLoad = true) => {
    try {
      if (showLoad) setLoading(true);
      const [campRes, tempRes] = await Promise.all([
        whatsappAutomationService.getCampaigns(),
        whatsappAutomationService.getTemplates(),
      ]);
      setCampaigns(campRes.data?.data || []);
      setTemplates(
        (tempRes.data?.data || []).filter(
          (t) => t.templateCategory === 'marketing' || t.templateCategory === 'utility',
        ),
      );
    } catch (err) {
      if (showLoad) toast.error('Failed to load campaigns');
    } finally {
      if (showLoad) setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await whatsappAutomationService.createCampaign(formData);
      toast.success('Campaign Draft Created');
      setShowForm(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create campaign');
    }
  };

  const handlePreFlightValidate = async (camp) => {
    try {
      setValidationLoading(true);
      const res = await whatsappAutomationService.validateCampaign(camp._id);
      setValidatingCamp({ ...camp, validation: res.data?.data });
    } catch (err) {
      toast.error('Validation failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setValidationLoading(false);
    }
  };

  const handleDispatch = async (id) => {
    try {
      await whatsappAutomationService.dispatchCampaign(id);
      toast.success('Campaign dispatch initiated!');
      setValidatingCamp(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Dispatch failed');
    }
  };

  const handlePause = async (id) => {
    try {
      await whatsappAutomationService.pauseCampaign(id);
      toast.success('Campaign paused');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to pause');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign?')) return;
    try {
      await whatsappAutomationService.deleteCampaign(id);
      toast.success('Deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Loading campaigns...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-[var(--admin-border-subtle)]">
        <div>
          <h2 className="text-[20px] font-bold text-[var(--admin-text-primary)] mb-1">
            Enterprise Campaigns
          </h2>
          <p className="text-[13px] text-gray-500">
            Orchestrate scheduled broadcasts and event-based marketing at scale.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="admin-btn-primary flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Create Campaign
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[var(--admin-border-subtle)]">
          <h3 className="font-bold mb-4">New Campaign Configuration</h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  required
                  className="admin-input w-full"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Summer Flash Sale"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase mb-1">
                  Message Template
                </label>
                <select
                  required
                  className="admin-input w-full"
                  value={formData.templateId}
                  onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                >
                  <option value="">Select an Approved Template</option>
                  {templates.map((t) => (
                    <option key={t._id} value={t._id} disabled={t.status !== 'approved'}>
                      {t.name} {t.status !== 'approved' ? '(Pending Approval)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase mb-1">
                  Campaign Type
                </label>
                <select
                  className="admin-input w-full"
                  value={formData.campaignType}
                  onChange={(e) => setFormData({ ...formData, campaignType: e.target.value })}
                >
                  <option value="one_time">One-Time Blast</option>
                  <option value="recurring">Recurring Schedule</option>
                  <option value="event_based">Event Based</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase mb-1">
                  Audience Engine
                </label>
                <select
                  className="admin-input w-full"
                  value={formData.targetAudience.segment}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      targetAudience: { ...formData.targetAudience, segment: e.target.value },
                    })
                  }
                >
                  <option value="all">All Opt-In Users</option>
                  <option value="past_buyers">Past Buyers</option>
                  <option value="abandoned_cart">Abandoned Cart (Last 24h)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="admin-btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="admin-btn-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">save</span> Save Draft
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Validation Modal */}
      {validatingCamp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-[16px] text-gray-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500">fact_check</span>
                Pre-Flight Validation
              </h3>
              <button
                onClick={() => setValidatingCamp(null)}
                className="p-1 rounded-full hover:bg-gray-200"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <h4 className="font-semibold text-gray-800 text-[14px]">{validatingCamp.name}</h4>
                <p className="text-[12px] text-gray-500">
                  Review estimated impact before execution.
                </p>
              </div>

              {!validatingCamp.validation?.valid ? (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg text-[13px] border border-red-100">
                  <strong className="block mb-2 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    Validation Errors:
                  </strong>
                  <ul className="list-disc pl-5 space-y-1">
                    {validatingCamp.validation?.errors?.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-[13px] border border-blue-100 flex justify-between items-center">
                    <div>
                      <span className="block text-[11px] font-bold uppercase tracking-wider opacity-70">
                        Estimated Reach
                      </span>
                      <span className="text-[20px] font-bold">
                        {validatingCamp.validation.estimatedRecipients.toLocaleString()}
                      </span>{' '}
                      users
                    </div>
                    <div>
                      <span className="block text-[11px] font-bold uppercase tracking-wider opacity-70">
                        Estimated Cost
                      </span>
                      <span className="text-[20px] font-bold">
                        ₹{validatingCamp.validation.estimatedCost.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="bg-green-50 text-green-800 p-3 rounded-lg text-[12px] border border-green-100 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    All system checks passed. Ready for batch dispatch.
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setValidatingCamp(null)} className="admin-btn-secondary">
                Cancel
              </button>
              {validatingCamp.validation?.valid && (
                <button
                  onClick={() => handleDispatch(validatingCamp._id)}
                  className="admin-btn-primary bg-green-600 hover:bg-green-700 border-green-700 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                  Launch Campaign
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Campaigns List */}
      <div className="bg-white rounded-2xl shadow-sm border border-[var(--admin-border-subtle)] overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-[var(--admin-bg-subtle)] text-[12px] font-bold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Campaign Details</th>
              <th className="px-6 py-4">Progress</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-10 text-gray-400">
                  No campaigns found. Create one to get started.
                </td>
              </tr>
            ) : (
              campaigns.map((camp) => (
                <tr key={camp._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-[14px] text-gray-800 mb-1">{camp.name}</div>
                    <div className="flex gap-2 items-center text-[11px]">
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium border border-gray-200">
                        {camp.campaignType.replace('_', ' ')}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500">Audience: {camp.targetAudience.segment}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    {camp.status === 'processing' ||
                    camp.status === 'paused' ||
                    camp.status === 'completed' ? (
                      <div className="w-full max-w-[200px]">
                        <div className="flex justify-between text-[11px] mb-1 font-medium">
                          <span className="text-gray-600">
                            {camp.metrics?.sent || 0} / {camp.metrics?.total || 0}
                          </span>
                          <span className="text-[var(--admin-accent)]">
                            {camp.metrics?.total
                              ? Math.round(((camp.metrics?.sent || 0) / camp.metrics.total) * 100)
                              : 0}
                            %
                          </span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${camp.status === 'paused' ? 'bg-amber-400' : 'bg-[var(--admin-accent)]'}`}
                            style={{
                              width: `${camp.metrics?.total ? ((camp.metrics?.sent || 0) / camp.metrics.total) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-[11px] italic">Not started</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border ${
                        camp.status === 'completed'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : camp.status === 'processing'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : camp.status === 'paused'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : camp.status === 'failed'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}
                    >
                      {camp.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {(camp.status === 'draft' || camp.status === 'paused') && (
                        <button
                          onClick={() => handlePreFlightValidate(camp)}
                          disabled={validationLoading}
                          className="admin-btn-primary flex items-center gap-1 text-[12px] py-1.5 px-3 bg-gray-800 hover:bg-gray-900 border-gray-900"
                        >
                          <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                          {camp.status === 'paused' ? 'Resume' : 'Start'}
                        </button>
                      )}

                      {camp.status === 'processing' && (
                        <button
                          onClick={() => handlePause(camp._id)}
                          className="admin-btn-secondary flex items-center gap-1 text-[12px] py-1.5 px-3 border-amber-300 text-amber-700 hover:bg-amber-50"
                        >
                          <span className="material-symbols-outlined text-[16px]">pause</span>
                          Pause
                        </button>
                      )}

                      {(camp.status === 'draft' ||
                        camp.status === 'completed' ||
                        camp.status === 'failed') && (
                        <button
                          onClick={() => handleDelete(camp._id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Delete Campaign"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WhatsAppCampaigns;
