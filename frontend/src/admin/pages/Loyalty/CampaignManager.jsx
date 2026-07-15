import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { m as motion } from 'framer-motion';
import {
  PageHeader,
  SkeletonList,
  StatusBadge,
  stagger,
  fadeUp,
} from '../../components/AdminUIKit';

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
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6 pb-20">
      <PageHeader
        title="Reward Campaigns"
        subtitle="Manage dynamic loyalty & reward campaigns"
        icon="stars"
        iconColor="promotions"
      >
        <button onClick={handleCreateCampaign} className="admin-btn admin-btn-primary h-9">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Create Campaign
        </button>
      </PageHeader>

      {loading ? (
        <div className="admin-card p-4">
          <SkeletonList items={3} />
        </div>
      ) : campaigns.length === 0 ? (
        <motion.div
          variants={fadeUp}
          className="text-center py-20 bg-[var(--admin-surface-muted)] rounded-[var(--admin-radius-lg)] border border-dashed border-[var(--admin-border-strong)]"
        >
          <span className="material-symbols-outlined text-[40px] text-[var(--admin-text-tertiary)] mx-auto mb-3 block">
            tune
          </span>
          <h3 className="text-[16px] font-bold text-[var(--admin-text-primary)] mb-1">
            No campaigns yet
          </h3>
          <p className="text-[var(--admin-text-secondary)] text-[13px] mb-4">
            Create your first reward campaign to start defining rules.
          </p>
          <button
            onClick={handleCreateCampaign}
            className="text-[var(--admin-accent)] font-semibold hover:underline text-[13px]"
          >
            Create Campaign
          </button>
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} className="grid gap-4">
          {campaigns.map((c) => (
            <div
              key={c._id}
              className="admin-card p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all hover:border-[var(--admin-border-strong)]"
            >
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-bold text-[var(--admin-text-primary)] text-[16px]">
                    {c.name}
                  </h3>
                  <StatusBadge status={c.status} />
                </div>
                <div className="flex items-center gap-4 text-[13px] text-[var(--admin-text-secondary)] font-medium mt-2">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">calendar_today</span> v
                    {c.version}
                  </span>
                  <span>
                    Type:{' '}
                    <strong className="capitalize text-[var(--admin-text-primary)]">
                      {c.type.replace('_', ' ')}
                    </strong>
                  </span>
                  <span>
                    Rules:{' '}
                    <strong className="text-[var(--admin-text-primary)]">
                      {c.rules?.length || 0}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Link
                  to={`/admin/reward-campaigns/${c._id}/rules`}
                  className="w-8 h-8 flex items-center justify-center rounded-[var(--admin-radius-sm)] text-[var(--admin-text-tertiary)] hover:bg-[var(--admin-surface-hover)] hover:text-[var(--admin-text-primary)] transition-colors"
                  title="Edit Rules"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </Link>
                <button
                  onClick={() => handleDelete(c._id)}
                  className="w-8 h-8 flex items-center justify-center rounded-[var(--admin-radius-sm)] text-[var(--admin-text-tertiary)] hover:bg-[var(--admin-error-bg)] hover:text-[var(--admin-error)] transition-colors"
                  title="Delete Campaign"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
