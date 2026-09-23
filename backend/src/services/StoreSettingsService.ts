import StoreSettings, { IStoreSettings } from '../models/StoreSettings';
import mongoose from 'mongoose';
import logger from '../config/logger';
import { getIO } from '../socket';

class StoreSettingsService {
  private cache: IStoreSettings | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get the singleton settings document, creating it if it doesn't exist
   */
  private async getOrCreateSettings(): Promise<IStoreSettings> {
    let settings = await StoreSettings.findOne();

    if (!settings) {
      settings = await StoreSettings.create({
        loyalty: {
          tiers: [
            { name: 'Bronze', minSpend: 0, cashbackRate: 0.02 },
            { name: 'Silver', minSpend: 5000, cashbackRate: 0.05 },
            { name: 'Gold', minSpend: 15000, cashbackRate: 0.08 },
            { name: 'Platinum', minSpend: 40000, cashbackRate: 0.12 },
          ],
        },
      });
      logger.info('Created default StoreSettings document');
    }

    return settings;
  }

  /**
   * Get full settings (used by backend business logic and admin UI)
   */
  public async getSettings(bypassCache = false): Promise<IStoreSettings> {
    const now = Date.now();

    if (!bypassCache && this.cache && now - this.cacheTimestamp < this.CACHE_TTL) {
      return this.cache;
    }

    const settings = await this.getOrCreateSettings();

    this.cache = settings;
    this.cacheTimestamp = now;

    return settings;
  }

  /**
   * Get settings safe for public storefront consumption
   * Strips out internal/admin-only configs
   */
  public async getPublicSettings() {
    const settings = await this.getSettings();

    return {
      general: {
        storeName: settings.general.storeName,
        tagline: settings.general.tagline,
        supportEmail: settings.general.supportEmail || settings.contact.email,
        phone: settings.general.phone || settings.contact.phone || '',
        alternatePhone: settings.general.alternatePhone || settings.contact.alternatePhone || '',
        whatsappNumber: settings.general.whatsappNumber || settings.contact.whatsappNumber || '',
        logo: settings.general.logo,
        announcementText: settings.general.announcementText,
        announcementLink: settings.general.announcementLink,
        maintenanceMode: settings.general.maintenanceMode,
        storeEnabled: settings.general.storeEnabled,
      },
      shipping: {
        deliveryCharge: settings.shipping.deliveryCharge,
        freeShippingThreshold: settings.shipping.freeShippingThreshold,
        enableFreeShipping: settings.shipping.enableFreeShipping,
        expressDeliveryCharge: settings.shipping.expressDeliveryCharge,
        enableExpressDelivery: settings.shipping.enableExpressDelivery,
        estimatedDeliveryDays: settings.shipping.estimatedDeliveryDays,
        packagingFee: settings.shipping.packagingFee ?? 0,
        remoteAreaCharge: settings.shipping.remoteAreaCharge ?? 0,
        maxShippingDistance: settings.shipping.maxShippingDistance ?? 0,
        enableLocalDelivery: settings.shipping.enableLocalDelivery ?? false,
        originPincode: settings.shipping.originPincode ?? '',
        defaultCourierPartner: settings.shipping.defaultCourierPartner ?? '',
      },
      payments: {
        enableCOD: settings.payments.enableCOD ?? true,
        codFee: settings.payments.codFee,
        codMinOrder: settings.payments.codMinOrder,
        codMaxOrder: settings.payments.codMaxOrder,
        codOtpChannel: settings.payments.codOtpChannel || 'phone',
        enableRazorpay:
          !settings.payments.enableCOD && !settings.payments.enableRazorpay
            ? true
            : (settings.payments.enableRazorpay ?? true),
      },
      returnsExchanges: {
        enableReturns: settings.returnsExchanges.enableReturns,
        enableExchanges: settings.returnsExchanges.enableExchanges,
        returnWindowDays: settings.returnsExchanges.returnWindowDays,
        exchangeWindowDays: settings.returnsExchanges.exchangeWindowDays,
        returnProcessingDays: settings.returnsExchanges.returnProcessingDays,
        refundProcessingDays: settings.returnsExchanges.refundProcessingDays,
      },
      cancellation: {
        allowCancellation: settings.cancellation.allowCancellation,
        cancellationWindowHours: settings.cancellation.cancellationWindowHours,
      },
      taxes: {
        gstEnabled: settings.taxes.gstEnabled ?? true,
        taxInclusive: settings.taxes.taxInclusive ?? true,
        gstRate: settings.taxes.gstRate ?? 0.18,
        cgstRate: settings.taxes.cgstRate ?? 0.09,
        sgstRate: settings.taxes.sgstRate ?? 0.09,
        gstNumber: settings.taxes.gstNumber || '',
        hsnCode: settings.taxes.hsnCode || '',
        invoicePrefix: settings.taxes.invoicePrefix || 'INV-',
        invoiceFooter: settings.taxes.invoiceFooter || '',
      },
      loyalty: {
        welcomeBonus: settings.loyalty.welcomeBonus,
        pointsPerRupee: settings.loyalty.pointsPerRupee,
        coinsPerRupee: settings.loyalty.coinsPerRupee,
        welcomeCouponDiscount: settings.loyalty.welcomeCouponDiscount,
        welcomeCouponMinOrder: settings.loyalty.welcomeCouponMinOrder,
        welcomeCouponMaxDiscount: settings.loyalty.welcomeCouponMaxDiscount,
        tiers: settings.loyalty.tiers,
      },
      orders: {
        maxItemsPerOrder: settings.orders.maxItemsPerOrder,
        maxQuantityPerItem: settings.orders.maxQuantityPerItem,
        minOrderValue: settings.orders.minOrderValue,
        maxOrderValue: settings.orders.maxOrderValue,
        platformFee: settings.orders.platformFee ?? 0,
      },
      contact: {
        phone: settings.contact.phone || settings.general.phone || '',
        alternatePhone: settings.contact.alternatePhone || settings.general.alternatePhone || '',
        email: settings.contact.email || settings.general.supportEmail,
        supportHours: settings.contact.supportHours,
        address: settings.contact.address,
        addressLine1: settings.contact.addressLine1,
        addressLine2: settings.contact.addressLine2,
        city: settings.contact.city,
        state: settings.contact.state,
        country: settings.contact.country,
        postalCode: settings.contact.postalCode,
        googleMapsUrl: settings.contact.googleMapsUrl,
        instagram: settings.contact.instagram,
        facebook: settings.contact.facebook,
        pinterest: settings.contact.pinterest,
        youtube: settings.contact.youtube,
        whatsappNumber: settings.contact.whatsappNumber || settings.general.whatsappNumber || '',
        whatsappMessage: settings.contact.whatsappMessage,
      },
      legal: {
        companyName: settings.legal.companyName,
        legalCompanyName: settings.legal.legalCompanyName,
        registeredAddress: settings.legal.registeredAddress,
        cin: settings.legal.cin,
      },
      storefront: {
        seoTitle: settings.storefront?.seoTitle || '',
        seoDescription: settings.storefront?.seoDescription || '',
        hideGallerySection: Boolean(settings.storefront?.hideGallerySection),
        hideProductsFromGallery: Boolean(settings.storefront?.hideProductsFromGallery),
        customerAuthMethod: settings.storefront?.customerAuthMethod || 'both',
      },
    };
  }

  /**
   * Update a specific section of the settings
   */
  public async updateSection(
    section: keyof IStoreSettings,
    data: any,
    adminId: string | mongoose.Types.ObjectId,
  ): Promise<IStoreSettings> {
    const settings = await this.getOrCreateSettings();

    // Store old data for audit log
    const oldData = { ...(settings as any)[section] };
    if (typeof oldData.toObject === 'function') {
      // Handle Mongoose subdocuments
      Object.assign(oldData, (settings as any)[section].toObject());
    }

    // Merge new data
    const updatedSectionData = {
      ...(settings as any)[section],
      ...data,
    };

    if (section === 'payments') {
      const isRazorpay = Boolean(updatedSectionData.enableRazorpay);
      const isCod = Boolean(updatedSectionData.enableCOD);
      if (!isRazorpay && !isCod) {
        throw new Error(
          'At least one payment method (Razorpay or Cash on Delivery) must remain active.',
        );
      }
    }

    if (section === 'taxes') {
      const gstRate = Number(updatedSectionData.gstRate) || 0;
      const cgstRate = Number(updatedSectionData.cgstRate) || 0;
      const sgstRate = Number(updatedSectionData.sgstRate) || 0;

      if (gstRate < 0 || cgstRate < 0 || sgstRate < 0) {
        throw new Error('GST, CGST, and SGST rates cannot be negative.');
      }

      if (updatedSectionData.gstEnabled) {
        if (Math.abs(cgstRate + sgstRate - gstRate) > 0.0001) {
          throw new Error('CGST Rate + SGST Rate must equal the Total GST Rate.');
        }
      }
    }

    (settings as any)[section] = updatedSectionData;
    settings.markModified(section);

    // Cross-sync between general and contact sections so editing either preserves a unified source of truth
    if (section === 'general') {
      let contactModified = false;
      if (data.supportEmail !== undefined && settings.contact.email !== data.supportEmail) {
        settings.contact.email = data.supportEmail;
        contactModified = true;
      }
      if (data.phone !== undefined && settings.contact.phone !== data.phone) {
        settings.contact.phone = data.phone;
        contactModified = true;
      }
      if (
        data.alternatePhone !== undefined &&
        settings.contact.alternatePhone !== data.alternatePhone
      ) {
        settings.contact.alternatePhone = data.alternatePhone;
        contactModified = true;
      }
      if (
        data.whatsappNumber !== undefined &&
        settings.contact.whatsappNumber !== data.whatsappNumber
      ) {
        settings.contact.whatsappNumber = data.whatsappNumber;
        contactModified = true;
      }
      if (contactModified) {
        settings.markModified('contact');
      }
    } else if (section === 'contact') {
      let generalModified = false;
      if (data.email !== undefined && settings.general.supportEmail !== data.email) {
        settings.general.supportEmail = data.email;
        generalModified = true;
      }
      if (data.phone !== undefined && settings.general.phone !== data.phone) {
        settings.general.phone = data.phone;
        generalModified = true;
      }
      if (
        data.alternatePhone !== undefined &&
        settings.general.alternatePhone !== data.alternatePhone
      ) {
        settings.general.alternatePhone = data.alternatePhone;
        generalModified = true;
      }
      if (
        data.whatsappNumber !== undefined &&
        settings.general.whatsappNumber !== data.whatsappNumber
      ) {
        settings.general.whatsappNumber = data.whatsappNumber;
        generalModified = true;
      }
      if (generalModified) {
        settings.markModified('general');
      }
    }

    // Bump version and update metadata
    settings.version += 1;
    settings.lastModifiedBy =
      typeof adminId === 'string' ? new mongoose.Types.ObjectId(adminId) : adminId;

    // Add audit log (keep last 50 entries to prevent document bloat)
    settings.auditLog.unshift({
      timestamp: new Date(),
      adminId: settings.lastModifiedBy,
      changes: {
        section,
        old: oldData,
        new: data,
      },
    });

    if (settings.auditLog.length > 50) {
      settings.auditLog = settings.auditLog.slice(0, 50);
    }

    await settings.save();

    // Refresh cache and immediately update in-memory store config cache
    this.cacheTimestamp = Date.now();
    this.cache = settings;
    try {
      const { updateStoreConfigCache } = require('../config/storeConfig');
      updateStoreConfigCache(settings);
    } catch (_err) {
      logger.warn('Could not refresh storeConfig in-memory cache:', _err);
    }

    // Emit live synchronization events for maintenance mode toggle
    if (section === 'general') {
      try {
        const io = getIO();
        io.of('/visitor').emit('MAINTENANCE_TOGGLED', {
          maintenanceMode: settings.general.maintenanceMode,
        });
        io.of('/user').emit('MAINTENANCE_TOGGLED', {
          maintenanceMode: settings.general.maintenanceMode,
        });

        // Ensure new Enterprise Maintenance system is synced
        const MaintenanceService = require('./MaintenanceService').default;
        const state = await MaintenanceService.getMaintenanceState();
        if (settings.general.maintenanceMode && !state.active) {
          // If enabled via legacy settings but not active in new system, enable it in basic mode
          await MaintenanceService.enableMaintenance(
            'public_maintenance',
            'Enabled via legacy StoreSettings interface',
            settings.lastModifiedBy,
            { ip: '127.0.0.1', userAgent: 'System' },
          );
        } else if (!settings.general.maintenanceMode && state.active) {
          // If disabled via legacy settings but active in new system, disable it
          await MaintenanceService.disableMaintenance(settings.lastModifiedBy, {
            ip: '127.0.0.1',
            userAgent: 'System',
          });
        }
      } catch (e) {
        logger.error('Failed to emit MAINTENANCE_TOGGLED event or sync MaintenanceService', e);
      }
    }

    return settings;
  }

  /**
   * Atomically updates both Shipping and Orders sections on the StoreSettings document,
   * commits to MongoDB, creates an audit record, and updates in-memory caches.
   */
  public async updateShippingAndOrders(
    shippingData: Record<string, any>,
    ordersData: Record<string, any>,
    updatedBy?: string | mongoose.Types.ObjectId,
  ): Promise<IStoreSettings> {
    const settings = await this.getSettings(true);

    const oldShipping = JSON.parse(JSON.stringify(settings.shipping || {}));
    const oldOrders = JSON.parse(JSON.stringify(settings.orders || {}));

    if (shippingData && typeof shippingData === 'object') {
      Object.assign(settings.shipping, shippingData);
    }

    if (ordersData && typeof ordersData === 'object') {
      Object.assign(settings.orders, ordersData);
    }

    settings.lastModifiedBy =
      typeof updatedBy === 'string' ? new mongoose.Types.ObjectId(updatedBy) : updatedBy;

    // Add audit entry
    settings.auditLog.unshift({
      timestamp: new Date(),
      adminId: settings.lastModifiedBy,
      changes: {
        section: 'shippingOrders',
        old: { shipping: oldShipping, orders: oldOrders },
        new: { shipping: settings.shipping, orders: settings.orders },
      },
    });

    if (settings.auditLog.length > 50) {
      settings.auditLog = settings.auditLog.slice(0, 50);
    }

    await settings.save();

    // Invalidate and refresh cache immediately
    this.cacheTimestamp = Date.now();
    this.cache = settings;
    try {
      const { updateStoreConfigCache } = require('../config/storeConfig');
      updateStoreConfigCache(settings);
    } catch (_err) {
      logger.warn('Could not refresh storeConfig in-memory cache:', _err);
    }

    return settings;
  }
}

export const storeSettingsService = new StoreSettingsService();
export default storeSettingsService;
