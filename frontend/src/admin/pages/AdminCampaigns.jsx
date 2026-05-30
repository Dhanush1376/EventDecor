import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { notificationService } from "../../services/domainServices";
import toast from "react-hot-toast";
import { AdminToggle, SkeletonDashboard } from "../components/AdminUIKit";
import { createSafeHtml } from "../../utils/sanitize";

import logger from '../../utils/logger';
const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

export function AdminCampaigns() {
  const [activeTab, setActiveTab] = useState("broadcasts"); // broadcasts | templates
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Drawer states
  const [showLaunchDrawer, setShowLaunchDrawer] = useState(false);
  const [showTemplateDrawer, setShowTemplateDrawer] = useState(false);

  // Form State for New Campaign
  const [campaignForm, setCampaignForm] = useState({
    title: "",
    subject: "",
    templateId: "",
    customHtml: "",
    targetRole: "all", // all | customer | admin
    consentedOnly: true,
  });

  // Selected Template Preview state
  const [previewHtml, setPreviewHtml] = useState("");
  const [isEditingTemplate, setIsEditingTemplate] = useState(null); // template object
  const [templateForm, setTemplateForm] = useState({
    name: "",
    subjectLine: "",
    htmlContent: "",
    type: "marketing",
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [campRes, tempRes, polyRes] = await Promise.all([
        notificationService.getCampaigns(),
        notificationService.getTemplates(),
        notificationService.getAnalytics(),
      ]);

      if (campRes.success) setCampaigns(campRes.data || []);
      if (tempRes.success) setTemplates(tempRes.data || []);
      if (polyRes.success) setAnalytics(polyRes.data || null);
    } catch (err) {
      logger.error("Failed to load campaign dataset", err);
      toast.error("Failed to fetch notification system information");
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

  const handleLaunchCampaign = async (e) => {
    e.preventDefault();
    if (!campaignForm.title || !campaignForm.subject) {
      toast.error("Campaign Title and Email Subject are required");
      return;
    }
    if (!campaignForm.templateId && !campaignForm.customHtml) {
      toast.error("Please choose a system template or insert custom newsletter HTML");
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
        toast.success("Draft created successfully");
        
        // Reset form & transition
        setCampaignForm({
          title: "",
          subject: "",
          templateId: "",
          customHtml: "",
          targetRole: "all",
          consentedOnly: true,
        });
        setPreviewHtml("");
        setShowLaunchDrawer(false);
        fetchData();
      }
    } catch (err) {
      logger.error("Failed to create campaign draft", err);
      toast.error(err.response?.data?.message || "Failed to create campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendTrigger = async (campaignId) => {
    const confirm = window.confirm("Are you absolutely sure you want to broadcast this campaign now to all matched contacts?");
    if (!confirm) return;

    try {
      const res = await notificationService.sendCampaign(campaignId);
      if (res.success) {
        toast.success("Broadcast queued for sending.");
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to trigger broadcast");
    }
  };

  const handleTemplateUpdate = async (e) => {
    e.preventDefault();
    if (!templateForm.name || !templateForm.htmlContent) {
      toast.error("Name and HTML Content are required");
      return;
    }

    setIsSubmitting(true);
    try {
      let res;
      if (isEditingTemplate?._id) {
        res = await notificationService.updateTemplate(isEditingTemplate._id, templateForm);
      } else {
        res = await notificationService.createTemplate(templateForm);
      }

      if (res.success) {
        toast.success(isEditingTemplate?._id ? "Template updated" : "Template created");
        setIsEditingTemplate(null);
        setTemplateForm({ name: "", subjectLine: "", htmlContent: "", type: "marketing" });
        setShowTemplateDrawer(false);
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to save template modifications");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectTemplateForForm = (e) => {
    const id = e.target.value;
    setCampaignForm({ ...campaignForm, templateId: id });
    const template = templates.find(t => t._id === id);
    if (template) {
      setPreviewHtml(template.htmlContent);
      setCampaignForm(prev => ({
        ...prev,
        templateId: id,
        subject: prev.subject || template.subjectLine || "",
      }));
    } else {
      setPreviewHtml("");
    }
  };

  const handleCloseLaunchDrawer = () => {
    setShowLaunchDrawer(false);
  };

  const handleCloseTemplateDrawer = () => {
    setShowTemplateDrawer(false);
    setIsEditingTemplate(null);
    setTemplateForm({ name: "", subjectLine: "", htmlContent: "", type: "marketing" });
  };

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
            Administer customer email dispatches, draft holiday newsletters, and track live link-click open rates
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto w-full sm:w-auto justify-end">
          <div
            className="flex overflow-x-auto gap-1.5 bg-[var(--admin-surface-muted)] p-1 rounded-full text-xs scrollbar-none flex-nowrap"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
          >
            {[
              { id: "broadcasts", label: "Campaigns", icon: "campaign" },
              { id: "templates", label: "Templates", icon: "brush" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsEditingTemplate(null);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-label uppercase text-[9px] tracking-wider font-bold transition-all duration-300 cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? "bg-[var(--admin-surface)] text-black shadow-sm"
                    : "text-black/55 hover:text-black"
                }`}
              >
                <span className="material-symbols-outlined text-[15px] normal-case">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              if (activeTab === "templates") {
                setIsEditingTemplate(null);
                setTemplateForm({ name: "", subjectLine: "", htmlContent: "", type: "marketing" });
                setShowTemplateDrawer(true);
              } else {
                setShowLaunchDrawer(true);
              }
            }}
            className="admin-btn admin-btn-primary h-9 shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">
              add
            </span>
            {activeTab === "templates" ? "New Template" : "New Campaign"}
          </button>
        </div>
      </div>

      {/* Analytics Summary Bar */}
      {analytics && activeTab === "broadcasts" && (
        <motion.div 
          variants={fadeUp}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
        >
          {[
            { label: "Total Emails Sent", value: analytics.overview.totalDispatched, sub: "All transactional + marketing", icon: "mail" },
            { label: "Unique Opens", value: analytics.overview.totalOpened, sub: `Open rate of ${analytics.overview.openRate}`, icon: "drafts" },
            { label: "Click Tracking", value: analytics.overview.totalClicks, sub: "Secure tracker redirects", icon: "ads_click" },
            { label: "Opted-in Profiles", value: analytics.overview.newsletterSubscribers, sub: `Across ${analytics.overview.visitorConsentProfiles} keys`, icon: "mark_email_read" }
          ].map((item, idx) => (
            <div key={idx} className="bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] p-4 sm:p-5 rounded-[var(--admin-radius-lg)] shadow-sm flex items-start gap-2.5 sm:gap-4 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[var(--admin-surface-muted)] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-black text-base sm:text-lg">{item.icon}</span>
              </div>
              <div className="min-w-0">
                <span className="text-[8px] sm:text-[9px] text-black/45 font-label uppercase tracking-widest block font-sans truncate">{item.label}</span>
                <h4 className="text-base sm:text-xl font-bold text-black font-display mt-0.5 truncate">{item.value}</h4>
                <p className="text-[8px] sm:text-[10px] text-black/40 font-light mt-0.5 leading-normal truncate">{item.sub}</p>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Tab Content Panels */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <SkeletonDashboard />
        ) : activeTab === "broadcasts" ? (
          <motion.div
            key="broadcasts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {campaigns.length === 0 ? (
              <div className="bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] p-12 rounded-[var(--admin-radius-lg)] text-center flex flex-col items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-black/20 text-[48px] mb-2">search_off</span>
                <h3 className="text-sm font-bold text-black font-display">Data Not Found</h3>
                <p className="text-[12px] text-black/40 font-light mt-1 mb-4">No campaigns designed yet. You can easily craft a customized broadcast using our pre-seeded premium templates.</p>
                <button
                  onClick={() => setShowLaunchDrawer(true)}
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
                          <tr key={camp._id} className="hover:bg-[var(--admin-bg-subtle)]/50 transition-colors">
                            <td className="p-4">
                              <strong className="text-black font-bold text-sm block font-display">{camp.title}</strong>
                              <span className="text-[11px] text-black/45 block font-light mt-0.5">Subject: {camp.subject}</span>
                            </td>
                            <td className="p-4">
                              <span className="text-[9px] bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] font-label uppercase tracking-widest font-bold px-2.5 py-0.5 rounded-full">
                                {camp.targetAudience.role}
                              </span>
                              {camp.targetAudience.consentedOnly && (
                                <span className="text-[9px] text-black/60 font-medium block mt-1">✦ Checked Consent Only</span>
                              )}
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                                camp.status === "sent" ? "bg-[var(--admin-success-light)] text-[var(--admin-success)]" :
                                camp.status === "sending" ? "bg-amber-50 text-amber-700 animate-pulse" :
                                camp.status === "scheduled" ? "bg-[var(--admin-surface-muted)] text-[var(--admin-info)]" :
                                "bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)]"
                              }`}>
                                <span className="w-1 h-1 rounded-full bg-current" />
                                {camp.status}
                              </span>
                              {camp.sentAt && (
                                <span className="text-[9px] text-black/40 block mt-1">{new Date(camp.sentAt).toLocaleString()}</span>
                              )}
                            </td>
                            <td className="p-4">
                              {camp.status === "draft" ? (
                                <p className="text-black/40 font-light italic text-center">Awaiting send triggers</p>
                              ) : (
                                <div className="flex items-center justify-center gap-6">
                                  <div className="text-center">
                                    <strong className="text-black font-bold text-sm block font-mono">{camp.stats.deliveredCount}</strong>
                                    <span className="text-[9px] text-black/40 block">Sent</span>
                                  </div>
                                  <div className="text-center">
                                    <strong className="text-black font-bold text-sm block font-mono">{camp.stats.openCount}</strong>
                                    <span className="text-[9px] text-black/40 block">Opened</span>
                                  </div>
                                  <div className="text-center">
                                    <strong className="text-[var(--admin-text-secondary)] font-bold text-sm block font-mono">{camp.stats.clickCount}</strong>
                                    <span className="text-[9px] text-black/40 block">Clicks</span>
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              {camp.status === "draft" && (
                                <button
                                  onClick={() => handleSendTrigger(camp._id)}
                                  className="bg-black hover:bg-[var(--admin-text-primary)] text-white rounded-full px-4 py-2 font-label uppercase text-[9px] tracking-widest font-bold transition-all shadow-md hover:shadow-lg cursor-pointer active:scale-95"
                                >
                                  Trigger Send
                                </button>
                              )}
                              {camp.status === "sent" && (
                                <span className="text-[9px] text-black/40 font-medium font-sans">Broadcast Finished</span>
                              )}
                              {camp.status === "sending" && (
                                <span className="text-[9px] text-amber-600 font-bold animate-pulse font-sans">Processing...</span>
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
                    <div key={camp._id} className="admin-card p-4 hover:border-[var(--admin-border-strong)] transition-all duration-300 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <strong className="text-black font-bold text-[13px] block font-display truncate">{camp.title}</strong>
                          <span className="text-[10px] text-black/45 block truncate mt-0.5">Subject: {camp.subject}</span>
                        </div>
                        
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest shrink-0 ${
                          camp.status === "sent" ? "bg-[var(--admin-success-light)] text-[var(--admin-success)]" :
                          camp.status === "sending" ? "bg-amber-50 text-amber-700 animate-pulse" :
                          camp.status === "scheduled" ? "bg-[var(--admin-surface-muted)] text-[var(--admin-info)]" :
                          "bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)]"
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {camp.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-b border-[var(--admin-border-subtle)] py-2 text-[10px]">
                        <div>
                          <span className="text-[8px] uppercase tracking-wider text-[var(--admin-text-tertiary)] font-bold block mb-0.5">Audience Target</span>
                          <span className="text-[9px] bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] font-label uppercase tracking-widest font-bold px-2 py-0.5 rounded-full">
                            {camp.targetAudience.role}
                          </span>
                        </div>
                        
                        {camp.targetAudience.consentedOnly && (
                          <span className="text-[9px] text-[var(--admin-success)] font-bold flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[12px]">check_circle</span> Consent Check
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        {camp.status === "draft" ? (
                           <span className="text-[10px] text-black/40 font-light italic">Draft Campaign</span>
                        ) : (
                          <div className="flex gap-4 text-center">
                            <div>
                              <strong className="text-black font-bold text-[12px] block font-mono leading-none">{camp.stats.deliveredCount}</strong>
                              <span className="text-[8px] text-black/40 block mt-0.5 uppercase">Sent</span>
                            </div>
                            <div>
                              <strong className="text-black font-bold text-[12px] block font-mono leading-none">{camp.stats.openCount}</strong>
                              <span className="text-[8px] text-black/40 block mt-0.5 uppercase">Opens</span>
                            </div>
                            <div>
                              <strong className="text-[var(--admin-text-secondary)] font-bold text-[12px] block font-mono leading-none">{camp.stats.clickCount}</strong>
                              <span className="text-[8px] text-black/40 block mt-0.5 uppercase">Clicks</span>
                            </div>
                          </div>
                        )}

                        <div>
                          {camp.status === "draft" && (
                            <button
                              onClick={() => handleSendTrigger(camp._id)}
                              className="bg-black hover:bg-[var(--admin-text-primary)] text-white rounded-full px-3 py-1.5 font-label uppercase text-[9px] tracking-widest font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                            >
                              Trigger Send
                            </button>
                          )}
                          {camp.status === "sent" && (
                            <span className="text-[9px] text-black/40 font-semibold uppercase tracking-wider block font-sans">Finished</span>
                          )}
                          {camp.status === "sending" && (
                            <span className="text-[9px] text-amber-600 font-bold animate-pulse uppercase tracking-wider block font-sans">Sending...</span>
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
              <h3 className="font-display font-bold text-base text-black px-1">Seeded Luxury Layouts ({templates.length})</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((temp) => (
                  <div key={temp._id} className="bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] p-5 flex flex-col justify-between shadow-sm">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] text-black/55 font-label uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                          {temp.type}
                        </span>
                        {!temp.isActive && (
                          <span className="text-[8px] admin-badge admin-badge-error font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">Draft</span>
                        )}
                      </div>
                      
                      <strong className="text-black font-display font-bold text-xs block">{temp.name}</strong>
                      <p className="text-[10px] text-black/40 font-light mt-1 italic">
                        Subject: "{temp.subjectLine || 'N/A'}"
                      </p>
                    </div>

                    <div className="flex items-center gap-2 border-t border-[var(--admin-border-subtle)] pt-3 mt-4">
                      <button
                        onClick={() => {
                          setIsEditingTemplate(temp);
                          setTemplateForm({
                            name: temp.name,
                            subjectLine: temp.subjectLine || "",
                            htmlContent: temp.htmlContent,
                            type: temp.type,
                          });
                          setShowTemplateDrawer(true);
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

      {/* ─── Launch Campaign Drawer Portal ─── */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showLaunchDrawer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[990] flex items-end justify-center admin-section-root"
            >
              {/* Backdrop */}
              <div
                onClick={handleCloseLaunchDrawer}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
              />

              {/* Wide Drawer Sheet */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 26, stiffness: 220 }}
                className="relative w-full max-w-7xl bg-[var(--admin-surface)] rounded-t-[24px] shadow-[0_-8px_30px_rgb(0,0,0,0.18)] z-10 h-[92vh] overflow-y-auto custom-scrollbar p-5 sm:p-6 lg:p-8 border-t border-[var(--admin-border-strong)] flex flex-col pb-[calc(24px+env(safe-area-inset-bottom))]"
              >
                {/* Grab Handle */}
                <div className="w-12 h-1 bg-[var(--admin-border)] rounded-full mx-auto mb-4 shrink-0" />

                {/* Form Title */}
                <div className="mb-5 pb-3 border-b border-[var(--admin-border-subtle)] flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="text-[13px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">campaign</span>
                      Draft Marketing Campaign
                    </h3>
                    <p className="text-[10.5px] text-[var(--admin-text-tertiary)] mt-0.5">
                      Target segment groups and preview email dispatch newsletter layouts
                    </p>
                  </div>
                  <button 
                    onClick={handleCloseLaunchDrawer}
                    className="w-7 h-7 rounded-full bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-error-light)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-error)] flex items-center justify-center transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>

                {/* Main side-by-side editing canvas workspace */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 items-start min-h-0 overflow-y-auto custom-scrollbar pr-1">
                  {/* Left Column - Form fields */}
                  <div className="space-y-4">
                    <form onSubmit={handleLaunchCampaign} className="space-y-4">
                      <div>
                        <label className="text-[9px] uppercase font-bold tracking-wider text-black/45 block mb-1">Campaign Title</label>
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
                        <label className="text-[9px] uppercase font-bold tracking-wider text-black/45 block mb-1">Email Subject Header</label>
                        <input
                          type="text"
                          required
                          value={campaignForm.subject}
                          onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
                          placeholder="e.g. Unveiling Siri Arts Festive Splendors ✦ 50% Early Access"
                          className="w-full bg-[var(--admin-bg-subtle)]/40 rounded-xl px-4 py-2.5 text-[13px] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-white transition-all font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9px] uppercase font-bold tracking-wider text-black/45 block mb-1">Audience Type</label>
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
                          <label className="text-[9px] uppercase font-bold tracking-wider text-black/45 block mb-1">Select Seeding Template</label>
                          <select
                            value={campaignForm.templateId}
                            onChange={handleSelectTemplateForForm}
                            className="w-full bg-[var(--admin-bg-subtle)]/40 rounded-xl px-4 py-2.5 text-[13px] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-white transition-all font-medium"
                          >
                            <option value="">-- Custom HTML / No Template --</option>
                            {templates.map(t => (
                              <option key={t._id} value={t._id}>{t.name} ({t.type})</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] px-4.5 py-3 rounded-2xl">
                        <AdminToggle
                          label="Enforce GDPR/ePrivacy Consent"
                          description="Only sends marketing alerts to visitors who explicitly checked marketingEmails or accepted notifications."
                          checked={campaignForm.consentedOnly}
                          onChange={() => setCampaignForm({ ...campaignForm, consentedOnly: !campaignForm.consentedOnly })}
                        />
                      </div>

                      {!campaignForm.templateId && (
                        <div>
                          <label className="text-[9px] uppercase font-bold tracking-wider text-black/45 block mb-1">Custom Newsletter HTML Copy</label>
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
                          onClick={handleCloseLaunchDrawer}
                          className="admin-btn admin-btn-outline flex-1 py-3 text-[11px] font-bold uppercase tracking-wider"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="admin-btn admin-btn-primary flex-[2] py-3 text-[11px] font-bold uppercase tracking-wider"
                        >
                          {isSubmitting ? "Compiling..." : "Save Campaign Draft"}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Right Column - Visual Canvas Preview */}
                  <div className="border border-[var(--admin-border-subtle)] rounded-2xl p-5 bg-[var(--admin-bg-subtle)] space-y-4 self-stretch flex flex-col min-h-[450px]">
                    <div className="flex-1">
                      <h4 className="font-display font-bold text-xs text-black border-b border-[var(--admin-border-subtle)] pb-2 mb-3">
                        Visual Canvas Preview
                      </h4>
                      
                      {previewHtml || campaignForm.customHtml ? (
                        <div className="space-y-3 flex flex-col h-[calc(100%-35px)]">
                          <div className="bg-[var(--admin-surface)] rounded-xl p-2.5 border border-[var(--admin-border-subtle)] shrink-0">
                            <p className="text-[10px] text-black/40 font-mono truncate">
                              <span className="font-bold text-black">Subject:</span> {campaignForm.subject || "✦ Siri Arts Splendors"}
                            </p>
                          </div>
                          <div 
                            className="border border-[var(--admin-border-subtle)] rounded-xl overflow-y-auto flex-1 bg-[var(--admin-surface)] shadow-inner p-4 max-h-[360px]"
                            dangerouslySetInnerHTML={createSafeHtml(previewHtml || campaignForm.customHtml)}
                          />
                        </div>
                      ) : (
                        <div className="border border-dashed border-[var(--admin-border)] rounded-2xl p-16 text-center text-black/40 font-light text-xs flex flex-col items-center justify-center h-full min-h-[300px]">
                          <span className="material-symbols-outlined text-[36px] mb-2 text-black/20">visibility</span>
                          <p className="max-w-[280px]">Select a pre-seeded template or type custom HTML to generate an instant visual canvas review.</p>
                        </div>
                      )}
                    </div>

                    <div className="bg-[var(--admin-surface)] p-3.5 rounded-xl border border-[var(--admin-border-subtle)] shrink-0">
                      <span className="text-[9px] font-bold text-black uppercase tracking-wider block font-sans">Secure Dispatch Redirection Active</span>
                      <p className="text-[9px] text-black/45 font-light leading-relaxed mt-0.5">
                        On send trigger, Siri Arts Campaign dispatcher will automatically inject pixel tracking logs and secure redirect headers.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─── Template Creator Drawer Portal ─── */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showTemplateDrawer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[990] flex items-end justify-center admin-section-root"
            >
              {/* Backdrop */}
              <div
                onClick={handleCloseTemplateDrawer}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
              />

              {/* Drawer Sheet */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 26, stiffness: 220 }}
                className="relative w-full max-w-xl bg-[var(--admin-surface)] rounded-t-[24px] shadow-[0_-8px_30px_rgb(0,0,0,0.18)] z-10 max-h-[92vh] overflow-y-auto custom-scrollbar p-5 sm:p-6 lg:p-8 border-t border-[var(--admin-border-strong)] flex flex-col pb-[calc(24px+env(safe-area-inset-bottom))]"
              >
                {/* Grab Handle */}
                <div className="w-12 h-1 bg-[var(--admin-border)] rounded-full mx-auto mb-4 shrink-0" />

                <div className="flex items-start justify-between border-b border-[var(--admin-border-subtle)] pb-4 mb-5 shrink-0">
                  <div>
                    <h3 className="text-[13px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">brush</span>
                      {isEditingTemplate ? "Modify Seeded Layout" : "Seed Design Template"}
                    </h3>
                    <p className="text-[10.5px] text-[var(--admin-text-tertiary)] mt-0.5">
                      Draft rich HTML email templates with core system variables
                    </p>
                  </div>
                  <button 
                    onClick={handleCloseTemplateDrawer}
                    className="w-7 h-7 rounded-full bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-error-light)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-error)] flex items-center justify-center transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>

                <form onSubmit={handleTemplateUpdate} className="space-y-4 flex-1">
                  <div>
                    <label className="text-[9px] uppercase font-bold tracking-wider text-black/45 block mb-1">Template Name *</label>
                    <input
                      type="text"
                      required
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                      placeholder="e.g. Festive Urli Launch"
                      className="admin-input"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] uppercase font-bold tracking-wider text-black/45 block mb-1">Subject Fallback</label>
                    <input
                      type="text"
                      value={templateForm.subjectLine}
                      onChange={(e) => setTemplateForm({ ...templateForm, subjectLine: e.target.value })}
                      placeholder="e.g. ✦ Unveiling Timeless Diya Curations"
                      className="admin-input"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] uppercase font-bold tracking-wider text-black/45 block mb-1">Template Category *</label>
                    <select
                      value={templateForm.type}
                      onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value })}
                      className="admin-select"
                    >
                      <option value="marketing">Marketing Broadcast</option>
                      <option value="transactional">Transactional Notification</option>
                      <option value="engagement">Engagement Reminder</option>
                      <option value="system">Core System Code</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] uppercase font-bold tracking-wider text-black/45 block mb-1">Template HTML Content *</label>
                    <textarea
                      required
                      rows={10}
                      value={templateForm.htmlContent}
                      onChange={(e) => setTemplateForm({ ...templateForm, htmlContent: e.target.value })}
                      placeholder="<!-- Write HTML boilerplate with placeholder variables like {{name}} -->"
                      className="admin-textarea font-mono text-[12px]"
                    />
                    <p className="text-[9px] text-black/40 font-light mt-1">Available placeholders: <code>{"{{name}}"}</code>, <code>{"{{orderId}}"}</code>, <code>{"{{totalAmount}}"}</code>, <code>{"{{shippingAddress}}"}</code></p>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-[var(--admin-border-subtle)] mt-6">
                    <button
                      type="button"
                      onClick={handleCloseTemplateDrawer}
                      className="admin-btn admin-btn-outline flex-1 py-3 text-[11px] font-bold uppercase tracking-wider"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="admin-btn admin-btn-primary flex-[2] py-3 text-[11px] font-bold uppercase tracking-wider"
                    >
                      {isSubmitting ? "Saving..." : isEditingTemplate ? "Update Template" : "Add Design Template"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}
