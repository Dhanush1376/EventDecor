import { collectMissingEnvVars } from '../config/envValidation';
import logger from '../config/logger';

const missing = collectMissingEnvVars({ ciMode: true });

if (missing.length > 0) {
  logger.error('[check-env] Missing required backend environment variables:');
  missing.forEach((v) => logger.error(`  - ${v}`));
  process.exit(1);
}

logger.info('[check-env] Backend environment variables OK');
