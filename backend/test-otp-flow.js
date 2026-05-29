const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function testOtpFlow() {
  await mongoose.connect('mongodb+srv://siriadmin:Balusiri.05@cluster0.odfo3tb.mongodb.net/siri-arts-crafts?retryWrites=true&w=majority&appName=Cluster0');
  
  const OtpVerification = mongoose.model('OtpVerification', new mongoose.Schema({
    email: { type: String, required: true, lowercase: true, trim: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0, required: true },
    maxAttempts: { type: Number, default: 5, required: true },
    exhausted: { type: Boolean, default: false, required: true },
    type: { type: String, enum: ['auth', 'cod'], default: 'auth', required: true },
    expiresAt: { type: Date, required: true },
  }, { timestamps: true }));

  const email = 'dhanush1376@gmail.com';
  const otp = crypto.randomInt(100000, 999999).toString();
  const salt = await bcrypt.genSalt(12);
  const otpHash = await bcrypt.hash(otp, salt);
  
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  
  console.log("Creating OTP record:", { email, otp, expiresAt });
  await OtpVerification.deleteMany({ email, type: 'auth' });
  const record = await OtpVerification.create({
    email,
    otpHash,
    type: 'auth',
    expiresAt
  });
  
  console.log("Created successfully. Now verifying...");
  
  // Verify logic
  const now = new Date();
  const expiryGraceCutoff = new Date(now.getTime() - 90000); // 90s skew
  
  const otpRecords = await OtpVerification.find({
    email,
    type: 'auth',
    expiresAt: { $gt: expiryGraceCutoff },
    exhausted: false,
  }).sort({ createdAt: -1 });
  
  if (otpRecords.length === 0) {
    console.error("FAILED: No active OTP records found! (TTL index might have instantly deleted it?)");
  } else {
    console.log("Found records:", otpRecords.length);
    let matchedRecord = null;
    for (const r of otpRecords) {
      const isMatch = await bcrypt.compare(otp, r.otpHash);
      if (isMatch) {
        matchedRecord = r;
        break;
      }
    }
    if (matchedRecord) {
      console.log("SUCCESS: OTP matched and verified!");
    } else {
      console.error("FAILED: OTP did not match hash!");
    }
  }
  
  mongoose.disconnect();
}

testOtpFlow();
