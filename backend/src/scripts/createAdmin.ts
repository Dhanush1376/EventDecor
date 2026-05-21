import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db';
import User from '../models/User';
import { isSameEmail } from '../utils/emailHelper';
import logger from '../config/logger';

dotenv.config();

const createAdmin = async () => {
  try {
    await connectDB();

    const email = (process.env.ADMIN_EMAIL || 'admin@siriartsandcrafts.com').trim().toLowerCase();
    
    // Fetch all users to perform a robust canonical email match (handles Gmail dot variation)
    const users = await User.find({});
    const existingUser = users.find(u => isSameEmail(u.email, email));

    if (existingUser) {
      logger.info(`User ${existingUser.email} matches configured admin email. Updating role to admin...`);
      existingUser.role = 'admin';
      await existingUser.save();
      logger.info('✅ User updated to admin successfully!');
    } else {
      logger.info(`Creating new admin user: ${email}...`);
      await User.create({
        name: 'Admin User',
        email: email,
        role: 'admin',
        isVerified: true,
      });
      logger.info('✅ Admin user created successfully!');
      logger.info(`📧 Email: ${email}`);
    }

    process.exit(0);
  } catch (error) {
    logger.error(`❌ Operation failed: ${error}`);
    process.exit(1);
  }
};

createAdmin();

