/* eslint-disable no-redeclare */
/* global process */
import logger from '../src/utils/logger.js';

export default async function handler(req, res) {
  const backendUrl =
    process.env.VITE_BACKEND_URL || 'https://eventdecor-production-1647.up.railway.app';
  try {
    const response = await fetch(`${backendUrl}/sitemap.xml`);
    if (!response.ok) throw new Error('Failed to fetch sitemap from backend');

    const xml = await response.text();
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.status(200).send(xml);
  } catch (error) {
    logger.error('Sitemap proxy error:', error);
    res.status(500).send('Error serving sitemap');
  }
}
