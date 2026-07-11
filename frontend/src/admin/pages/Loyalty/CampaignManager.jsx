import React, { useState, useEffect } from 'react';
import { Plus, Settings2, Trash2, Edit3, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { SkeletonList } from '../../components/AdminUIKit';

export default function CampaignManager() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await api.get('/campaigns');
      if (res.data?.success) {
        const campaignData = res.data.data;
        setCampaigns(
          Array.isArray(campaignData)
            ? campaignData
            : campaignData.data || campaignData.results || [],
        );
      }
    } catch (err) {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    const name = prompt('Enter Campaign Name:');
    if (!name) return;

    try {
      const res = await api.post('/campaigns', {
        name,
        type: 'custom',
        status: 'draft',
      });
      if (res.data?.success) {
        toast.success('Campaign created');
        fetchCampaigns();
      }
    } catch (err) {
      toast.error('Failed to create campaign');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await api.delete(`/campaigns/${id}`);
      toast.success('Campaign deleted');
      fetchCampaigns();
    } catch (err) {
      toast.error('Failed to delete campaign');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reward Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">Manage dynamic loyalty & reward campaigns</p>
        </div>
        <button
          onClick={handleCreateCampaign}
          className="bg-black text-white px-4 py-2 flex items-center gap-2 rounded-md hover:bg-gray-800"
        >
          <Plus className="w-4 h-4" />
          Create Campaign
        </button>
      </div>

      {loading ? (
        <div className="bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] p-4 border border-[var(--admin-border)] shadow-sm">
          <SkeletonList items={3} />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <Settings2 className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No campaigns yet</h3>
          <p className="text-gray-500 mb-4">
            Create your first reward campaign to start defining rules.
          </p>
          <button
            onClick={handleCreateCampaign}
            className="text-primary font-medium hover:underline"
          >
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((c) => (
            <div
              key={c._id}
              className="bg-white border rounded-lg p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4"
            >
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-bold text-gray-900 text-lg">{c.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      c.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : c.status === 'draft'
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {c.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" /> v{c.version}
                  </span>
                  <span>
                    Type: <strong className="capitalize">{c.type.replace('_', ' ')}</strong>
                  </span>
                  <span>
                    Rules: <strong>{c.rules?.length || 0}</strong>
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Link
                  to={`/admin/reward-campaigns/${c._id}/rules`}
                  className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded inline-flex"
                >
                  <Edit3 className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => handleDelete(c._id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
