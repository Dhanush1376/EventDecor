const axios = require('axios');
const http = require('http');

async function test() {
  try {
    const api = axios.create({
      baseURL: 'http://localhost:5000',
      withCredentials: true,
    });

    const csrfRes = await api.get('/api/v1/csrf-token');
    const csrfToken = csrfRes.data.csrfToken;
    const cookies = csrfRes.headers['set-cookie'];
    const cookieHeader = cookies ? cookies.map((c) => c.split(';')[0]).join('; ') : '';

    console.log('Got CSRF Token:', csrfToken);

    const res = await api.post(
      '/api/v1/ai/providers',
      {
        name: 'Groq',
        provider: 'groq',
        apiKey: 'gsk_12345',
      },
      {
        headers: {
          'x-csrf-token': csrfToken,
          Cookie: cookieHeader,
        },
      },
    );
    console.log('Success:', res.data);
  } catch (err) {
    console.error('HTTP Status:', err.response?.status);
    console.error('Error Response:', err.response?.data);
  }
}
test();
