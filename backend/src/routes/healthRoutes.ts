import { Router } from 'express';
import { HealthController } from '../controllers/healthController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// Public probes — no auth required (used by load balancers / k8s)
router.get('/', HealthController.liveness);
router.get('/ready', HealthController.readiness);

// Deep health — admin only
router.get('/deep', requireAuth, requireAdmin, HealthController.deepHealth);

// Prometheus Metrics
router.get('/metrics', HealthController.metrics);

// Sentry Debug
router.get('/sentry-debug', requireAuth, requireAdmin, (_req, _res) => {
  throw new Error('Sentry Debug Exception from EventDecor Backend');
});

export default router;
