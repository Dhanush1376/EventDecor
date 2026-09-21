import apiClient from '../api';
import { queryClient } from '../../config/queryClient';

const syncCachedBrandSettings = (settings) => {
  if (!settings) return;
  try {
    const general = settings.general || {};
    const contact = settings.contact || {};
    const legal = settings.legal || {};
    const taxes = settings.taxes || {};

    if (general.storeName) {
      localStorage.setItem('siri_store_name', general.storeName);
    }
    if (general.tagline) {
      localStorage.setItem('siri_store_tagline', general.tagline);
    }
    const email = general.supportEmail || contact.email;
    if (email) {
      localStorage.setItem('siri_support_email', email);
    }
    const phone = general.phone || contact.phone;
    if (phone) {
      localStorage.setItem('siri_store_phone', phone);
    }
    const altPhone = general.alternatePhone || contact.alternatePhone;
    if (altPhone) {
      localStorage.setItem('siri_store_alt_phone', altPhone);
    }
    const whatsapp = general.whatsappNumber || contact.whatsappNumber;
    if (whatsapp) {
      localStorage.setItem('siri_store_whatsapp', whatsapp);
    }
    if (contact.supportHours) {
      localStorage.setItem('siri_store_support_hours', contact.supportHours);
    }
    const address = contact.address;
    if (address) {
      localStorage.setItem('siri_store_address', address);
    }
    if (contact.city) {
      localStorage.setItem('siri_store_city', contact.city);
    }
    if (contact.state) {
      localStorage.setItem('siri_store_state', contact.state);
    }
    if (contact.postalCode) {
      localStorage.setItem('siri_store_postal_code', contact.postalCode);
    }
    if (contact.country) {
      localStorage.setItem('siri_store_country', contact.country);
    }
    if (legal.companyName) {
      localStorage.setItem('siri_company_name', legal.companyName);
    }
    if (legal.legalCompanyName) {
      localStorage.setItem('siri_legal_company_name', legal.legalCompanyName);
    }
    if (legal.cin) {
      localStorage.setItem('siri_store_cin', legal.cin);
    }
    if (legal.registeredAddress) {
      localStorage.setItem('siri_registered_address', legal.registeredAddress);
    }
    if (taxes.gstNumber) {
      localStorage.setItem('siri_store_gstin', taxes.gstNumber);
    }
    const shipping = settings.shipping || {};
    const orders = settings.orders || {};
    if (shipping.deliveryCharge !== undefined) {
      localStorage.setItem('siri_shipping_delivery_charge', String(shipping.deliveryCharge));
    }
    if (shipping.freeShippingThreshold !== undefined) {
      localStorage.setItem('siri_shipping_free_threshold', String(shipping.freeShippingThreshold));
    }
    if (orders.maxQuantityPerItem !== undefined) {
      localStorage.setItem('siri_orders_max_qty', String(orders.maxQuantityPerItem));
    }
    if (orders.maxItemsPerOrder !== undefined) {
      localStorage.setItem('siri_orders_max_items', String(orders.maxItemsPerOrder));
    }
    if (orders.minOrderValue !== undefined) {
      localStorage.setItem('siri_orders_min_val', String(orders.minOrderValue));
    }
    if (orders.maxOrderValue !== undefined) {
      localStorage.setItem('siri_orders_max_val', String(orders.maxOrderValue));
    }
    if (orders.platformFee !== undefined) {
      localStorage.setItem('siri_orders_platform_fee', String(orders.platformFee));
    }
  } catch (_e) {
    // Ignored in restricted environments
  }
};

const storeSettingsService = {
  getPublicSettings: async () => {
    const response = await apiClient.get('/settings/public');
    const data = response.data?.data || response.data;
    try {
      if (data) {
        localStorage.setItem('siri_public_settings', JSON.stringify(data));
        syncCachedBrandSettings(data);
      }
    } catch (_e) {}
    return data;
  },

  getAdminSettings: async (fresh = false) => {
    const response = await apiClient.get(`/settings/admin${fresh ? '?fresh=true' : ''}`);
    const data = response.data?.data || response.data;
    try {
      if (data) {
        syncCachedBrandSettings(data);
      }
    } catch (_e) {}
    return data;
  },

  updateSection: async (section, data) => {
    const response = await apiClient.patch(`/settings/${section}`, data);
    const result = response.data?.data || response.data;
    try {
      const partial = { [section]: result };
      syncCachedBrandSettings(partial);
      const existing = localStorage.getItem('siri_public_settings');
      if (existing) {
        const parsed = JSON.parse(existing);
        parsed[section] = { ...(parsed[section] || {}), ...result };
        localStorage.setItem('siri_public_settings', JSON.stringify(parsed));
        syncCachedBrandSettings(parsed);
      }
      window.dispatchEvent(
        new CustomEvent('store-settings-updated', { detail: { section, data: result } }),
      );
      localStorage.setItem('store_settings_sync_time', Date.now().toString());
      queryClient.invalidateQueries({ queryKey: ['storeSettings'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    } catch (_e) {
      // Ignored in non-browser environments
    }
    return result;
  },

  updateShippingOrders: async ({ shipping, orders }) => {
    const response = await apiClient.patch('/settings/shipping-orders', { shipping, orders });
    const result = response.data?.data || response.data;
    try {
      if (result?.shipping) syncCachedBrandSettings({ shipping: result.shipping });
      if (result?.orders) syncCachedBrandSettings({ orders: result.orders });
      const existing = localStorage.getItem('siri_public_settings');
      if (existing) {
        const parsed = JSON.parse(existing);
        if (result?.shipping) parsed.shipping = { ...(parsed.shipping || {}), ...result.shipping };
        if (result?.orders) parsed.orders = { ...(parsed.orders || {}), ...result.orders };
        localStorage.setItem('siri_public_settings', JSON.stringify(parsed));
        syncCachedBrandSettings(parsed);
      }
      window.dispatchEvent(
        new CustomEvent('store-settings-updated', {
          detail: { section: 'shippingOrders', data: result },
        }),
      );
      localStorage.setItem('store_settings_sync_time', Date.now().toString());
      queryClient.invalidateQueries({ queryKey: ['storeSettings'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    } catch (_e) {
      // Ignored in non-browser environments
    }
    return result;
  },
};

export default storeSettingsService;
