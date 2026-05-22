import logger from './logger';
import { collectMissingEnvVars } from './envValidation';

const validateEnv = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  const jwtExpiry = process.env.JWT_EXPIRES_IN || '';
  if (jwtExpiry && !/^\d+[smhd]$/.test(jwtExpiry)) {
    logger.warn(`[ENV WARNING] JWT_EXPIRES_IN="${jwtExpiry}" may not be a valid time string. Expected format: 15m, 1h, 7d, etc.`);
  }

  if (isProduction) {
    if (process.env.BYPASS_OTP_CODE) {
      logger.error('[CRITICAL STARTUP ERROR] BYPASS_OTP_CODE must not be set in production');
      process.exit(1);
    }

    if (!process.env.SENTRY_DSN) {
      logger.warn('[ENV WARNING] SENTRY_DSN is not configured. Production error monitoring will be disabled.');
    }

    if (!!process.env.BREVO_API_KEY) {
      logger.info('[EMAIL CONFIG] Brevo HTTP API configured ✓');
    } else if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      logger.warn('[EMAIL CONFIG] Only SMTP configured — Render free tier may block SMTP ports. Prefer BREVO_API_KEY.');
    }
  }

  const missingVars = collectMissingEnvVars();
  if (missingVars.length > 0) {
    logger.error(`[CRITICAL STARTUP ERROR] Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }

  logger.info('Environment variables validated successfully');
};

export default validateEnv;
