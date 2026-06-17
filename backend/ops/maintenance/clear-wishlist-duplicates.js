const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/eventdecor';

mongoose
  .connect(uri)
  .then(async () => {
    console.log('Connected to MongoDB');
    const users = await mongoose.connection.collection('users').find({}).toArray();
    for (const user of users) {
      if (user.wishlist && user.wishlist.length > 0) {
        // Remove duplicates by converting ObjectIds to strings
        const uniqueWishlistStrings = [...new Set(user.wishlist.map((id) => id.toString()))];
        const uniqueWishlist = uniqueWishlistStrings.map((id) => new mongoose.Types.ObjectId(id));

        if (uniqueWishlist.length !== user.wishlist.length) {
          console.log(
            `User ${user.email}: Removed ${user.wishlist.length - uniqueWishlist.length} duplicate wishlist items.`,
          );
          await mongoose.connection
            .collection('users')
            .updateOne({ _id: user._id }, { $set: { wishlist: uniqueWishlist } });
        }
      }
    }
    console.log('Done clearing duplicates.');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
