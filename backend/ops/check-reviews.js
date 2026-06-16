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
    const reviews = await mongoose.connection.collection('reviews').find().toArray();
    console.log(reviews.length, 'reviews found');
    for (const r of reviews) {
      const user = await mongoose.connection.collection('users').findOne({ _id: r.customer });
      console.log({
        reviewId: r._id,
        customerNameInReview: r.customerName,
        customerUserId: r.customer,
        userNameInUserDoc: user ? user.name : 'USER NOT FOUND',
        userEmailInUserDoc: user ? user.email : 'USER NOT FOUND',
      });
    }
    process.exit();
  })
  .catch(console.error);
