async function run() {
  try {
    const res = await fetch('http://localhost:5000/api/cms/ai-vision-showcase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      }),
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
run();
