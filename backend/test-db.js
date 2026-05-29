const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function testDB() {
  await mongoose.connect('mongodb+srv://siriadmin:Balusiri.05@cluster0.odfo3tb.mongodb.net/siri-arts-crafts?retryWrites=true&w=majority&appName=Cluster0');
  
  const OtpVerification = mongoose.model('OtpVerification', new mongoose.Schema({}, { strict: false }));
  
  const records = await OtpVerification.find({ email: 'dhanush1376@gmail.com', type: 'auth' }).sort({ createdAt: -1 }).limit(5);
  console.log("Found records:", records);
  
  mongoose.disconnect();
}

testDB();
