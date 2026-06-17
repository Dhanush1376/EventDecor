const mongoose = require('mongoose');
require('dotenv').config();

const backupUri = process.argv[2];

if (!backupUri) {
  console.error('Usage: node verifyBackup.js <BACKUP_MONGO_URI>');
  process.exit(1);
}

const verifyBackup = async () => {
  console.log(`Connecting to temporary backup cluster...`);

  try {
    const conn = await mongoose.createConnection(backupUri).asPromise();
    console.log('✅ Connected successfully.');

    console.log('\n--- VERIFICATION REPORT ---');

    const db = conn.db;

    // Check Products
    const productsCount = await db.collection('products').countDocuments();
    console.log(`Backup products count: ${productsCount}`);

    // Check Categories
    const categoriesCount = await db.collection('categories').countDocuments();
    console.log(`Backup categories count: ${categoriesCount}`);

    // Check Events
    const eventsCount = await db.collection('events').countDocuments();
    console.log(`Backup events count: ${eventsCount}`);

    // Check Admin Users
    const adminsCount = await db.collection('users').countDocuments({
      role: { $in: ['admin', 'super_admin', 'main_admin'] },
    });
    console.log(`Backup admin users count: ${adminsCount}`);

    console.log('\n--- ADMIN DETAILS PREVIEW ---');
    if (adminsCount > 0) {
      const admins = await db
        .collection('users')
        .find({
          role: { $in: ['admin', 'super_admin', 'main_admin'] },
        })
        .limit(5)
        .toArray();

      admins.forEach((admin) => {
        console.log(
          `Admin found: ${admin.email} (Role: ${admin.role}) - Created: ${admin.createdAt}`,
        );
      });
    } else {
      console.log('❌ No admin users found in backup.');
    }

    console.log('\n---------------------------');

    if (productsCount === 0 || categoriesCount === 0 || eventsCount === 0 || adminsCount === 0) {
      console.log(
        '\n❌ WARNING: The backup appears to be missing required data. Do not proceed with restore.',
      );
    } else {
      console.log('\n✅ Backup verified successfully. Proceed to dry-run phase.');
    }

    await conn.close();
    process.exit(0);
  } catch (err) {
    console.error('Failed to connect or verify backup:', err);
    process.exit(1);
  }
};

verifyBackup();
