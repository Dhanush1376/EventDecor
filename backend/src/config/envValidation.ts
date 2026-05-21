/**
 * Shared environment variable validation (startup + CI).
 */

const baseRequiredEnvVars = [
  'PORT',
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'ADMIN_EMAIL',
];

const productionRequiredEnvVars = [
  'ADMIN_PASSWORD',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'FRONTEND_URLS',
  'RAZORPAY_WEBHOOK_SECRET',
];

export const collectMissingEnvVars = (options?: { ciMode?: boolean }): string[] => {
  const isProduction = process.env.NODE_ENV === 'production';
  const requiredEnvVars = isProduction
    ? [...baseRequiredEnvVars, ...productionRequiredEnvVars]
    : baseRequiredEnvVars;

  let missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (isProduction || options?.ciMode) {
    const hasBrevo = !!process.env.BREVO_API_KEY;
    const hasSmtp = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    if (!hasBrevo && !hasSmtp) {
      missingVars.push('BREVO_API_KEY (or SMTP_USER + SMTP_PASS)');
    }
  }

  if (isProduction) {
    if ((process.env.JWT_SECRET || '').length < 32) {
      missingVars.push('JWT_SECRET (min 32 characters in production)');
    }
    if (!process.env.RAZORPAY_KEY_ID) missingVars.push('RAZORPAY_KEY_ID');
    if (!process.env.RAZORPAY_KEY_SECRET) missingVars.push('RAZORPAY_KEY_SECRET');
  }

  return missingVars;
};
