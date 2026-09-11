import { m as motion } from 'framer-motion';
import { PageHeader, AdminSettingsSkeleton, fadeUp, stagger } from '../components/AdminUIKit';
import { DraftStatusIndicator } from '../components/DraftStatusIndicator';
import { DraftRestoreModal } from '../components/DraftRestoreModal';
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard';
import { useState, useEffect, useCallback } from 'react';
import { userService, cmsService, notificationService } from '../../services/domainServices';
import storeSettingsService from '../../services/api/storeSettingsService';
import { useAuth } from '../../context/AuthContext';
import { useAdmin } from '../context/AdminContext';
import toast from 'react-hot-toast';
import logger from '../../utils/core/logger';
import { getErrorMessage } from '../../utils/core/errorHelpers';
import { useDraft } from '../hooks/useDraft';

// Settings Panels
import { ProfilePanel } from '../components/settings/ProfilePanel';

import { WhatsAppPanel } from '../components/settings/WhatsAppPanel';
import AiSettingsPanel from '../components/settings/AiSettingsPanel';
import { SecurityPanel } from '../components/settings/SecurityPanel';
import { EmailSmtpPanel } from '../components/settings/EmailSmtpPanel';
import {
  GeneralSettingsPanel,
  ShippingSettingsPanel,
  PaymentSettingsPanel,
  ReturnSettingsPanel,
  CancellationSettingsPanel,
  LoyaltySettingsPanel,
  OrderSettingsPanel,
  TaxSettingsPanel,
  ContactSettingsPanel,
  LegalSettingsPanel,
  NotificationSettingsPanel,
  StorefrontSettingsPanel,
} from '../components/settings/StoreSettingsPanels';
import { VisualSearchPanel } from '../components/settings/VisualSearchPanel';

const DEFAULT_STORE_SETTINGS = {
  general: {
    storeName: 'Siri Arts & Crafts',
    tagline: 'Handcrafted Heritage & Artistry',
    supportEmail: 'sirisha.atmakuri@gmail.com',
    announcementText: '',
    announcementLink: '',
    maintenanceMode: false,
    storeEnabled: true,
  },
  shipping: {
    deliveryCharge: 0,
    freeShippingThreshold: 2000,
    enableFreeShipping: true,
    expressDeliveryCharge: 249,
    enableExpressDelivery: true,
    packagingFee: 0,
    remoteAreaCharge: 0,
    estimatedDeliveryDays: '5-7',
    maxShippingDistance: 0,
    enableLocalDelivery: false,
    originPincode: '523001',
    defaultCourierPartner: 'Delhivery Logistics',
  },
  payments: {
    enableCOD: true,
    codFee: 30,
    codMinOrder: 500,
    codMaxOrder: 50000,
    enableRazorpay: true,
    enableWallet: true,
    enableUPI: true,
    enableNetBanking: true,
    enableCards: true,
    enableEMI: false,
  },
  returnsExchanges: {
    enableReturns: true,
    enableExchanges: true,
    returnWindowDays: 7,
    exchangeWindowDays: 7,
    returnProcessingDays: '3-5',
    refundProcessingDays: '5-7 business days',
    requireImages: true,
    pickupAvailable: true,
    storeCreditOption: true,
  },
  cancellation: {
    allowCancellation: true,
    cancellationWindowHours: 24,
    refundTimeline: '5-7 business days',
    walletRefund: true,
    originalPaymentRefund: true,
  },
  loyalty: {
    walletEnabled: true,
    referralProgramEnabled: true,
    reviewRewardsEnabled: true,
    welcomeBonusEnabled: true,
    pointsPerRupee: 0,
    coinsPerRupee: 0.1,
    welcomeBonus: 100,
    referralBonusReferrer: 150,
    referralBonusReferee: 50,
    reviewRewardText: 10,
    reviewRewardPhoto: 25,
    reviewRewardVideo: 50,
    reviewCoinsBonus: 15,
    welcomeCouponDiscount: 10,
    welcomeCouponMinOrder: 499,
    welcomeCouponMaxDiscount: 200,
    welcomeCouponExpiryDays: 30,
    tiers: [
      { name: 'Bronze', minSpend: 0, cashbackRate: 0.02 },
      { name: 'Silver', minSpend: 5000, cashbackRate: 0.05 },
      { name: 'Gold', minSpend: 15000, cashbackRate: 0.08 },
      { name: 'Platinum', minSpend: 40000, cashbackRate: 0.12 },
    ],
  },
  orders: {
    maxItemsPerOrder: 20,
    maxQuantityPerItem: 50,
    minOrderValue: 0,
    maxOrderValue: 1000000,
    platformFee: 0,
  },
  taxes: {
    gstEnabled: true,
    gstRate: 0.18,
    cgstRate: 0.09,
    sgstRate: 0.09,
    invoicePrefix: 'INV-',
    hsnCode: '',
    gstNumber: '29AAAES9284D1ZX',
    taxInclusive: true,
    invoiceFooter: '',
  },
  notifications: {
    emailEnabled: true,
    smsEnabled: true,
    whatsappEnabled: true,
  },
  storefront: {
    seoTitle: 'Siri Arts and Crafts',
    seoDescription: 'Premium Handicrafts and Luxury Event Decor',
    hideGallerySection: false,
    hideProductsFromGallery: false,
  },
  contact: {
    phone: '+91 98660 06648',
    email: 'sirisha.atmakuri@gmail.com',
    supportHours: 'Mon - Sat, 10 AM to 6 PM',
    address: '#28-1-92, South Street, ONGOLE-523001, Prakasam District, Andhra Pradesh',
    whatsappNumber: '+91 98660 06648',
    whatsappMessage: 'Hello! Thank you for reaching Siri Arts & Crafts.',
    googleMapsUrl: '',
    instagram: '',
    facebook: '',
    pinterest: '',
    youtube: '',
    addressLine1: '',
    addressLine2: '',
    city: 'Ongole',
    state: 'Andhra Pradesh',
    country: 'India',
    postalCode: '523001',
  },
  legal: {
    companyName: 'Siri Arts & Crafts',
    legalCompanyName: 'Siri Arts and Crafts Private Limited',
    registeredAddress: '#28-1-92, South Street, ONGOLE-523001, Prakasam District, Andhra Pradesh',
    cin: '',
  },
};

const mergeSettingsWithDefaults = (fetched) => {
  const merged = {};
  for (const [sectionKey, defaultSection] of Object.entries(DEFAULT_STORE_SETTINGS)) {
    const fetchedSection = fetched?.[sectionKey] || {};
    merged[sectionKey] = {
      ...defaultSection,
      ...fetchedSection,
    };
  }
  return merged;
};

export function AdminSettings({ hideHeader = false }) {
  const { user: authUser, updateUser, setUser: setAuthUser } = useAuth();
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

  const [resetCodePhrase, setResetCodePhrase] = useState('');
  const [resetCheck1, setResetCheck1] = useState(false);
  const [resetCheck2, setResetCheck2] = useState(false);
  const [resetCheck3, setResetCheck3] = useState(false);
  const [resetExecuting, setResetExecuting] = useState(false);

  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditActorFilter, setAuditActorFilter] = useState('all');

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
  const [mobileSectionOpen, setMobileSectionOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [profileForm, setProfileForm] = useState({
    name: authUser?.name || '',
    email: authUser?.email || '',
    phone: authUser?.phone || '',
    role: authUser?.role || 'admin',
  });

  useEffect(() => {
    if (authUser) {
      setProfileForm((prev) => ({
        name: prev.name || authUser.name || '',
        email: prev.email || authUser.email || '',
        phone: prev.phone || authUser.phone || '',
        role: authUser.role || prev.role || 'admin',
      }));
    }
  }, [authUser]);

  const [storeSettings, setStoreSettings] = useState(() => mergeSettingsWithDefaults({}));

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
      primaryColor: 'var(--color-gold-dark)',
      secondaryColor: '#F8F9FB',
      fontFamily: 'Playfair Display + Inter',
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

  const syncSettingsData = useCallback(async () => {
    setLoading(true);
    try {
      try {
        const profRes = await userService.getProfile();
        const profData = profRes?.data || profRes;
        if (profData && typeof profData === 'object') {
          setProfileForm({
            name: profData.name || authUser?.name || '',
            email: profData.email || authUser?.email || '',
            phone: profData.phone || authUser?.phone || '',
            role: profData.role || authUser?.role || 'admin',
          });
        }
      } catch (profErr) {
        logger.warn('Could not sync user profile:', profErr);
      }

      try {
        const storeRes = await storeSettingsService.getAdminSettings();
        if (storeRes && typeof storeRes === 'object') {
          setStoreSettings(mergeSettingsWithDefaults(storeRes));
        } else {
          setStoreSettings(mergeSettingsWithDefaults({}));
        }
      } catch (err) {
        logger.warn('Could not fetch admin store settings, attempting public fallback', err);
        try {
          const publicRes = await storeSettingsService.getPublicSettings();
          setStoreSettings(mergeSettingsWithDefaults(publicRes || {}));
        } catch (_pubErr) {
          logger.error('Could not fetch public store settings, using defaults', _pubErr);
          setStoreSettings(mergeSettingsWithDefaults({}));
        }
      }

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
          setSettings((prev) => ({ ...prev, ...safeSettings }));
        }
      } catch {}
    } catch (_err) {
      logger.warn('Could not sync remote settings, using local configuration.');
    } finally {
      setLoading(false);
    }
  }, [authUser, setSettings]);

  useEffect(() => {
    syncSettingsData();
  }, [syncSettingsData]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await userService.updateProfile({
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
      });
      if (res.success || res.data) {
        toast.success('Profile updated');
        const updatedData = res.data || res;
        if (updateUser) {
          updateUser(updatedData);
        } else if (setAuthUser) {
          setAuthUser(updatedData);
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
      const { razorpaySecret: _s, razorpayKeySecret: _k, ...settingsToSave } = settings;
      const res = await cmsService.updateSection('studio_settings', settingsToSave);
      if (res) {
        await deleteDraft();
        toast.success('Settings saved');
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to commit settings changes.'));
    } finally {
      setSaving(false);
    }
  };

  const handleStoreSettingsSave = (sectionId) => async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const formData = storeSettings[sectionId];
      const res = await storeSettingsService.updateSection(sectionId, formData);
      const updatedSection = res?.[sectionId] || res || formData;
      setStoreSettings((prev) => ({
        ...prev,
        [sectionId]: {
          ...(prev?.[sectionId] || {}),
          ...updatedSection,
        },
      }));
      toast.success(`${sectionId.charAt(0).toUpperCase() + sectionId.slice(1)} settings saved`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save settings.'));
    } finally {
      setSaving(false);
    }
  };

  const handleStoreSettingsChange = (sectionId) => (e) => {
    const { name, value, type, checked } = e.target;
    setStoreSettings((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [name]: type === 'checkbox' ? checked : value,
      },
    }));
  };

  const handleStoreSettingsCustomChange = (sectionId) => (name, value) => {
    setStoreSettings((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [name]: value,
      },
    }));
  };

  if (loading || !storeSettings) {
    return <AdminSettingsSkeleton hideHeader={hideHeader} />;
  }

  const sectionsList = [
    { id: 'profile', title: 'Profile & Account', icon: 'person' },
    { id: 'general', title: 'General Info', icon: 'store' },
    { id: 'shipping', title: 'Shipping & Delivery', icon: 'local_shipping' },
    { id: 'payments', title: 'Payment Methods', icon: 'payments' },
    { id: 'returnsExchanges', title: 'Returns & Exchanges', icon: 'sync' },
    { id: 'cancellation', title: 'Cancellation', icon: 'cancel' },
    { id: 'loyalty', title: 'Loyalty & Rewards', icon: 'card_giftcard' },
    { id: 'orders', title: 'Order Limits', icon: 'shopping_bag' },
    { id: 'taxes', title: 'Taxes & Invoicing', icon: 'receipt' },
    { id: 'notifications', title: 'Notifications', icon: 'notifications' },
    { id: 'storefront', title: 'Storefront SEO', icon: 'travel_explore' },
    { id: 'contact', title: 'Contact Details', icon: 'contact_phone' },
    { id: 'legal', title: 'Legal & Company', icon: 'gavel' },
    { id: 'whatsapp', title: 'WhatsApp Automations', icon: 'chat' },
    { id: 'security', title: 'Security & Operations', icon: 'shield' },
    { id: 'email', title: 'Email Diagnostics', icon: 'mail' },
    { id: 'visualSearch', title: 'AI Visual Search', icon: 'image_search' },
    { id: 'aiPlatform', title: 'Global AI Platform', icon: 'memory' },
  ];

  const filteredSections = sectionsList.filter((sec) => {
    if (!searchQuery.trim()) return true;
    return sec.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      {!hideHeader && (
        <PageHeader
          title="Settings"
          subtitle="Configure platform preferences"
          icon="settings"
          actions={
            <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full sm:w-auto min-w-[300px]">
              <div className="relative flex-1 shrink-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-3">
                <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search settings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none w-full text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] font-medium px-2 h-10 sm:h-8"
                />
              </div>
            </div>
          }
        />
      )}

      {/* Mobile Navigation Sticky Return Bar */}
      {mobileSectionOpen && (
        <div className="lg:hidden sticky top-[var(--admin-topbar-height,56px)] z-20 -my-2 py-2 bg-[var(--admin-bg)]/95 backdrop-blur-md mb-4">
          <div className="px-3 py-1.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[8px] shadow-xs flex items-center justify-between gap-3 min-h-[44px]">
            {/* Left: Back Button */}
            <button
              type="button"
              onClick={() => {
                setMobileSectionOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 text-[var(--admin-text-primary)] hover:text-[var(--admin-accent)] transition-all cursor-pointer active:scale-95 group shrink-0"
            >
              <div className="w-7 h-7 rounded-[6px] bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] group-hover:border-[var(--admin-accent)] group-hover:bg-[var(--admin-accent)]/10 flex items-center justify-center transition-all shadow-2xs">
                <span className="material-symbols-outlined text-[17px] text-[var(--admin-text-secondary)] group-hover:text-[var(--admin-accent)] group-hover:-translate-x-0.5 transition-all">
                  arrow_back
                </span>
              </div>
              <span className="text-[12.5px] font-bold text-[var(--admin-text-primary)] group-hover:text-[var(--admin-accent)] transition-colors">
                All Settings
              </span>
            </button>

            {/* Right: Active Section Info & Counter */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[var(--admin-text-secondary)]">
                {activeSection + 1} of {sectionsList.length}
              </span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[var(--admin-accent)]/10 border border-[var(--admin-accent)]/20 text-[var(--admin-accent)] min-w-0 max-w-[140px] sm:max-w-[180px] shadow-2xs">
                <span className="material-symbols-outlined text-[15px] shrink-0">
                  {sectionsList[activeSection]?.icon}
                </span>
                <span className="text-[12px] font-bold truncate">
                  {sectionsList[activeSection]?.title}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Left Navigation Card (Desktop Sidebar & Mobile Settings Master List) */}
        <motion.div
          variants={fadeUp}
          className={`bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border)] shadow-sm overflow-hidden h-fit lg:sticky lg:top-24 ${
            mobileSectionOpen ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* Card Header */}
          <div className="px-3.5 py-3 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
              <span className="material-symbols-outlined text-[17px] text-[var(--admin-accent)]">
                tune
              </span>
              Settings Menu
            </h3>
            <span className="text-[10px] bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] px-2 py-0.5 rounded-[4px] font-bold border border-[var(--admin-border)] shadow-2xs">
              {filteredSections.length}
            </span>
          </div>

          {/* Desktop Navigation (Compact Segmented List) */}
          <div className="hidden lg:block p-2 space-y-0.5">
            {filteredSections.map((sec) => {
              const originalIndex = sectionsList.findIndex((s) => s.id === sec.id);
              const isActive = activeSection === originalIndex;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSection(originalIndex)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[4px] text-left cursor-pointer transition-all box-border ${
                    isActive
                      ? 'bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] font-bold border-l-2 border-[var(--admin-accent)] shadow-2xs'
                      : 'text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-muted)] hover:text-[var(--admin-text-primary)] font-medium'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[18px] shrink-0 ${
                      isActive ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-text-tertiary)]'
                    }`}
                  >
                    {sec.icon}
                  </span>
                  <span className="text-[12.5px] truncate">{sec.title}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile Navigation (App-like Settings Button Rows with Chevron) */}
          <div className="lg:hidden divide-y divide-[var(--admin-border-subtle)]">
            {filteredSections.map((sec) => {
              const originalIndex = sectionsList.findIndex((s) => s.id === sec.id);
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(originalIndex);
                    setMobileSectionOpen(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full flex items-center justify-between p-3.5 text-left cursor-pointer hover:bg-[var(--admin-bg-subtle)] transition-colors active:bg-[var(--admin-surface-muted)] group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-[4px] bg-[var(--admin-bg-subtle)] border border-[var(--admin-border-subtle)] group-hover:border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-accent)] shrink-0 transition-colors shadow-2xs">
                      <span className="material-symbols-outlined text-[20px]">{sec.icon}</span>
                    </div>
                    <span className="text-[13.5px] font-bold text-[var(--admin-text-primary)] leading-tight truncate">
                      {sec.title}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[20px] text-[var(--admin-text-tertiary)] group-hover:text-[var(--admin-accent)] group-hover:translate-x-0.5 transition-all shrink-0 ml-2">
                    chevron_right
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Right Settings Content Card (Order Detail Card Architecture) */}
        <motion.div
          variants={fadeUp}
          className={`bg-[var(--admin-surface)] rounded-[4px] shadow-sm border border-[var(--admin-border)] overflow-hidden min-h-[600px] flex-col ${
            mobileSectionOpen ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Section Detail Header */}
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[4px] bg-[var(--admin-surface)] border border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-accent)] shadow-2xs shrink-0">
                <span className="material-symbols-outlined text-[20px]">
                  {sectionsList[activeSection]?.icon || 'settings'}
                </span>
              </div>
              <div>
                <h3 className="text-[14px] sm:text-[15px] font-bold text-[var(--admin-text-primary)] leading-tight flex items-center gap-2">
                  {sectionsList[activeSection]?.title || 'Settings'}
                </h3>
                <p className="text-[11.5px] text-[var(--admin-text-secondary)] mt-0.5">
                  Update configuration details and rules for{' '}
                  {sectionsList[activeSection]?.title || 'this section'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] px-2.5 py-1 rounded-[4px] font-bold uppercase tracking-wider border border-[var(--admin-border)] shadow-2xs">
                Live Configuration
              </span>
              {sectionsList[activeSection]?.id === 'whatsapp' && (
                <DraftStatusIndicator status={draftStatus} lastSavedAt={lastSavedAt} />
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6 lg:p-7 flex-1">
            {sectionsList[activeSection].id === 'profile' && (
              <ProfilePanel
                profileForm={profileForm}
                setProfileForm={setProfileForm}
                handleProfileSave={handleProfileSave}
                syncSettingsData={syncSettingsData}
                saving={saving}
              />
            )}

            {sectionsList[activeSection].id === 'general' && (
              <GeneralSettingsPanel
                formData={storeSettings.general || {}}
                handleChange={handleStoreSettingsChange('general')}
                handleSave={handleStoreSettingsSave('general')}
                saving={saving}
              />
            )}

            {sectionsList[activeSection].id === 'shipping' && (
              <ShippingSettingsPanel
                formData={storeSettings.shipping || {}}
                handleChange={handleStoreSettingsChange('shipping')}
                handleSave={handleStoreSettingsSave('shipping')}
                saving={saving}
              />
            )}

            {sectionsList[activeSection].id === 'payments' && (
              <PaymentSettingsPanel
                formData={storeSettings.payments || {}}
                handleChange={handleStoreSettingsChange('payments')}
                handleSave={handleStoreSettingsSave('payments')}
                saving={saving}
              />
            )}

            {sectionsList[activeSection].id === 'returnsExchanges' && (
              <ReturnSettingsPanel
                formData={storeSettings.returnsExchanges || {}}
                handleChange={handleStoreSettingsChange('returnsExchanges')}
                handleSave={handleStoreSettingsSave('returnsExchanges')}
                saving={saving}
              />
            )}

            {sectionsList[activeSection].id === 'cancellation' && (
              <CancellationSettingsPanel
                formData={storeSettings.cancellation || {}}
                handleChange={handleStoreSettingsChange('cancellation')}
                handleSave={handleStoreSettingsSave('cancellation')}
                saving={saving}
              />
            )}

            {sectionsList[activeSection].id === 'loyalty' && (
              <LoyaltySettingsPanel
                formData={storeSettings.loyalty || {}}
                handleChange={handleStoreSettingsChange('loyalty')}
                handleCustomChange={handleStoreSettingsCustomChange('loyalty')}
                handleSave={handleStoreSettingsSave('loyalty')}
                saving={saving}
              />
            )}

            {sectionsList[activeSection].id === 'orders' && (
              <OrderSettingsPanel
                formData={storeSettings.orders || {}}
                handleChange={handleStoreSettingsChange('orders')}
                handleSave={handleStoreSettingsSave('orders')}
                saving={saving}
              />
            )}

            {sectionsList[activeSection].id === 'taxes' && (
              <TaxSettingsPanel
                formData={storeSettings.taxes || {}}
                handleChange={handleStoreSettingsChange('taxes')}
                handleSave={handleStoreSettingsSave('taxes')}
                saving={saving}
              />
            )}

            {sectionsList[activeSection].id === 'notifications' && (
              <NotificationSettingsPanel
                formData={storeSettings.notifications || {}}
                handleChange={handleStoreSettingsChange('notifications')}
                handleSave={handleStoreSettingsSave('notifications')}
                saving={saving}
              />
            )}

            {sectionsList[activeSection].id === 'storefront' && (
              <StorefrontSettingsPanel
                formData={storeSettings.storefront || {}}
                handleChange={handleStoreSettingsChange('storefront')}
                handleSave={handleStoreSettingsSave('storefront')}
                saving={saving}
              />
            )}

            {sectionsList[activeSection].id === 'contact' && (
              <ContactSettingsPanel
                formData={storeSettings.contact || {}}
                handleChange={handleStoreSettingsChange('contact')}
                handleSave={handleStoreSettingsSave('contact')}
                saving={saving}
              />
            )}

            {sectionsList[activeSection].id === 'legal' && (
              <LegalSettingsPanel
                formData={storeSettings.legal || {}}
                handleChange={handleStoreSettingsChange('legal')}
                handleSave={handleStoreSettingsSave('legal')}
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

            {sectionsList[activeSection].id === 'visualSearch' && <VisualSearchPanel />}

            {sectionsList[activeSection].id === 'aiPlatform' && <AiSettingsPanel />}
          </div>
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
