require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const collection = mongoose.connection.db.collection('refreshtokens');
  const indexes = await collection.indexes();
  console.log(JSON.stringify(indexes, null, 2));
  process.exit(0);
}

run().catch(console.error);
