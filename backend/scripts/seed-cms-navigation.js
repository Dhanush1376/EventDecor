const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function main() {
  // Require explicit invocation command line arg if needed, or just by running the script
  if (require.main !== module) {
    console.log('Script is meant to be run directly.');
    return;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Error: MONGODB_URI is not defined in environment variables.');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    // Check navigation idempotency
    let nav = await db.collection('contentsections').findOne({ sectionKey: 'navigation' });
    console.log('Navigation in DB initially:', nav ? 'YES' : 'NO');

    if (!nav) {
      console.log('No existing navigation found. Inserting default seed...');
      await db.collection('contentsections').insertOne({
        sectionKey: 'navigation',
        status: 'published',
        data: {
          logo: { text: 'SIRI ARTS NEW', tagline: '', image: '/MainLogo.png' },
          mainLinks: [{ label: 'Home', url: '/' }],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        revisionHistory: [],
      });
      console.log('Successfully inserted default navigation data.');
    } else {
      console.log(
        'Navigation data already exists. Skipping insertion to avoid overwriting production data.',
      );
    }
  } catch (err) {
    console.error('Error during execution:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}
