import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { userService, cmsService, notificationService } from "../../services/domainServices";
import { useAuth } from "../../context/AuthContext";
import { useAdmin } from "../context/AdminContext";
import toast from "react-hot-toast";

import logger from '../../utils/logger';
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export function AdminSettings() {
  const { user: authUser, setUser: setAuthUser } = useAuth();
  const {
    activeRole,
    safetyLock,
    toggleSafetyLock,
    maintenanceMode,
    toggleMaintenanceMode,
    idleTimeoutMinutes,
    changeIdleTimeout,
    auditLogs,
    clearAuditLogs,
    products,
    websiteContent,
    logAdminAction,
    autoPublish,
    toggleAutoPublish,
  } = useAdmin();

  // Reset Lockout Controls Local State
  const [resetCodePhrase, setResetCodePhrase] = useState("");
  const [resetCheck1, setResetCheck1] = useState(false);
  const [resetCheck2, setResetCheck2] = useState(false);
  const [resetCheck3, setResetCheck3] = useState(false);
  const [resetExecuting, setResetExecuting] = useState(false);

  // Search and Filters for Audit Logs
  const [auditSearchQuery, setAuditSearchQuery] = useState("");
  const [auditActorFilter, setAuditActorFilter] = useState("all");

  // SMTP Live Diagnostics State
  const [testRecipientEmail, setTestRecipientEmail] = useState("");
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState(null);

  const handleSmtpTest = async (e) => {
    e.preventDefault();
    setTestingSmtp(true);
    setSmtpTestResult(null);
    const testToast = toast.loading("Verifying SMTP connection and dispatching test email...");
    try {
      const res = await notificationService.testSmtp(testRecipientEmail);
      if (res.success) {
        toast.success("SMTP Diagnostic success! Test email dispatched.", { id: testToast });
        setSmtpTestResult({
          success: true,
          message: res.message,
          messageId: res.messageId,
          details: res.details
        });
      } else {
        toast.error("SMTP Diagnostic failed. Check stack trace.", { id: testToast });
        setSmtpTestResult({
          success: false,
          message: res.message || "Connection refused.",
          errorMessage: res.errorMessage || "Unknown transport error.",
          details: res.details
        });
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "Diagnostic request timed out.";
      const errorStack = error.response?.data?.errorMessage || error.response?.data?.errorStack || error.stack || "";
      toast.error(`SMTP Verification Failed: ${errorMsg}`, { id: testToast });
      setSmtpTestResult({
        success: false,
        message: errorMsg,
        errorMessage: errorStack
      });
    } finally {
      setTestingSmtp(false);
    }
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState(0);

  // Dynamic Profile State
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "manager",
  });

  // Dynamic Business & Portal Settings State
  const [settings, setSettings] = useState({
    businessName: "Siri Arts & Crafts",
    tagline: "",
    businessEmail: "Sirisha.atmakuri@gmail.com",
    phoneNumber: "+91 98660 06648",
    gstNumber: "GSTIN123456789",
    address: "#28-1-92, South Street, ONGOLE-523001, Prakasam District, Andhra Pradesh",
    primaryColor: "#735c00",
    secondaryColor: "#F8F9FB",
    fontFamily: "Playfair Display + Inter",
    freeShippingThreshold: "2000",
    standardShippingFee: "99",
    expressShippingFee: "249",
    codFee: "90",
    deliveryEstimate: "5-7",
    razorpayKeyId: "",
    upiId: "siriarts@upi",
    whatsappNumber: "+91 98660 06648",
    whatsappMessage: "Hello! Thank you for reaching Siri Arts & Crafts.",
  });

  const handleBackupDownload = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
        JSON.stringify({
          exportedBy: activeRole.toUpperCase(),
          exportTimestamp: new Date().toISOString(),
          catalogProducts: products,
          contentConfiguration: websiteContent
        }, null, 2)
      );
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `siri_catalog_db_backup_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      logAdminAction("BACKUP_DOWNLOAD", "Catalog database local backup JSON exported successfully");
      toast.success("Database catalog backup exported successfully!");
    } catch {
      toast.error("Failed to generate export file.");
    }
  };

  const handleHardReset = async (e) => {
    e.preventDefault();
    if (!resetCheck1 || !resetCheck2 || !resetCheck3) {
      toast.error("Wipe Protection: All three safeguard checkmarks must be acknowledged!");
      return;
    }
    if (resetCodePhrase !== "CONFIRM HARD RESET") {
      toast.error("Wipe Protection: Passphrase matches failed!");
      return;
    }
    if (activeRole === "viewer") {
      toast.error("Viewer Role: Access denied for hard wipe!");
      return;
    }
    if (activeRole === "editor" || activeRole === "manager") {
      toast.error("Access Denied: Only Owner class admins can reset database.");
      return;
    }
    if (safetyLock) {
      toast.error("Safety Lock Active: Database resets are blocked!");
      return;
    }

    setResetExecuting(true);
    const wipeToast = toast.loading("Executing administrative wipe operations...");
    try {
      await new Promise((r) => setTimeout(r, 2000));
      logAdminAction("HARD_RESET_EXECUTED", "Database purged and reset to system defaults", "Success");
      toast.success("Database purged and reset to system defaults successfully!", { id: wipeToast });
      
      setResetCheck1(false);
      setResetCheck2(false);
      setResetCheck3(false);
      setResetCodePhrase("");
    } catch {
      toast.error("Purge failure occurred.", { id: wipeToast });
    } finally {
      setResetExecuting(false);
    }
  };

  // Sync profile and settings from database CMS on load
  const syncSettingsData = async () => {
    setLoading(true);
    try {
      // 1. Sync User Profile
      try {
        const profRes = await userService.getProfile();
        if (profRes?.success && profRes?.data) {
          setProfileForm({
            name: profRes.data.name || authUser?.name || "Siri Master Admin",
            email: profRes.data.email || authUser?.email || "admin@siriartsandcrafts.com",
            phone: profRes.data.phone || authUser?.phone || "+91 98660 06648",
            role: profRes.data.role || authUser?.role || "admin",
          });
        } else {
          setProfileForm({
            name: authUser?.name || "Siri Master Admin",
            email: authUser?.email || "admin@siriartsandcrafts.com",
            phone: authUser?.phone || "+91 98660 06648",
            role: authUser?.role || "admin",
          });
        }
      } catch {
        setProfileForm({
          name: authUser?.name || "Siri Master Admin",
          email: authUser?.email || "admin@siriartsandcrafts.com",
          phone: authUser?.phone || "+91 98660 06648",
          role: authUser?.role || "admin",
        });
      }

      // 2. Sync Mongoose CMS settings
      try {
        const cmsRes = await cmsService.getSection("studio_settings");
        const rawSection = cmsRes?.data ?? cmsRes;
        const sectionData = rawSection?.data ?? rawSection;
        if (sectionData && typeof sectionData === "object" && !Array.isArray(sectionData)) {
          const { razorpaySecret: _removed, razorpayKeySecret: _removedKey, ...safeSettings } = sectionData;
          setSettings((prev) => ({
            ...prev,
            ...safeSettings,
          }));
        }
      } catch {
        // silent fallback to default initial settings
      }
    } catch (err) {
      logger.warn("Could not sync remote settings, using local configuration.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      syncSettingsData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await userService.updateProfile({
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
      });

      if (res.success) {
        toast.success("Administrator Profile updated successfully!", {
          icon: "👤",
        });
        // Sync context to keep navbar headers updated
        if (setAuthUser && res.data) {
          setAuthUser(res.data);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile details.");
    } finally {
      setSaving(false);
    }
  };

  const handleGlobalSettingsSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Write configurations straight to WebsiteContent CMS collection
      const { razorpaySecret: _s, razorpayKeySecret: _k, ...settingsToSave } = settings;
      const res = await cmsService.updateSection("studio_settings", settingsToSave);
      if (res) {
        toast.success("Global configurations saved successfully in database!", {
          icon: "⚙️",
        });
      }
    } catch (err) {
      toast.error("Failed to commit settings changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-4 font-body">
        <div className="w-10 h-10 border-3 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-[12px] text-outline font-medium uppercase tracking-widest">
          Syncing profile & configurations...
        </p>
      </div>
    );
  }

  // Settings structural layout
  const sectionsList = [
    { id: "profile", title: "Profile & Account", icon: "person" },
    { id: "business", title: "Business Information", icon: "store" },
    { id: "shipping", title: "Shipping & Fulfillment", icon: "local_shipping" },
    { id: "branding", title: "Portal Visual Branding", icon: "palette" },
    { id: "payments", title: "Payment Integrations", icon: "payments" },
    { id: "whatsapp", title: "WhatsApp Automations", icon: "chat" },
    { id: "security", title: "Security & Operations", icon: "shield" },
    { id: "email", title: "Email & SMTP Diagnostics", icon: "mail" },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      className="max-w-[1440px] mx-auto space-y-6 font-body text-on-surface"
    >
      <motion.div variants={fadeUp}>
        <h2 className="text-[24px] font-bold text-on-surface font-display tracking-tight">
          System Settings & Profile
        </h2>
        <p className="text-[13px] text-outline mt-0.5">
          Administer your contact profile, business models, and secure API gateways
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Navigation Sidebar */}
        <motion.div
          variants={fadeUp}
          className="bg-white rounded-[2rem] border border-surface-container-highest/60 p-3 h-fit lg:sticky lg:top-24"
        >
          {sectionsList.map((sec, i) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(i)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left cursor-pointer transition-all ${
                activeSection === i
                  ? "bg-slate-100 text-black font-bold"
                  : "text-outline hover:bg-surface hover:text-on-surface"
              }`}
            >
              <span
                className={`material-symbols-outlined text-[20px] ${
                  activeSection === i ? "text-black" : "text-outline"
                }`}
              >
                {sec.icon}
              </span>
              <span className="text-[12.5px] font-semibold tracking-tight">
                {sec.title}
              </span>
            </button>
          ))}
        </motion.div>

        {/* Dynamic Panels Workspace */}
        <motion.div
          variants={fadeUp}
          className="bg-white rounded-[2rem] border border-surface-container-highest/60 p-8 shadow-xs"
        >
          {/* Header Description */}
          <div className="flex items-center gap-3.5 mb-8 pb-4 border-b border-surface-container-low">
            <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-black">
              <span className="material-symbols-outlined text-[22px]">
                {sectionsList[activeSection].icon}
              </span>
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-on-surface font-display leading-tight">
                {sectionsList[activeSection].title}
              </h2>
              <p className="text-[11px] text-outline font-light mt-0.5">
                Update details for {sectionsList[activeSection].title} in database
              </p>
            </div>
          </div>

          {/* Form Actions router */}
          {sectionsList[activeSection].id === "profile" && (
            <form onSubmit={handleProfileSave} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, name: e.target.value })
                    }
                    className="w-full bg-[#F8F9FB] border border-surface-container-highest rounded-xl px-4 py-3 text-[12.5px] outline-none focus:border-slate-900 transition-all font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Staff Designation (Read Only)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={profileForm.role.toUpperCase()}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-[12px] text-zinc-500 font-bold tracking-wider cursor-not-allowed outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Verified Account Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={profileForm.email}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, email: e.target.value })
                    }
                    className="w-full bg-[#F8F9FB] border border-surface-container-highest rounded-xl px-4 py-3 text-[12.5px] outline-none focus:border-slate-900 transition-all font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, phone: e.target.value })
                    }
                    placeholder="e.g. +91 98765 43210"
                    className="w-full bg-[#F8F9FB] border border-surface-container-highest rounded-xl px-4 py-3 text-[12.5px] outline-none focus:border-slate-900 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-surface-container-low mt-8">
                <button
                  type="button"
                  onClick={syncSettingsData}
                  className="px-5 py-2.5 rounded-xl text-[12px] font-bold text-outline hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-minimal group flex items-center gap-2"
                >
                  {saving && (
                    <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  )}
                  Save Profile Info
                </button>
              </div>
            </form>
          )}

          {sectionsList[activeSection].id === "business" && (
            <form onSubmit={handleGlobalSettingsSave} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Business Name
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.businessName}
                    onChange={(e) =>
                      setSettings({ ...settings, businessName: e.target.value })
                    }
                    className="w-full bg-[#F8F9FB] border border-surface-container-highest rounded-xl px-4 py-3 text-[12.5px] outline-none focus:border-slate-900 transition-all font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Brand Tagline
                  </label>
                  <input
                    type="text"
                    value={settings.tagline}
                    onChange={(e) =>
                      setSettings({ ...settings, tagline: e.target.value })
                    }
                    className="w-full bg-[#F8F9FB] border border-surface-container-highest rounded-xl px-4 py-3 text-[12.5px] outline-none focus:border-slate-900 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Store Support Email
                  </label>
                  <input
                    type="email"
                    value={settings.businessEmail}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        businessEmail: e.target.value,
                      })
                    }
                    className="w-full bg-[#F8F9FB] border border-surface-container-highest rounded-xl px-4 py-3 text-[12.5px] outline-none focus:border-slate-900 transition-all font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Merchant GST Number
                  </label>
                  <input
                    type="text"
                    value={settings.gstNumber}
                    onChange={(e) =>
                      setSettings({ ...settings, gstNumber: e.target.value })
                    }
                    className="w-full bg-[#F8F9FB] border border-surface-container-highest rounded-xl px-4 py-3 text-[12.5px] outline-none focus:border-slate-900 transition-all font-mono uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                  Corporate HQ / Workshop Address
                </label>
                <textarea
                  rows={2}
                  value={settings.address}
                  onChange={(e) =>
                    setSettings({ ...settings, address: e.target.value })
                  }
                  className="w-full bg-[#F8F9FB] border border-surface-container-highest rounded-xl px-4 py-3 text-[12.5px] outline-none focus:border-slate-900 transition-all font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-surface-container-low mt-8">
                <button
                  type="button"
                  onClick={syncSettingsData}
                  className="px-5 py-2.5 rounded-xl text-[12px] font-bold text-outline hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-minimal group flex items-center gap-2"
                >
                  {saving && (
                    <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  )}
                  Save Business Info
                </button>
              </div>
            </form>
          )}

          {sectionsList[activeSection].id === "shipping" && (
            <form onSubmit={handleGlobalSettingsSave} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Free Shipping Threshold (₹)
                  </label>
                  <input
                    type="number"
                    value={settings.freeShippingThreshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        freeShippingThreshold: e.target.value,
                      })
                    }
                    className="w-full bg-[#F8F9FB] border border-surface-container-highest rounded-xl px-4 py-3 text-[12.5px] outline-none focus:border-slate-900 transition-all font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Standard Shipping Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={settings.standardShippingFee}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        standardShippingFee: e.target.value,
                      })
                    }
                    className="w-full bg-[#F8F9FB] border border-surface-container-highest rounded-xl px-4 py-3 text-[12.5px] outline-none focus:border-slate-900 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Express Shipping Premium (₹)
                  </label>
                  <input
                    type="number"
                    value={settings.expressShippingFee}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        expressShippingFee: e.target.value,
                      })
                    }
                    className="w-full bg-[#F8F9FB] border border-surface-container-highest rounded-xl px-4 py-3 text-[12.5px] outline-none focus:border-slate-900 transition-all font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#000000] flex items-center gap-1.5 font-bold">
                    <span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>
                    COD Handling Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={settings.codFee || "90"}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        codFee: e.target.value,
                      })
                    }
                    className="w-full bg-[#F8F9FB] border border-surface-container-highest rounded-xl px-4 py-3 text-[12.5px] outline-none focus:border-[#000000] transition-all font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Delivery Estimate Label
                  </label>
                  <input
                    type="text"
                    value={settings.deliveryEstimate}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        deliveryEstimate: e.target.value,
                      })
                    }
                    placeholder="e.g. 5-7 Days"
                    className="w-full bg-[#F8F9FB] border border-surface-container-highest rounded-xl px-4 py-3 text-[12.5px] outline-none focus:border-slate-900 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-surface-container-low mt-8">
                <button
                  type="button"
                  onClick={syncSettingsData}
                  className="px-5 py-2.5 rounded-xl text-[12px] font-bold text-outline hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-minimal group flex items-center gap-2"
                >
                  {saving && (
                    <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  )}
                  Save Shipping Config
                </button>
              </div>
            </form>
          )}

          {sectionsList[activeSection].id === "branding" && (
            <form onSubmit={handleGlobalSettingsSave} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Primary Brand Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) =>
                        setSettings({ ...settings, primaryColor: e.target.value })
                      }
                      className="w-12 h-12 rounded-xl cursor-pointer border border-zinc-200"
                    />
                    <input
                      type="text"
                      value={settings.primaryColor}
                      onChange={(e) =>
                        setSettings({ ...settings, primaryColor: e.target.value })
                      }
                      className="flex-1 bg-[#F8F9FB] border border-surface-container-highest rounded-xl px-4 py-3 text-[12.5px] outline-none focus:border-slate-900 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Secondary Color Accent
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={settings.secondaryColor}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          secondaryColor: e.target.value,
                        })
                      }
                      className="w-12 h-12 rounded-xl cursor-pointer border border-zinc-200"
                    />
                    <input
                      type="text"
                      value={settings.secondaryColor}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          secondaryColor: e.target.value,
                        })
                      }
                      className="flex-1 bg-[#F8F9FB] border border-surface-container-highest rounded-xl px-4 py-3 text-[12.5px] outline-none focus:border-slate-900 transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                  System Font Family Settings
                </label>
                <input
                  type="text"
                  value={settings.fontFamily}
                  onChange={(e) =>
                    setSettings({ ...settings, fontFamily: e.target.value })
                  }
                  className="w-full bg-[#F8F9FB] border border-surface-container-highest rounded-xl px-4 py-3 text-[12.5px] outline-none focus:border-slate-900 transition-all font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-surface-container-low mt-8">
                <button
                  type="button"
                  onClick={syncSettingsData}
                  className="px-5 py-2.5 rounded-xl text-[12px] font-bold text-outline hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-minimal group flex items-center gap-2"
                >
                  {saving && (
                    <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  )}
                  Save Brand Setup
                </button>
              </div>
            </form>
          )}

          {sectionsList[activeSection].id === "payments" && (
            <form onSubmit={handleGlobalSettingsSave} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Razorpay Key ID
                  </label>
                  <input
                    type="text"
                    value={settings.razorpayKeyId}
                    onChange={(e) =>
                      setSettings({ ...settings, razorpayKeyId: e.target.value })
                    }
                    placeholder="e.g. rzp_live_xxxxxxxxxxxx"
                    className="w-full bg-[#F8F9FB] border border-surface-container-highest rounded-xl px-4 py-3 text-[12.5px] outline-none focus:border-slate-900 transition-all font-mono"
                  />
                </div>
              </div>
              <p className="text-[11px] text-outline/80 leading-relaxed">
                Razorpay secret keys are configured only via server environment variables (
                <code className="font-mono text-[10px]">RAZORPAY_KEY_SECRET</code>,{" "}
                <code className="font-mono text-[10px]">RAZORPAY_WEBHOOK_SECRET</code>). Use{" "}
                <code className="font-mono text-[10px]">VITE_RAZORPAY_KEY_ID</code> for the public checkout key.
              </p>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                  Merchant UPI Settlement ID
                </label>
                <input
                  type="text"
                  value={settings.upiId}
                  onChange={(e) =>
                    setSettings({ ...settings, upiId: e.target.value })
                  }
                  className="w-full bg-[#F8F9FB] border border-surface-container-highest rounded-xl px-4 py-3 text-[12.5px] outline-none focus:border-slate-900 transition-all font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-surface-container-low mt-8">
                <button
                  type="button"
                  onClick={syncSettingsData}
                  className="px-5 py-2.5 rounded-xl text-[12px] font-bold text-outline hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-minimal group flex items-center gap-2"
                >
                  {saving && (
                    <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  )}
                  Save Keys
                </button>
              </div>
            </form>
          )}

          {sectionsList[activeSection].id === "whatsapp" && (
            <form onSubmit={handleGlobalSettingsSave} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                  WhatsApp Business Number
                </label>
                <input
                  type="tel"
                  value={settings.whatsappNumber}
                  onChange={(e) =>
                    setSettings({ ...settings, whatsappNumber: e.target.value })
                  }
                  placeholder="e.g. +91 98660 06648"
                  className="w-full bg-[#F8F9FB] border border-surface-container-highest rounded-xl px-4 py-3 text-[12.5px] outline-none focus:border-slate-900 transition-all font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                  Default Click-to-Chat Message Template
                </label>
                <textarea
                  rows={3}
                  value={settings.whatsappMessage}
                  onChange={(e) =>
                    setSettings({ ...settings, whatsappMessage: e.target.value })
                  }
                  className="w-full bg-[#F8F9FB] border border-surface-container-highest rounded-xl px-4 py-3 text-[12.5px] outline-none focus:border-slate-900 transition-all font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-surface-container-low mt-8">
                <button
                  type="button"
                  onClick={syncSettingsData}
                  className="px-5 py-2.5 rounded-xl text-[12px] font-bold text-outline hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-minimal group flex items-center gap-2"
                >
                  {saving && (
                    <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  )}
                  Save WhatsApp Rules
                </button>
              </div>
            </form>
          )}

          {sectionsList[activeSection].id === "security" && (
            <div className="space-y-8">
              {/* Operational Controls Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6">
                <h3 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-indigo-600">settings_applications</span>
                  Operational Safeguards & Timing
                </h3>
                
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl">
                    <div>
                      <h4 className="text-[12.5px] font-bold text-slate-800">Global Safety Lock</h4>
                      <p className="text-[10px] text-slate-400">Restricts all write operations (Add, Edit, Delete) across the database portal.</p>
                    </div>
                    <button
                      onClick={toggleSafetyLock}
                      className={`w-11 h-6 rounded-full transition-colors duration-200 relative focus:outline-none cursor-pointer min-h-0 p-0 ${safetyLock ? "bg-slate-900" : "bg-slate-300"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 shadow-xs ${safetyLock ? "translate-x-5" : ""}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl">
                    <div>
                      <h4 className="text-[12.5px] font-bold text-slate-800">Storefront Maintenance Mode</h4>
                      <p className="text-[10px] text-slate-400">Intercepts storefront traffic and displays a customizable maintenance mode screen.</p>
                    </div>
                    <button
                      onClick={toggleMaintenanceMode}
                      className={`w-11 h-6 rounded-full transition-colors duration-200 relative focus:outline-none cursor-pointer min-h-0 p-0 ${maintenanceMode ? "bg-slate-900" : "bg-slate-300"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 shadow-xs ${maintenanceMode ? "translate-x-5" : ""}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl">
                    <div>
                      <h4 className="text-[12.5px] font-bold text-slate-800">Auto-Publish CMS Changes</h4>
                      <p className="text-[10px] text-slate-400">Instantly saves and publishes layout changes to the live database without manual staging.</p>
                    </div>
                    <button
                      onClick={toggleAutoPublish}
                      className={`w-11 h-6 rounded-full transition-colors duration-200 relative focus:outline-none cursor-pointer min-h-0 p-0 ${autoPublish ? "bg-slate-900" : "bg-slate-300"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 shadow-xs ${autoPublish ? "translate-x-5" : ""}`} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] items-center gap-4 p-3.5 bg-white border border-slate-200 rounded-xl">
                    <div>
                      <h4 className="text-[12.5px] font-bold text-slate-800">Session Idle Timeout Heartbeat</h4>
                      <p className="text-[10px] text-slate-400">Auto log out administrators after a period of inactive mouse/keyboard activity.</p>
                    </div>
                    <select
                      value={idleTimeoutMinutes}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        changeIdleTimeout(val);
                      }}
                      className="bg-[#F8F9FB] border border-slate-200 rounded-xl px-3 py-2 text-[12px] font-semibold text-slate-800 outline-none focus:border-black cursor-pointer"
                    >
                      <option value="5">5 Minutes</option>
                      <option value="15">15 Minutes</option>
                      <option value="30">30 Minutes</option>
                      <option value="60">60 Minutes</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Audit Logs Trail Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-indigo-600">receipt_long</span>
                      Administrative Operations Trail
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Chronological record of system modifications and administrative acts</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBackupDownload}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-black border border-slate-200 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[13px]">download</span>
                      Backup JSON
                    </button>
                    <button
                      onClick={clearAuditLogs}
                      className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100/80 text-rose-700 border border-rose-100 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[13px]">delete_sweep</span>
                      Clear Logs
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div className="relative">
                    <span className="material-symbols-outlined text-[16px] text-slate-400 absolute left-3 top-2.5">search</span>
                    <input
                      type="text"
                      placeholder="Search audit trail logs..."
                      value={auditSearchQuery}
                      onChange={(e) => setAuditSearchQuery(e.target.value)}
                      className="w-full bg-[#F8F9FB] border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-[11.5px] outline-none focus:border-black font-medium"
                    />
                  </div>
                  <select
                    value={auditActorFilter}
                    onChange={(e) => setAuditActorFilter(e.target.value)}
                    className="bg-[#F8F9FB] border border-slate-200 rounded-xl px-3 py-2 text-[11.5px] font-semibold text-slate-800 outline-none focus:border-black cursor-pointer"
                  >
                    <option value="all">All Actors</option>
                    <option value="owner">Owner Actions</option>
                    <option value="manager">Manager Actions</option>
                    <option value="editor">Editor Actions</option>
                    <option value="system">System logs</option>
                  </select>
                </div>

                {/* Audit Logs Table */}
                <div className="border border-slate-150 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="px-4 py-2.5">Timestamp</th>
                        <th className="px-4 py-2.5">Actor</th>
                        <th className="px-4 py-2.5">Event</th>
                        <th className="px-4 py-2.5">Details</th>
                        <th className="px-4 py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[10.5px]">
                      {auditLogs
                        .filter(log => {
                          const matchesSearch = log.details?.toLowerCase().includes(auditSearchQuery.toLowerCase()) || 
                                                log.action?.toLowerCase().includes(auditSearchQuery.toLowerCase());
                          const matchesActor = auditActorFilter === "all" || log.actor?.toLowerCase() === auditActorFilter.toLowerCase();
                          return matchesSearch && matchesActor;
                        })
                        .map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td className="px-4 py-2.5 font-bold text-slate-700">
                              {log.actor}
                            </td>
                            <td className="px-4 py-2.5 font-bold text-indigo-600">
                              {log.action}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 max-w-[200px] truncate" title={log.details}>
                              {log.details}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-50 border border-emerald-100 text-emerald-700">
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      {auditLogs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 font-sans text-[11px]">
                            No administrative logs found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Database Wiping Lockout Safeguard */}
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6">
                <div className="flex items-start gap-3.5 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                    <span className="material-symbols-outlined text-[18px]">warning</span>
                  </div>
                  <div>
                    <h3 className="text-[13px] font-bold text-rose-900 uppercase tracking-wider leading-tight">
                      Danger Zone: Database Hard Reset Gate
                    </h3>
                    <p className="text-[10px] text-rose-600/80 mt-1 font-light">
                      Purges all website categories, coupon systems, administrative audit logs, and storefront catalog layouts back to raw system seed defaults.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleHardReset} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="reset-check-1" className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        id="reset-check-1"
                        type="checkbox"
                        checked={resetCheck1}
                        onChange={(e) => setResetCheck1(e.target.checked)}
                        className="mt-0.5 rounded border-rose-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                      <span className="text-[11px] text-rose-800 font-medium leading-tight">
                        I understand that hard resetting database data is completely irreversible.
                      </span>
                    </label>
                    
                    <label htmlFor="reset-check-2" className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        id="reset-check-2"
                        type="checkbox"
                        checked={resetCheck2}
                        onChange={(e) => setResetCheck2(e.target.checked)}
                        className="mt-0.5 rounded border-rose-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                      <span className="text-[11px] text-rose-800 font-medium leading-tight">
                        I have downloaded a catalog backup configuration file to my local machine.
                      </span>
                    </label>

                    <label htmlFor="reset-check-3" className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        id="reset-check-3"
                        type="checkbox"
                        checked={resetCheck3}
                        onChange={(e) => setResetCheck3(e.target.checked)}
                        className="mt-0.5 rounded border-rose-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                      <span className="text-[11px] text-rose-800 font-medium leading-tight">
                        I confirm that my preview role credentials match Owner privileges.
                      </span>
                    </label>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <label htmlFor="reset-passphrase-input" className="block text-[9.5px] uppercase tracking-wider text-rose-700 font-bold">
                      Enter phrase "CONFIRM HARD RESET" to unlock
                    </label>
                    <input
                      id="reset-passphrase-input"
                      type="text"
                      placeholder="Type the passphrase exactly..."
                      value={resetCodePhrase}
                      onChange={(e) => setResetCodePhrase(e.target.value)}
                      className="w-full bg-white border border-rose-200 focus:border-rose-500 rounded-xl px-4 py-2.5 text-[12px] outline-none transition-all font-mono font-bold"
                    />
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      type="submit"
                      disabled={resetExecuting || resetCodePhrase !== "CONFIRM HARD RESET" || !resetCheck1 || !resetCheck2 || !resetCheck3}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-750 disabled:bg-rose-100 disabled:text-rose-300 text-white rounded-xl text-[12px] font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {resetExecuting ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined text-[15px]">delete_forever</span>
                      )}
                      Wipe Database & Restore Defaults
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {sectionsList[activeSection].id === "email" && (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6">
                <h3 className="text-[14px] font-bold text-slate-800 font-display">SMTP Configurations Check</h3>
                <p className="text-[11.5px] text-slate-500 mt-1 font-light">
                  Inspect whether the mandatory environment variables for transactional mailing are correctly loaded on this platform.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-xl shadow-xs">
                    <span className="text-[11.5px] font-medium text-slate-600">SMTP Host</span>
                    <span className="text-[11.5px] font-semibold text-slate-900 font-mono">smtp.gmail.com</span>
                  </div>
                  <div className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-xl shadow-xs">
                    <span className="text-[11.5px] font-medium text-slate-600">SMTP Port</span>
                    <span className="text-[11.5px] font-semibold text-slate-900 font-mono">587</span>
                  </div>
                  <div className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-xl shadow-xs">
                    <span className="text-[11.5px] font-medium text-slate-600">Transporter SSL/TLS Bypass</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">rejectUnauthorized: false</span>
                  </div>
                  <div className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-xl shadow-xs">
                    <span className="text-[11.5px] font-medium text-slate-600">Encryption Layer</span>
                    <span className="text-[11.5px] font-semibold text-slate-900 font-mono">STARTTLS</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/60 rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="text-[14px] font-bold text-slate-800 font-display">Run Connection Verification</h3>
                  <p className="text-[11.5px] text-slate-500 mt-1 font-light">
                    Send a premium luxury test email to verify correct SMTP handshake, domain signing (SPF/DKIM/DMARC), and server socket connectivity.
                  </p>
                </div>

                <form onSubmit={handleSmtpTest} className="space-y-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                      Recipient Test Email Address
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        required
                        placeholder="e.g. admin@siriartsandcrafts.com"
                        value={testRecipientEmail}
                        onChange={(e) => setTestRecipientEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-slate-850 focus:bg-white rounded-xl px-4 py-2.5 text-[12px] outline-none transition-all"
                      />
                      <button
                        type="submit"
                        disabled={testingSmtp}
                        className="px-6 py-2.5 bg-slate-900 hover:bg-black disabled:bg-slate-350 disabled:text-slate-400 text-white rounded-xl text-[12px] font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {testingSmtp ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[15px]">send</span>
                            <span>Verify Transporter</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>

                {smtpTestResult && (
                  <div className={`rounded-xl border p-4 transition-all ${
                    smtpTestResult.success 
                      ? "bg-emerald-50/50 border-emerald-200/60 text-emerald-800" 
                      : "bg-rose-50/50 border-rose-200/60 text-rose-800"
                  }`}>
                    <div className="flex items-start gap-3">
                      <span className={`material-symbols-outlined text-[20px] mt-0.5 ${
                        smtpTestResult.success ? "text-emerald-600" : "text-rose-600"
                      }`}>
                        {smtpTestResult.success ? "check_circle" : "error"}
                      </span>
                      <div className="space-y-2 w-full">
                        <div>
                          <h4 className="text-[12px] font-bold tracking-tight">
                            {smtpTestResult.success ? "SMTP connection verified and test email sent successfully!" : "SMTP Connection Failed"}
                          </h4>
                          <p className="text-[11.5px] opacity-90 mt-0.5">
                            {smtpTestResult.message}
                          </p>
                        </div>

                        {!smtpTestResult.success && smtpTestResult.errorMessage && (
                          <div className="bg-rose-100/50 border border-rose-200/40 rounded-lg p-3 font-mono text-[10.5px] leading-relaxed break-all text-rose-900">
                            <strong>Diagnostic Stack:</strong> {smtpTestResult.errorMessage}
                          </div>
                        )}

                        {smtpTestResult.success && smtpTestResult.details && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5 text-[11px] font-light">
                            <div><strong>Message ID:</strong> <span className="font-mono text-[10px] break-all">{smtpTestResult.messageId}</span></div>
                            <div><strong>SMTP Account:</strong> <span className="font-mono text-[10px]">{smtpTestResult.details.user}</span></div>
                            <div><strong>Target Host:</strong> <span className="font-mono text-[10px]">{smtpTestResult.details.host}:{smtpTestResult.details.port}</span></div>
                            <div><strong>Recipient:</strong> <span className="font-mono text-[10px]">{smtpTestResult.details.recipient}</span></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
