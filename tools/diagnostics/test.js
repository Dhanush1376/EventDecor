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
      const items = await db.collection('galleries').find({}).limit(5).toArray();
      console.log(
        'Sample items:',
        JSON.stringify(
          items.map((i) => ({
            id: i._id,
            category: i.category,
            primaryCategory: i.primaryCategory,
          })),
          null,
          2,
        ),
      );
      const categories = await db.collection('galleries').distinct('category', { isActive: true });
      console.log('Categories:', categories);
      process.exit(0);
    })
    .catch(console.error);
} else {
  console.log('No MONGO_URI found');
}
