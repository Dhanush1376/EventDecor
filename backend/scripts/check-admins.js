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
    const users = await mongoose.connection
      .collection('users')
      .find({ role: { $in: ['admin', 'owner', 'super_admin', 'main_admin'] } })
      .toArray();
    console.log(users.length, 'admins found');
    console.log(users.map((u) => ({ email: u.email, role: u.role })));

    const teamInvites = await mongoose.connection.collection('teaminvites').find().toArray();
    console.log(teamInvites.length, 'invites found');
    process.exit();
  })
  .catch(console.error);
