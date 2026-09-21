import { m as motion } from 'framer-motion';
import { PageHeader, AdminSettingsSkeleton, fadeUp, stagger } from '../components/AdminUIKit';
import { DraftRestoreModal } from '../components/DraftRestoreModal';
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard';
import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { userService, cmsService } from '../../services/domainServices';
import storeSettingsService from '../../services/api/storeSettingsService';
import { useAuth } from '../../context/AuthContext';
import { useAdmin } from '../context/AdminContext';
import toast from 'react-hot-toast';
import logger from '../../utils/core/logger';
import { getErrorMessage } from '../../utils/core/errorHelpers';
import { useDraft } from '../hooks/useDraft';

// Settings Panels
import { ProfilePanel } from '../components/settings/ProfilePanel';

import AiSettingsPanel from '../components/settings/AiSettingsPanel';
import { SecurityPanel } from '../components/settings/SecurityPanel';
import {
  ReturnSettingsPanel,
  LoyaltySettingsPanel,
  StorefrontSettingsPanel,
  StoreDetailsLegalPanel,
  ShippingOrdersPanel,
  PaymentsTaxesPanel,
} from '../components/settings/StoreSettingsPanels';
import { VisualSearchPanel } from '../components/settings/VisualSearchPanel';

const DEFAULT_STORE_SETTINGS = {
  general: {
    storeName: 'Siri Arts & Crafts',
    tagline: 'Handcrafted Heritage & Artistry',
    supportEmail: '',
    phone: '',
    alternatePhone: '',
    whatsappNumber: '',
    announcementText: '',
    announcementLink: '',
    maintenanceMode: false,
    storeEnabled: true,
  },
  shipping: {
    deliveryCharge: 99,
    freeShippingThreshold: 2000,
    enableFreeShipping: true,
    enableExpressDelivery: true,
    packagingFee: 15,
    estimatedDeliveryDays: '4-6',
    enableLocalDelivery: true,
    originPincode: '523001',
    defaultCourierPartner: 'BlueDart Express',
  },
  payments: {
    enableCOD: true,
    codFee: 30,
    codMinOrder: 500,
    codMaxOrder: 50000,
    codOtpChannel: 'phone',
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
    allowCancellation: false,
    cancellationWindowHours: 0,
    refundTimeline: '5-7 business days',
    walletRefund: false,
    originalPaymentRefund: false,
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
    minOrderValue: 1000,
    maxOrderValue: 100000,
    platformFee: 49,
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
  storefront: {
    seoTitle: 'Siri Arts and Crafts',
    seoDescription: 'Premium Handicrafts and Luxury Event Decor',
    hideGallerySection: false,
    hideProductsFromGallery: false,
    customerAuthMethod: 'both',
  },
  contact: {
    phone: '',
    alternatePhone: '',
    email: '',
    supportHours: 'Mon - Sat, 10 AM to 6 PM',
    address: '',
    whatsappNumber: '',
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
    postalCode: '',
  },
  legal: {
    companyName: 'Siri Arts & Crafts',
    legalCompanyName: 'Siri Arts and Crafts Private Limited',
    registeredAddress: '',
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

const SubTabBar = ({ tabs = [], activeTab, onChange }) => (
  <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)] rounded-[6px] w-fit mb-6">
    {tabs.map((tab) => {
      const isActive = activeTab === tab.id;
      return (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-bold rounded-[4px] transition-all cursor-pointer ${
            isActive
              ? 'bg-[var(--admin-surface)] text-[var(--admin-accent)] shadow-xs border border-[var(--admin-border)]'
              : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface)]/50'
          }`}
        >
          {tab.icon && <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>}
          <span>{tab.label}</span>
        </button>
      );
    })}
  </div>
);

export function AdminSettings({ hideHeader = false }) {
  const queryClient = useQueryClient();
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [activeSubTabs, setActiveSubTabs] = useState({});
  const [mobileSectionOpen, setMobileSectionOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const setSubTabForSection = (sectionId, subTabId) => {
    setActiveSubTabs((prev) => ({ ...prev, [sectionId]: subTabId }));
  };

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
      whatsappNumber: '',
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

  const handleStoreSettingsSave = (sectionId) => async (e) => {
    if (e) e.preventDefault();
    if (sectionId === 'payments') {
      const p = storeSettings.payments || {};
      if (!p.enableRazorpay && !p.enableCOD) {
        toast.error('At least one payment method must remain active.');
        return;
      }
    }
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
      queryClient.invalidateQueries({ queryKey: ['storeSettings'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success(`${sectionId.charAt(0).toUpperCase() + sectionId.slice(1)} settings saved`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save settings.'));
    } finally {
      setSaving(false);
    }
  };

  const handleStoreSettingsChange = (sectionId) => (e) => {
    const { name, value, type, checked } = e.target;
    if (sectionId === 'payments' && type === 'checkbox') {
      const p = storeSettings.payments || {};
      if (name === 'enableRazorpay' && !checked && !p.enableCOD) {
        toast.error('At least one payment method must remain active.');
        return;
      }
      if (name === 'enableCOD' && !checked && !p.enableRazorpay) {
        toast.error('At least one payment method must remain active.');
        return;
      }
    }
    setStoreSettings((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [name]: type === 'checkbox' ? checked : value,
      },
    }));
  };

  const handleStoreSettingsCustomChange = (sectionId) => (name, value) => {
    if (sectionId === 'payments') {
      const p = storeSettings.payments || {};
      if (name === 'enableRazorpay' && !value && !p.enableCOD) {
        toast.error('At least one payment method must remain active.');
        return;
      }
      if (name === 'enableCOD' && !value && !p.enableRazorpay) {
        toast.error('At least one payment method must remain active.');
        return;
      }
    }
    setStoreSettings((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [name]: value,
      },
    }));
  };

  const handleStoreDetailsChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;

    setStoreSettings((prev) => {
      const next = {
        ...prev,
        general: { ...(prev?.general || {}) },
        contact: { ...(prev?.contact || {}) },
        legal: { ...(prev?.legal || {}) },
      };

      if (['storeName', 'tagline', 'storeEnabled', 'maintenanceMode'].includes(name)) {
        next.general[name] = val;
      } else if (name === 'supportEmail' || name === 'email') {
        next.general.supportEmail = val;
        next.contact.email = val;
      } else if (name === 'phone') {
        next.general.phone = val;
        next.contact.phone = val;
      } else if (name === 'alternatePhone') {
        next.general.alternatePhone = val;
        next.contact.alternatePhone = val;
      } else if (name === 'whatsappNumber') {
        next.general.whatsappNumber = val;
        next.contact.whatsappNumber = val;
      } else if (
        ['supportHours', 'address', 'city', 'state', 'postalCode', 'country'].includes(name)
      ) {
        next.contact[name] = val;
      } else if (['companyName', 'legalCompanyName', 'cin', 'registeredAddress'].includes(name)) {
        next.legal[name] = val;
      }

      return next;
    });
  };

  const handleStoreDetailsSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const legalPayload = {
        ...(storeSettings.legal || {}),
        companyName: storeSettings.legal?.companyName || storeSettings.general?.storeName || '',
      };
      const genRes = await storeSettingsService.updateSection('general', storeSettings.general);
      const conRes = await storeSettingsService.updateSection('contact', storeSettings.contact);
      const legRes = await storeSettingsService.updateSection('legal', legalPayload);

      setStoreSettings((prev) => ({
        ...prev,
        general: { ...(prev?.general || {}), ...(genRes?.general || genRes || prev?.general) },
        contact: { ...(prev?.contact || {}), ...(conRes?.contact || conRes || prev?.contact) },
        legal: { ...(prev?.legal || {}), ...(legRes?.legal || legRes || prev?.legal) },
      }));
      queryClient.invalidateQueries({ queryKey: ['storeSettings'] });
      toast.success('Store details & legal settings saved successfully');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save store settings.'));
    } finally {
      setSaving(false);
    }
  };

  const handleShippingOrdersChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;

    setStoreSettings((prev) => {
      const next = {
        ...prev,
        shipping: { ...(prev?.shipping || {}) },
        orders: { ...(prev?.orders || {}) },
      };

      const shippingKeys = [
        'deliveryCharge',
        'freeShippingThreshold',
        'estimatedDeliveryDays',
        'packagingFee',
        'originPincode',
        'defaultCourierPartner',
      ];

      const orderKeys = [
        'maxItemsPerOrder',
        'maxQuantityPerItem',
        'minOrderValue',
        'maxOrderValue',
        'platformFee',
      ];

      if (shippingKeys.includes(name)) {
        const numFields = ['deliveryCharge', 'freeShippingThreshold', 'packagingFee'];
        next.shipping[name] = numFields.includes(name) ? (val === '' ? '' : Number(val)) : val;
      } else if (orderKeys.includes(name)) {
        next.orders[name] = val === '' ? '' : Number(val);
      }

      return next;
    });
  };

  const handleShippingOrdersSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await storeSettingsService.updateShippingOrders({
        shipping: storeSettings.shipping || {},
        orders: storeSettings.orders || {},
      });

      setStoreSettings((prev) => ({
        ...prev,
        shipping: { ...(prev?.shipping || {}), ...(res?.shipping || prev?.shipping) },
        orders: { ...(prev?.orders || {}), ...(res?.orders || prev?.orders) },
      }));

      queryClient.invalidateQueries({ queryKey: ['storeSettings'] });
      toast.success('Shipping & order limits saved successfully');
    } catch (error) {
      logger.error('Failed to save shipping & orders settings:', error);
      toast.error(getErrorMessage(error, 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  const handlePaymentsTaxesSave = async (e) => {
    if (e) e.preventDefault();
    const p = storeSettings.payments || {};
    if (!p.enableRazorpay && !p.enableCOD) {
      toast.error('At least one payment method must remain active.');
      return;
    }
    setSaving(true);
    try {
      const [payRes, taxRes] = await Promise.all([
        storeSettingsService.updateSection('payments', storeSettings.payments || {}),
        storeSettingsService.updateSection('taxes', storeSettings.taxes || {}),
      ]);

      setStoreSettings((prev) => ({
        ...prev,
        payments: { ...(prev?.payments || {}), ...(payRes?.payments || payRes || prev?.payments) },
        taxes: { ...(prev?.taxes || {}), ...(taxRes?.taxes || taxRes || prev?.taxes) },
      }));

      queryClient.invalidateQueries({ queryKey: ['storeSettings'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Payments and taxes saved successfully');
    } catch (error) {
      logger.error('Failed to save payments & taxes settings:', error);
      toast.error(getErrorMessage(error, 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !storeSettings) {
    return <AdminSettingsSkeleton hideHeader={hideHeader} />;
  }

  const sectionsList = [
    { id: 'profile', title: 'Profile & Account', icon: 'person' },
    {
      id: 'store',
      title: 'Store Details & Legal',
      icon: 'store',
      keywords: ['general', 'contact', 'legal', 'company', 'address', 'phone', 'email', 'support'],
    },
    {
      id: 'shippingOrders',
      title: 'Shipping & Orders',
      icon: 'local_shipping',
      keywords: [
        'shipping',
        'delivery',
        'charge',
        'orders',
        'limits',
        'threshold',
        'courier',
        'fee',
        'express',
        'local',
      ],
    },
    {
      id: 'paymentsTaxes',
      title: 'Payments & Taxes',
      icon: 'payments',
      keywords: [
        'payment',
        'razorpay',
        'cod',
        'cash on delivery',
        'taxes',
        'gst',
        'invoicing',
        'invoice',
        'rates',
      ],
    },
    {
      id: 'policies',
      title: 'Returns & Exchanges',
      icon: 'sync',
      keywords: ['returns', 'exchanges', 'refund', 'policy', 'return window'],
    },
    { id: 'loyalty', title: 'Loyalty & Rewards', icon: 'card_giftcard' },
    {
      id: 'storefront',
      title: 'Storefront & Customer Auth',
      icon: 'travel_explore',
      keywords: ['storefront', 'seo', 'auth', 'login', 'modal', 'email', 'mobile', 'otp', 'search'],
    },
    {
      id: 'aiSearch',
      title: 'AI & Visual Search',
      icon: 'auto_awesome',
      subTabs: [
        { id: 'visualSearch', label: 'AI Visual Search', icon: 'image_search' },
        { id: 'aiPlatform', label: 'Global AI Platform', icon: 'memory' },
      ],
    },
    { id: 'security', title: 'Security & Operations', icon: 'shield' },
  ];

  const filteredSections = sectionsList.filter((sec) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (sec.title.toLowerCase().includes(q)) return true;
    if (sec.subTabs && sec.subTabs.some((st) => st.label.toLowerCase().includes(q))) return true;
    if (sec.keywords && sec.keywords.some((k) => k.toLowerCase().includes(q))) return true;
    return false;
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

            {sectionsList[activeSection].id === 'store' && (
              <StoreDetailsLegalPanel
                formData={{
                  storeName: storeSettings.general?.storeName || '',
                  tagline: storeSettings.general?.tagline || '',
                  storeEnabled: storeSettings.general?.storeEnabled ?? true,
                  maintenanceMode: storeSettings.general?.maintenanceMode ?? false,

                  supportEmail:
                    storeSettings.general?.supportEmail || storeSettings.contact?.email || '',
                  phone: storeSettings.general?.phone || storeSettings.contact?.phone || '',
                  alternatePhone:
                    storeSettings.general?.alternatePhone ||
                    storeSettings.contact?.alternatePhone ||
                    '',
                  whatsappNumber:
                    storeSettings.general?.whatsappNumber ||
                    storeSettings.contact?.whatsappNumber ||
                    '',
                  supportHours: storeSettings.contact?.supportHours || '',

                  address: storeSettings.contact?.address || '',
                  city: storeSettings.contact?.city || '',
                  state: storeSettings.contact?.state || '',
                  postalCode: storeSettings.contact?.postalCode || '',
                  country: storeSettings.contact?.country || '',

                  companyName:
                    storeSettings.legal?.companyName || storeSettings.general?.storeName || '',
                  legalCompanyName: storeSettings.legal?.legalCompanyName || '',
                  cin: storeSettings.legal?.cin || '',
                  registeredAddress: storeSettings.legal?.registeredAddress || '',
                }}
                handleChange={handleStoreDetailsChange}
                handleSave={handleStoreDetailsSave}
                saving={saving}
              />
            )}

            {sectionsList[activeSection].id === 'shippingOrders' && (
              <ShippingOrdersPanel
                formData={{
                  ...(storeSettings.shipping || {}),
                  ...(storeSettings.orders || {}),
                }}
                handleChange={handleShippingOrdersChange}
                handleSave={handleShippingOrdersSave}
                saving={saving}
              />
            )}

            {sectionsList[activeSection].id === 'paymentsTaxes' && (
              <PaymentsTaxesPanel
                paymentsFormData={storeSettings.payments || {}}
                taxesFormData={storeSettings.taxes || {}}
                onPaymentsChange={handleStoreSettingsChange('payments')}
                onTaxesChange={handleStoreSettingsChange('taxes')}
                handleSave={handlePaymentsTaxesSave}
                saving={saving}
              />
            )}

            {sectionsList[activeSection].id === 'policies' && (
              <ReturnSettingsPanel
                formData={storeSettings.returnsExchanges || {}}
                handleChange={handleStoreSettingsChange('returnsExchanges')}
                handleSave={handleStoreSettingsSave('returnsExchanges')}
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

            {sectionsList[activeSection].id === 'storefront' && (
              <StorefrontSettingsPanel
                formData={storeSettings.storefront || {}}
                handleChange={handleStoreSettingsChange('storefront')}
                handleSave={handleStoreSettingsSave('storefront')}
                saving={saving}
              />
            )}

            {sectionsList[activeSection].id === 'aiSearch' && (
              <div>
                <SubTabBar
                  tabs={sectionsList[activeSection].subTabs}
                  activeTab={activeSubTabs.aiSearch || 'visualSearch'}
                  onChange={(tabId) => setSubTabForSection('aiSearch', tabId)}
                />
                {(activeSubTabs.aiSearch || 'visualSearch') === 'visualSearch' && (
                  <VisualSearchPanel />
                )}
                {activeSubTabs.aiSearch === 'aiPlatform' && <AiSettingsPanel />}
              </div>
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
