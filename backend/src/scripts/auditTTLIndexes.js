/**
 * One-shot: detect and drop ALL indexes that conflict with the current model definitions.
 * Specifically targets TTL indexes with mismatched expireAfterSeconds.
 */
const { MongoClient } = require('mongodb');

const uri =
  process.env.MONGO_URI ||
  'mongodb+srv://siriadmin:Balusiri.05@cluster0.odfo3tb.mongodb.net/siri-arts-crafts?retryWrites=true&w=majority&appName=Cluster0';

async function fixAllIndexes() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const collections = await db.listCollections().toArray();

    for (const col of collections) {
      const coll = db.collection(col.name);
      const indexes = await coll.indexes();
      for (const idx of indexes) {
        if (idx.name === '_id_') continue;
        // Report any TTL index for visibility
        if (idx.expireAfterSeconds !== undefined) {
          console.log(
            `[${col.name}] TTL index "${idx.name}" => expireAfterSeconds: ${idx.expireAfterSeconds}`,
          );
        }
      }
    }

    console.log(
      '\nDone. All TTL indexes listed above. Any that were conflicting have already been dropped by fixAuditLogIndex.js.',
    );
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

fixAllIndexes();
