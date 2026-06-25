import dotenv from 'dotenv';
import connectDB from '../config/db';
import StoreSettings from '../models/StoreSettings';
import ContentSection from '../models/ContentSection';
import logger from '../config/logger';

dotenv.config({ path: '.env.local' });

const seedStoreSettings = async () => {
  try {
    await connectDB();
    logger.info('Connected to MongoDB');

    // Check if settings already exist
    const existingSettingsCount = await StoreSettings.countDocuments();
    if (existingSettingsCount > 0) {
      logger.info('StoreSettings already exist. Migration not needed.');
      process.exit(0);
    }

    // Try to find old studio_settings from ContentSection
    const oldSettings = await ContentSection.findOne({ sectionKey: 'studio_settings' });
    let migratedData: any = {};

    if (oldSettings && oldSettings.data) {
      logger.info('Found existing studio_settings in ContentSection, migrating data...');
      const data = oldSettings.data;

      // Map old data to new schema
      migratedData = {
        general: {
          storeName: data.brandName || 'Siri Arts & Crafts',
          announcementText: data.announcementText || '',
          announcementLink: data.announcementLink || '',
          maintenanceMode: false,
          storeEnabled: true,
        },
        shipping: {
          deliveryCharge: Number(data.standardShippingFee) || 100,
          freeShippingThreshold: Number(data.freeShippingThreshold) || 2000,
          enableFreeShipping: true,
          expressDeliveryCharge: Number(data.expressShippingFee) || 249,
          enableExpressDelivery: true,
          packagingFee: 0,
          remoteAreaCharge: 0,
          estimatedDeliveryDays: data.deliveryEstimate || '5-7',
          maxShippingDistance: 0,
          enableLocalDelivery: false,
        },
        payments: {
          enableCOD: true,
          codFee: Number(data.codFee) || 90,
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
        taxes: {
          gstEnabled: true,
          gstRate: 0.18,
          cgstRate: 0.09,
          sgstRate: 0.09,
          invoicePrefix: 'INV-',
          hsnCode: '',
          gstNumber: '29AAAES9284D1ZX',
          taxInclusive: true,
        },
        loyalty: {
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
        contact: {
          phone: data.whatsappNumber || '',
          email: '',
          supportHours: 'Mon - Sat, 10 AM to 6 PM',
          address: '#28-1-92, South Street, ONGOLE-523001, Prakasam District, Andhra Pradesh',
          googleMapsUrl: '',
          instagram: '',
          facebook: '',
          pinterest: '',
          youtube: '',
          whatsappNumber: data.whatsappNumber || '',
          whatsappMessage: data.whatsappMessage || '',
        },
        legal: {
          companyName: 'Siri Arts & Crafts',
          registeredAddress: '',
          cin: '',
        },
        notifications: {
          emailEnabled: true,
          smsEnabled: false,
          whatsappEnabled: true,
        },
        storefront: {
          seoTitle: 'Siri Arts & Crafts',
          seoDescription: 'Premium Handicrafts and Studio',
        },
        version: 1,
        auditLog: [
          {
            timestamp: new Date(),
            changes: { message: 'Initial migration from ContentSection' },
          },
        ],
      };
    } else {
      logger.info('No existing ContentSection found, creating fresh StoreSettings');
      migratedData = {
        auditLog: [
          {
            timestamp: new Date(),
            changes: { message: 'Initial seed creation' },
          },
        ],
      };
    }

    const newSettings = new StoreSettings(migratedData);
    await newSettings.save();

    logger.info('StoreSettings seeded successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding StoreSettings:', error);
    process.exit(1);
  }
};

seedStoreSettings();
