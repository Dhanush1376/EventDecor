import { m as motion, AnimatePresence } from 'framer-motion';
import { SkeletonDashboard } from '../components/AdminUIKit';
import { useConfirm } from '../../context/ConfirmProvider';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../services/domainServices';
import whatsappAutomationService from '../services/whatsappAutomationService';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/core/errorHelpers';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';

import logger from '../../utils/core/logger';
const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

export function AdminCampaigns() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState('broadcasts'); // broadcasts | templates
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [_isSubmitting, _setIsSubmitting] = useState(false);

  // Drawer state replaced with routing
  // Selected Template Preview state (can be removed if no longer needed, but we keep activeTab logic)

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [campRes, tempRes, polyRes] = await Promise.all([
        notificationService.getCampaigns(),
        notificationService.getTemplates(),
        whatsappAutomationService.getExecutiveAnalytics(),
      ]);

      if (campRes.success) setCampaigns(campRes.data || []);
      if (tempRes.success) setTemplates(tempRes.data || []);
      if (polyRes?.data?.success && polyRes.data.data) setAnalytics(polyRes.data.data);
      else setAnalytics(null);
    } catch (err) {
      logger.error('Failed to load campaign dataset', err);
      toast.error(getErrorMessage(err, 'Failed to fetch notification system information'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab]);

  // Campaign logic moved to AdminCampaignCreate.jsx

  const handleSendTrigger = async (campaignId) => {
    const isConfirmed = await confirm({
      title: 'Broadcast Campaign',
      message:
        'Are you absolutely sure you want to broadcast this campaign now to all matched contacts?',
      type: 'warning',
    });
    if (!isConfirmed) return;

    try {
      const res = await notificationService.sendCampaign(campaignId);
      if (res.success) {
        toast.success('Broadcast queued for sending.');
        fetchData();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to trigger broadcast'));
    }
  };

  // Template handlers moved to AdminTemplateCreate.jsx

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      className="max-w-[1300px] mx-auto space-y-6 pb-20 text-[var(--admin-text-primary)]"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[var(--admin-border-subtle)] pb-5 gap-4">
        <div>
          <h2 className="text-[20px] sm:text-[26px] font-bold text-[var(--admin-text-primary)] font-display tracking-tight">
            Marketing Campaigns & Curation
          </h2>
          <p className="text-[12px] sm:text-[13px] text-[var(--admin-text-tertiary)] mt-1 font-medium leading-normal">
            Administer customer broadcast dispatches, draft holiday campaigns, and track WhatsApp
            delivery rates
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto w-full sm:w-auto justify-end">
          <div
            className="flex overflow-x-auto gap-1.5 bg-[var(--admin-surface-muted)] p-1 rounded-full text-xs scrollbar-none flex-nowrap"
            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {[
              { id: 'broadcasts', label: 'Campaigns', icon: 'campaign' },
              { id: 'templates', label: 'Templates', icon: 'brush' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-label uppercase text-[9px] tracking-wider font-bold transition-all duration-300 cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-[var(--admin-surface)] text-black shadow-sm'
                    : 'text-black/55 hover:text-black'
                }`}
              >
                <span className="material-symbols-outlined text-[15px] normal-case">
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              if (activeTab === 'templates') {
                navigate('/admin/campaigns/templates/add');
              } else {
                navigate('/admin/campaigns/add');
              }
            }}
            className="admin-btn admin-btn-primary h-9 shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            {activeTab === 'templates' ? 'New Template' : 'New Campaign'}
          </button>
        </div>
      </div>

      {/* Analytics Summary Bar */}
      {analytics && activeTab === 'broadcasts' && (
        <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            {
              label: 'Total Messages Sent',
              value: analytics.totalExecutions || 0,
              sub: 'All transactional + marketing',
              icon: 'forum',
            },
            {
              label: 'Delivered',
              value: analytics.completedExecutions || 0,
              sub: `Success rate of ${analytics.completionRate || 0}%`,
              icon: 'mark_chat_read',
            },
            {
              label: 'Failed Messages',
              value: analytics.failedExecutions || 0,
              sub: 'Failed delivery',
              icon: 'error',
            },
            {
              label: 'Average Delivery Time',
              value: `${((analytics.avgLatencyMs || 0) / 1000).toFixed(1)}s`,
              sub: `Fastest latency`,
              icon: 'speed',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] p-4 sm:p-5 rounded-[var(--admin-radius-lg)] shadow-sm flex items-start gap-2.5 sm:gap-4 min-w-0"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[var(--admin-surface-muted)] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-black text-base sm:text-lg">
                  {item.icon}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-[8px] sm:text-[9px] text-black/45 font-label uppercase tracking-widest block font-sans truncate">
                  {item.label}
                </span>
                <h4 className="text-base sm:text-xl font-bold text-black font-display mt-0.5 truncate">
                  {item.value}
                </h4>
                <p className="text-[8px] sm:text-[10px] text-black/40 font-light mt-0.5 leading-normal truncate">
                  {item.sub}
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Tab Content Panels */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <SkeletonDashboard />
        ) : activeTab === 'broadcasts' ? (
          <motion.div
            key="broadcasts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {campaigns.length === 0 ? (
              <div className="bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] p-12 rounded-[var(--admin-radius-lg)] text-center flex flex-col items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-black/20 text-[48px] mb-2">
                  search_off
                </span>
                <h3 className="text-sm font-bold text-black font-display">Data Not Found</h3>
                <p className="text-[12px] text-black/40 font-light mt-1 mb-4">
                  No campaigns designed yet. You can easily craft a customized broadcast using our
                  pre-seeded premium templates.
                </p>
                <button
                  onClick={() => navigate('/admin/campaigns/add')}
                  className="bg-[var(--admin-accent)] text-white hover:bg-[var(--admin-text-primary)] rounded-full px-5 py-2.5 font-label uppercase text-[9px] tracking-wider font-bold shadow-md hover:shadow-lg transition-colors cursor-pointer active:scale-95"
                >
                  Create Campaign
                </button>
              </div>
            ) : (
              <>
                {/* Desktop table view */}
                <div className="hidden md:block bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs min-w-[800px]">
                      <thead>
                        <tr className="bg-[var(--admin-bg-subtle)] border-b border-[var(--admin-border-subtle)] text-black/55 font-label uppercase text-[9px] tracking-wider font-bold">
                          <th className="p-4 font-semibold">Campaign Details</th>
                          <th className="p-4 font-semibold">Audience Rules</th>
                          <th className="p-4 font-semibold">Current Status</th>
                          <th className="p-4 font-semibold text-center">Analytics / Logs</th>
                          <th className="p-4 font-semibold text-right">Dispatch Control</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5">
                        {campaigns.map((camp) => (
                          <tr
                            key={camp._id}
                            className="hover:bg-[var(--admin-bg-subtle)]/50 transition-colors"
                          >
                            <td className="p-4">
                              <strong className="text-black font-bold text-sm block font-display">
                                {camp.title}
                              </strong>
                              <span className="text-[11px] text-black/45 block font-light mt-0.5">
                                Subject: {camp.subject}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="text-[9px] bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] font-label uppercase tracking-widest font-bold px-2.5 py-0.5 rounded-full">
                                {camp.targetAudience.role}
                              </span>
                              {camp.targetAudience.consentedOnly && (
                                <span className="text-[9px] text-black/60 font-medium block mt-1">
                                  <ShieldCheck className="w-3 h-3 inline-block mr-1 -mt-0.5" />{' '}
                                  Checked Consent Only
                                </span>
                              )}
                            </td>
                            <td className="p-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                                  camp.status === 'sent'
                                    ? 'bg-[var(--admin-success-light)] text-[var(--admin-success)]'
                                    : camp.status === 'sending'
                                      ? 'bg-amber-50 text-amber-700 animate-pulse'
                                      : camp.status === 'scheduled'
                                        ? 'bg-[var(--admin-surface-muted)] text-[var(--admin-info)]'
                                        : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)]'
                                }`}
                              >
                                <span className="w-1 h-1 rounded-full bg-current" />
                                {camp.status}
                              </span>
                              {camp.sentAt && (
                                <span className="text-[9px] text-black/40 block mt-1">
                                  {new Date(camp.sentAt).toLocaleString()}
                                </span>
                              )}
                            </td>
                            <td className="p-4">
                              {camp.status === 'draft' ? (
                                <p className="text-black/40 font-light italic text-center">
                                  Awaiting send triggers
                                </p>
                              ) : (
                                <div className="flex items-center justify-center gap-6">
                                  <div className="text-center">
                                    <strong className="text-black font-bold text-sm block font-mono">
                                      {camp.stats.deliveredCount}
                                    </strong>
                                    <span className="text-[9px] text-black/40 block">Sent</span>
                                  </div>
                                  <div className="text-center">
                                    <strong className="text-black font-bold text-sm block font-mono">
                                      {camp.stats.openCount}
                                    </strong>
                                    <span className="text-[9px] text-black/40 block">Opened</span>
                                  </div>
                                  <div className="text-center">
                                    <strong className="text-[var(--admin-text-secondary)] font-bold text-sm block font-mono">
                                      {camp.stats.clickCount}
                                    </strong>
                                    <span className="text-[9px] text-black/40 block">Clicks</span>
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              {camp.status === 'draft' && (
                                <button
                                  onClick={() => handleSendTrigger(camp._id)}
                                  className="bg-black hover:bg-[var(--admin-text-primary)] text-white rounded-full px-4 py-2 font-label uppercase text-[9px] tracking-widest font-bold transition-all shadow-md hover:shadow-lg cursor-pointer active:scale-95"
                                >
                                  Trigger Send
                                </button>
                              )}
                              {camp.status === 'sent' && (
                                <span className="text-[9px] text-black/40 font-medium font-sans">
                                  Broadcast Finished
                                </span>
                              )}
                              {camp.status === 'sending' && (
                                <span className="text-[9px] text-amber-600 font-bold animate-pulse font-sans">
                                  Processing...
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Cards deck list */}
                <div className="block md:hidden space-y-3">
                  {campaigns.map((camp) => (
                    <div
                      key={camp._id}
                      className="admin-card p-4 hover:border-[var(--admin-border-strong)] transition-all duration-300 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <strong className="text-black font-bold text-[13px] block font-display truncate">
                            {camp.title}
                          </strong>
                          <span className="text-[10px] text-black/45 block truncate mt-0.5">
                            Subject: {camp.subject}
                          </span>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest shrink-0 ${
                            camp.status === 'sent'
                              ? 'bg-[var(--admin-success-light)] text-[var(--admin-success)]'
                              : camp.status === 'sending'
                                ? 'bg-amber-50 text-amber-700 animate-pulse'
                                : camp.status === 'scheduled'
                                  ? 'bg-[var(--admin-surface-muted)] text-[var(--admin-info)]'
                                  : 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)]'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {camp.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-b border-[var(--admin-border-subtle)] py-2 text-[10px]">
                        <div>
                          <span className="text-[8px] uppercase tracking-wider text-[var(--admin-text-tertiary)] font-bold block mb-0.5">
                            Audience Target
                          </span>
                          <span className="text-[9px] bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] font-label uppercase tracking-widest font-bold px-2 py-0.5 rounded-full">
                            {camp.targetAudience.role}
                          </span>
                        </div>

                        {camp.targetAudience.consentedOnly && (
                          <span className="text-[9px] text-[var(--admin-success)] font-bold flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[12px]">
                              check_circle
                            </span>{' '}
                            Consent Check
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        {camp.status === 'draft' ? (
                          <span className="text-[10px] text-black/40 font-light italic">
                            Draft Campaign
                          </span>
                        ) : (
                          <div className="flex gap-4 text-center">
                            <div>
                              <strong className="text-black font-bold text-[12px] block font-mono leading-none">
                                {camp.stats.deliveredCount}
                              </strong>
                              <span className="text-[8px] text-black/40 block mt-0.5 uppercase">
                                Sent
                              </span>
                            </div>
                            <div>
                              <strong className="text-black font-bold text-[12px] block font-mono leading-none">
                                {camp.stats.openCount}
                              </strong>
                              <span className="text-[8px] text-black/40 block mt-0.5 uppercase">
                                Opens
                              </span>
                            </div>
                            <div>
                              <strong className="text-[var(--admin-text-secondary)] font-bold text-[12px] block font-mono leading-none">
                                {camp.stats.clickCount}
                              </strong>
                              <span className="text-[8px] text-black/40 block mt-0.5 uppercase">
                                Clicks
                              </span>
                            </div>
                          </div>
                        )}

                        <div>
                          {camp.status === 'draft' && (
                            <button
                              onClick={() => handleSendTrigger(camp._id)}
                              className="bg-black hover:bg-[var(--admin-text-primary)] text-white rounded-full px-3 py-1.5 font-label uppercase text-[9px] tracking-widest font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                            >
                              Trigger Send
                            </button>
                          )}
                          {camp.status === 'sent' && (
                            <span className="text-[9px] text-black/40 font-semibold uppercase tracking-wider block font-sans">
                              Finished
                            </span>
                          )}
                          {camp.status === 'sending' && (
                            <span className="text-[9px] text-amber-600 font-bold animate-pulse uppercase tracking-wider block font-sans">
                              Sending...
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="templates"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Seeded Templates Grid */}
            <div className="space-y-4">
              <h3 className="font-display font-bold text-base text-black px-1">
                Seeded Luxury Layouts ({templates.length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((temp) => (
                  <div
                    key={temp._id}
                    className="bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] p-5 flex flex-col justify-between shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] text-black/55 font-label uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                          {temp.type}
                        </span>
                        {!temp.isActive && (
                          <span className="text-[8px] admin-badge admin-badge-error font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
                            Draft
                          </span>
                        )}
                      </div>

                      <strong className="text-black font-display font-bold text-xs block">
                        {temp.name}
                      </strong>
                      <p className="text-[10px] text-black/40 font-light mt-1 italic">
                        Subject: "{temp.subjectLine || 'N/A'}"
                      </p>
                    </div>

                    <div className="flex items-center gap-2 border-t border-[var(--admin-border-subtle)] pt-3 mt-4">
                      <button
                        onClick={() => {
                          navigate(`/admin/campaigns/templates/edit/${temp._id}`);
                        }}
                        className="px-3 py-2 rounded-xl border border-[var(--admin-border)] hover:border-black text-[9px] font-label uppercase tracking-wider font-bold transition-all text-black hover:bg-black hover:text-white flex-1 text-center cursor-pointer"
                      >
                        Modify HTML
                      </button>
                      <button
                        onClick={() => {
                          // Quick HTML preview in window
                          const previewWindow = window.open();
                          previewWindow.document.write(temp.htmlContent);
                          previewWindow.document.close();
                        }}
                        className="px-3 py-2 rounded-xl border border-transparent bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] hover:text-black text-[9px] font-label uppercase tracking-wider font-bold transition-all flex-1 text-center cursor-pointer"
                      >
                        Preview Canvas
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
