import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import User from '../src/models/User';
import AuthIdentity from '../src/models/AuthIdentity';
import logger from '../src/config/logger';

async function migrateAuthIdentities() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in the environment variables');
    }

    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    let totalUsers = 0;
    let emailIdentities = 0;
    let googleIdentities = 0;
    let phoneIdentities = 0;

    const cursor = User.find().cursor();

    for await (const user of cursor) {
      totalUsers++;

      const identitiesToInsert = [];

      // Email Identity
      if (user.email) {
        identitiesToInsert.push({
          userId: user._id,
          provider: 'email',
          providerSubjectId: user.email,
          verifiedAt: user.createdAt,
        });
      }

      // Google Identity
      if (user.googleId) {
        identitiesToInsert.push({
          userId: user._id,
          provider: 'google',
          providerSubjectId: user.googleId,
          verifiedAt: user.lastLogin || user.createdAt,
          metadata: {
            displayName: user.name,
            avatar: user.avatar,
          },
        });
      }

      // Phone Identity
      if (user.phone) {
        identitiesToInsert.push({
          userId: user._id,
          provider: 'phone',
          providerSubjectId: user.phone,
          verifiedAt: user.createdAt,
        });
      }

      if (identitiesToInsert.length > 0) {
        try {
          const inserted = await AuthIdentity.insertMany(identitiesToInsert, { ordered: false });
          inserted.forEach((doc) => {
            if (doc.provider === 'email') emailIdentities++;
            if (doc.provider === 'google') googleIdentities++;
            if (doc.provider === 'phone') phoneIdentities++;
          });
        } catch (err: any) {
          if (err.code === 11000) {
            // Log duplicates but continue
            logger.warn(`Duplicate identity ignored for user ${user._id}`);
          } else {
            logger.error(`Error migrating user ${user._id}: ${err.message}`);
          }
        }
      }
    }

    logger.info('Migration complete!');
    logger.info(`Total Users Processed: ${totalUsers}`);
    logger.info(`Email Identities Created: ${emailIdentities}`);
    logger.info(`Google Identities Created: ${googleIdentities}`);
    logger.info(`Phone Identities Created: ${phoneIdentities}`);
  } catch (error: any) {
    logger.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
    process.exit(0);
  }
}

migrateAuthIdentities();
