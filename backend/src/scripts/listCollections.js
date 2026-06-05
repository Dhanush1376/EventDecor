const mongoose = require('mongoose');

async function listCollections() {
  const uri =
    'mongodb+srv://siriadmin:Balusiri.05@cluster0.odfo3tb.mongodb.net/siri-arts-crafts?retryWrites=true&w=majority&appName=Cluster0';
  try {
    const conn = await mongoose.connect(uri);
    const db = mongoose.connection.client.db('siri-arts-crafts');
    const collections = await db.listCollections().toArray();

    console.log('Collections in siri-arts-crafts:');
    for (const c of collections) {
      const count = await db.collection(c.name).countDocuments();
      console.log(`- ${c.name}: ${count} documents`);
    }
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

listCollections();
