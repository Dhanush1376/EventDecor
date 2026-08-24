import fs from 'fs';
import path from 'path';

const BOT_USER_AGENTS = [
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'whatsapp',
  'slackbot',
  'telegrambot',
  'discordbot',
  'pinterest',
  'skypeuripreview',
  'vkshare',
  'googlebot',
  'bingbot',
  'yandexbot',
  'duckduckbot',
];

export default async function handler(req, res) {
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  const isBot = BOT_USER_AGENTS.some((bot) => userAgent.includes(bot));

  const productId = req.query.id;

  if (isBot && productId) {
    try {
      let backendUrl = process.env.VITE_API_URL || 'https://eventdecor-lztd.onrender.com/api/v1';
      if (!backendUrl.endsWith('/v1')) backendUrl += '/v1';
      const url = new URL(`${backendUrl}/social/product/${productId}`);

      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': req.headers['user-agent'],
          'X-Forwarded-For': req.headers['x-forwarded-for'] || req.socket.remoteAddress,
          'X-Forwarded-Host': req.headers['host'],
        },
      });

      if (response.ok) {
        const html = await response.text();
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        return res.status(200).send(html);
      }
    } catch (error) {
      console.error('Error fetching social preview from backend:', error);
    }
  }

  try {
    const indexPath = path.join(process.cwd(), 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
      const html = fs.readFileSync(indexPath, 'utf8');
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res.status(200).send(html);
    } else {
      // Fallback: Fetch the index.html from the domain itself to serve the SPA
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      if (host) {
        try {
          const baseUrl = `${protocol}://${host}`;
          const response = await fetch(baseUrl);
          if (response.ok) {
            const html = await response.text();
            res.setHeader('Content-Type', 'text/html');
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            return res.status(200).send(html);
          }
        } catch (fetchErr) {
          console.error('Error fetching index.html from host:', fetchErr);
        }
      }

      // Ultimate fallback: return a simple HTML shell without redirecting
      res.setHeader('Content-Type', 'text/html');
      return res
        .status(200)
        .send(
          `<!DOCTYPE html><html><head><title>Siri Arts & Crafts</title></head><body><div id="root"></div><script>console.warn("Social proxy fallback hit. If you see this, the SPA rewrite might be misconfigured.");</script></body></html>`,
        );
    }
  } catch (error) {
    console.error('Error serving index.html fallback:', error);
    return res.status(500).send('Internal Server Error');
  }
}
