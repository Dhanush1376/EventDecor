import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db';
import User from '../models/User';
import logger from '../config/logger';

dotenv.config();

const checkUsers = async () => {
  try {
    await connectDB();
    const users = await User.find({});
    logger.info(`Found ${users.length} total users in database:\n`);
    users.forEach(u => {
      logger.info(`- Name: ${u.name}`);
      logger.info(`  Email: ${u.email}`);
      logger.info(`  Role: ${u.role}`);
      logger.info(`  Verified: ${u.isVerified}`);
      logger.info(`  ID: ${u._id}`);
      logger.info('-----------------------------------');
    });
    process.exit(0);
  } catch (error) {
    logger.error('Failed to retrieve users:', error);
    process.exit(1);
  }
};

checkUsers();
