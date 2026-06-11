import { useState, useEffect } from 'react';
import { m as motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../services/domainServices';
import toast from 'react-hot-toast';
import { AdminToggle, fadeUp, stagger } from '../components/AdminUIKit';
import { createSafeHtml } from '../../utils/sanitize';
import logger from '../../utils/logger';
import { getErrorMessage } from '../../utils/errorHelpers';
import { useDraft } from '../hooks/useDraft';
import { DraftStatusIndicator } from '../components/DraftStatusIndicator';
import { DraftRestoreModal } from '../components/DraftRestoreModal';
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard';

export function AdminCampaignCreate() {
  const navigate = useNavigate();

  const [templates, setTemplates] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileTab, setMobileTab] = useState('form');

  const {
    formData: campaignForm,
    setFormData: setCampaignForm,
    draftStatus,
    showRestoreModal,
    restoreDraft,
    discardDraft,
    deleteDraft,
    lastSavedAt,
    blocker,
  } = useDraft({
    draftKey: 'admin:campaign:add',
    module: 'Campaigns',
    pageTitle: 'New Campaign',
    initialData: {
      title: '',
      subject: '',
      templateId: '',
      customHtml: '',
      targetRole: 'all',
      consentedOnly: true,
    },
    enabled: true,
  });

  const [previewHtml, setPreviewHtml] = useState('');

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await notificationService.getTemplates();
        if (res.success) setTemplates(res.data || []);
      } catch (err) {
        logger.error('Failed to load templates', err);
      }
    };
    fetchTemplates();
  }, []);

  const handleLaunchCampaign = async (e) => {
    e.preventDefault();
    if (!campaignForm.title || !campaignForm.subject) {
      toast.error('Campaign Title and Email Subject are required');
      return;
    }
    if (!campaignForm.templateId && !campaignForm.customHtml) {
      toast.error('Please choose a system template or insert custom newsletter HTML');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: campaignForm.title,
        subject: campaignForm.subject,
        templateId: campaignForm.templateId || undefined,
        customHtml: campaignForm.customHtml || undefined,
        targetAudience: {
          role: campaignForm.targetRole,
          consentedOnly: campaignForm.consentedOnly,
        },
      };

      const res = await notificationService.createCampaign(payload);
      if (res.success) {
        await deleteDraft();
        toast.success('Draft created successfully');
        navigate('/admin/campaigns');
      }
    } catch (err) {
      logger.error('Failed to create campaign draft', err);
      toast.error(getErrorMessage(err, 'Failed to create campaign'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectTemplateForForm = (e) => {
    const id = e.target.value;
    setCampaignForm({ ...campaignForm, templateId: id });
    const template = templates.find((t) => t._id === id);
    if (template) {
      setPreviewHtml(template.htmlContent);
      setCampaignForm((prev) => ({
        ...prev,
        templateId: id,
        subject: prev.subject || template.subjectLine || '',
      }));
    } else {
      setPreviewHtml('');
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="max-w-[1300px] mx-auto space-y-6 pb-20"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--admin-border-subtle)] pb-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/campaigns')}
            className="w-10 h-10 rounded-full bg-[var(--admin-surface)] border border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:border-[var(--admin-accent)] cursor-pointer transition-all active:scale-95 shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h3 className="text-[13px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">
                campaign
              </span>
              Draft Marketing Campaign
            </h3>
            <p className="text-[10.5px] text-[var(--admin-text-tertiary)] mt-0.5">
              Target segment groups and preview email dispatch newsletter layouts
            </p>
          </div>
        </div>
        <div className="hidden sm:flex self-start mt-2">
          <DraftStatusIndicator status={draftStatus} lastSavedAt={lastSavedAt} />
        </div>
      </div>

      {/* Mobile Form/Preview Tab Switcher */}
      <div className="flex lg:hidden bg-[var(--admin-surface-muted)] p-1 rounded-xl border border-[var(--admin-border)]/60 w-full mb-4">
        <button
          type="button"
          onClick={() => setMobileTab('form')}
          className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${
            mobileTab === 'form'
              ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-sm border border-[var(--admin-border)]/40'
              : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]'
          }`}
        >
          Edit Campaign
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${
            mobileTab === 'preview'
              ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-sm border border-[var(--admin-border)]/40'
              : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]'
          }`}
        >
          Live Preview
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] gap-6 flex-1 items-start min-h-0">
        <motion.div
          variants={fadeUp}
          className={`space-y-4 ${mobileTab === 'form' ? 'block' : 'hidden lg:block'}`}
        >
          <form
            onSubmit={handleLaunchCampaign}
            className="space-y-4 bg-[var(--admin-surface)] p-4 sm:p-6 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)]"
          >
            <div>
              <label className="text-[9px] uppercase font-bold tracking-wider text-black/45 block mb-1">
                Campaign Title
              </label>
              <input
                type="text"
                required
                value={campaignForm.title}
                onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                placeholder="e.g. Diwali Urli Launch & Diyas Promo"
                className="w-full bg-[var(--admin-bg-subtle)]/40 rounded-xl px-4 py-2.5 text-[13px] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-white transition-all font-medium"
              />
            </div>

            <div>
              <label className="text-[9px] uppercase font-bold tracking-wider text-black/45 block mb-1">
                Email Subject Header
              </label>
              <input
                type="text"
                required
                value={campaignForm.subject}
                onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
                placeholder="e.g. Unveiling Siri Arts Festive Splendors ✦ 50% Early Access"
                className="w-full bg-[var(--admin-bg-subtle)]/40 rounded-xl px-4 py-2.5 text-[13px] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-white transition-all font-medium"
              />
            </div>

            <div>
              <label className="text-[9px] uppercase font-bold tracking-wider text-black/45 block mb-1">
                Audience Type
              </label>
              <select
                value={campaignForm.targetRole}
                onChange={(e) => setCampaignForm({ ...campaignForm, targetRole: e.target.value })}
                className="w-full bg-[var(--admin-bg-subtle)]/40 rounded-xl px-4 py-2.5 text-[13px] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-white transition-all font-medium"
              >
                <option value="all">All Registered Accounts (Customers + Admins)</option>
                <option value="customer">Customers Only</option>
                <option value="admin">Administrators Only</option>
              </select>
            </div>

            <div>
              <label className="text-[9px] uppercase font-bold tracking-wider text-black/45 block mb-1">
                Select Seeding Template
              </label>
              <select
                value={campaignForm.templateId}
                onChange={handleSelectTemplateForForm}
                className="w-full bg-[var(--admin-bg-subtle)]/40 rounded-xl px-4 py-2.5 text-[13px] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-white transition-all font-medium"
              >
                <option value="">-- Custom HTML / No Template --</option>
                {templates.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} ({t.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] px-4.5 py-3 rounded-2xl">
              <AdminToggle
                label="Enforce GDPR/ePrivacy Consent"
                description="Only sends marketing alerts to visitors who explicitly checked marketingEmails or accepted notifications."
                checked={campaignForm.consentedOnly}
                onChange={() =>
                  setCampaignForm({ ...campaignForm, consentedOnly: !campaignForm.consentedOnly })
                }
              />
            </div>

            {!campaignForm.templateId && (
              <div>
                <label className="text-[9px] uppercase font-bold tracking-wider text-black/45 block mb-1">
                  Custom Newsletter HTML Copy
                </label>
                <textarea
                  rows={8}
                  value={campaignForm.customHtml}
                  onChange={(e) => setCampaignForm({ ...campaignForm, customHtml: e.target.value })}
                  placeholder="<!-- Paste complete raw HTML email newsletter copy here -->"
                  className="w-full bg-[var(--admin-bg-subtle)]/40 rounded-xl px-4 py-2.5 text-[13px] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-white transition-all font-mono"
                />
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-[var(--admin-border-subtle)] mt-6">
              <button
                type="button"
                onClick={() => navigate('/admin/campaigns')}
                className="admin-btn admin-btn-outline flex-1 py-3 text-[11px] font-bold uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="admin-btn admin-btn-primary flex-[2] py-3 text-[11px] font-bold uppercase tracking-wider"
              >
                {isSubmitting ? 'Compiling...' : 'Save Campaign Draft'}
              </button>
            </div>
          </form>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className={`border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] p-4 sm:p-5 bg-[var(--admin-bg-subtle)] space-y-4 self-stretch flex flex-col min-h-[450px] ${mobileTab === 'preview' ? 'block' : 'hidden lg:block'}`}
        >
          <div className="flex-1">
            <h4 className="font-display font-bold text-xs text-black border-b border-[var(--admin-border-subtle)] pb-2 mb-3">
              Visual Canvas Preview
            </h4>

            {previewHtml || campaignForm.customHtml ? (
              <div className="space-y-3 flex flex-col h-[calc(100%-35px)]">
                <div className="bg-[var(--admin-surface)] rounded-xl p-2.5 border border-[var(--admin-border-subtle)] shrink-0">
                  <p className="text-[10px] text-black/40 font-mono truncate">
                    <span className="font-bold text-black">Subject:</span>{' '}
                    {campaignForm.subject || '✦ Siri Arts Splendors'}
                  </p>
                </div>
                <div
                  className="border border-[var(--admin-border-subtle)] rounded-xl overflow-y-auto flex-1 bg-[var(--admin-surface)] shadow-inner p-4 max-h-[600px]"
                  dangerouslySetInnerHTML={createSafeHtml(previewHtml || campaignForm.customHtml)}
                />
              </div>
            ) : (
              <div className="border border-dashed border-[var(--admin-border)] rounded-2xl p-16 text-center text-black/40 font-light text-xs flex flex-col items-center justify-center h-full min-h-[300px]">
                <span className="material-symbols-outlined text-[36px] mb-2 text-black/20">
                  visibility
                </span>
                <p className="max-w-[280px]">
                  Select a pre-seeded template or type custom HTML to generate an instant visual
                  canvas review.
                </p>
              </div>
            )}
          </div>

          <div className="bg-[var(--admin-surface)] p-3.5 rounded-xl border border-[var(--admin-border-subtle)] shrink-0">
            <span className="text-[9px] font-bold text-black uppercase tracking-wider block font-sans">
              Secure Dispatch Redirection Active
            </span>
            <p className="text-[9px] text-black/45 font-light leading-relaxed mt-0.5">
              On send trigger, Siri Arts Campaign dispatcher will automatically inject pixel
              tracking logs and secure redirect headers.
            </p>
          </div>
        </motion.div>
      </div>

      <DraftRestoreModal
        isOpen={showRestoreModal}
        onRestore={restoreDraft}
        onDiscard={discardDraft}
        moduleName="Campaigns"
        lastSavedAt={lastSavedAt}
      />

      <UnsavedChangesGuard blocker={blocker} />
    </motion.div>
  );
}
