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
    const users = await mongoose.connection.collection('users').find().toArray();
    console.log(users.length, 'users found');
    users.forEach((u) => {
      console.log({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
      });
    });
    process.exit();
  })
  .catch(console.error);
