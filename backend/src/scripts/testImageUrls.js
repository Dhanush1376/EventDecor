/* eslint-disable no-undef, no-console */
async function checkUrl(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log(`${url} -> Status: ${res.status}`);
  } catch (err) {
    console.log(`${url} -> Error: ${err.message}`);
  }
}

async function run() {
  const urls = [
    'https://res.cloudinary.com/drxgnnzeb/image/upload/v1780338361/products/yuj0fvognevtkvmgnerp.webp',
    'https://res.cloudinary.com/drxgnnzeb/image/upload/v1780341771/products/lndeyicnz8tdnmklwsau.jpg',
    'https://res.cloudinary.com/drxgnnzeb/image/upload/f_auto,q_auto,w_400/v1780338361/products/yuj0fvognevtkvmgnerp.webp',
    'https://res.cloudinary.com/drxgnnzeb/image/upload/f_auto,q_auto,w_400/v1780341771/products/lndeyicnz8tdnmklwsau.jpg',
  ];
  for (const url of urls) {
    await checkUrl(url);
  }
}

run();
