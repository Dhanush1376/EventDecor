import logger from './logger';

const baseRequiredEnvVars = [
  'PORT',
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
];

const productionRequiredEnvVars = [
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'SMTP_USER',
  'SMTP_PASS',
  'FRONTEND_URLS',
];

const validateEnv = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const requiredEnvVars = isProduction
    ? [...baseRequiredEnvVars, ...productionRequiredEnvVars]
    : baseRequiredEnvVars;

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  // Razorpay credentials are strictly mandatory for payment processing in production
  if (process.env.NODE_ENV === 'production') {
    if ((process.env.JWT_SECRET || '').length < 32) {
      logger.error('[CRITICAL STARTUP ERROR] JWT_SECRET must be at least 32 characters in production');
      process.exit(1);
    }
    if (!process.env.RAZORPAY_KEY_ID) missingVars.push('RAZORPAY_KEY_ID');
    if (!process.env.RAZORPAY_KEY_SECRET) missingVars.push('RAZORPAY_KEY_SECRET');

    // Email provider check — warn clearly but don't crash (allows diagnostic debugging)
    const hasBrevo = !!process.env.BREVO_API_KEY;
    const hasSmtp = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    if (!hasBrevo && !hasSmtp) {
      logger.error(
        '[EMAIL CONFIG WARNING] Neither BREVO_API_KEY nor SMTP_USER/SMTP_PASS is configured! ' +
        'OTP and transactional emails will FAIL in production. ' +
        'RECOMMENDED: Set BREVO_API_KEY (free at https://www.brevo.com) — works on all hosting including Render free tier. ' +
        'NOTE: Render free tier BLOCKS SMTP ports (25, 465, 587). Only Brevo HTTP API will work.'
      );
    } else if (!hasBrevo && hasSmtp) {
      logger.warn(
        '[EMAIL CONFIG] Only SMTP credentials are configured. ' +
        'WARNING: Render free tier blocks SMTP ports — emails will fail on Render free tier. ' +
        'To fix, add BREVO_API_KEY (free at https://www.brevo.com) which uses HTTPS port 443.'
      );
    } else if (hasBrevo) {
      logger.info('[EMAIL CONFIG] Brevo HTTP API configured ✓ (works on all hosting providers)');
    }
  }

  if (missingVars.length > 0) {
    logger.error(`[CRITICAL STARTUP ERROR] Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }

  logger.info('Environment variables validated successfully');
};

export default validateEnv;
