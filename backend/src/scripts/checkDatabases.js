const mongoose = require('mongoose');

async function checkDatabases() {
  const uri =
    'mongodb+srv://siriadmin:Balusiri.05@cluster0.odfo3tb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
  console.log('Connecting to cluster without specifying db...');
  try {
    const conn = await mongoose.connect(uri);
    const admin = mongoose.connection.db.admin();
    const dbs = await admin.listDatabases();
    console.log('Databases found in cluster:');
    for (const db of dbs.databases) {
      console.log(`- ${db.name} (sizeOnDisk: ${db.sizeOnDisk})`);

      // Let's connect to this DB and check 'products' collection
      const dbInstance = mongoose.connection.client.db(db.name);
      const collections = await dbInstance.listCollections().toArray();
      const hasProducts = collections.some((c) => c.name === 'products');
      if (hasProducts) {
        const count = await dbInstance.collection('products').countDocuments();
        console.log(`  -> 'products' collection exists with ${count} documents.`);
      }
    }
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkDatabases();
