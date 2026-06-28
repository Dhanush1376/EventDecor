import { Router, Request, Response } from 'express';
import { MetricsService } from '../../services/MetricsService';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  // Simple API key protection for metrics scraping
  const apiKey = req.headers['x-metrics-api-key'];
  if (process.env.METRICS_API_KEY && apiKey !== process.env.METRICS_API_KEY) {
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
