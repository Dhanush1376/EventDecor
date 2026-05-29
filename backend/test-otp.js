const axios = require('axios');

async function testOtp() {
  try {
    console.log("Sending OTP...");
    const sendRes = await axios.post('http://localhost:5000/api/v1/auth/send-otp', {
      email: 'dhanush1376@gmail.com'
    });
    console.log("Send OTP Response:", sendRes.data);
    
    // I don't have the OTP to verify, but I can check the database!
  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
}

testOtp();
