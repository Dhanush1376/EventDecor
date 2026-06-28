import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User';
import bcrypt from 'bcryptjs';

dotenv.config({ path: '.env.local' });

async function grantAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eventdecor');
    const email = 'sirisha.atmakuri@gmail.com';

    // Find user by email
    let user = await User.findOne({ email });

    if (user) {
      user.role = 'super_admin';
      await user.save();
      console.log(`Successfully granted super_admin access to ${email}`);
    } else {
      console.log(`User ${email} not found. Creating new admin user...`);
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(
        process.env.ADMIN_PASSWORD || 'SuperAdminPassword123!',
        salt,
      );

      user = new User({
        name: 'Sirisha Atmakuri',
        email,
        role: 'super_admin',
        isVerified: true,
        passwordHash,
        passwordChangedAt: new Date(),
      });
      await user.save();
      console.log(`Successfully created new super_admin user: ${email}`);
    }
  } catch (err) {
    console.error('Error granting admin:', err);
  } finally {
    mongoose.connection.close();
  }
}

grantAdmin();
