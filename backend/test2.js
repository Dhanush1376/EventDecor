const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/MONGO_URI=\"(.*?)\"/);
if (match) {
  const uri = match[1];
  const mongoose = require('mongoose');
  mongoose
    .connect(uri)
    .then(async () => {
      const db = mongoose.connection;
      const cats = await db.collection('categories').find({}).toArray();
      console.log('Categories:', JSON.stringify(cats, null, 2));
      process.exit(0);
    })
    .catch(console.error);
}
