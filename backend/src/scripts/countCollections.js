const { MongoClient } = require('mongodb');

async function countCollections() {
  const uri =
    'mongodb+srv://siriadmin:Balusiri.05@cluster0.odfo3tb.mongodb.net/siri-arts-crafts?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to siri-arts-crafts database');

    const db = client.db();
    const collections = await db.listCollections().toArray();

    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`- Collection: ${col.name} -> count: ${count}`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

countCollections();
