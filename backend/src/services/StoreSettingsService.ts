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
        supportEmail: settings.general.supportEmail,
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
      },
      payments: {
        enableCOD: settings.payments.enableCOD,
        codFee: settings.payments.codFee,
        codMinOrder: settings.payments.codMinOrder,
        codMaxOrder: settings.payments.codMaxOrder,
        enableRazorpay: settings.payments.enableRazorpay,
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
        taxInclusive: settings.taxes.taxInclusive,
        gstRate: settings.taxes.gstRate,
        gstNumber: settings.taxes.gstNumber,
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
      },
      contact: {
        phone: settings.contact.phone,
        email: settings.contact.email,
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
        whatsappNumber: settings.contact.whatsappNumber,
        whatsappMessage: settings.contact.whatsappMessage,
      },
      legal: {
        companyName: settings.legal.companyName,
        legalCompanyName: settings.legal.legalCompanyName,
        registeredAddress: settings.legal.registeredAddress,
        cin: settings.legal.cin,
      },
      storefront: settings.storefront,
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
    (settings as any)[section] = {
      ...(settings as any)[section],
      ...data,
    };
    settings.markModified(section);

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

    // Invalidate cache
    this.cacheTimestamp = 0;

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
}

export const storeSettingsService = new StoreSettingsService();
export default storeSettingsService;
