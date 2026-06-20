const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const usersColl = mongoose.connection.collection('users');
  const admin = await usersColl.findOne({ email: 'sirisha.atmakuri@gmail.com' });

  if (!admin) {
    console.log('Admin not found in DB!');
    return;
  }

  const payload = {
    id: admin._id.toString(),
    role: admin.role,
    email: admin.email,
  };

  const secret = process.env.JWT_SECRET.split(',')[0].trim();
  const token = jwt.sign(payload, secret, { expiresIn: '1h' });

  console.log('Generated token for', admin.email, 'Role:', admin.role);

  try {
    const res = await fetch('http://localhost:5000/api/v1/analytics/dashboard', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${text.substring(0, 100)}`);
  } catch (e) {
    console.error('Fetch error:', e.message);
  }

  await mongoose.disconnect();
}

run();
