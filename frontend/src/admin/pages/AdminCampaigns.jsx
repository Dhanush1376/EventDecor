import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { notificationService } from "../../services/domainServices";
import toast from "react-hot-toast";
import { AdminToggle } from "../components/AdminUIKit";

import logger from '../../utils/logger';
const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

export function AdminCampaigns() {
  const [activeTab, setActiveTab] = useState("broadcasts"); // broadcasts | templates | new
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        toast.success("Marketing campaign draft compiled successfully!", {
          icon: "✦",
          style: {
            background: "#FFFFFF",
            color: "#000000",
            border: "1px solid rgba(0, 0, 0, 0.05)",
            fontFamily: "inherit",
          },
        });
        
        // Reset form & transition
        setCampaignForm({
          title: "",
          subject: "",
          templateId: "",
          customHtml: "",
          targetRole: "all",
          consentedOnly: true,
        });
        setActiveTab("broadcasts");
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
        toast.success("Broadcast queued successfully! Executing dispatches in background.");
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
        toast.success(isEditingTemplate?._id ? "Email template updated successfully!" : "Template created!");
        setIsEditingTemplate(null);
        setTemplateForm({ name: "", subjectLine: "", htmlContent: "", type: "marketing" });
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

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      className="max-w-[1300px] mx-auto space-y-6 pb-20 font-body text-on-surface"
    >
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-black/5 pb-4 gap-4">
        <div>
          <h2 className="text-[26px] font-bold text-on-surface font-display">
            Marketing Campaigns & Curation
          </h2>
          <p className="text-[13px] text-outline">
            Administer customer email dispatches, draft holiday newsletters, and track live link-click open rates
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-full text-xs">
            {[
              { id: "broadcasts", label: "Broadcast Hub", icon: "campaign" },
              { id: "templates", label: "Design Curation", icon: "brush" },
              { id: "new", label: "Launch Terminal", icon: "add_circle" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsEditingTemplate(null);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-label uppercase text-[9px] tracking-wider font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-white text-black shadow-sm"
                    : "text-black/55 hover:text-black"
                }`}
              >
                <span className="material-symbols-outlined text-[15px] normal-case">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics Summary Bar */}
      {analytics && activeTab === "broadcasts" && (
        <motion.div 
          variants={fadeUp}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            { label: "Total Emails Dispatched", value: analytics.overview.totalDispatched, sub: "All time transaction + marketing", icon: "mail" },
            { label: "Unique Opens", value: analytics.overview.totalOpened, sub: `Open rate of ${analytics.overview.openRate}`, icon: "drafts" },
            { label: "Click redrafts", value: analytics.overview.totalClicks, sub: "Secure tracker redirects", icon: "ads_click" },
            { label: "Subscribers Opted-in", value: analytics.overview.newsletterSubscribers, sub: `Across ${analytics.overview.visitorConsentProfiles} consent keys`, icon: "mark_email_read" }
          ].map((item, idx) => (
            <div key={idx} className="bg-white border border-black/5 p-5 rounded-3xl shadow-sm flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-stone-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-black text-lg">{item.icon}</span>
              </div>
              <div>
                <span className="text-[9px] text-black/45 font-label uppercase tracking-widest block font-sans">{item.label}</span>
                <h4 className="text-xl font-bold text-black font-display mt-0.5">{item.value}</h4>
                <p className="text-[10px] text-black/40 font-light mt-0.5">{item.sub}</p>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Tab Content Panels */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <div className="bg-white border border-black/5 p-20 rounded-3xl text-center space-y-3 shadow-sm">
            <div className="w-8 h-8 border-2 border-black/20 border-t-black rounded-full animate-spin mx-auto" />
            <p className="text-black/55 font-label text-[9px] uppercase tracking-widest font-bold">Decrypting campaign analytics...</p>
          </div>
        ) : activeTab === "broadcasts" ? (
          <motion.div
            key="broadcasts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {campaigns.length === 0 ? (
              <div className="bg-white border border-black/5 p-12 rounded-3xl text-center flex flex-col items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-black/20 text-[48px] mb-2">search_off</span>
                <h3 className="text-sm font-bold text-black font-display">Data Not Found</h3>
                <p className="text-[12px] text-black/40 font-light mt-1 mb-4">No campaigns designed yet. You can easily craft a customized broadcast using our pre-seeded premium templates.</p>
                <button
                  onClick={() => setActiveTab("new")}
                  className="bg-black text-white hover:bg-stone-900 rounded-full px-5 py-2.5 font-label uppercase text-[9px] tracking-wider font-bold shadow-md hover:shadow-lg transition-colors cursor-pointer active:scale-95"
                >
                  Create Campaign
                </button>
              </div>
            ) : (
              <div className="bg-white border border-black/5 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-stone-50 border-b border-black/5 text-black/55 font-label uppercase text-[9px] tracking-wider font-bold">
                        <th className="p-4 font-semibold">Campaign Details</th>
                        <th className="p-4 font-semibold">Audience Rules</th>
                        <th className="p-4 font-semibold">Current Status</th>
                        <th className="p-4 font-semibold text-center">Analytics / Logs</th>
                        <th className="p-4 font-semibold text-right">Dispatch Control</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {campaigns.map((camp) => (
                        <tr key={camp._id} className="hover:bg-stone-50/50 transition-colors">
                          <td className="p-4">
                            <strong className="text-black font-bold text-sm block font-display">{camp.title}</strong>
                            <span className="text-[11px] text-black/45 block font-light mt-0.5">Subject: {camp.subject}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-[9px] bg-stone-100 text-stone-700 font-label uppercase tracking-widest font-bold px-2.5 py-0.5 rounded-full">
                              {camp.targetAudience.role}
                            </span>
                            {camp.targetAudience.consentedOnly && (
                              <span className="text-[9px] text-black/60 font-medium block mt-1">✦ Checked Consent Only</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                              camp.status === "sent" ? "bg-emerald-50 text-emerald-700" :
                              camp.status === "sending" ? "bg-amber-50 text-amber-700 animate-pulse" :
                              camp.status === "scheduled" ? "bg-slate-100 text-blue-700" :
                              "bg-stone-100 text-stone-600"
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
                                  <strong className="text-stone-700 font-bold text-sm block font-mono">{camp.stats.clickCount}</strong>
                                  <span className="text-[9px] text-black/40 block">Clicks</span>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            {camp.status === "draft" && (
                              <button
                                onClick={() => handleSendTrigger(camp._id)}
                                className="bg-black hover:bg-stone-900 text-white rounded-full px-4 py-2 font-label uppercase text-[9px] tracking-widest font-bold transition-all shadow-md hover:shadow-lg cursor-pointer active:scale-95"
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
            )}
          </motion.div>
        ) : activeTab === "templates" ? (
          <motion.div
            key="templates"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Template Form / Editor */}
            <div className="lg:col-span-1 bg-white border border-black/5 p-6 rounded-3xl space-y-4 shadow-sm self-start">
              <div className="flex items-center justify-between border-b border-black/5 pb-2">
                <h3 className="font-display font-bold text-base text-black">
                  {isEditingTemplate ? "Edit Template Copies" : "Seed Custom Design"}
                </h3>
                {isEditingTemplate && (
                  <button
                    onClick={() => {
                      setIsEditingTemplate(null);
                      setTemplateForm({ name: "", subjectLine: "", htmlContent: "", type: "marketing" });
                    }}
                    className="text-[9px] uppercase tracking-wider text-black/40 hover:text-black font-bold"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <form onSubmit={handleTemplateUpdate} className="space-y-3.5">
                <div>
                  <label className="text-[9px] uppercase font-bold tracking-wider text-black/45 block mb-1">Template Name</label>
                  <input
                    type="text"
                    required
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="e.g. Festive Urli Launch"
                    className="w-full bg-[#F8F9FB]/40 rounded-xl px-4 py-2.5 text-[13px] outline-none border border-neutral-200 focus:border-[#000000] focus:bg-white transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="text-[9px] uppercase font-bold tracking-wider text-black/45 block mb-1">Subject Fallback</label>
                  <input
                    type="text"
                    value={templateForm.subjectLine}
                    onChange={(e) => setTemplateForm({ ...templateForm, subjectLine: e.target.value })}
                    placeholder="e.g. ✦ Unveiling Timeless Diya Curations"
                    className="w-full bg-[#F8F9FB]/40 rounded-xl px-4 py-2.5 text-[13px] outline-none border border-neutral-200 focus:border-[#000000] focus:bg-white transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="text-[9px] uppercase font-bold tracking-wider text-black/45 block mb-1">Template Category</label>
                  <select
                    value={templateForm.type}
                    onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value })}
                    className="w-full bg-[#F8F9FB]/40 rounded-xl px-4 py-2.5 text-[13px] outline-none border border-neutral-200 focus:border-[#000000] focus:bg-white transition-all font-medium"
                  >
                    <option value="marketing">Marketing Broadcast</option>
                    <option value="transactional">Transactional Notification</option>
                    <option value="engagement">Engagement Reminder</option>
                    <option value="system">Core System Code</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] uppercase font-bold tracking-wider text-black/45 block mb-1">Template HTML Content</label>
                  <textarea
                    required
                    rows={8}
                    value={templateForm.htmlContent}
                    onChange={(e) => setTemplateForm({ ...templateForm, htmlContent: e.target.value })}
                    placeholder="<!-- Write HTML boilerplate with placeholder variables like {{name}} -->"
                    className="w-full bg-[#F8F9FB]/40 rounded-xl px-4 py-2.5 text-[13px] outline-none border border-neutral-200 focus:border-[#000000] focus:bg-white transition-all font-mono"
                  />
                  <p className="text-[9px] text-black/40 font-light mt-1">Available placeholders: <code>{"{{name}}"}</code>, <code>{"{{orderId}}"}</code>, <code>{"{{totalAmount}}"}</code>, <code>{"{{shippingAddress}}"}</code>, <code>{"{{frontend_url}}"}</code></p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-black hover:bg-stone-900 text-white rounded-full py-3 font-label uppercase text-[10px] tracking-widest font-bold transition-all shadow-md hover:shadow-lg cursor-pointer active:scale-95 text-center"
                >
                  {isSubmitting ? "Saving..." : isEditingTemplate ? "Update Template" : "Add Design Template"}
                </button>
              </form>
            </div>

            {/* Seeded Templates Grid */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-display font-bold text-base text-black px-1">Seeded Luxury Layouts</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {templates.map((temp) => (
                  <div key={temp._id} className="bg-white border border-black/5 rounded-3xl p-5 flex flex-col justify-between shadow-sm">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] bg-[#F8F9FB] border border-black/5 text-black/55 font-label uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                          {temp.type}
                        </span>
                        {!temp.isActive && (
                          <span className="text-[8px] bg-red-50 text-red-600 font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">Draft</span>
                        )}
                      </div>
                      
                      <strong className="text-black font-display font-bold text-xs block">{temp.name}</strong>
                      <p className="text-[10px] text-black/40 font-light mt-1 italic">
                        Subject: "{temp.subjectLine || 'N/A'}"
                      </p>
                    </div>

                    <div className="flex items-center gap-2 border-t border-black/5 pt-3 mt-4">
                      <button
                        onClick={() => {
                          setIsEditingTemplate(temp);
                          setTemplateForm({
                            name: temp.name,
                            subjectLine: temp.subjectLine || "",
                            htmlContent: temp.htmlContent,
                            type: temp.type,
                          });
                        }}
                        className="px-3 py-2 rounded-xl border border-black/10 hover:border-black text-[9px] font-label uppercase tracking-wider font-bold transition-all text-black hover:bg-black hover:text-white flex-1 text-center cursor-pointer"
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
                        className="px-3 py-2 rounded-xl border border-transparent bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-black text-[9px] font-label uppercase tracking-wider font-bold transition-all flex-1 text-center cursor-pointer"
                      >
                        Preview Canvas
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="new"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Form */}
            <div className="bg-white border border-black/5 p-6 rounded-3xl shadow-sm self-start space-y-4">
              <h3 className="font-display font-bold text-base text-black border-b border-black/5 pb-2">
                Draft Marketing Campaign
              </h3>
              
              <form onSubmit={handleLaunchCampaign} className="space-y-4">
                <div>
                  <label className="text-[9px] uppercase font-bold tracking-wider text-black/45 block mb-1">Campaign Title</label>
                  <input
                    type="text"
                    required
                    value={campaignForm.title}
                    onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                    placeholder="e.g. Diwali Urli Launch & Diyas Promo"
                    className="w-full bg-[#F8F9FB]/40 rounded-xl px-4 py-2.5 text-[13px] outline-none border border-neutral-200 focus:border-[#000000] focus:bg-white transition-all font-medium"
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
                    className="w-full bg-[#F8F9FB]/40 rounded-xl px-4 py-2.5 text-[13px] outline-none border border-neutral-200 focus:border-[#000000] focus:bg-white transition-all font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] uppercase font-bold tracking-wider text-black/45 block mb-1">Audience Type</label>
                    <select
                      value={campaignForm.targetRole}
                      onChange={(e) => setCampaignForm({ ...campaignForm, targetRole: e.target.value })}
                      className="w-full bg-[#F8F9FB]/40 rounded-xl px-4 py-2.5 text-[13px] outline-none border border-neutral-200 focus:border-[#000000] focus:bg-white transition-all font-medium"
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
                      className="w-full bg-[#F8F9FB]/40 rounded-xl px-4 py-2.5 text-[13px] outline-none border border-neutral-200 focus:border-[#000000] focus:bg-white transition-all font-medium"
                    >
                      <option value="">-- Custom HTML / No Template --</option>
                      {templates.map(t => (
                        <option key={t._id} value={t._id}>{t.name} ({t.type})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-stone-50 border border-black/5 px-4.5 py-3 rounded-2xl">
                  <AdminToggle
                    label="Enforce GDPR/ePrivacy Consent"
                    description="Highly Recommended. Only sends marketing alerts to visitors who explicitly checked marketingEmails or accepted notifications."
                    checked={campaignForm.consentedOnly}
                    onChange={() => setCampaignForm({ ...campaignForm, consentedOnly: !campaignForm.consentedOnly })}
                  />
                </div>

                {!campaignForm.templateId && (
                  <div>
                    <label className="text-[9px] uppercase font-bold tracking-wider text-black/45 block mb-1">Custom Newsletter HTML Copy</label>
                    <textarea
                      rows={6}
                      value={campaignForm.customHtml}
                      onChange={(e) => setCampaignForm({ ...campaignForm, customHtml: e.target.value })}
                      placeholder="<!-- Paste complete raw HTML email newsletter copy here -->"
                      className="w-full bg-[#F8F9FB]/40 rounded-xl px-4 py-2.5 text-[13px] outline-none border border-neutral-200 focus:border-[#000000] focus:bg-white transition-all font-mono"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-black hover:bg-stone-900 text-white rounded-full py-3 font-label uppercase text-[10px] tracking-widest font-bold transition-all shadow-md hover:shadow-lg cursor-pointer active:scale-95 text-center"
                >
                  {isSubmitting ? "Compiling..." : "Save Campaign Draft"}
                </button>
              </form>
            </div>

            {/* Live Canvas Preview */}
            <div className="bg-white border border-black/5 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-display font-bold text-base text-black border-b border-black/5 pb-2 mb-4">
                  Visual Canvas Preview
                </h3>
                
                {previewHtml ? (
                  <div className="border border-black/5 rounded-2xl overflow-hidden bg-stone-50 p-4">
                    <div className="bg-white rounded-xl p-2.5 mb-3 border border-black/5">
                      <p className="text-[10px] text-black/40 font-mono">
                        <span className="font-bold text-black">Subject:</span> {campaignForm.subject || "✦ Siri Arts Splendors"}
                      </p>
                    </div>
                    <div 
                      className="border border-black/5 rounded-xl overflow-y-auto max-h-[350px] bg-white shadow-inner"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  </div>
                ) : (
                  <div className="border border-dashed border-black/10 rounded-2xl p-16 text-center text-black/40 font-light text-xs">
                    <span className="material-symbols-outlined text-[36px] mb-2 text-black/20">visibility</span>
                    <p>Select a pre-seeded template or type custom HTML to generate an instant visual canvas review.</p>
                  </div>
                )}
              </div>

              <div className="bg-stone-50 p-4 rounded-2xl border border-black/5 mt-6">
                <span className="text-[9px] font-bold text-black uppercase tracking-wider block font-sans">Auto-rewriter active</span>
                <p className="text-[9.5px] text-black/40 font-light leading-relaxed mt-1">
                  On broadcast, Siri Arts Campaign dispatcher will automatically inject a unique 1x1 tracking pixel to compute open rates and rewrite all anchor links to support secure tracking redirects.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
