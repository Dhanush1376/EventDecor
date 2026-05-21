import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db';
import logger from '../config/logger';

// Import all models
import User from '../models/User';
import Product from '../models/Product';
import Order from '../models/Order';
import EventBooking from '../models/EventBooking';
import Event from '../models/Event';
import Gallery from '../models/Gallery';
import ContentSection from '../models/ContentSection';
import Review from '../models/Review';
import Coupon from '../models/Coupon';
import WalletTransaction from '../models/WalletTransaction';
import EmailCampaign from '../models/EmailCampaign';
import NotificationLog from '../models/NotificationLog';

dotenv.config();

const createIndexes = async () => {
  try {
    await connectDB();
    logger.info('Connected to MongoDB. Starting index creation process...');

    const models = [
      User, Product, Order, EventBooking, Event, Gallery, 
      ContentSection, Review, Coupon, WalletTransaction, 
      EmailCampaign, NotificationLog
    ];

    for (const model of models) {
      if (model && typeof model.createIndexes === 'function') {
        logger.info(`Building indexes for ${model.modelName}...`);
        await model.createIndexes();
      }
    }

    logger.info('✅ All compound indexes successfully built in MongoDB.');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Failed to build indexes:', error);
    process.exit(1);
  }
};

createIndexes();
