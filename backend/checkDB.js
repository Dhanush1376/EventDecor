require('dotenv').config();
const mongoose = require('mongoose');

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eventdecor';

mongoose
  .connect(mongoUri)
  .then(async () => {
    console.log('Products:', await mongoose.connection.db.collection('products').countDocuments());
    console.log('Users:', await mongoose.connection.db.collection('users').countDocuments());
    console.log(
      'Admins:',
      await mongoose.connection.db
        .collection('users')
        .countDocuments({ role: { $in: ['admin', 'super_admin', 'main_admin'] } }),
    );
    process.exit(0);
  })
  .catch(console.error);
