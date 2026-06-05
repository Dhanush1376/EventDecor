async function checkUrl(url: string) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log(`${url} -> Status: ${res.status}`);
  } catch (err: any) {
    console.log(`${url} -> Error: ${err.message}`);
  }
}

async function run() {
  const url1 =
    'https://res.cloudinary.com/drxgnnzeb/image/upload/v1780670115/products/ny5bvugh6s3lpmccwmht.jpg';
  const url2 =
    'https://res.cloudinary.com/drxgnnzeb/image/upload/f_auto,q_auto,w_400/v1780670115/products/ny5bvugh6s3lpmccwmht.jpg';

  await checkUrl(url1);
  await checkUrl(url2);
}

run();
