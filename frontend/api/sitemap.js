export default async function handler(req, res) {
  const backendUrl = process.env.VITE_BACKEND_URL || 'https://siri-arts-n-crafts.onrender.com';
  try {
    const response = await fetch(`${backendUrl}/sitemap.xml`);
    if (!response.ok) throw new Error('Failed to fetch sitemap from backend');
    
    const xml = await response.text();
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.status(200).send(xml);
  } catch (error) {
    console.error('Sitemap proxy error:', error);
    res.status(500).send('Error serving sitemap');
  }
}
