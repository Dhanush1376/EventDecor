async function testGroq() {
  const url = 'http://localhost:5000/api/v1/products/ai-autofill';

  const tokenPayload = {
    id: 'admin123',
    role: 'owner',
  };
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET.split(',')[0].trim(), {
    expiresIn: '1h',
  });

  const body = {
    title: 'Test Image',
    imageSrc: 'https://i1-c.pinimg.com/1200x/ee/1f/2b/ee1f2b9fa25eac7e436036b4f8a1789b.jpg',
    categoryList: ['Wedding', 'Engagement'],
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    console.log('Status:', res.status);
    const data = await res.text();
    console.log('Response:', data);
  } catch (err) {
    console.error(err);
  }
}

require('dotenv').config({ path: '../.env' });
testGroq();
