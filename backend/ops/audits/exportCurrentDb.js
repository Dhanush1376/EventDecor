const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const exportDb = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    const collectionsToExport = [
      'galleries',
      'eventbookings',
      'rentalorders',
      'users',
      'contentsections',
    ];
    const exportData = {};

    for (const collName of collectionsToExport) {
      console.log(`Exporting ${collName}...`);
      const data = await db.collection(collName).find({}).toArray();
      exportData[collName] = data;
    }

    const exportPath = path.resolve(__dirname, '../../database_export_safe.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    console.log(`✅ Successfully exported surviving database to ${exportPath}`);

    await mongoose.disconnect();
  } catch (err) {
    console.error('Export failed:', err);
    process.exit(1);
  }
};
exportDb();
