require('dotenv').config();
const mongoose = require('mongoose');

console.log('Connecting to', process.env.MONGODB_URI);
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to DB');
    const db = mongoose.connection.db;
    
    const showcaseRes = await db.collection('showcasecollections').updateMany(
      {},
      { $set: { rating: 0, reviewCount: 0 } }
    );
    console.log('Updated ShowcaseCollections:', showcaseRes.modifiedCount);

    const productRes = await db.collection('products').updateMany(
      {},
      { $set: { rating: 0, reviews: 0 } }
    );
    console.log('Updated Products:', productRes.modifiedCount);

    process.exit(0);
  })
  .catch(console.error);
