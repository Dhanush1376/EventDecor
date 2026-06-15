import { m as motion, AnimatePresence } from 'framer-motion';
import { fadeUp, stagger, SkeletonDashboard, PageHeader } from '../components/AdminUIKit';
import { DraftStatusIndicator } from '../components/DraftStatusIndicator';
import { DraftRestoreModal } from '../components/DraftRestoreModal';
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard';
import { useState, useEffect } from 'react';
import { userService, cmsService, notificationService } from '../../services/domainServices';
import { useAuth } from '../../context/AuthContext';
import { useAdmin } from '../context/AdminContext';
import toast from 'react-hot-toast';
import logger from '../../utils/logger';
import { getErrorMessage } from '../../utils/errorHelpers';
import { useDraft } from '../hooks/useDraft';

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
  const [resetCodePhrase, setResetCodePhrase] = useState('');
  const [resetCheck1, setResetCheck1] = useState(false);
  const [resetCheck2, setResetCheck2] = useState(false);
  const [resetCheck3, setResetCheck3] = useState(false);
  const [resetExecuting, setResetExecuting] = useState(false);

  // Search and Filters for Audit Logs
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditActorFilter, setAuditActorFilter] = useState('all');

  // SMTP Live Diagnostics State
  const [testRecipientEmail, setTestRecipientEmail] = useState('');
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState(null);

  const handleSmtpTest = async (e) => {
    e.preventDefault();
    setTestingSmtp(true);
    setSmtpTestResult(null);
    const testToast = toast.loading('Verifying SMTP connection and dispatching test email...');
    try {
      const res = await notificationService.testSmtp(testRecipientEmail);
      if (res.success) {
        toast.success('SMTP Diagnostic success! Test email dispatched.', { id: testToast });
        setSmtpTestResult({
          success: true,
          message: res.message,
          messageId: res.messageId,
          details: res.details,
        });
      } else {
        toast.error('SMTP Diagnostic failed. Check stack trace.', { id: testToast });
        setSmtpTestResult({
          success: false,
          message: res.message || 'Connection refused.',
          errorMessage: res.errorMessage || 'Unknown transport error.',
          details: res.details,
        });
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || error.message || 'Diagnostic request timed out.';
      const errorStack =
        error.response?.data?.errorMessage || error.response?.data?.errorStack || error.stack || '';
      toast.error(`SMTP Verification Failed: ${errorMsg}`, { id: testToast });
      setSmtpTestResult({
        success: false,
        message: errorMsg,
        errorMessage: errorStack,
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
    name: '',
    email: '',
    phone: '',
    role: 'manager',
  });

  // Dynamic Business & Portal Settings State
  const {
    formData: settings,
    setFormData: setSettings,
    draftStatus,
    showRestoreModal,
    restoreDraft,
    discardDraft,
    deleteDraft,
    lastSavedAt,
    blocker,
  } = useDraft({
    draftKey: 'admin:settings:global',
    module: 'Settings',
    pageTitle: 'Global Settings',
    initialData: {
      businessName: 'Siri Arts & Crafts',
      tagline: '',
      businessEmail: 'Sirisha.atmakuri@gmail.com',
      phoneNumber: '+91 98660 06648',
      gstNumber: 'GSTIN123456789',
      address: '#28-1-92, South Street, ONGOLE-523001, Prakasam District, Andhra Pradesh',
      primaryColor: 'var(--color-gold-dark)',
      secondaryColor: '#F8F9FB',
      fontFamily: 'Playfair Display + Inter',
      freeShippingThreshold: '2000',
      standardShippingFee: '99',
      expressShippingFee: '249',
      codFee: '90',
      deliveryEstimate: '5-7',
      razorpayKeyId: '',
      upiId: 'siriarts@upi',
      whatsappNumber: '+91 98660 06648',
      whatsappMessage: 'Hello! Thank you for reaching Siri Arts & Crafts.',
    },
    enabled: true,
  });

  const handleBackupDownload = () => {
    try {
      const dataStr =
        'data:text/json;charset=utf-8,' +
        encodeURIComponent(
          JSON.stringify(
            {
              exportedBy: activeRole.toUpperCase(),
              exportTimestamp: new Date().toISOString(),
              catalogProducts: products,
              contentConfiguration: websiteContent,
            },
            null,
            2,
          ),
        );
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `siri_catalog_db_backup_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      logAdminAction('BACKUP_DOWNLOAD', 'Catalog database local backup JSON exported');
      toast.success('Backup exported');
    } catch {
      toast.error('Failed to generate export file.');
    }
  };

  const handleHardReset = async (e) => {
    e.preventDefault();
    if (!resetCheck1 || !resetCheck2 || !resetCheck3) {
      toast.error('Wipe Protection: All three safeguard checkmarks must be acknowledged!');
      return;
    }
    if (resetCodePhrase !== 'CONFIRM HARD RESET') {
      toast.error('Wipe Protection: Passphrase matches failed!');
      return;
    }
    if (activeRole === 'viewer') {
      toast.error('Viewer Role: Access denied for hard wipe!');
      return;
    }
    if (activeRole === 'editor' || activeRole === 'manager') {
      toast.error('Access Denied: Only Owner class admins can reset database.');
      return;
    }
    if (safetyLock) {
      toast.error('Safety Lock Active: Database resets are blocked!');
      return;
    }

    setResetExecuting(true);
    const wipeToast = toast.loading('Resetting database...');
    try {
      await new Promise((r) => setTimeout(r, 2000));
      logAdminAction(
        'HARD_RESET_EXECUTED',
        'Database purged and reset to system defaults',
        'Success',
      );
      toast.success('Database reset to defaults', { id: wipeToast });

      setResetCheck1(false);
      setResetCheck2(false);
      setResetCheck3(false);
      setResetCodePhrase('');
    } catch {
      toast.error('Purge failure occurred.', { id: wipeToast });
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
            name: profRes.data.name || authUser?.name || 'Siri Master Admin',
            email: profRes.data.email || authUser?.email || 'admin@siriartsandcrafts.com',
            phone: profRes.data.phone || authUser?.phone || '+91 98660 06648',
            role: profRes.data.role || authUser?.role || 'admin',
          });
        } else {
          setProfileForm({
            name: authUser?.name || 'Siri Master Admin',
            email: authUser?.email || 'admin@siriartsandcrafts.com',
            phone: authUser?.phone || '+91 98660 06648',
            role: authUser?.role || 'admin',
          });
        }
      } catch {
        setProfileForm({
          name: authUser?.name || 'Siri Master Admin',
          email: authUser?.email || 'admin@siriartsandcrafts.com',
          phone: authUser?.phone || '+91 98660 06648',
          role: authUser?.role || 'admin',
        });
      }

      // 2. Sync Mongoose CMS settings
      try {
        const cmsRes = await cmsService.getSection('studio_settings');
        const rawSection = cmsRes?.data ?? cmsRes;
        const sectionData = rawSection?.data ?? rawSection;
        if (sectionData && typeof sectionData === 'object' && !Array.isArray(sectionData)) {
          const {
            razorpaySecret: _removed,
            razorpayKeySecret: _removedKey,
            ...safeSettings
          } = sectionData;
          setSettings((prev) => ({
            ...prev,
            ...safeSettings,
          }));
        }
      } catch {
        // silent fallback to default initial settings
      }
    } catch (err) {
      logger.warn('Could not sync remote settings, using local configuration.');
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
        phone: profileForm.phone,
      });
      if (res.success) {
        toast.success('Profile updated', {
          icon: '👤',
        });
        if (setAuthUser && res.data) {
          setAuthUser(res.data);
        }
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update profile details.'));
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
      const res = await cmsService.updateSection('studio_settings', settingsToSave);
      if (res) {
        await deleteDraft();
        toast.success('Settings saved', {
          icon: '⚙️',
        });
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to commit settings changes.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <SkeletonDashboard />;
  }

  // Settings structural layout
  const sectionsList = [
    { id: 'profile', title: 'Profile & Account', icon: 'person' },
    { id: 'business', title: 'Business Information', icon: 'store' },
    { id: 'shipping', title: 'Shipping & Fulfillment', icon: 'local_shipping' },
    { id: 'branding', title: 'Portal Visual Branding', icon: 'palette' },
    { id: 'payments', title: 'Payment Integrations', icon: 'payments' },
    { id: 'whatsapp', title: 'WhatsApp Automations', icon: 'chat' },
    { id: 'security', title: 'Security & Operations', icon: 'shield' },
    { id: 'email', title: 'Email & SMTP Diagnostics', icon: 'mail' },
  ];

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <PageHeader
        title="System Settings & Profile"
        subtitle="Administer your contact profile, business models, and secure API gateways"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Navigation Sidebar */}
        <motion.div
          variants={fadeUp}
          className="admin-card p-3 h-fit lg:sticky lg:top-24 space-y-1 admin-settings-nav"
        >
          {sectionsList.map((sec, i) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(i)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-[var(--admin-radius-lg)] text-left cursor-pointer transition-all ${
                activeSection === i
                  ? 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] font-bold shadow-sm'
                  : 'text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-subtle)] hover:text-[var(--admin-text-primary)]'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[18px] ${
                  activeSection === i
                    ? 'text-[var(--admin-text-primary)]'
                    : 'text-[var(--admin-text-tertiary)]'
                }`}
              >
                {sec.icon}
              </span>
              <span className="text-[13px]">{sec.title}</span>
            </button>
          ))}
        </motion.div>

        {/* Dynamic Panels Workspace */}
        <motion.div variants={fadeUp} className="admin-card p-6 md:p-8">
          {/* Header Description */}
          <div className="flex items-center gap-4 mb-8 pb-5 border-b border-[var(--admin-border-subtle)]">
            <div className="w-12 h-12 rounded-[var(--admin-radius-md)] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-text-primary)]">
              <span className="material-symbols-outlined text-[24px]">
                {sectionsList[activeSection].icon}
              </span>
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-[var(--admin-text-primary)] leading-tight">
                {sectionsList[activeSection].title}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-[12px] text-[var(--admin-text-secondary)] font-medium">
                  Update details for {sectionsList[activeSection].title} in database
                </p>
                {sectionsList[activeSection].id !== 'profile' &&
                  sectionsList[activeSection].id !== 'security' &&
                  sectionsList[activeSection].id !== 'email' && (
                    <DraftStatusIndicator status={draftStatus} lastSavedAt={lastSavedAt} />
                  )}
              </div>
            </div>
          </div>

          {/* Form Actions router */}
          {sectionsList[activeSection].id === 'profile' && (
            <form onSubmit={handleProfileSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="admin-label">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="admin-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="admin-label">Staff Designation (Read Only)</label>
                  <input
                    type="text"
                    disabled
                    value={profileForm.role.toUpperCase()}
                    className="admin-input bg-[var(--admin-surface-muted)] text-[var(--admin-text-tertiary)] cursor-not-allowed border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="admin-label">Verified Account Email Address</label>
                  <input
                    type="email"
                    required
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="admin-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="admin-label">Contact Phone Number</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                    className="admin-input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-8 border-t border-[var(--admin-border-subtle)]">
                <button
                  type="button"
                  onClick={syncSettingsData}
                  className="admin-btn admin-btn-outline h-10 border-transparent bg-transparent hover:bg-[var(--admin-surface-muted)]"
                >
                  Discard
                </button>
                <button type="submit" disabled={saving} className="admin-btn h-10">
                  {saving ? 'Saving...' : 'Save Profile Info'}
                </button>
              </div>
            </form>
          )}

          {sectionsList[activeSection].id === 'business' && (
            <form onSubmit={handleGlobalSettingsSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="admin-label">Business Name</label>
                  <input
                    type="text"
                    required
                    value={settings.businessName}
                    onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                    className="admin-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="admin-label">Brand Tagline</label>
                  <input
                    type="text"
                    value={settings.tagline}
                    onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                    className="admin-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="admin-label">Store Support Email</label>
                  <input
                    type="email"
                    value={settings.businessEmail}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        businessEmail: e.target.value,
                      })
                    }
                    className="admin-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="admin-label">Merchant GST Number</label>
                  <input
                    type="text"
                    value={settings.gstNumber}
                    onChange={(e) => setSettings({ ...settings, gstNumber: e.target.value })}
                    className="admin-input uppercase"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="admin-label">Corporate HQ / Workshop Address</label>
                <textarea
                  rows={2}
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="admin-textarea"
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-8 border-t border-[var(--admin-border-subtle)]">
                <button
                  type="button"
                  onClick={syncSettingsData}
                  className="admin-btn admin-btn-outline h-10 border-transparent bg-transparent hover:bg-[var(--admin-surface-muted)]"
                >
                  Discard
                </button>
                <button type="submit" disabled={saving} className="admin-btn h-10">
                  {saving ? 'Saving...' : 'Save Business Info'}
                </button>
              </div>
            </form>
          )}

          {sectionsList[activeSection].id === 'shipping' && (
            <form onSubmit={handleGlobalSettingsSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="admin-label">Free Shipping Threshold (₹)</label>
                  <input
                    type="number"
                    value={settings.freeShippingThreshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        freeShippingThreshold: e.target.value,
                      })
                    }
                    className="admin-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="admin-label">Standard Shipping Fee (₹)</label>
                  <input
                    type="number"
                    value={settings.standardShippingFee}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        standardShippingFee: e.target.value,
                      })
                    }
                    className="admin-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <label className="admin-label">Express Shipping Premium (₹)</label>
                  <input
                    type="number"
                    value={settings.expressShippingFee}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        expressShippingFee: e.target.value,
                      })
                    }
                    className="admin-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="admin-label flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">
                      account_balance_wallet
                    </span>
                    COD Handling Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={settings.codFee || '90'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        codFee: e.target.value,
                      })
                    }
                    className="admin-input focus:border-black"
                  />
                </div>
                <div className="space-y-2">
                  <label className="admin-label">Delivery Estimate Label</label>
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
                    className="admin-input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-8 border-t border-[var(--admin-border-subtle)]">
                <button
                  type="button"
                  onClick={syncSettingsData}
                  className="admin-btn admin-btn-outline h-10 border-transparent bg-transparent hover:bg-[var(--admin-surface-muted)]"
                >
                  Discard
                </button>
                <button type="submit" disabled={saving} className="admin-btn h-10">
                  {saving ? 'Saving...' : 'Save Shipping Config'}
                </button>
              </div>
            </form>
          )}

          {sectionsList[activeSection].id === 'branding' && (
            <form onSubmit={handleGlobalSettingsSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="admin-label">Primary Brand Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      className="w-12 h-12 rounded-[var(--admin-radius-md)] cursor-pointer border border-[var(--admin-border-subtle)] p-1 bg-[var(--admin-surface)]"
                    />
                    <input
                      type="text"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      className="admin-input flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="admin-label">Secondary Color Accent</label>
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
                      className="w-12 h-12 rounded-[var(--admin-radius-md)] cursor-pointer border border-[var(--admin-border-subtle)] p-1 bg-[var(--admin-surface)]"
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
                      className="admin-input flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="admin-label">System Font Family Settings</label>
                <input
                  type="text"
                  value={settings.fontFamily}
                  onChange={(e) => setSettings({ ...settings, fontFamily: e.target.value })}
                  className="admin-input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-8 border-t border-[var(--admin-border-subtle)]">
                <button
                  type="button"
                  onClick={syncSettingsData}
                  className="admin-btn admin-btn-outline h-10 border-transparent bg-transparent hover:bg-[var(--admin-surface-muted)]"
                >
                  Discard
                </button>
                <button type="submit" disabled={saving} className="admin-btn h-10">
                  {saving ? 'Saving...' : 'Save Brand Setup'}
                </button>
              </div>
            </form>
          )}

          {sectionsList[activeSection].id === 'payments' && (
            <form onSubmit={handleGlobalSettingsSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="admin-label">Razorpay Key ID</label>
                  <input
                    type="text"
                    value={settings.razorpayKeyId}
                    onChange={(e) => setSettings({ ...settings, razorpayKeyId: e.target.value })}
                    placeholder="e.g. rzp_live_xxxxxxxxxxxx"
                    className="admin-input"
                  />
                </div>
              </div>
              <div className="p-4 bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)]">
                <p className="text-[12px] text-[var(--admin-text-secondary)] font-medium leading-relaxed">
                  Razorpay secret keys are configured only via server environment variables (
                  <code className="bg-[var(--admin-bg-subtle)] px-1.5 py-0.5 rounded text-[11px] font-mono text-[var(--admin-text-primary)] mx-1">
                    RAZORPAY_KEY_SECRET
                  </code>
                  ,
                  <code className="bg-[var(--admin-bg-subtle)] px-1.5 py-0.5 rounded text-[11px] font-mono text-[var(--admin-text-primary)] mx-1">
                    RAZORPAY_WEBHOOK_SECRET
                  </code>
                  ). Use
                  <code className="bg-[var(--admin-bg-subtle)] px-1.5 py-0.5 rounded text-[11px] font-mono text-[var(--admin-text-primary)] mx-1">
                    VITE_RAZORPAY_KEY_ID
                  </code>{' '}
                  for the public checkout key.
                </p>
              </div>

              <div className="space-y-2">
                <label className="admin-label">Merchant UPI Settlement ID</label>
                <input
                  type="text"
                  value={settings.upiId}
                  onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
                  className="admin-input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-8 border-t border-[var(--admin-border-subtle)]">
                <button
                  type="button"
                  onClick={syncSettingsData}
                  className="admin-btn admin-btn-outline h-10 border-transparent bg-transparent hover:bg-[var(--admin-surface-muted)]"
                >
                  Discard
                </button>
                <button type="submit" disabled={saving} className="admin-btn h-10">
                  {saving ? 'Saving...' : 'Save Keys'}
                </button>
              </div>
            </form>
          )}

          {sectionsList[activeSection].id === 'whatsapp' && (
            <form onSubmit={handleGlobalSettingsSave} className="space-y-6">
              <div className="space-y-2">
                <label className="admin-label">WhatsApp Business Number</label>
                <input
                  type="tel"
                  value={settings.whatsappNumber}
                  onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                  placeholder="e.g. +91 98660 06648"
                  className="admin-input"
                />
              </div>

              <div className="space-y-2">
                <label className="admin-label">Default Click-to-Chat Message Template</label>
                <textarea
                  rows={4}
                  value={settings.whatsappMessage}
                  onChange={(e) => setSettings({ ...settings, whatsappMessage: e.target.value })}
                  className="admin-textarea"
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-8 border-t border-[var(--admin-border-subtle)]">
                <button
                  type="button"
                  onClick={syncSettingsData}
                  className="admin-btn admin-btn-outline h-10 border-transparent bg-transparent hover:bg-[var(--admin-surface-muted)]"
                >
                  Discard
                </button>
                <button type="submit" disabled={saving} className="admin-btn h-10">
                  {saving ? 'Saving...' : 'Save WhatsApp Rules'}
                </button>
              </div>
            </form>
          )}

          {sectionsList[activeSection].id === 'security' && (
            <div className="space-y-8">
              {/* Operational Controls Card */}
              <div className="bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-xl)] p-6">
                <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider mb-5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">
                    settings_applications
                  </span>
                  Operational Safeguards & Timing
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[var(--admin-radius-lg)]">
                    <div>
                      <h4 className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                        Global Safety Lock
                      </h4>
                      <p className="text-[11px] text-[var(--admin-text-secondary)] mt-0.5">
                        Restricts all write operations (Add, Edit, Delete) across the database
                        portal.
                      </p>
                    </div>
                    <button
                      onClick={toggleSafetyLock}
                      className={`w-11 h-6 rounded-full transition-colors duration-200 relative focus:outline-none cursor-pointer min-h-0 p-0 ${safetyLock ? 'bg-[var(--admin-accent)]' : 'bg-[var(--admin-border-strong)]'}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-[var(--admin-surface)] rounded-full transition-transform duration-200 shadow-sm ${safetyLock ? 'translate-x-5' : ''}`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[var(--admin-radius-lg)]">
                    <div>
                      <h4 className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                        Storefront Maintenance Mode
                      </h4>
                      <p className="text-[11px] text-[var(--admin-text-secondary)] mt-0.5">
                        Intercepts storefront traffic and displays a customizable maintenance mode
                        screen.
                      </p>
                    </div>
                    <button
                      onClick={toggleMaintenanceMode}
                      className={`w-11 h-6 rounded-full transition-colors duration-200 relative focus:outline-none cursor-pointer min-h-0 p-0 ${maintenanceMode ? 'bg-[var(--admin-accent)]' : 'bg-[var(--admin-border-strong)]'}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-[var(--admin-surface)] rounded-full transition-transform duration-200 shadow-sm ${maintenanceMode ? 'translate-x-5' : ''}`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[var(--admin-radius-lg)]">
                    <div>
                      <h4 className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                        Auto-Publish CMS Changes
                      </h4>
                      <p className="text-[11px] text-[var(--admin-text-secondary)] mt-0.5">
                        Instantly saves and publishes layout changes to the live database without
                        manual staging.
                      </p>
                    </div>
                    <button
                      onClick={toggleAutoPublish}
                      className={`w-11 h-6 rounded-full transition-colors duration-200 relative focus:outline-none cursor-pointer min-h-0 p-0 ${autoPublish ? 'bg-[var(--admin-accent)]' : 'bg-[var(--admin-border-strong)]'}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-[var(--admin-surface)] rounded-full transition-transform duration-200 shadow-sm ${autoPublish ? 'translate-x-5' : ''}`}
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] items-center gap-4 p-4 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[var(--admin-radius-lg)]">
                    <div>
                      <h4 className="text-[13px] font-bold text-[var(--admin-text-primary)]">
                        Session Idle Timeout Heartbeat
                      </h4>
                      <p className="text-[11px] text-[var(--admin-text-secondary)] mt-0.5">
                        Auto log out administrators after a period of inactive mouse/keyboard
                        activity.
                      </p>
                    </div>
                    <select
                      value={idleTimeoutMinutes}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        changeIdleTimeout(val);
                      }}
                      className="admin-input h-10 py-0"
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
              <div className="bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-xl)] p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">
                        receipt_long
                      </span>
                      Activity Log
                    </h3>
                    <p className="text-[11px] text-[var(--admin-text-secondary)] mt-1">
                      A history of admin actions and changes
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBackupDownload}
                      className="admin-btn admin-btn-outline h-9 px-4"
                    >
                      <span className="material-symbols-outlined text-[14px]">download</span>
                      Backup JSON
                    </button>
                    <button
                      onClick={clearAuditLogs}
                      className="admin-btn h-9 px-4 bg-[var(--admin-error-light)] text-[var(--admin-error)] border-none hover:bg-[var(--admin-error)] hover:text-white"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete_sweep</span>
                      Clear Logs
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-3 mb-5">
                  <div className="relative">
                    <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] absolute left-3 top-2.5">
                      search
                    </span>
                    <input
                      type="text"
                      placeholder="Search audit trail logs..."
                      value={auditSearchQuery}
                      onChange={(e) => setAuditSearchQuery(e.target.value)}
                      className="admin-input pl-10 h-10"
                    />
                  </div>
                  <select
                    value={auditActorFilter}
                    onChange={(e) => setAuditActorFilter(e.target.value)}
                    className="admin-input h-10 py-0"
                  >
                    <option value="all">All Actors</option>
                    <option value="owner">Owner Actions</option>
                    <option value="manager">Manager Actions</option>
                    <option value="editor">Editor Actions</option>
                    <option value="system">System logs</option>
                  </select>
                </div>

                {/* Audit Logs Table */}
                <div className="border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar">
                  <table className="admin-table w-full min-w-[700px]">
                    <thead className="sticky top-0 bg-[var(--admin-surface-muted)] z-10">
                      <tr>
                        <th className="pl-4">Timestamp</th>
                        <th>Actor</th>
                        <th>Event</th>
                        <th>Details</th>
                        <th className="pr-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-[11px]">
                      {auditLogs
                        .filter((log) => {
                          const matchesSearch =
                            log.details?.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
                            log.action?.toLowerCase().includes(auditSearchQuery.toLowerCase());
                          const matchesActor =
                            auditActorFilter === 'all' ||
                            log.actor?.toLowerCase() === auditActorFilter.toLowerCase();
                          return matchesSearch && matchesActor;
                        })
                        .map((log) => (
                          <tr
                            key={log.id}
                            className="hover:bg-[var(--admin-surface-muted)] transition-colors"
                          >
                            <td className="pl-4 text-[var(--admin-text-secondary)] whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </td>
                            <td className="font-bold text-[var(--admin-text-primary)]">
                              {log.actor}
                            </td>
                            <td className="font-bold text-[var(--admin-accent)]">{log.action}</td>
                            <td
                              className="text-[var(--admin-text-secondary)] max-w-[200px] truncate"
                              title={log.details}
                            >
                              {log.details}
                            </td>
                            <td className="pr-4">
                              <span className="admin-badge admin-badge-neutral text-[9px] font-bold h-5 px-1.5 uppercase tracking-wider">
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      {auditLogs.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-10 text-center text-[var(--admin-text-tertiary)] font-sans text-[12px]"
                          >
                            No recent activity.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Database Wiping Lockout Safeguard */}
              <div className="bg-[#fff1f2] border border-[#fecdd3] rounded-[var(--admin-radius-xl)] p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-10 h-10 rounded-[var(--admin-radius-md)] bg-[#ffe4e6] flex items-center justify-center text-[#e11d48] shrink-0">
                    <span className="material-symbols-outlined text-[20px]">warning</span>
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-[#9f1239] uppercase tracking-wider leading-tight mt-0.5">
                      Danger Zone: Database Hard Reset Gate
                    </h3>
                    <p className="text-[12px] text-[#e11d48] mt-1.5 font-medium leading-relaxed">
                      Resets the entire store to default settings.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleHardReset} className="space-y-4">
                  <div className="space-y-2.5">
                    <label
                      htmlFor="reset-check-1"
                      className="flex items-start gap-3 cursor-pointer select-none"
                    >
                      <input
                        id="reset-check-1"
                        type="checkbox"
                        checked={resetCheck1}
                        onChange={(e) => setResetCheck1(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-[#fecdd3] text-[#e11d48] focus:ring-[#fecdd3] cursor-pointer"
                      />
                      <span className="text-[12px] text-[#9f1239] font-bold">
                        I understand that hard resetting database data is completely irreversible.
                      </span>
                    </label>

                    <label
                      htmlFor="reset-check-2"
                      className="flex items-start gap-3 cursor-pointer select-none"
                    >
                      <input
                        id="reset-check-2"
                        type="checkbox"
                        checked={resetCheck2}
                        onChange={(e) => setResetCheck2(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-[#fecdd3] text-[#e11d48] focus:ring-[#fecdd3] cursor-pointer"
                      />
                      <span className="text-[12px] text-[#9f1239] font-bold">
                        I have downloaded a catalog backup configuration file to my local machine.
                      </span>
                    </label>

                    <label
                      htmlFor="reset-check-3"
                      className="flex items-start gap-3 cursor-pointer select-none"
                    >
                      <input
                        id="reset-check-3"
                        type="checkbox"
                        checked={resetCheck3}
                        onChange={(e) => setResetCheck3(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-[#fecdd3] text-[#e11d48] focus:ring-[#fecdd3] cursor-pointer"
                      />
                      <span className="text-[12px] text-[#9f1239] font-bold">
                        I confirm that my preview role credentials match Owner privileges.
                      </span>
                    </label>
                  </div>

                  <div className="space-y-2 pt-4">
                    <label
                      htmlFor="reset-passphrase-input"
                      className="block text-[11px] uppercase tracking-wider text-[#e11d48] font-bold"
                    >
                      Enter phrase "CONFIRM HARD RESET" to unlock
                    </label>
                    <input
                      id="reset-passphrase-input"
                      type="text"
                      placeholder="Type the passphrase exactly..."
                      value={resetCodePhrase}
                      onChange={(e) => setResetCodePhrase(e.target.value)}
                      className="w-full bg-[var(--admin-surface)] border border-[#fecdd3] focus:border-[#e11d48] rounded-[var(--admin-radius-lg)] px-4 py-3 text-[13px] outline-none transition-all font-mono font-bold text-center uppercase"
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={
                        resetExecuting ||
                        resetCodePhrase !== 'CONFIRM HARD RESET' ||
                        !resetCheck1 ||
                        !resetCheck2 ||
                        !resetCheck3
                      }
                      className="admin-btn h-11 bg-[#e11d48] hover:bg-[#be123c] text-white border-none disabled:bg-[#ffe4e6] disabled:text-[#fda4af]"
                    >
                      {resetExecuting ? (
                        'Executing Wipe...'
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[16px]">
                            delete_forever
                          </span>
                          Wipe Database & Restore Defaults
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {sectionsList[activeSection].id === 'email' && (
            <div className="space-y-6">
              <div className="bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-xl)] p-6">
                <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                  SMTP Configurations Check
                </h3>
                <p className="text-[12px] text-[var(--admin-text-secondary)] mt-1.5 font-medium leading-relaxed">
                  Inspect whether the mandatory environment variables for transactional mailing are
                  correctly loaded on this platform.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="flex items-center justify-between bg-[var(--admin-surface)] border border-[var(--admin-border)] p-4 rounded-[var(--admin-radius-lg)] shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                      SMTP Host
                    </span>
                    <span className="text-[13px] font-bold text-[var(--admin-text-primary)] font-mono">
                      smtp.gmail.com
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-[var(--admin-surface)] border border-[var(--admin-border)] p-4 rounded-[var(--admin-radius-lg)] shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                      SMTP Port
                    </span>
                    <span className="text-[13px] font-bold text-[var(--admin-text-primary)] font-mono">
                      587
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-[var(--admin-surface)] border border-[var(--admin-border)] p-4 rounded-[var(--admin-radius-lg)] shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                      Transporter SSL Bypass
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-[var(--admin-success-light)] text-[var(--admin-success)]">
                      rejectUnauthorized: false
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-[var(--admin-surface)] border border-[var(--admin-border)] p-4 rounded-[var(--admin-radius-lg)] shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">
                      Encryption Layer
                    </span>
                    <span className="text-[13px] font-bold text-[var(--admin-text-primary)] font-mono">
                      STARTTLS
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-xl)] p-6 shadow-sm space-y-5">
                <div>
                  <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                    Run Connection Verification
                  </h3>
                  <p className="text-[12px] text-[var(--admin-text-secondary)] mt-1.5 font-medium leading-relaxed">
                    Send a premium luxury test email to verify correct SMTP handshake, domain
                    signing (SPF/DKIM/DMARC), and server socket connectivity.
                  </p>
                </div>

                <form onSubmit={handleSmtpTest} className="space-y-4">
                  <div className="space-y-2">
                    <label className="admin-label">Recipient Test Email Address</label>
                    <div className="flex gap-3">
                      <input
                        type="email"
                        required
                        placeholder="e.g. admin@siriartsandcrafts.com"
                        value={testRecipientEmail}
                        onChange={(e) => setTestRecipientEmail(e.target.value)}
                        className="admin-input flex-1"
                      />
                      <button
                        type="submit"
                        disabled={testingSmtp}
                        className="admin-btn h-11 shrink-0 px-6"
                      >
                        {testingSmtp ? (
                          'Verifying...'
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[16px]">send</span>
                            Verify Transporter
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>

                <AnimatePresence mode="wait">
                  {smtpTestResult && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`rounded-[var(--admin-radius-lg)] border p-5 mt-5 ${
                        smtpTestResult.success
                          ? 'bg-[var(--admin-success-light)] border-[#bbf7d0]'
                          : 'bg-[#fff1f2] border-[#fecdd3]'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <span
                          className={`material-symbols-outlined text-[24px] ${
                            smtpTestResult.success ? 'text-[#16a34a]' : 'text-[#e11d48]'
                          }`}
                        >
                          {smtpTestResult.success ? 'check_circle' : 'error'}
                        </span>
                        <div className="space-y-3 w-full">
                          <div>
                            <h4
                              className={`text-[14px] font-bold ${smtpTestResult.success ? 'text-[#166534]' : 'text-[#9f1239]'}`}
                            >
                              {smtpTestResult.success
                                ? 'Test email sent'
                                : 'SMTP Connection Failed'}
                            </h4>
                            <p
                              className={`text-[12px] font-medium mt-1 ${smtpTestResult.success ? 'text-[#15803d]' : 'text-[#be123c]'}`}
                            >
                              {smtpTestResult.message}
                            </p>
                          </div>

                          {!smtpTestResult.success && smtpTestResult.errorMessage && (
                            <div className="bg-[#ffe4e6] border border-[#fecdd3] rounded-[var(--admin-radius-md)] p-4 font-mono text-[11px] leading-relaxed break-all text-[#9f1239]">
                              <strong className="block mb-1">Diagnostic Stack:</strong>{' '}
                              {smtpTestResult.errorMessage}
                            </div>
                          )}

                          {smtpTestResult.success && smtpTestResult.details && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#bbf7d0] text-[12px] text-[#15803d]">
                              <div>
                                <strong>Message ID:</strong>{' '}
                                <span className="font-mono text-[11px] break-all ml-1 bg-white/40 px-1.5 py-0.5 rounded">
                                  {smtpTestResult.messageId}
                                </span>
                              </div>
                              <div>
                                <strong>SMTP Account:</strong>{' '}
                                <span className="font-mono text-[11px] ml-1 bg-white/40 px-1.5 py-0.5 rounded">
                                  {smtpTestResult.details.user}
                                </span>
                              </div>
                              <div>
                                <strong>Target Host:</strong>{' '}
                                <span className="font-mono text-[11px] ml-1 bg-white/40 px-1.5 py-0.5 rounded">
                                  {smtpTestResult.details.host}:{smtpTestResult.details.port}
                                </span>
                              </div>
                              <div>
                                <strong>Recipient:</strong>{' '}
                                <span className="font-mono text-[11px] ml-1 bg-white/40 px-1.5 py-0.5 rounded">
                                  {smtpTestResult.details.recipient}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <DraftRestoreModal
        isOpen={showRestoreModal}
        onRestore={restoreDraft}
        onDiscard={discardDraft}
        moduleName="Settings"
        lastSavedAt={lastSavedAt}
      />

      <UnsavedChangesGuard blocker={blocker} />
    </motion.div>
  );
}
