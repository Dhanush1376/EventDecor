import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { MetricsService } from '../../services/MetricsService';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  // API key protection for metrics scraping. Fails closed in production when no key is configured.
  const expectedKey = process.env.METRICS_API_KEY || '';
  const apiKey = String(req.headers['x-metrics-api-key'] || '');
  if (!expectedKey) {
    if (process.env.NODE_ENV === 'production') {
      res.status(404).end();
      return;
    }
  } else if (
    apiKey.length !== expectedKey.length ||
    !crypto.timingSafeEqual(Buffer.from(apiKey), Buffer.from(expectedKey))
  ) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  try {
    const metrics = await MetricsService.reportHourlyMetrics();
    res.status(200).json(metrics);
  } catch {
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

export default router;
