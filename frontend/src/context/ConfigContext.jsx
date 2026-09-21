import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import storeSettingsService from '../services/api/storeSettingsService';
// socket.io is imported dynamically inside the useEffect to keep it out of the initial bundle
import { getWebSocketUrl } from '../config/apiConfig';
import { queryClient } from '../config/queryClient';
import logger from '../utils/core/logger';
import { BRAND, formatPhoneWithCountryCode } from '../config/brand';

const ConfigContext = createContext(null);

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({});
  const [categories, setCategories] = useState([]);
  const [storeSettings, setStoreSettings] = useState(() => {
    try {
      const cached = localStorage.getItem('siri_public_settings');
      if (cached) return JSON.parse(cached);
    } catch (_e) {}
    return null;
  });
  const [loading, setLoading] = useState(!storeSettings);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchGlobalData = async () => {
      try {
        // Fetch categories
        const categoriesRes = await api.get('/categories/active');
        if (isMounted && categoriesRes?.data?.success) {
          setCategories(categoriesRes.data.data);
        }

        // Fetch store settings
        const settingsRes = await storeSettingsService.getPublicSettings();
        if (isMounted && settingsRes) {
          setStoreSettings(settingsRes);
        }
      } catch (err) {
        logger.error('Failed to fetch global data', err);
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchGlobalData();

    const handleSettingsSync = async () => {
      try {
        const settingsRes = await storeSettingsService.getPublicSettings();
        if (isMounted && settingsRes) {
          setStoreSettings(settingsRes);
          queryClient.invalidateQueries({ queryKey: ['cart'] });
        }
      } catch (_e) {
        // Ignored
      }
    };

    window.addEventListener('store-settings-updated', handleSettingsSync);
    const handleStorageEvent = (e) => {
      if (e.key === 'store_settings_sync_time' || e.key === 'siri_store_name') {
        handleSettingsSync();
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    let socketRef = null;
    if (import.meta.env.VITE_ENABLE_VISITOR_SOCKET === 'true') {
      const socketServerUrl = getWebSocketUrl();
      import('socket.io-client')
        .then(({ io }) => {
          if (!isMounted) return;
          const socket = io(`${socketServerUrl}/visitor`, {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 5000,
          });
          socketRef = socket;

          socket.on('MAINTENANCE_TOGGLED', (data) => {
            setStoreSettings((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                general: {
                  ...prev.general,
                  maintenanceMode: data.maintenanceMode,
                },
              };
            });
          });
        })
        .catch((err) => {
          logger.warn('[ConfigContext] Failed to load socket.io-client module:', err);
        });
    }

    return () => {
      isMounted = false;
      window.removeEventListener('store-settings-updated', handleSettingsSync);
      window.removeEventListener('storage', handleStorageEvent);
      if (socketRef) {
        socketRef.disconnect();
      }
    };
  }, []);

  const storeName = useMemo(() => {
    return (
      storeSettings?.general?.storeName?.trim() ||
      import.meta.env.VITE_SITE_NAME ||
      'Siri Arts & Crafts'
    );
  }, [storeSettings]);

  const storeNameUpper = useMemo(() => storeName.toUpperCase(), [storeName]);
  const storeTagline =
    storeSettings?.general?.tagline?.trim() || BRAND.tagline || 'Handcrafted Heritage & Artistry';
  const supportEmail =
    storeSettings?.general?.supportEmail?.trim() ||
    storeSettings?.contact?.email?.trim() ||
    BRAND.email;

  const supportHours =
    storeSettings?.contact?.supportHours?.trim() ||
    BRAND.supportHours ||
    'Mon - Sat, 10 AM to 6 PM';

  const storeAddress = storeSettings?.contact?.address?.trim() || BRAND.address || '';

  const storeCity = storeSettings?.contact?.city?.trim() || BRAND.city || 'Ongole';

  const storeState = storeSettings?.contact?.state?.trim() || BRAND.state || 'Andhra Pradesh';

  const storePostalCode =
    storeSettings?.contact?.postalCode?.trim() || BRAND.postalCode || '523001';

  const storeCountry = storeSettings?.contact?.country?.trim() || BRAND.country || 'India';

  const companyName = storeSettings?.legal?.companyName?.trim() || BRAND.companyName || storeName;

  const legalCompanyName =
    storeSettings?.legal?.legalCompanyName?.trim() || BRAND.legalCompanyName || companyName;

  const cin = storeSettings?.legal?.cin?.trim() || BRAND.cin || '';

  const registeredAddress =
    storeSettings?.legal?.registeredAddress?.trim() || BRAND.registeredAddress || storeAddress;

  const gstin = storeSettings?.taxes?.gstNumber?.trim() || BRAND.gstin || '';

  const supportPhone = useMemo(() => {
    const raw =
      storeSettings?.general?.phone?.trim() || storeSettings?.contact?.phone?.trim() || BRAND.phone;
    return formatPhoneWithCountryCode(raw);
  }, [storeSettings]);

  const alternatePhone = useMemo(() => {
    const raw =
      storeSettings?.general?.alternatePhone?.trim() ||
      storeSettings?.contact?.alternatePhone?.trim() ||
      BRAND.alternatePhone;
    return formatPhoneWithCountryCode(raw);
  }, [storeSettings]);

  const whatsappNumber = useMemo(() => {
    const raw =
      storeSettings?.general?.whatsappNumber?.trim() ||
      storeSettings?.contact?.whatsappNumber?.trim() ||
      BRAND.whatsappNumber;
    return formatPhoneWithCountryCode(raw);
  }, [storeSettings]);

  const whatsappUrl = useMemo(() => {
    return BRAND.getWhatsAppUrl(null, whatsappNumber);
  }, [whatsappNumber]);

  const isMaintenanceMode = storeSettings?.general?.maintenanceMode === true;
  const isStoreClosed = storeSettings?.general?.storeEnabled === false && !isMaintenanceMode;

  const shippingSettings = useMemo(() => {
    const s = storeSettings?.shipping || {};
    return {
      deliveryCharge: s.deliveryCharge ?? 0,
      freeShippingThreshold: s.freeShippingThreshold ?? 2000,
      enableFreeShipping: s.enableFreeShipping ?? true,
      expressDeliveryCharge: s.expressDeliveryCharge ?? 249,
      enableExpressDelivery: s.enableExpressDelivery ?? true,
      estimatedDeliveryDays: s.estimatedDeliveryDays || '5-7',
      packagingFee: s.packagingFee ?? 0,
      remoteAreaCharge: s.remoteAreaCharge ?? 0,
      maxShippingDistance: s.maxShippingDistance ?? 0,
      enableLocalDelivery: s.enableLocalDelivery ?? false,
      originPincode: s.originPincode || '',
      defaultCourierPartner: s.defaultCourierPartner || '',
    };
  }, [storeSettings]);

  const orderLimits = useMemo(() => {
    const o = storeSettings?.orders || {};
    return {
      maxItemsPerOrder: o.maxItemsPerOrder ?? 20,
      maxQuantityPerItem: o.maxQuantityPerItem ?? 50,
      minOrderValue: o.minOrderValue ?? 0,
      maxOrderValue: o.maxOrderValue ?? 1000000,
      platformFee: o.platformFee ?? 0,
    };
  }, [storeSettings]);

  const deliveryCharge = shippingSettings.deliveryCharge;
  const freeShippingThreshold = shippingSettings.freeShippingThreshold;
  const enableFreeShipping = shippingSettings.enableFreeShipping;
  const estimatedDeliveryDays = shippingSettings.estimatedDeliveryDays;
  const maxItemsPerOrder = orderLimits.maxItemsPerOrder;
  const maxQuantityPerItem = orderLimits.maxQuantityPerItem;
  const minOrderValue = orderLimits.minOrderValue;
  const maxOrderValue = orderLimits.maxOrderValue;
  const platformFee = orderLimits.platformFee;
  const customerAuthMethod = storeSettings?.storefront?.customerAuthMethod || 'both';

  const contextValue = useMemo(
    () => ({
      config,
      categories,
      storeSettings,
      customerAuthMethod,
      storeName,
      storeNameUpper,
      storeTagline,
      supportEmail,
      supportPhone,
      alternatePhone,
      hasAlternatePhone: Boolean(alternatePhone),
      whatsappNumber,
      whatsappUrl,
      supportHours,
      storeAddress,
      address: storeAddress,
      storeCity,
      city: storeCity,
      storeState,
      state: storeState,
      storePostalCode,
      postalCode: storePostalCode,
      storeCountry,
      country: storeCountry,
      companyName,
      legalCompanyName,
      cin,
      registeredAddress,
      gstin,
      shippingSettings,
      orderLimits,
      deliveryCharge,
      freeShippingThreshold,
      enableFreeShipping,
      estimatedDeliveryDays,
      maxItemsPerOrder,
      maxQuantityPerItem,
      minOrderValue,
      maxOrderValue,
      platformFee,
      loading,
      error,
      isStoreClosed,
      isMaintenanceMode,
    }),
    [
      config,
      categories,
      storeSettings,
      storeName,
      storeNameUpper,
      storeTagline,
      supportEmail,
      supportPhone,
      alternatePhone,
      whatsappNumber,
      whatsappUrl,
      supportHours,
      storeAddress,
      storeCity,
      storeState,
      storePostalCode,
      storeCountry,
      companyName,
      legalCompanyName,
      cin,
      registeredAddress,
      gstin,
      shippingSettings,
      orderLimits,
      deliveryCharge,
      freeShippingThreshold,
      enableFreeShipping,
      estimatedDeliveryDays,
      maxItemsPerOrder,
      maxQuantityPerItem,
      minOrderValue,
      maxOrderValue,
      platformFee,
      loading,
      error,
      isStoreClosed,
      isMaintenanceMode,
      customerAuthMethod,
    ],
  );

  return <ConfigContext.Provider value={contextValue}>{children}</ConfigContext.Provider>;
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

export const useStoreName = () => {
  const { storeName } = useConfig();
  return storeName;
};

export const useContactInfo = () => {
  const {
    supportEmail,
    supportPhone,
    alternatePhone,
    hasAlternatePhone,
    whatsappNumber,
    whatsappUrl,
    supportHours,
    address,
    city,
    state,
    postalCode,
    country,
  } = useConfig();
  return {
    supportEmail,
    supportPhone,
    alternatePhone,
    hasAlternatePhone,
    whatsappNumber,
    whatsappUrl,
    supportHours,
    address,
    city,
    state,
    postalCode,
    country,
  };
};

export const useLegalInfo = () => {
  const { companyName, legalCompanyName, cin, registeredAddress, gstin, storeName } = useConfig();
  return {
    companyName,
    legalCompanyName,
    cin,
    registeredAddress,
    gstin,
    storeName,
  };
};

export const useShippingInfo = () => {
  const {
    deliveryCharge,
    freeShippingThreshold,
    enableFreeShipping,
    estimatedDeliveryDays,
    shippingSettings,
  } = useConfig();
  return {
    deliveryCharge,
    freeShippingThreshold,
    enableFreeShipping,
    estimatedDeliveryDays,
    ...shippingSettings,
  };
};

export const useShippingSettings = useShippingInfo;

export const useOrderLimits = () => {
  const {
    maxItemsPerOrder,
    maxQuantityPerItem,
    minOrderValue,
    maxOrderValue,
    platformFee,
    orderLimits,
  } = useConfig();
  return {
    maxItemsPerOrder: maxItemsPerOrder ?? 20,
    maxQuantityPerItem: maxQuantityPerItem ?? 50,
    minOrderValue: minOrderValue ?? 0,
    maxOrderValue: maxOrderValue ?? 1000000,
    platformFee: platformFee ?? 0,
    ...orderLimits,
  };
};

export const useAuthMethod = () => {
  const { customerAuthMethod } = useConfig();
  return customerAuthMethod || 'both';
};
