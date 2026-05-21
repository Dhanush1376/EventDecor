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

    const hasBrevo = !!process.env.BREVO_API_KEY;
    const hasSmtp = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    if (!hasBrevo && !hasSmtp) {
      logger.error(
        '[EMAIL CONFIG WARNING] Neither BREVO_API_KEY nor SMTP_USER/SMTP_PASS is configured! ' +
          'OTP and transactional emails will FAIL in production.'
      );
    } else if (!hasBrevo && hasSmtp) {
      logger.warn('[EMAIL CONFIG] Only SMTP configured — Render free tier may block SMTP ports. Prefer BREVO_API_KEY.');
    } else if (hasBrevo) {
      logger.info('[EMAIL CONFIG] Brevo HTTP API configured ✓');
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
