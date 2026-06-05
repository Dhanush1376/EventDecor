/**
 * One-shot script: drops the stale TTL index on AdminAuditLog.createdAt
 * so the app can recreate it with the updated expireAfterSeconds value.
 */
const { MongoClient } = require('mongodb');

const uri =
  process.env.MONGO_URI ||
  'mongodb+srv://siriadmin:Balusiri.05@cluster0.odfo3tb.mongodb.net/siri-arts-crafts?retryWrites=true&w=majority&appName=Cluster0';

async function fix() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const col = db.collection('adminauditlogs');

    const indexes = await col.indexes();
    const target = indexes.find((i) => i.name === 'createdAt_1');

    if (!target) {
      console.log('Index "createdAt_1" not found — nothing to drop.');
      return;
    }

    console.log('Current index:', JSON.stringify(target, null, 2));
    await col.dropIndex('createdAt_1');
    console.log(
      'Dropped stale index "createdAt_1". Restart the backend to recreate it with the correct TTL.',
    );
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

fix();
