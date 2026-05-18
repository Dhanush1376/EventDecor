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
  }

  if (missingVars.length > 0) {
    logger.error(`[CRITICAL STARTUP ERROR] Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }

  logger.info('Environment variables validated successfully');
};

export default validateEnv;
