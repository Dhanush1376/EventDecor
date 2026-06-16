const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const uri = process.env.MONGO_URI;

if (!uri) {
  console.log('No MONGO_URI');
  process.exit(1);
}

mongoose
  .connect(uri)
  .then(async () => {
    const userId = new mongoose.Types.ObjectId('6a0c39485589cc25ca717deb');

    // Check if user already exists
    const existing = await mongoose.connection.collection('users').findOne({ _id: userId });
    if (existing) {
      console.log('User Radha Krishnan already exists in database:', existing);
    } else {
      const newUser = {
        _id: userId,
        name: 'Radha Krishnan',
        email: 'customer@siriartsandcrafts.com',
        role: 'customer',
        isVerified: true,
        avatar:
          'https://www.gravatar.com/avatar/2d7a2f58e4539efcfefb19d5de4bdc0e?d=identicon&s=200',
        wishlist: [],
        cart: [],
        recentlyViewed: [],
        notificationPreferences: { email: true, marketing: true },
        accountPreferences: { theme: 'light', language: 'en' },
        walletBalance: 0,
        siriCoins: 0,
        loyaltyTier: 'Bronze',
        referralsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const res = await mongoose.connection.collection('users').insertOne(newUser);
      console.log('User Radha Krishnan created successfully:', res);
    }
    process.exit();
  })
  .catch(console.error);
