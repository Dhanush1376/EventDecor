import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db';
import User from '../models/User';

dotenv.config();

const checkUsers = async () => {
  try {
    await connectDB();
    const users = await User.find({});
    console.log(`Found ${users.length} total users in database:\n`);
    users.forEach(u => {
      console.log(`- Name: ${u.name}`);
      console.log(`  Email: ${u.email}`);
      console.log(`  Role: ${u.role}`);
      console.log(`  Verified: ${u.isVerified}`);
      console.log(`  ID: ${u._id}`);
      console.log('-----------------------------------');
    });
    process.exit(0);
  } catch (error) {
    console.error('Failed to retrieve users:', error);
    process.exit(1);
  }
};

checkUsers();
