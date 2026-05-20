require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const collection = mongoose.connection.db.collection('refreshtokens');
  
  // Count how many users have multiple refresh tokens
  const agg = await collection.aggregate([
    { $group: { _id: "$userId", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();
  
  console.log("Users with multiple sessions:", agg.length);
  console.log("Details:", agg);
  
  // Total refresh tokens
  const total = await collection.countDocuments();
  console.log("Total refresh tokens:", total);
  
  process.exit(0);
}

run().catch(console.error);
