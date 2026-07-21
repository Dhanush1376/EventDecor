import { connectDB } from '../config/db';
import { CleanupMetricsService } from '../services/CleanupMetricsService';
import { StorageStatisticsService } from '../services/StorageStatisticsService';
import logger from '../config/logger';

async function runAudit() {
  await connectDB();

  logger.info('=== STORAGE AUDIT ===');

  logger.info('Fetching Cloudinary Stats...');
  const stats = await StorageStatisticsService.getProviderStats();
  console.log(stats);

  logger.info('Fetching Cleanup Metrics...');
  const metrics = await CleanupMetricsService.getMetrics(30);
  console.log(metrics);

  process.exit(0);
}

if (require.main === module) {
  runAudit().catch(console.error);
}
