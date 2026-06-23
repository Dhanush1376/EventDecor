import { m as motion } from 'framer-motion';
import { PageHeader, SkeletonDashboard, fadeUp, stagger } from '../components/AdminUIKit';
import { DraftStatusIndicator } from '../components/DraftStatusIndicator';
import { DraftRestoreModal } from '../components/DraftRestoreModal';
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard';
import { useState, useEffect, useCallback } from 'react';
import { userService, cmsService, notificationService } from '../../services/domainServices';
import { useAuth } from '../../context/AuthContext';
import { useAdmin } from '../context/AdminContext';
import toast from 'react-hot-toast';
import logger from '../../utils/core/logger';
import { getErrorMessage } from '../../utils/core/errorHelpers';
import { useDraft } from '../hooks/useDraft';

// Settings Panels
import { ProfilePanel } from '../components/settings/ProfilePanel';
import { BusinessPanel } from '../components/settings/BusinessPanel';
import { ShippingPanel } from '../components/settings/ShippingPanel';
import { BrandingPanel } from '../components/settings/BrandingPanel';
import { PaymentsPanel } from '../components/settings/PaymentsPanel';
import { WhatsAppPanel } from '../components/settings/WhatsAppPanel';
import { SecurityPanel } from '../components/settings/SecurityPanel';
import { EmailSmtpPanel } from '../components/settings/EmailSmtpPanel';

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
  const syncSettingsData = useCallback(async () => {
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
    } catch (_err) {
      logger.warn('Could not sync remote settings, using local configuration.');
    } finally {
      setLoading(false);
    }
  }, [authUser, setSettings]);

  useEffect(() => {
    const timer = setTimeout(() => {
      syncSettingsData();
    }, 0);
    return () => clearTimeout(timer);
  }, [syncSettingsData]);

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
            <ProfilePanel
              profileForm={profileForm}
              setProfileForm={setProfileForm}
              handleProfileSave={handleProfileSave}
              syncSettingsData={syncSettingsData}
              saving={saving}
            />
          )}

          {sectionsList[activeSection].id === 'business' && (
            <BusinessPanel
              settings={settings}
              setSettings={setSettings}
              handleGlobalSettingsSave={handleGlobalSettingsSave}
              syncSettingsData={syncSettingsData}
              saving={saving}
            />
          )}

          {sectionsList[activeSection].id === 'shipping' && (
            <ShippingPanel
              settings={settings}
              setSettings={setSettings}
              handleGlobalSettingsSave={handleGlobalSettingsSave}
              syncSettingsData={syncSettingsData}
              saving={saving}
            />
          )}

          {sectionsList[activeSection].id === 'branding' && (
            <BrandingPanel
              settings={settings}
              setSettings={setSettings}
              handleGlobalSettingsSave={handleGlobalSettingsSave}
              syncSettingsData={syncSettingsData}
              saving={saving}
            />
          )}

          {sectionsList[activeSection].id === 'payments' && (
            <PaymentsPanel
              settings={settings}
              setSettings={setSettings}
              handleGlobalSettingsSave={handleGlobalSettingsSave}
              syncSettingsData={syncSettingsData}
              saving={saving}
            />
          )}

          {sectionsList[activeSection].id === 'whatsapp' && (
            <WhatsAppPanel
              settings={settings}
              setSettings={setSettings}
              handleGlobalSettingsSave={handleGlobalSettingsSave}
              syncSettingsData={syncSettingsData}
              saving={saving}
            />
          )}

          {sectionsList[activeSection].id === 'security' && (
            <SecurityPanel
              safetyLock={safetyLock}
              toggleSafetyLock={toggleSafetyLock}
              maintenanceMode={maintenanceMode}
              toggleMaintenanceMode={toggleMaintenanceMode}
              autoPublish={autoPublish}
              toggleAutoPublish={toggleAutoPublish}
              idleTimeoutMinutes={idleTimeoutMinutes}
              changeIdleTimeout={changeIdleTimeout}
              auditLogs={auditLogs}
              clearAuditLogs={clearAuditLogs}
              handleBackupDownload={handleBackupDownload}
              auditSearchQuery={auditSearchQuery}
              setAuditSearchQuery={setAuditSearchQuery}
              auditActorFilter={auditActorFilter}
              setAuditActorFilter={setAuditActorFilter}
              handleHardReset={handleHardReset}
              resetCheck1={resetCheck1}
              setResetCheck1={setResetCheck1}
              resetCheck2={resetCheck2}
              setResetCheck2={setResetCheck2}
              resetCheck3={resetCheck3}
              setResetCheck3={setResetCheck3}
              resetCodePhrase={resetCodePhrase}
              setResetCodePhrase={setResetCodePhrase}
              resetExecuting={resetExecuting}
            />
          )}

          {sectionsList[activeSection].id === 'email' && (
            <EmailSmtpPanel
              testRecipientEmail={testRecipientEmail}
              setTestRecipientEmail={setTestRecipientEmail}
              handleSmtpTest={handleSmtpTest}
              testingSmtp={testingSmtp}
              smtpTestResult={smtpTestResult}
            />
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

export default AdminSettings;
